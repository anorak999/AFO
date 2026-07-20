use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};

use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WatchedDir {
    pub path: String,
    pub enabled: bool,
}

struct WatcherState {
    watcher: RecommendedWatcher,
    watched: HashMap<String, bool>,
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
    let (watcher_tx, watcher_rx) = std::sync::mpsc::channel();

    let watcher = RecommendedWatcher::new(
        move |res: Result<Event, notify::Error>| {
            if let Ok(event) = res {
                match event.kind {
                    EventKind::Create(_) | EventKind::Modify(_) => {
                        for path in &event.paths {
                            if path.is_file() {
                                let _ = watcher_tx.send(path.to_string_lossy().to_string());
                            }
                        }
                    }
                    _ => {}
                }
            }
        },
        Config::default(),
    )?;

    // Spawn a thread to forward events to the async channel
    let tx_clone = tx.clone();
    std::thread::spawn(move || {
        while let Ok(path) = watcher_rx.recv() {
            let _ = tx_clone.blocking_send(path);
        }
    });

    let state = WatcherState {
        watcher,
        watched: HashMap::new(),
    };

    STATE.set(Mutex::new(state))
        .map_err(|_| "Watcher already initialized")?;

    Ok(())
}

pub fn start_watching(dir: &str) -> Result<(), Box<dyn std::error::Error>> {
    let path = PathBuf::from(dir);
    if !path.is_dir() {
        return Err(format!("{} is not a directory", dir).into());
    }

    with_state(|state| {
        state.watcher.watch(&path, RecursiveMode::Recursive)
            .map_err(|e| e.to_string())?;
        state.watched.insert(dir.to_string(), true);
        Ok(())
    })?;

    Ok(())
}

pub fn stop_watching(dir: &str) -> Result<(), Box<dyn std::error::Error>> {
    let path = PathBuf::from(dir);

    with_state(|state| {
        state.watcher.unwatch(&path)
            .map_err(|e| e.to_string())?;
        state.watched.insert(dir.to_string(), false);
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
