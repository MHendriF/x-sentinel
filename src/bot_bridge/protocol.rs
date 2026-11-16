//! Typed JSON-RPC frames exchanged with `worker/bot_worker.js`.

use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize)]
pub struct WorkerRequest {
    pub id: String,
    pub cmd: String,
    pub params: Value,
}

#[derive(Debug, Clone, Deserialize)]
pub struct WorkerMessage {
    pub id: Option<String>,
    pub ok: Option<bool>,
    pub result: Option<Value>,
    pub error: Option<String>,
    pub event: Option<String>,
    pub data: Option<Value>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskStatusSnapshot {
    pub is_running: bool,
    pub is_paused: bool,
    pub pause_reason: Option<String>,
    pub current_task: Option<Value>,
}
