//! Settings, webhooks, proxy, spintax preview, templates, comments, and stats endpoints.

use axum::Json;
use axum::extract::State;
use serde::Deserialize;
use serde_json::{Value, json};
use std::collections::HashSet;
use std::sync::Arc;

use crate::domain::ai_service::{self, AiOverrides};
use crate::domain::models::Settings;
use crate::domain::notifier;
use crate::domain::proxy::{is_valid_proxy_format, test_proxy as run_proxy_test};
use crate::domain::spintax::parse_spintax;
use crate::error::AppError;
use crate::security::{
    is_masked_value, mask_proxy_string, redact_settings, resolve_secret, restore_masked_settings,
};
use crate::state::AppState;

fn validate_telegram_token_field(val: &str) -> Result<(), AppError> {
    let trimmed = val.trim();
    if trimmed.is_empty() || is_masked_value(trimmed) {
        return Ok(());
    }
    if notifier::is_valid_telegram_token(trimmed) {
        return Ok(());
    }
    Err(AppError::validation(
        "Invalid Telegram Bot Token format. Use standard format: 123456:ABC-DEF...",
    ))
}

fn validate_discord_webhook_field(val: &str) -> Result<(), AppError> {
    let trimmed = val.trim();
    if trimmed.is_empty() || is_masked_value(trimmed) {
        return Ok(());
    }
    if notifier::is_valid_discord_webhook(trimmed) {
        return Ok(());
    }
    Err(AppError::validation(
        "Invalid Discord Webhook URL. Must be an official HTTPS URL (e.g. https://discord.com/api/webhooks/...).",
    ))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsUpdatePayload {
    pub min_delay_seconds: Option<i64>,
    pub max_delay_seconds: Option<i64>,
    pub account_switch_delay_sec: Option<i64>,
    pub hourly_limit: Option<i64>,
    pub daily_limit: Option<i64>,
    pub headless: Option<bool>,
    pub browser_engine: Option<String>,
    pub human_typing_delay_ms: Option<i64>,
    pub scroll_before_action: Option<bool>,
    pub enforce_warmup_gate: Option<bool>,
    pub cross_node_target_lock: Option<bool>,
    pub ai_provider: Option<String>,
    pub ai_api_key: Option<String>,
    pub ai_model: Option<String>,
    pub ai_base_url: Option<String>,
    pub nine_router_models: Option<Vec<String>>,
    pub ai_prompt: Option<String>,
    pub telegram_enabled: Option<bool>,
    pub telegram_bot_token: Option<String>,
    pub telegram_chat_id: Option<String>,
    pub discord_enabled: Option<bool>,
    pub discord_webhook_url: Option<String>,
    pub notify_on_task_complete: Option<bool>,
    pub notify_on_rate_limit: Option<bool>,
    pub notify_on_session_expire: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrowserTestPayload {
    pub browser_engine: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebhookTestPayload {
    #[serde(rename = "type")]
    pub kind: Option<String>,
    pub telegram_bot_token: Option<String>,
    pub telegram_chat_id: Option<String>,
    pub discord_webhook_url: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiTestPayload {
    pub ai_provider: Option<String>,
    pub ai_api_key: Option<String>,
    pub ai_model: Option<String>,
    pub ai_base_url: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiGenerateTestPayload {
    pub tweet_text: Option<String>,
    pub ai_provider: Option<String>,
    pub ai_api_key: Option<String>,
    pub ai_model: Option<String>,
    pub ai_base_url: Option<String>,
    pub ai_prompt: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ProxyTestPayload {
    pub proxy: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SpintaxPreviewPayload {
    pub text: Option<String>,
    pub count: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct TemplatesPayload {
    pub templates: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct CommentsPayload {
    pub comments: Vec<String>,
}

fn build_ai_overrides(
    stored: &Settings,
    ai_provider: Option<String>,
    ai_api_key: Option<String>,
    ai_model: Option<String>,
    ai_base_url: Option<String>,
    ai_prompt: Option<String>,
) -> AiOverrides {
    let mut cleaned_key = ai_api_key.filter(|k| !is_masked_value(k));
    if let Some(base) = &ai_base_url
        && stored.ai_base_url.as_deref() != Some(base.as_str())
        && cleaned_key.is_none()
    {
        cleaned_key = Some(String::new());
    }
    AiOverrides {
        ai_provider,
        ai_api_key: cleaned_key,
        ai_model,
        ai_base_url,
        ai_prompt,
    }
}

/// `GET /api/settings`
pub async fn get_settings(State(state): State<Arc<AppState>>) -> Json<Value> {
    let settings = state.db.get_settings();
    Json(json!({
        "success": true,
        "settings": redact_settings(&settings),
    }))
}

/// `POST /api/settings`
pub async fn save_settings(
    State(state): State<Arc<AppState>>,
    Json(body): Json<SettingsUpdatePayload>,
) -> Result<Json<Value>, AppError> {
    let current = state.db.get_settings();
    let mut candidate = current.clone();

    if let Some(v) = body.min_delay_seconds {
        if !(0..=3600).contains(&v) {
            return Err(AppError::validation("minDelaySeconds must be 0..3600."));
        }
        candidate.min_delay_seconds = v as u64;
    }
    if let Some(v) = body.max_delay_seconds {
        if !(1..=7200).contains(&v) {
            return Err(AppError::validation("maxDelaySeconds must be 1..7200."));
        }
        candidate.max_delay_seconds = v as u64;
    }
    if let Some(v) = body.account_switch_delay_sec {
        if !(0..=3600).contains(&v) {
            return Err(AppError::validation(
                "accountSwitchDelaySec must be 0..3600.",
            ));
        }
        candidate.account_switch_delay_sec = v as u64;
    }
    if let Some(v) = body.hourly_limit {
        if !(1..=60).contains(&v) {
            return Err(AppError::validation("hourlyLimit must be 1..60."));
        }
        candidate.hourly_limit = v as u64;
    }
    if let Some(v) = body.daily_limit {
        if !(1..=300).contains(&v) {
            return Err(AppError::validation("dailyLimit must be 1..300."));
        }
        candidate.daily_limit = v as u64;
    }
    if let Some(v) = body.headless {
        candidate.headless = v;
    }
    if let Some(v) = body.browser_engine {
        if v != "chromium" && v != "camoufox" {
            return Err(AppError::validation(
                "browserEngine must be 'chromium' or 'camoufox'.",
            ));
        }
        candidate.browser_engine = v;
    }
    if let Some(v) = body.human_typing_delay_ms {
        if !(10..=1000).contains(&v) {
            return Err(AppError::validation(
                "humanTypingDelayMs must be 10..1000.",
            ));
        }
        candidate.human_typing_delay_ms = v as u64;
    }
    if let Some(v) = body.scroll_before_action {
        candidate.scroll_before_action = v;
    }
    if let Some(v) = body.enforce_warmup_gate {
        candidate.enforce_warmup_gate = v;
    }
    if let Some(v) = body.cross_node_target_lock {
        candidate.cross_node_target_lock = v;
    }
    if let Some(v) = body.ai_provider {
        if v.chars().count() > 50 {
            return Err(AppError::validation("aiProvider too long."));
        }
        candidate.ai_provider = v;
    }
    if let Some(v) = body.ai_api_key {
        if v.chars().count() > 500 {
            return Err(AppError::validation("aiApiKey too long."));
        }
        candidate.ai_api_key = v;
    }
    if let Some(v) = body.ai_model {
        if v.chars().count() > 200 {
            return Err(AppError::validation("aiModel too long."));
        }
        candidate.ai_model = Some(v);
    }
    if let Some(v) = body.ai_base_url {
        if v.chars().count() > 500 {
            return Err(AppError::validation("aiBaseUrl too long."));
        }
        candidate.ai_base_url = Some(v);
    }
    if let Some(models) = body.nine_router_models {
        if models.len() > 100 {
            return Err(AppError::validation("Maximum 100 nineRouterModels allowed."));
        }
        let mut seen = HashSet::new();
        let mut deduped = Vec::new();
        for raw in models {
            let trimmed = raw.trim().to_string();
            if trimmed.is_empty() || trimmed.chars().count() > 200 {
                return Err(AppError::validation(
                    "Each nineRouterModels entry must be 1..200 characters.",
                ));
            }
            if seen.insert(trimmed.clone()) {
                deduped.push(trimmed);
            }
        }
        candidate.nine_router_models = deduped;
    }
    if let Some(v) = body.ai_prompt {
        if v.chars().count() > 8000 {
            return Err(AppError::validation("aiPrompt too long (max 8000)."));
        }
        candidate.ai_prompt = v;
    }
    if let Some(v) = body.telegram_enabled {
        candidate.telegram_enabled = v;
    }
    if let Some(v) = body.telegram_bot_token {
        validate_telegram_token_field(&v)?;
        candidate.telegram_bot_token = v;
    }
    if let Some(v) = body.telegram_chat_id {
        if v.chars().count() > 100 {
            return Err(AppError::validation("telegramChatId too long."));
        }
        candidate.telegram_chat_id = v;
    }
    if let Some(v) = body.discord_enabled {
        candidate.discord_enabled = v;
    }
    if let Some(v) = body.discord_webhook_url {
        validate_discord_webhook_field(&v)?;
        candidate.discord_webhook_url = v;
    }
    if let Some(v) = body.notify_on_task_complete {
        candidate.notify_on_task_complete = v;
    }
    if let Some(v) = body.notify_on_rate_limit {
        candidate.notify_on_rate_limit = v;
    }
    if let Some(v) = body.notify_on_session_expire {
        candidate.notify_on_session_expire = v;
    }

    let restored = restore_masked_settings(candidate, &current);
    let saved = state.db.save_settings(restored).map_err(AppError::Internal)?;

    state.logger.info("System settings updated.");
    Ok(Json(json!({
        "success": true,
        "settings": redact_settings(&saved),
    })))
}

/// `POST /api/settings/test-browser`
pub async fn test_browser(
    State(state): State<Arc<AppState>>,
    body: Option<Json<BrowserTestPayload>>,
) -> Result<Json<Value>, AppError> {
    let engine = body
        .and_then(|Json(b)| b.browser_engine)
        .unwrap_or_else(|| "chromium".to_string());
    if engine != "chromium" && engine != "camoufox" {
        return Err(AppError::validation(
            "browserEngine must be 'chromium' or 'camoufox'.",
        ));
    }

    let res = state
        .bot
        .call("test_browser", json!({ "browserEngine": engine }))
        .await
        .map_err(AppError::Internal)?;

    Ok(Json(res))
}

/// `POST /api/settings/test-webhook`
pub async fn test_webhook(
    State(state): State<Arc<AppState>>,
    Json(body): Json<WebhookTestPayload>,
) -> Result<Json<Value>, AppError> {
    if let Some(kind) = &body.kind
        && kind != "telegram"
        && kind != "discord"
    {
        return Err(AppError::validation(
            "Webhook type must be 'telegram' or 'discord'.",
        ));
    }

    if let Some(tok) = &body.telegram_bot_token {
        validate_telegram_token_field(tok)?;
    }
    if let Some(url) = &body.discord_webhook_url {
        validate_discord_webhook_field(url)?;
    }

    let stored = state.db.get_settings();
    let resolved_tg_token = body
        .telegram_bot_token
        .as_deref()
        .map(|raw| resolve_secret(raw, &stored.telegram_bot_token))
        .filter(|s| !s.is_empty());
    let resolved_discord = body
        .discord_webhook_url
        .as_deref()
        .map(|raw| resolve_secret(raw, &stored.discord_webhook_url))
        .filter(|s| !s.is_empty());

    let result = notifier::test_webhook(
        body.kind.as_deref(),
        resolved_tg_token.as_deref(),
        body.telegram_chat_id.as_deref(),
        resolved_discord.as_deref(),
    )
    .await;

    Ok(Json(result))
}

/// `POST /api/settings/test-ai`
pub async fn test_ai_settings(
    State(state): State<Arc<AppState>>,
    Json(body): Json<AiTestPayload>,
) -> Json<Value> {
    let stored = state.db.get_settings();
    let overrides = build_ai_overrides(
        &stored,
        body.ai_provider,
        body.ai_api_key,
        body.ai_model,
        body.ai_base_url,
        None,
    );
    let res = ai_service::test_connection(&stored, &overrides).await;
    Json(serde_json::to_value(res).unwrap_or_else(|_| json!({ "success": false })))
}

/// `POST /api/settings/generate-ai-test`
pub async fn generate_ai_test(
    State(state): State<Arc<AppState>>,
    Json(body): Json<AiGenerateTestPayload>,
) -> Result<Json<Value>, AppError> {
    let tweet_text = body
        .tweet_text
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .ok_or_else(|| AppError::validation("Target tweet text is required."))?;

    let stored = state.db.get_settings();
    let overrides = build_ai_overrides(
        &stored,
        body.ai_provider,
        body.ai_api_key,
        body.ai_model,
        body.ai_base_url,
        body.ai_prompt,
    );

    let reply = ai_service::generate_contextual_reply(tweet_text, &stored, &overrides).await;
    match reply {
        Some(output) if !output.trim().is_empty() => Ok(Json(json!({
            "success": true,
            "message": "AI reply rendered successfully.",
            "sampleOutput": output,
        }))),
        _ => Err(AppError::Http {
            status: axum::http::StatusCode::UNPROCESSABLE_ENTITY,
            code: "AI_NO_REPLY".to_string(),
            message: "AI did not generate a reply. Check provider, API key, or prompt.".to_string(),
            is_htmx: false,
        }),
    }
}

/// `POST /api/proxy/test`
pub async fn test_proxy_endpoint(
    State(state): State<Arc<AppState>>,
    Json(body): Json<ProxyTestPayload>,
) -> Result<Json<Value>, AppError> {
    let proxy = body
        .proxy
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .ok_or_else(|| AppError::validation("Proxy format cannot be empty."))?;

    if proxy.chars().count() > 500 || !is_valid_proxy_format(proxy) {
        return Err(AppError::validation(
            "Invalid proxy format. Use: user:pass@ip:port, ip:port:user:pass, or ip:port (HTTP/SOCKS5).",
        ));
    }

    state.logger.info(format!(
        "Testing proxy latency & connection: {}",
        mask_proxy_string(proxy)
    ));
    let res = run_proxy_test(proxy).await;

    if res.success {
        state.logger.success(format!(
            "Proxy active! Latency: {}ms | IP: {} ({}, {})",
            res.latency.unwrap_or(0),
            res.ip.as_deref().unwrap_or("-"),
            res.country.as_deref().unwrap_or("-"),
            res.isp.as_deref().unwrap_or("-")
        ));
    } else {
        state.logger.warn(format!(
            "Proxy check failed: {}",
            res.message.as_deref().unwrap_or("unknown error")
        ));
    }

    Ok(Json(
        serde_json::to_value(res).unwrap_or_else(|_| json!({ "success": false })),
    ))
}

/// `POST /api/spintax/preview`
pub async fn preview_spintax(
    Json(body): Json<SpintaxPreviewPayload>,
) -> Result<Json<Value>, AppError> {
    let text = body
        .text
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .ok_or_else(|| AppError::validation("Template text cannot be empty."))?;

    if text.chars().count() > 8000 {
        return Err(AppError::validation("Template text max 8000 characters."));
    }

    let count = body.count.unwrap_or(3);
    if !(1..=10).contains(&count) {
        return Err(AppError::validation("count must be between 1 and 10."));
    }

    let previews: Vec<String> = (0..count).map(|_| parse_spintax(text)).collect();
    Ok(Json(json!({
        "success": true,
        "previews": previews,
    })))
}

/// `GET /api/templates`
pub async fn get_templates(State(state): State<Arc<AppState>>) -> Json<Value> {
    Json(json!({
        "success": true,
        "templates": state.db.get_templates(),
    }))
}

/// `POST /api/templates`
pub async fn save_templates(
    State(state): State<Arc<AppState>>,
    Json(body): Json<TemplatesPayload>,
) -> Result<Json<Value>, AppError> {
    if body.templates.len() > 500 {
        return Err(AppError::validation("Maximum 500 templates allowed."));
    }
    let saved = state
        .db
        .save_templates(body.templates)
        .map_err(AppError::Internal)?;
    state.logger.info(format!(
        "Global spintax templates updated ({} entries).",
        saved.len()
    ));
    Ok(Json(json!({
        "success": true,
        "count": saved.len(),
        "templates": saved,
    })))
}

/// `GET /api/comments`
pub async fn get_comments(State(state): State<Arc<AppState>>) -> Json<Value> {
    Json(json!({
        "success": true,
        "comments": state.db.get_templates(),
    }))
}

/// `POST /api/comments`
pub async fn save_comments(
    State(state): State<Arc<AppState>>,
    Json(body): Json<CommentsPayload>,
) -> Result<Json<Value>, AppError> {
    if body.comments.len() > 500 {
        return Err(AppError::validation("Maximum 500 comments allowed."));
    }
    let saved = state
        .db
        .save_templates(body.comments)
        .map_err(AppError::Internal)?;
    state.logger.info(format!(
        "Fallback comments database updated ({} entries).",
        saved.len()
    ));
    Ok(Json(json!({
        "success": true,
        "count": saved.len(),
    })))
}

/// `GET /api/stats`
pub async fn get_stats(State(state): State<Arc<AppState>>) -> Json<Value> {
    Json(json!({
        "success": true,
        "stats": state.db.get_stats(),
    }))
}
