use std::fs;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};
use std::time::Duration;

use chrono::{Datelike, Local, Timelike};
use serde::{Deserialize, Serialize};
use tauri::Emitter;
use tracing::{error, info, warn};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Schedule {
    pub id: String,
    pub name: String,
    pub cron: String,
    pub action: ScheduleAction,
    pub enabled: bool,
    pub last_run: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum ScheduleAction {
    OrganizeByExtension { path: String },
    OrganizeByDate { path: String },
    ApplyRules { path: String },
    ScanDuplicates { path: String },
}

struct SchedulerState {
    schedules: Vec<Schedule>,
}

static STATE: OnceLock<Mutex<SchedulerState>> = OnceLock::new();

fn schedules_path() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("afo")
        .join("schedules.json")
}

fn load_schedules() -> Vec<Schedule> {
    let path = schedules_path();
    if !path.exists() {
        return Vec::new();
    }
    let content = match fs::read_to_string(&path) {
        Ok(c) => c,
        Err(_) => return Vec::new(),
    };
    serde_json::from_str(&content).unwrap_or_default()
}

fn save_schedules(schedules: &[Schedule]) -> Result<(), Box<dyn std::error::Error>> {
    let path = schedules_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let json = serde_json::to_string_pretty(schedules)?;
    fs::write(path, json)?;
    Ok(())
}

pub fn init_scheduler() -> Result<(), Box<dyn std::error::Error>> {
    let schedules = load_schedules();
    let state = SchedulerState { schedules };
    STATE
        .set(Mutex::new(state))
        .map_err(|_| "Scheduler already initialized")?;
    Ok(())
}

pub async fn create_schedule(
    name: &str,
    cron: &str,
    action: ScheduleAction,
) -> Result<Schedule, Box<dyn std::error::Error>> {
    let id = uuid::Uuid::new_v4().to_string();
    let schedule = Schedule {
        id: id.clone(),
        name: name.to_string(),
        cron: cron.to_string(),
        action,
        enabled: true,
        last_run: None,
    };

    // Save to state
    {
        let mut state = STATE
            .get()
            .ok_or("Scheduler not initialized")?
            .lock()
            .map_err(|e| e.to_string())?;
        state.schedules.push(schedule.clone());
        save_schedules(&state.schedules)?;
    }

    Ok(schedule)
}

pub fn list_schedules() -> Result<Vec<Schedule>, String> {
    let state = STATE
        .get()
        .ok_or("Scheduler not initialized")?
        .lock()
        .map_err(|e| e.to_string())?;
    Ok(state.schedules.clone())
}

pub fn delete_schedule(id: &str) -> Result<(), Box<dyn std::error::Error>> {
    let mut state = STATE
        .get()
        .ok_or("Scheduler not initialized")?
        .lock()
        .map_err(|e| e.to_string())?;

    state.schedules.retain(|s| s.id != id);
    save_schedules(&state.schedules)?;

    Ok(())
}

pub fn toggle_schedule(id: &str, enabled: bool) -> Result<(), Box<dyn std::error::Error>> {
    let mut state = STATE
        .get()
        .ok_or("Scheduler not initialized")?
        .lock()
        .map_err(|e| e.to_string())?;

    if let Some(schedule) = state.schedules.iter_mut().find(|s| s.id == id) {
        schedule.enabled = enabled;
        save_schedules(&state.schedules)?;
    }

    Ok(())
}

pub async fn run_now(id: &str, app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // Get action from state, then drop lock before await
    let (action, schedule_name) = {
        let state = STATE
            .get()
            .ok_or("Scheduler not initialized")?
            .lock()
            .map_err(|e| e.to_string())?;

        let schedule = state
            .schedules
            .iter()
            .find(|s| s.id == id)
            .ok_or_else(|| format!("Schedule {} not found", id))?;

        (schedule.action.clone(), schedule.name.clone())
    };

    info!(schedule = %schedule_name, "Running scheduled task");

    // Execute the action
    let result = match &action {
        ScheduleAction::OrganizeByExtension { path } => {
            crate::core::organizer::organize_by_extension(path, false).await
        }
        ScheduleAction::OrganizeByDate { path } => {
            crate::core::organizer::organize_by_date(path, false).await
        }
        ScheduleAction::ApplyRules { path } => crate::core::rule_engine::apply_rules(path, false)
            .map(|_| crate::core::organizer::OrganizeResult {
                total_files: 0,
                moved: 0,
                skipped: 0,
                errors: Vec::new(),
                dry_run: false,
            }),
        ScheduleAction::ScanDuplicates { path } => {
            crate::core::duplicates::scan_duplicates(path, true, 5).map(|_| {
                crate::core::organizer::OrganizeResult {
                    total_files: 0,
                    moved: 0,
                    skipped: 0,
                    errors: Vec::new(),
                    dry_run: false,
                }
            })
        }
    };

    // Emit notification
    match &result {
        Ok(res) => {
            info!(
                schedule = %schedule_name,
                moved = res.moved,
                errors = res.errors.len(),
                "Scheduled task completed"
            );
            let _ = app.emit(
                "afo://schedule-complete",
                serde_json::json!({
                    "schedule_id": id,
                    "schedule_name": schedule_name,
                    "moved": res.moved,
                    "errors": res.errors,
                    "success": true,
                }),
            );
        }
        Err(e) => {
            error!(schedule = %schedule_name, error = %e, "Scheduled task failed");
            let _ = app.emit(
                "afo://schedule-complete",
                serde_json::json!({
                    "schedule_id": id,
                    "schedule_name": schedule_name,
                    "error": e.to_string(),
                    "success": false,
                }),
            );
        }
    }

    // Update last_run
    {
        let mut state = STATE
            .get()
            .ok_or("Scheduler not initialized")?
            .lock()
            .map_err(|e| e.to_string())?;

        if let Some(schedule) = state.schedules.iter_mut().find(|s| s.id == id) {
            schedule.last_run = Some(chrono::Utc::now().to_rfc3339());
            save_schedules(&state.schedules)?;
        }
    }

    result?;
    Ok(())
}

/// Parse a single cron field (minute, hour, dom, month, dow) and check if it matches the given value.
/// Supports: "*" (any), "N" (exact), "N-M" (range), "N/S" (step), "N,M,O" (list).
fn cron_field_matches(field: &str, value: u32) -> bool {
    for part in field.split(',') {
        let part = part.trim();
        if part == "*" {
            return true;
        }
        if let Some((start, step)) = part.split_once('/') {
            let step: u32 = match step.parse() {
                Ok(s) if s > 0 => s,
                _ => return false,
            };
            let start_val: u32 = if start == "*" { 0 } else { start.parse().unwrap_or(0) };
            if value >= start_val && (value - start_val) % step == 0 {
                return true;
            }
        } else if let Some((start, end)) = part.split_once('-') {
            let start: u32 = start.parse().unwrap_or(0);
            let end: u32 = end.parse().unwrap_or(0);
            if value >= start && value <= end {
                return true;
            }
        } else if let Ok(exact) = part.parse::<u32>() {
            if value == exact {
                return true;
            }
        }
    }
    false
}

/// Check if the current time matches a 5-field cron expression (min hour dom month dow).
fn matches_cron(cron_expr: &str, now: chrono::DateTime<Local>) -> bool {
    let fields: Vec<&str> = cron_expr.split_whitespace().collect();
    if fields.len() != 5 {
        return false;
    }
    cron_field_matches(fields[0], now.minute())
        && cron_field_matches(fields[1], now.hour())
        && cron_field_matches(fields[2], now.day())
        && cron_field_matches(fields[3], now.month())
        && cron_field_matches(fields[4], now.weekday().num_days_from_sunday())
}

/// Background loop that checks schedules every 60 seconds and fires matching ones.
pub async fn start_scheduler_loop(app: tauri::AppHandle) {
    info!("Scheduler cron loop started");
    let mut interval = tokio::time::interval(Duration::from_secs(60));

    loop {
        interval.tick().await;

        // Snapshot enabled schedules
        let schedules: Vec<Schedule> = {
            match STATE.get() {
                Some(state) => match state.lock() {
                    Ok(s) => s
                        .schedules
                        .iter()
                        .filter(|s| s.enabled)
                        .cloned()
                        .collect(),
                    Err(_) => continue,
                },
                None => continue,
            }
        };

        let now = Local::now();
        for schedule in &schedules {
            if matches_cron(&schedule.cron, now) {
                info!(schedule = %schedule.name, "Cron match — running scheduled task");
                if let Err(e) = run_now(&schedule.id, &app).await {
                    warn!(schedule = %schedule.name, error = %e, "Scheduled task failed");
                }
            }
        }
    }
}
