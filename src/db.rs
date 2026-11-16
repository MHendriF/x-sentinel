//! Atomic local JSON storage engine with corruption quarantine and in-memory caching.

use chrono::{DateTime, Utc};
use serde::Serialize;
use serde::de::DeserializeOwned;
use serde_json::Value;
use std::collections::HashSet;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::RwLock;
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use uuid::Uuid;

use crate::config::AppConfig;
use crate::domain::models::{
    Account, HistoryItem, LegacyAuth, ScheduleItem, Settings, Stats, default_nine_router_models,
    default_templates,
};

#[derive(Debug, Clone)]
pub struct ParsedImportItem {
    pub auth_token: String,
    pub ct0: String,
    pub proxy: String,
    pub label: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportPayload {
    pub app: String,
    pub version: String,
    pub exported_at: String,
    pub accounts: Vec<Value>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PruneResult {
    pub deleted_count: usize,
    pub remaining_count: usize,
}

#[derive(Debug)]
struct DbCache {
    settings: Settings,
    accounts: Vec<Account>,
    history: Vec<HistoryItem>,
    templates: Vec<String>,
    stats: Stats,
    schedules: Vec<ScheduleItem>,
    last_mission: Option<Value>,
}

/// Thread-safe local JSON storage mirroring `server/db.js`.
pub struct LocalDb {
    pub data_dir: PathBuf,
    pub comments_dir: PathBuf,
    pub media_dir: PathBuf,
    version: String,
    settings_path: PathBuf,
    accounts_path: PathBuf,
    auth_legacy_path: PathBuf,
    history_path: PathBuf,
    templates_path: PathBuf,
    stats_path: PathBuf,
    schedules_path: PathBuf,
    last_mission_path: PathBuf,
    cache: RwLock<DbCache>,
}

fn now_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}

fn base36_u128(mut n: u128) -> String {
    const DIGITS: &[u8] = b"0123456789abcdefghijklmnopqrstuvwxyz";
    if n == 0 {
        return "0".to_string();
    }
    let mut buf = Vec::new();
    while n > 0 {
        buf.push(DIGITS[(n % 36) as usize]);
        n /= 36;
    }
    buf.reverse();
    String::from_utf8(buf).unwrap_or_else(|_| "0".to_string())
}

pub fn sanitize_id(raw: &str) -> String {
    raw.chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '_' || *c == '-')
        .collect()
}

/// Atomic file write: `.tmp.<pid>.<ts>` -> `sync_all` -> `rename` with 3 retries on Windows lock errors.
pub fn write_json_atomic<T: Serialize + ?Sized>(file_path: &Path, data: &T) -> Result<(), String> {
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("create dir {}: {e}", parent.display()))?;
    }
    let json =
        serde_json::to_string_pretty(data).map_err(|e| format!("serialize JSON: {e}"))?;

    let pid = std::process::id();
    let max_attempts = 3u64;
    let mut last_err = String::new();

    for attempt in 1..=max_attempts {
        let temp_name = format!(
            "{}.tmp.{}.{}",
            file_path
                .file_name()
                .and_then(|s| s.to_str())
                .unwrap_or("data.json"),
            pid,
            now_millis()
        );
        let temp_path = file_path.with_file_name(temp_name);

        let write_result = (|| -> std::io::Result<()> {
            {
                let mut file = OpenOptions::new()
                    .write(true)
                    .create(true)
                    .truncate(true)
                    .open(&temp_path)?;
                file.write_all(json.as_bytes())?;
                file.sync_all()?;
            }
            fs::rename(&temp_path, file_path)?;
            Ok(())
        })();

        match write_result {
            Ok(()) => return Ok(()),
            Err(e) => {
                last_err = e.to_string();
                let _ = fs::remove_file(&temp_path);
                if attempt < max_attempts {
                    thread::sleep(Duration::from_millis(50 * attempt));
                }
            }
        }
    }

    Err(format!(
        "Atomic write failed after {max_attempts} attempts for {}: {last_err}",
        file_path.display()
    ))
}

fn read_or_default<T: DeserializeOwned + Serialize>(file_path: &Path, default_value: T) -> T {
    if file_path.exists() {
        match fs::read_to_string(file_path) {
            Ok(raw) => match serde_json::from_str::<T>(&raw) {
                Ok(parsed) => return parsed,
                Err(parse_err) => {
                    let corrupt_name = format!(
                        "{}.corrupt.{}",
                        file_path
                            .file_name()
                            .and_then(|s| s.to_str())
                            .unwrap_or("data.json"),
                        now_millis()
                    );
                    let quarantine_path = file_path.with_file_name(corrupt_name);
                    if let Err(ren_err) = fs::rename(file_path, &quarantine_path) {
                        tracing::error!(
                            path = %file_path.display(),
                            error = %ren_err,
                            "Failed to quarantine corrupt JSON file"
                        );
                    } else {
                        tracing::warn!(
                            path = %file_path.display(),
                            quarantine = %quarantine_path.display(),
                            error = %parse_err,
                            "Corrupted JSON quarantined; continuing with default value"
                        );
                    }
                }
            },
            Err(read_err) => {
                tracing::error!(
                    path = %file_path.display(),
                    error = %read_err,
                    "Error reading JSON file"
                );
            }
        }
    }

    if let Err(write_err) = write_json_atomic(file_path, &default_value) {
        tracing::error!(
            path = %file_path.display(),
            error = %write_err,
            "Failed to persist default JSON file"
        );
    }
    default_value
}

fn read_optional_without_creating<T: DeserializeOwned>(file_path: &Path) -> Option<T> {
    if !file_path.exists() {
        return None;
    }
    let raw = fs::read_to_string(file_path).ok()?;
    serde_json::from_str::<T>(&raw).ok()
}

impl LocalDb {
    /// Initialize `LocalDb` from `AppConfig`, creating `data/` directories and loading JSON caches.
    pub fn new(cfg: &AppConfig) -> Result<Self, String> {
        let data_dir = cfg.data_dir.clone();
        let comments_dir = data_dir.join("comments");
        let media_dir = data_dir.join("media");

        fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
        fs::create_dir_all(&comments_dir).map_err(|e| e.to_string())?;
        fs::create_dir_all(&media_dir).map_err(|e| e.to_string())?;

        let settings_path = data_dir.join("settings.json");
        let accounts_path = data_dir.join("accounts.json");
        let auth_legacy_path = data_dir.join("auth.json");
        let history_path = data_dir.join("history.json");
        let templates_path = data_dir.join("templates.json");
        let stats_path = data_dir.join("stats.json");
        let schedules_path = data_dir.join("schedules.json");
        let last_mission_path = data_dir.join("lastMission.json");

        let mut settings: Settings = read_or_default(&settings_path, Settings::default());
        if settings.browser_engine.trim().is_empty() {
            settings.browser_engine = cfg.defaults.browser_engine.clone();
        }
        if settings.nine_router_models.is_empty() {
            settings.nine_router_models = default_nine_router_models();
        }

        let templates: Vec<String> = read_or_default(&templates_path, default_templates());
        let mut accounts: Vec<Account> = read_or_default(&accounts_path, Vec::new());
        let schedules: Vec<ScheduleItem> = read_or_default(&schedules_path, Vec::new());
        let last_mission: Option<Value> = read_or_default(&last_mission_path, None);
        let history: Vec<HistoryItem> = read_or_default(&history_path, Vec::new());
        let mut stats: Stats = read_or_default(&stats_path, Stats::default());

        if accounts.is_empty()
            && let Some(legacy) = read_optional_without_creating::<LegacyAuth>(&auth_legacy_path)
            && !legacy.auth_token.is_empty()
        {
            let id = format!("acc_{}", Uuid::new_v4());
            let initial = Account {
                id: id.clone(),
                label: if legacy.name.is_empty() {
                    "Akun Utama".to_string()
                } else {
                    legacy.name.clone()
                },
                auth_token: legacy.auth_token,
                ct0: legacy.ct0,
                username: legacy.username,
                name: if legacy.name.is_empty() {
                    "User".to_string()
                } else {
                    legacy.name
                },
                avatar: legacy.avatar,
                proxy: String::new(),
                comments_file: format!("comments_{}.json", base36_u128(now_millis())),
                enabled: true,
                is_valid: legacy.is_valid,
                last_checked: legacy.last_checked,
                ..Default::default()
            };
            accounts.push(initial);
            let _ = write_json_atomic(&accounts_path, &accounts);
            let comment_path = comments_dir.join(format!("comments_{}.json", sanitize_id(&id)));
            let _ = write_json_atomic(&comment_path, &templates);
        }

        let today = Utc::now().format("%Y-%m-%d").to_string();
        if stats.last_reset_date != today {
            stats.today_likes = 0;
            stats.today_retweets = 0;
            stats.today_comments = 0;
            stats.today_posts = 0;
            stats.last_reset_date = today;
            let _ = write_json_atomic(&stats_path, &stats);
        }

        Ok(Self {
            data_dir,
            comments_dir,
            media_dir,
            version: cfg.version.clone(),
            settings_path,
            accounts_path,
            auth_legacy_path,
            history_path,
            templates_path,
            stats_path,
            schedules_path,
            last_mission_path,
            cache: RwLock::new(DbCache {
                settings,
                accounts,
                history,
                templates,
                stats,
                schedules,
                last_mission,
            }),
        })
    }

    pub fn settings_file_path(&self) -> &Path {
        &self.settings_path
    }
    pub fn accounts_file_path(&self) -> &Path {
        &self.accounts_path
    }
    pub fn history_file_path(&self) -> &Path {
        &self.history_path
    }
    pub fn legacy_auth_file_path(&self) -> &Path {
        &self.auth_legacy_path
    }

    pub fn get_settings(&self) -> Settings {
        let mut s = self.cache.read().expect("db lock").settings.clone();
        if s.browser_engine.trim().is_empty() {
            s.browser_engine = "chromium".to_string();
        }
        s
    }

    pub fn save_settings(&self, updated: Settings) -> Result<Settings, String> {
        let mut guard = self.cache.write().expect("db lock");
        guard.settings = updated.clone();
        write_json_atomic(&self.settings_path, &guard.settings)?;
        Ok(updated)
    }

    pub fn get_accounts(&self) -> Vec<Account> {
        self.cache.read().expect("db lock").accounts.clone()
    }

    pub fn get_active_accounts(&self) -> Vec<Account> {
        self.cache
            .read()
            .expect("db lock")
            .accounts
            .iter()
            .filter(|a| a.enabled)
            .cloned()
            .collect()
    }

    pub fn get_account_by_id(&self, id: &str) -> Option<Account> {
        self.cache
            .read()
            .expect("db lock")
            .accounts
            .iter()
            .find(|a| a.id == id)
            .cloned()
    }

    pub fn save_account(&self, mut account: Account, initial_comments: Option<Vec<String>>) -> Result<Account, String> {
        let mut guard = self.cache.write().expect("db lock");
        if account.id.trim().is_empty() {
            account.id = format!("acc_{}", Uuid::new_v4());
        }
        account.label = account.label.trim().to_string();
        if account.label.is_empty() {
            account.label = "Akun X".to_string();
        }
        account.auth_token = account.auth_token.trim().to_string();
        account.ct0 = account.ct0.trim().to_string();
        account.username = account.username.trim().trim_start_matches('@').to_string();
        account.name = account.name.trim().to_string();
        account.proxy = account.proxy.trim().to_string();

        if account.comments_file.is_empty() {
            account.comments_file = format!("comments_{}.json", sanitize_id(&account.id));
        }

        if let Some(pos) = guard.accounts.iter().position(|a| a.id == account.id) {
            guard.accounts[pos] = account.clone();
        } else {
            guard.accounts.push(account.clone());
            let comments_to_save = match initial_comments {
                Some(list) if !list.is_empty() => list,
                _ => guard.templates.clone(),
            };
            let path = self.get_account_comments_file_path(&account.id)?;
            write_json_atomic(&path, &comments_to_save)?;
        }

        write_json_atomic(&self.accounts_path, &guard.accounts)?;
        Ok(account)
    }

    pub fn save_accounts_vec(&self, accounts: Vec<Account>) -> Result<(), String> {
        let mut guard = self.cache.write().expect("db lock");
        guard.accounts = accounts;
        write_json_atomic(&self.accounts_path, &guard.accounts)
    }

    pub fn delete_account(&self, id: &str) -> Result<bool, String> {
        let mut guard = self.cache.write().expect("db lock");
        let before = guard.accounts.len();
        guard.accounts.retain(|a| a.id != id);
        if guard.accounts.len() == before {
            return Ok(false);
        }
        write_json_atomic(&self.accounts_path, &guard.accounts)?;
        if let Ok(path) = self.get_account_comments_file_path(id)
            && path.exists()
        {
            let _ = fs::remove_file(path);
        }
        Ok(true)
    }

    pub fn toggle_account(&self, id: &str) -> Result<Option<Account>, String> {
        let mut guard = self.cache.write().expect("db lock");
        if let Some(acc) = guard.accounts.iter_mut().find(|a| a.id == id) {
            acc.enabled = !acc.enabled;
            let cloned = acc.clone();
            write_json_atomic(&self.accounts_path, &guard.accounts)?;
            return Ok(Some(cloned));
        }
        Ok(None)
    }

    /// Resolve per-account comment file path while preventing directory traversal.
    pub fn get_account_comments_file_path(&self, account_id: &str) -> Result<PathBuf, String> {
        let sanitized = sanitize_id(account_id);
        let file_name = format!("comments_{sanitized}.json");
        let base = fs::canonicalize(&self.comments_dir).unwrap_or_else(|_| self.comments_dir.clone());
        let resolved = base.join(&file_name);
        if !resolved.starts_with(&base) {
            return Err("Security Violation: Invalid comment file path traversal detected.".to_string());
        }
        Ok(resolved)
    }

    /// Resolve an arbitrary `.json` vault filename inside `data/comments/` safely.
    pub fn get_safe_comments_file_path(&self, file_name: &str) -> Result<(String, PathBuf), String> {
        let trimmed = file_name.trim();
        if trimmed.is_empty() {
            return Err("Invalid or missing file name.".to_string());
        }
        let base_only = Path::new(trimmed)
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if base_only.is_empty() {
            return Err("Invalid or missing file name.".to_string());
        }
        let with_ext = if base_only.to_ascii_lowercase().ends_with(".json") {
            base_only
        } else {
            format!("{base_only}.json")
        };
        let safe_name: String = with_ext
            .chars()
            .map(|c| {
                if c.is_ascii_alphanumeric() || c == '_' || c == '-' || c == '.' {
                    c
                } else {
                    '_'
                }
            })
            .collect();

        let base = fs::canonicalize(&self.comments_dir).unwrap_or_else(|_| self.comments_dir.clone());
        let resolved = base.join(&safe_name);
        if !resolved.starts_with(&base) || resolved == base {
            return Err("Invalid file path traversal detected.".to_string());
        }
        Ok((safe_name, resolved))
    }

    pub fn get_account_comments(&self, account_id: &str) -> Vec<String> {
        if let Ok(path) = self.get_account_comments_file_path(account_id)
            && path.exists()
            && let Ok(raw) = fs::read_to_string(&path)
            && let Ok(parsed) = serde_json::from_str::<Vec<String>>(&raw)
        {
            return parsed;
        }
        self.get_templates()
    }

    pub fn save_account_comments(
        &self,
        account_id: &str,
        comments: Vec<String>,
    ) -> Result<Vec<String>, String> {
        let path = self.get_account_comments_file_path(account_id)?;
        write_json_atomic(&path, &comments)?;
        Ok(comments)
    }

    pub fn export_accounts(&self) -> ExportPayload {
        let accounts = self.get_accounts();
        let enriched = accounts
            .into_iter()
            .map(|acc| {
                let comments = self.get_account_comments(&acc.id);
                let mut val = serde_json::to_value(&acc).unwrap_or(Value::Null);
                if let Some(obj) = val.as_object_mut() {
                    obj.insert("comments".to_string(), Value::from(comments));
                }
                val
            })
            .collect();

        ExportPayload {
            app: "x-sentinel".to_string(),
            version: self.version.clone(),
            exported_at: Utc::now().to_rfc3339(),
            accounts: enriched,
        }
    }

    pub fn parse_bulk_import_text(raw_text: &str) -> Result<Vec<ParsedImportItem>, String> {
        let trimmed = raw_text.trim();
        if trimmed.is_empty() {
            return Err("Import payload cannot be empty.".to_string());
        }

        if trimmed.starts_with('[') || trimmed.starts_with('{') {
            let parsed: Value =
                serde_json::from_str(trimmed).map_err(|e| format!("Invalid JSON import: {e}"))?;
            let items = match parsed {
                Value::Array(arr) => arr,
                other @ Value::Object(_) => vec![other],
                _ => Vec::new(),
            };
            let mut results = Vec::new();
            for (idx, item) in items.into_iter().enumerate() {
                let auth_token = item
                    .get("auth_token")
                    .or_else(|| item.get("token"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .trim()
                    .to_string();
                if auth_token.is_empty() {
                    continue;
                }
                let ct0 = item
                    .get("ct0")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .trim()
                    .to_string();
                let proxy = item
                    .get("proxy")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .trim()
                    .to_string();
                let label = item
                    .get("label")
                    .or_else(|| item.get("name"))
                    .and_then(|v| v.as_str())
                    .map(|s| s.trim().to_string())
                    .filter(|s| !s.is_empty())
                    .unwrap_or_else(|| format!("Node {}", idx + 1));

                results.push(ParsedImportItem {
                    auth_token,
                    ct0,
                    proxy,
                    label,
                });
            }
            return Ok(results);
        }

        let mut results = Vec::new();
        for raw_line in trimmed.lines() {
            let line = raw_line.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            let delimiter = if line.contains('|') { '|' } else { ':' };
            let parts: Vec<String> = line
                .split(delimiter)
                .map(|p| p.trim().to_string())
                .collect();
            if parts.len() < 2 {
                continue;
            }
            let auth_token = parts[0].clone();
            let ct0 = parts[1].clone();
            let remaining = &parts[2..];
            let mut proxy = String::new();
            let mut label = format!("Node {}", results.len() + 1);

            if remaining.len() == 1 {
                let seg = &remaining[0];
                if seg.contains('.') || seg.contains('@') {
                    proxy = seg.clone();
                } else if !seg.is_empty() {
                    label = seg.clone();
                }
            } else if remaining.len() >= 2 {
                label = remaining.last().cloned().unwrap_or(label);
                proxy = remaining[..remaining.len() - 1].join(":");
            }

            results.push(ParsedImportItem {
                auth_token,
                ct0,
                proxy,
                label,
            });
        }

        Ok(results)
    }

    pub fn bulk_import_accounts(&self, raw_text: &str) -> Result<Vec<Account>, String> {
        let parsed = Self::parse_bulk_import_text(raw_text)?;
        if parsed.is_empty() {
            return Err("No valid accounts could be parsed from the provided data.".to_string());
        }

        let mut existing_tokens: HashSet<String> = self
            .get_accounts()
            .into_iter()
            .map(|a| a.auth_token)
            .collect();

        let mut imported = Vec::new();
        for item in parsed {
            if item.auth_token.is_empty() || existing_tokens.contains(&item.auth_token) {
                continue;
            }
            existing_tokens.insert(item.auth_token.clone());
            let saved = self.save_account(
                Account {
                    label: item.label,
                    auth_token: item.auth_token,
                    ct0: item.ct0,
                    proxy: item.proxy,
                    ..Default::default()
                },
                None,
            )?;
            imported.push(saved);
        }

        Ok(imported)
    }

    pub fn get_templates(&self) -> Vec<String> {
        self.cache.read().expect("db lock").templates.clone()
    }

    pub fn save_templates(&self, templates: Vec<String>) -> Result<Vec<String>, String> {
        let mut guard = self.cache.write().expect("db lock");
        guard.templates = templates.clone();
        write_json_atomic(&self.templates_path, &guard.templates)?;
        Ok(templates)
    }

    pub fn get_stats(&self) -> Stats {
        let mut guard = self.cache.write().expect("db lock");
        let today = Utc::now().format("%Y-%m-%d").to_string();
        if guard.stats.last_reset_date != today {
            guard.stats.today_likes = 0;
            guard.stats.today_retweets = 0;
            guard.stats.today_comments = 0;
            guard.stats.today_posts = 0;
            guard.stats.last_reset_date = today;
            let _ = write_json_atomic(&self.stats_path, &guard.stats);
        }
        guard.stats.clone()
    }

    pub fn get_history(&self, limit: usize) -> Vec<HistoryItem> {
        let guard = self.cache.read().expect("db lock");
        let len = guard.history.len();
        let take_n = limit.min(len);
        guard.history[len - take_n..]
            .iter()
            .rev()
            .cloned()
            .collect()
    }

    pub fn add_history(&self, mut entry: HistoryItem) -> Result<HistoryItem, String> {
        let mut guard = self.cache.write().expect("db lock");
        if entry.id.is_empty() {
            entry.id = Uuid::new_v4().to_string();
        }
        if entry.timestamp.is_empty() {
            entry.timestamp = Utc::now().to_rfc3339();
        }
        if entry.time_formatted.is_empty() {
            entry.time_formatted = chrono::Local::now().format("%H.%M.%S").to_string();
        }

        guard.history.push(entry.clone());
        if guard.history.len() > 2000 {
            let drain = guard.history.len() - 2000;
            guard.history.drain(0..drain);
        }
        write_json_atomic(&self.history_path, &guard.history)?;

        if entry.status == "SUCCESS" {
            let today = Utc::now().format("%Y-%m-%d").to_string();
            if guard.stats.last_reset_date != today {
                guard.stats.today_likes = 0;
                guard.stats.today_retweets = 0;
                guard.stats.today_comments = 0;
                guard.stats.today_posts = 0;
                guard.stats.last_reset_date = today;
            }
            match entry.action.as_str() {
                "LIKE" => {
                    guard.stats.total_likes += 1;
                    guard.stats.today_likes += 1;
                }
                "RETWEET" => {
                    guard.stats.total_retweets += 1;
                    guard.stats.today_retweets += 1;
                }
                "COMMENT" => {
                    guard.stats.total_comments += 1;
                    guard.stats.today_comments += 1;
                }
                "POST" | "TWEET" => {
                    guard.stats.total_posts += 1;
                    guard.stats.today_posts += 1;
                }
                _ => {}
            }
            write_json_atomic(&self.stats_path, &guard.stats)?;

            if let Some(acc_id) = &entry.account_id
                && let Some(acc) = guard.accounts.iter_mut().find(|a| &a.id == acc_id)
            {
                match entry.action.as_str() {
                    "LIKE" => acc.stats.likes += 1,
                    "RETWEET" => acc.stats.retweets += 1,
                    "COMMENT" => acc.stats.comments += 1,
                    "POST" | "TWEET" => acc.stats.posts += 1,
                    _ => {}
                }
                write_json_atomic(&self.accounts_path, &guard.accounts)?;
            }
        }

        Ok(entry)
    }

    pub fn prune_history(
        &self,
        older_than_days: Option<u64>,
        status: Option<&str>,
        dry_run: bool,
    ) -> Result<PruneResult, String> {
        let mut guard = self.cache.write().expect("db lock");
        let now_ms = Utc::now().timestamp_millis();
        let cutoff_ms = older_than_days.map(|d| (d as i64) * 24 * 60 * 60 * 1000);

        let remaining: Vec<HistoryItem> = guard
            .history
            .iter()
            .filter(|item| {
                if let Some(cut) = cutoff_ms
                    && let Ok(parsed) = DateTime::parse_from_rfc3339(&item.timestamp)
                    && now_ms - parsed.timestamp_millis() > cut
                    && (status.is_none() || status == Some(item.status.as_str()))
                {
                    return false;
                }
                if cutoff_ms.is_none()
                    && let Some(st) = status
                    && item.status == st
                {
                    return false;
                }
                true
            })
            .cloned()
            .collect();

        let deleted_count = guard.history.len().saturating_sub(remaining.len());
        let remaining_count = remaining.len();

        if !dry_run && deleted_count > 0 {
            guard.history = remaining;
            write_json_atomic(&self.history_path, &guard.history)?;
        }

        Ok(PruneResult {
            deleted_count,
            remaining_count,
        })
    }

    pub fn clear_history(&self) -> Result<usize, String> {
        let mut guard = self.cache.write().expect("db lock");
        let count = guard.history.len();
        guard.history.clear();
        write_json_atomic(&self.history_path, &guard.history)?;
        Ok(count)
    }

    pub fn get_schedules(&self) -> Vec<ScheduleItem> {
        self.cache.read().expect("db lock").schedules.clone()
    }

    pub fn get_schedule_by_id(&self, id: &str) -> Option<ScheduleItem> {
        self.cache
            .read()
            .expect("db lock")
            .schedules
            .iter()
            .find(|s| s.id == id)
            .cloned()
    }

    pub fn save_schedule(&self, mut item: ScheduleItem) -> Result<ScheduleItem, String> {
        let mut guard = self.cache.write().expect("db lock");
        if item.id.trim().is_empty() {
            item.id = format!("sch_{}", Uuid::new_v4());
        }
        if item.created_at.is_empty() {
            item.created_at = Utc::now().to_rfc3339();
        }
        item.updated_at = Utc::now().to_rfc3339();

        if let Some(pos) = guard.schedules.iter().position(|s| s.id == item.id) {
            guard.schedules[pos] = item.clone();
        } else {
            guard.schedules.insert(0, item.clone());
        }
        write_json_atomic(&self.schedules_path, &guard.schedules)?;
        Ok(item)
    }

    pub fn delete_schedule(&self, id: &str) -> Result<bool, String> {
        let mut guard = self.cache.write().expect("db lock");
        let before = guard.schedules.len();
        guard.schedules.retain(|s| s.id != id);
        if guard.schedules.len() == before {
            return Ok(false);
        }
        write_json_atomic(&self.schedules_path, &guard.schedules)?;
        Ok(true)
    }

    pub fn toggle_schedule(&self, id: &str, enabled: Option<bool>) -> Result<Option<ScheduleItem>, String> {
        let mut guard = self.cache.write().expect("db lock");
        if let Some(item) = guard.schedules.iter_mut().find(|s| s.id == id) {
            item.enabled = enabled.unwrap_or(!item.enabled);
            item.updated_at = Utc::now().to_rfc3339();
            let cloned = item.clone();
            write_json_atomic(&self.schedules_path, &guard.schedules)?;
            return Ok(Some(cloned));
        }
        Ok(None)
    }

    pub fn get_last_mission(&self) -> Option<Value> {
        self.cache.read().expect("db lock").last_mission.clone()
    }

    pub fn save_last_mission(&self, mission: Value) -> Result<Value, String> {
        let mut guard = self.cache.write().expect("db lock");
        guard.last_mission = Some(mission.clone());
        write_json_atomic(&self.last_mission_path, &guard.last_mission)?;
        Ok(mission)
    }

    /// Reload mutable runtime files from disk after the Node Playwright/Camoufox worker modifies them.
    pub fn reload_runtime_files(&self) {
        let mut guard = self.cache.write().expect("db lock");
        if let Some(accs) = read_optional_without_creating::<Vec<Account>>(&self.accounts_path) {
            guard.accounts = accs;
        }
        if let Some(hist) = read_optional_without_creating::<Vec<HistoryItem>>(&self.history_path) {
            guard.history = hist;
        }
        if let Some(st) = read_optional_without_creating::<Stats>(&self.stats_path) {
            guard.stats = st;
        }
        if let Some(lm) = read_optional_without_creating::<Option<Value>>(&self.last_mission_path) {
            guard.last_mission = lm;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn atomic_write_quarantines_corrupt_json_and_supports_bulk_import() {
        let tmp = TempDir::new().unwrap();
        let cfg = AppConfig::with_paths(tmp.path(), tmp.path(), &[]);
        fs::write(tmp.path().join("accounts.json"), "{not-valid-json").unwrap();

        let db = LocalDb::new(&cfg).unwrap();
        assert!(db.get_accounts().is_empty());

        let has_corrupt = fs::read_dir(tmp.path())
            .unwrap()
            .filter_map(Result::ok)
            .any(|e| e.file_name().to_string_lossy().contains(".corrupt."));
        assert!(has_corrupt, "Corrupt file must be quarantined, not silently overwritten");

        let imported = db
            .bulk_import_accounts("tok_11111111111111111111:ct0_111:Node One\ntok_22222222222222222222:ct0_222:user:pass@1.2.3.4:8080:Node Two")
            .unwrap();
        assert_eq!(imported.len(), 2);
        assert_eq!(imported[0].label, "Node One");
        assert_eq!(imported[1].proxy, "user:pass@1.2.3.4:8080");

        assert!(db.get_safe_comments_file_path("../secret.json").is_ok()); // basename sanitized safely
        let (_name, path) = db.get_safe_comments_file_path("../secret.json").unwrap();
        assert!(path.starts_with(fs::canonicalize(&db.comments_dir).unwrap()));
    }
}
