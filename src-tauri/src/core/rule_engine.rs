use crate::core::organizer::{scan_directory, unique_path, OrganizeResult};
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{LazyLock, Mutex};

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
    // EXIF fields
    ExifCameraMake,
    ExifCameraModel,
    ExifDateTaken,
    ExifGps,
    ExifExposure,
    // Audio fields
    AudioArtist,
    AudioAlbum,
    AudioTitle,
    AudioGenre,
    AudioTrack,
    AudioYear,
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

// ── Issue #1 fix: Regex cache ──────────────────────────────────────────────
// Compiled regexes are cached globally so the same pattern is only compiled once.
// Uses Box::leak to produce &'static references — acceptable because:
//   - Patterns are bounded by the number of user-defined rules (small, finite)
//   - Each pattern leaks exactly once, then reused for every file evaluation
//   - Desktop app memory budget makes this negligible
static REGEX_CACHE: LazyLock<Mutex<HashMap<String, &'static Regex>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

/// Get or compile a regex pattern, returning a cached &'static reference.
/// Invalid patterns return None (same behavior as before, but only compiled once).
fn get_regex(pattern: &str) -> Option<&'static Regex> {
    // Fast path: read lock
    {
        let cache = REGEX_CACHE.lock().ok()?;
        if let Some(re) = cache.get(pattern) {
            return Some(*re);
        }
    }
    // Slow path: compile and insert
    let compiled = Regex::new(pattern).ok()?;
    let leaked: &'static Regex = Box::leak(Box::new(compiled));
    let mut cache = REGEX_CACHE.lock().ok()?;
    // Double-check in case another thread inserted while we were compiling
    cache.entry(pattern.to_string()).or_insert(leaked);
    Some(*cache.get(pattern).unwrap_or(&leaked))
}

pub fn load_rules() -> Vec<Rule> {
    let path = rules_path();
    if !path.exists() {
        let _ = fs::create_dir_all(path.parent().unwrap_or(Path::new(".")));
        let _ = fs::write(&path, "[]");
        return Vec::new();
    }
    let content = match fs::read_to_string(&path) {
        Ok(c) => c,
        Err(_) => return Vec::new(),
    };
    match serde_json::from_str(&content) {
        Ok(rules) => rules,
        Err(_) => {
            // Corrupt file - backup and return defaults
            let backup_path = path.with_extension("json.bak");
            let _ = fs::copy(&path, &backup_path);
            let _ = fs::write(&path, "[]");
            Vec::new()
        }
    }
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

/// Check if a file extension looks like an image (for EXIF skip optimization).
fn is_image_extension(ext: &str) -> bool {
    matches!(
        ext.to_lowercase().as_str(),
        "jpg"
            | "jpeg"
            | "png"
            | "gif"
            | "bmp"
            | "tiff"
            | "tif"
            | "webp"
            | "heic"
            | "heif"
            | "raw"
            | "cr2"
            | "nef"
            | "arw"
            | "dng"
    )
}

/// Check if a file extension looks like audio (for audio tag skip optimization).
fn is_audio_extension(ext: &str) -> bool {
    matches!(
        ext.to_lowercase().as_str(),
        "mp3" | "wav" | "flac" | "aac" | "ogg" | "m4a" | "wma" | "opus" | "alac"
    )
}

/// Check if any condition in the rule requires EXIF metadata.
fn needs_exif(rule: &Rule) -> bool {
    rule.conditions.iter().any(|c| {
        matches!(
            c.field,
            ConditionField::ExifCameraMake
                | ConditionField::ExifCameraModel
                | ConditionField::ExifDateTaken
                | ConditionField::ExifGps
                | ConditionField::ExifExposure
        )
    })
}

/// Check if any condition in the rule requires audio metadata.
fn needs_audio(rule: &Rule) -> bool {
    rule.conditions.iter().any(|c| {
        matches!(
            c.field,
            ConditionField::AudioArtist
                | ConditionField::AudioAlbum
                | ConditionField::AudioTitle
                | ConditionField::AudioGenre
                | ConditionField::AudioTrack
                | ConditionField::AudioYear
        )
    })
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

    // ── Issue #3 fix: Lazy EXIF/audio extraction ───────────────────────────
    // Only extract metadata when the rule actually uses those fields AND the
    // file extension is a candidate. This avoids opening 8k+ non-image files
    // just to discover they have no EXIF data.
    let ext_lower = extension.to_lowercase();
    let needs_exif_meta = needs_exif(rule) && is_image_extension(&ext_lower);
    let needs_audio_meta = needs_audio(rule) && is_audio_extension(&ext_lower);

    let file_metadata = if needs_exif_meta || needs_audio_meta {
        crate::core::metadata::extract_metadata(file_path)
    } else {
        crate::core::metadata::Metadata {
            exif: None,
            audio: None,
        }
    };

    rule.conditions.iter().all(|cond| {
        let field_value = match &cond.field {
            ConditionField::Extension => extension.clone(),
            ConditionField::Name => name.clone(),
            ConditionField::Size => metadata.len().to_string(),
            ConditionField::DateCreated => metadata
                .created()
                .or_else(|_| metadata.modified())
                .map(|t| {
                    let dt: chrono::DateTime<chrono::Local> = t.into();
                    dt.to_rfc3339()
                })
                .unwrap_or_default(),
            ConditionField::DateModified => metadata
                .modified()
                .map(|t| {
                    let dt: chrono::DateTime<chrono::Local> = t.into();
                    dt.to_rfc3339()
                })
                .unwrap_or_default(),
            // EXIF fields
            ConditionField::ExifCameraMake => file_metadata
                .exif
                .as_ref()
                .and_then(|e| e.camera_make.clone())
                .unwrap_or_default(),
            ConditionField::ExifCameraModel => file_metadata
                .exif
                .as_ref()
                .and_then(|e| e.camera_model.clone())
                .unwrap_or_default(),
            ConditionField::ExifDateTaken => file_metadata
                .exif
                .as_ref()
                .and_then(|e| e.date_taken.clone())
                .unwrap_or_default(),
            ConditionField::ExifGps => file_metadata
                .exif
                .as_ref()
                .and_then(|e| e.gps.clone())
                .unwrap_or_default(),
            ConditionField::ExifExposure => file_metadata
                .exif
                .as_ref()
                .and_then(|e| e.exposure.clone())
                .unwrap_or_default(),
            // Audio fields
            ConditionField::AudioArtist => file_metadata
                .audio
                .as_ref()
                .and_then(|a| a.artist.clone())
                .unwrap_or_default(),
            ConditionField::AudioAlbum => file_metadata
                .audio
                .as_ref()
                .and_then(|a| a.album.clone())
                .unwrap_or_default(),
            ConditionField::AudioTitle => file_metadata
                .audio
                .as_ref()
                .and_then(|a| a.title.clone())
                .unwrap_or_default(),
            ConditionField::AudioGenre => file_metadata
                .audio
                .as_ref()
                .and_then(|a| a.genre.clone())
                .unwrap_or_default(),
            ConditionField::AudioTrack => file_metadata
                .audio
                .as_ref()
                .and_then(|a| a.track.map(|t| t.to_string()))
                .unwrap_or_default(),
            ConditionField::AudioYear => file_metadata
                .audio
                .as_ref()
                .and_then(|a| a.year.map(|y| y.to_string()))
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
                // ── Issue #1 fix: Cached regex ────────────────────────────
                Operator::Regex => match get_regex(&cond.value) {
                    Some(re) => re.is_match(&field_value),
                    None => false, // Invalid pattern — same as before
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
                    .replace("{counter}", "1");
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
    // ── Issue #2 fix: Load rules once, pass down recursively ───────────────
    let rules = load_rules();
    let enabled_rules: Vec<&Rule> = rules.iter().filter(|r| r.enabled).collect();
    apply_rules_recursive(dir, dry_run, 0, 1, &enabled_rules)
}

// ── Issue #2 fix: Rules passed as parameter instead of re-loaded per dir ────
// Before: load_rules() was called inside apply_rules_recursive(), meaning
// every subdirectory triggered a disk read + JSON parse. On a tree with 100
// subdirectories, that's 100 redundant reads. Now rules are loaded once
// by the public apply_rules() entry point and threaded through.
fn apply_rules_recursive<'a>(
    dir: &str,
    dry_run: bool,
    current_depth: u32,
    max_depth: u32,
    enabled_rules: &[&'a Rule],
) -> Result<OrganizeResult, Box<dyn std::error::Error>> {
    let files = scan_directory(dir)?;
    let mut result = OrganizeResult {
        total_files: 0,
        moved: 0,
        skipped: 0,
        errors: Vec::new(),
        dry_run,
    };

    for file in &files {
        if file.is_dir {
            if current_depth < max_depth {
                match apply_rules_recursive(
                    &file.path,
                    dry_run,
                    current_depth + 1,
                    max_depth,
                    enabled_rules,
                ) {
                    Ok(sub_result) => {
                        result.total_files += sub_result.total_files;
                        result.moved += sub_result.moved;
                        result.skipped += sub_result.skipped;
                        result.errors.extend(sub_result.errors);
                    }
                    Err(e) => result.errors.push(format!("{}: {}", file.name, e)),
                }
            } else {
                result.skipped += 1;
            }
            continue;
        }

        result.total_files += 1;

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
