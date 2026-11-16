//! Askama SSR pages, HTMX partial endpoints, and interactive SVG view models.

use askama::Template;
use axum::Json;
use axum::body::Bytes;
use axum::extract::{Path, Query, State};
use axum::http::{HeaderValue, StatusCode, header};
use axum::response::{Html, IntoResponse, Response};
use chrono::{DateTime, Utc};
use regex::Regex;
use serde::Deserialize;
use serde_json::{Value, json};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::sync::{Arc, LazyLock};
use sysinfo::{Pid, ProcessesToUpdate, System};

use crate::auth::AuthService;
use crate::bot_bridge::protocol::TaskStatusSnapshot;
use crate::db::{sanitize_id, write_json_atomic};
use crate::domain::ai_service::{
    self, AiOverrides, generate_payload_replies_from_post, generate_post_from_keyword,
};
use crate::domain::analytics::{AnalyticsViewData, compute_analytics};
use crate::domain::models::{Account, HistoryItem, ScheduleItem, Settings};
use crate::domain::proxy::is_valid_proxy_format;
use crate::domain::spintax::parse_spintax;
use crate::domain::tweet_extractor::{fetch_tweet_content, is_tweet_url};
use crate::error::AppError;
use crate::security::{
    mask_proxy_string, mask_secret, resolve_proxy_string, resolve_secret, restore_masked_settings,
};
use crate::state::AppState;

static TWEET_URL_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)^https?://(?:www\.)?(?:twitter\.com|x\.com)/[a-zA-Z0-9_]+/status/\d+")
        .expect("valid tweet regex")
});

fn parse_form_map(bytes: &Bytes) -> (HashMap<String, String>, HashMap<String, Vec<String>>) {
    let mut single = HashMap::new();
    let mut multi: HashMap<String, Vec<String>> = HashMap::new();
    for (k, v) in url::form_urlencoded::parse(bytes) {
        let key = k.into_owned();
        let val = v.into_owned();
        single.insert(key.clone(), val.clone());
        multi.entry(key).or_default().push(val);
    }
    (single, multi)
}

fn form_bool(map: &HashMap<String, String>, key: &str) -> bool {
    matches!(
        map.get(key).map(|s| s.trim().to_ascii_lowercase()).as_deref(),
        Some("true" | "1" | "on" | "yes")
    )
}

fn form_u64(map: &HashMap<String, String>, key: &str, default: u64, min: u64, max: u64) -> u64 {
    map.get(key)
        .and_then(|s| s.trim().parse::<u64>().ok())
        .map(|n| n.clamp(min, max))
        .unwrap_or(default)
}

fn render_tpl<T: Template>(tpl: T) -> Result<String, AppError> {
    tpl.render().map_err(|e| AppError::Internal(e.to_string()))
}

fn tab_title(tab: &str) -> &'static str {
    match tab {
        "accounts" => "Nodes & proxy",
        "composer" => "Post studio",
        "batch" => "Target workbench",
        "hunter" => "Feed hunter",
        "analytics" => "Analytics",
        "ai" => "AI providers",
        "spintax" => "Payload bank",
        "safety" => "Defense protocol",
        "history" => "Audit ledger",
        "about" => "About & specs",
        _ => "X-SENTINEL",
    }
}

#[derive(Clone)]
pub struct RibbonView {
    pub active_tab: String,
    pub tab_title: String,
    pub engine_label: String,
    pub today_likes: u64,
    pub today_retweets: u64,
    pub today_comments: u64,
    pub today_posts: u64,
    pub is_running: bool,
    pub is_paused: bool,
    pub task_state_text: String,
    pub task_progress_label: String,
    pub task_percent: u64,
}

async fn build_ribbon(state: &AppState, tab: &str) -> RibbonView {
    let settings = state.db.get_settings();
    let stats = state.db.get_stats();
    let ts: TaskStatusSnapshot = state.bot.get_task_status().await;

    let engine_label = if settings.browser_engine.eq_ignore_ascii_case("camoufox") {
        "Camoufox engine".to_string()
    } else {
        "Chromium engine".to_string()
    };

    let completed = ts
        .current_task
        .as_ref()
        .and_then(|v| v.get("completed").and_then(Value::as_u64))
        .unwrap_or(0);
    let total = ts
        .current_task
        .as_ref()
        .and_then(|v| v.get("total").and_then(Value::as_u64))
        .unwrap_or(0);
    let current_node = ts
        .current_task
        .as_ref()
        .and_then(|v| v.get("currentNode").and_then(Value::as_str))
        .unwrap_or("");
    let task_type = ts
        .current_task
        .as_ref()
        .and_then(|v| v.get("type").and_then(Value::as_str))
        .unwrap_or("TASK");

    let task_state_text = if ts.is_paused {
        "Paused".to_string()
    } else if ts.is_running {
        format!("Running {task_type}")
    } else {
        "Idle".to_string()
    };

    let task_progress_label = if !current_node.is_empty() {
        format!("{completed}/{total} · {current_node}")
    } else {
        format!("{completed}/{total}")
    };

    let task_percent = if total > 0 {
        ((completed * 100) / total).min(100)
    } else {
        0
    };

    RibbonView {
        active_tab: tab.to_string(),
        tab_title: tab_title(tab).to_string(),
        engine_label,
        today_likes: stats.today_likes,
        today_retweets: stats.today_retweets,
        today_comments: stats.today_comments,
        today_posts: stats.today_posts,
        is_running: ts.is_running,
        is_paused: ts.is_paused,
        task_state_text,
        task_progress_label,
        task_percent,
    }
}

#[derive(Template)]
#[template(path = "partials/toast.html")]
struct ToastOobTemplate {
    toast_kind: String,
    toast_message: String,
}

#[derive(Template)]
#[template(path = "partials/telemetry_ribbon.html")]
struct RibbonPartialTemplate {
    ribbon: RibbonView,
}

fn oob_toast_html(kind: &str, msg: &str) -> String {
    render_tpl(ToastOobTemplate {
        toast_kind: kind.to_string(),
        toast_message: msg.to_string(),
    })
    .unwrap_or_default()
}

fn oob_ribbon_html(ribbon: &RibbonView) -> String {
    let raw = render_tpl(RibbonPartialTemplate {
        ribbon: ribbon.clone(),
    })
    .unwrap_or_default();
    raw.replacen(
        "<header id=\"telemetry-ribbon\"",
        "<header id=\"telemetry-ribbon\" hx-swap-oob=\"outerHTML\"",
        1,
    )
}

#[derive(Template)]
#[template(path = "layouts/cockpit.html")]
struct CockpitTemplate {
    version: String,
    active_nodes: usize,
    total_nodes: usize,
    ribbon: RibbonView,
    tab_html: String,
}

#[derive(Template)]
#[template(path = "pages/login.html")]
struct LoginTemplate {
    version: String,
    total_nodes: usize,
}

#[derive(Template)]
#[template(path = "pages/not_found.html")]
struct NotFoundTemplate {}

#[derive(Clone)]
pub struct NodeView {
    pub id: String,
    pub label: String,
    pub username: String,
    pub avatar: String,
    pub initial: String,
    pub enabled: bool,
    pub masked_proxy: String,
    pub warmup_label: String,
    pub camoufox_label: String,
    pub total_actions: u64,
    pub likes: u64,
    pub retweets: u64,
    pub comments: u64,
    pub posts: u64,
    pub health_message: String,
    pub status_label: String,
    pub status_pill_class: String,
    pub status_dot_class: String,
}

fn build_node_view(state: &AppState, acc: &Account) -> NodeView {
    let initial = acc
        .label
        .chars()
        .next()
        .or_else(|| acc.username.chars().next())
        .unwrap_or('X')
        .to_ascii_uppercase()
        .to_string();

    let masked_proxy = if acc.proxy.trim().is_empty() {
        "Direct connection".to_string()
    } else {
        mask_proxy_string(&acc.proxy)
    };

    let warmup_label = if acc.warmup_mode {
        format!("Day {}/7", acc.warmup_day.max(1))
    } else {
        "Graduated".to_string()
    };

    let cf_dir = state.config.camoufox_profiles_dir.join(sanitize_id(&acc.id));
    let camoufox_label = if cf_dir.exists() {
        "Profile saved".to_string()
    } else {
        "None".to_string()
    };

    let now_ms = Utc::now().timestamp_millis();
    let in_cooldown = acc.disabled_until.is_some_and(|until| until > now_ms);

    let (status_label, status_pill_class, status_dot_class) = if !acc.enabled {
        ("Paused", "pill", "dot")
    } else if in_cooldown {
        ("Cooldown", "pill pill--warn", "dot dot--warn")
    } else if acc.health_status.as_deref() == Some("EXPIRED")
        || (!acc.is_valid && acc.health_status.is_some())
    {
        ("Expired", "pill pill--err", "dot dot--err")
    } else if acc.is_valid {
        ("Healthy", "pill pill--ok", "dot dot--ok")
    } else {
        ("Unchecked", "pill", "dot")
    };

    NodeView {
        id: acc.id.clone(),
        label: acc.label.clone(),
        username: acc.username.clone(),
        avatar: acc.avatar.clone(),
        initial,
        enabled: acc.enabled,
        masked_proxy,
        warmup_label,
        camoufox_label,
        total_actions: acc.stats.likes + acc.stats.retweets + acc.stats.comments + acc.stats.posts,
        likes: acc.stats.likes,
        retweets: acc.stats.retweets,
        comments: acc.stats.comments,
        posts: acc.stats.posts,
        health_message: acc.health_message.clone().unwrap_or_default(),
        status_label: status_label.to_string(),
        status_pill_class: status_pill_class.to_string(),
        status_dot_class: status_dot_class.to_string(),
    }
}

fn filter_nodes(state: &AppState, q: &str, status: &str) -> Vec<NodeView> {
    let query = q.trim().to_ascii_lowercase();
    let st_filter = status.trim().to_ascii_lowercase();

    state
        .db
        .get_accounts()
        .iter()
        .map(|a| build_node_view(state, a))
        .filter(|n| {
            if !query.is_empty() {
                let hay = format!("{} {} {}", n.label, n.username, n.masked_proxy).to_ascii_lowercase();
                if !hay.contains(&query) {
                    return false;
                }
            }
            match st_filter.as_str() {
                "healthy" => n.status_label == "Healthy",
                "paused" => n.status_label == "Paused",
                "expired" => n.status_label == "Expired",
                "cooldown" => n.status_label == "Cooldown",
                _ => true,
            }
        })
        .collect()
}

#[derive(Clone)]
pub struct ScheduleView {
    pub id: String,
    pub title: String,
    pub schedule_type: String,
    pub timing_label: String,
    pub status_label: String,
    pub status_pill_class: String,
    pub enabled: bool,
}

fn build_schedules_view(items: Vec<ScheduleItem>, only_type: Option<&str>) -> Vec<ScheduleView> {
    items
        .into_iter()
        .filter(|s| only_type.is_none_or(|t| s.schedule_type == t))
        .map(|s| {
            let timing_label = if s.schedule_type == "RECURRING_HUNTER" {
                format!("Every {}m", s.interval_minutes)
            } else {
                s.scheduled_at.clone()
            };
            let pill = if !s.enabled {
                "pill"
            } else if s.status == "COMPLETED" {
                "pill pill--ok"
            } else if s.status == "FAILED" {
                "pill pill--err"
            } else {
                "pill pill--info"
            };
            ScheduleView {
                id: s.id,
                title: s.title,
                schedule_type: s.schedule_type,
                timing_label,
                status_label: if s.enabled { s.status } else { "PAUSED".to_string() },
                status_pill_class: pill.to_string(),
                enabled: s.enabled,
            }
        })
        .collect()
}

#[derive(Clone)]
pub struct AccountOption {
    pub id: String,
    pub label: String,
    pub username: String,
}

fn account_options(state: &AppState) -> (Vec<AccountOption>, usize) {
    let accounts = state.db.get_accounts();
    let active = accounts.iter().filter(|a| a.enabled).count();
    let opts = accounts
        .into_iter()
        .map(|a| AccountOption {
            id: a.id,
            label: a.label,
            username: a.username,
        })
        .collect();
    (opts, active)
}

#[derive(Template)]
#[template(path = "pages/tabs/accounts.html")]
struct AccountsTabTemplate {
    nodes: Vec<NodeView>,
    query: String,
    status: String,
    view_mode: String,
}

#[derive(Template)]
#[template(path = "partials/nodes_list.html")]
struct NodesListTemplate {
    nodes: Vec<NodeView>,
    view_mode: String,
}

#[derive(Template)]
#[template(path = "partials/node_modal.html")]
struct NodeModalTemplate {
    is_edit: bool,
    id: String,
    label: String,
    auth_token: String,
    ct0: String,
    proxy: String,
}

#[derive(Template)]
#[template(path = "partials/bulk_import_modal.html")]
struct BulkImportModalTemplate {}

#[derive(Template)]
#[template(path = "partials/node_comments_modal.html")]
struct NodeCommentsModalTemplate {
    id: String,
    label: String,
    comments_file: String,
    comments_text: String,
    count: usize,
}

#[derive(Template)]
#[template(path = "pages/tabs/composer.html")]
struct ComposerTabTemplate {
    accounts: Vec<AccountOption>,
    active_nodes: usize,
    post_schedules_count: usize,
    schedules: Vec<ScheduleView>,
}

#[derive(Template)]
#[template(path = "partials/composer_drafts.html")]
struct ComposerDraftsTemplate {
    drafts: Vec<String>,
}

#[derive(Template)]
#[template(path = "partials/schedules_list.html")]
struct SchedulesListTemplate {
    schedules: Vec<ScheduleView>,
}

#[derive(Template)]
#[template(path = "partials/task_monitor.html")]
struct TaskMonitorTemplate {
    task_status: TaskStatusSnapshot,
    completed: u64,
    total: u64,
    percent: u64,
    summary_text: String,
}

#[derive(Template)]
#[template(path = "pages/tabs/batch.html")]
struct BatchTabTemplate {
    accounts: Vec<AccountOption>,
    active_nodes: usize,
    settings: Settings,
    task_status: TaskStatusSnapshot,
    completed: u64,
    total: u64,
    percent: u64,
    summary_text: String,
}

#[derive(Clone)]
pub struct LeadView {
    pub time_formatted: String,
    pub node_label: String,
    pub action: String,
    pub tweet_url: String,
    pub message: String,
}

#[derive(Template)]
#[template(path = "pages/tabs/hunter.html")]
struct HunterTabTemplate {
    accounts: Vec<AccountOption>,
    active_nodes: usize,
    hunter_schedules: Vec<ScheduleView>,
    leads: Vec<LeadView>,
}

#[derive(Template)]
#[template(path = "pages/tabs/analytics.html")]
struct AnalyticsTabTemplate {
    view: AnalyticsViewData,
    accounts: Vec<AccountOption>,
}

#[derive(Template)]
#[template(path = "partials/analytics_body.html")]
struct AnalyticsBodyTemplate {
    view: AnalyticsViewData,
}

#[derive(Template)]
#[template(path = "pages/tabs/ai.html")]
struct AiTabTemplate {
    settings: Settings,
    ai_model: String,
    masked_api_key: String,
    ai_base_url: String,
    nine_router_models_text: String,
}

#[derive(Template)]
#[template(path = "partials/alert_slot.html")]
struct AlertSlotTemplate {
    alert_class: String,
    title: String,
    message: String,
}

#[derive(Clone)]
pub struct VaultFileView {
    pub filename: String,
    pub size_bytes: u64,
    pub modified_at: String,
}

#[derive(Template)]
#[template(path = "partials/spintax_vault_list.html")]
struct SpintaxVaultListTemplate {
    files: Vec<VaultFileView>,
}

#[derive(Template)]
#[template(path = "partials/payload_replies_list.html")]
struct PayloadRepliesListTemplate {
    replies: Vec<String>,
    accounts: Vec<AccountOption>,
}

#[derive(Template)]
#[template(path = "partials/vault_inspect_modal.html")]
struct VaultInspectModalTemplate {
    filename: String,
    comments: Vec<String>,
}

#[derive(Template)]
#[template(path = "pages/tabs/spintax.html")]
struct SpintaxTabTemplate {
    files: Vec<VaultFileView>,
    templates: Vec<String>,
    templates_text: String,
}

#[derive(Template)]
#[template(path = "pages/tabs/safety.html")]
struct SafetyTabTemplate {
    settings: Settings,
    masked_tg_token: String,
    masked_discord_url: String,
    active_locks: usize,
    auth_username: String,
    totp_enabled: bool,
}

#[derive(Template)]
#[template(path = "partials/totp_setup_card.html")]
struct TotpSetupCardTemplate {
    secret: String,
    qr_svg: String,
}

#[derive(Clone)]
pub struct AuditRowView {
    pub id: String,
    pub time_label: String,
    pub node_label: String,
    pub action: String,
    pub engine: String,
    pub status: String,
    pub status_pill_class: String,
    pub target_short: String,
}

#[derive(Clone)]
pub struct AuditDetailView {
    pub id: String,
    pub timestamp: String,
    pub node_label: String,
    pub action: String,
    pub engine: String,
    pub status: String,
    pub status_pill_class: String,
    pub tweet_url: String,
    pub message: String,
    pub details: String,
}

#[derive(Clone)]
pub struct LogFileUiView {
    pub name: String,
    pub size_bytes: u64,
    pub date_param: String,
}

#[derive(Template)]
#[template(path = "partials/audit_table.html")]
struct AuditTableTemplate {
    rows: Vec<AuditRowView>,
}

#[derive(Template)]
#[template(path = "partials/audit_detail_modal.html")]
struct AuditDetailModalTemplate {
    item: AuditDetailView,
}

#[derive(Template)]
#[template(path = "pages/tabs/history.html")]
struct HistoryTabTemplate {
    total_count: usize,
    ok_count: usize,
    failed_count: usize,
    success_rate: u64,
    rows: Vec<AuditRowView>,
    log_files: Vec<LogFileUiView>,
    q: String,
}

#[derive(Clone)]
pub struct PillarView {
    pub name: String,
    pub passed: bool,
    pub status: String,
    pub message: String,
}

#[derive(Template)]
#[template(path = "partials/diagnostics_modal.html")]
struct DiagnosticsModalTemplate {
    score: u64,
    total_pillars: usize,
    passed_pillars: usize,
    pillars: Vec<PillarView>,
    timestamp: String,
}

#[derive(Template)]
#[template(path = "pages/tabs/about.html")]
struct AboutTabTemplate {
    version: String,
    port: u16,
    active_nodes: usize,
    total_nodes: usize,
    browser_engine: String,
    ai_provider: String,
    uptime_secs: u64,
    pid: u32,
    rss_mb: String,
    platform: String,
    arch: String,
    accounts_kb: u64,
    history_kb: u64,
    history_count: usize,
}

fn list_vault_files(state: &AppState) -> Vec<VaultFileView> {
    let Ok(entries) = fs::read_dir(&state.db.comments_dir) else {
        return Vec::new();
    };
    let mut list: Vec<VaultFileView> = entries
        .flatten()
        .filter_map(|e| {
            let name = e.file_name().to_string_lossy().to_string();
            if !name.to_ascii_lowercase().ends_with(".json") {
                return None;
            }
            let meta = e.metadata().ok()?;
            let modified_at = meta
                .modified()
                .ok()
                .map(|t| {
                    chrono::DateTime::<Utc>::from(t)
                        .format("%Y-%m-%d %H:%M")
                        .to_string()
                })
                .unwrap_or_default();
            Some(VaultFileView {
                filename: name,
                size_bytes: meta.len(),
                modified_at,
            })
        })
        .collect();
    list.sort_by(|a, b| a.filename.cmp(&b.filename));
    list
}

fn build_audit_rows(
    history: &[HistoryItem],
    q: &str,
    action: &str,
    status: &str,
    limit: usize,
) -> Vec<AuditRowView> {
    let ql = q.trim().to_ascii_lowercase();
    history
        .iter()
        .filter(|h| {
            if action != "ALL" && h.action != action {
                return false;
            }
            if status != "ALL" && h.status != status {
                return false;
            }
            if !ql.is_empty() {
                let hay = format!(
                    "{} {} {} {} {}",
                    h.account_label.as_deref().unwrap_or(""),
                    h.account_name.as_deref().unwrap_or(""),
                    h.tweet_url.as_deref().unwrap_or(""),
                    h.message.as_deref().unwrap_or(""),
                    h.details.as_deref().unwrap_or(""),
                )
                .to_ascii_lowercase();
                if !hay.contains(&ql) {
                    return false;
                }
            }
            true
        })
        .take(limit)
        .map(|h| {
            let node_label = h
                .account_label
                .as_deref()
                .filter(|s| !s.is_empty())
                .or(h.account_name.as_deref())
                .unwrap_or("System")
                .to_string();
            let engine = h
                .browser_engine
                .as_deref()
                .or(h.engine.as_deref())
                .unwrap_or("chromium")
                .to_string();
            let pill = match h.status.as_str() {
                "SUCCESS" => "pill--ok",
                "FAILED" => "pill--err",
                "ALREADY_DONE" => "pill--warn",
                _ => "pill--info",
            };
            let url = h.tweet_url.as_deref().unwrap_or("");
            let target_short = if url.is_empty() {
                h.message.as_deref().unwrap_or("-").chars().take(48).collect()
            } else {
                url.chars().take(48).collect()
            };
            AuditRowView {
                id: h.id.clone(),
                time_label: if h.time_formatted.is_empty() {
                    h.timestamp.clone()
                } else {
                    h.time_formatted.clone()
                },
                node_label,
                action: h.action.clone(),
                engine,
                status: h.status.clone(),
                status_pill_class: pill.to_string(),
                target_short,
            }
        })
        .collect()
}

async fn render_tab_html(state: &AppState, tab: &str) -> Result<String, AppError> {
    match tab {
        "accounts" => {
            let nodes = filter_nodes(state, "", "all");
            render_tpl(AccountsTabTemplate {
                nodes,
                query: String::new(),
                status: "all".to_string(),
                view_mode: "grid".to_string(),
            })
        }
        "composer" => {
            let (accounts, active_nodes) = account_options(state);
            let schedules = build_schedules_view(state.db.get_schedules(), None);
            let post_schedules_count = schedules
                .iter()
                .filter(|s| s.schedule_type == "POST_QUEUE")
                .count();
            render_tpl(ComposerTabTemplate {
                accounts,
                active_nodes,
                post_schedules_count,
                schedules,
            })
        }
        "batch" => {
            let (accounts, active_nodes) = account_options(state);
            let settings = state.db.get_settings();
            let ts = state.bot.get_task_status().await;
            let completed = ts
                .current_task
                .as_ref()
                .and_then(|v| v.get("completed").and_then(Value::as_u64))
                .unwrap_or(0);
            let total = ts
                .current_task
                .as_ref()
                .and_then(|v| v.get("total").and_then(Value::as_u64))
                .unwrap_or(0);
            let percent = if total > 0 {
                ((completed * 100) / total).min(100)
            } else {
                0
            };
            let summary_text = if ts.is_running {
                "Task active in worker subprocess.".to_string()
            } else {
                "Worker idle. Start a batch engagement or radar sweep to monitor progress.".to_string()
            };
            render_tpl(BatchTabTemplate {
                accounts,
                active_nodes,
                settings,
                task_status: ts,
                completed,
                total,
                percent,
                summary_text,
            })
        }
        "hunter" => {
            let (accounts, active_nodes) = account_options(state);
            let hunter_schedules =
                build_schedules_view(state.db.get_schedules(), Some("RECURRING_HUNTER"));
            let leads = state
                .db
                .get_history(50)
                .into_iter()
                .take(25)
                .map(|h| LeadView {
                    time_formatted: h.time_formatted,
                    node_label: h
                        .account_label
                        .or(h.account_name)
                        .unwrap_or_else(|| "System".to_string()),
                    action: h.action,
                    tweet_url: h.tweet_url.unwrap_or_default(),
                    message: h.message.unwrap_or_default(),
                })
                .collect();
            render_tpl(HunterTabTemplate {
                accounts,
                active_nodes,
                hunter_schedules,
                leads,
            })
        }
        "analytics" => {
            let (accounts_opts, _) = account_options(state);
            let accounts = state.db.get_accounts();
            let stats = state.db.get_stats();
            let history = state.db.get_history(5000);
            let view = compute_analytics(&history, &stats, &accounts, "7d", "all");
            render_tpl(AnalyticsTabTemplate {
                view,
                accounts: accounts_opts,
            })
        }
        "ai" => {
            let settings = state.db.get_settings();
            let masked_api_key = mask_secret(&settings.ai_api_key);
            let ai_model = settings.ai_model.clone().unwrap_or_default();
            let ai_base_url = settings.ai_base_url.clone().unwrap_or_default();
            let nine_router_models_text = settings.nine_router_models.join("\n");
            render_tpl(AiTabTemplate {
                settings,
                ai_model,
                masked_api_key,
                ai_base_url,
                nine_router_models_text,
            })
        }
        "spintax" => {
            let files = list_vault_files(state);
            let templates = state.db.get_templates();
            let templates_text = templates.join("\n");
            render_tpl(SpintaxTabTemplate {
                files,
                templates,
                templates_text,
            })
        }
        "safety" => {
            let settings = state.db.get_settings();
            let masked_tg_token = mask_secret(&settings.telegram_bot_token);
            let masked_discord_url = mask_secret(&settings.discord_webhook_url);
            let active_locks = state.target_lock.snapshot().total_locks;
            let auth_cfg = state.auth.get_auth_config();
            render_tpl(SafetyTabTemplate {
                settings,
                masked_tg_token,
                masked_discord_url,
                active_locks,
                auth_username: auth_cfg.username,
                totp_enabled: auth_cfg.totp_enabled,
            })
        }
        "history" => {
            let history = state.db.get_history(1000);
            let total_count = history.len();
            let ok_count = history.iter().filter(|h| h.status == "SUCCESS").count();
            let failed_count = history.iter().filter(|h| h.status == "FAILED").count();
            let attempts = ok_count + failed_count;
            let success_rate = if attempts > 0 {
                ((ok_count * 100) / attempts) as u64
            } else {
                100
            };
            let rows = build_audit_rows(&history, "", "ALL", "ALL", 100);
            let log_files = state
                .logger
                .get_available_log_files()
                .into_iter()
                .map(|lf| {
                    let date_param = lf
                        .name
                        .strip_prefix("x-sentinel-")
                        .and_then(|s| s.strip_suffix(".log"))
                        .unwrap_or("")
                        .to_string();
                    LogFileUiView {
                        name: lf.name,
                        size_bytes: lf.size_bytes,
                        date_param,
                    }
                })
                .collect();
            render_tpl(HistoryTabTemplate {
                total_count,
                ok_count,
                failed_count,
                success_rate,
                rows,
                log_files,
                q: String::new(),
            })
        }
        "about" => {
            let accounts = state.db.get_accounts();
            let active_nodes = accounts.iter().filter(|a| a.enabled).count();
            let settings = state.db.get_settings();
            let history = state.db.get_history(10_000);
            let pid = std::process::id();
            let mut sys = System::new();
            let sys_pid = Pid::from_u32(pid);
            sys.refresh_processes(ProcessesToUpdate::Some(&[sys_pid]), true);
            let rss = sys.process(sys_pid).map(|p| p.memory()).unwrap_or(0);
            let rss_mb = format!("{:.1}", (rss as f64) / (1024.0 * 1024.0));
            let accounts_kb =
                fs::metadata(state.db.accounts_file_path()).map(|m| m.len()).unwrap_or(0) / 1024;
            let history_kb =
                fs::metadata(state.db.history_file_path()).map(|m| m.len()).unwrap_or(0) / 1024;
            render_tpl(AboutTabTemplate {
                version: state.config.version.clone(),
                port: state.config.port,
                active_nodes,
                total_nodes: accounts.len(),
                browser_engine: if settings.browser_engine.is_empty() {
                    "chromium".to_string()
                } else {
                    settings.browser_engine
                },
                ai_provider: if settings.ai_provider.is_empty() {
                    "none".to_string()
                } else {
                    settings.ai_provider
                },
                uptime_secs: state.started_at.elapsed().as_secs(),
                pid,
                rss_mb,
                platform: std::env::consts::OS.to_string(),
                arch: std::env::consts::ARCH.to_string(),
                accounts_kb,
                history_kb,
                history_count: history.len(),
            })
        }
        _ => Err(AppError::not_found("NOT_FOUND", "Unknown tab view.")),
    }
}

pub async fn healthz() -> impl IntoResponse {
    (StatusCode::OK, Json(json!({ "ok": true, "engine": "axum" })))
}

pub async fn index_page(State(state): State<Arc<AppState>>) -> Result<Html<String>, AppError> {
    render_cockpit_for_tab(state, "accounts".to_string()).await
}

pub async fn tab_page(
    State(state): State<Arc<AppState>>,
    Path(tab): Path<String>,
) -> Result<Response, AppError> {
    if matches!(
        tab.as_str(),
        "accounts"
            | "composer"
            | "batch"
            | "hunter"
            | "analytics"
            | "ai"
            | "spintax"
            | "safety"
            | "history"
            | "about"
    ) {
        Ok(render_cockpit_for_tab(state, tab).await?.into_response())
    } else {
        Ok((
            StatusCode::NOT_FOUND,
            Html(render_tpl(NotFoundTemplate {})?),
        )
            .into_response())
    }
}

async fn render_cockpit_for_tab(
    state: Arc<AppState>,
    tab: String,
) -> Result<Html<String>, AppError> {
    let tab_html = render_tab_html(&state, &tab).await?;
    let ribbon = build_ribbon(&state, &tab).await;
    let accounts = state.db.get_accounts();
    let total_nodes = accounts.len();
    let active_nodes = accounts.iter().filter(|a| a.enabled).count();
    let html = render_tpl(CockpitTemplate {
        version: state.config.version.clone(),
        active_nodes,
        total_nodes,
        ribbon,
        tab_html,
    })?;
    Ok(Html(html))
}

pub async fn login_page(State(state): State<Arc<AppState>>) -> Result<Html<String>, AppError> {
    let total_nodes = state.db.get_accounts().len();
    Ok(Html(render_tpl(LoginTemplate {
        version: state.config.version.clone(),
        total_nodes,
    })?))
}

pub async fn fallback_not_found() -> Result<Response, AppError> {
    Ok((
        StatusCode::NOT_FOUND,
        Html(render_tpl(NotFoundTemplate {})?),
    )
        .into_response())
}

// ---------- HTMX Tab & Ribbon Partials ----------

pub async fn partial_tab(
    State(state): State<Arc<AppState>>,
    Path(tab): Path<String>,
) -> Result<Html<String>, AppError> {
    let mut html = render_tab_html(&state, &tab).await?;
    let ribbon = build_ribbon(&state, &tab).await;
    html.push_str(&oob_ribbon_html(&ribbon));
    Ok(Html(html))
}

#[derive(Debug, Deserialize)]
pub struct TabQuery {
    pub tab: Option<String>,
}

pub async fn partial_task_ribbon(
    State(state): State<Arc<AppState>>,
    Query(q): Query<TabQuery>,
) -> Result<Html<String>, AppError> {
    let tab = q.tab.as_deref().unwrap_or("accounts");
    let ribbon = build_ribbon(&state, tab).await;
    Ok(Html(render_tpl(RibbonPartialTemplate { ribbon })?))
}

pub async fn partial_task_monitor(State(state): State<Arc<AppState>>) -> Result<Html<String>, AppError> {
    let ts = state.bot.get_task_status().await;
    let completed = ts
        .current_task
        .as_ref()
        .and_then(|v| v.get("completed").and_then(Value::as_u64))
        .unwrap_or(0);
    let total = ts
        .current_task
        .as_ref()
        .and_then(|v| v.get("total").and_then(Value::as_u64))
        .unwrap_or(0);
    let percent = if total > 0 {
        ((completed * 100) / total).min(100)
    } else {
        0
    };
    let summary_text = if ts.is_running {
        "Task active in worker subprocess.".to_string()
    } else {
        "Worker idle.".to_string()
    };
    Ok(Html(render_tpl(TaskMonitorTemplate {
        task_status: ts,
        completed,
        total,
        percent,
        summary_text,
    })?))
}

// ---------- Accounts HTMX Partials ----------

#[derive(Debug, Deserialize)]
pub struct NodesFilterQuery {
    pub q: Option<String>,
    pub status: Option<String>,
    pub view: Option<String>,
}

pub async fn partial_nodes_list(
    State(state): State<Arc<AppState>>,
    Query(q): Query<NodesFilterQuery>,
) -> Result<Html<String>, AppError> {
    let nodes = filter_nodes(
        &state,
        q.q.as_deref().unwrap_or(""),
        q.status.as_deref().unwrap_or("all"),
    );
    let view_mode = q.view.as_deref().unwrap_or("grid").to_string();
    Ok(Html(render_tpl(NodesListTemplate { nodes, view_mode })?))
}

pub async fn partial_node_modal(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Html<String>, AppError> {
    if id == "new" {
        return Ok(Html(render_tpl(NodeModalTemplate {
            is_edit: false,
            id: String::new(),
            label: String::new(),
            auth_token: String::new(),
            ct0: String::new(),
            proxy: String::new(),
        })?));
    }

    let acc = state
        .db
        .get_account_by_id(&id)
        .ok_or_else(|| AppError::not_found("NOT_FOUND", "Account not found."))?;
    Ok(Html(render_tpl(NodeModalTemplate {
        is_edit: true,
        id: acc.id,
        label: acc.label,
        auth_token: mask_secret(&acc.auth_token),
        ct0: mask_secret(&acc.ct0),
        proxy: mask_proxy_string(&acc.proxy),
    })?))
}

pub async fn partial_bulk_import_modal() -> Result<Html<String>, AppError> {
    Ok(Html(render_tpl(BulkImportModalTemplate {})?))
}

pub async fn partial_comments_modal(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Html<String>, AppError> {
    let acc = state
        .db
        .get_account_by_id(&id)
        .ok_or_else(|| AppError::not_found("NOT_FOUND", "Account not found."))?;
    let comments = state.db.get_account_comments(&id);
    Ok(Html(render_tpl(NodeCommentsModalTemplate {
        id: acc.id,
        label: acc.label,
        comments_file: acc.comments_file,
        count: comments.len(),
        comments_text: comments.join("\n"),
    })?))
}

pub async fn partial_save_account_comments(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    body: Bytes,
) -> Result<Html<String>, AppError> {
    let (fields, _) = parse_form_map(&body);
    let raw = fields.get("comments_text").map(String::as_str).unwrap_or("");
    let comments: Vec<String> = raw
        .lines()
        .map(|l| l.trim().to_string())
        .filter(|l| !l.is_empty())
        .collect();
    state
        .db
        .save_account_comments(&id, comments)
        .map_err(|e| AppError::validation(e).with_htmx(true))?;
    let mut html = String::new();
    html.push_str(&oob_toast_html("ok", "Per-node reply templates saved."));
    Ok(Html(html))
}

pub async fn partial_create_account(
    State(state): State<Arc<AppState>>,
    body: Bytes,
) -> Result<Html<String>, AppError> {
    let (fields, _) = parse_form_map(&body);
    let auth_token = fields.get("auth_token").map(|s| s.trim()).unwrap_or("");
    if auth_token.len() < 10 {
        return Err(AppError::validation("auth_token must be at least 10 characters.").with_htmx(true));
    }
    let proxy = fields.get("proxy").map(|s| s.trim()).unwrap_or("");
    if !proxy.is_empty() && !is_valid_proxy_format(proxy) {
        return Err(AppError::validation(
            "Invalid proxy tunnel format. Use user:pass@ip:port, ip:port:user:pass, or ip:port.",
        )
        .with_htmx(true));
    }

    let acc = Account {
        id: String::new(),
        label: fields
            .get("label")
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| "Account X".to_string()),
        auth_token: auth_token.to_string(),
        ct0: fields.get("ct0").map(|s| s.trim().to_string()).unwrap_or_default(),
        proxy: proxy.to_string(),
        enabled: true,
        ..Default::default()
    };

    let saved = state
        .db
        .save_account(acc, None)
        .map_err(|e| AppError::validation(e).with_htmx(true))?;
    state
        .logger
        .info(format!("Node created: {} ({})", saved.label, saved.id));

    let nodes = filter_nodes(&state, "", "all");
    let mut html = render_tpl(NodesListTemplate {
        nodes,
        view_mode: "grid".to_string(),
    })?;
    html.push_str("<div id=\"modal-portal\" hx-swap-oob=\"innerHTML\"></div>");
    html.push_str(&oob_toast_html("ok", &format!("Node {} created.", saved.label)));
    Ok(Html(html))
}

pub async fn partial_update_account(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    body: Bytes,
) -> Result<Html<String>, AppError> {
    let mut existing = state
        .db
        .get_account_by_id(&id)
        .ok_or_else(|| AppError::not_found("NOT_FOUND", "Account not found.").with_htmx(true))?;
    let (fields, _) = parse_form_map(&body);

    if let Some(label) = fields.get("label").map(|s| s.trim()).filter(|s| !s.is_empty()) {
        existing.label = label.to_string();
    }
    if let Some(tok) = fields.get("auth_token") {
        let resolved = resolve_secret(tok, &existing.auth_token);
        if resolved.len() < 10 {
            return Err(AppError::validation("auth_token must be at least 10 characters.").with_htmx(true));
        }
        existing.auth_token = resolved;
    }
    if let Some(ct0) = fields.get("ct0") {
        existing.ct0 = resolve_secret(ct0, &existing.ct0);
    }
    if let Some(proxy) = fields.get("proxy") {
        let resolved = resolve_proxy_string(&existing.proxy, proxy);
        if !resolved.is_empty() && !is_valid_proxy_format(&resolved) {
            return Err(AppError::validation("Invalid proxy tunnel format.").with_htmx(true));
        }
        existing.proxy = resolved;
    }

    let saved = state
        .db
        .save_account(existing, None)
        .map_err(|e| AppError::validation(e).with_htmx(true))?;
    let nodes = filter_nodes(&state, "", "all");
    let mut html = render_tpl(NodesListTemplate {
        nodes,
        view_mode: "grid".to_string(),
    })?;
    html.push_str("<div id=\"modal-portal\" hx-swap-oob=\"innerHTML\"></div>");
    html.push_str(&oob_toast_html("ok", &format!("Node {} updated.", saved.label)));
    Ok(Html(html))
}

pub async fn partial_bulk_import_accounts(
    State(state): State<Arc<AppState>>,
    body: Bytes,
) -> Result<Html<String>, AppError> {
    let (fields, _) = parse_form_map(&body);
    let raw_text = fields.get("raw_text").map(String::as_str).unwrap_or("");
    let added = state
        .db
        .bulk_import_accounts(raw_text)
        .map_err(|e| AppError::validation(e).with_htmx(true))?;

    let nodes = filter_nodes(&state, "", "all");
    let mut html = render_tpl(NodesListTemplate {
        nodes,
        view_mode: "grid".to_string(),
    })?;
    html.push_str("<div id=\"modal-portal\" hx-swap-oob=\"innerHTML\"></div>");
    html.push_str(&oob_toast_html(
        "ok",
        &format!("Imported {} node(s).", added.len()),
    ));
    Ok(Html(html))
}

pub async fn partial_toggle_account(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Html<String>, AppError> {
    let updated = state
        .db
        .toggle_account(&id)
        .map_err(AppError::Internal)?
        .ok_or_else(|| AppError::not_found("NOT_FOUND", "Account not found."))?;
    let nodes = filter_nodes(&state, "", "all");
    let mut html = render_tpl(NodesListTemplate {
        nodes,
        view_mode: "grid".to_string(),
    })?;
    html.push_str(&oob_toast_html(
        "info",
        &format!(
            "Node {} {}.",
            updated.label,
            if updated.enabled { "enabled" } else { "paused" }
        ),
    ));
    Ok(Html(html))
}

pub async fn partial_delete_account(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Html<String>, AppError> {
    let _ = state.db.delete_account(&id).map_err(AppError::Internal)?;
    let nodes = filter_nodes(&state, "", "all");
    let mut html = render_tpl(NodesListTemplate {
        nodes,
        view_mode: "grid".to_string(),
    })?;
    html.push_str(&oob_toast_html("ok", "Node deleted."));
    Ok(Html(html))
}

pub async fn partial_batch_toggle_accounts(
    State(state): State<Arc<AppState>>,
    body: Bytes,
) -> Result<Html<String>, AppError> {
    let (fields, _) = parse_form_map(&body);
    let enabled = form_bool(&fields, "enabled");
    let ids: Vec<String> = fields
        .get("ids")
        .map(|s| s.split(',').map(|x| x.trim().to_string()).filter(|x| !x.is_empty()).collect())
        .unwrap_or_default();

    let mut accounts = state.db.get_accounts();
    let mut count = 0usize;
    for acc in &mut accounts {
        if ids.contains(&acc.id) {
            acc.enabled = enabled;
            count += 1;
        }
    }
    state
        .db
        .save_accounts_vec(accounts)
        .map_err(AppError::Internal)?;

    let nodes = filter_nodes(&state, "", "all");
    let mut html = render_tpl(NodesListTemplate {
        nodes,
        view_mode: "grid".to_string(),
    })?;
    html.push_str(&oob_toast_html(
        "ok",
        &format!(
            "{} {} node(s).",
            if enabled { "Enabled" } else { "Paused" },
            count
        ),
    ));
    Ok(Html(html))
}

pub async fn partial_batch_delete_accounts(
    State(state): State<Arc<AppState>>,
    body: Bytes,
) -> Result<Html<String>, AppError> {
    let (fields, _) = parse_form_map(&body);
    let ids: HashSet<String> = fields
        .get("ids")
        .map(|s| s.split(',').map(|x| x.trim().to_string()).filter(|x| !x.is_empty()).collect())
        .unwrap_or_default();
    let mut accounts = state.db.get_accounts();
    let before = accounts.len();
    accounts.retain(|a| !ids.contains(&a.id));
    let deleted = before.saturating_sub(accounts.len());
    state
        .db
        .save_accounts_vec(accounts)
        .map_err(AppError::Internal)?;

    let nodes = filter_nodes(&state, "", "all");
    let mut html = render_tpl(NodesListTemplate {
        nodes,
        view_mode: "grid".to_string(),
    })?;
    html.push_str(&oob_toast_html(
        "ok",
        &format!("Deleted {deleted} node(s)."),
    ));
    Ok(Html(html))
}

pub async fn partial_check_account_health(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Html<String>, AppError> {
    let _ = state
        .bot
        .call("check_account_health", json!({ "accountId": id }))
        .await
        .map_err(|e| AppError::Internal(e).with_htmx(true))?;
    state.db.reload_runtime_files();
    let nodes = filter_nodes(&state, "", "all");
    let mut html = render_tpl(NodesListTemplate {
        nodes,
        view_mode: "grid".to_string(),
    })?;
    html.push_str(&oob_toast_html("ok", "Account health check finished."));
    Ok(Html(html))
}

pub async fn partial_check_fleet_health(
    State(state): State<Arc<AppState>>,
) -> Result<Html<String>, AppError> {
    let _ = state
        .bot
        .call("check_fleet_health", json!({}))
        .await
        .map_err(|e| AppError::Internal(e).with_htmx(true))?;
    state.db.reload_runtime_files();
    let nodes = filter_nodes(&state, "", "all");
    let mut html = render_tpl(NodesListTemplate {
        nodes,
        view_mode: "grid".to_string(),
    })?;
    html.push_str(&oob_toast_html("ok", "Fleet health check finished."));
    Ok(Html(html))
}

pub async fn partial_test_proxies(
    State(state): State<Arc<AppState>>,
) -> Result<Html<String>, AppError> {
    let accounts = state.db.get_accounts();
    let mut ok_count = 0usize;
    let mut total_tested = 0usize;
    for acc in &accounts {
        if !acc.proxy.trim().is_empty() {
            total_tested += 1;
            let res = crate::domain::proxy::test_proxy(&acc.proxy).await;
            if res.success {
                ok_count += 1;
            }
        }
    }
    let nodes = filter_nodes(&state, "", "all");
    let mut html = render_tpl(NodesListTemplate {
        nodes,
        view_mode: "grid".to_string(),
    })?;
    html.push_str(&oob_toast_html(
        "info",
        &format!("Proxy sweep complete: {ok_count}/{total_tested} active."),
    ));
    Ok(Html(html))
}

pub async fn partial_start_warmup(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Html<String>, AppError> {
    let _ = state
        .bot
        .call("run_warmup", json!({ "accountId": id }))
        .await
        .map_err(|e| AppError::Internal(e).with_htmx(true))?;
    state.db.reload_runtime_files();
    let nodes = filter_nodes(&state, "", "all");
    let mut html = render_tpl(NodesListTemplate {
        nodes,
        view_mode: "grid".to_string(),
    })?;
    html.push_str(&oob_toast_html("ok", "Warmup session started."));
    Ok(Html(html))
}

pub async fn partial_camoufox_login(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Html<String>, AppError> {
    let _ = state
        .bot
        .call("camoufox_login", json!({ "accountId": id }))
        .await
        .map_err(|e| AppError::Internal(e).with_htmx(true))?;
    Ok(Html(oob_toast_html(
        "info",
        "Camoufox login browser launched on host.",
    )))
}

// ---------- Composer & Schedules Partials ----------

pub async fn partial_composer_generate(
    State(state): State<Arc<AppState>>,
    body: Bytes,
) -> Result<Html<String>, AppError> {
    let (fields, _) = parse_form_map(&body);
    let keyword = fields.get("keyword").map(|s| s.trim()).unwrap_or("");
    if keyword.is_empty() {
        return Err(AppError::validation("Keyword cannot be empty.").with_htmx(true));
    }
    let style = fields.get("style").map(String::as_str).unwrap_or("Viral Hook & Debate");
    let language = fields.get("language").map(String::as_str).unwrap_or("en");
    let count = fields
        .get("count")
        .and_then(|s| s.parse::<usize>().ok())
        .unwrap_or(3)
        .clamp(1, 5);

    let settings = state.db.get_settings();
    let res = generate_post_from_keyword(
        &settings,
        keyword,
        style,
        language,
        count,
        "",
        &AiOverrides::default(),
    )
    .await;

    Ok(Html(render_tpl(ComposerDraftsTemplate {
        drafts: res.posts,
    })?))
}

pub async fn partial_composer_dispatch(
    State(state): State<Arc<AppState>>,
    body: Bytes,
) -> Result<Html<String>, AppError> {
    let (fields, _) = parse_form_map(&body);
    let post_text = fields
        .get("post_text")
        .map(|s| s.trim().to_string())
        .unwrap_or_default();
    if post_text.is_empty() {
        return Err(AppError::validation("Post content is required.").with_htmx(true));
    }

    let account_ids = match fields.get("account_ids").map(|s| s.trim()) {
        Some("all") | None | Some("") => Value::String("all".to_string()),
        Some(single_id) => Value::Array(vec![Value::String(single_id.to_string())]),
    };

    let media_paths: Vec<String> = fields
        .get("media_paths_csv")
        .map(|s| s.lines().map(|l| l.trim().to_string()).filter(|l| !l.is_empty()).collect())
        .unwrap_or_default();

    let delay_seconds = form_u64(&fields, "delay_seconds", 15, 0, 3600);
    let scheduled_at = fields
        .get("scheduled_at")
        .map(|s| s.trim())
        .filter(|s| !s.is_empty());

    if let Some(sched_raw) = scheduled_at {
        let iso = chrono::NaiveDateTime::parse_from_str(sched_raw, "%Y-%m-%dT%H:%M")
            .map(|n| DateTime::<Utc>::from_naive_utc_and_offset(n, Utc).to_rfc3339())
            .unwrap_or_else(|_| sched_raw.to_string());

        let item = ScheduleItem {
            id: String::new(),
            schedule_type: "POST_QUEUE".to_string(),
            title: post_text.chars().take(48).collect(),
            enabled: true,
            status: "PENDING".to_string(),
            scheduled_at: iso,
            interval_minutes: 60,
            last_run_at: None,
            account_ids,
            posts: vec![post_text],
            urls: Vec::new(),
            like: None,
            retweet: None,
            comment: None,
            comment_text: None,
            media_paths,
            delay_seconds,
            keywords: Vec::new(),
            vectors: Vec::new(),
            max_tweets: 3,
            created_at: String::new(),
            updated_at: String::new(),
            executed_at: None,
            last_message: None,
            extra: HashMap::new(),
        };
        let saved = state.db.save_schedule(item).map_err(AppError::Internal)?;
        let ribbon = build_ribbon(&state, "composer").await;
        return Ok(Html(format!(
            "{}{}",
            oob_toast_html("ok", &format!("Post scheduled: {}", saved.title)),
            oob_ribbon_html(&ribbon)
        )));
    }

    let payload = json!({
        "accountIds": account_ids,
        "posts": [post_text],
        "options": {
            "mediaPaths": media_paths,
            "delaySeconds": delay_seconds,
        }
    });
    state.bot.set_running_state(true, Some(json!({ "type": "MULTI_POST" }))).await;
    let bot = Arc::clone(&state.bot);
    let logger = Arc::clone(&state.logger);
    tokio::spawn(async move {
        if let Err(err) = bot.call("run_post_task", payload).await {
            logger.error(format!("Post task failed: {err}"));
        }
        bot.set_running_state(false, None).await;
    });

    let ribbon = build_ribbon(&state, "composer").await;
    Ok(Html(format!(
        "{}{}",
        oob_toast_html("ok", "Post dispatch started across selected node(s)."),
        oob_ribbon_html(&ribbon)
    )))
}

pub async fn partial_schedules_list(
    State(state): State<Arc<AppState>>,
) -> Result<Html<String>, AppError> {
    let schedules = build_schedules_view(state.db.get_schedules(), None);
    Ok(Html(render_tpl(SchedulesListTemplate { schedules })?))
}

pub async fn partial_toggle_schedule(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Html<String>, AppError> {
    let _ = state
        .db
        .toggle_schedule(&id, None)
        .map_err(AppError::Internal)?;
    let schedules = build_schedules_view(state.db.get_schedules(), None);
    let mut html = render_tpl(SchedulesListTemplate { schedules })?;
    html.push_str(&oob_toast_html("info", "Schedule updated."));
    Ok(Html(html))
}

pub async fn partial_delete_schedule(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Html<String>, AppError> {
    let _ = state.db.delete_schedule(&id).map_err(AppError::Internal)?;
    let schedules = build_schedules_view(state.db.get_schedules(), None);
    let mut html = render_tpl(SchedulesListTemplate { schedules })?;
    html.push_str(&oob_toast_html("ok", "Schedule deleted."));
    Ok(Html(html))
}

// ---------- Batch, Hunter & Task Control Partials ----------

pub async fn partial_start_batch(
    State(state): State<Arc<AppState>>,
    body: Bytes,
) -> Result<Html<String>, AppError> {
    let (fields, _) = parse_form_map(&body);
    let urls: Vec<String> = fields
        .get("urls_text")
        .map(|s| {
            s.lines()
                .map(|l| l.trim().to_string())
                .filter(|l| TWEET_URL_RE.is_match(l))
                .collect()
        })
        .unwrap_or_default();
    if urls.is_empty() {
        return Err(
            AppError::validation("Enter at least one valid https://x.com/.../status/<id> URL.")
                .with_htmx(true),
        );
    }

    let account_ids = match fields.get("account_ids").map(|s| s.trim()) {
        Some("all") | Some("healthy") | None | Some("") => Value::String("all".to_string()),
        Some(id) => Value::Array(vec![Value::String(id.to_string())]),
    };

    let reply_mode = fields.get("reply_mode").map(String::as_str).unwrap_or("node");
    let comment_text = match reply_mode {
        "spintax" => fields.get("spintax_text").cloned().unwrap_or_default(),
        "custom" => fields.get("comment_text").cloned().unwrap_or_default(),
        _ => String::new(),
    };

    let payload = json!({
        "accountIds": account_ids,
        "urls": urls,
        "options": {
            "like": form_bool(&fields, "like"),
            "retweet": form_bool(&fields, "retweet"),
            "comment": form_bool(&fields, "comment"),
            "commentText": comment_text,
            "minDelay": form_u64(&fields, "min_delay", 15, 0, 3600),
            "maxDelay": form_u64(&fields, "max_delay", 40, 1, 7200),
            "crossNodeTargetLock": form_bool(&fields, "cross_node_target_lock"),
        }
    });

    state.bot.set_running_state(true, Some(json!({ "type": "MULTI_BATCH" }))).await;
    let bot = Arc::clone(&state.bot);
    let logger = Arc::clone(&state.logger);
    tokio::spawn(async move {
        if let Err(err) = bot.call("run_batch_task", payload).await {
            logger.error(format!("Batch task failed: {err}"));
        }
        bot.set_running_state(false, None).await;
    });

    let ribbon = build_ribbon(&state, "batch").await;
    Ok(Html(format!(
        "{}{}",
        oob_toast_html("ok", "Batch engagement task started."),
        oob_ribbon_html(&ribbon)
    )))
}

pub async fn partial_start_hunter(
    State(state): State<Arc<AppState>>,
    body: Bytes,
) -> Result<Html<String>, AppError> {
    let (fields, _) = parse_form_map(&body);
    let keyword = fields
        .get("effective_query")
        .filter(|q| !q.starts_with("Enter keyword"))
        .or_else(|| fields.get("keyword"))
        .map(|s| s.trim().to_string())
        .unwrap_or_default();
    if keyword.is_empty() {
        return Err(AppError::validation("Search keyword is required.").with_htmx(true));
    }

    let account_ids = match fields.get("account_ids").map(|s| s.trim()) {
        Some("all") | None | Some("") => Value::String("all".to_string()),
        Some(id) => Value::Array(vec![Value::String(id.to_string())]),
    };

    let mode = fields.get("mode").map(String::as_str).unwrap_or("run");
    let count = form_u64(&fields, "count", 5, 1, 50) as u32;
    let like = form_bool(&fields, "like");
    let retweet = form_bool(&fields, "retweet");
    let comment = form_bool(&fields, "comment");

    if mode == "schedule" {
        let interval = form_u64(&fields, "interval_minutes", 60, 1, 10080);
        let title = fields
            .get("title")
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| format!("Radar: {keyword}"));
        let mut vectors = Vec::new();
        if like {
            vectors.push("LIKE".to_string());
        }
        if retweet {
            vectors.push("RETWEET".to_string());
        }
        if comment {
            vectors.push("COMMENT".to_string());
        }
        let item = ScheduleItem {
            id: String::new(),
            schedule_type: "RECURRING_HUNTER".to_string(),
            title: title.clone(),
            enabled: true,
            status: "PENDING".to_string(),
            scheduled_at: String::new(),
            interval_minutes: interval,
            last_run_at: None,
            account_ids,
            posts: Vec::new(),
            urls: Vec::new(),
            like: Some(like),
            retweet: Some(retweet),
            comment: Some(comment),
            comment_text: None,
            media_paths: Vec::new(),
            delay_seconds: 15,
            keywords: vec![keyword],
            vectors,
            max_tweets: count,
            created_at: String::new(),
            updated_at: String::new(),
            executed_at: None,
            last_message: None,
            extra: HashMap::new(),
        };
        let _ = state.db.save_schedule(item).map_err(AppError::Internal)?;
        return Ok(Html(oob_toast_html(
            "ok",
            &format!("Recurring station \"{title}\" saved ({interval}m interval)."),
        )));
    }

    let payload = json!({
        "accountIds": account_ids,
        "keyword": keyword,
        "count": count,
        "options": {
            "like": like,
            "retweet": retweet,
            "comment": comment,
        }
    });
    state.bot.set_running_state(true, Some(json!({ "type": "HUNTER" }))).await;
    let bot = Arc::clone(&state.bot);
    let logger = Arc::clone(&state.logger);
    tokio::spawn(async move {
        if let Err(err) = bot.call("run_hunter_task", payload).await {
            logger.error(format!("Feed hunter failed: {err}"));
        }
        bot.set_running_state(false, None).await;
    });

    let ribbon = build_ribbon(&state, "hunter").await;
    Ok(Html(format!(
        "{}{}",
        oob_toast_html("ok", "Feed hunter radar sweep started."),
        oob_ribbon_html(&ribbon)
    )))
}

pub async fn partial_pause_task(
    State(state): State<Arc<AppState>>,
    Query(q): Query<TabQuery>,
) -> Result<Html<String>, AppError> {
    let _ = state.bot.pause("Manual operator pause").await;
    let tab = q.tab.as_deref().unwrap_or("batch");
    let ribbon = build_ribbon(&state, tab).await;
    Ok(Html(format!(
        "{}{}",
        oob_toast_html("warn", "Task paused."),
        oob_ribbon_html(&ribbon)
    )))
}

pub async fn partial_resume_task(
    State(state): State<Arc<AppState>>,
    Query(q): Query<TabQuery>,
) -> Result<Html<String>, AppError> {
    let _ = state.bot.resume().await;
    let tab = q.tab.as_deref().unwrap_or("batch");
    let ribbon = build_ribbon(&state, tab).await;
    Ok(Html(format!(
        "{}{}",
        oob_toast_html("ok", "Task resumed."),
        oob_ribbon_html(&ribbon)
    )))
}

pub async fn partial_stop_task(
    State(state): State<Arc<AppState>>,
    Query(q): Query<TabQuery>,
) -> Result<Html<String>, AppError> {
    let _ = state.bot.stop().await;
    let tab = q.tab.as_deref().unwrap_or("batch");
    let ribbon = build_ribbon(&state, tab).await;
    Ok(Html(format!(
        "{}{}",
        oob_toast_html("warn", "Stop signal sent to worker."),
        oob_ribbon_html(&ribbon)
    )))
}

pub async fn partial_clear_locks(State(state): State<Arc<AppState>>) -> Result<Html<String>, AppError> {
    let cleared = state.target_lock.clear();
    Ok(Html(oob_toast_html(
        "ok",
        &format!("Cleared {cleared} active target lock(s)."),
    )))
}

// ---------- Analytics Partial ----------

#[derive(Debug, Deserialize)]
pub struct AnalyticsQuery {
    pub timeframe: Option<String>,
    pub node: Option<String>,
}

pub async fn partial_analytics_body(
    State(state): State<Arc<AppState>>,
    Query(q): Query<AnalyticsQuery>,
) -> Result<Html<String>, AppError> {
    let tf = q.timeframe.as_deref().unwrap_or("7d");
    let node = q.node.as_deref().unwrap_or("all");
    let accounts = state.db.get_accounts();
    let stats = state.db.get_stats();
    let history = state.db.get_history(5000);
    let view = compute_analytics(&history, &stats, &accounts, tf, node);
    Ok(Html(render_tpl(AnalyticsBodyTemplate { view })?))
}

// ---------- AI & Spintax Partials ----------

pub async fn partial_save_ai_settings(
    State(state): State<Arc<AppState>>,
    body: Bytes,
) -> Result<Html<String>, AppError> {
    let (fields, _) = parse_form_map(&body);
    let current = state.db.get_settings();
    let mut next = current.clone();

    if let Some(p) = fields.get("ai_provider") {
        next.ai_provider = p.trim().to_string();
    }
    if let Some(k) = fields.get("ai_api_key") {
        next.ai_api_key = k.trim().to_string();
    }
    if let Some(m) = fields.get("ai_model") {
        next.ai_model = Some(m.trim().to_string()).filter(|s| !s.is_empty());
    }
    if let Some(b) = fields.get("ai_base_url") {
        next.ai_base_url = Some(b.trim().to_string()).filter(|s| !s.is_empty());
    }
    if let Some(prompt) = fields.get("ai_prompt") {
        next.ai_prompt = prompt.trim().to_string();
    }
    if let Some(models_raw) = fields.get("nine_router_models_text") {
        let mut seen = HashSet::new();
        let mut deduped = Vec::new();
        for line in models_raw.lines() {
            let trimmed = line.trim().to_string();
            if !trimmed.is_empty() && seen.insert(trimmed.clone()) {
                deduped.push(trimmed);
            }
        }
        if !deduped.is_empty() {
            next.nine_router_models = deduped;
        }
    }

    let restored = restore_masked_settings(next, &current);
    state.db.save_settings(restored).map_err(AppError::Internal)?;

    Ok(Html(render_tpl(AlertSlotTemplate {
        alert_class: "alert--ok".to_string(),
        title: "Settings saved".to_string(),
        message: "AI provider configuration written atomically to data/settings.json.".to_string(),
    })?))
}

pub async fn partial_test_ai_connection(
    State(state): State<Arc<AppState>>,
    body: Bytes,
) -> Result<Html<String>, AppError> {
    let (fields, _) = parse_form_map(&body);
    let stored = state.db.get_settings();
    let overrides = AiOverrides {
        ai_provider: fields.get("ai_provider").cloned(),
        ai_api_key: fields
            .get("ai_api_key")
            .filter(|k| !k.contains("••••"))
            .cloned(),
        ai_model: fields.get("ai_model").filter(|s| !s.is_empty()).cloned(),
        ai_base_url: fields.get("ai_base_url").filter(|s| !s.is_empty()).cloned(),
        ai_prompt: None,
    };
    let res = ai_service::test_connection(&stored, &overrides).await;
    Ok(Html(render_tpl(AlertSlotTemplate {
        alert_class: if res.success { "alert--ok" } else { "alert--err" }.to_string(),
        title: if res.success {
            format!("Connected ({})", res.provider.unwrap_or_default())
        } else {
            "Connection check failed".to_string()
        },
        message: res.sample_output.unwrap_or(res.message),
    })?))
}

pub async fn partial_ai_sandbox(
    State(state): State<Arc<AppState>>,
    body: Bytes,
) -> Result<Html<String>, AppError> {
    let (fields, _) = parse_form_map(&body);
    let tweet_text = fields.get("tweet_text").map(|s| s.trim()).unwrap_or("");
    if tweet_text.is_empty() {
        return Err(AppError::validation("Sample tweet text is required.").with_htmx(true));
    }
    let stored = state.db.get_settings();
    let reply = ai_service::generate_contextual_reply(tweet_text, &stored, &AiOverrides::default()).await;
    Ok(Html(render_tpl(AlertSlotTemplate {
        alert_class: if reply.is_some() { "alert--ok" } else { "alert--warn" }.to_string(),
        title: if reply.is_some() {
            "Sample reply output".to_string()
        } else {
            "No AI output rendered".to_string()
        },
        message: reply.unwrap_or_else(|| {
            "Provider returned empty response. Check API key or switch to Spintax fallback.".to_string()
        }),
    })?))
}

pub async fn partial_spintax_fetch_tweet(body: Bytes) -> Result<Html<String>, AppError> {
    let (fields, _) = parse_form_map(&body);
    let url = fields.get("url").map(|s| s.trim()).unwrap_or("");
    if !is_tweet_url(url) {
        return Err(AppError::validation("Enter a valid https://x.com/.../status/<id> URL.").with_htmx(true));
    }
    let extracted = fetch_tweet_content(url).await;
    let text = extracted
        .text
        .filter(|t| !t.trim().is_empty())
        .ok_or_else(|| {
            AppError::validation("Could not extract tweet copy from FxTwitter/VxTwitter.")
                .with_htmx(true)
        })?;
    let safe_text = text
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;");
    Ok(Html(format!(
        r#"<div id="payload-source-slot" class="field"><label for="payload-post-text" class="field-label">Reference post content</label><textarea id="payload-post-text" name="post_text" class="textarea" required>{safe_text}</textarea></div>{}"#,
        oob_toast_html("ok", "Tweet text fetched successfully.")
    )))
}

pub async fn partial_spintax_generate(
    State(state): State<Arc<AppState>>,
    body: Bytes,
) -> Result<Html<String>, AppError> {
    let (fields, _) = parse_form_map(&body);
    let post_text = fields.get("post_text").map(|s| s.trim()).unwrap_or("");
    if post_text.is_empty() {
        return Err(AppError::validation("Reference post text is required.").with_htmx(true));
    }
    let count = form_u64(&fields, "count", 5, 1, 50) as usize;
    let tone = fields.get("tone").map(String::as_str).unwrap_or("Insightful & Friendly");
    let lang = fields.get("language").map(String::as_str).unwrap_or("en");

    let settings = state.db.get_settings();
    let res = generate_payload_replies_from_post(
        &settings,
        post_text,
        count,
        tone,
        lang,
        "",
        &AiOverrides::default(),
    )
    .await;
    let (accounts, _) = account_options(&state);

    Ok(Html(render_tpl(PayloadRepliesListTemplate {
        replies: res.replies,
        accounts,
    })?))
}

pub async fn partial_spintax_save_vault(
    State(state): State<Arc<AppState>>,
    body: Bytes,
) -> Result<Html<String>, AppError> {
    let (fields, multi) = parse_form_map(&body);
    let raw_name = fields.get("file_name").map(|s| s.trim()).unwrap_or("");
    if raw_name.is_empty() {
        return Err(AppError::validation("Filename is required.").with_htmx(true));
    }
    let replies: Vec<String> = multi
        .get("replies")
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();
    if replies.is_empty() {
        return Err(AppError::validation("Reply list cannot be empty.").with_htmx(true));
    }

    let (safe_name, safe_path) = state
        .db
        .get_safe_comments_file_path(raw_name)
        .map_err(|e| AppError::validation(e).with_htmx(true))?;
    write_json_atomic(&safe_path, &replies).map_err(AppError::Internal)?;

    if let Some(acc_id) = fields.get("target_account_id").map(|s| s.trim()).filter(|s| !s.is_empty())
        && let Some(mut acc) = state.db.get_account_by_id(acc_id)
    {
        acc.comments_file = safe_name.clone();
        let _ = state.db.save_account(acc, Some(replies.clone()));
    }

    if form_bool(&fields, "save_to_templates") {
        let mut tpl = state.db.get_templates();
        tpl.extend(replies);
        let _ = state.db.save_templates(tpl);
    }

    let files = list_vault_files(&state);
    let mut html = render_tpl(SpintaxVaultListTemplate { files })?;
    html.push_str(&oob_toast_html(
        "ok",
        &format!("Saved vault file {safe_name}."),
    ));
    Ok(Html(html))
}

pub async fn partial_spintax_save_templates(
    State(state): State<Arc<AppState>>,
    body: Bytes,
) -> Result<Html<String>, AppError> {
    let (fields, _) = parse_form_map(&body);
    let templates: Vec<String> = fields
        .get("templates_text")
        .map(|s| {
            s.lines()
                .map(|l| l.trim().to_string())
                .filter(|l| !l.is_empty())
                .collect()
        })
        .unwrap_or_default();
    let saved = state
        .db
        .save_templates(templates)
        .map_err(AppError::Internal)?;
    Ok(Html(oob_toast_html(
        "ok",
        &format!("Saved {} global template(s).", saved.len()),
    )))
}

pub async fn partial_spintax_preview(body: Bytes) -> Result<Html<String>, AppError> {
    let (fields, _) = parse_form_map(&body);
    let text = fields.get("text").map(|s| s.trim()).unwrap_or("");
    if text.is_empty() {
        return Err(AppError::validation("Spintax expression cannot be empty.").with_htmx(true));
    }
    let items: String = (0..5)
        .map(|_| {
            let expanded = parse_spintax(text)
                .replace('&', "&amp;")
                .replace('<', "&lt;")
                .replace('>', "&gt;");
            format!(r#"<div class="frag text-soft">{expanded}</div>"#)
        })
        .collect::<Vec<_>>()
        .join("");
    Ok(Html(format!(r#"<div class="stack-sm">{items}</div>"#)))
}

pub async fn partial_spintax_vault_list(
    State(state): State<Arc<AppState>>,
) -> Result<Html<String>, AppError> {
    let files = list_vault_files(&state);
    Ok(Html(render_tpl(SpintaxVaultListTemplate { files })?))
}

pub async fn partial_spintax_vault_inspect(
    State(state): State<Arc<AppState>>,
    Path(filename): Path<String>,
) -> Result<Html<String>, AppError> {
    let (safe_name, safe_path) = state
        .db
        .get_safe_comments_file_path(&filename)
        .map_err(|e| AppError::validation(e).with_htmx(true))?;
    if !safe_path.exists() {
        return Err(AppError::not_found("NOT_FOUND", "Vault file not found.").with_htmx(true));
    }
    let raw = fs::read_to_string(&safe_path).map_err(|e| AppError::Internal(e.to_string()))?;
    let comments: Vec<String> = serde_json::from_str(&raw).unwrap_or_default();
    Ok(Html(render_tpl(VaultInspectModalTemplate {
        filename: safe_name,
        comments,
    })?))
}

pub async fn partial_spintax_vault_delete(
    State(state): State<Arc<AppState>>,
    Path(filename): Path<String>,
) -> Result<Html<String>, AppError> {
    let (safe_name, safe_path) = state
        .db
        .get_safe_comments_file_path(&filename)
        .map_err(|e| AppError::validation(e).with_htmx(true))?;
    if safe_path.exists() {
        fs::remove_file(&safe_path).map_err(|e| AppError::Internal(e.to_string()))?;
    }
    let files = list_vault_files(&state);
    let mut html = render_tpl(SpintaxVaultListTemplate { files })?;
    html.push_str(&oob_toast_html("ok", &format!("Deleted {safe_name}.")));
    Ok(Html(html))
}

// ---------- Safety, Credentials, 2FA & Diagnostics Partials ----------

pub async fn partial_save_safety_settings(
    State(state): State<Arc<AppState>>,
    body: Bytes,
) -> Result<Html<String>, AppError> {
    let (fields, _) = parse_form_map(&body);
    let current = state.db.get_settings();
    let mut next = current.clone();

    next.min_delay_seconds = form_u64(&fields, "min_delay_seconds", current.min_delay_seconds, 0, 3600);
    next.max_delay_seconds = form_u64(&fields, "max_delay_seconds", current.max_delay_seconds, 1, 7200);
    next.account_switch_delay_sec = form_u64(
        &fields,
        "account_switch_delay_sec",
        current.account_switch_delay_sec,
        0,
        3600,
    );
    next.hourly_limit = form_u64(&fields, "hourly_limit", current.hourly_limit, 1, 60);
    next.daily_limit = form_u64(&fields, "daily_limit", current.daily_limit, 1, 300);
    next.human_typing_delay_ms = form_u64(
        &fields,
        "human_typing_delay_ms",
        current.human_typing_delay_ms,
        10,
        1000,
    );
    next.headless = form_bool(&fields, "headless");
    next.scroll_before_action = form_bool(&fields, "scroll_before_action");
    next.enforce_warmup_gate = form_bool(&fields, "enforce_warmup_gate");
    next.cross_node_target_lock = form_bool(&fields, "cross_node_target_lock");

    if let Some(eng) = fields.get("browser_engine")
        && (eng == "chromium" || eng == "camoufox")
    {
        next.browser_engine = eng.clone();
    }

    next.telegram_enabled = form_bool(&fields, "telegram_enabled");
    if let Some(tg_tok) = fields.get("telegram_bot_token") {
        next.telegram_bot_token = tg_tok.trim().to_string();
    }
    if let Some(tg_chat) = fields.get("telegram_chat_id") {
        next.telegram_chat_id = tg_chat.trim().to_string();
    }
    next.discord_enabled = form_bool(&fields, "discord_enabled");
    if let Some(dc) = fields.get("discord_webhook_url") {
        next.discord_webhook_url = dc.trim().to_string();
    }
    next.notify_on_task_complete = form_bool(&fields, "notify_on_task_complete");
    next.notify_on_rate_limit = form_bool(&fields, "notify_on_rate_limit");
    next.notify_on_session_expire = form_bool(&fields, "notify_on_session_expire");

    let restored = restore_masked_settings(next, &current);
    state.db.save_settings(restored).map_err(AppError::Internal)?;

    let ribbon = build_ribbon(&state, "safety").await;
    let mut html = render_tpl(AlertSlotTemplate {
        alert_class: "alert--ok".to_string(),
        title: "Defense settings saved".to_string(),
        message: "Rate limits, browser engine, and webhook preferences updated.".to_string(),
    })?;
    html.push_str(&oob_ribbon_html(&ribbon));
    Ok(Html(html))
}

pub async fn partial_test_browser(
    State(state): State<Arc<AppState>>,
    body: Bytes,
) -> Result<Html<String>, AppError> {
    let (fields, _) = parse_form_map(&body);
    let engine = fields
        .get("browser_engine")
        .filter(|e| e.as_str() == "chromium" || e.as_str() == "camoufox")
        .cloned()
        .unwrap_or_else(|| "chromium".to_string());
    let res = state
        .bot
        .call("test_browser", json!({ "browserEngine": engine }))
        .await;
    match res {
        Ok(val) => {
            let ok = val.get("success").and_then(Value::as_bool).unwrap_or(false);
            let msg = val
                .get("message")
                .and_then(Value::as_str)
                .unwrap_or("Browser diagnostic completed.")
                .to_string();
            Ok(Html(render_tpl(AlertSlotTemplate {
                alert_class: if ok { "alert--ok" } else { "alert--err" }.to_string(),
                title: format!("Browser check ({engine})"),
                message: msg,
            })?))
        }
        Err(err) => Ok(Html(render_tpl(AlertSlotTemplate {
            alert_class: "alert--err".to_string(),
            title: "Browser check failed".to_string(),
            message: err,
        })?)),
    }
}

#[derive(Debug, Deserialize)]
pub struct WebhookKindQuery {
    pub kind: Option<String>,
}

pub async fn partial_test_webhook(
    State(state): State<Arc<AppState>>,
    Query(q): Query<WebhookKindQuery>,
    body: Bytes,
) -> Result<Html<String>, AppError> {
    let (fields, _) = parse_form_map(&body);
    let stored = state.db.get_settings();
    let resolved_tg = fields
        .get("telegram_bot_token")
        .map(|s| resolve_secret(s, &stored.telegram_bot_token))
        .filter(|s| !s.is_empty());
    let resolved_dc = fields
        .get("discord_webhook_url")
        .map(|s| resolve_secret(s, &stored.discord_webhook_url))
        .filter(|s| !s.is_empty());

    let res = crate::domain::notifier::test_webhook(
        q.kind.as_deref(),
        resolved_tg.as_deref(),
        fields.get("telegram_chat_id").map(String::as_str),
        resolved_dc.as_deref(),
    )
    .await;
    let ok = res.get("success").and_then(Value::as_bool).unwrap_or(false);
    let msg = res
        .get("message")
        .and_then(Value::as_str)
        .unwrap_or(if ok { "Webhook test delivered." } else { "Webhook check failed." })
        .to_string();
    Ok(Html(render_tpl(AlertSlotTemplate {
        alert_class: if ok { "alert--ok" } else { "alert--err" }.to_string(),
        title: "Webhook test".to_string(),
        message: msg,
    })?))
}

pub async fn partial_update_credentials(
    State(state): State<Arc<AppState>>,
    body: Bytes,
) -> Result<Response, AppError> {
    let (fields, _) = parse_form_map(&body);
    let cur = fields.get("current_password").map(|s| s.as_str()).unwrap_or("");
    if cur.is_empty() || !state.auth.verify_password(cur) {
        return Ok(Html(render_tpl(AlertSlotTemplate {
            alert_class: "alert--err".to_string(),
            title: "Incorrect passcode".to_string(),
            message: "Current passcode did not match.".to_string(),
        })?)
        .into_response());
    }
    let new_user = fields
        .get("new_username")
        .map(|s| s.trim())
        .filter(|s| !s.is_empty());
    let new_pw = fields.get("new_password").map(String::as_str).filter(|s| !s.is_empty());
    if let Some(u) = new_user
        && u.len() < 3
    {
        return Ok(Html(render_tpl(AlertSlotTemplate {
            alert_class: "alert--err".to_string(),
            title: "Validation failed".to_string(),
            message: "Username must be at least 3 characters.".to_string(),
        })?)
        .into_response());
    }
    if let Some(p) = new_pw
        && p.len() < 6
    {
        return Ok(Html(render_tpl(AlertSlotTemplate {
            alert_class: "alert--err".to_string(),
            title: "Validation failed".to_string(),
            message: "New passcode must be at least 6 characters.".to_string(),
        })?)
        .into_response());
    }

    let _ = state
        .auth
        .update_credentials(new_user, new_pw)
        .map_err(AppError::Internal)?;
    let fresh_token = state.auth.create_session_token();
    let cookie = state.auth.build_session_cookie(&fresh_token);

    let mut resp = Html(render_tpl(AlertSlotTemplate {
        alert_class: "alert--ok".to_string(),
        title: "Credentials updated".to_string(),
        message: "Operator credentials updated and prior sessions revoked.".to_string(),
    })?)
    .into_response();
    if let Ok(hv) = HeaderValue::from_str(&cookie) {
        resp.headers_mut().insert(header::SET_COOKIE, hv);
    }
    Ok(resp)
}

pub async fn partial_2fa_setup(State(state): State<Arc<AppState>>) -> Result<Html<String>, AppError> {
    let current = state.auth.get_auth_config();
    let secret = AuthService::generate_totp_secret();
    let otpauth_url = AuthService::get_otpauth_url(&current.username, &secret);
    let qr_svg = AuthService::render_totp_qr_svg(&otpauth_url).unwrap_or_default();
    Ok(Html(render_tpl(TotpSetupCardTemplate { secret, qr_svg })?))
}

pub async fn partial_2fa_enable(
    State(state): State<Arc<AppState>>,
    body: Bytes,
) -> Result<Html<String>, AppError> {
    let (fields, _) = parse_form_map(&body);
    let secret = fields.get("secret").map(|s| s.trim()).unwrap_or("");
    let code = fields.get("code").map(|s| s.trim()).unwrap_or("");
    if secret.is_empty() || code.is_empty() || !AuthService::verify_totp_token(code, secret) {
        return Ok(Html(render_tpl(AlertSlotTemplate {
            alert_class: "alert--err".to_string(),
            title: "Verification failed".to_string(),
            message: "Invalid 6-digit authenticator code.".to_string(),
        })?));
    }
    let mut cfg = state.auth.get_auth_config();
    cfg.totp_enabled = true;
    cfg.totp_secret = Some(secret.to_string());
    state.auth.save_auth_config(cfg).map_err(AppError::Internal)?;
    Ok(Html(render_tpl(AlertSlotTemplate {
        alert_class: "alert--ok".to_string(),
        title: "2FA enabled".to_string(),
        message: "Two-factor authentication is active. Reload page to update badge.".to_string(),
    })?))
}

// ---------- History Audit & Diagnostics Partials ----------

#[derive(Debug, Deserialize)]
pub struct AuditFilterQuery {
    pub q: Option<String>,
    pub action: Option<String>,
    pub status: Option<String>,
    pub limit: Option<usize>,
}

pub async fn partial_audit_table(
    State(state): State<Arc<AppState>>,
    Query(query): Query<AuditFilterQuery>,
) -> Result<Html<String>, AppError> {
    let limit = query.limit.unwrap_or(100).clamp(1, 1000);
    let history = state.db.get_history(1000);
    let rows = build_audit_rows(
        &history,
        query.q.as_deref().unwrap_or(""),
        query.action.as_deref().unwrap_or("ALL"),
        query.status.as_deref().unwrap_or("ALL"),
        limit,
    );
    Ok(Html(render_tpl(AuditTableTemplate { rows })?))
}

pub async fn partial_audit_detail(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Html<String>, AppError> {
    let found = state
        .db
        .get_history(2000)
        .into_iter()
        .find(|h| h.id == id)
        .ok_or_else(|| AppError::not_found("NOT_FOUND", "Audit record not found."))?;
    let pill = match found.status.as_str() {
        "SUCCESS" => "pill--ok",
        "FAILED" => "pill--err",
        "ALREADY_DONE" => "pill--warn",
        _ => "pill--info",
    };
    let item = AuditDetailView {
        id: found.id,
        timestamp: found.timestamp,
        node_label: found
            .account_label
            .or(found.account_name)
            .unwrap_or_else(|| "System".to_string()),
        action: found.action,
        engine: found
            .browser_engine
            .or(found.engine)
            .unwrap_or_else(|| "chromium".to_string()),
        status: found.status,
        status_pill_class: pill.to_string(),
        tweet_url: found.tweet_url.unwrap_or_default(),
        message: found.message.unwrap_or_default(),
        details: found.details.unwrap_or_default(),
    };
    Ok(Html(render_tpl(AuditDetailModalTemplate { item })?))
}

#[derive(Debug, Deserialize)]
pub struct PruneQuery {
    pub days: Option<u64>,
    pub status: Option<String>,
}

pub async fn partial_prune_history(
    State(state): State<Arc<AppState>>,
    Query(q): Query<PruneQuery>,
) -> Result<Html<String>, AppError> {
    let res = state
        .db
        .prune_history(q.days, q.status.as_deref(), false)
        .map_err(AppError::Internal)?;
    let history = state.db.get_history(100);
    let rows = build_audit_rows(&history, "", "ALL", "ALL", 100);
    let mut html = render_tpl(AuditTableTemplate { rows })?;
    html.push_str(&oob_toast_html(
        "ok",
        &format!("Pruned {} audit entries.", res.deleted_count),
    ));
    Ok(Html(html))
}

pub async fn partial_clear_history(State(state): State<Arc<AppState>>) -> Result<Html<String>, AppError> {
    let deleted = state.db.clear_history().map_err(AppError::Internal)?;
    let mut html = render_tpl(AuditTableTemplate { rows: Vec::new() })?;
    html.push_str(&oob_toast_html(
        "warn",
        &format!("Cleared all {deleted} audit records."),
    ));
    Ok(Html(html))
}

pub async fn partial_history_export_csv(State(state): State<Arc<AppState>>) -> Response {
    let history = state.db.get_history(5000);
    let mut csv = String::from("id,timestamp,node,action,engine,status,tweetUrl,message\n");
    let esc = |s: &str| format!("\"{}\"", s.replace('"', "\"\""));
    for h in &history {
        let node = h
            .account_label
            .as_deref()
            .or(h.account_name.as_deref())
            .unwrap_or("System");
        let engine = h
            .browser_engine
            .as_deref()
            .or(h.engine.as_deref())
            .unwrap_or("chromium");
        csv.push_str(&format!(
            "{},{},{},{},{},{},{},{}\n",
            esc(&h.id),
            esc(&h.timestamp),
            esc(node),
            esc(&h.action),
            esc(engine),
            esc(&h.status),
            esc(h.tweet_url.as_deref().unwrap_or("")),
            esc(h.message.as_deref().unwrap_or(""))
        ));
    }
    let mut resp = Response::new(csv.into());
    resp.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("text/csv; charset=utf-8"),
    );
    resp.headers_mut().insert(
        header::CONTENT_DISPOSITION,
        HeaderValue::from_static("attachment; filename=\"x-sentinel-audit-ledger.csv\""),
    );
    resp
}

pub async fn partial_diagnostics_modal(
    State(state): State<Arc<AppState>>,
) -> Result<Html<String>, AppError> {
    let val = crate::routes::system::get_system_diagnostics(State(state)).await.0;
    let pillars: Vec<PillarView> = val
        .get("pillars")
        .and_then(Value::as_array)
        .map(|arr| {
            arr.iter()
                .map(|p| PillarView {
                    name: p.get("name").and_then(Value::as_str).unwrap_or("").to_string(),
                    passed: p.get("passed").and_then(Value::as_bool).unwrap_or(false),
                    status: p.get("status").and_then(Value::as_str).unwrap_or("").to_string(),
                    message: p.get("message").and_then(Value::as_str).unwrap_or("").to_string(),
                })
                .collect()
        })
        .unwrap_or_default();

    Ok(Html(render_tpl(DiagnosticsModalTemplate {
        score: val.get("score").and_then(Value::as_u64).unwrap_or(0),
        total_pillars: val.get("totalPillars").and_then(Value::as_u64).unwrap_or(6) as usize,
        passed_pillars: val.get("passedPillars").and_then(Value::as_u64).unwrap_or(0) as usize,
        pillars,
        timestamp: val
            .get("timestamp")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_string(),
    })?))
}
