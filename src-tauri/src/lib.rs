use tauri::{Manager, Emitter};

#[tauri::command]
async fn start_oauth_server(window: tauri::Window) -> Result<String, String> {
    use tokio::net::TcpListener;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    
    // Bind to any available port on localhost
    let listener = TcpListener::bind("127.0.0.1:0").await.map_err(|e| e.to_string())?;
    let port = listener.local_addr().unwrap().port();
    
    // Emit the port to the frontend so it can open the browser to the correct redirect_uri
    window.emit("oauth-port", port).unwrap();
    
    // Wait for the redirect from Google
    loop {
        if let Ok((mut stream, _)) = listener.accept().await {
            let mut buffer = [0; 4096];
            if stream.read(&mut buffer).await.is_ok() {
                let request = String::from_utf8_lossy(&buffer);
                
                // Extract the ?code=... from the GET request
                if let Some(get_line) = request.lines().next() {
                    if let Some(url) = get_line.split_whitespace().nth(1) {
                        if let Some(query_start) = url.find('?') {
                            let query = &url[query_start + 1..];
                            for pair in query.split('&') {
                                let mut parts = pair.splitn(2, '=');
                                if parts.next() == Some("code") {
                                    if let Some(code) = parts.next() {
                                        // Send a success page back to the browser
                                        let response = "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n<html><head><title>Success</title><style>body{background:#0F172A;color:white;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}</style></head><body><div style='text-align:center;'><h2>Authentication Successful!</h2><p>You can close this window and return to Quyll.</p><script>window.close()</script></div></body></html>";
                                        let _ = stream.write_all(response.as_bytes()).await;
                                        // URL decode the code just in case
                                        let decoded = urlencoding::decode(code).unwrap_or(std::borrow::Cow::Borrowed(code)).to_string();
                                        return Ok(decoded);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

#[tauri::command]
async fn create_backup_zip(
    app: tauri::AppHandle,
    project_ids: Option<Vec<String>>,
) -> Result<String, String> {
    use std::fs::File;
    use std::io::{Read, Write};
    use zip::write::SimpleFileOptions;

    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
        
    let zip_filename = format!("Quyll_Backup_{}.zip", timestamp);
    let zip_path = std::env::temp_dir().join(&zip_filename);
    
    let file = File::create(&zip_path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);
    let options = SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .unix_permissions(0o755);

    // Always include app.db and its WAL files if they exist
    for db_file in &["app.db", "app.db-wal", "app.db-shm"] {
        let app_db_path = app_data_dir.join(db_file);
        if app_db_path.exists() {
            zip.start_file(*db_file, options).map_err(|e| e.to_string())?;
            let mut f = File::open(&app_db_path).map_err(|e| e.to_string())?;
            let mut buffer = Vec::new();
            f.read_to_end(&mut buffer).map_err(|e| e.to_string())?;
            zip.write_all(&buffer).map_err(|e| e.to_string())?;
        }
    }

    // Include selected projects
    let projects_dir = app_data_dir.join("projects");
    if projects_dir.exists() {
        // First add the projects/ directory itself
        zip.add_directory("projects", options).map_err(|e| e.to_string())?;
        
        for entry in std::fs::read_dir(&projects_dir).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let mut project_id = entry.file_name().to_string_lossy().into_owned();
            if project_id.ends_with(".quyll") {
                project_id = project_id.trim_end_matches(".quyll").to_string();
            }
            
            let should_include = match &project_ids {
                Some(ids) => ids.contains(&project_id),
                None => true,
            };
            
            if should_include {
                let project_path = entry.path();
                for sub_entry in walkdir::WalkDir::new(&project_path) {
                    let sub_entry = sub_entry.map_err(|e| e.to_string())?;
                    let path = sub_entry.path();
                    
                    let name = path.strip_prefix(&app_data_dir).map_err(|e| e.to_string())?;
                    let name_str = name.to_string_lossy().replace("\\", "/");
                    
                    if name_str.is_empty() {
                        continue;
                    }

                    if path.is_file() {
                        zip.start_file(name_str, options).map_err(|e| e.to_string())?;
                        let mut f = File::open(path).map_err(|e| e.to_string())?;
                        let mut buffer = Vec::new();
                        f.read_to_end(&mut buffer).map_err(|e| e.to_string())?;
                        zip.write_all(&buffer).map_err(|e| e.to_string())?;
                    } else if path.is_dir() {
                        zip.add_directory(name_str, options).map_err(|e| e.to_string())?;
                    }
                }
            }
        }
    }

    zip.finish().map_err(|e| e.to_string())?;

    Ok(zip_path.to_string_lossy().into_owned())
}

#[tauri::command]
async fn extract_backup_zip(
    app: tauri::AppHandle,
    zip_path: String,
    extract_dir: String,
) -> Result<(), String> {
    use std::fs::File;
    use std::io;
    use zip::ZipArchive;

    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    
    let absolute_zip_path = app_data_dir.join(&zip_path);
    let absolute_extract_dir = app_data_dir.join(&extract_dir);

    // Clean up the extraction directory if it exists
    if absolute_extract_dir.exists() {
        std::fs::remove_dir_all(&absolute_extract_dir).map_err(|e| e.to_string())?;
    }
    std::fs::create_dir_all(&absolute_extract_dir).map_err(|e| e.to_string())?;

    let file = File::open(&absolute_zip_path).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(file).map_err(|e| e.to_string())?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        
        // Use enclosed_name to prevent path traversal attacks (ZipSlip)
        let outpath = match file.enclosed_name() {
            Some(path) => absolute_extract_dir.join(path),
            None => continue,
        };

        if file.is_dir() {
            std::fs::create_dir_all(&outpath).map_err(|e| e.to_string())?;
        } else {
            if let Some(p) = outpath.parent() {
                if !p.exists() {
                    std::fs::create_dir_all(p).map_err(|e| e.to_string())?;
                }
            }
            let mut outfile = File::create(&outpath).map_err(|e| e.to_string())?;
            io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

#[tauri::command]
async fn restore_project_folders(
    app: tauri::AppHandle,
    project_ids: Vec<String>,
) -> Result<(), String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    
    let extracted_projects_dir = app_data_dir.join("Backups").join("Extracted").join("projects");
    let live_projects_dir = app_data_dir.join("projects");

    // Helper to recursively copy directories
    fn copy_dir_all(src: impl AsRef<std::path::Path>, dst: impl AsRef<std::path::Path>) -> std::io::Result<()> {
        std::fs::create_dir_all(&dst)?;
        for entry in std::fs::read_dir(src)? {
            let entry = entry?;
            let ty = entry.file_type()?;
            if ty.is_dir() {
                copy_dir_all(entry.path(), dst.as_ref().join(entry.file_name()))?;
            } else {
                std::fs::copy(entry.path(), dst.as_ref().join(entry.file_name()))?;
            }
        }
        Ok(())
    }

    for id in project_ids {
        let folder_name = format!("{}.quyll", id);
        let src = extracted_projects_dir.join(&folder_name);
        let dst = live_projects_dir.join(&folder_name);
        
        if src.exists() {
            if dst.exists() {
                std::fs::remove_dir_all(&dst).map_err(|e| e.to_string())?;
            }
            copy_dir_all(&src, &dst).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![start_oauth_server, create_backup_zip, extract_backup_zip, restore_project_folders])
        .setup(|app| {
            let _window = app.get_webview_window("main").unwrap();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Quyll");
}

