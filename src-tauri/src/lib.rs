mod commands;
pub mod core;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::scan_directory,
            commands::organize_by_extension,
            commands::organize_by_date,
            commands::batch_rename,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
