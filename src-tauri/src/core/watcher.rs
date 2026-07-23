use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, Instant};

use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;
use tracing::{error, info, warn};

use crate::core::journal;
use crate::core::organizer::unique_path;
use crate::core::rule_engine;
use tauri::Emitter;

const DEBOUNCE_MS: u64 = 300;
const MAX_OPS_PER_SECOND: usize = 10;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WatchedDir {
    pub path: String,
    pub enabled: bool,
}

struct WatcherState {
    watcher: RecommendedWatcher,
    watched: HashMap<String, bool>,
    last_events: HashMap<String, Instant>,
    ops_count: Arc<AtomicUsize>,
    ops_reset_time: Instant,
}

static STATE: OnceLock<Mutex<WatcherState>> = OnceLock::new();

fn with_state<F, R>(f: F) -> Result<R, String>
where
    F: FnOnce(&mut WatcherState) -> Result<R, String>,
{
    let state = STATE
        .get()
        .ok_or("Watcher not initialized")?
        .lock()
        .map_err(|e| e.to_string())?;
    let mut state = state;
    f(&mut state)
}

pub fn init_watcher(tx: mpsc::Sender<String>) -> Result<(), Box<dyn std::error::Error>> {
    let (watcher_tx, mut watcher_rx) = tokio::sync::mpsc::channel::<String>(100);

    let watcher = RecommendedWatcher::new(
        move |res: Result<Event, notify::Error>| {
            if let Ok(event) = res {
                match event.kind {
                    EventKind::Create(_) | EventKind::Modify(_) => {
                        for path in &event.paths {
                            if path.is_file() {
                                let _ =
                                    watcher_tx.blocking_send(path.to_string_lossy().to_string());
                            }
                        }
                    }
                    _ => {}
                }
            }
        },
        Config::default(),
    )?;

    // Spawn debounce and rate-limiting task in a dedicated thread
    // (not tokio::spawn — the Tauri setup hook runs before the Tokio reactor is available)
    let tx_clone = tx.clone();
    std::thread::Builder::new()
        .name("watcher-debounce".into())
        .spawn(move || {
            let rt = tokio::runtime::Builder::new_current_thread()
                .enable_all()
                .build()
                .expect("Failed to create tokio runtime for watcher debounce");

            rt.block_on(async move {
                let mut pending: HashMap<String, Instant> = HashMap::new();

                loop {
                    match tokio::time::timeout(
                        Duration::from_millis(DEBOUNCE_MS),
                        watcher_rx.recv(),
                    )
                    .await
                    {
                        Ok(Some(path)) => {
                            pending.insert(path, Instant::now());
                        }
                        Ok(None) => break,
                        Err(_) => {
                            let now = Instant::now();
                            let ready: Vec<String> = pending
                                .iter()
                                .filter(|(_, time)| {
                                    now.duration_since(**time)
                                        >= Duration::from_millis(DEBOUNCE_MS)
                                })
                                .map(|(path, _)| path.clone())
                                .collect();

                            for path in &ready {
                                pending.remove(path);
                                let _ = tx_clone.send(path.clone()).await;
                            }
                        }
                    }
                }
            });
        })?;

    let state = WatcherState {
        watcher,
        watched: HashMap::new(),
        last_events: HashMap::new(),
        ops_count: Arc::new(AtomicUsize::new(0)),
        ops_reset_time: Instant::now(),
    };

    STATE
        .set(Mutex::new(state))
        .map_err(|_| "Watcher already initialized")?;

    Ok(())
}

/// Process a file event: evaluate rules, execute actions, journal, emit event
pub async fn process_file_event(
    path: &str,
    app: &tauri::AppHandle,
) -> Result<(), Box<dyn std::error::Error>> {
    // Rate limiting
    {
        let state = STATE.get().ok_or("Watcher not initialized")?;
        let mut state = state.lock().map_err(|e| e.to_string())?;

        // Reset counter every second
        if state.ops_reset_time.elapsed() >= Duration::from_secs(1) {
            state.ops_count.store(0, Ordering::Relaxed);
            state.ops_reset_time = Instant::now();
        }

        let count = state.ops_count.fetch_add(1, Ordering::Relaxed);
        if count >= MAX_OPS_PER_SECOND {
            warn!(path = path, "Rate limit exceeded, skipping event");
            return Ok(());
        }
    }

    // Check debounce
    {
        let state = STATE.get().ok_or("Watcher not initialized")?;
        let mut state = state.lock().map_err(|e| e.to_string())?;

        if let Some(last_time) = state.last_events.get(path) {
            if last_time.elapsed() < Duration::from_millis(DEBOUNCE_MS) {
                return Ok(());
            }
        }
        state.last_events.insert(path.to_string(), Instant::now());
    }

    // ── Live Capture hook: check capture mode before rule evaluation ──
    // This runs AFTER debounce, BEFORE rule evaluation. It decides whether
    // to auto-organize, queue for approval, or just index the file.
    let watched_dir = find_watched_dir_for_path(path);
    if let Some(ref dir) = watched_dir {
        match crate::core::capture::handle_file_event(path, "modify", dir) {
            Ok(crate::core::capture::HandleResult::QueuedForApproval) => {
                // File queued for approval — emit event, skip rule evaluation
                let filename = std::path::Path::new(path)
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default();
                let _ = app.emit(
                    "afo://pending-action",
                    serde_json::json!({
                        "source": path,
                        "filename": filename,
                        "watched_dir": dir,
                    }),
                );
                info!(path = path, dir = dir, "File queued for approval (NotifyOnly mode)");
                return Ok(());
            }
            Ok(crate::core::capture::HandleResult::Captured) => {
                // File indexed (FullCapture mode) — skip rule evaluation
                info!(path = path, dir = dir, "File captured and indexed (FullCapture mode)");
                return Ok(());
            }
            Ok(crate::core::capture::HandleResult::AutoOrganized) => {
                // Proceed with existing rule evaluation (unchanged behavior)
            }
            Ok(crate::core::capture::HandleResult::Skipped) => {
                // No capture config — proceed with existing behavior
            }
            Err(e) => {
                warn!(error = %e, path = path, "Capture hook failed, falling back to normal flow");
            }
        }
    }

    // ── Issue #5 fix: Cache rules in a thread-local to avoid disk reads ───
    // Before: load_rules() was called on every file event, triggering a disk
    // read + JSON parse per event. During bulk copy of 100 files, that's 100
    // redundant reads. Now rules are cached for 5 seconds and only re-read
    // when the cache expires.
    thread_local! {
        static RULES_CACHE: std::cell::RefCell<Option<(Vec<rule_engine::Rule>, Instant)>> =
            std::cell::RefCell::new(None);
    }

    let enabled_rules: Vec<rule_engine::Rule> = RULES_CACHE.with(|cache| {
        let mut cache = cache.borrow_mut();
        if let Some((ref rules, loaded_at)) = *cache {
            if loaded_at.elapsed() < Duration::from_secs(5) {
                return rules.clone();
            }
        }
        let rules = rule_engine::load_rules();
        *cache = Some((rules.clone(), Instant::now()));
        rules
    });
    let enabled_refs: Vec<&rule_engine::Rule> =
        enabled_rules.iter().filter(|r| r.enabled).collect();

    for rule in &enabled_refs {
        if rule_engine::evaluate(path, rule) {
            info!(path = path, rule = rule.name, "File matched rule");

            // Execute actions
            let file_path = std::path::Path::new(path);
            let filename = file_path
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default();

            for action in &rule.actions {
                match action {
                    rule_engine::Action::Move { destination } => {
                        let dest_dir = std::path::Path::new(destination);
                        std::fs::create_dir_all(dest_dir)?;
                        let target = unique_path(&dest_dir.join(&filename));

                        // Record in journal before move
                        let entry = journal::JournalEntry {
                            id: 0,
                            operation_type: "move".to_string(),
                            source_path: path.to_string(),
                            dest_path: target.to_string_lossy().to_string(),
                            timestamp: chrono::Utc::now().to_rfc3339(),
                            reverted: false,
                        };
                        let _ = journal::record_operation(&entry);

                        match std::fs::rename(path, &target) {
                            Ok(()) => {
                                let dest_str = target.to_string_lossy().to_string();
                                info!(source = path, dest = dest_str, "Auto-organized file");
                                let _ = app.emit(
                                    "afo://activity",
                                    serde_json::json!({
                                        "type": "move",
                                        "source": path,
                                        "destination": dest_str,
                                        "rule": rule.name,
                                    }),
                                );
                            }
                            Err(e) => {
                                error!(error = %e, path = path, "Failed to auto-organize file");
                            }
                        }
                    }
                    rule_engine::Action::Copy { destination } => {
                        let dest_dir = std::path::Path::new(destination);
                        std::fs::create_dir_all(dest_dir)?;
                        let target = unique_path(&dest_dir.join(&filename));

                        let entry = journal::JournalEntry {
                            id: 0,
                            operation_type: "copy".to_string(),
                            source_path: path.to_string(),
                            dest_path: target.to_string_lossy().to_string(),
                            timestamp: chrono::Utc::now().to_rfc3339(),
                            reverted: false,
                        };
                        let _ = journal::record_operation(&entry);

                        match std::fs::copy(path, &target) {
                            Ok(_) => {
                                let dest_str = target.to_string_lossy().to_string();
                                info!(source = path, dest = dest_str, "Auto-copied file");
                                let _ = app.emit(
                                    "afo://activity",
                                    serde_json::json!({
                                        "type": "copy",
                                        "source": path,
                                        "destination": dest_str,
                                        "rule": rule.name,
                                    }),
                                );
                            }
                            Err(e) => {
                                error!(error = %e, path = path, "Failed to auto-copy file");
                            }
                        }
                    }
                    rule_engine::Action::Rename { pattern } => {
                        let name_no_ext = file_path
                            .file_stem()
                            .map(|s| s.to_string_lossy().to_string())
                            .unwrap_or_default();
                        let ext = file_path
                            .extension()
                            .map(|e| e.to_string_lossy().to_string())
                            .unwrap_or_default();
                        let new_name = pattern
                            .replace("{name}", &name_no_ext)
                            .replace("{ext}", &ext)
                            .replace("{counter}", "1");
                        let parent = file_path.parent().unwrap_or(std::path::Path::new("."));
                        let target = unique_path(&parent.join(&new_name));

                        let entry = journal::JournalEntry {
                            id: 0,
                            operation_type: "rename".to_string(),
                            source_path: path.to_string(),
                            dest_path: target.to_string_lossy().to_string(),
                            timestamp: chrono::Utc::now().to_rfc3339(),
                            reverted: false,
                        };
                        let _ = journal::record_operation(&entry);

                        match std::fs::rename(path, &target) {
                            Ok(()) => {
                                let dest_str = target.to_string_lossy().to_string();
                                info!(source = path, dest = dest_str, "Auto-renamed file");
                                let _ = app.emit(
                                    "afo://activity",
                                    serde_json::json!({
                                        "type": "rename",
                                        "source": path,
                                        "destination": dest_str,
                                        "rule": rule.name,
                                    }),
                                );
                            }
                            Err(e) => {
                                error!(error = %e, path = path, "Failed to auto-rename file");
                            }
                        }
                    }
                }
            }

            // Only apply first matching rule
            break;
        }
    }

    Ok(())
}

pub fn start_watching(dir: &str) -> Result<(), Box<dyn std::error::Error>> {
    let path = PathBuf::from(dir);
    if !path.is_dir() {
        return Err(format!("{} is not a directory", dir).into());
    }

    // Check read permission before attempting to watch
    match std::fs::read_dir(&path) {
        Ok(_) => {}
        Err(e) if e.kind() == std::io::ErrorKind::PermissionDenied => {
            return Err(format!(
                "Permission denied: cannot read '{}'. Check directory permissions or try a different path.",
                dir
            ).into());
        }
        Err(e) => {
            return Err(format!(
                "Cannot access '{}': {}",
                dir, e
            ).into());
        }
    }

    with_state(|state| {
        state
            .watcher
            .watch(&path, RecursiveMode::Recursive)
            .map_err(|e| format!(
                "Failed to watch '{}': {}. The directory may have restricted permissions or contain inaccessible symlinks.",
                dir, e
            ))?;
        state.watched.insert(dir.to_string(), true);
        info!(dir = dir, "Started watching directory");
        Ok(())
    })?;

    Ok(())
}

pub fn stop_watching(dir: &str) -> Result<(), Box<dyn std::error::Error>> {
    let path = PathBuf::from(dir);

    with_state(|state| {
        state.watcher.unwatch(&path).map_err(|e| e.to_string())?;
        state.watched.insert(dir.to_string(), false);
        info!(dir = dir, "Stopped watching directory");
        Ok(())
    })?;

    Ok(())
}

pub fn list_watched() -> Result<Vec<WatchedDir>, String> {
    with_state(|state| {
        let dirs = state
            .watched
            .iter()
            .map(|(path, enabled)| WatchedDir {
                path: path.clone(),
                enabled: *enabled,
            })
            .collect();
        Ok(dirs)
    })
}

/// Find which watched directory contains the given path
pub fn find_watched_dir_for_path(path: &str) -> Option<String> {
    with_state(|state| {
        for (dir, enabled) in &state.watched {
            if *enabled && (path.starts_with(dir) || path.starts_with(&format!("{}/", dir))) {
                return Ok(Some(dir.clone()));
            }
        }
        Ok(None)
    })
    .ok()
    .flatten()
}

/// Queue a file move for user approval (placeholder — capture.rs handles this)
pub fn queue_move_for_approval(_path: &str, _watched_dir: &str) -> Result<(), String> {
    // Capture module creates pending actions directly via queue_pending_action()
    Ok(())
}
