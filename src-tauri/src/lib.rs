mod commands;
pub mod core;

pub fn run() {
    // Initialize tracing
    let log_path = dirs::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("afo")
        .join("afo.log");

    if let Some(parent) = log_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    let file_appender = tracing_appender::rolling::daily(
        log_path.parent().unwrap_or_else(|| std::path::Path::new(".")),
        "afo.log",
    );

    tracing_subscriber::fmt()
        .with_writer(file_appender)
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .with_ansi(false)
        .init();

    tracing::info!("AFO v2.0 starting");

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
            commands::cleanup_quarantine_cmd,
            commands::get_history,
            commands::undo_last,
            commands::undo_operation,
            commands::redo_last,
            commands::get_metadata,
            commands::watch_directory,
            commands::unwatch_directory,
            commands::list_watched_directories,
            commands::create_schedule_cmd,
            commands::list_schedules_cmd,
            commands::delete_schedule_cmd,
            commands::toggle_schedule_cmd,
            commands::run_schedule_now,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
