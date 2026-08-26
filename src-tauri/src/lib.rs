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
                                        let html = r#"<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quyll — Authenticated</title>
  <style>
    body {
      background: #0E1014;
      color: #f0f1f3;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      text-align: center;
    }
    .card {
      background: #15181E;
      padding: 3rem 4rem;
      border-radius: 16px;
      border: 1px solid #222730;
      box-shadow: 0 20px 40px rgba(0,0,0,0.4);
    }
    svg {
      width: 48px;
      height: 48px;
      color: #3b82f6;
      margin-bottom: 1rem;
    }
    h1 { margin: 0 0 0.5rem 0; font-size: 1.5rem; font-weight: 600; }
    p { margin: 0 0 2rem 0; color: #a3a9b4; font-size: 0.95rem; }
  </style>
</head>
<body>
  <div class="card">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
    <h1>Authentication Successful</h1>
    <p style="font-size: 1.1rem; color: #f0f1f3; margin-bottom: 0.5rem;">You are now securely logged in.</p>
    <p>You may safely close this browser tab and return to Quyll.</p>
  </div>
</body>
</html>"#;
                                        let response = format!("HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n{}", html);
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

#[tauri::command]
async fn download_model(
    app: tauri::AppHandle,
    url: String,
    filename: String,
) -> Result<(), String> {
    use std::fs::File;
    use std::io::Write;
    use futures_util::StreamExt;
    
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let models_dir = app_data_dir.join("models");
    std::fs::create_dir_all(&models_dir).map_err(|e| e.to_string())?;
    
    let model_path = models_dir.join(&filename);
    let mut file = File::create(&model_path).map_err(|e| e.to_string())?;
    
    // In a real app we'd emit progress events here, but keeping it simple for now
    let response = reqwest::get(&url).await.map_err(|e| e.to_string())?;
    let mut stream = response.bytes_stream();
    
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        file.write_all(&chunk).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[tauri::command]
async fn generate_text_stream(
    window: tauri::Window,
    prompt: String,
    system_prompt: Option<String>,
) -> Result<(), String> {
    use futures_util::StreamExt;
    use serde_json::json;
    
    let client = reqwest::Client::new();
    
    let payload = json!({
        "messages": [
            {
                "role": "system", 
                "content": system_prompt.unwrap_or_else(|| "You are a helpful AI writing assistant.".to_string())
            },
            {
                "role": "user", 
                "content": prompt
            }
        ],
        "stream": true,
        "temperature": 0.7
    });

    // We assume llama-server sidecar is running on port 8080.
    let res = client.post("http://127.0.0.1:8080/v1/chat/completions")
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Failed to connect to AI server. Is the model running? Error: {}", e))?;

    let mut stream = res.bytes_stream();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        let text = String::from_utf8_lossy(&chunk);
        
        // Very basic SSE parsing: lines starting with "data: "
        for line in text.lines() {
            if line.starts_with("data: ") {
                let data = &line[6..];
                if data == "[DONE]" {
                    continue;
                }
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                    if let Some(content) = json["choices"][0]["delta"]["content"].as_str() {
                        let _ = window.emit("ai-token", content);
                    }
                }
            }
        }
    }

    let _ = window.emit("ai-finished", ());
    Ok(())
}

use std::sync::Mutex;
use tauri_plugin_shell::process::CommandChild;

struct AiEngineState {
    child: Mutex<Option<CommandChild>>,
}

#[tauri::command]
async fn start_ai_engine(
    app: tauri::AppHandle,
    model_name: String,
) -> Result<(), String> {
    use tauri_plugin_shell::ShellExt;
    
    let state: tauri::State<AiEngineState> = app.state();
    let mut child_guard = state.child.lock().unwrap();
    if child_guard.is_some() {
        return Ok(()); // Already running
    }
    
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let model_path = app_data_dir.join("models").join(model_name);
    
    let sidecar_command = app.shell().sidecar("llama-server").map_err(|e| e.to_string())?;
    
    let (_rx, child) = sidecar_command
        .args(["-m", model_path.to_str().unwrap(), "--port", "8080"])
        .spawn()
        .map_err(|e| format!("Failed to spawn llama-server: {}. Did you put the .exe in src-tauri/bin?", e))?;
        
    *child_guard = Some(child);
    Ok(())
}

#[tauri::command]
async fn stop_ai_engine(app: tauri::AppHandle) -> Result<(), String> {
    let state: tauri::State<AiEngineState> = app.state();
    let mut child_guard = state.child.lock().unwrap();
    if let Some(child) = child_guard.take() {
        let _ = child.kill();
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AiEngineState { child: Mutex::new(None) })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            start_oauth_server, 
            create_backup_zip, 
            extract_backup_zip, 
            restore_project_folders,
            download_model,
            generate_text_stream,
            start_ai_engine,
            stop_ai_engine
        ])
        .setup(|app| {
            let _window = app.get_webview_window("main").unwrap();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Quyll");
}

