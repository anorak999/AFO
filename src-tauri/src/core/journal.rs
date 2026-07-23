// Undo/redo journal — SQLite via rusqlite

use std::fs;
use std::path::Path;
use std::sync::{Mutex, OnceLock};

use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct JournalEntry {
    pub id: i64,
    pub operation_type: String,
    pub source_path: String,
    pub dest_path: String,
    pub timestamp: String,
    pub reverted: bool,
}

static DB: OnceLock<Mutex<Connection>> = OnceLock::new();

fn db_path() -> std::path::PathBuf {
    let base = dirs::data_local_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
    base.join("afo").join("journal.db")
}

pub fn with_connection<F, R>(f: F) -> Result<R, String>
where
    F: FnOnce(&Connection) -> Result<R, String>,
{
    let db = DB
        .get()
        .ok_or("Journal not initialized — call init_journal()")?
        .lock()
        .map_err(|e| e.to_string())?;
    f(&db)
}

pub fn init_journal() -> Result<(), Box<dyn std::error::Error>> {
    let path = db_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }

    // Try to open existing database, backup if corrupt
    let db = match Connection::open(&path) {
        Ok(conn) => {
            // Verify database integrity
            let is_valid: bool = conn
                .pragma_query_value(None, "integrity_check", |row| row.get(0))
                .unwrap_or(false);
            if !is_valid {
                // Backup corrupt database
                let backup_path = path.with_extension("db.bak");
                let _ = fs::copy(&path, &backup_path);
                fs::remove_file(&path)?;
                Connection::open(&path)?
            } else {
                conn
            }
        }
        Err(_) => Connection::open(&path)?,
    };

    db.execute_batch(
        "PRAGMA journal_mode=WAL;
         PRAGMA busy_timeout = 5000;
         CREATE TABLE IF NOT EXISTS operations (
             id INTEGER PRIMARY KEY AUTOINCREMENT,
             operation_type TEXT NOT NULL,
             source_path TEXT NOT NULL,
             dest_path TEXT NOT NULL,
             timestamp TEXT NOT NULL,
             reverted INTEGER NOT NULL DEFAULT 0
         );
         CREATE INDEX IF NOT EXISTS idx_ops_reverted_ts ON operations(reverted, timestamp DESC);",
    )?;
    DB.set(Mutex::new(db))
        .map_err(|_| "Journal already initialized")?;
    Ok(())
}

pub fn record_operation(entry: &JournalEntry) -> Result<(), String> {
    with_connection(|db| {
        db.execute(
            "INSERT INTO operations (operation_type, source_path, dest_path, timestamp, reverted)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                entry.operation_type,
                entry.source_path,
                entry.dest_path,
                entry.timestamp,
                entry.reverted as i32,
            ],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    })
}

pub fn get_history(limit: i64, offset: i64) -> Result<Vec<JournalEntry>, String> {
    with_connection(|db| {
        let mut stmt = db
            .prepare(
                "SELECT id, operation_type, source_path, dest_path, timestamp, reverted
                 FROM operations
                 ORDER BY timestamp DESC
                 LIMIT ?1 OFFSET ?2",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![limit, offset], |row| {
                Ok(JournalEntry {
                    id: row.get(0)?,
                    operation_type: row.get(1)?,
                    source_path: row.get(2)?,
                    dest_path: row.get(3)?,
                    timestamp: row.get(4)?,
                    reverted: row.get::<_, i32>(5)? != 0,
                })
            })
            .map_err(|e| e.to_string())?;
        let entries: Vec<JournalEntry> = rows.filter_map(|r| r.ok()).collect();
        Ok(entries)
    })
}

/// Reverse a file operation based on its type
fn reverse_operation(entry: &JournalEntry) -> Result<(), Box<dyn std::error::Error>> {
    let src = Path::new(&entry.source_path);
    let dest = Path::new(&entry.dest_path);

    match entry.operation_type.as_str() {
        "move" => {
            // Move was: source -> dest
            // Undo: move dest -> source
            if dest.exists() {
                if let Some(parent) = src.parent() {
                    fs::create_dir_all(parent)?;
                }
                fs::rename(dest, src)?;
            }
        }
        "copy" => {
            // Copy was: source -> dest (source still exists)
            // Undo: delete dest
            if dest.exists() {
                fs::remove_file(dest)?;
            }
        }
        "rename" => {
            // Rename was: source -> dest
            // Undo: rename dest -> source
            if dest.exists() {
                fs::rename(dest, src)?;
            }
        }
        _ => {
            return Err(format!("Unknown operation type: {}", entry.operation_type).into());
        }
    }

    Ok(())
}

/// Forward a file operation (redo)
fn forward_operation(entry: &JournalEntry) -> Result<(), Box<dyn std::error::Error>> {
    let src = Path::new(&entry.source_path);
    let dest = Path::new(&entry.dest_path);

    match entry.operation_type.as_str() {
        "move" => {
            // Redo: move source -> dest
            if src.exists() {
                if let Some(parent) = dest.parent() {
                    fs::create_dir_all(parent)?;
                }
                fs::rename(src, dest)?;
            }
        }
        "copy" => {
            // Redo: copy source -> dest
            if src.exists() {
                if let Some(parent) = dest.parent() {
                    fs::create_dir_all(parent)?;
                }
                fs::copy(src, dest)?;
            }
        }
        "rename" => {
            // Redo: rename source -> dest
            if src.exists() {
                fs::rename(src, dest)?;
            }
        }
        _ => {
            return Err(format!("Unknown operation type: {}", entry.operation_type).into());
        }
    }

    Ok(())
}

pub fn undo_last() -> Result<Option<JournalEntry>, String> {
    let entry = with_connection(|db| {
        let entry: Option<JournalEntry> = db
            .query_row(
                "SELECT id, operation_type, source_path, dest_path, timestamp, reverted
                 FROM operations
                 WHERE reverted = 0
                 ORDER BY timestamp DESC
                 LIMIT 1",
                [],
                |row| {
                    Ok(JournalEntry {
                        id: row.get(0)?,
                        operation_type: row.get(1)?,
                        source_path: row.get(2)?,
                        dest_path: row.get(3)?,
                        timestamp: row.get(4)?,
                        reverted: row.get::<_, i32>(5)? != 0,
                    })
                },
            )
            .optional()
            .map_err(|e| e.to_string())?;
        Ok(entry)
    })?;

    if let Some(ref e) = entry {
        // Actually reverse the file operation
        reverse_operation(e).map_err(|e| e.to_string())?;

        // Mark as reverted in DB
        with_connection(|db| {
            db.execute(
                "UPDATE operations SET reverted = 1 WHERE id = ?1",
                params![e.id],
            )
            .map_err(|e| e.to_string())?;
            Ok(())
        })?;
    }

    Ok(entry)
}

pub fn undo_operation(id: i64) -> Result<Option<JournalEntry>, String> {
    let entry = with_connection(|db| {
        let entry: Option<JournalEntry> = db
            .query_row(
                "SELECT id, operation_type, source_path, dest_path, timestamp, reverted
                 FROM operations
                 WHERE id = ?1",
                params![id],
                |row| {
                    Ok(JournalEntry {
                        id: row.get(0)?,
                        operation_type: row.get(1)?,
                        source_path: row.get(2)?,
                        dest_path: row.get(3)?,
                        timestamp: row.get(4)?,
                        reverted: row.get::<_, i32>(5)? != 0,
                    })
                },
            )
            .optional()
            .map_err(|e| e.to_string())?;
        Ok(entry)
    })?;

    if let Some(ref e) = entry {
        // Actually reverse the file operation
        reverse_operation(e).map_err(|e| e.to_string())?;

        // Mark as reverted in DB
        with_connection(|db| {
            db.execute(
                "UPDATE operations SET reverted = 1 WHERE id = ?1",
                params![e.id],
            )
            .map_err(|e| e.to_string())?;
            Ok(())
        })?;
    }

    Ok(entry)
}

pub fn redo_last() -> Result<Option<JournalEntry>, String> {
    let entry = with_connection(|db| {
        let entry: Option<JournalEntry> = db
            .query_row(
                "SELECT id, operation_type, source_path, dest_path, timestamp, reverted
                 FROM operations
                 WHERE reverted = 1
                 ORDER BY timestamp DESC
                 LIMIT 1",
                [],
                |row| {
                    Ok(JournalEntry {
                        id: row.get(0)?,
                        operation_type: row.get(1)?,
                        source_path: row.get(2)?,
                        dest_path: row.get(3)?,
                        timestamp: row.get(4)?,
                        reverted: row.get::<_, i32>(5)? != 0,
                    })
                },
            )
            .optional()
            .map_err(|e| e.to_string())?;
        Ok(entry)
    })?;

    if let Some(ref e) = entry {
        // Actually redo the file operation
        forward_operation(e).map_err(|e| e.to_string())?;

        // Mark as not reverted in DB
        with_connection(|db| {
            db.execute(
                "UPDATE operations SET reverted = 0 WHERE id = ?1",
                params![e.id],
            )
            .map_err(|e| e.to_string())?;
            Ok(())
        })?;
    }

    Ok(entry)
}
