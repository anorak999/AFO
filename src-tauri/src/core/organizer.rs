use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

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
        categories.insert("images".into(), vec!["jpg","jpeg","png","gif","bmp","svg","webp","heic"].into_iter().map(String::from).collect());
        categories.insert("documents".into(), vec!["pdf","doc","docx","txt","rtf","odt"].into_iter().map(String::from).collect());
        categories.insert("audio".into(), vec!["mp3","wav","flac","aac","ogg","m4a"].into_iter().map(String::from).collect());
        categories.insert("video".into(), vec!["mp4","mkv","avi","mov","wmv","flv"].into_iter().map(String::from).collect());
        categories.insert("archives".into(), vec!["zip","tar","gz","rar","7z"].into_iter().map(String::from).collect());
        categories.insert("code".into(), vec!["rs","py","js","ts","go","c","cpp","h"].into_iter().map(String::from).collect());
        Self { categories }
    }
}

impl CategoryConfig {
    /// Load from ~/.config/afo/config.json, falling back to defaults
    pub fn load() -> Self {
        let config_path = dirs::config_dir()
            .map(|p| p.join("afo").join("config.json"));

        match config_path {
            Some(path) if path.exists() => {
                match std::fs::read_to_string(&path) {
                    Ok(content) => {
                        // Try to extract just the categories field
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
                            Err(_) => {} // fall through to defaults
                        }
                        Self::default()
                    }
                    Err(_) => Self::default(),
                }
            }
            _ => Self::default(),
        }
    }

    /// Map an extension to its category, or "other"
    pub fn categorize(&self, ext: &str) -> &str {
        let ext_lower = ext.to_lowercase();
        for (category, extensions) in &self.categories {
            if extensions.iter().any(|e| e.eq_ignore_ascii_case(&ext_lower)) {
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
    let ext = target.extension().map(|e| format!(".{}", e.to_string_lossy())).unwrap_or_default();
    let parent = target.parent().unwrap_or(Path::new("."));
    for i in 1u32.. {
        let candidate = parent.join(format!("{}_{}{}", stem, i, ext));
        if !candidate.exists() {
            return candidate;
        }
    }
    unreachable!()
}

pub fn scan_directory(path: &str) -> Result<Vec<FileInfo>, Box<dyn std::error::Error>> {
    let mut files = Vec::new();
    let dir = Path::new(path);

    if !dir.is_dir() {
        return Err(format!("{} is not a directory", path).into());
    }

    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let metadata = entry.metadata()?;
        let name = entry.file_name().to_string_lossy().to_string();
        let path_str = entry.path().to_string_lossy().to_string();
        let extension = entry
            .path()
            .extension()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        files.push(FileInfo {
            name,
            path: path_str,
            extension,
            size: metadata.len(),
            is_dir: metadata.is_dir(),
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
            Ok(()) => result.moved += 1,
            Err(e) => result.errors.push(format!("Failed to move {}: {}", file.name, e)),
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

        let metadata = std::fs::metadata(&file.path)?;
        let modified = metadata.modified()?;
        let datetime: chrono::DateTime<chrono::Local> = modified.into();
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
            Ok(()) => result.moved += 1,
            Err(e) => result.errors.push(format!("Failed to move {}: {}", file.name, e)),
        }
    }

    Ok(result)
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
            Err(e) => result.errors.push(format!("Failed to rename {}: {}", file.name, e)),
        }

        counter += 1;
    }

    Ok(result)
}
