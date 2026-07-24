// Live Capture — real-time file monitoring, indexing, and permission gates

use std::fs;
use std::path::{Path, PathBuf};

use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use tracing::info;

use crate::core::journal;

// ── Types ───────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum CaptureMode {
    AutoOrganize,
    NotifyOnly,
    FullCapture,
}

impl Default for CaptureMode {
    fn default() -> Self {
        CaptureMode::AutoOrganize
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirectoryConfig {
    pub path: String,
    pub capture_mode: CaptureMode,
    pub enabled: bool,
    #[serde(default)]
    pub always_allow_rules: Vec<String>,
    pub scan_interval_minutes: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CaptureConfig {
    #[serde(default)]
    pub directories: Vec<DirectoryConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexedFile {
    pub id: i64,
    pub path: String,
    pub filename: String,
    pub extension: String,
    pub size: i64,
    pub hash: Option<String>,
    pub watched_dir: String,
    pub created_at: String,
    pub modified_at: String,
    pub indexed_at: String,
    pub last_seen: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileChange {
    pub id: i64,
    pub file_path: String,
    pub change_type: String,
    pub old_path: Option<String>,
    pub file_size: Option<i64>,
    pub timestamp: String,
    pub watched_dir: String,
    pub metadata: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PendingAction {
    pub id: i64,
    pub source_path: String,
    pub dest_path: String,
    pub action_type: String,
    pub rule_name: Option<String>,
    pub watched_dir: String,
    pub created_at: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaptureStats {
    pub total_indexed_files: i64,
    pub total_changes_today: i64,
    pub pending_actions: i64,
    pub watched_dirs_count: i64,
    pub total_disk_usage: i64,
    pub last_scan_time: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirStats {
    pub path: String,
    pub file_count: i64,
    pub disk_usage: i64,
    pub changes_per_minute: f64,
    pub capture_mode: CaptureMode,
    pub active_rules: i64,
    pub last_triggered_rule: Option<String>,
}

pub enum HandleResult {
    AutoOrganized,
    QueuedForApproval,
    Captured,
    Skipped,
}

// ── DB Access ───────────────────────────────────────────────────────

fn with_db<F, R>(f: F) -> Result<R, String>
where
    F: FnOnce(&Connection) -> Result<R, String>,
{
    // Reuse the journal DB connection
    journal::with_connection(f)
}

// ── Config Persistence ──────────────────────────────────────────────

fn config_path() -> PathBuf {
    let base = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
    base.join("afo").join("capture_config.json")
}

pub fn load_capture_config() -> CaptureConfig {
    let path = config_path();
    match fs::read_to_string(&path) {
        Ok(data) => serde_json::from_str(&data).unwrap_or_default(),
        Err(_) => CaptureConfig {
            directories: Vec::new(),
        },
    }
}

pub fn save_capture_config(config: &CaptureConfig) -> Result<(), String> {
    let path = config_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}

// ── Directory Config CRUD ───────────────────────────────────────────

pub fn set_capture_mode(dir: &str, mode: CaptureMode) -> Result<(), String> {
    let mut config = load_capture_config();
    if let Some(d) = config.directories.iter_mut().find(|d| d.path == dir) {
        d.capture_mode = mode;
    } else {
        config.directories.push(DirectoryConfig {
            path: dir.to_string(),
            capture_mode: mode,
            enabled: true,
            always_allow_rules: Vec::new(),
            scan_interval_minutes: None,
        });
    }
    save_capture_config(&config)
}

pub fn get_directory_config(dir: &str) -> Option<DirectoryConfig> {
    load_capture_config()
        .directories
        .into_iter()
        .find(|d| d.path == dir)
}

pub fn toggle_always_allow(dir: &str, rule_id: &str, allow: bool) -> Result<(), String> {
    let mut config = load_capture_config();
    let d = config
        .directories
        .iter_mut()
        .find(|d| d.path == dir)
        .ok_or_else(|| format!("Directory not found: {}", dir))?;
    if allow {
        if !d.always_allow_rules.contains(&rule_id.to_string()) {
            d.always_allow_rules.push(rule_id.to_string());
        }
    } else {
        d.always_allow_rules.retain(|r| r != rule_id);
    }
    save_capture_config(&config)
}

pub fn set_scan_interval(dir: &str, minutes: Option<u64>) -> Result<(), String> {
    let mut config = load_capture_config();
    let d = config
        .directories
        .iter_mut()
        .find(|d| d.path == dir)
        .ok_or_else(|| format!("Directory not found: {}", dir))?;
    d.scan_interval_minutes = minutes;
    save_capture_config(&config)
}

pub fn set_dir_enabled(dir: &str, enabled: bool) -> Result<(), String> {
    let mut config = load_capture_config();
    if let Some(d) = config.directories.iter_mut().find(|d| d.path == dir) {
        d.enabled = enabled;
        save_capture_config(&config)
    } else {
        Err(format!("Directory not found: {}", dir))
    }
}

pub fn get_all_dir_configs() -> Vec<DirectoryConfig> {
    load_capture_config().directories
}

pub fn remove_directory(dir: &str) -> Result<(), String> {
    let mut config = load_capture_config();
    let initial_len = config.directories.len();
    config.directories.retain(|d| d.path != dir);
    if config.directories.len() == initial_len {
        return Err(format!("Directory not found: {}", dir));
    }
    save_capture_config(&config)
}

// ── File Index Operations ───────────────────────────────────────────

pub fn index_file(path: &str, watched_dir: &str) -> Result<(), String> {
    let p = Path::new(path);
    let metadata = fs::metadata(p).map_err(|e| e.to_string())?;
    let filename = p
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();
    let extension = p
        .extension()
        .map(|e| e.to_string_lossy().to_string())
        .unwrap_or_default();
    let size = metadata.len() as i64;
    let created = format_timestamp(metadata.created().ok());
    let modified = format_timestamp(metadata.modified().ok());

    with_db(|db| {
        db.execute(
            "INSERT OR REPLACE INTO file_index (path, filename, extension, size, watched_dir, created_at, modified_at, last_seen)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, datetime('now'))",
            params![path, filename, extension, size, watched_dir, created, modified],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    })
}

pub fn remove_file_from_index(path: &str) -> Result<(), String> {
    with_db(|db| {
        db.execute("DELETE FROM file_index WHERE path = ?1", params![path])
            .map_err(|e| e.to_string())?;
        Ok(())
    })
}

pub fn update_file_hash(path: &str, hash: &str) -> Result<(), String> {
    with_db(|db| {
        db.execute(
            "UPDATE file_index SET hash = ?1 WHERE path = ?2",
            params![hash, path],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    })
}

pub fn search_index(
    query: &str,
    ext_filter: Option<&str>,
    limit: i64,
) -> Result<Vec<IndexedFile>, String> {
    with_db(|db| {
        let mut sql = String::from(
            "SELECT id, path, filename, extension, size, hash, watched_dir, created_at, modified_at, indexed_at, last_seen FROM file_index WHERE 1=1",
        );
        let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

        if !query.is_empty() {
            sql.push_str(" AND (filename LIKE ?1 OR path LIKE ?1)");
            param_values.push(Box::new(format!("%{}%", query)));
        }
        if let Some(ext) = ext_filter {
            let idx = param_values.len() + 1;
            sql.push_str(&format!(" AND extension = ?{}", idx));
            param_values.push(Box::new(ext.to_string()));
        }
        sql.push_str(" ORDER BY modified_at DESC LIMIT ?");
        param_values.push(Box::new(limit));

        let params_ref: Vec<&dyn rusqlite::types::ToSql> =
            param_values.iter().map(|p| p.as_ref()).collect();

        let mut stmt = db.prepare(&sql).map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params_ref.as_slice(), |row| {
                Ok(IndexedFile {
                    id: row.get(0)?,
                    path: row.get(1)?,
                    filename: row.get(2)?,
                    extension: row.get(3)?,
                    size: row.get(4)?,
                    hash: row.get(5)?,
                    watched_dir: row.get(6)?,
                    created_at: row.get(7)?,
                    modified_at: row.get(8)?,
                    indexed_at: row.get(9)?,
                    last_seen: row.get(10)?,
                })
            })
            .map_err(|e| e.to_string())?;
        let mut files = Vec::new();
        for row in rows {
            files.push(row.map_err(|e| e.to_string())?);
        }
        Ok(files)
    })
}

pub fn get_indexed_files(
    watched_dir: &str,
    limit: i64,
    offset: i64,
) -> Result<Vec<IndexedFile>, String> {
    with_db(|db| {
        let mut stmt = db
            .prepare(
                "SELECT id, path, filename, extension, size, hash, watched_dir, created_at, modified_at, indexed_at, last_seen
                 FROM file_index WHERE watched_dir = ?1 ORDER BY modified_at DESC LIMIT ?2 OFFSET ?3",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![watched_dir, limit, offset], |row| {
                Ok(IndexedFile {
                    id: row.get(0)?,
                    path: row.get(1)?,
                    filename: row.get(2)?,
                    extension: row.get(3)?,
                    size: row.get(4)?,
                    hash: row.get(5)?,
                    watched_dir: row.get(6)?,
                    created_at: row.get(7)?,
                    modified_at: row.get(8)?,
                    indexed_at: row.get(9)?,
                    last_seen: row.get(10)?,
                })
            })
            .map_err(|e| e.to_string())?;
        let mut files = Vec::new();
        for row in rows {
            files.push(row.map_err(|e| e.to_string())?);
        }
        Ok(files)
    })
}

pub fn get_file_count(watched_dir: &str) -> Result<i64, String> {
    with_db(|db| {
        let count: i64 = db
            .query_row(
                "SELECT COUNT(*) FROM file_index WHERE watched_dir = ?1",
                params![watched_dir],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;
        Ok(count)
    })
}

// ── Change Log ──────────────────────────────────────────────────────

pub fn log_file_change(
    path: &str,
    change_type: &str,
    old_path: Option<&str>,
    watched_dir: &str,
    size: Option<i64>,
) -> Result<(), String> {
    with_db(|db| {
        db.execute(
            "INSERT INTO file_changes (file_path, change_type, old_path, file_size, watched_dir)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![path, change_type, old_path, size, watched_dir],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    })
}

pub fn get_file_history(path: &str, limit: i64) -> Result<Vec<FileChange>, String> {
    with_db(|db| {
        let mut stmt = db
            .prepare(
                "SELECT id, file_path, change_type, old_path, file_size, timestamp, watched_dir, metadata
                 FROM file_changes WHERE file_path = ?1 ORDER BY timestamp DESC LIMIT ?2",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![path, limit], |row| {
                Ok(FileChange {
                    id: row.get(0)?,
                    file_path: row.get(1)?,
                    change_type: row.get(2)?,
                    old_path: row.get(3)?,
                    file_size: row.get(4)?,
                    timestamp: row.get(5)?,
                    watched_dir: row.get(6)?,
                    metadata: row.get(7)?,
                })
            })
            .map_err(|e| e.to_string())?;
        let mut changes = Vec::new();
        for row in rows {
            changes.push(row.map_err(|e| e.to_string())?);
        }
        Ok(changes)
    })
}

pub fn get_recent_changes(
    watched_dir: Option<&str>,
    minutes: i64,
    limit: i64,
) -> Result<Vec<FileChange>, String> {
    with_db(|db| {
        let (sql, param_values): (String, Vec<Box<dyn rusqlite::types::ToSql>>) = if let Some(dir) = watched_dir {
            (
                "SELECT id, file_path, change_type, old_path, file_size, timestamp, watched_dir, metadata
                 FROM file_changes WHERE watched_dir = ?1 AND timestamp >= datetime('now', '-' || ?2 || ' minutes')
                 ORDER BY timestamp DESC LIMIT ?3".to_string(),
                vec![Box::new(dir.to_string()), Box::new(minutes), Box::new(limit)],
            )
        } else {
            (
                "SELECT id, file_path, change_type, old_path, file_size, timestamp, watched_dir, metadata
                 FROM file_changes WHERE timestamp >= datetime('now', '-' || ?1 || ' minutes')
                 ORDER BY timestamp DESC LIMIT ?2".to_string(),
                vec![Box::new(minutes), Box::new(limit)],
            )
        };
        let params_ref: Vec<&dyn rusqlite::types::ToSql> =
            param_values.iter().map(|p| p.as_ref()).collect();
        let mut stmt = db.prepare(&sql).map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params_ref.as_slice(), |row| {
                Ok(FileChange {
                    id: row.get(0)?,
                    file_path: row.get(1)?,
                    change_type: row.get(2)?,
                    old_path: row.get(3)?,
                    file_size: row.get(4)?,
                    timestamp: row.get(5)?,
                    watched_dir: row.get(6)?,
                    metadata: row.get(7)?,
                })
            })
            .map_err(|e| e.to_string())?;
        let mut changes = Vec::new();
        for row in rows {
            changes.push(row.map_err(|e| e.to_string())?);
        }
        Ok(changes)
    })
}

// ── Pending Actions ─────────────────────────────────────────────────

pub fn queue_pending_action(
    source: &str,
    dest: &str,
    action_type: &str,
    rule_name: Option<&str>,
    watched_dir: &str,
) -> Result<PendingAction, String> {
    with_db(|db| {
        db.execute(
            "INSERT INTO pending_actions (source_path, dest_path, action_type, rule_name, watched_dir)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![source, dest, action_type, rule_name, watched_dir],
        )
        .map_err(|e| e.to_string())?;
        let id = db.last_insert_rowid();
        Ok(PendingAction {
            id,
            source_path: source.to_string(),
            dest_path: dest.to_string(),
            action_type: action_type.to_string(),
            rule_name: rule_name.map(|s| s.to_string()),
            watched_dir: watched_dir.to_string(),
            created_at: chrono::Utc::now().to_rfc3339(),
            status: "pending".to_string(),
        })
    })
}

pub fn get_pending_actions(watched_dir: Option<&str>) -> Result<Vec<PendingAction>, String> {
    with_db(|db| {
        let (sql, param_values): (String, Vec<Box<dyn rusqlite::types::ToSql>>) = if let Some(dir) = watched_dir {
            (
                "SELECT id, source_path, dest_path, action_type, rule_name, watched_dir, created_at, status
                 FROM pending_actions WHERE status = 'pending' AND watched_dir = ?1 ORDER BY created_at DESC".to_string(),
                vec![Box::new(dir.to_string())],
            )
        } else {
            (
                "SELECT id, source_path, dest_path, action_type, rule_name, watched_dir, created_at, status
                 FROM pending_actions WHERE status = 'pending' ORDER BY created_at DESC".to_string(),
                vec![],
            )
        };
        let params_ref: Vec<&dyn rusqlite::types::ToSql> =
            param_values.iter().map(|p| p.as_ref()).collect();
        let mut stmt = db.prepare(&sql).map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params_ref.as_slice(), |row| {
                Ok(PendingAction {
                    id: row.get(0)?,
                    source_path: row.get(1)?,
                    dest_path: row.get(2)?,
                    action_type: row.get(3)?,
                    rule_name: row.get(4)?,
                    watched_dir: row.get(5)?,
                    created_at: row.get(6)?,
                    status: row.get(7)?,
                })
            })
            .map_err(|e| e.to_string())?;
        let mut actions = Vec::new();
        for row in rows {
            actions.push(row.map_err(|e| e.to_string())?);
        }
        Ok(actions)
    })
}

pub fn approve_pending_action(id: i64) -> Result<Option<PendingAction>, String> {
    let action = with_db(|db| {
        let mut stmt = db
            .prepare(
                "SELECT id, source_path, dest_path, action_type, rule_name, watched_dir, created_at, status
                 FROM pending_actions WHERE id = ?1 AND status = 'pending'",
            )
            .map_err(|e| e.to_string())?;
        stmt.query_row(params![id], |row| {
            Ok(PendingAction {
                id: row.get(0)?,
                source_path: row.get(1)?,
                dest_path: row.get(2)?,
                action_type: row.get(3)?,
                rule_name: row.get(4)?,
                watched_dir: row.get(5)?,
                created_at: row.get(6)?,
                status: row.get(7)?,
            })
        })
        .optional()
        .map_err(|e| e.to_string())
    })?;

    if let Some(ref action) = action {
        // Execute the action
        let src = Path::new(&action.source_path);
        let dst = Path::new(&action.dest_path);

        if action.action_type == "move" || action.action_type == "rename" {
            if let Some(parent) = dst.parent() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            fs::rename(src, dst).map_err(|e| e.to_string())?;
        } else if action.action_type == "copy" {
            if let Some(parent) = dst.parent() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            fs::copy(src, dst).map_err(|e| e.to_string())?;
        }

        // Record in journal
        let entry = journal::JournalEntry {
            id: 0,
            operation_type: action.action_type.clone(),
            source_path: action.source_path.clone(),
            dest_path: action.dest_path.clone(),
            timestamp: chrono::Utc::now().to_rfc3339(),
            reverted: false,
        };
        let _ = journal::record_operation(&entry);

        // Mark as approved
        with_db(|db| {
            db.execute(
                "UPDATE pending_actions SET status = 'approved' WHERE id = ?1",
                params![id],
            )
            .map_err(|e| e.to_string())?;
            Ok(())
        })?;

        info!(id = id, source = %action.source_path, "Approved pending action");
    }

    Ok(action)
}

pub fn reject_pending_action(id: i64) -> Result<(), String> {
    with_db(|db| {
        db.execute(
            "UPDATE pending_actions SET status = 'rejected' WHERE id = ?1 AND status = 'pending'",
            params![id],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    })
}

pub fn approve_all_pending(watched_dir: Option<&str>) -> Result<Vec<PendingAction>, String> {
    let pending = get_pending_actions(watched_dir)?;
    let mut approved = Vec::new();
    for action in pending {
        if let Some(approved_action) = approve_pending_action(action.id)? {
            approved.push(approved_action);
        }
    }
    Ok(approved)
}

pub fn reject_all_pending(watched_dir: Option<&str>) -> Result<(), String> {
    let pending = get_pending_actions(watched_dir)?;
    for action in pending {
        reject_pending_action(action.id)?;
    }
    Ok(())
}

// ── Statistics ──────────────────────────────────────────────────────

pub fn get_capture_stats() -> Result<CaptureStats, String> {
    with_db(|db| {
        let total_indexed: i64 = db
            .query_row("SELECT COUNT(*) FROM file_index", [], |row| row.get(0))
            .map_err(|e| e.to_string())?;
        let changes_today: i64 = db
            .query_row(
                "SELECT COUNT(*) FROM file_changes WHERE timestamp >= date('now')",
                [],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;
        let pending: i64 = db
            .query_row(
                "SELECT COUNT(*) FROM pending_actions WHERE status = 'pending'",
                [],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;
        let total_size: i64 = db
            .query_row("SELECT COALESCE(SUM(size), 0) FROM file_index", [], |row| {
                row.get(0)
            })
            .map_err(|e| e.to_string())?;
        let last_scan: Option<String> = db
            .query_row(
                "SELECT MAX(indexed_at) FROM file_index",
                [],
                |row| row.get(0),
            )
            .ok();

        Ok(CaptureStats {
            total_indexed_files: total_indexed,
            total_changes_today: changes_today,
            pending_actions: pending,
            watched_dirs_count: load_capture_config().directories.len() as i64,
            total_disk_usage: total_size,
            last_scan_time: last_scan,
        })
    })
}

pub fn get_dir_stats(dir: &str) -> Result<DirStats, String> {
    let config = load_capture_config();
    let dir_config = config
        .directories
        .iter()
        .find(|d| d.path == dir)
        .cloned()
        .unwrap_or(DirectoryConfig {
            path: dir.to_string(),
            capture_mode: CaptureMode::default(),
            enabled: true,
            always_allow_rules: Vec::new(),
            scan_interval_minutes: None,
        });

    with_db(|db| {
        let file_count: i64 = db
            .query_row(
                "SELECT COUNT(*) FROM file_index WHERE watched_dir = ?1",
                params![dir],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;
        let disk_usage: i64 = db
            .query_row(
                "SELECT COALESCE(SUM(size), 0) FROM file_index WHERE watched_dir = ?1",
                params![dir],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;
        let changes_last_hour: i64 = db
            .query_row(
                "SELECT COUNT(*) FROM file_changes WHERE watched_dir = ?1 AND timestamp >= datetime('now', '-1 hour')",
                params![dir],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;
        let changes_per_minute = changes_last_hour as f64 / 60.0;

        let last_rule: Option<String> = db
            .query_row(
                "SELECT rule_name FROM file_changes WHERE watched_dir = ?1 AND rule_name IS NOT NULL ORDER BY timestamp DESC LIMIT 1",
                params![dir],
                |row| row.get(0),
            )
            .ok();

        Ok(DirStats {
            path: dir.to_string(),
            file_count,
            disk_usage,
            changes_per_minute,
            capture_mode: dir_config.capture_mode,
            active_rules: dir_config.always_allow_rules.len() as i64,
            last_triggered_rule: last_rule,
        })
    })
}

// ── Directory Indexing ──────────────────────────────────────────────

pub fn scan_and_index(dir: &str) -> Result<i64, String> {
    let mut count = 0i64;
    scan_dir_recursive(dir, dir, &mut count)?;
    info!(dir = dir, files_indexed = count, "Directory scan complete");
    Ok(count)
}

fn scan_dir_recursive(dir: &str, watched_dir: &str, count: &mut i64) -> Result<(), String> {
    let entries = fs::read_dir(dir).map_err(|e| e.to_string())?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let metadata = entry.metadata().map_err(|e| e.to_string())?;

        if metadata.is_file() {
            let path_str = path.to_string_lossy().to_string();
            if index_file(&path_str, watched_dir).is_ok() {
                *count += 1;
            }
        } else if metadata.is_dir() {
            let _ = scan_dir_recursive(&path.to_string_lossy(), watched_dir, count);
        }
    }
    Ok(())
}

// ── Core Hook ───────────────────────────────────────────────────────

pub fn handle_file_event(
    path: &str,
    change_type: &str,
    watched_dir: &str,
) -> Result<HandleResult, String> {
    // Always log the change
    let _ = log_file_change(path, change_type, None, watched_dir, None);

    let dir_config = get_directory_config(watched_dir);

    match dir_config
        .as_ref()
        .map(|d| d.capture_mode.clone())
        .unwrap_or_default()
    {
        CaptureMode::FullCapture => {
            let _ = index_file(path, watched_dir);
            Ok(HandleResult::Captured)
        }
        CaptureMode::NotifyOnly => {
            // Create a pending action for this file
            // The dest_path is computed from the first matching rule in watcher.rs
            // For now, queue with a placeholder dest that will be updated when rule matches
            let p = Path::new(path);
            let filename = p.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default();
            let placeholder_dest = format!("{}/{}", watched_dir, filename);
            let _ = queue_pending_action(path, &placeholder_dest, "move", None, watched_dir);
            Ok(HandleResult::QueuedForApproval)
        }
        CaptureMode::AutoOrganize => Ok(HandleResult::AutoOrganized),
    }
}

// ── Helpers ─────────────────────────────────────────────────────────

fn format_timestamp(time: Option<std::time::SystemTime>) -> String {
    match time {
        Some(t) => {
            let dt: chrono::DateTime<chrono::Utc> = t.into();
            dt.to_rfc3339()
        }
        None => chrono::Utc::now().to_rfc3339(),
    }
}

pub fn init_capture() -> Result<(), Box<dyn std::error::Error>> {
    with_db(|db| {
        db.execute_batch(
            "CREATE TABLE IF NOT EXISTS file_index (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                path TEXT NOT NULL UNIQUE,
                filename TEXT NOT NULL,
                extension TEXT NOT NULL DEFAULT '',
                size INTEGER NOT NULL DEFAULT 0,
                hash TEXT,
                watched_dir TEXT NOT NULL,
                created_at TEXT NOT NULL,
                modified_at TEXT NOT NULL,
                indexed_at TEXT NOT NULL DEFAULT (datetime('now')),
                last_seen TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_fi_watched ON file_index(watched_dir);
            CREATE INDEX IF NOT EXISTS idx_fi_ext ON file_index(extension);
            CREATE INDEX IF NOT EXISTS idx_fi_path ON file_index(path);

            CREATE TABLE IF NOT EXISTS file_changes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_path TEXT NOT NULL,
                change_type TEXT NOT NULL,
                old_path TEXT,
                file_size INTEGER,
                timestamp TEXT NOT NULL DEFAULT (datetime('now')),
                watched_dir TEXT NOT NULL,
                metadata TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_fc_path ON file_changes(file_path);
            CREATE INDEX IF NOT EXISTS idx_fc_time ON file_changes(timestamp DESC);
            CREATE INDEX IF NOT EXISTS idx_fc_dir ON file_changes(watched_dir);

            CREATE TABLE IF NOT EXISTS pending_actions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_path TEXT NOT NULL,
                dest_path TEXT NOT NULL,
                action_type TEXT NOT NULL,
                rule_name TEXT,
                watched_dir TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                status TEXT NOT NULL DEFAULT 'pending'
            );
            CREATE INDEX IF NOT EXISTS idx_pa_status ON pending_actions(status);",
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    })
    .map_err(|e| -> Box<dyn std::error::Error> { e.into() })?;
    info!("Capture module initialized");
    Ok(())
}
