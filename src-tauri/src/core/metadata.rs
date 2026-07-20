use std::fs::File;
use std::io::BufReader;
use std::path::Path;

use exif::{In, Reader, Tag};
use lofty::{Accessor, TaggedFileExt};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Metadata {
    pub exif: Option<ExifData>,
    pub audio: Option<AudioData>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExifData {
    pub camera_make: Option<String>,
    pub camera_model: Option<String>,
    pub date_taken: Option<String>,
    pub gps: Option<String>,
    pub exposure: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AudioData {
    pub artist: Option<String>,
    pub album: Option<String>,
    pub title: Option<String>,
    pub genre: Option<String>,
    pub track: Option<u32>,
    pub year: Option<u32>,
}

fn extract_exif(path: &Path) -> Option<ExifData> {
    let file = File::open(path).ok()?;
    let mut bufreader = BufReader::new(file);
    let parser = Reader::new();
    let exif = parser.read_from_container(&mut bufreader).ok()?;

    let get_field = |tag: Tag| -> Option<String> {
        exif.get_field(tag, In::PRIMARY)
            .and_then(|v| v.display_value().to_string().into())
            .map(|s| s.to_string())
    };

    let gps = exif
        .get_field(Tag::GPSLatitude, In::PRIMARY)
        .and_then(|lat| {
            let lat_ref = exif
                .get_field(Tag::GPSLatitudeRef, In::PRIMARY)?
                .display_value()
                .to_string();
            let lon = exif.get_field(Tag::GPSLongitude, In::PRIMARY)?;
            let _lon_ref = exif
                .get_field(Tag::GPSLongitudeRef, In::PRIMARY)?
                .display_value()
                .to_string();
            Some(format!(
                "{}, {} {}",
                lat.display_value(),
                lon.display_value(),
                if lat_ref == "N" { "N" } else { "S" },
            ))
        });

    Some(ExifData {
        camera_make: get_field(Tag::Make),
        camera_model: get_field(Tag::Model),
        date_taken: get_field(Tag::DateTimeOriginal).or_else(|| get_field(Tag::DateTime)),
        gps,
        exposure: get_field(Tag::ExposureTime),
    })
}

fn extract_audio(path: &Path) -> Option<AudioData> {
    let tagged_file = lofty::read_from_path(path).ok()?;
    let tag = tagged_file.primary_tag()?;

    Some(AudioData {
        artist: tag.artist().map(|s| s.to_string()),
        album: tag.album().map(|s| s.to_string()),
        title: tag.title().map(|s| s.to_string()),
        genre: tag.genre().map(|s| s.to_string()),
        track: tag.track(),
        year: tag.year(),
    })
}

pub fn extract_metadata(path: &str) -> Metadata {
    let p = Path::new(path);
    let exif = extract_exif(p);
    let audio = extract_audio(p);
    Metadata { exif, audio }
}
