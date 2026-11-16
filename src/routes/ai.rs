//! AI generation, tweet extraction, and safe `data/comments/*.json` payload vault endpoints.

use axum::Json;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use chrono::{DateTime, Utc};
use serde::Deserialize;
use serde_json::{Value, json};
use std::fs;
use std::sync::Arc;

use crate::db::write_json_atomic;
use crate::domain::ai_service::{
    AiOverrides, generate_payload_replies_from_post, generate_post_from_keyword, test_connection,
};
use crate::domain::tweet_extractor::{fetch_tweet_content, is_tweet_url};
use crate::error::AppError;
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct FetchTweetPayload {
    pub url: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GeneratePostPayload {
    pub keyword: Option<String>,
    pub style: Option<String>,
    pub language: Option<String>,
    pub count: Option<usize>,
    pub custom_prompt: Option<String>,
    pub custom_overrides: Option<Value>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GeneratePayloadRepliesPayload {
    pub post_text: Option<String>,
    pub count: Option<usize>,
    pub tone: Option<String>,
    pub language: Option<String>,
    pub custom_instruction: Option<String>,
    pub custom_overrides: Option<Value>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SavePayloadFilePayload {
    pub file_name: Option<String>,
    pub replies: Option<Vec<String>>,
    pub target_account_id: Option<String>,
    pub save_to_templates: Option<bool>,
}

fn parse_ai_overrides(val: Option<&Value>) -> AiOverrides {
    let Some(obj) = val.and_then(Value::as_object) else {
        return AiOverrides::default();
    };
    let mut ov = AiOverrides {
        ai_provider: obj
            .get("aiProvider")
            .and_then(Value::as_str)
            .map(String::from),
        ai_api_key: obj
            .get("aiApiKey")
            .and_then(Value::as_str)
            .map(String::from),
        ai_model: obj
            .get("aiModel")
            .and_then(Value::as_str)
            .map(String::from),
        ai_base_url: obj
            .get("aiBaseUrl")
            .and_then(Value::as_str)
            .map(String::from),
        ai_prompt: obj
            .get("aiPrompt")
            .and_then(Value::as_str)
            .map(String::from),
    };
    if let Some(k) = &ov.ai_api_key
        && k.contains("••")
    {
        ov.ai_api_key = None;
    }
    ov
}

pub async fn fetch_tweet(
    Json(body): Json<FetchTweetPayload>,
) -> Result<Response, AppError> {
    let url = body.url.unwrap_or_default();
    if url.trim().is_empty() {
        return Err(AppError::validation("Tweet URL is required."));
    }
    let res = fetch_tweet_content(&url).await;
    if !res.success {
        return Ok((
            StatusCode::BAD_REQUEST,
            Json(json!({
                "success": false,
                "message": res.error.unwrap_or_else(|| "Failed to extract tweet content from link.".to_string()),
            })),
        )
            .into_response());
    }
    Ok(Json(json!({
        "success": true,
        "tweetId": res.tweet_id,
        "text": res.text,
        "author": res.author,
        "authorName": res.author_name,
        "provider": res.provider,
    }))
    .into_response())
}

pub async fn generate_post(
    State(state): State<Arc<AppState>>,
    Json(body): Json<GeneratePostPayload>,
) -> Result<Json<Value>, AppError> {
    let keyword = body.keyword.unwrap_or_default().trim().to_string();
    if keyword.is_empty() {
        return Err(AppError::validation("Topic or keyword is required."));
    }

    let stored = state.db.get_settings();
    let overrides = parse_ai_overrides(body.custom_overrides.as_ref());
    let res = generate_post_from_keyword(
        &stored,
        &keyword,
        body.style.as_deref().unwrap_or("viral_hook"),
        body.language.as_deref().unwrap_or("en"),
        body.count.unwrap_or(1).clamp(1, 5),
        body.custom_prompt.as_deref().unwrap_or(""),
        &overrides,
    )
    .await;

    Ok(Json(json!({
        "success": true,
        "provider": res.provider,
        "posts": res.posts,
        "isFallback": res.is_fallback,
    })))
}

pub async fn generate_payload_replies(
    State(state): State<Arc<AppState>>,
    Json(body): Json<GeneratePayloadRepliesPayload>,
) -> Result<Response, AppError> {
    let raw_post = body.post_text.unwrap_or_default().trim().to_string();
    if raw_post.is_empty() {
        return Err(AppError::validation(
            "Target post text or tweet URL is required.",
        ));
    }

    let resolved_text = if is_tweet_url(&raw_post) {
        let fetched = fetch_tweet_content(&raw_post).await;
        if !fetched.success {
            return Ok((
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "success": false,
                    "message": fetched.error.unwrap_or_else(|| "Failed to extract tweet text from URL.".to_string()),
                })),
            )
                .into_response());
        }
        fetched.text.unwrap_or(raw_post)
    } else {
        raw_post
    };

    let stored = state.db.get_settings();
    let overrides = parse_ai_overrides(body.custom_overrides.as_ref());
    let res = generate_payload_replies_from_post(
        &stored,
        &resolved_text,
        body.count.unwrap_or(15).clamp(1, 50),
        body.tone.as_deref().unwrap_or("peer_native"),
        body.language.as_deref().unwrap_or("auto"),
        body.custom_instruction.as_deref().unwrap_or(""),
        &overrides,
    )
    .await;

    Ok(Json(json!({
        "success": true,
        "provider": res.provider,
        "count": res.count,
        "replies": res.replies,
        "isFallback": res.is_fallback,
    }))
    .into_response())
}

pub async fn save_payload_file(
    State(state): State<Arc<AppState>>,
    Json(body): Json<SavePayloadFilePayload>,
) -> Result<Json<Value>, AppError> {
    let file_name = body.file_name.unwrap_or_default();
    if file_name.trim().is_empty() {
        return Err(AppError::validation("File name is required."));
    }
    let replies = body.replies.unwrap_or_default();
    let cleaned: Vec<String> = replies
        .into_iter()
        .map(|r| r.replace(['"', '“', '”'], "").trim().to_string())
        .filter(|r| !r.is_empty())
        .collect();
    if cleaned.is_empty() {
        return Err(AppError::bad_request(
            "EMPTY_REPLIES",
            "Reply list cannot be empty.",
        ));
    }

    let (safe_name, target_path) = state
        .db
        .get_safe_comments_file_path(&file_name)
        .map_err(|msg| AppError::bad_request("SECURITY_VIOLATION", msg))?;

    write_json_atomic(&target_path, &cleaned)
        .map_err(|e| AppError::Internal(format!("Failed to save file: {e}")))?;

    state.logger.info(format!(
        "Payload file saved: {safe_name} ({} replies).",
        cleaned.len()
    ));

    if let Some(acc_id) = &body.target_account_id
        && let Some(acc) = state.db.get_account_by_id(acc_id)
    {
        let _ = state.db.save_account_comments(acc_id, cleaned.clone());
        let handle = if acc.username.is_empty() {
            &acc.label
        } else {
            &acc.username
        };
        state
            .logger
            .info(format!("Payload linked to node @{handle}"));
    }

    if body.save_to_templates == Some(true) {
        let _ = state.db.save_templates(cleaned.clone());
        state
            .logger
            .info("Reply payload loaded into Global Templates Pool.");
    }

    let count = cleaned.len();
    Ok(Json(json!({
        "success": true,
        "fileName": safe_name,
        "filePath": format!("data/comments/{safe_name}"),
        "count": count,
        "message": format!("Successfully saved {count} replies to {safe_name}"),
    })))
}

pub async fn get_payload_file(
    State(state): State<Arc<AppState>>,
    Path(file_name): Path<String>,
) -> Result<Json<Value>, AppError> {
    let (safe_name, target_path) = state
        .db
        .get_safe_comments_file_path(&file_name)
        .map_err(|msg| AppError::bad_request("SECURITY_VIOLATION", msg))?;

    if !target_path.exists() {
        return Err(AppError::not_found(
            "FILE_NOT_FOUND",
            format!("Payload file '{safe_name}' not found."),
        ));
    }
    let raw = fs::read_to_string(&target_path)
        .map_err(|e| AppError::Internal(format!("Failed to read file: {e}")))?;
    let parsed: Value = serde_json::from_str(&raw).unwrap_or(json!([]));
    let replies = parsed.as_array().cloned().unwrap_or_default();

    Ok(Json(json!({
        "success": true,
        "fileName": safe_name,
        "filePath": format!("data/comments/{safe_name}"),
        "count": replies.len(),
        "replies": replies,
    })))
}

pub async fn delete_payload_file(
    State(state): State<Arc<AppState>>,
    Path(file_name): Path<String>,
) -> Result<Json<Value>, AppError> {
    let (safe_name, target_path) = state
        .db
        .get_safe_comments_file_path(&file_name)
        .map_err(|msg| AppError::bad_request("SECURITY_VIOLATION", msg))?;

    if !target_path.exists() {
        return Err(AppError::not_found(
            "FILE_NOT_FOUND",
            format!("Payload file '{safe_name}' not found."),
        ));
    }
    fs::remove_file(&target_path)
        .map_err(|e| AppError::Internal(format!("Failed to delete file: {e}")))?;
    state
        .logger
        .info(format!("Payload file deleted: {safe_name}"));

    Ok(Json(json!({
        "success": true,
        "fileName": safe_name,
        "message": format!("Payload file '{safe_name}' deleted successfully."),
    })))
}

pub async fn list_payload_files(State(state): State<Arc<AppState>>) -> Json<Value> {
    let mut files_out = Vec::new();
    if let Ok(entries) = fs::read_dir(&state.db.comments_dir) {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            if !name.to_ascii_lowercase().ends_with(".json") {
                continue;
            }
            if let Ok(meta) = entry.metadata() {
                let count = fs::read_to_string(entry.path())
                    .ok()
                    .and_then(|r| serde_json::from_str::<Vec<Value>>(&r).ok())
                    .map(|v| v.len())
                    .unwrap_or(0);
                let updated_at = meta
                    .modified()
                    .ok()
                    .map(|t| DateTime::<Utc>::from(t).to_rfc3339())
                    .unwrap_or_default();
                files_out.push(json!({
                    "fileName": name,
                    "filePath": format!("data/comments/{name}"),
                    "count": count,
                    "sizeBytes": meta.len(),
                    "updatedAt": updated_at,
                }));
            }
        }
    }
    Json(json!({ "success": true, "files": files_out }))
}

pub async fn test_ai_connection(
    State(state): State<Arc<AppState>>,
    Json(body): Json<Value>,
) -> Json<Value> {
    let stored = state.db.get_settings();
    let overrides = parse_ai_overrides(Some(&body));
    let res = test_connection(&stored, &overrides).await;
    Json(serde_json::to_value(res).unwrap_or(json!({ "success": false })))
}
