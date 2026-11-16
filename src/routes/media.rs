//! Media base64 image upload and retention pruning endpoints (`/api/media/*`).

use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;
use base64::Engine;
use base64::engine::general_purpose::STANDARD;
use chrono::Utc;
use regex::Regex;
use serde::Deserialize;
use serde_json::{Value, json};
use std::fs;
use std::sync::{Arc, LazyLock};

use crate::domain::scheduler::prune_old_media;
use crate::error::AppError;
use crate::state::AppState;

const MAX_IMAGE_BYTES: usize = 8 * 1024 * 1024;

static DATA_URI_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^data:([A-Za-z0-9.+-]+/[A-Za-z0-9.+-]+);base64,(.+)$")
        .expect("valid data uri regex")
});

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaUploadPayload {
    pub image_base64: Option<String>,
    pub filename: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaPrunePayload {
    pub max_age_days: Option<i64>,
}

fn allowed_ext_for_mime(mime: &str) -> Option<&'static str> {
    match mime.to_ascii_lowercase().as_str() {
        "image/png" => Some("png"),
        "image/jpeg" => Some("jpg"),
        "image/gif" => Some("gif"),
        "image/webp" => Some("webp"),
        _ => None,
    }
}

fn sanitize_filename(raw: &str) -> String {
    raw.chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '_' || c == '-' {
                c
            } else {
                '_'
            }
        })
        .collect()
}

/// `POST /api/media/upload`
pub async fn upload_media(
    State(state): State<Arc<AppState>>,
    Json(body): Json<MediaUploadPayload>,
) -> Result<Json<Value>, AppError> {
    let raw_data = body
        .image_base64
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .ok_or_else(|| AppError::validation("Image data is required."))?;

    let caps = DATA_URI_RE
        .captures(raw_data)
        .ok_or_else(|| AppError::validation("Invalid base64 image format."))?;

    let mime = caps.get(1).map(|m| m.as_str()).unwrap_or("");
    let ext = allowed_ext_for_mime(mime).ok_or_else(|| {
        AppError::validation("Unsupported file type. Use PNG, JPG, GIF, or WebP.")
    })?;

    let b64_body = caps.get(2).map(|m| m.as_str()).unwrap_or("");
    let cleaned_b64: String = b64_body.chars().filter(|c| !c.is_whitespace()).collect();
    let decoded = STANDARD
        .decode(cleaned_b64.as_bytes())
        .map_err(|_| AppError::validation("Invalid base64 image payload."))?;

    if decoded.is_empty() {
        return Err(AppError::validation("Image data is empty."));
    }
    if decoded.len() > MAX_IMAGE_BYTES {
        return Err(AppError::Http {
            status: StatusCode::PAYLOAD_TOO_LARGE,
            code: "PAYLOAD_TOO_LARGE".to_string(),
            message: format!(
                "Image size exceeds the {} MB limit.",
                MAX_IMAGE_BYTES / (1024 * 1024)
            ),
            is_htmx: false,
        });
    }

    fs::create_dir_all(&state.db.media_dir).map_err(|e| AppError::Internal(e.to_string()))?;

    let safe_name = sanitize_filename(
        body.filename
            .as_deref()
            .filter(|s| !s.trim().is_empty())
            .unwrap_or("image"),
    );
    let final_filename = format!("{}_{}.{}", Utc::now().timestamp_millis(), safe_name, ext);
    let file_path = state.db.media_dir.join(&final_filename);

    fs::write(&file_path, &decoded).map_err(|e| AppError::Internal(e.to_string()))?;

    let size_kb = format!("{:.1}", (decoded.len() as f64) / 1024.0);
    state.logger.success(format!(
        "Media uploaded successfully: {final_filename} ({size_kb} KB)"
    ));

    Ok(Json(json!({
        "success": true,
        "filename": final_filename,
        "localPath": file_path.to_string_lossy(),
        "sizeKb": size_kb,
    })))
}

/// `POST /api/media/prune`
pub async fn prune_media(
    State(state): State<Arc<AppState>>,
    body: Option<Json<MediaPrunePayload>>,
) -> Json<Value> {
    let days = body
        .and_then(|Json(b)| b.max_age_days)
        .unwrap_or(7)
        .clamp(1, 365) as u64;
    let (deleted_count, remaining_files) = prune_old_media(&state.db.media_dir, days);
    state.logger.info(format!(
        "Disk media cleanup: pruned {deleted_count} old file(s) (> {days} days)."
    ));
    Json(json!({
        "success": true,
        "deletedCount": deleted_count,
        "remainingFiles": remaining_files,
        "maxAgeDays": days,
    }))
}
