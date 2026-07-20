use std::fs;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};

use serde::{Deserialize, Serialize};

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
    STATE.set(Mutex::new(state))
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

pub async fn run_now(id: &str) -> Result<(), Box<dyn std::error::Error>> {
    // Get action from state, then drop lock before await
    let action = {
        let state = STATE
            .get()
            .ok_or("Scheduler not initialized")?
            .lock()
            .map_err(|e| e.to_string())?;

        let schedule = state.schedules.iter().find(|s| s.id == id)
            .ok_or_else(|| format!("Schedule {} not found", id))?;

        schedule.action.clone()
    };

    // Execute the action
    match action {
        ScheduleAction::OrganizeByExtension { path } => {
            crate::core::organizer::organize_by_extension(&path, false).await?;
        }
        ScheduleAction::OrganizeByDate { path } => {
            crate::core::organizer::organize_by_date(&path, false).await?;
        }
        ScheduleAction::ApplyRules { path } => {
            crate::core::rule_engine::apply_rules(&path, false)?;
        }
        ScheduleAction::ScanDuplicates { path } => {
            crate::core::duplicates::scan_duplicates(&path, true, 5)?;
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

    Ok(())
}
