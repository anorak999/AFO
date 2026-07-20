use serde::{Deserialize, Serialize};
use std::path::Path;

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

        let category = match file.extension.to_lowercase().as_str() {
            "jpg" | "jpeg" | "png" | "gif" | "bmp" | "svg" | "webp" | "heic" => "images",
            "pdf" | "doc" | "docx" | "txt" | "rtf" | "odt" => "documents",
            "mp3" | "wav" | "flac" | "aac" | "ogg" | "m4a" => "audio",
            "mp4" | "mkv" | "avi" | "mov" | "wmv" | "flv" => "video",
            "zip" | "tar" | "gz" | "rar" | "7z" => "archives",
            "rs" | "py" | "js" | "ts" | "go" | "c" | "cpp" | "h" => "code",
            _ => "other",
        };

        let target_dir = std::path::Path::new(path).join(category);

        if dry_run {
            result.moved += 1;
            continue;
        }

        if !target_dir.exists() {
            std::fs::create_dir_all(&target_dir)?;
        }

        let target_file = target_dir.join(&file.name);
        if !target_file.exists() {
            std::fs::rename(&file.path, &target_file)?;
            result.moved += 1;
        } else {
            result.errors.push(format!(
                "Collision: {} already exists in {}",
                file.name, category
            ));
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

        let target_file = target_dir.join(&file.name);
        if !target_file.exists() {
            std::fs::rename(&file.path, &target_file)?;
            result.moved += 1;
        } else {
            result.errors.push(format!(
                "Collision: {} already exists in {}",
                file.name, date_folder
            ));
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

        if !new_path.exists() {
            std::fs::rename(&file.path, &new_path)?;
            result.moved += 1;
        } else {
            result.errors.push(format!(
                "Collision: {} already exists",
                new_name
            ));
        }

        counter += 1;
    }

    Ok(result)
}
