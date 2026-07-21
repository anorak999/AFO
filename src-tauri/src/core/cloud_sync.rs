// Cloud sync stub — placeholder for post-launch Dropbox/Google Drive integration

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CloudProvider {
    pub id: String,
    pub name: String,
    pub provider_type: CloudProviderType,
    pub local_path: String,
    pub remote_path: String,
    pub enabled: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum CloudProviderType {
    Dropbox,
    GoogleDrive,
    OneDrive,
    Custom,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncStatus {
    pub provider_id: String,
    pub status: String,
    pub last_sync: Option<String>,
    pub pending_files: u64,
}

/// List configured cloud providers (stub — returns empty list)
pub fn list_providers() -> Result<Vec<CloudProvider>, Box<dyn std::error::Error>> {
    // No providers configured by default
    Ok(Vec::new())
}

/// Add a cloud provider (stub — stores locally but doesn't sync)
pub fn add_provider(
    name: &str,
    provider_type: CloudProviderType,
    local_path: &str,
    remote_path: &str,
) -> Result<CloudProvider, Box<dyn std::error::Error>> {
    let id = uuid::Uuid::new_v4().to_string();
    Ok(CloudProvider {
        id,
        name: name.to_string(),
        provider_type,
        local_path: local_path.to_string(),
        remote_path: remote_path.to_string(),
        enabled: true,
    })
}

/// Remove a cloud provider (stub)
pub fn remove_provider(_id: &str) -> Result<(), Box<dyn std::error::Error>> {
    Ok(())
}

/// Sync files to cloud (stub — returns not-implemented error)
pub fn sync_to_cloud(_path: &str) -> Result<(), Box<dyn std::error::Error>> {
    Err("Cloud sync not yet implemented — coming in a future release".into())
}

/// Get sync status (stub)
pub fn get_sync_status(_provider_id: &str) -> Result<SyncStatus, Box<dyn std::error::Error>> {
    Err("Cloud sync not yet implemented".into())
}
