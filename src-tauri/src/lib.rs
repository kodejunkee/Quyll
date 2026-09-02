use tauri::{Manager, Emitter};
use std::sync::{Arc, Mutex};
use std::sync::atomic::{AtomicU8, Ordering};
use std::collections::HashMap;

pub struct DownloadManager {
    downloads: Mutex<HashMap<String, Arc<AtomicU8>>>,
}

const STATE_RUNNING: u8 = 0;
const STATE_PAUSED: u8 = 1;
const STATE_CANCELLED: u8 = 2;

#[derive(serde::Serialize, Clone)]
struct DownloadProgress {
    filename: String,
    downloaded: u64,
    total: u64,
}

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
    state: tauri::State<'_, DownloadManager>,
) -> Result<(), String> {
    use std::fs::OpenOptions;
    use std::io::Write;
    use futures_util::StreamExt;
    
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let models_dir = app_data_dir.join("models");
    std::fs::create_dir_all(&models_dir).map_err(|e| e.to_string())?;
    let model_path = models_dir.join(&filename);
    
    let existing_size = if std::path::Path::new(&model_path).exists() {
        std::fs::metadata(&model_path).map_err(|e| e.to_string())?.len()
    } else {
        0
    };

    let client = reqwest::Client::new();
    let mut req = client.get(&url);
    if existing_size > 0 {
        req = req.header("Range", format!("bytes={}-", existing_size));
    }
    
    let response = req.send().await.map_err(|e| e.to_string())?;
    
    if !response.status().is_success() {
        if response.status() == reqwest::StatusCode::RANGE_NOT_SATISFIABLE {
            return Ok(()); // File is already fully downloaded
        }
        return Err(format!("Download failed: HTTP {}", response.status()));
    }
    
    let is_partial = response.status() == reqwest::StatusCode::PARTIAL_CONTENT;
    let mut file = OpenOptions::new()
        .create(true)
        .write(true)
        .append(is_partial)
        .truncate(!is_partial)
        .open(&model_path)
        .map_err(|e| e.to_string())?;
        
    let content_length = response.content_length().unwrap_or(0);
    let total_size = if is_partial { existing_size + content_length } else { content_length };
    
    let cancel_flag = Arc::new(AtomicU8::new(STATE_RUNNING));
    {
        let mut downloads = state.downloads.lock().unwrap();
        downloads.insert(filename.clone(), cancel_flag.clone());
    }

    let mut downloaded = if is_partial { existing_size } else { 0 };
    let mut stream = response.bytes_stream();
    
    while let Some(chunk) = stream.next().await {
        let current_state = cancel_flag.load(Ordering::SeqCst);
        if current_state == STATE_PAUSED {
            break;
        } else if current_state == STATE_CANCELLED {
            drop(file);
            let _ = std::fs::remove_file(&model_path);
            break;
        }

        let chunk = chunk.map_err(|e| e.to_string())?;
        file.write_all(&chunk).map_err(|e| e.to_string())?;
        downloaded += chunk.len() as u64;
        
        let _ = app.emit("download-progress", DownloadProgress {
            filename: filename.clone(),
            downloaded,
            total: total_size
        });
    }
    
    {
        let mut downloads = state.downloads.lock().unwrap();
        downloads.remove(&filename);
    }
    
    Ok(())
}

#[tauri::command]
async fn pause_download(
    filename: String,
    state: tauri::State<'_, DownloadManager>,
) -> Result<(), String> {
    let downloads = state.downloads.lock().unwrap();
    if let Some(cancel_flag) = downloads.get(&filename) {
        cancel_flag.store(STATE_PAUSED, Ordering::SeqCst);
    }
    Ok(())
}

#[tauri::command]
async fn cancel_download(
    app: tauri::AppHandle,
    filename: String,
    state: tauri::State<'_, DownloadManager>,
) -> Result<(), String> {
    let mut needs_manual_delete = false;
    {
        let downloads = state.downloads.lock().unwrap();
        if let Some(cancel_flag) = downloads.get(&filename) {
            cancel_flag.store(STATE_CANCELLED, Ordering::SeqCst);
        } else {
            // Not actively downloading, just delete it
            needs_manual_delete = true;
        }
    }
    
    if needs_manual_delete {
        let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
        let models_dir = app_data_dir.join("models");
        let model_path = models_dir.join(&filename);
        if std::path::Path::new(&model_path).exists() {
            let _ = std::fs::remove_file(model_path);
        }
    }
    
    Ok(())
}

#[derive(serde::Deserialize)]
pub struct ChatMessage {
    role: String,
    content: String,
}

#[tauri::command]
async fn generate_text_stream(
    window: tauri::Window,
    messages: Vec<ChatMessage>,
    system_prompt: Option<String>,
    channel_id: Option<String>,
) -> Result<(), String> {
    use futures_util::StreamExt;
    use serde_json::json;
    
    let client = reqwest::Client::new();
    
    let mut api_messages = vec![json!({
        "role": "system",
        "content": system_prompt.unwrap_or_else(|| "You are a helpful AI writing assistant. Keep your responses clear and helpful. You are integrated directly into a writing application.".to_string())
    })];
    
    for msg in messages {
        api_messages.push(json!({
            "role": msg.role,
            "content": msg.content
        }));
    }
    
    let payload = json!({
        "messages": api_messages,
        "stream": true,
        "temperature": 0.7
    });

    // Retry loop in case the server is still booting up or loading the model into RAM
    let mut retries = 5;
    let mut res_opt = None;
    
    while retries > 0 {
        match client.post("http://127.0.0.1:8080/v1/chat/completions")
            .json(&payload)
            .send()
            .await 
        {
            Ok(response) => {
                res_opt = Some(response);
                break;
            },
            Err(e) => {
                retries -= 1;
                if retries == 0 {
                    return Err(format!("Failed to connect to AI server. Is the model running? Error: {}", e));
                }
                tokio::time::sleep(std::time::Duration::from_millis(1500)).await;
            }
        }
    }
    
    let res = res_opt.unwrap();
    
    if !res.status().is_success() {
        let status = res.status();
        let err_text = res.text().await.unwrap_or_default();
        return Err(format!("AI Server returned {}: {}", status, err_text));
    }

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
                        let event_name = channel_id.as_deref().map(|id| format!("ai-token-{}", id)).unwrap_or_else(|| "ai-token".to_string());
                        let _ = window.emit(&event_name, content);
                    }
                }
            }
        }
    }

    let finish_event = channel_id.as_deref().map(|id| format!("ai-finished-{}", id)).unwrap_or_else(|| "ai-finished".to_string());
    let _ = window.emit(&finish_event, ());
    Ok(())
}


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
    
    let resource_dir = app.path().resource_dir().map_err(|e| e.to_string())?;
    // We mapped bin/*.dll to "." in tauri.conf.json, so DLLs live in resource_dir.
    let dll_dir = resource_dir;

    let sidecar_command = app.shell().sidecar("llama-server").map_err(|e| e.to_string())?;
    
    // Explicitly add our bundled `bin` folder to the system PATH so Windows can locate the DLLs
    let path_env = std::env::var("PATH").unwrap_or_default();
    let new_path = format!("{};{}", dll_dir.display(), path_env);

    let cpu_count = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(4);
    // Allocate optimal threads (e.g. 4 on a 4-core CPU, up to 6 on larger CPUs)
    let threads = cpu_count.clamp(2, 6);
    let threads_str = threads.to_string();

    let (_rx, child) = sidecar_command
        .env("PATH", new_path)
        .args([
            "-m", model_path.to_str().unwrap(),
            "--port", "8080",
            "-t", &threads_str,
            "-tb", &threads_str,
            "-c", "2048",
            "-ngl", "99",
        ])
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

use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: "
                CREATE TABLE IF NOT EXISTS ai_chats (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    updated_at INTEGER NOT NULL
                );
                CREATE TABLE IF NOT EXISTS ai_messages (
                    id TEXT PRIMARY KEY,
                    chat_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    text TEXT NOT NULL,
                    FOREIGN KEY(chat_id) REFERENCES ai_chats(id) ON DELETE CASCADE
                );
                CREATE TABLE IF NOT EXISTS conlangs (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    word_order TEXT NOT NULL,
                    vibe TEXT NOT NULL,
                    created_at INTEGER NOT NULL
                );
                CREATE TABLE IF NOT EXISTS dictionary_words (
                    id TEXT PRIMARY KEY,
                    language_id TEXT NOT NULL,
                    word TEXT NOT NULL,
                    meaning TEXT NOT NULL,
                    part_of_speech TEXT NOT NULL,
                    FOREIGN KEY(language_id) REFERENCES conlangs(id) ON DELETE CASCADE
                );
            ",
            kind: MigrationKind::Up,
        }
    ];

    tauri::Builder::default()
        .manage(AiEngineState { child: Mutex::new(None) })
        .manage(DownloadManager { downloads: Mutex::new(HashMap::new()) })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::new().add_migrations("sqlite:quyll.db", migrations).build())
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
            pause_download,
            cancel_download,
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

