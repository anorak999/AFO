mod commands;
pub mod core;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::scan_directory,
            commands::organize_by_extension,
            commands::organize_by_date,
            commands::batch_rename,
            commands::list_rules,
            commands::save_rules,
            commands::apply_rules,
            commands::scan_duplicates_cmd,
            commands::quarantine_duplicates_cmd,
            commands::delete_duplicates_cmd,
            commands::get_history,
            commands::undo_last,
            commands::undo_operation,
            commands::redo_last,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
