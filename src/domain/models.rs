//! Data models preserving 100% JSON compatibility with `data/*.json`.

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value, json};
use std::collections::HashMap;

fn default_true() -> bool {
    true
}

fn default_one() -> u32 {
    1
}

fn default_empty_object() -> Value {
    json!({})
}

fn default_label() -> String {
    "Account X".to_string()
}

fn default_engine() -> String {
    "chromium".to_string()
}

fn default_ai_provider() -> String {
    "none".to_string()
}

fn default_ai_prompt() -> String {
    "Write a sharp, authentic, and context-aware 1-sentence English reply as a crypto/tech native. Be insightful, peer-to-peer, and zero generic praise.".to_string()
}

pub fn default_nine_router_models() -> Vec<String> {
    vec![
        "openai/gpt-4o-mini".to_string(),
        "deepseek/deepseek-chat".to_string(),
        "anthropic/claude-3.5-sonnet".to_string(),
        "meta-llama/llama-3.3-70b-instruct".to_string(),
    ]
}

pub fn default_templates() -> Vec<String> {
    vec![
        "{Keren banget|Mantap sekali|Insightful banget} {infonya|pembahasannya|tweetnya} {bang|kak|gan}! 🔥 {Izin bookmark ya|Ditunggu update selanjutnya|Bermanfaat banget}.".to_string(),
        "{Setuju banget|Sepakat|Benar sekali} dengan poin ini. {Sangat menginspirasi|Membuka wawasan|Top markotop} 👍".to_string(),
        "{Wah gokil|Menarik banget|Keren nih}, {makasih sudah sharing|makasih infonya ya|semoga makin sukses} {kak|bang|mas}! 🚀".to_string(),
    ]
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AccountStats {
    #[serde(default)]
    pub likes: u64,
    #[serde(default)]
    pub retweets: u64,
    #[serde(default)]
    pub comments: u64,
    #[serde(default)]
    pub posts: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Account {
    pub id: String,
    #[serde(default = "default_label")]
    pub label: String,
    #[serde(rename = "auth_token", default)]
    pub auth_token: String,
    #[serde(default)]
    pub ct0: String,
    #[serde(default)]
    pub username: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub avatar: String,
    #[serde(default)]
    pub proxy: String,
    #[serde(default)]
    pub comments_file: String,
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default)]
    pub is_valid: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub health_status: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub health_message: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_checked_at: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_checked: Option<String>,
    #[serde(default = "default_true")]
    pub warmup_mode: bool,
    #[serde(default = "default_one")]
    pub warmup_day: u32,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_warmup_at: Option<String>,
    #[serde(default)]
    pub stats: AccountStats,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub camoufox_profile: Option<Value>,
    #[serde(default = "default_empty_object")]
    pub state: Value,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub disabled_until: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub disabled_reason: Option<String>,
    #[serde(flatten)]
    pub extra: HashMap<String, Value>,
}

impl Default for Account {
    fn default() -> Self {
        Self {
            id: String::new(),
            label: default_label(),
            auth_token: String::new(),
            ct0: String::new(),
            username: String::new(),
            name: String::new(),
            avatar: String::new(),
            proxy: String::new(),
            comments_file: String::new(),
            enabled: true,
            is_valid: false,
            health_status: None,
            health_message: None,
            last_checked_at: None,
            last_checked: None,
            warmup_mode: true,
            warmup_day: 1,
            last_warmup_at: None,
            stats: AccountStats::default(),
            camoufox_profile: None,
            state: default_empty_object(),
            disabled_until: None,
            disabled_reason: None,
            extra: HashMap::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    #[serde(default = "default_min_delay")]
    pub min_delay_seconds: u64,
    #[serde(default = "default_max_delay")]
    pub max_delay_seconds: u64,
    #[serde(default = "default_switch_delay")]
    pub account_switch_delay_sec: u64,
    #[serde(default = "default_hourly_limit")]
    pub hourly_limit: u64,
    #[serde(default = "default_daily_limit")]
    pub daily_limit: u64,
    #[serde(default)]
    pub headless: bool,
    #[serde(default = "default_typing_delay")]
    pub human_typing_delay_ms: u64,
    #[serde(default = "default_true")]
    pub scroll_before_action: bool,
    #[serde(default)]
    pub enforce_warmup_gate: bool,
    #[serde(default)]
    pub cross_node_target_lock: bool,
    #[serde(default = "default_engine")]
    pub browser_engine: String,
    #[serde(default = "default_ai_provider")]
    pub ai_provider: String,
    #[serde(default)]
    pub ai_api_key: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ai_model: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ai_base_url: Option<String>,
    #[serde(default = "default_ai_prompt")]
    pub ai_prompt: String,
    #[serde(default)]
    pub telegram_enabled: bool,
    #[serde(default)]
    pub telegram_bot_token: String,
    #[serde(default)]
    pub telegram_chat_id: String,
    #[serde(default)]
    pub discord_enabled: bool,
    #[serde(default)]
    pub discord_webhook_url: String,
    #[serde(default = "default_true")]
    pub notify_on_task_complete: bool,
    #[serde(default = "default_true")]
    pub notify_on_rate_limit: bool,
    #[serde(default = "default_true")]
    pub notify_on_session_expire: bool,
    #[serde(default = "default_nine_router_models")]
    pub nine_router_models: Vec<String>,
    #[serde(flatten)]
    pub extra: HashMap<String, Value>,
}

fn default_min_delay() -> u64 {
    15
}
fn default_max_delay() -> u64 {
    40
}
fn default_switch_delay() -> u64 {
    10
}
fn default_hourly_limit() -> u64 {
    25
}
fn default_daily_limit() -> u64 {
    150
}
fn default_typing_delay() -> u64 {
    65
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            min_delay_seconds: default_min_delay(),
            max_delay_seconds: default_max_delay(),
            account_switch_delay_sec: default_switch_delay(),
            hourly_limit: default_hourly_limit(),
            daily_limit: default_daily_limit(),
            headless: false,
            human_typing_delay_ms: default_typing_delay(),
            scroll_before_action: true,
            enforce_warmup_gate: false,
            cross_node_target_lock: false,
            browser_engine: default_engine(),
            ai_provider: default_ai_provider(),
            ai_api_key: String::new(),
            ai_model: None,
            ai_base_url: None,
            ai_prompt: default_ai_prompt(),
            telegram_enabled: false,
            telegram_bot_token: String::new(),
            telegram_chat_id: String::new(),
            discord_enabled: false,
            discord_webhook_url: String::new(),
            notify_on_task_complete: true,
            notify_on_rate_limit: true,
            notify_on_session_expire: true,
            nine_router_models: default_nine_router_models(),
            extra: HashMap::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Stats {
    #[serde(default)]
    pub total_likes: u64,
    #[serde(default)]
    pub total_retweets: u64,
    #[serde(default)]
    pub total_comments: u64,
    #[serde(default)]
    pub total_posts: u64,
    #[serde(default)]
    pub today_likes: u64,
    #[serde(default)]
    pub today_retweets: u64,
    #[serde(default)]
    pub today_comments: u64,
    #[serde(default)]
    pub today_posts: u64,
    #[serde(default)]
    pub last_reset_date: String,
}

impl Default for Stats {
    fn default() -> Self {
        Self {
            total_likes: 0,
            total_retweets: 0,
            total_comments: 0,
            total_posts: 0,
            today_likes: 0,
            today_retweets: 0,
            today_comments: 0,
            today_posts: 0,
            last_reset_date: chrono::Utc::now().format("%Y-%m-%d").to_string(),
        }
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryItem {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub timestamp: String,
    #[serde(default)]
    pub time_formatted: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub account_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub account_name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub account_label: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tweet_url: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tweet_id: Option<String>,
    #[serde(default)]
    pub action: String,
    #[serde(default)]
    pub status: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub details: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub engine: Option<String>,
    #[serde(rename = "browser_engine", default, skip_serializing_if = "Option::is_none")]
    pub browser_engine: Option<String>,
    #[serde(flatten)]
    pub extra: HashMap<String, Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScheduleItem {
    pub id: String,
    #[serde(rename = "type", default = "default_schedule_type")]
    pub schedule_type: String,
    #[serde(default)]
    pub title: String,
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default = "default_pending")]
    pub status: String,
    #[serde(default)]
    pub scheduled_at: String,
    #[serde(default = "default_interval")]
    pub interval_minutes: u64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_run_at: Option<String>,
    #[serde(default = "default_all_val")]
    pub account_ids: Value,
    #[serde(default)]
    pub posts: Vec<String>,
    #[serde(default)]
    pub urls: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub like: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub retweet: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub comment: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub comment_text: Option<String>,
    #[serde(default)]
    pub media_paths: Vec<String>,
    #[serde(default = "default_min_delay")]
    pub delay_seconds: u64,
    #[serde(default)]
    pub keywords: Vec<String>,
    #[serde(default = "default_vectors")]
    pub vectors: Vec<String>,
    #[serde(default = "default_max_tweets")]
    pub max_tweets: u32,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub updated_at: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub executed_at: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_message: Option<String>,
    #[serde(flatten)]
    pub extra: HashMap<String, Value>,
}

fn default_schedule_type() -> String {
    "POST_QUEUE".to_string()
}
fn default_pending() -> String {
    "PENDING".to_string()
}
fn default_interval() -> u64 {
    60
}
fn default_all_val() -> Value {
    Value::String("all".to_string())
}
fn default_vectors() -> Vec<String> {
    vec![
        "LIKE".to_string(),
        "RETWEET".to_string(),
        "COMMENT".to_string(),
    ]
}
fn default_max_tweets() -> u32 {
    3
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthConfig {
    pub username: String,
    pub password_hash: Option<String>,
    pub session_epoch: u64,
    pub totp_enabled: bool,
    pub totp_secret: Option<String>,
    pub updated_at: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LegacyAuth {
    #[serde(default)]
    pub auth_token: String,
    #[serde(default)]
    pub ct0: String,
    #[serde(default)]
    pub username: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub avatar: String,
    #[serde(default)]
    pub is_valid: bool,
    #[serde(default)]
    pub last_checked: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogEntry {
    pub id: String,
    pub timestamp: String,
    pub level: String,
    pub message: String,
    #[serde(default)]
    pub meta: Map<String, Value>,
}
