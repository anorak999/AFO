// EXIF + audio tag metadata extraction
// Phase 5 implementation

pub struct Metadata {
    pub exif: Option<ExifData>,
    pub audio: Option<AudioData>,
}

pub struct ExifData {
    pub camera_make: Option<String>,
    pub camera_model: Option<String>,
    pub date_taken: Option<String>,
    pub gps: Option<String>,
}

pub struct AudioData {
    pub artist: Option<String>,
    pub album: Option<String>,
    pub title: Option<String>,
    pub genre: Option<String>,
}

pub fn extract_metadata(_path: &str) -> Option<Metadata> {
    // TODO: Phase 5
    None
}
