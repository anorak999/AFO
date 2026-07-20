use crate::core::organizer::{scan_directory, unique_path, OrganizeResult};
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Rule {
    pub id: String,
    pub name: String,
    pub enabled: bool,
    pub conditions: Vec<Condition>,
    pub actions: Vec<Action>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Condition {
    pub field: ConditionField,
    pub operator: Operator,
    pub value: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum ConditionField {
    Extension,
    Name,
    Size,
    DateCreated,
    DateModified,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum Operator {
    Equals,
    Contains,
    StartsWith,
    EndsWith,
    GreaterThan,
    LessThan,
    Regex,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum Action {
    Move { destination: String },
    Copy { destination: String },
    Rename { pattern: String },
}

fn rules_path() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("afo")
        .join("rules.json")
}

pub fn load_rules() -> Vec<Rule> {
    let path = rules_path();
    if !path.exists() {
        // Create file with empty array if missing
        let _ = fs::create_dir_all(path.parent().unwrap_or(Path::new(".")));
        let _ = fs::write(&path, "[]");
        return Vec::new();
    }
    let content = match fs::read_to_string(&path) {
        Ok(c) => c,
        Err(_) => return Vec::new(),
    };
    serde_json::from_str(&content).unwrap_or_default()
}

pub fn save_rules(rules: &[Rule]) -> Result<(), Box<dyn std::error::Error>> {
    let path = rules_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let json = serde_json::to_string_pretty(rules)?;
    fs::write(path, json)?;
    Ok(())
}

pub fn evaluate(file_path: &str, rule: &Rule) -> bool {
    let path = Path::new(file_path);
    let metadata = match fs::metadata(path) {
        Ok(m) => m,
        Err(_) => return false,
    };

    let name = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();
    let extension = path
        .extension()
        .map(|e| e.to_string_lossy().to_string())
        .unwrap_or_default();

    rule.conditions.iter().all(|cond| {
        let field_value = match &cond.field {
            ConditionField::Extension => extension.clone(),
            ConditionField::Name => name.clone(),
            ConditionField::Size => metadata.len().to_string(),
            ConditionField::DateCreated => {
                // Try created, fall back to modified
                metadata
                    .created()
                    .or_else(|_| metadata.modified())
                    .map(|t| {
                        let dt: chrono::DateTime<chrono::Local> = t.into();
                        dt.to_rfc3339()
                    })
                    .unwrap_or_default()
            }
            ConditionField::DateModified => metadata
                .modified()
                .map(|t| {
                    let dt: chrono::DateTime<chrono::Local> = t.into();
                    dt.to_rfc3339()
                })
                .unwrap_or_default(),
        };

        match &cond.field {
            ConditionField::Size => {
                let file_size = metadata.len();
                let op_value = match cond.value.parse::<u64>() {
                    Ok(v) => v,
                    Err(_) => return false,
                };
                match cond.operator {
                    Operator::Equals => file_size == op_value,
                    Operator::GreaterThan => file_size > op_value,
                    Operator::LessThan => file_size < op_value,
                    _ => false,
                }
            }
            ConditionField::DateCreated | ConditionField::DateModified => {
                let op_dt = match chrono::DateTime::parse_from_rfc3339(&cond.value) {
                    Ok(dt) => dt.with_timezone(&chrono::Local),
                    Err(_) => return false,
                };
                // For DateCreated: prefer created(), fall back to modified()
                // For DateModified: always use modified()
                let sys_time = if cond.field == ConditionField::DateCreated {
                    metadata.created().or_else(|_| metadata.modified())
                } else {
                    metadata.modified()
                };
                let field_dt: chrono::DateTime<chrono::Local> = match sys_time {
                    Ok(t) => t.into(),
                    Err(_) => return false,
                };
                match cond.operator {
                    Operator::Equals => field_dt == op_dt,
                    Operator::GreaterThan => field_dt > op_dt,
                    Operator::LessThan => field_dt < op_dt,
                    _ => false,
                }
            }
            _ => match cond.operator {
                Operator::Equals => field_value == cond.value,
                Operator::Contains => field_value.contains(&cond.value),
                Operator::StartsWith => field_value.starts_with(&cond.value),
                Operator::EndsWith => field_value.ends_with(&cond.value),
                Operator::Regex => match Regex::new(&cond.value) {
                    Ok(re) => re.is_match(&field_value),
                    Err(_) => false,
                },
                _ => false,
            },
        }
    })
}

fn apply_actions(
    file_path: &str,
    actions: &[Action],
    dry_run: bool,
) -> Result<(), Box<dyn std::error::Error>> {
    let path = Path::new(file_path);
    let filename = path
        .file_name()
        .ok_or("Cannot get filename")?
        .to_string_lossy()
        .to_string();

    for action in actions {
        match action {
            Action::Move { destination } => {
                let dest_dir = Path::new(destination);
                if !dry_run {
                    fs::create_dir_all(dest_dir)?;
                }
                let target = unique_path(&dest_dir.join(&filename));
                if dry_run {
                    continue;
                }
                fs::rename(path, &target)?;
            }
            Action::Copy { destination } => {
                let dest_dir = Path::new(destination);
                if !dry_run {
                    fs::create_dir_all(dest_dir)?;
                }
                let target = unique_path(&dest_dir.join(&filename));
                if dry_run {
                    continue;
                }
                fs::copy(path, &target)?;
            }
            Action::Rename { pattern } => {
                let name_no_ext = path
                    .file_stem()
                    .map(|s| s.to_string_lossy().to_string())
                    .unwrap_or_default();
                let ext = path
                    .extension()
                    .map(|e| e.to_string_lossy().to_string())
                    .unwrap_or_default();
                let new_name = pattern
                    .replace("{name}", &name_no_ext)
                    .replace("{ext}", &ext)
                    .replace("{counter}", "1"); // counter is per-file in rule context
                let parent = path.parent().unwrap_or(Path::new("."));
                let target = unique_path(&parent.join(&new_name));
                if dry_run {
                    continue;
                }
                fs::rename(path, &target)?;
            }
        }
    }
    Ok(())
}

pub fn apply_rules(dir: &str, dry_run: bool) -> Result<OrganizeResult, Box<dyn std::error::Error>> {
    let rules = load_rules();
    let enabled_rules: Vec<&Rule> = rules.iter().filter(|r| r.enabled).collect();
    let files = scan_directory(dir)?;
    let mut result = OrganizeResult {
        total_files: files.len(),
        moved: 0,
        skipped: 0,
        errors: Vec::new(),
        dry_run,
    };

    for file in &files {
        if file.is_dir {
            result.skipped += 1;
            continue;
        }

        // Find first matching rule
        let matched = enabled_rules.iter().find(|r| evaluate(&file.path, r));

        match matched {
            Some(rule) => match apply_actions(&file.path, &rule.actions, dry_run) {
                Ok(()) => result.moved += 1,
                Err(e) => result.errors.push(format!("{}: {}", file.name, e)),
            },
            None => result.skipped += 1,
        }
    }

    Ok(result)
}
