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
