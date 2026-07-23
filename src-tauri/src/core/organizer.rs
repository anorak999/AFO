use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

use super::journal;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub extension: String,
    pub size: u64,
    pub is_dir: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OrganizeResult {
    pub total_files: usize,
    pub moved: usize,
    pub skipped: usize,
    pub errors: Vec<String>,
    pub dry_run: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CategoryConfig {
    /// Maps category name -> list of extensions (without dots)
    pub categories: HashMap<String, Vec<String>>,
}

impl Default for CategoryConfig {
    fn default() -> Self {
        let mut categories = HashMap::new();
        categories.insert(
            "images".into(),
            vec!["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp", "heic"]
                .into_iter()
                .map(String::from)
                .collect(),
        );
        categories.insert(
            "documents".into(),
            vec!["pdf", "doc", "docx", "txt", "rtf", "odt"]
                .into_iter()
                .map(String::from)
                .collect(),
        );
        categories.insert(
            "audio".into(),
            vec!["mp3", "wav", "flac", "aac", "ogg", "m4a"]
                .into_iter()
                .map(String::from)
                .collect(),
        );
        categories.insert(
            "video".into(),
            vec!["mp4", "mkv", "avi", "mov", "wmv", "flv"]
                .into_iter()
                .map(String::from)
                .collect(),
        );
        categories.insert(
            "archives".into(),
            vec!["zip", "tar", "gz", "rar", "7z"]
                .into_iter()
                .map(String::from)
                .collect(),
        );
        categories.insert(
            "code".into(),
            vec!["rs", "py", "js", "ts", "go", "c", "cpp", "h"]
                .into_iter()
                .map(String::from)
                .collect(),
        );
        Self { categories }
    }
}

impl CategoryConfig {
    /// Load from ~/.config/afo/config.json, falling back to defaults
    pub fn load() -> Self {
        let config_path = dirs::config_dir().map(|p| p.join("afo").join("config.json"));

        if let Some(path) = config_path {
            if path.exists() {
                if let Ok(content) = std::fs::read_to_string(&path) {
                    #[derive(Deserialize)]
                    struct ConfigFile {
                        #[serde(default)]
                        categories: Option<HashMap<String, Vec<String>>>,
                    }
                    match serde_json::from_str::<ConfigFile>(&content) {
                        Ok(cfg) => {
                            if let Some(cats) = cfg.categories {
                                return Self { categories: cats };
                            }
                        }
                        Err(_) => {
                            // Corrupt config - backup and use defaults
                            let backup_path = path.with_extension("json.bak");
                            let _ = std::fs::copy(&path, &backup_path);
                        }
                    }
                }
            }
        }
        Self::default()
    }

    /// Map an extension to its category, or "other"
    pub fn categorize(&self, ext: &str) -> &str {
        let ext_lower = ext.to_lowercase();
        for (category, extensions) in &self.categories {
            if extensions
                .iter()
                .any(|e| e.eq_ignore_ascii_case(&ext_lower))
            {
                return category;
            }
        }
        "other"
    }
}

/// Generate a unique target path by appending _1, _2, ... on collision
pub(crate) fn unique_path(target: &Path) -> PathBuf {
    if !target.exists() {
        return target.to_path_buf();
    }
    let stem = target.file_stem().unwrap_or_default().to_string_lossy();
    let ext = target
        .extension()
        .map(|e| format!(".{}", e.to_string_lossy()))
        .unwrap_or_default();
    let parent = target.parent().unwrap_or(Path::new("."));
    for i in 1u32.. {
        let candidate = parent.join(format!("{}_{}{}", stem, i, ext));
        if !candidate.exists() {
            return candidate;
        }
    }
    // Fallback: shouldn't happen in practice, but handle gracefully
    let fallback = parent.join(format!(
        "{}_{}",
        stem,
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs()
    ));
    if !fallback.exists() {
        return fallback;
    }
    target.to_path_buf()
}

pub fn scan_directory(path: &str) -> Result<Vec<FileInfo>, Box<dyn std::error::Error>> {
    let mut files = Vec::new();
    let dir = Path::new(path);

    if !dir.is_dir() {
        return Err(format!("{} is not a directory", path).into());
    }

    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let name = entry.file_name().to_string_lossy().to_string();
        let path_str = entry.path().to_string_lossy().to_string();
        let extension = entry
            .path()
            .extension()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        // Use symlink_metadata to correctly handle symlinks (follow the link, not the target)
        let metadata = match std::fs::symlink_metadata(entry.path()) {
            Ok(m) => m,
            Err(e) => {
                tracing::warn!(error = %e, file = %name, "Cannot read file metadata, skipping");
                continue;
            }
        };

        let is_symlink = metadata.file_type().is_symlink();

        files.push(FileInfo {
            name,
            path: path_str,
            extension,
            size: metadata.len(),
            is_dir: metadata.is_dir()
                || is_symlink
                    && std::fs::metadata(entry.path())
                        .map(|m| m.is_dir())
                        .unwrap_or(false),
        });
    }

    Ok(files)
}

pub async fn organize_by_extension(
    path: &str,
    dry_run: bool,
) -> Result<OrganizeResult, Box<dyn std::error::Error>> {
    let files = scan_directory(path)?;
    let config = CategoryConfig::load();
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

        let category = config.categorize(&file.extension);
        let target_dir = std::path::Path::new(path).join(category);

        if dry_run {
            result.moved += 1;
            continue;
        }

        if !target_dir.exists() {
            std::fs::create_dir_all(&target_dir)?;
        }

        let target_file = unique_path(&target_dir.join(&file.name));
        match std::fs::rename(&file.path, &target_file) {
            Ok(()) => {
                result.moved += 1;
                // Record to journal so scheduled operations are undoable
                let _ = journal::record_file_operation(
                    "move",
                    &file.path,
                    &target_file.to_string_lossy(),
                );
            }
            Err(e) => result
                .errors
                .push(format!("Failed to move {}: {}", file.name, e)),
        }
    }

    Ok(result)
}

pub async fn organize_by_date(
    path: &str,
    dry_run: bool,
) -> Result<OrganizeResult, Box<dyn std::error::Error>> {
    let files = scan_directory(path)?;
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

        // Try to get date from EXIF first, fall back to filesystem timestamp
        let datetime = get_file_date(&file.path).unwrap_or_else(|| {
            // Fallback to filesystem modified time
            std::fs::metadata(&file.path)
                .and_then(|m| m.modified())
                .map(|t| {
                    let dt: chrono::DateTime<chrono::Local> = t.into();
                    dt
                })
                .unwrap_or_else(|_| chrono::Local::now())
        });

        let date_folder = datetime.format("%Y/%m").to_string();
        let target_dir = std::path::Path::new(path).join(&date_folder);

        if dry_run {
            result.moved += 1;
            continue;
        }

        if !target_dir.exists() {
            std::fs::create_dir_all(&target_dir)?;
        }

        let target_file = unique_path(&target_dir.join(&file.name));
        match std::fs::rename(&file.path, &target_file) {
            Ok(()) => {
                result.moved += 1;
                // Record to journal so scheduled operations are undoable
                let _ = journal::record_file_operation(
                    "move",
                    &file.path,
                    &target_file.to_string_lossy(),
                );
            }
            Err(e) => result
                .errors
                .push(format!("Failed to move {}: {}", file.name, e)),
        }
    }

    Ok(result)
}

/// Get the date for a file, preferring EXIF date taken for images
pub(crate) fn get_file_date(path: &str) -> Option<chrono::DateTime<chrono::Local>> {
    let p = std::path::Path::new(path);

    // Only attempt metadata extraction for image/audio files (avoids opening
    // PDFs, text files, etc. just to find they have no EXIF/audio tags)
    if let Some(ext) = p.extension().and_then(|e| e.to_str()) {
        let ext_lower = ext.to_lowercase();
        let is_media = matches!(
            ext_lower.as_str(),
            "jpg" | "jpeg" | "png" | "gif" | "bmp" | "svg" | "webp" | "heic"
                | "mp3" | "wav" | "flac" | "aac" | "ogg" | "m4a"
        );
        if is_media {
            let metadata = crate::core::metadata::extract_metadata(path);
            if let Some(exif) = &metadata.exif {
                if let Some(date_taken) = &exif.date_taken {
                    if let Ok(naive) =
                        chrono::NaiveDateTime::parse_from_str(date_taken, "%Y:%m:%d %H:%M:%S")
                    {
                        let local = naive.and_local_timezone(chrono::Local).single()?;
                        return Some(local);
                    }
                }
            }
        }
    }

    // Fall back to filesystem timestamps
    let fs_meta = std::fs::metadata(p).ok()?;

    // Try created first, then modified
    let sys_time = fs_meta.created().or_else(|_| fs_meta.modified()).ok()?;
    let datetime: chrono::DateTime<chrono::Local> = sys_time.into();
    Some(datetime)
}

pub async fn batch_rename(
    path: &str,
    pattern: &str,
    dry_run: bool,
) -> Result<OrganizeResult, Box<dyn std::error::Error>> {
    let files = scan_directory(path)?;
    let mut result = OrganizeResult {
        total_files: files.len(),
        moved: 0,
        skipped: 0,
        errors: Vec::new(),
        dry_run,
    };

    let mut counter = 1u32;

    for file in &files {
        if file.is_dir {
            result.skipped += 1;
            continue;
        }

        let name_no_ext = file.name.trim_end_matches(&format!(".{}", file.extension));
        let new_name = pattern
            .replace("{name}", name_no_ext)
            .replace("{ext}", &file.extension)
            .replace("{counter}", &counter.to_string());

        let new_path = std::path::Path::new(path).join(&new_name);

        if dry_run {
            result.moved += 1;
            counter += 1;
            continue;
        }

        let target = unique_path(&new_path);
        match std::fs::rename(&file.path, &target) {
            Ok(()) => result.moved += 1,
            Err(e) => result
                .errors
                .push(format!("Failed to rename {}: {}", file.name, e)),
        }

        counter += 1;
    }

    Ok(result)
}
