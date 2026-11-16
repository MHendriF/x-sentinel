//! Telegram Bot & Discord Webhook notification dispatcher.

use chrono::{Local, Utc};
use regex::Regex;
use serde::Serialize;
use serde_json::{Value, json};
use std::sync::LazyLock;
use std::time::Duration;
use url::Url;

use crate::domain::models::Settings;

static TELEGRAM_TOKEN_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^[0-9]+:[a-zA-Z0-9_-]+$").expect("valid telegram token regex"));

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WebhookResult {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

pub fn is_valid_telegram_token(token: &str) -> bool {
    TELEGRAM_TOKEN_RE.is_match(token.trim())
}

pub fn is_valid_discord_webhook(webhook_url: &str) -> bool {
    let trimmed = webhook_url.trim();
    let Ok(u) = Url::parse(trimmed) else {
        return false;
    };
    if u.scheme() != "https" {
        return false;
    }
    let host = u.host_str().unwrap_or("").to_ascii_lowercase();
    let is_discord = host == "discord.com"
        || host == "discordapp.com"
        || host.ends_with(".discord.com")
        || host.ends_with(".discordapp.com");
    is_discord && u.path().starts_with("/api/webhooks/")
}

pub async fn send_telegram(bot_token: &str, chat_id: &str, message: &str) -> WebhookResult {
    let clean_token = bot_token.trim();
    let clean_chat = chat_id.trim();
    if clean_token.is_empty() || clean_chat.is_empty() {
        return WebhookResult {
            success: false,
            message: Some("Bot Token & Chat ID are required.".to_string()),
        };
    }
    if !is_valid_telegram_token(clean_token) {
        return WebhookResult {
            success: false,
            message: Some("Invalid Bot Token format.".to_string()),
        };
    }

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .unwrap_or_else(|_| reqwest::Client::new());

    let encoded_token: String = url::form_urlencoded::byte_serialize(clean_token.as_bytes()).collect();
    let url = format!("https://api.telegram.org/bot{encoded_token}/sendMessage");

    match client
        .post(url)
        .json(&json!({
            "chat_id": clean_chat,
            "text": message,
            "parse_mode": "HTML",
            "disable_web_page_preview": false,
        }))
        .send()
        .await
    {
        Ok(resp) => {
            let status = resp.status();
            let body: Value = resp.json().await.unwrap_or(json!({}));
            if status.is_success() && body.get("ok").and_then(Value::as_bool) == Some(true) {
                WebhookResult {
                    success: true,
                    message: None,
                }
            } else {
                let desc = body
                    .get("description")
                    .and_then(Value::as_str)
                    .map(String::from)
                    .unwrap_or_else(|| format!("HTTP {}", status.as_u16()));
                WebhookResult {
                    success: false,
                    message: Some(desc),
                }
            }
        }
        Err(err) => WebhookResult {
            success: false,
            message: Some(err.to_string()),
        },
    }
}

pub async fn send_discord(
    webhook_url: &str,
    title: &str,
    description: &str,
    color: u32,
    fields: Vec<Value>,
) -> WebhookResult {
    let trimmed = webhook_url.trim();
    if trimmed.is_empty() {
        return WebhookResult {
            success: false,
            message: Some("Discord Webhook URL is required.".to_string()),
        };
    }
    if !is_valid_discord_webhook(trimmed) {
        return WebhookResult {
            success: false,
            message: Some("Invalid Discord Webhook domain or endpoint.".to_string()),
        };
    }

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .unwrap_or_else(|_| reqwest::Client::new());

    let time_str = Local::now().format("%H:%M:%S").to_string();
    let payload = json!({
        "username": "X-SENTINEL",
        "embeds": [{
            "title": if title.is_empty() { "X-SENTINEL System Alert" } else { title },
            "description": description,
            "color": color,
            "fields": fields,
            "footer": { "text": format!("X-SENTINEL Core · {time_str}") },
            "timestamp": Utc::now().to_rfc3339(),
        }]
    });

    match client.post(trimmed).json(&payload).send().await {
        Ok(resp) => {
            let status = resp.status();
            if status.is_success() || status.as_u16() == 204 {
                WebhookResult {
                    success: true,
                    message: None,
                }
            } else {
                let text = resp.text().await.unwrap_or_default();
                WebhookResult {
                    success: false,
                    message: Some(if text.is_empty() {
                        format!("HTTP {}", status.as_u16())
                    } else {
                        text
                    }),
                }
            }
        }
        Err(err) => WebhookResult {
            success: false,
            message: Some(err.to_string()),
        },
    }
}

pub async fn test_webhook(
    kind: Option<&str>,
    telegram_bot_token: Option<&str>,
    telegram_chat_id: Option<&str>,
    discord_webhook_url: Option<&str>,
) -> Value {
    match kind {
        Some("telegram") => {
            let res = send_telegram(
                telegram_bot_token.unwrap_or(""),
                telegram_chat_id.unwrap_or(""),
                "<b>X-SENTINEL</b>: Telegram notification connection test passed.",
            )
            .await;
            serde_json::to_value(res).unwrap_or(json!({ "success": false }))
        }
        Some("discord") => {
            let res = send_discord(
                discord_webhook_url.unwrap_or(""),
                "X-SENTINEL Webhook Test",
                "Discord notification connection test passed.",
                0x10b981,
                vec![
                    json!({ "name": "Status", "value": "ONLINE", "inline": true }),
                    json!({ "name": "Platform", "value": "Discord Webhook", "inline": true }),
                ],
            )
            .await;
            serde_json::to_value(res).unwrap_or(json!({ "success": false }))
        }
        _ => {
            let mut results = serde_json::Map::new();
            let mut all_ok = true;

            if let (Some(tok), Some(chat)) = (telegram_bot_token, telegram_chat_id)
                && !tok.trim().is_empty()
                && !chat.trim().is_empty()
            {
                let res = send_telegram(
                    tok,
                    chat,
                    "<b>X-SENTINEL</b>: Telegram notification connection test passed.",
                )
                .await;
                all_ok &= res.success;
                results.insert("telegram".into(), serde_json::to_value(res).unwrap());
            }

            if let Some(url) = discord_webhook_url
                && !url.trim().is_empty()
            {
                let res = send_discord(
                    url,
                    "X-SENTINEL Webhook Test",
                    "Discord notification connection test passed.",
                    0x10b981,
                    vec![],
                )
                .await;
                all_ok &= res.success;
                results.insert("discord".into(), serde_json::to_value(res).unwrap());
            }

            if results.is_empty() {
                json!({
                    "success": false,
                    "message": "Please specify webhook type or provide complete webhook credentials."
                })
            } else {
                json!({
                    "success": all_ok,
                    "results": results,
                })
            }
        }
    }
}

pub async fn notify_event(settings: &Settings, event: &str, data: &Value) {
    if !settings.telegram_enabled && !settings.discord_enabled {
        return;
    }

    let time_str = Local::now().format("%H:%M:%S").to_string();
    let acc_name = data
        .get("accountName")
        .or_else(|| data.get("label"))
        .and_then(Value::as_str)
        .unwrap_or("Node");

    let (tg_msg, dc_title, dc_desc, dc_color, dc_fields) = match event {
        "POST_PUBLISHED" => {
            let text = data.get("text").and_then(Value::as_str).unwrap_or("-");
            let url = data.get("tweetUrl").and_then(Value::as_str);
            let link_line = url.map(|u| format!("Link: {u}\n")).unwrap_or_default();
            (
                format!("<b>X-SENTINEL · Post Published</b>\nAccount: @{acc_name}\nContent: {text}\n{link_line}Time: {time_str}"),
                "New Tweet Post Published".to_string(),
                text.to_string(),
                0x10b981,
                vec![
                    json!({ "name": "Node Account", "value": format!("@{acc_name}"), "inline": true }),
                    json!({ "name": "Status Link", "value": url.map(|u| format!("[View Post]({u})")).unwrap_or_else(|| "-".into()), "inline": true }),
                ],
            )
        }
        "TASK_COMPLETED" => {
            let task_type = data.get("taskType").and_then(Value::as_str).unwrap_or("Batch Engagement");
            let total = data.get("totalTargets").and_then(Value::as_u64).unwrap_or(0);
            (
                format!("<b>X-SENTINEL · Task Completed</b>\nType: {task_type}\nCompleted: {total} items\nTime: {time_str}"),
                "Engagement Task Completed".to_string(),
                format!("Task {task_type} completed."),
                0x10b981,
                vec![
                    json!({ "name": "Task Type", "value": task_type, "inline": true }),
                    json!({ "name": "Total Engagements", "value": total.to_string(), "inline": true }),
                ],
            )
        }
        "TASK_FAILED" => {
            let task_type = data.get("taskType").and_then(Value::as_str).unwrap_or("Engagement");
            let err = data.get("error").and_then(Value::as_str).unwrap_or("System error");
            (
                format!("<b>X-SENTINEL · Task Error</b>\nType: {task_type}\nError: {err}\nTime: {time_str}"),
                "Task Execution Failed".to_string(),
                format!("Task failed: {err}"),
                0xef4444,
                vec![],
            )
        }
        "SESSION_EXPIRED" => (
            format!("<b>X-SENTINEL · Session Expired</b>\nAccount: @{acc_name}\nTime: {time_str}"),
            "Account Session Expired".to_string(),
            format!("Account session for @{acc_name} expired."),
            0xf59e0b,
            vec![],
        ),
        "PROXY_DEAD" => {
            let proxy = data.get("proxy").and_then(Value::as_str).unwrap_or("-");
            (
                format!("<b>X-SENTINEL · Proxy Unreachable</b>\nAccount: @{acc_name}\nProxy: {proxy}\nAction: Node paused\nTime: {time_str}"),
                "Proxy Unreachable Alert".to_string(),
                format!("Proxy for @{acc_name} is offline. Account paused."),
                0xef4444,
                vec![],
            )
        }
        "WARMUP_DAY_COMPLETED" => {
            let day = data.get("day").and_then(Value::as_u64).unwrap_or(1);
            (
                format!("<b>X-SENTINEL · Warmup Completed (Day {day})</b>\nAccount: @{acc_name}\nTime: {time_str}"),
                format!("Warmup Routine Completed (Day {day})"),
                format!("Account @{acc_name} completed warmup for day {day}."),
                0x3b82f6,
                vec![],
            )
        }
        _ => (
            format!("<b>X-SENTINEL Alert</b>\n{data}"),
            "X-SENTINEL Notification".to_string(),
            data.to_string(),
            0x3b82f6,
            vec![],
        ),
    };

    if settings.telegram_enabled
        && !settings.telegram_bot_token.is_empty()
        && !settings.telegram_chat_id.is_empty()
    {
        let _ = send_telegram(&settings.telegram_bot_token, &settings.telegram_chat_id, &tg_msg).await;
    }

    if settings.discord_enabled && !settings.discord_webhook_url.is_empty() {
        let _ = send_discord(
            &settings.discord_webhook_url,
            &dc_title,
            &dc_desc,
            dc_color,
            dc_fields,
        )
        .await;
    }
}
