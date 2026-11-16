//! Fleet node CRUD, bulk import, CSV/JSON export, proxy checks, health checks, warmup, and Camoufox profiles.

use axum::Json;
use axum::extract::{Path, State};
use axum::http::{HeaderValue, StatusCode, header};
use axum::response::{IntoResponse, Response};
use chrono::Utc;
use futures_util::future::join_all;
use serde::Deserialize;
use serde_json::{Value, json};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;

use crate::db::sanitize_id;
use crate::domain::models::Account;
use crate::domain::proxy::{extract_proxy_host_port, is_valid_proxy_format, test_proxy};
use crate::error::AppError;
use crate::security::{is_masked_value, redact_account, resolve_proxy_string, resolve_secret};
use crate::state::AppState;

fn validate_proxy_field(val: &str) -> Result<(), AppError> {
    let trimmed = val.trim();
    if trimmed.is_empty() || is_masked_value(trimmed) {
        return Ok(());
    }
    if is_valid_proxy_format(trimmed) {
        return Ok(());
    }
    Err(AppError::validation(
        "Invalid proxy tunnel format. Use: user:pass@ip:port, ip:port:user:pass, or ip:port (HTTP/SOCKS5).",
    ))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AccountCreatePayload {
    pub label: Option<String>,
    pub username: Option<String>,
    pub name: Option<String>,
    pub avatar: Option<String>,
    #[serde(rename = "auth_token")]
    pub auth_token: Option<String>,
    pub ct0: Option<String>,
    pub proxy: Option<String>,
    pub comments: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AccountUpdatePayload {
    pub label: Option<String>,
    pub username: Option<String>,
    pub name: Option<String>,
    pub avatar: Option<String>,
    #[serde(rename = "auth_token")]
    pub auth_token: Option<String>,
    pub ct0: Option<String>,
    pub proxy: Option<String>,
    pub enabled: Option<bool>,
    pub warmup_mode: Option<bool>,
    pub warmup_day: Option<u32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BulkImportPayload {
    pub raw_text: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CommentsPayload {
    pub comments: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct BatchTogglePayload {
    pub ids: Option<Vec<String>>,
    pub enabled: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct BatchIdsPayload {
    pub ids: Option<Vec<String>>,
}

pub async fn list_accounts(State(state): State<Arc<AppState>>) -> Json<Value> {
    let accounts: Vec<Value> = state
        .db
        .get_accounts()
        .into_iter()
        .map(|acc| {
            let comments_count = state.db.get_account_comments(&acc.id).len();
            let redacted = redact_account(&acc);
            let mut val = serde_json::to_value(redacted).unwrap_or(Value::Null);
            if let Some(obj) = val.as_object_mut() {
                obj.insert("commentsCount".into(), json!(comments_count));
            }
            val
        })
        .collect();

    Json(json!({ "success": true, "accounts": accounts }))
}

pub async fn create_account(
    State(state): State<Arc<AppState>>,
    Json(body): Json<AccountCreatePayload>,
) -> Result<Json<Value>, AppError> {
    let auth_token = body.auth_token.unwrap_or_default();
    if auth_token.trim().len() < 4 {
        return Err(AppError::validation("auth_token is too short"));
    }
    if let Some(p) = &body.proxy {
        validate_proxy_field(p)?;
    }

    let account = Account {
        label: body
            .label
            .filter(|s| !s.trim().is_empty())
            .unwrap_or_else(|| "Account X".to_string()),
        auth_token: auth_token.trim().to_string(),
        ct0: body.ct0.unwrap_or_default().trim().to_string(),
        proxy: body.proxy.unwrap_or_default().trim().to_string(),
        username: body.username.unwrap_or_default(),
        name: body.name.unwrap_or_default(),
        avatar: body.avatar.unwrap_or_default(),
        ..Default::default()
    };

    let saved = state
        .db
        .save_account(account, body.comments)
        .map_err(AppError::Internal)?;
    state
        .logger
        .info(format!("New node registered: {}", saved.label));

    Ok(Json(json!({
        "success": true,
        "account": redact_account(&saved),
    })))
}

pub async fn export_accounts_json(State(state): State<Arc<AppState>>) -> Response {
    let payload = state.db.export_accounts();
    let filename = format!(
        "x_sentinel_fleet_backup_{}.json",
        Utc::now().format("%Y-%m-%d")
    );
    let body = serde_json::to_string_pretty(&payload).unwrap_or_else(|_| "{}".to_string());
    let mut resp = body.into_response();
    resp.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("application/json"),
    );
    if let Ok(disp) = HeaderValue::from_str(&format!("attachment; filename=\"{filename}\"")) {
        resp.headers_mut().insert(header::CONTENT_DISPOSITION, disp);
    }
    resp
}

pub async fn export_accounts_csv(State(state): State<Arc<AppState>>) -> Response {
    let accounts = state.db.get_accounts();
    let mut lines = vec![
        "Label,Username,Status,Health,Proxy Host,Warmup Day,Likes,Reposts,Replies,Posts,Total Actions,Last Checked".to_string()
    ];

    for a in accounts {
        let total = a.stats.likes + a.stats.retweets + a.stats.comments + a.stats.posts;
        let clean_proxy = extract_proxy_host_port(&a.proxy);
        let status = if a.enabled { "Active" } else { "Paused" };
        let health = a
            .health_status
            .clone()
            .unwrap_or_else(|| if a.is_valid { "Valid" } else { "Unchecked" }.to_string());
        let last_checked = a.last_checked_at.or(a.last_checked).unwrap_or_default();

        lines.push(format!(
            "\"{}\",\"{}\",{},{},\"{}\",{},{},{},{},{},{},\"{}\"",
            a.label.replace('"', "\"\""),
            a.username,
            status,
            health,
            clean_proxy.replace('"', "\"\""),
            a.warmup_day,
            a.stats.likes,
            a.stats.retweets,
            a.stats.comments,
            a.stats.posts,
            total,
            last_checked
        ));
    }

    let filename = format!("x_sentinel_fleet_{}.csv", Utc::now().format("%Y-%m-%d"));
    let mut resp = lines.join("\n").into_response();
    resp.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("text/csv; charset=utf-8;"),
    );
    if let Ok(disp) = HeaderValue::from_str(&format!("attachment; filename=\"{filename}\"")) {
        resp.headers_mut().insert(header::CONTENT_DISPOSITION, disp);
    }
    resp
}

pub async fn batch_toggle_accounts(
    State(state): State<Arc<AppState>>,
    Json(body): Json<BatchTogglePayload>,
) -> Result<Json<Value>, AppError> {
    let ids = body.ids.unwrap_or_default();
    let enabled = body
        .enabled
        .ok_or_else(|| AppError::validation("enabled boolean is required."))?;
    if ids.is_empty() {
        return Err(AppError::validation("ids cannot be empty."));
    }

    let mut accounts = state.db.get_accounts();
    let mut updated_count = 0usize;
    for acc in &mut accounts {
        if ids.iter().any(|id| id == &acc.id) {
            acc.enabled = enabled;
            updated_count += 1;
        }
    }
    if updated_count > 0 {
        state
            .db
            .save_accounts_vec(accounts)
            .map_err(AppError::Internal)?;
        state.logger.info(format!(
            "Batch toggled {updated_count} nodes: {}",
            if enabled { "Activated" } else { "Paused" }
        ));
    }

    Ok(Json(json!({
        "success": true,
        "updatedCount": updated_count,
        "enabled": enabled,
    })))
}

pub async fn batch_delete_accounts(
    State(state): State<Arc<AppState>>,
    Json(body): Json<BatchIdsPayload>,
) -> Result<Json<Value>, AppError> {
    let ids = body.ids.unwrap_or_default();
    if ids.is_empty() {
        return Err(AppError::validation("ids cannot be empty."));
    }
    let mut deleted_count = 0usize;
    for id in ids {
        if state.db.delete_account(&id).map_err(AppError::Internal)? {
            deleted_count += 1;
        }
    }
    state
        .logger
        .warn(format!("Batch deleted {deleted_count} nodes from fleet."));
    Ok(Json(json!({
        "success": true,
        "deletedCount": deleted_count,
    })))
}

pub async fn test_proxies_batch(
    State(state): State<Arc<AppState>>,
    Json(body): Json<BatchIdsPayload>,
) -> Json<Value> {
    let filter_ids = body.ids.unwrap_or_default();
    let targets: Vec<Account> = state
        .db
        .get_accounts()
        .into_iter()
        .filter(|acc| {
            !acc.proxy.trim().is_empty()
                && (filter_ids.is_empty() || filter_ids.iter().any(|id| id == &acc.id))
        })
        .collect();

    state.logger.info(format!(
        "Testing proxies for {} fleet nodes concurrently...",
        targets.len()
    ));

    let futs = targets.iter().map(|acc| {
        let id = acc.id.clone();
        let proxy = acc.proxy.trim().to_string();
        async move { (id, test_proxy(&proxy).await) }
    });

    let pairs = join_all(futs).await;
    let mut results = HashMap::new();
    for (id, res) in pairs {
        results.insert(id, res);
    }

    Json(json!({
        "success": true,
        "total": targets.len(),
        "results": results,
    }))
}

pub async fn bulk_import_accounts(
    State(state): State<Arc<AppState>>,
    Json(body): Json<BulkImportPayload>,
) -> Result<Json<Value>, AppError> {
    let raw = body.raw_text.unwrap_or_default();
    if raw.trim().is_empty() {
        return Err(AppError::validation("Input format cannot be empty."));
    }

    let added = state
        .db
        .bulk_import_accounts(&raw)
        .map_err(AppError::validation)?;
    state.logger.success(format!(
        "Successfully imported {} accounts into fleet.",
        added.len()
    ));

    let all_redacted: Vec<Account> = state
        .db
        .get_accounts()
        .iter()
        .map(redact_account)
        .collect();

    Ok(Json(json!({
        "success": true,
        "addedCount": added.len(),
        "importedCount": added.len(),
        "total": all_redacted.len(),
        "accounts": all_redacted,
    })))
}

pub async fn check_fleet_health(State(state): State<Arc<AppState>>) -> Result<Json<Value>, AppError> {
    let mut val = state
        .bot
        .call("check_fleet_health", json!({}))
        .await
        .map_err(AppError::Internal)?;

    if let Some(arr) = val.get_mut("results").and_then(Value::as_array_mut) {
        for item in arr {
            if let Some(acc_val) = item.get("account").cloned()
                && let Ok(acc) = serde_json::from_value::<Account>(acc_val)
            {
                item["account"] = serde_json::to_value(redact_account(&acc)).unwrap_or(Value::Null);
            }
        }
    }
    Ok(Json(val))
}

pub async fn get_account(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<Value>, AppError> {
    let acc = state
        .db
        .get_account_by_id(&id)
        .ok_or_else(|| AppError::not_found("NOT_FOUND", "Account not found."))?;
    let comments = state.db.get_account_comments(&id);
    let mut val = serde_json::to_value(redact_account(&acc)).unwrap_or(Value::Null);
    if let Some(obj) = val.as_object_mut() {
        obj.insert("comments".into(), json!(comments));
    }
    Ok(Json(json!({ "success": true, "account": val })))
}

pub async fn update_account(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(body): Json<AccountUpdatePayload>,
) -> Result<Json<Value>, AppError> {
    let mut existing = state
        .db
        .get_account_by_id(&id)
        .ok_or_else(|| AppError::not_found("NOT_FOUND", "Account not found."))?;

    if let Some(p) = &body.proxy {
        validate_proxy_field(p)?;
        existing.proxy = resolve_proxy_string(&existing.proxy, p);
    }
    if let Some(tok) = &body.auth_token {
        if tok.trim().len() < 4 && !is_masked_value(tok) {
            return Err(AppError::validation("auth_token is too short"));
        }
        existing.auth_token = resolve_secret(tok, &existing.auth_token);
    }
    if let Some(ct0) = &body.ct0 {
        existing.ct0 = resolve_secret(ct0, &existing.ct0);
    }
    if let Some(label) = body.label {
        existing.label = label;
    }
    if let Some(username) = body.username {
        existing.username = username;
    }
    if let Some(name) = body.name {
        existing.name = name;
    }
    if let Some(avatar) = body.avatar {
        existing.avatar = avatar;
    }
    if let Some(enabled) = body.enabled {
        existing.enabled = enabled;
    }
    if let Some(wm) = body.warmup_mode {
        existing.warmup_mode = wm;
    }
    if let Some(wd) = body.warmup_day {
        existing.warmup_day = wd;
    }

    let updated = state
        .db
        .save_account(existing, None)
        .map_err(AppError::Internal)?;
    state
        .logger
        .info(format!("Account updated: {}", updated.label));

    Ok(Json(json!({
        "success": true,
        "account": redact_account(&updated),
    })))
}

pub async fn delete_account(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<Value>, AppError> {
    if state.db.delete_account(&id).map_err(AppError::Internal)? {
        state
            .logger
            .info(format!("Account decommissioned: ID {id}"));
        Ok(Json(json!({ "success": true })))
    } else {
        Err(AppError::not_found("NOT_FOUND", "Account not found."))
    }
}

pub async fn toggle_account(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<Value>, AppError> {
    let updated = state
        .db
        .toggle_account(&id)
        .map_err(AppError::Internal)?
        .ok_or_else(|| AppError::not_found("NOT_FOUND", "Account not found."))?;
    let name = if updated.username.is_empty() {
        updated.label.as_str()
    } else {
        updated.username.as_str()
    };
    state.logger.info(format!(
        "Account status @{name} toggled: {}",
        if updated.enabled { "Active" } else { "Paused" }
    ));
    Ok(Json(json!({
        "success": true,
        "account": redact_account(&updated),
    })))
}

pub async fn verify_account(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<Value>, AppError> {
    let acc = state
        .db
        .get_account_by_id(&id)
        .ok_or_else(|| AppError::not_found("NOT_FOUND", "Account not found."))?;

    let mut val = state
        .bot
        .call("verify_account", json!({ "account": acc }))
        .await
        .map_err(AppError::Internal)?;
    if let Some(acc_val) = val.get("account").cloned()
        && let Ok(updated) = serde_json::from_value::<Account>(acc_val)
    {
        val["account"] = serde_json::to_value(redact_account(&updated)).unwrap_or(Value::Null);
    }
    Ok(Json(val))
}

pub async fn check_account_health(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<Value>, AppError> {
    let acc = state
        .db
        .get_account_by_id(&id)
        .ok_or_else(|| AppError::not_found("NOT_FOUND", "Account not found."))?;

    let mut val = state
        .bot
        .call("check_account_health", json!({ "account": acc }))
        .await
        .map_err(AppError::Internal)?;
    if let Some(acc_val) = val.get("account").cloned()
        && let Ok(updated) = serde_json::from_value::<Account>(acc_val)
    {
        val["account"] = serde_json::to_value(redact_account(&updated)).unwrap_or(Value::Null);
    }
    Ok(Json(val))
}

pub async fn start_warmup(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<Value>, AppError> {
    let acc = state
        .db
        .get_account_by_id(&id)
        .ok_or_else(|| AppError::not_found("NOT_FOUND", "Account not found."))?;
    if state.bot.is_running().await {
        return Err(AppError::bad_request(
            "TASK_RUNNING",
            "An automation process is currently running.",
        ));
    }

    let name = if acc.username.is_empty() {
        acc.label.clone()
    } else {
        acc.username.clone()
    };
    let day = acc.warmup_day;
    let state_bg = Arc::clone(&state);

    state_bg
        .bot
        .set_running_state(true, Some(json!({ "type": "WARMUP", "accountId": acc.id })))
        .await;

    tokio::spawn(async move {
        if let Err(err) = state_bg
            .bot
            .call("run_warmup", json!({ "account": acc }))
            .await
        {
            state_bg
                .logger
                .error(format!("Background warmup error: {err}"));
        }
        state_bg.bot.set_running_state(false, None).await;
    });

    Ok(Json(json!({
        "success": true,
        "message": format!("Initiating warm-up routine for @{name} (Day {day}/7)..."),
    })))
}

pub async fn test_account_proxy(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<Value>, AppError> {
    let acc = state
        .db
        .get_account_by_id(&id)
        .ok_or_else(|| AppError::not_found("NOT_FOUND", "Account not found."))?;
    if acc.proxy.trim().is_empty() {
        return Err(AppError::bad_request(
            "NO_PROXY",
            "This account has no proxy configured.",
        ));
    }
    let res = test_proxy(acc.proxy.trim()).await;
    Ok(Json(serde_json::to_value(res).unwrap_or(json!({ "success": false }))))
}

pub async fn get_account_comments(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Json<Value> {
    let comments = state.db.get_account_comments(&id);
    Json(json!({ "success": true, "comments": comments }))
}

pub async fn save_account_comments(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(body): Json<CommentsPayload>,
) -> Result<Json<Value>, AppError> {
    let comments = body
        .comments
        .ok_or_else(|| AppError::validation("comments array is required."))?;
    if comments.len() > 500 {
        return Err(AppError::validation("Maximum 500 comments allowed."));
    }
    let count = comments.len();
    state
        .db
        .save_account_comments(&id, comments)
        .map_err(AppError::Internal)?;
    state.logger.info(format!(
        "Comments updated for node ID {id} ({count} entries)."
    ));
    Ok(Json(json!({ "success": true, "count": count })))
}

pub async fn start_camoufox_login(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Response, AppError> {
    let acc = state
        .db
        .get_account_by_id(&id)
        .ok_or_else(|| AppError::not_found("NOT_FOUND", "Account not found."))?;
    if state.bot.is_running().await {
        return Err(AppError::bad_request(
            "TASK_RUNNING",
            "An automation task is currently running. Please wait or pause the task before logging in.",
        ));
    }

    match state
        .bot
        .call("camoufox_login", json!({ "account": acc }))
        .await
    {
        Ok(mut val) => {
            if let Some(acc_val) = val.get("account").cloned()
                && let Ok(updated) = serde_json::from_value::<Account>(acc_val)
            {
                val["account"] = serde_json::to_value(redact_account(&updated)).unwrap_or(Value::Null);
            }
            Ok(Json(val).into_response())
        }
        Err(msg) => Ok((
            StatusCode::BAD_REQUEST,
            Json(json!({ "success": false, "message": msg })),
        )
            .into_response()),
    }
}

fn dir_size_bytes(path: &PathBuf) -> u64 {
    let mut total = 0u64;
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            if let Ok(meta) = entry.metadata() {
                if meta.is_dir() {
                    total += dir_size_bytes(&entry.path());
                } else {
                    total += meta.len();
                }
            }
        }
    }
    total
}

fn profile_dir(state: &AppState, account_id: &str) -> PathBuf {
    state
        .config
        .camoufox_profiles_dir
        .join(sanitize_id(account_id))
}

pub fn camoufox_profile_status_json(state: &AppState, account_id: &str) -> Value {
    let dir = profile_dir(state, account_id);
    let account = state.db.get_account_by_id(account_id);
    let last_login_at = account
        .as_ref()
        .and_then(|a| a.camoufox_profile.as_ref())
        .and_then(|v| v.get("lastLoginAt"))
        .cloned()
        .unwrap_or(Value::Null);

    if !dir.exists() {
        return json!({
            "exists": false,
            "accountId": account_id,
            "profileDir": dir.to_string_lossy(),
            "sizeBytes": 0,
            "sizeFormatted": "0 B",
            "lastLoginAt": last_login_at,
            "hasStorageState": false,
        });
    }

    let size = dir_size_bytes(&dir);
    let has_storage_state = dir.join("storage_state.json").exists();
    let size_formatted = if size > 1024 * 1024 {
        format!("{:.1} MB", size as f64 / (1024.0 * 1024.0))
    } else {
        format!("{:.1} KB", size as f64 / 1024.0)
    };

    json!({
        "exists": true,
        "accountId": account_id,
        "profileDir": dir.to_string_lossy(),
        "sizeBytes": size,
        "sizeFormatted": size_formatted,
        "lastLoginAt": last_login_at,
        "hasStorageState": has_storage_state,
    })
}

pub fn delete_camoufox_profile_on_disk(state: &AppState, account_id: &str) {
    let dir = profile_dir(state, account_id);
    if dir.exists() {
        let _ = fs::remove_dir_all(&dir);
        state.logger.info(format!(
            "Camoufox persistent profile removed for node ID: {account_id}"
        ));
    }
    if let Some(mut acc) = state.db.get_account_by_id(account_id) {
        acc.camoufox_profile = None;
        let _ = state.db.save_account(acc, None);
    }
}

pub async fn get_camoufox_status(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<Value>, AppError> {
    if state.db.get_account_by_id(&id).is_none() {
        return Err(AppError::not_found("NOT_FOUND", "Account not found."));
    }
    let status = camoufox_profile_status_json(&state, &id);
    Ok(Json(json!({ "success": true, "status": status })))
}

pub async fn delete_camoufox_profile(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<Value>, AppError> {
    if state.db.get_account_by_id(&id).is_none() {
        return Err(AppError::not_found("NOT_FOUND", "Account not found."));
    }
    delete_camoufox_profile_on_disk(&state, &id);
    Ok(Json(json!({
        "success": true,
        "message": "Camoufox profile removed.",
    })))
}

pub async fn batch_delete_camoufox_profiles(
    State(state): State<Arc<AppState>>,
    Json(body): Json<BatchIdsPayload>,
) -> Result<Json<Value>, AppError> {
    let ids = body.ids.unwrap_or_default();
    if ids.is_empty() {
        return Err(AppError::validation("ids cannot be empty."));
    }
    let mut deleted_count = 0usize;
    for id in ids {
        if state.db.get_account_by_id(&id).is_some() {
            delete_camoufox_profile_on_disk(&state, &id);
            deleted_count += 1;
        }
    }
    state.logger.info(format!(
        "Bulk Camoufox profiles removed for {deleted_count} node(s)"
    ));
    Ok(Json(json!({
        "success": true,
        "message": format!("Removed Camoufox profile for {deleted_count} node(s)."),
        "deletedCount": deleted_count,
    })))
}
