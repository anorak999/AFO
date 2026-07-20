use crate::core::duplicates;
use crate::core::journal;
use crate::core::metadata;
use crate::core::organizer;
use crate::core::rule_engine;
use crate::core::scheduler;
use crate::core::watcher;
use tauri::Emitter;

#[derive(Clone, serde::Serialize)]
pub struct ProgressEvent {
    pub current: usize,
    pub total: usize,
    pub file: String,
    pub status: String,
}

#[tauri::command]
pub async fn scan_directory(path: String) -> Result<Vec<organizer::FileInfo>, String> {
    organizer::scan_directory(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn organize_by_extension(
    app: tauri::AppHandle,
    path: String,
    dry_run: bool,
) -> Result<organizer::OrganizeResult, String> {
    let files = organizer::scan_directory(&path).map_err(|e| e.to_string())?;
    let config = organizer::CategoryConfig::load();
    let mut result = organizer::OrganizeResult {
        total_files: files.len(),
        moved: 0,
        skipped: 0,
        errors: Vec::new(),
        dry_run,
    };

    for (i, file) in files.iter().enumerate() {
        if file.is_dir {
            result.skipped += 1;
            continue;
        }

        let category = config.categorize(&file.extension);
        let target_dir = std::path::Path::new(&path).join(category);

        if dry_run {
            result.moved += 1;
        } else {
            if !target_dir.exists() {
                std::fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;
            }
            let target_file = organizer::unique_path(&target_dir.join(&file.name));
            match std::fs::rename(&file.path, &target_file) {
                Ok(()) => result.moved += 1,
                Err(e) => result.errors.push(format!("Failed to move {}: {}", file.name, e)),
            }
        }

        let _ = app.emit("afo://progress", ProgressEvent {
            current: i + 1,
            total: files.len(),
            file: file.name.clone(),
            status: if dry_run { "preview".to_string() } else { "moved".to_string() },
        });
    }

    Ok(result)
}

#[tauri::command]
pub async fn organize_by_date(
    app: tauri::AppHandle,
    path: String,
    dry_run: bool,
) -> Result<organizer::OrganizeResult, String> {
    let files = organizer::scan_directory(&path).map_err(|e| e.to_string())?;
    let mut result = organizer::OrganizeResult {
        total_files: files.len(),
        moved: 0,
        skipped: 0,
        errors: Vec::new(),
        dry_run,
    };

    for (i, file) in files.iter().enumerate() {
        if file.is_dir {
            result.skipped += 1;
            continue;
        }

        let metadata = std::fs::metadata(&file.path).map_err(|e| e.to_string())?;
        let modified = metadata.modified().map_err(|e| e.to_string())?;
        let datetime: chrono::DateTime<chrono::Local> = modified.into();
        let date_folder = datetime.format("%Y/%m").to_string();
        let target_dir = std::path::Path::new(&path).join(&date_folder);

        if dry_run {
            result.moved += 1;
        } else {
            if !target_dir.exists() {
                std::fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;
            }
            let target_file = organizer::unique_path(&target_dir.join(&file.name));
            match std::fs::rename(&file.path, &target_file) {
                Ok(()) => result.moved += 1,
                Err(e) => result.errors.push(format!("Failed to move {}: {}", file.name, e)),
            }
        }

        let _ = app.emit("afo://progress", ProgressEvent {
            current: i + 1,
            total: files.len(),
            file: file.name.clone(),
            status: if dry_run { "preview".to_string() } else { "moved".to_string() },
        });
    }

    Ok(result)
}

#[tauri::command]
pub async fn batch_rename(
    app: tauri::AppHandle,
    path: String,
    pattern: String,
    dry_run: bool,
) -> Result<organizer::OrganizeResult, String> {
    let files = organizer::scan_directory(&path).map_err(|e| e.to_string())?;
    let mut result = organizer::OrganizeResult {
        total_files: files.len(),
        moved: 0,
        skipped: 0,
        errors: Vec::new(),
        dry_run,
    };

    let mut counter = 1u32;

    for (i, file) in files.iter().enumerate() {
        if file.is_dir {
            result.skipped += 1;
            continue;
        }

        let name_no_ext = file.name.trim_end_matches(&format!(".{}", file.extension));
        let new_name = pattern
            .replace("{name}", name_no_ext)
            .replace("{ext}", &file.extension)
            .replace("{counter}", &counter.to_string());

        let new_path = std::path::Path::new(&path).join(&new_name);

        if dry_run {
            result.moved += 1;
        } else {
            let target = organizer::unique_path(&new_path);
            match std::fs::rename(&file.path, &target) {
                Ok(()) => result.moved += 1,
                Err(e) => result.errors.push(format!("Failed to rename {}: {}", file.name, e)),
            }
        }

        counter += 1;

        let _ = app.emit("afo://progress", ProgressEvent {
            current: i + 1,
            total: files.len(),
            file: file.name.clone(),
            status: if dry_run { "preview".to_string() } else { "renamed".to_string() },
        });
    }

    Ok(result)
}

#[tauri::command]
pub async fn list_rules() -> Result<Vec<rule_engine::Rule>, String> {
    Ok(rule_engine::load_rules())
}

#[tauri::command]
pub async fn save_rules(rules: Vec<rule_engine::Rule>) -> Result<(), String> {
    rule_engine::save_rules(&rules).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn apply_rules(
    path: String,
    dry_run: bool,
) -> Result<organizer::OrganizeResult, String> {
    rule_engine::apply_rules(&path, dry_run).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn scan_duplicates_cmd(
    path: String,
    recursive: bool,
    max_depth: Option<u32>,
) -> Result<Vec<duplicates::DuplicateGroup>, String> {
    let depth = max_depth.unwrap_or(5);
    duplicates::scan_duplicates(&path, recursive, depth).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn quarantine_duplicates_cmd(
    groups: Vec<duplicates::DuplicateGroup>,
    indices: Vec<usize>,
) -> Result<(), String> {
    duplicates::quarantine_duplicates(&groups, &indices).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_duplicates_cmd(
    groups: Vec<duplicates::DuplicateGroup>,
    indices: Vec<usize>,
) -> Result<(), String> {
    duplicates::delete_duplicates(&groups, &indices).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_history(
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<journal::JournalEntry>, String> {
    journal::get_history(limit.unwrap_or(50), offset.unwrap_or(0))
}

#[tauri::command]
pub async fn undo_last() -> Result<Option<journal::JournalEntry>, String> {
    journal::undo_last()
}

#[tauri::command]
pub async fn undo_operation(id: i64) -> Result<Option<journal::JournalEntry>, String> {
    journal::undo_operation(id)
}

#[tauri::command]
pub async fn redo_last() -> Result<Option<journal::JournalEntry>, String> {
    journal::redo_last()
}

#[tauri::command]
pub async fn get_metadata(path: String) -> Result<metadata::Metadata, String> {
    Ok(metadata::extract_metadata(&path))
}

#[tauri::command]
pub async fn watch_directory(dir: String) -> Result<(), String> {
    watcher::start_watching(&dir).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn unwatch_directory(dir: String) -> Result<(), String> {
    watcher::stop_watching(&dir).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_watched_directories() -> Result<Vec<watcher::WatchedDir>, String> {
    watcher::list_watched()
}

#[tauri::command]
pub async fn create_schedule_cmd(
    name: String,
    cron: String,
    action_type: String,
    path: String,
) -> Result<scheduler::Schedule, String> {
    let action = match action_type.as_str() {
        "organize_extension" => scheduler::ScheduleAction::OrganizeByExtension { path },
        "organize_date" => scheduler::ScheduleAction::OrganizeByDate { path },
        "apply_rules" => scheduler::ScheduleAction::ApplyRules { path },
        "scan_duplicates" => scheduler::ScheduleAction::ScanDuplicates { path },
        _ => return Err(format!("Unknown action type: {}", action_type)),
    };
    scheduler::create_schedule(&name, &cron, action)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_schedules_cmd() -> Result<Vec<scheduler::Schedule>, String> {
    scheduler::list_schedules()
}

#[tauri::command]
pub async fn delete_schedule_cmd(id: String) -> Result<(), String> {
    scheduler::delete_schedule(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn toggle_schedule_cmd(id: String, enabled: bool) -> Result<(), String> {
    scheduler::toggle_schedule(&id, enabled).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn run_schedule_now(id: String) -> Result<(), String> {
    scheduler::run_now(&id).await.map_err(|e| e.to_string())
}
