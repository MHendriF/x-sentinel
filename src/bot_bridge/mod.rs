//! Manages the Node.js Playwright + Camoufox sidecar worker subprocess and task status.

pub mod protocol;

use serde_json::{Map, Value, json};
use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, ChildStdin, Command};
use tokio::sync::{Mutex, oneshot};
use uuid::Uuid;

use crate::config::AppConfig;
use crate::db::LocalDb;
use crate::domain::models::LogEntry;
use crate::logger::LogHub;
use protocol::{TaskStatusSnapshot, WorkerMessage, WorkerRequest};

struct WorkerProc {
    _child: Child,
    stdin: ChildStdin,
}

pub struct BotBridge {
    root_dir: PathBuf,
    data_dir: PathBuf,
    db: Arc<LocalDb>,
    logger: Arc<LogHub>,
    proc: Mutex<Option<WorkerProc>>,
    pending: Arc<Mutex<HashMap<String, oneshot::Sender<Result<Value, String>>>>>,
    status: Arc<Mutex<TaskStatusSnapshot>>,
}

impl BotBridge {
    pub fn new(cfg: &AppConfig, db: Arc<LocalDb>, logger: Arc<LogHub>) -> Self {
        Self {
            root_dir: cfg.root_dir.clone(),
            data_dir: cfg.data_dir.clone(),
            db,
            logger,
            proc: Mutex::new(None),
            pending: Arc::new(Mutex::new(HashMap::new())),
            status: Arc::new(Mutex::new(TaskStatusSnapshot::default())),
        }
    }

    pub async fn get_task_status(&self) -> TaskStatusSnapshot {
        self.status.lock().await.clone()
    }

    pub async fn is_running(&self) -> bool {
        self.status.lock().await.is_running
    }

    pub async fn set_running_state(&self, running: bool, task_meta: Option<Value>) {
        let mut st = self.status.lock().await;
        st.is_running = running;
        st.current_task = task_meta;
        if !running {
            st.is_paused = false;
            st.pause_reason = None;
        }
    }

    async fn ensure_worker_started(&self) -> Result<(), String> {
        let mut guard = self.proc.lock().await;
        if guard.is_some() {
            return Ok(());
        }

        let worker_script = self.root_dir.join("worker").join("bot_worker.js");
        if !worker_script.exists() {
            return Err(format!(
                "Browser worker script missing at {}",
                worker_script.display()
            ));
        }

        let mut cmd = Command::new("node");
        cmd.arg(&worker_script)
            .current_dir(&self.root_dir)
            .env("X_SENTINEL_DATA_DIR", &self.data_dir)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .kill_on_drop(true);

        let mut child = cmd
            .spawn()
            .map_err(|e| format!("Failed to spawn Node browser worker: {e}"))?;

        let stdin = child
            .stdin
            .take()
            .ok_or_else(|| "Worker stdin unavailable".to_string())?;
        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| "Worker stdout unavailable".to_string())?;
        let stderr = child.stderr.take();

        let pending = Arc::clone(&self.pending);
        let logger = Arc::clone(&self.logger);
        let db = Arc::clone(&self.db);
        let status = Arc::clone(&self.status);

        tokio::spawn(async move {
            let mut lines = BufReader::new(stdout).lines();
            while let Ok(Some(line)) = lines.next_line().await {
                let trimmed = line.trim();
                if trimmed.is_empty() {
                    continue;
                }
                let Ok(msg) = serde_json::from_str::<WorkerMessage>(trimmed) else {
                    continue;
                };

                if let Some(event) = msg.event {
                    match event.as_str() {
                        "log" => {
                            if let Some(data) = msg.data {
                                if let Ok(entry) = serde_json::from_value::<LogEntry>(data) {
                                    logger.log_with_meta(&entry.level, entry.message, entry.meta);
                                }
                            }
                        }
                        "task_status" => {
                            if let Some(data) = msg.data {
                                let mut st = status.lock().await;
                                if let Some(v) = data.get("isRunning").and_then(|b| b.as_bool()) {
                                    st.is_running = v;
                                }
                                if let Some(v) = data.get("isPaused").and_then(|b| b.as_bool()) {
                                    st.is_paused = v;
                                }
                                if data.get("pauseReason").is_some() {
                                    st.pause_reason = data
                                        .get("pauseReason")
                                        .and_then(|r| r.as_str())
                                        .map(ToString::to_string);
                                }
                                if data.get("currentTask").is_some() {
                                    st.current_task = data.get("currentTask").cloned();
                                    if st.current_task.as_ref().is_some_and(Value::is_null) {
                                        st.current_task = None;
                                    }
                                }
                            }
                            db.reload_runtime_files();
                        }
                        "worker_error" => {
                            if let Some(err) = msg.error {
                                logger.error(format!("Browser worker error: {err}"));
                            }
                        }
                        _ => {}
                    }
                    continue;
                }

                if let Some(id) = msg.id {
                    let tx = pending.lock().await.remove(&id);
                    if let Some(tx) = tx {
                        if msg.ok == Some(true) {
                            let _ = tx.send(Ok(msg.result.unwrap_or(Value::Null)));
                        } else {
                            let _ = tx.send(Err(
                                msg.error.unwrap_or_else(|| "Unknown worker error".to_string())
                            ));
                        }
                    }
                }
            }

            let mut p = pending.lock().await;
            for (_, tx) in p.drain() {
                let _ = tx.send(Err("Browser worker exited unexpectedly.".to_string()));
            }
        });

        if let Some(stderr_pipe) = stderr {
            tokio::spawn(async move {
                let mut lines = BufReader::new(stderr_pipe).lines();
                while let Ok(Some(line)) = lines.next_line().await {
                    let t = line.trim();
                    if !t.is_empty() {
                        tracing::debug!(worker_stderr = %t);
                    }
                }
            });
        }

        *guard = Some(WorkerProc {
            _child: child,
            stdin,
        });
        Ok(())
    }

    /// Execute a command against the Playwright/Camoufox worker and synchronize `LocalDb`.
    pub async fn call(&self, cmd: &str, params: Value) -> Result<Value, String> {
        self.ensure_worker_started().await?;
        let id = Uuid::new_v4().to_string();
        let req = WorkerRequest {
            id: id.clone(),
            cmd: cmd.to_string(),
            params,
        };
        let frame = format!("{}\n", serde_json::to_string(&req).map_err(|e| e.to_string())?);

        let (tx, rx) = oneshot::channel();
        self.pending.lock().await.insert(id.clone(), tx);

        {
            let mut guard = self.proc.lock().await;
            if let Some(worker) = guard.as_mut() {
                if let Err(err) = worker.stdin.write_all(frame.as_bytes()).await {
                    self.pending.lock().await.remove(&id);
                    *guard = None;
                    return Err(format!("Failed writing to browser worker: {err}"));
                }
                let _ = worker.stdin.flush().await;
            } else {
                self.pending.lock().await.remove(&id);
                return Err("Browser worker is not running.".to_string());
            }
        }

        let res = rx
            .await
            .map_err(|_| "Browser worker channel closed".to_string())?;
        self.db.reload_runtime_files();
        res
    }

    pub async fn pause(&self, reason: &str) -> bool {
        let mut st = self.status.lock().await;
        if !st.is_running || st.is_paused {
            return false;
        }
        st.is_paused = true;
        st.pause_reason = Some(reason.to_string());
        drop(st);
        let _ = self.call("pause", json!({ "reason": reason })).await;
        true
    }

    pub async fn resume(&self) -> bool {
        let mut st = self.status.lock().await;
        if !st.is_running || !st.is_paused {
            return false;
        }
        st.is_paused = false;
        st.pause_reason = None;
        drop(st);
        let _ = self.call("resume", json!({})).await;
        true
    }

    pub async fn stop(&self) -> bool {
        let st = self.status.lock().await;
        if !st.is_running {
            return false;
        }
        drop(st);
        let _ = self.call("stop", json!({})).await;
        true
    }

    pub async fn shutdown(&self) {
        if self.is_running().await {
            let _ = self.stop().await;
        }
        let mut guard = self.proc.lock().await;
        *guard = None;
    }
}

pub fn default_log_meta() -> Map<String, Value> {
    Map::new()
}
