//! Cross-node target lock preventing multiple fleet accounts from colliding on the same tweet.

use serde::Serialize;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

pub const DEFAULT_ENGAGE_TTL_MS: i64 = 5 * 60 * 1000;
pub const DEFAULT_REPLY_TTL_MS: i64 = 15 * 60 * 1000;

#[derive(Debug, Clone)]
struct LockEntry {
    account_id: String,
    ts_ms: i64,
    kind: String,
    ttl_ms: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LockDecision {
    pub ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub free_in_ms: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub locked_by: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub kind: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TargetLockSnapshot {
    pub active_targets: usize,
    pub total_locks: usize,
}

pub struct TargetLock {
    locks: Mutex<HashMap<String, Vec<LockEntry>>>,
    cross_node_override: Mutex<Option<bool>>,
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

impl Default for TargetLock {
    fn default() -> Self {
        Self::new()
    }
}

impl TargetLock {
    pub fn new() -> Self {
        Self {
            locks: Mutex::new(HashMap::new()),
            cross_node_override: Mutex::new(None),
        }
    }

    pub fn set_cross_node_lock(&self, enabled: Option<bool>) {
        *self.cross_node_override.lock().expect("lock override") = enabled;
    }

    fn resolve_cross_node(&self, option_override: Option<bool>, setting_default: bool) -> bool {
        if let Some(opt) = option_override {
            return opt;
        }
        if let Some(inst) = *self.cross_node_override.lock().expect("lock override") {
            return inst;
        }
        setting_default
    }

    pub fn acquire(
        &self,
        tweet_id: &str,
        account_id: &str,
        kind: &str,
        ttl_ms_override: Option<i64>,
        cross_node_option: Option<bool>,
        setting_cross_node: bool,
    ) -> LockDecision {
        let id = tweet_id.trim();
        if id.is_empty() || account_id.trim().is_empty() {
            return LockDecision {
                ok: true,
                reason: None,
                free_in_ms: None,
                locked_by: None,
                kind: None,
            };
        }

        let resolved_kind = if kind.is_empty() { "ENGAGE" } else { kind };
        let ttl_ms = ttl_ms_override.unwrap_or_else(|| {
            if resolved_kind == "REPLY" {
                DEFAULT_REPLY_TTL_MS
            } else {
                DEFAULT_ENGAGE_TTL_MS
            }
        });

        let now = now_ms();
        let mut map = self.locks.lock().expect("target lock map");

        if let Some(entries) = map.get_mut(id) {
            entries.retain(|e| now - e.ts_ms < e.ttl_ms);
            if entries.is_empty() {
                map.remove(id);
            }
        }

        let cross_node_enabled = self.resolve_cross_node(cross_node_option, setting_cross_node);
        let entries = map.entry(id.to_string()).or_default();

        if cross_node_enabled {
            for entry in entries.iter() {
                if entry.account_id != account_id {
                    let remaining = entry.ts_ms + entry.ttl_ms - now;
                    if remaining > 0 {
                        return LockDecision {
                            ok: false,
                            reason: Some("TARGET_LOCKED_BY_ANOTHER_NODE".to_string()),
                            free_in_ms: Some(remaining),
                            locked_by: Some(entry.account_id.clone()),
                            kind: Some(entry.kind.clone()),
                        };
                    }
                }
            }
        }

        if let Some(my_entry) = entries.iter_mut().find(|e| e.account_id == account_id) {
            let remaining = my_entry.ts_ms + my_entry.ttl_ms - now;
            if remaining > 0 {
                return LockDecision {
                    ok: false,
                    reason: Some("TARGET_ALREADY_ENGAGED_BY_THIS_NODE".to_string()),
                    free_in_ms: Some(remaining),
                    locked_by: Some(account_id.to_string()),
                    kind: Some(my_entry.kind.clone()),
                };
            }
            my_entry.ts_ms = now;
            my_entry.kind = resolved_kind.to_string();
            my_entry.ttl_ms = ttl_ms;
        } else {
            entries.push(LockEntry {
                account_id: account_id.to_string(),
                ts_ms: now,
                kind: resolved_kind.to_string(),
                ttl_ms,
            });
        }

        LockDecision {
            ok: true,
            reason: None,
            free_in_ms: None,
            locked_by: None,
            kind: None,
        }
    }

    pub fn release(&self, tweet_id: &str, account_id: &str) {
        let id = tweet_id.trim();
        if id.is_empty() || account_id.trim().is_empty() {
            return;
        }
        let mut map = self.locks.lock().expect("target lock map");
        if let Some(entries) = map.get_mut(id) {
            entries.retain(|e| e.account_id != account_id);
            if entries.is_empty() {
                map.remove(id);
            }
        }
    }

    pub fn prune(&self) {
        let now = now_ms();
        let mut map = self.locks.lock().expect("target lock map");
        map.retain(|_, entries| {
            entries.retain(|e| now - e.ts_ms < e.ttl_ms);
            !entries.is_empty()
        });
    }

    pub fn snapshot(&self) -> TargetLockSnapshot {
        self.prune();
        let map = self.locks.lock().expect("target lock map");
        let total_locks = map.values().map(Vec::len).sum();
        TargetLockSnapshot {
            active_targets: map.len(),
            total_locks,
        }
    }

    pub fn clear(&self) -> usize {
        let mut map = self.locks.lock().expect("target lock map");
        let count: usize = map.values().map(Vec::len).sum();
        map.clear();
        count
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn enforces_cross_node_and_same_node_locks() {
        let tl = TargetLock::new();
        tl.set_cross_node_lock(Some(true));

        let a = tl.acquire("1001", "acc_a", "ENGAGE", None, None, true);
        assert!(a.ok);

        let b = tl.acquire("1001", "acc_b", "ENGAGE", None, None, true);
        assert!(!b.ok);
        assert_eq!(b.reason.as_deref(), Some("TARGET_LOCKED_BY_ANOTHER_NODE"));

        let r = tl.acquire("1002", "acc_a", "REPLY", None, None, true);
        assert!(r.ok);
        let rb = tl.acquire("1002", "acc_b", "REPLY", None, None, true);
        assert!(!rb.ok);
        assert!(rb.free_in_ms.unwrap() > 13 * 60 * 1000);

        tl.release("1001", "acc_a");
        let b2 = tl.acquire("1001", "acc_b", "ENGAGE", None, None, true);
        assert!(b2.ok);

        let b_no_cross = tl.acquire("1003", "acc_a", "ENGAGE", None, Some(false), true);
        assert!(b_no_cross.ok);
        let b_allowed = tl.acquire("1003", "acc_b", "ENGAGE", None, Some(false), true);
        assert!(b_allowed.ok);
        let a_dup = tl.acquire("1003", "acc_a", "ENGAGE", None, Some(false), true);
        assert!(!a_dup.ok);
        assert_eq!(
            a_dup.reason.as_deref(),
            Some("TARGET_ALREADY_ENGAGED_BY_THIS_NODE")
        );

        assert!(tl.clear() >= 3);
        assert_eq!(tl.snapshot().total_locks, 0);
    }
}
