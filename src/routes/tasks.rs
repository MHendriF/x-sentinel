//! Automation task routes (`/api/tasks/*`) dispatching browser runs to `BotBridge`.

use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use regex::Regex;
use serde::Deserialize;
use serde_json::{Value, json};
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, LazyLock};

use crate::error::AppError;
use crate::state::AppState;

static TWEET_URL_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)^https?://(?:www\.)?(?:twitter\.com|x\.com)/[a-zA-Z0-9_]+/status/\d+")
        .expect("valid tweet status regex")
});

fn validate_media_paths(paths: &[String], data_dir: &std::path::Path) -> Result<(), AppError> {
    if paths.len() > 4 {
        return Err(AppError::validation("At most 4 media attachments are supported."));
    }
    let media_dir = fs::canonicalize(data_dir.join("media")).unwrap_or_else(|_| data_dir.join("media"));
    for raw in paths {
        let p = PathBuf::from(raw);
        let canonical = fs::canonicalize(&p).unwrap_or_else(|_| p.clone());
        let lower = canonical.to_string_lossy().to_ascii_lowercase();
        let valid_ext = lower.ends_with(".png")
            || lower.ends_with(".jpg")
            || lower.ends_with(".jpeg")
            || lower.ends_with(".gif")
            || lower.ends_with(".webp");
        if !canonical.starts_with(&media_dir) || canonical == media_dir || !valid_ext {
            return Err(AppError::validation(
                "Media file path must be inside the data/media directory with a valid image extension (PNG, JPG, GIF, WebP).",
            ));
        }
    }
    Ok(())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PostTaskPayload {
    pub account_ids: Option<Value>,
    pub posts: Option<Value>,
    pub delay_seconds: Option<f64>,
    pub media_paths: Option<Vec<String>>,
    pub engine: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchTaskPayload {
    pub account_ids: Option<Value>,
    pub urls: Option<Vec<String>>,
    pub like: Option<bool>,
    pub retweet: Option<bool>,
    pub comment: Option<bool>,
    pub comment_text: Option<String>,
    pub min_delay: Option<f64>,
    pub max_delay: Option<f64>,
    pub engine: Option<String>,
    pub cross_node_target_lock: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HunterTaskPayload {
    pub account_ids: Option<Value>,
    pub keyword: Option<String>,
    pub count: Option<u32>,
    pub like: Option<bool>,
    pub retweet: Option<bool>,
    pub comment: Option<bool>,
    pub comment_text: Option<String>,
    pub min_delay: Option<f64>,
    pub max_delay: Option<f64>,
    pub engine: Option<String>,
    pub cross_node_target_lock: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct PausePayload {
    pub reason: Option<String>,
}

pub async fn post_task(
    State(state): State<Arc<AppState>>,
    Json(body): Json<PostTaskPayload>,
) -> Result<Json<Value>, AppError> {
    if state.bot.is_running().await {
        return Err(AppError::bad_request(
            "TASK_RUNNING",
            "An automation process is currently running.",
        ));
    }

    let posts = body
        .posts
        .ok_or_else(|| AppError::validation("Post content cannot be empty."))?;
    let media_paths = body.media_paths.unwrap_or_default();
    validate_media_paths(&media_paths, &state.config.data_dir)?;

    let account_ids = body.account_ids.unwrap_or_else(|| json!("all"));
    let state_bg = Arc::clone(&state);
    state_bg
        .bot
        .set_running_state(true, Some(json!({ "type": "MULTI_POST" })))
        .await;

    tokio::spawn(async move {
        if let Err(err) = state_bg
            .bot
            .call(
                "run_post_task",
                json!({
                    "accountIds": account_ids,
                    "posts": posts,
                    "options": {
                        "delaySeconds": body.delay_seconds,
                        "mediaPaths": media_paths,
                        "engine": body.engine,
                    }
                }),
            )
            .await
        {
            state_bg
                .logger
                .error(format!("Background post task error: {err}"));
        }
        state_bg.bot.set_running_state(false, None).await;
    });

    Ok(Json(json!({
        "success": true,
        "message": "Post publication task started in the background.",
    })))
}

pub async fn batch_task(
    State(state): State<Arc<AppState>>,
    Json(body): Json<BatchTaskPayload>,
) -> Result<Json<Value>, AppError> {
    if state.bot.is_running().await {
        return Err(AppError::bad_request(
            "TASK_RUNNING",
            "An automation process is currently running.",
        ));
    }

    let urls = body.urls.unwrap_or_default();
    if urls.is_empty() {
        return Err(AppError::validation("Target tweet URL list cannot be empty."));
    }
    for u in &urls {
        if !TWEET_URL_RE.is_match(u.trim()) {
            return Err(AppError::validation(
                "Each URL must be an official X/Twitter tweet status link (e.g. https://x.com/user/status/123456).",
            ));
        }
    }

    let url_count = urls.len();
    let account_ids = body.account_ids.unwrap_or_else(|| json!("all"));
    let state_bg = Arc::clone(&state);
    state_bg
        .bot
        .set_running_state(
            true,
            Some(json!({ "type": "MULTI_BATCH", "urlsCount": url_count })),
        )
        .await;

    tokio::spawn(async move {
        if let Err(err) = state_bg
            .bot
            .call(
                "run_batch_task",
                json!({
                    "accountIds": account_ids,
                    "urls": urls,
                    "options": {
                        "like": body.like.unwrap_or(true),
                        "retweet": body.retweet.unwrap_or(true),
                        "comment": body.comment.unwrap_or(true),
                        "commentText": body.comment_text,
                        "minDelay": body.min_delay,
                        "maxDelay": body.max_delay,
                        "engine": body.engine,
                        "crossNodeTargetLock": body.cross_node_target_lock,
                    }
                }),
            )
            .await
        {
            state_bg
                .logger
                .error(format!("Background batch task error: {err}"));
        }
        state_bg.bot.set_running_state(false, None).await;
    });

    Ok(Json(json!({
        "success": true,
        "message": format!("Multi-node batch task started for {url_count} posts."),
    })))
}

pub async fn hunter_task(
    State(state): State<Arc<AppState>>,
    Json(body): Json<HunterTaskPayload>,
) -> Result<Json<Value>, AppError> {
    if state.bot.is_running().await {
        return Err(AppError::bad_request(
            "TASK_RUNNING",
            "An automation process is currently running.",
        ));
    }

    let keyword = body.keyword.unwrap_or_default().trim().to_string();
    if keyword.is_empty() {
        return Err(AppError::validation("Search keyword cannot be empty."));
    }
    let count = body.count.unwrap_or(10).clamp(1, 50);
    let kw_echo = keyword.clone();
    let account_ids = body.account_ids.unwrap_or_else(|| json!("all"));
    let state_bg = Arc::clone(&state);

    state_bg
        .bot
        .set_running_state(true, Some(json!({ "type": "HUNTER", "keyword": keyword })))
        .await;

    tokio::spawn(async move {
        if let Err(err) = state_bg
            .bot
            .call(
                "run_hunter_task",
                json!({
                    "accountIds": account_ids,
                    "keyword": keyword,
                    "count": count,
                    "options": {
                        "like": body.like.unwrap_or(true),
                        "retweet": body.retweet.unwrap_or(true),
                        "comment": body.comment.unwrap_or(true),
                        "commentText": body.comment_text,
                        "minDelay": body.min_delay,
                        "maxDelay": body.max_delay,
                        "engine": body.engine,
                        "crossNodeTargetLock": body.cross_node_target_lock,
                    }
                }),
            )
            .await
        {
            state_bg
                .logger
                .error(format!("Background hunter error: {err}"));
        }
        state_bg.bot.set_running_state(false, None).await;
    });

    Ok(Json(json!({
        "success": true,
        "message": format!("Feed Hunter task for \"{kw_echo}\" started in the background."),
    })))
}

pub async fn pause_task(
    State(state): State<Arc<AppState>>,
    body: Option<Json<PausePayload>>,
) -> Response {
    let reason = body
        .and_then(|b| b.0.reason)
        .unwrap_or_else(|| "Operator manual pause".to_string());
    if state.bot.pause(&reason).await {
        Json(json!({
            "success": true,
            "message": "Task paused successfully.",
            "isPaused": true,
        }))
        .into_response()
    } else {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({
                "success": false,
                "message": "No active running task to pause.",
            })),
        )
            .into_response()
    }
}

pub async fn resume_task(State(state): State<Arc<AppState>>) -> Response {
    if state.bot.resume().await {
        Json(json!({
            "success": true,
            "message": "Task resumed successfully.",
            "isPaused": false,
        }))
        .into_response()
    } else {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({
                "success": false,
                "message": "No paused task to resume.",
            })),
        )
            .into_response()
    }
}

pub async fn stop_task(State(state): State<Arc<AppState>>) -> Json<Value> {
    if state.bot.stop().await {
        Json(json!({
            "success": true,
            "message": "Task stop signal sent successfully.",
        }))
    } else {
        Json(json!({
            "success": false,
            "message": "No active tasks currently running.",
        }))
    }
}

pub async fn clear_locks(State(state): State<Arc<AppState>>) -> Json<Value> {
    let cleared = state.target_lock.clear();
    state.logger.info(format!(
        "All target locks cleared by operator ({cleared} lock(s) released)."
    ));
    Json(json!({
        "success": true,
        "message": format!("All target locks released ({cleared} lock(s) cleared)."),
        "clearedCount": cleared,
    }))
}

pub async fn get_locks(State(state): State<Arc<AppState>>) -> Json<Value> {
    let snap = state.target_lock.snapshot();
    Json(json!({
        "success": true,
        "activeTargets": snap.active_targets,
        "totalLocks": snap.total_locks,
    }))
}
