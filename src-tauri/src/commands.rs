use crate::core::duplicates;
use crate::core::journal;
use crate::core::organizer;
use crate::core::rule_engine;

#[tauri::command]
pub async fn scan_directory(path: String) -> Result<Vec<organizer::FileInfo>, String> {
    organizer::scan_directory(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn organize_by_extension(
    path: String,
    dry_run: bool,
) -> Result<organizer::OrganizeResult, String> {
    organizer::organize_by_extension(&path, dry_run)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn organize_by_date(
    path: String,
    dry_run: bool,
) -> Result<organizer::OrganizeResult, String> {
    organizer::organize_by_date(&path, dry_run)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn batch_rename(
    path: String,
    pattern: String,
    dry_run: bool,
) -> Result<organizer::OrganizeResult, String> {
    organizer::batch_rename(&path, &pattern, dry_run)
        .await
        .map_err(|e| e.to_string())
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
