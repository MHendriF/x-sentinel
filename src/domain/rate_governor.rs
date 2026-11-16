//! Persistent per-account action budget, strike ledger, warmup caps, quiet hours, and Gaussian pacing.

use chrono::{Timelike, Utc};
use chrono_tz::Tz;
use rand::Rng;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::collections::HashMap;
use std::f64::consts::PI;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::domain::models::{Account, Settings};

const MIN_MS: i64 = 60 * 1000;
const HOUR_MS: i64 = 60 * MIN_MS;
const BASE_COOLDOWN_MS: i64 = 30 * MIN_MS;
const MAX_COOLDOWN_MS: i64 = 12 * HOUR_MS;
const STRIKE_WINDOW_MS: i64 = 24 * HOUR_MS;
const STRIKES_TO_DISABLE: u32 = 3;
const DISABLE_MS: i64 = 48 * HOUR_MS;

const DEFAULT_HOURLY_QUOTA: u64 = 10;
const DEFAULT_DAILY_QUOTA: u64 = 45;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AccountGovernorState {
    #[serde(default)]
    pub window_hourly: Vec<i64>,
    #[serde(default)]
    pub day_count: u64,
    #[serde(default)]
    pub strikes: u32,
    #[serde(default)]
    pub cooldown_until: i64,
    #[serde(default = "default_day_by_action")]
    pub day_by_action: HashMap<String, u64>,
    #[serde(default = "today_key")]
    pub day_key: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_flag_at: Option<i64>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub flag_codes: Vec<u16>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_action_at: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub timezone_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_rate_state: Option<Value>,
}

fn default_day_by_action() -> HashMap<String, u64> {
    HashMap::from([
        ("LIKE".to_string(), 0),
        ("RETWEET".to_string(), 0),
        ("REPLY".to_string(), 0),
    ])
}

fn today_key() -> String {
    Utc::now().format("%Y-%m-%d").to_string()
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuietHourInfo {
    pub is_quiet: bool,
    pub local_hour: u32,
    pub timezone: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CanActResult {
    pub allowed: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub retry_in_ms: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FlagOutcome {
    pub strikes: u32,
    pub cooldown_ms: i64,
    pub disabled: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GovernorSnapshot {
    pub strikes: u32,
    pub cooldown_until: i64,
    pub cooling_down: bool,
    pub used_this_hour: usize,
    pub used_today: u64,
    pub hourly_quota: u64,
    pub daily_quota: u64,
    pub risk_score: u32,
    pub quiet_hour: QuietHourInfo,
    pub day_by_action: HashMap<String, u64>,
}

#[derive(Debug, Clone, Default)]
pub struct CanActOptions {
    pub ignore_quiet_hours: bool,
    pub enforce_warmup_gate: Option<bool>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RateLimitHeaders {
    pub limit: Option<u64>,
    pub remaining: Option<u64>,
    pub reset: Option<i64>,
    pub retry_after: Option<u64>,
}

pub fn is_flag_code(code: u16) -> bool {
    matches!(code, 88 | 185 | 226 | 326 | 344 | 403 | 429)
}

pub fn warmup_cap(day: u32, action: &str) -> Option<u64> {
    let caps = match day {
        1 | 2 => (0, 0, 0),
        3 => (3, 0, 0),
        4 => (6, 1, 0),
        5 => (8, 2, 0),
        6 => (12, 4, 1),
        7 => (15, 5, 2),
        _ => return None,
    };
    Some(match action {
        "LIKE" => caps.0,
        "RETWEET" => caps.1,
        "REPLY" => caps.2,
        _ => 0,
    })
}

/// Box-Muller Gaussian sample clamped to `[floor, ceil]`.
pub fn gauss(median: f64, sd: f64, floor: f64, ceil: f64) -> u64 {
    let mut rng = rand::thread_rng();
    let u = (1.0_f64 - rng.gen_range(0.0_f64..1.0_f64)).max(1e-12);
    let v = rng.gen_range(0.0_f64..1.0_f64);
    let z = (-2.0 * u.ln()).sqrt() * (2.0 * PI * v).cos();
    (median + z * sd).round().clamp(floor, ceil) as u64
}

pub fn inter_vector_delay(multiplier: f64) -> u64 {
    let base = gauss(75_000.0, 30_000.0, 45_000.0, 180_000.0) as f64;
    let m = if multiplier.is_finite() && multiplier >= 1.0 {
        multiplier
    } else {
        1.0
    };
    (base * m).round() as u64
}

pub fn account_switch_delay() -> u64 {
    gauss(60_000.0, 30_000.0, 20_000.0, 180_000.0)
}

pub fn inter_target_delay() -> u64 {
    gauss(150_000.0, 60_000.0, 60_000.0, 420_000.0)
}

fn load_state(account: &Account) -> AccountGovernorState {
    serde_json::from_value(account.state.clone()).unwrap_or_else(|_| AccountGovernorState {
        window_hourly: Vec::new(),
        day_count: 0,
        strikes: 0,
        cooldown_until: 0,
        day_by_action: default_day_by_action(),
        day_key: today_key(),
        last_flag_at: None,
        flag_codes: Vec::new(),
        last_action_at: None,
        timezone_id: None,
        last_rate_state: None,
    })
}

fn save_state(account: &mut Account, st: &AccountGovernorState) {
    if let Ok(val) = serde_json::to_value(st) {
        account.state = val;
    }
}

pub fn prune_state(account: &mut Account) -> AccountGovernorState {
    let mut st = load_state(account);
    let now = now_ms();
    st.window_hourly.retain(|&t| now - t < HOUR_MS);
    let today = today_key();
    if st.day_key != today {
        st.day_key = today;
        st.day_count = 0;
        st.day_by_action = default_day_by_action();
    }
    if st.strikes > 0
        && let Some(last_flag) = st.last_flag_at
        && now - last_flag > STRIKE_WINDOW_MS
    {
        st.strikes = 0;
    }
    save_state(account, &st);
    st
}

pub fn is_quiet_hour(account: &Account) -> QuietHourInfo {
    let st = load_state(account);
    let tz_str = st
        .timezone_id
        .or_else(|| {
            account
                .extra
                .get("timezone")
                .and_then(|v| v.as_str())
                .map(String::from)
        })
        .unwrap_or_else(|| "Asia/Jakarta".to_string());

    if let Ok(tz) = tz_str.parse::<Tz>() {
        let local_hour = Utc::now().with_timezone(&tz).hour();
        return QuietHourInfo {
            is_quiet: !(7..23).contains(&local_hour),
            local_hour,
            timezone: tz_str,
        };
    }

    let local_hour = Utc::now().hour();
    QuietHourInfo {
        is_quiet: !(7..23).contains(&local_hour),
        local_hour,
        timezone: "UTC".to_string(),
    }
}

fn effective_quotas(settings: &Settings) -> (u64, u64) {
    let hourly = settings.hourly_limit.min(DEFAULT_HOURLY_QUOTA).max(1);
    let daily = settings.daily_limit.min(DEFAULT_DAILY_QUOTA).max(1);
    (hourly, daily)
}

pub fn calculate_risk_score(account: &mut Account, settings: &Settings) -> u32 {
    let st = prune_state(account);
    let now = now_ms();
    let mut score: u32 = (st.strikes * 25).min(60);

    if st.cooldown_until > now {
        score += 20;
    }

    let (hourly_q, daily_q) = effective_quotas(settings);
    let hourly_ratio = (st.window_hourly.len() as f64 / hourly_q as f64).min(1.0);
    let daily_ratio = (st.day_count as f64 / daily_q as f64).min(1.0);
    score += (hourly_ratio * 10.0 + daily_ratio * 10.0).round() as u32;

    if settings.enforce_warmup_gate && account.warmup_day <= 2 {
        score += 10;
    }

    score.min(100)
}

pub fn can_act(
    account: &mut Account,
    action: &str,
    settings: &Settings,
    options: &CanActOptions,
) -> CanActResult {
    if !account.enabled {
        return CanActResult {
            allowed: false,
            reason: Some("NODE_DISABLED".to_string()),
            retry_in_ms: None,
        };
    }

    let st = prune_state(account);
    let now = now_ms();

    if st.cooldown_until > now {
        return CanActResult {
            allowed: false,
            reason: Some("COOLDOWN".to_string()),
            retry_in_ms: Some(st.cooldown_until - now),
        };
    }

    if !options.ignore_quiet_hours {
        let quiet = is_quiet_hour(account);
        if quiet.is_quiet {
            return CanActResult {
                allowed: false,
                reason: Some("QUIET_HOURS".to_string()),
                retry_in_ms: None,
            };
        }
    }

    let (hourly_q, daily_q) = effective_quotas(settings);
    if (st.window_hourly.len() as u64) >= hourly_q {
        let oldest = st.window_hourly.first().copied().unwrap_or(now);
        return CanActResult {
            allowed: false,
            reason: Some("HOURLY_QUOTA".to_string()),
            retry_in_ms: Some((oldest + HOUR_MS - now).max(0)),
        };
    }

    if st.day_count >= daily_q {
        return CanActResult {
            allowed: false,
            reason: Some("DAILY_QUOTA".to_string()),
            retry_in_ms: None,
        };
    }

    let enforce_warmup = options
        .enforce_warmup_gate
        .unwrap_or(settings.enforce_warmup_gate);
    if enforce_warmup && let Some(cap) = warmup_cap(account.warmup_day, action) {
        let used = st.day_by_action.get(action).copied().unwrap_or(0);
        if used >= cap {
            return CanActResult {
                allowed: false,
                reason: Some(format!("WARMUP_DAY_{}_{}_CAP", account.warmup_day, action)),
                retry_in_ms: None,
            };
        }
    }

    CanActResult {
        allowed: true,
        reason: None,
        retry_in_ms: None,
    }
}

pub fn register_action(account: &mut Account, action: &str) {
    let mut st = prune_state(account);
    st.window_hourly.push(now_ms());
    st.day_count += 1;
    let entry = st.day_by_action.entry(action.to_string()).or_insert(0);
    *entry += 1;
    st.last_action_at = Some(Utc::now().to_rfc3339());
    save_state(account, &st);
}

pub fn register_flag(account: &mut Account, code: u16) -> Option<FlagOutcome> {
    if !is_flag_code(code) {
        return None;
    }
    let mut st = prune_state(account);
    let now = now_ms();
    st.strikes += 1;
    st.last_flag_at = Some(now);
    st.flag_codes.push(code);
    if st.flag_codes.len() > 10 {
        let drain = st.flag_codes.len() - 10;
        st.flag_codes.drain(0..drain);
    }

    let shift = st.strikes.saturating_sub(1).min(10);
    let backoff = (BASE_COOLDOWN_MS.saturating_mul(1_i64 << shift)).min(MAX_COOLDOWN_MS);
    st.cooldown_until = now + backoff;

    let mut disabled = false;
    if st.strikes >= STRIKES_TO_DISABLE {
        account.enabled = false;
        account.disabled_until = Some(now + DISABLE_MS);
        let joined: Vec<String> = st.flag_codes.iter().map(u16::to_string).collect();
        account.disabled_reason = Some(format!(
            "Auto-quarantine: {} flags in 24h (codes: {})",
            st.strikes,
            joined.join(",")
        ));
        disabled = true;
    }

    save_state(account, &st);
    Some(FlagOutcome {
        strikes: st.strikes,
        cooldown_ms: backoff,
        disabled,
    })
}

pub fn handle_rate_limit_headers(account: &mut Account, rate: &RateLimitHeaders) -> bool {
    let mut st = prune_state(account);
    let now = now_ms();
    let mut updated = false;

    if let Some(retry_after) = rate.retry_after
        && retry_after > 0
    {
        let cooldown_ms = (retry_after as i64) * 1000;
        st.cooldown_until = st.cooldown_until.max(now + cooldown_ms);
        updated = true;
    }

    if rate.remaining == Some(0)
        && let Some(reset) = rate.reset
    {
        let reset_ms = if reset > 1_000_000_000 {
            reset * 1000
        } else {
            now + reset * 1000
        };
        let jitter = rand::thread_rng().gen_range(5_000..=15_000);
        st.cooldown_until = st.cooldown_until.max(reset_ms + jitter);
        updated = true;
    }

    st.last_rate_state = Some(json!({
        "limit": rate.limit,
        "remaining": rate.remaining,
        "reset": rate.reset,
        "retryAfter": rate.retry_after,
        "updatedAt": now,
    }));

    save_state(account, &st);
    updated
}

pub fn snapshot(account: &mut Account, settings: &Settings) -> GovernorSnapshot {
    let st = prune_state(account);
    let (hourly_quota, daily_quota) = effective_quotas(settings);
    let risk_score = calculate_risk_score(account, settings);
    let quiet_hour = is_quiet_hour(account);
    GovernorSnapshot {
        strikes: st.strikes,
        cooldown_until: st.cooldown_until,
        cooling_down: st.cooldown_until > now_ms(),
        used_this_hour: st.window_hourly.len(),
        used_today: st.day_count,
        hourly_quota,
        daily_quota,
        risk_score,
        quiet_hour,
        day_by_action: st.day_by_action,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn enforces_warmup_quotas_strikes_and_rate_headers() {
        let settings = Settings::default();
        let strict = CanActOptions {
            ignore_quiet_hours: true,
            enforce_warmup_gate: Some(true),
        };

        let mut d1 = Account {
            id: "a1".into(),
            warmup_day: 1,
            enabled: true,
            ..Default::default()
        };
        assert!(!can_act(&mut d1, "LIKE", &settings, &strict).allowed);

        let mut d3 = Account {
            id: "a3".into(),
            warmup_day: 3,
            enabled: true,
            ..Default::default()
        };
        assert!(can_act(&mut d3, "LIKE", &settings, &strict).allowed);
        assert!(!can_act(&mut d3, "RETWEET", &settings, &strict).allowed);
        for _ in 0..3 {
            register_action(&mut d3, "LIKE");
        }
        assert!(!can_act(&mut d3, "LIKE", &settings, &strict).allowed);

        let mut flagged = Account {
            id: "af".into(),
            warmup_day: 8,
            enabled: true,
            ..Default::default()
        };
        let s1 = register_flag(&mut flagged, 226).unwrap();
        assert_eq!(s1.strikes, 1);
        assert_eq!(s1.cooldown_ms, 30 * MIN_MS);
        let s2 = register_flag(&mut flagged, 226).unwrap();
        assert_eq!(s2.cooldown_ms, 60 * MIN_MS);
        let s3 = register_flag(&mut flagged, 344).unwrap();
        assert!(s3.disabled);
        assert!(!flagged.enabled);

        let mut rate_acc = Account {
            id: "ar".into(),
            warmup_day: 8,
            enabled: true,
            ..Default::default()
        };
        handle_rate_limit_headers(
            &mut rate_acc,
            &RateLimitHeaders {
                limit: Some(50),
                remaining: Some(10),
                reset: None,
                retry_after: Some(120),
            },
        );
        let res = can_act(
            &mut rate_acc,
            "LIKE",
            &settings,
            &CanActOptions {
                ignore_quiet_hours: true,
                enforce_warmup_gate: Some(false),
            },
        );
        assert!(!res.allowed);
        assert_eq!(res.reason.as_deref(), Some("COOLDOWN"));
    }
}
