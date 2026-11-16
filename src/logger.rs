//! Real-time SSE log hub, 300-entry ring buffer, and daily rotating log files with 30-day retention.

use chrono::{Local, Utc};
use serde::Serialize;
use serde_json::{Map, Value};
use std::collections::VecDeque;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{Duration, SystemTime};
use tokio::sync::broadcast;
use uuid::Uuid;

use crate::config::AppConfig;
use crate::domain::models::LogEntry;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LogFileMeta {
    pub name: String,
    pub size_bytes: u64,
    pub modified_at: String,
}

pub struct LogHub {
    pub logs_dir: PathBuf,
    retention_days: u64,
    max_logs: usize,
    buffer: Mutex<VecDeque<LogEntry>>,
    last_cleanup_date: Mutex<Option<String>>,
    sender: broadcast::Sender<LogEntry>,
}

impl LogHub {
    pub fn new(cfg: &AppConfig) -> Self {
        let logs_dir = cfg.data_dir.join("logs");
        let _ = fs::create_dir_all(&logs_dir);
        let (sender, _) = broadcast::channel(512);
        Self {
            logs_dir,
            retention_days: 30,
            max_logs: 300,
            buffer: Mutex::new(VecDeque::with_capacity(300)),
            last_cleanup_date: Mutex::new(None),
            sender,
        }
    }

    pub fn subscribe(&self) -> broadcast::Receiver<LogEntry> {
        self.sender.subscribe()
    }

    pub fn get_date_string() -> String {
        Local::now().format("%Y-%m-%d").to_string()
    }

    pub fn get_log_file_path(&self, date_str: Option<&str>) -> PathBuf {
        let target = date_str
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(String::from)
            .unwrap_or_else(Self::get_date_string);
        let safe_date: String = target
            .chars()
            .filter(|c| c.is_ascii_digit() || *c == '-')
            .collect();
        self.logs_dir.join(format!("x-sentinel-{safe_date}.log"))
    }

    pub fn active_log_file_or_legacy(&self) -> PathBuf {
        let today_file = self.get_log_file_path(None);
        if !today_file.exists() {
            let legacy = self.logs_dir.join("x-sentinel.log");
            if legacy.exists() {
                return legacy;
            }
        }
        today_file
    }

    pub fn clean_old_logs(&self) {
        let Ok(entries) = fs::read_dir(&self.logs_dir) else {
            return;
        };
        let max_age = Duration::from_secs(self.retention_days * 24 * 60 * 60);
        let now = SystemTime::now();

        for entry in entries.flatten() {
            let file_name = entry.file_name().to_string_lossy().to_string();
            if file_name.starts_with("x-sentinel-")
                && file_name.ends_with(".log")
                && file_name.len() == "x-sentinel-YYYY-MM-DD.log".len()
                && let Ok(meta) = entry.metadata()
                && let Ok(mtime) = meta.modified()
                && let Ok(age) = now.duration_since(mtime)
                && age > max_age
            {
                let _ = fs::remove_file(entry.path());
            }
        }
    }

    fn append_to_disk(&self, entry: &LogEntry) {
        let today = Self::get_date_string();
        {
            let mut last = self.last_cleanup_date.lock().expect("cleanup lock");
            if last.as_deref() != Some(today.as_str()) {
                *last = Some(today.clone());
                drop(last);
                self.clean_old_logs();
            }
        }

        let log_path = self.get_log_file_path(Some(&today));
        let date_str = Utc::now().format("%Y-%m-%d %H:%M:%S%.3f");
        let level_upper = format!("{:<7}", entry.level.to_uppercase());
        let mut line = format!("[{date_str}] [{level_upper}] {}", entry.message);
        if !entry.meta.is_empty()
            && let Ok(meta_json) = serde_json::to_string(&entry.meta)
        {
            line.push_str(" | ");
            line.push_str(&meta_json);
        }
        line.push('\n');

        if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(log_path) {
            let _ = f.write_all(line.as_bytes());
        }
    }

    pub fn log_with_meta(&self, level: &str, message: impl Into<String>, meta: Map<String, Value>) -> LogEntry {
        let msg = message.into();
        let entry = LogEntry {
            id: format!("{}-{}", Utc::now().timestamp_millis(), &Uuid::new_v4().to_string()[..5]),
            timestamp: Local::now().format("%H:%M:%S").to_string(),
            level: level.to_string(),
            message: msg.clone(),
            meta,
        };

        {
            let mut guard = self.buffer.lock().expect("log buffer lock");
            guard.push_front(entry.clone());
            while guard.len() > self.max_logs {
                guard.pop_back();
            }
        }

        match level {
            "error" => tracing::error!("{msg}"),
            "warn" => tracing::warn!("{msg}"),
            _ => tracing::info!("{msg}"),
        }

        let _ = self.sender.send(entry.clone());
        self.append_to_disk(&entry);
        entry
    }

    pub fn info(&self, message: impl Into<String>) -> LogEntry {
        self.log_with_meta("info", message, Map::new())
    }
    pub fn success(&self, message: impl Into<String>) -> LogEntry {
        self.log_with_meta("success", message, Map::new())
    }
    pub fn warn(&self, message: impl Into<String>) -> LogEntry {
        self.log_with_meta("warn", message, Map::new())
    }
    pub fn error(&self, message: impl Into<String>) -> LogEntry {
        self.log_with_meta("error", message, Map::new())
    }
    pub fn action(&self, message: impl Into<String>) -> LogEntry {
        self.log_with_meta("action", message, Map::new())
    }

    pub fn get_recent_logs(&self, limit: usize) -> Vec<LogEntry> {
        self.buffer
            .lock()
            .expect("log buffer lock")
            .iter()
            .take(limit)
            .cloned()
            .collect()
    }

    pub fn get_available_log_files(&self) -> Vec<LogFileMeta> {
        let Ok(entries) = fs::read_dir(&self.logs_dir) else {
            return Vec::new();
        };
        let mut files: Vec<LogFileMeta> = entries
            .flatten()
            .filter_map(|e| {
                let name = e.file_name().to_string_lossy().to_string();
                if !name.ends_with(".log") {
                    return None;
                }
                let meta = e.metadata().ok()?;
                let modified_at = meta
                    .modified()
                    .ok()
                    .map(|t| chrono::DateTime::<Utc>::from(t).to_rfc3339())
                    .unwrap_or_default();
                Some(LogFileMeta {
                    name,
                    size_bytes: meta.len(),
                    modified_at,
                })
            })
            .collect();
        files.sort_by(|a, b| b.name.cmp(&a.name));
        files
    }

    pub fn active_log_filename(&self) -> String {
        Path::new(&self.active_log_file_or_legacy())
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("x-sentinel.log")
            .to_string()
    }

    pub fn clear(&self) {
        self.buffer.lock().expect("log buffer lock").clear();
    }
}
