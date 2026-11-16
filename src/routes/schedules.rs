//! Background schedule CRUD and toggle endpoints (`/api/schedules/*`).

use axum::Json;
use axum::extract::{Path, State};
use chrono::{DateTime, NaiveDateTime, Utc};
use serde::Deserialize;
use serde_json::{Value, json};
use std::collections::HashMap;
use std::path::{Component, Path as StdPath, PathBuf};
use std::sync::Arc;

use crate::domain::models::ScheduleItem;
use crate::error::AppError;
use crate::state::AppState;

const ALLOWED_SCHEDULE_TYPES: [&str; 3] = ["POST_QUEUE", "RECURRING_HUNTER", "BATCH_ENGAGEMENT"];

fn is_allowed_media_ext(path: &StdPath) -> bool {
    matches!(
        path.extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_ascii_lowercase())
            .as_deref(),
        Some("png" | "jpg" | "jpeg" | "gif" | "webp")
    )
}

fn validate_safe_media_path(media_dir: &StdPath, raw: &str) -> Result<String, AppError> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err(AppError::validation(
            "Media file path must be inside the data/media directory with a valid image extension (PNG, JPG, GIF, WebP).",
        ));
    }

    let candidate = PathBuf::from(trimmed);
    for comp in candidate.components() {
        if matches!(comp, Component::ParentDir) {
            return Err(AppError::validation(
                "Media file path must be inside the data/media directory with a valid image extension (PNG, JPG, GIF, WebP).",
            ));
        }
    }

    let base = std::fs::canonicalize(media_dir).unwrap_or_else(|_| media_dir.to_path_buf());
    let resolved = if candidate.is_absolute() {
        candidate
    } else {
        base.join(&candidate)
    };
    let canonical = std::fs::canonicalize(&resolved).unwrap_or(resolved);

    if !canonical.starts_with(&base) || canonical == base || !is_allowed_media_ext(&canonical) {
        return Err(AppError::validation(
            "Media file path must be inside the data/media directory with a valid image extension (PNG, JPG, GIF, WebP).",
        ));
    }

    Ok(canonical.to_string_lossy().to_string())
}

fn parse_scheduled_at(raw: &str) -> Option<String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return None;
    }
    if let Ok(dt) = DateTime::parse_from_rfc3339(trimmed) {
        return Some(dt.with_timezone(&Utc).to_rfc3339());
    }
    if let Ok(naive) = NaiveDateTime::parse_from_str(trimmed, "%Y-%m-%dT%H:%M") {
        return Some(DateTime::<Utc>::from_naive_utc_and_offset(naive, Utc).to_rfc3339());
    }
    if let Ok(naive) = NaiveDateTime::parse_from_str(trimmed, "%Y-%m-%d %H:%M:%S") {
        return Some(DateTime::<Utc>::from_naive_utc_and_offset(naive, Utc).to_rfc3339());
    }
    None
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScheduleCreatePayload {
    #[serde(rename = "type")]
    pub schedule_type: Option<String>,
    pub title: Option<String>,
    pub scheduled_at: Option<String>,
    pub account_ids: Option<Value>,
    pub posts: Option<Vec<String>>,
    pub urls: Option<Vec<String>>,
    pub like: Option<bool>,
    pub retweet: Option<bool>,
    pub comment: Option<bool>,
    pub comment_text: Option<String>,
    pub media_paths: Option<Vec<String>>,
    pub delay_seconds: Option<i64>,
    pub keywords: Option<Vec<String>>,
    pub vectors: Option<Vec<String>>,
    pub max_tweets: Option<i64>,
    pub interval_minutes: Option<i64>,
    pub enabled: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct TogglePayload {
    pub enabled: Option<bool>,
}

/// `GET /api/schedules`
pub async fn list_schedules(State(state): State<Arc<AppState>>) -> Json<Value> {
    Json(json!({
        "success": true,
        "schedules": state.db.get_schedules(),
    }))
}

/// `POST /api/schedules`
pub async fn create_schedule(
    State(state): State<Arc<AppState>>,
    Json(body): Json<ScheduleCreatePayload>,
) -> Result<Json<Value>, AppError> {
    let schedule_type = body
        .schedule_type
        .as_deref()
        .unwrap_or("POST_QUEUE")
        .trim()
        .to_string();

    if !ALLOWED_SCHEDULE_TYPES.contains(&schedule_type.as_str()) {
        return Err(AppError::validation(
            "Invalid schedule type. Use POST_QUEUE, RECURRING_HUNTER, or BATCH_ENGAGEMENT.",
        ));
    }

    if let Some(title) = &body.title
        && title.chars().count() > 200
    {
        return Err(AppError::validation("title must be at most 200 characters."));
    }

    if let Some(comment_text) = &body.comment_text
        && comment_text.chars().count() > 5000
    {
        return Err(AppError::validation(
            "commentText must be at most 5000 characters.",
        ));
    }

    if body.scheduled_at.as_deref().map(str::trim).unwrap_or("").is_empty()
        && schedule_type != "RECURRING_HUNTER"
    {
        return Err(AppError::validation(
            "Execution time (scheduledAt) is required.",
        ));
    }

    let scheduled_at = match body.scheduled_at.as_deref().map(str::trim) {
        Some(raw) if !raw.is_empty() => parse_scheduled_at(raw)
            .ok_or_else(|| AppError::validation("Invalid scheduledAt format."))?,
        _ => String::new(),
    };

    let delay_seconds = match body.delay_seconds {
        Some(d) if !(0..=3600).contains(&d) => {
            return Err(AppError::validation(
                "delaySeconds must be between 0 and 3600.",
            ));
        }
        Some(d) => d as u64,
        None => 15,
    };

    let max_tweets = match body.max_tweets {
        Some(m) if !(1..=100).contains(&m) => {
            return Err(AppError::validation("maxTweets must be between 1 and 100."));
        }
        Some(m) => m as u32,
        None => 3,
    };

    let interval_minutes = match body.interval_minutes {
        Some(i) if !(1..=10080).contains(&i) => {
            return Err(AppError::validation(
                "intervalMinutes must be between 1 and 10080.",
            ));
        }
        Some(i) => i as u64,
        None => 60,
    };

    let mut validated_media = Vec::new();
    if let Some(media_paths) = &body.media_paths {
        if media_paths.len() > 4 {
            return Err(AppError::validation("Maximum 4 mediaPaths allowed."));
        }
        for raw_path in media_paths {
            validated_media.push(validate_safe_media_path(&state.db.media_dir, raw_path)?);
        }
    }

    let default_title = match schedule_type.as_str() {
        "BATCH_ENGAGEMENT" => "Scheduled Target Engagement",
        "RECURRING_HUNTER" => "Recurring Feed Hunter",
        _ => "Scheduled Post Dispatch",
    };
    let title = body
        .title
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| default_title.to_string());

    let account_ids = match body.account_ids {
        Some(Value::String(s)) => Value::String(s),
        Some(Value::Array(arr)) => Value::Array(arr),
        None => Value::String("all".to_string()),
        _ => return Err(AppError::validation("accountIds must be a string or array.")),
    };

    let item = ScheduleItem {
        id: String::new(),
        schedule_type,
        title,
        enabled: body.enabled.unwrap_or(true),
        status: "PENDING".to_string(),
        scheduled_at,
        interval_minutes,
        last_run_at: None,
        account_ids,
        posts: body.posts.unwrap_or_default(),
        urls: body.urls.unwrap_or_default(),
        like: body.like,
        retweet: body.retweet,
        comment: body.comment,
        comment_text: body.comment_text,
        media_paths: validated_media,
        delay_seconds,
        keywords: body.keywords.unwrap_or_default(),
        vectors: body.vectors.unwrap_or_else(|| {
            vec![
                "LIKE".to_string(),
                "RETWEET".to_string(),
                "COMMENT".to_string(),
            ]
        }),
        max_tweets,
        created_at: String::new(),
        updated_at: String::new(),
        executed_at: None,
        last_message: None,
        extra: HashMap::new(),
    };

    let saved = state
        .db
        .save_schedule(item)
        .map_err(|e| AppError::validation(format!("Failed to save schedule: {e}")))?;

    state.logger.success(format!(
        "New schedule added: \"{}\" at {}",
        saved.title, saved.scheduled_at
    ));

    Ok(Json(json!({
        "success": true,
        "schedule": saved,
    })))
}

/// `DELETE /api/schedules/:id`
pub async fn delete_schedule(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<Value>, AppError> {
    let deleted = state
        .db
        .delete_schedule(&id)
        .map_err(AppError::Internal)?;
    if deleted {
        state.logger.info(format!("Schedule ID {id} deleted."));
        Ok(Json(json!({ "success": true })))
    } else {
        Err(AppError::not_found("NOT_FOUND", "Schedule not found."))
    }
}

/// `POST /api/schedules/:id/toggle`
pub async fn toggle_schedule(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    body: Option<Json<TogglePayload>>,
) -> Result<Json<Value>, AppError> {
    let explicit_enabled = body.and_then(|Json(b)| b.enabled);
    let updated = state
        .db
        .toggle_schedule(&id, explicit_enabled)
        .map_err(AppError::Internal)?;

    match updated {
        Some(schedule) => Ok(Json(json!({
            "success": true,
            "schedule": schedule,
        }))),
        None => Err(AppError::not_found("NOT_FOUND", "Schedule not found.")),
    }
}
