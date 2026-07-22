use crate::core::cloud_sync;
use crate::core::duplicates;
use crate::core::journal;
use crate::core::metadata;
use crate::core::organizer;
use crate::core::rule_engine;
use crate::core::scheduler;
use crate::core::watcher;
use std::io;
use tauri::Emitter;
use tracing::{info, instrument, warn};

/// Check if an IO error is permission denied
fn is_permission_denied(err: &io::Error) -> bool {
    err.kind() == io::ErrorKind::PermissionDenied
}

/// Attempt a file move with one retry after a short delay (helps with Windows file locks)
fn retry_move(src: &std::path::Path, dst: &std::path::Path) -> io::Result<()> {
    match std::fs::rename(src, dst) {
        Ok(()) => Ok(()),
        Err(e) if is_permission_denied(&e) => {
            // Retry once after a short delay — helps with Windows file locks
            std::thread::sleep(std::time::Duration::from_millis(100));
            std::fs::rename(src, dst)
        }
        Err(e) => Err(e),
    }
}

#[derive(Clone, serde::Serialize)]
pub struct ProgressEvent {
    pub current: usize,
    pub total: usize,
    pub file: String,
    pub status: String,
}

#[tauri::command]
#[instrument(skip(path), fields(path = %path))]
pub async fn scan_directory(path: String) -> Result<Vec<organizer::FileInfo>, String> {
    info!("Scanning directory");
    organizer::scan_directory(&path).map_err(|e| e.to_string())
}

#[tauri::command]
#[instrument(skip(app), fields(path = %path, dry_run))]
pub async fn organize_by_extension(
    app: tauri::AppHandle,
    path: String,
    dry_run: bool,
) -> Result<organizer::OrganizeResult, String> {
    info!("Organizing by extension");
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
            match retry_move(std::path::Path::new(&file.path), &target_file) {
                Ok(()) => {
                    result.moved += 1;
                    let entry = journal::JournalEntry {
                        id: 0,
                        operation_type: "move".to_string(),
                        source_path: file.path.clone(),
                        dest_path: target_file.to_string_lossy().to_string(),
                        timestamp: chrono::Utc::now().to_rfc3339(),
                        reverted: false,
                    };
                    let _ = journal::record_operation(&entry);
                }
                Err(e) => {
                    if is_permission_denied(&e) {
                        warn!(error = %e, file = %file.name, "Permission denied moving file");
                        result.errors.push(format!(
                            "Permission denied: {} (try running as administrator)",
                            file.name
                        ));
                    } else {
                        warn!(error = %e, file = %file.name, "Failed to move file");
                        result
                            .errors
                            .push(format!("Failed to move {}: {}", file.name, e));
                    }
                }
            }
        }

        let _ = app.emit(
            "afo://progress",
            ProgressEvent {
                current: i + 1,
                total: files.len(),
                file: file.name.clone(),
                status: if dry_run {
                    "preview".to_string()
                } else {
                    "moved".to_string()
                },
            },
        );
    }

    info!(
        moved = result.moved,
        skipped = result.skipped,
        "Organize complete"
    );
    Ok(result)
}

#[tauri::command]
#[instrument(skip(app), fields(path = %path, dry_run, date_format))]
pub async fn organize_by_date(
    app: tauri::AppHandle,
    path: String,
    dry_run: bool,
    date_format: Option<String>,
) -> Result<organizer::OrganizeResult, String> {
    info!("Organizing by date");
    let files = organizer::scan_directory(&path).map_err(|e| e.to_string())?;
    let mut result = organizer::OrganizeResult {
        total_files: files.len(),
        moved: 0,
        skipped: 0,
        errors: Vec::new(),
        dry_run,
    };

    let fmt = match date_format.as_deref() {
        Some("fulldate") => "%Y/%m/%d",
        _ => "%Y/%m",
    };

    for (i, file) in files.iter().enumerate() {
        if file.is_dir {
            result.skipped += 1;
            continue;
        }

        // Use get_file_date() which prefers EXIF date taken, falls back to fs timestamps
        let datetime = organizer::get_file_date(&file.path).unwrap_or_else(|| {
            std::fs::metadata(&file.path)
                .and_then(|m| m.modified())
                .map(|t| {
                    let dt: chrono::DateTime<chrono::Local> = t.into();
                    dt
                })
                .unwrap_or_else(|_| chrono::Local::now())
        });

        let date_folder = datetime.format(fmt).to_string();
        let target_dir = std::path::Path::new(&path).join(&date_folder);

        if dry_run {
            result.moved += 1;
        } else {
            if !target_dir.exists() {
                std::fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;
            }
            let target_file = organizer::unique_path(&target_dir.join(&file.name));
            match retry_move(std::path::Path::new(&file.path), &target_file) {
                Ok(()) => {
                    result.moved += 1;
                    let entry = journal::JournalEntry {
                        id: 0,
                        operation_type: "move".to_string(),
                        source_path: file.path.clone(),
                        dest_path: target_file.to_string_lossy().to_string(),
                        timestamp: chrono::Utc::now().to_rfc3339(),
                        reverted: false,
                    };
                    let _ = journal::record_operation(&entry);
                }
                Err(e) => {
                    if is_permission_denied(&e) {
                        warn!(error = %e, file = %file.name, "Permission denied moving file");
                        result.errors.push(format!(
                            "Permission denied: {} (try running as administrator)",
                            file.name
                        ));
                    } else {
                        warn!(error = %e, file = %file.name, "Failed to move file");
                        result
                            .errors
                            .push(format!("Failed to move {}: {}", file.name, e));
                    }
                }
            }
        }

        let _ = app.emit(
            "afo://progress",
            ProgressEvent {
                current: i + 1,
                total: files.len(),
                file: file.name.clone(),
                status: if dry_run {
                    "preview".to_string()
                } else {
                    "moved".to_string()
                },
            },
        );
    }

    info!(
        moved = result.moved,
        skipped = result.skipped,
        "Organize by date complete"
    );
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
            match retry_move(std::path::Path::new(&file.path), &target) {
                Ok(()) => {
                    result.moved += 1;
                    let entry = journal::JournalEntry {
                        id: 0,
                        operation_type: "rename".to_string(),
                        source_path: file.path.clone(),
                        dest_path: target.to_string_lossy().to_string(),
                        timestamp: chrono::Utc::now().to_rfc3339(),
                        reverted: false,
                    };
                    let _ = journal::record_operation(&entry);
                }
                Err(e) => {
                    if is_permission_denied(&e) {
                        warn!(error = %e, file = %file.name, "Permission denied renaming file");
                        result.errors.push(format!(
                            "Permission denied: {} (try running as administrator)",
                            file.name
                        ));
                    } else {
                        result
                            .errors
                            .push(format!("Failed to rename {}: {}", file.name, e));
                    }
                }
            }
        }

        counter += 1;

        let _ = app.emit(
            "afo://progress",
            ProgressEvent {
                current: i + 1,
                total: files.len(),
                file: file.name.clone(),
                status: if dry_run {
                    "preview".to_string()
                } else {
                    "renamed".to_string()
                },
            },
        );
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
pub async fn apply_rules(path: String, dry_run: bool) -> Result<organizer::OrganizeResult, String> {
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
pub async fn cleanup_quarantine_cmd(max_age_days: Option<u64>) -> Result<u64, String> {
    let days = max_age_days.unwrap_or(30);
    info!(max_age_days = days, "Cleaning up quarantine");
    duplicates::cleanup_quarantine(days).map_err(|e| e.to_string())
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
pub async fn run_schedule_now(app: tauri::AppHandle, id: String) -> Result<(), String> {
    scheduler::run_now(&id, &app)
        .await
        .map_err(|e| e.to_string())
}

// Cloud sync stubs (post-launch)

#[tauri::command]
pub async fn cloud_list_providers() -> Result<Vec<cloud_sync::CloudProvider>, String> {
    cloud_sync::list_providers().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn cloud_sync_now(path: String) -> Result<(), String> {
    cloud_sync::sync_to_cloud(&path).map_err(|e| e.to_string())
}

// ML categorization stub (post-launch)

#[tauri::command]
pub async fn ml_suggest_category(file_path: String) -> Result<String, String> {
    // Simple TF-IDF-like heuristic: match filename against known category keywords
    let name = std::path::Path::new(&file_path)
        .file_name()
        .map(|n| n.to_string_lossy().to_lowercase())
        .unwrap_or_default();

    let categories: Vec<(&[&str], &str)> = vec![
        (
            &["screenshot", "photo", "img", "image", "pic", "wallpaper"],
            "images",
        ),
        (
            &["invoice", "resume", "report", "contract", "doc", "pdf"],
            "documents",
        ),
        (
            &["song", "music", "audio", "podcast", "track", "album"],
            "audio",
        ),
        (
            &["video", "movie", "clip", "tutorial", "stream", "recording"],
            "video",
        ),
        (&["backup", "archive", "zip", "export", "dump"], "archives"),
        (
            &["main", "index", "app", "config", "test", "lib", "src"],
            "code",
        ),
    ];

    for (keywords, category) in &categories {
        if keywords.iter().any(|k| name.contains(k)) {
            return Ok(category.to_string());
        }
    }

    Ok("other".to_string())
}
