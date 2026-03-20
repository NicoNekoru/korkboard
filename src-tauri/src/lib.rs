use sha2::{Digest, Sha256};
use std::fs;
use std::io::{Read, Write};
use std::path::PathBuf;
use tauri::Manager;
use zip::write::FileOptions;

#[tauri::command]
async fn download_asset(app: tauri::AppHandle, url: String) -> Result<String, String> {
    let local_data_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|e| e.to_string())?;
    let cache_dir = local_data_dir.join("cache");
    fs::create_dir_all(&cache_dir).map_err(|e| e.to_string())?;

    let mut hasher = Sha256::new();
    hasher.update(url.as_bytes());
    let hash = hex::encode(hasher.finalize());
    
    let extension = url.split('.').last().unwrap_or("bin").split('?').next().unwrap_or("bin");
    let file_path = cache_dir.join(format!("{}.{}", hash, extension));

    if file_path.exists() {
        return Ok(file_path.to_string_lossy().to_string());
    }

    let response = reqwest::get(&url).await.map_err(|e| e.to_string())?;
    let bytes = response.bytes().await.map_err(|e| e.to_string())?;

    let mut file = fs::File::create(&file_path).map_err(|e| e.to_string())?;
    file.write_all(&bytes).map_err(|e| e.to_string())?;

    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
async fn export_board(
    _app: tauri::AppHandle,
    board_json: String,
    asset_paths: Vec<String>,
    save_path: String,
) -> Result<(), String> {
    let file = fs::File::create(&save_path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);
    let options: FileOptions<'_, ()> = FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .unix_permissions(0o755);

    zip.start_file("board.json", options).map_err(|e| e.to_string())?;
    zip.write_all(board_json.as_bytes()).map_err(|e| e.to_string())?;

    for path_str in asset_paths {
        let path = PathBuf::from(&path_str);
        if path.exists() {
            let name = path.file_name().unwrap().to_string_lossy();
            zip.start_file(format!("assets/{}", name), options).map_err(|e| e.to_string())?;
            let bytes = fs::read(&path).map_err(|e| e.to_string())?;
            zip.write_all(&bytes).map_err(|e| e.to_string())?;
        }
    }

    zip.finish().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn import_board(app: tauri::AppHandle, archive_path: String) -> Result<String, String> {
    let file = fs::File::open(&archive_path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;
    
    let local_data_dir = app.path().app_local_data_dir().map_err(|e| e.to_string())?;
    let cache_dir = local_data_dir.join("cache");
    fs::create_dir_all(&cache_dir).map_err(|e| e.to_string())?;

    let mut board_json = String::new();

    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        let name = file.name().to_string();
        
        if name == "board.json" {
            file.read_to_string(&mut board_json).map_err(|e| e.to_string())?;
        } else if name.starts_with("assets/") {
            let filename = name.strip_prefix("assets/").unwrap();
            let dest_path = cache_dir.join(filename);
            let mut dest_file = fs::File::create(&dest_path).map_err(|e| e.to_string())?;
            let mut bytes = Vec::new();
            file.read_to_end(&mut bytes).map_err(|e| e.to_string())?;
            dest_file.write_all(&bytes).map_err(|e| e.to_string())?;
        }
    }

    Ok(board_json)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .invoke_handler(tauri::generate_handler![download_asset, export_board, import_board])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
