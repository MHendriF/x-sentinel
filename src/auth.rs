//! Session authentication, scrypt/SHA-256 password verification, HMAC-SHA256 tokens, TOTP 2FA, and rate limiting.

use chrono::Utc;
use hmac::{Hmac, Mac};
use qrcode::QrCode;
use qrcode::render::svg;
use rand::RngCore;
use scrypt::{Params as ScryptParams, scrypt};
use sha1::Sha1;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::{Mutex, RwLock};
use std::time::{SystemTime, UNIX_EPOCH};
use subtle::ConstantTimeEq;

use crate::config::AppConfig;
use crate::db::write_json_atomic;
use crate::domain::models::AuthConfig;

const MAX_FAILED_ATTEMPTS: u32 = 5;
const LOCKOUT_WINDOW_MS: i64 = 60_000;
const BASE32_ALPHABET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

#[derive(Debug, Clone)]
struct RateLimitRecord {
    count: u32,
    last_attempt_ms: i64,
}

#[derive(Debug, Clone)]
pub enum RateLimitDecision {
    Allowed,
    Locked { remaining_sec: u64 },
}

/// Manages `auth_config.json`, password hashes, TOTP 2FA, session cookies, and IP login lockouts.
pub struct AuthService {
    config_path: PathBuf,
    default_username: String,
    default_password: String,
    session_secret: String,
    pub session_cookie_name: String,
    pub session_duration_ms: i64,
    pub auth_enabled: bool,
    auth_cache: RwLock<AuthConfig>,
    failed_attempts: Mutex<HashMap<String, RateLimitRecord>>,
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

fn to_base36(mut n: u64) -> String {
    const DIGITS: &[u8] = b"0123456789abcdefghijklmnopqrstuvwxyz";
    if n == 0 {
        return "0".to_string();
    }
    let mut out = Vec::new();
    while n > 0 {
        out.push(DIGITS[(n % 36) as usize]);
        n /= 36;
    }
    out.reverse();
    String::from_utf8(out).unwrap_or_else(|_| "0".to_string())
}

fn from_base36(s: &str) -> Option<i64> {
    i64::from_str_radix(s, 36).ok()
}

pub fn base32_encode(data: &[u8]) -> String {
    let mut bits: u32 = 0;
    let mut value: u32 = 0;
    let mut output = String::new();

    for &byte in data {
        value = (value << 8) | u32::from(byte);
        bits += 8;
        while bits >= 5 {
            output.push(BASE32_ALPHABET[((value >> (bits - 5)) & 31) as usize] as char);
            bits -= 5;
        }
    }
    if bits > 0 {
        output.push(BASE32_ALPHABET[((value << (5 - bits)) & 31) as usize] as char);
    }
    output
}

pub fn base32_decode(input: &str) -> Vec<u8> {
    let cleaned: String = input
        .to_ascii_uppercase()
        .chars()
        .filter(|c| !matches!(c, ' ' | '\t' | '\n' | '\r' | '=' | '-'))
        .collect();
    let mut bytes = Vec::new();
    let mut bits: u32 = 0;
    let mut value: u32 = 0;

    for ch in cleaned.bytes() {
        if let Some(idx) = BASE32_ALPHABET.iter().position(|&b| b == ch) {
            value = (value << 5) | (idx as u32);
            bits += 5;
            if bits >= 8 {
                bytes.push(((value >> (bits - 8)) & 255) as u8);
                bits -= 8;
            }
        }
    }
    bytes
}

fn pct_encode(raw: &str) -> String {
    url::form_urlencoded::byte_serialize(raw.as_bytes())
        .collect::<String>()
        .replace('+', "%20")
}

impl AuthService {
    pub fn new(cfg: &AppConfig) -> Self {
        let config_path = cfg.data_dir.join("auth_config.json");
        let defaults = AuthConfig {
            username: cfg.admin_username.clone(),
            password_hash: None,
            session_epoch: 1,
            totp_enabled: false,
            totp_secret: None,
            updated_at: Utc::now().to_rfc3339(),
        };

        let loaded = if config_path.exists() {
            match fs::read_to_string(&config_path) {
                Ok(raw) => serde_json::from_str::<AuthConfig>(&raw).unwrap_or(defaults),
                Err(_) => defaults,
            }
        } else {
            defaults
        };

        Self {
            config_path,
            default_username: cfg.admin_username.clone(),
            default_password: cfg.admin_password.clone(),
            session_secret: cfg.session_secret.clone(),
            session_cookie_name: cfg.session_cookie_name.clone(),
            session_duration_ms: cfg.session_duration_ms,
            auth_enabled: cfg.auth_enabled,
            auth_cache: RwLock::new(loaded),
            failed_attempts: Mutex::new(HashMap::new()),
        }
    }

    pub fn get_auth_config(&self) -> AuthConfig {
        self.auth_cache.read().expect("auth lock").clone()
    }

    pub fn save_auth_config(&self, patch: AuthConfig) -> Result<AuthConfig, String> {
        let mut guard = self.auth_cache.write().expect("auth lock");
        let mut next = patch;
        next.updated_at = Utc::now().to_rfc3339();
        write_json_atomic(&self.config_path, &next)?;
        *guard = next.clone();
        Ok(next)
    }

    pub fn hash_password(password: &str) -> Result<String, String> {
        let mut salt_bytes = [0u8; 16];
        rand::thread_rng().fill_bytes(&mut salt_bytes);
        let salt_hex = hex::encode(salt_bytes);

        let params = ScryptParams::new(14, 8, 1, 64).map_err(|e| e.to_string())?;
        let mut derived = [0u8; 64];
        scrypt(password.as_bytes(), salt_hex.as_bytes(), &params, &mut derived)
            .map_err(|e| e.to_string())?;

        Ok(format!("{salt_hex}:{}", hex::encode(derived)))
    }

    pub fn verify_password(&self, input_password: &str) -> bool {
        if input_password.is_empty() {
            return false;
        }
        let current = self.get_auth_config();
        if let Some(stored) = &current.password_hash
            && let Some((salt, stored_hex)) = stored.split_once(':')
            && let Ok(params) = ScryptParams::new(14, 8, 1, 64)
        {
            let mut derived = [0u8; 64];
            if scrypt(input_password.as_bytes(), salt.as_bytes(), &params, &mut derived).is_ok() {
                let computed_hex = hex::encode(derived);
                let a = computed_hex.as_bytes();
                let b = stored_hex.as_bytes();
                return a.len() == b.len() && bool::from(a.ct_eq(b));
            }
            return false;
        }

        let target = if self.default_password.is_empty() {
            "sentinel123"
        } else {
            self.default_password.as_str()
        };
        let in_hash = Sha256::digest(input_password.as_bytes());
        let tgt_hash = Sha256::digest(target.as_bytes());
        bool::from(in_hash.ct_eq(&tgt_hash))
    }

    pub fn verify_username(&self, input_username: &str) -> bool {
        if input_username.trim().is_empty() {
            return false;
        }
        let current = self.get_auth_config();
        let target = if current.username.is_empty() {
            self.default_username.as_str()
        } else {
            current.username.as_str()
        };
        let in_hash = Sha256::digest(input_username.trim().to_lowercase().as_bytes());
        let tgt_hash = Sha256::digest(target.trim().to_lowercase().as_bytes());
        bool::from(in_hash.ct_eq(&tgt_hash))
    }

    pub fn update_credentials(
        &self,
        new_username: Option<&str>,
        new_password: Option<&str>,
    ) -> Result<AuthConfig, String> {
        let mut current = self.get_auth_config();
        if let Some(u) = new_username
            && !u.trim().is_empty()
        {
            current.username = u.trim().to_string();
        }
        if let Some(p) = new_password
            && !p.is_empty()
        {
            current.password_hash = Some(Self::hash_password(p)?);
        }
        current.session_epoch = current.session_epoch.saturating_add(1);
        self.save_auth_config(current)
    }

    pub fn revoke_all_sessions(&self) -> Result<u64, String> {
        let mut current = self.get_auth_config();
        current.session_epoch = current.session_epoch.saturating_add(1);
        let saved = self.save_auth_config(current)?;
        Ok(saved.session_epoch)
    }

    pub fn generate_totp_secret() -> String {
        let mut bytes = [0u8; 20];
        rand::thread_rng().fill_bytes(&mut bytes);
        base32_encode(&bytes)
    }

    pub fn generate_totp_token_at(secret: &str, time_step_offset: i64, unix_secs: i64) -> String {
        let key = base32_decode(secret);
        let counter = (unix_secs / 30) + time_step_offset;
        let counter_bytes = (counter as u64).to_be_bytes();

        let mut mac =
            Hmac::<Sha1>::new_from_slice(&key).expect("HMAC-SHA1 accepts any key length");
        mac.update(&counter_bytes);
        let hmac = mac.finalize().into_bytes();

        let offset = (hmac[hmac.len() - 1] & 0x0f) as usize;
        let code = ((u32::from(hmac[offset]) & 0x7f) << 24)
            | (u32::from(hmac[offset + 1]) << 16)
            | (u32::from(hmac[offset + 2]) << 8)
            | u32::from(hmac[offset + 3]);

        format!("{:06}", code % 1_000_000)
    }

    pub fn verify_totp_token(token: &str, secret: &str) -> bool {
        let clean = token.trim();
        if clean.len() != 6 || !clean.chars().all(|c| c.is_ascii_digit()) || secret.is_empty() {
            return false;
        }
        let now_secs = now_ms() / 1000;
        for offset in -1..=1 {
            let expected = Self::generate_totp_token_at(secret, offset, now_secs);
            if bool::from(clean.as_bytes().ct_eq(expected.as_bytes())) {
                return true;
            }
        }
        false
    }

    pub fn get_otpauth_url(username: &str, secret: &str) -> String {
        let issuer = "X-SENTINEL";
        let label = pct_encode(&format!("{issuer}:{username}"));
        format!(
            "otpauth://totp/{label}?secret={secret}&issuer={}&algorithm=SHA1&digits=6&period=30",
            pct_encode(issuer)
        )
    }

    pub fn render_totp_qr_svg(otpauth_url: &str) -> Result<String, String> {
        let code = QrCode::new(otpauth_url.as_bytes()).map_err(|e| e.to_string())?;
        Ok(code
            .render::<svg::Color>()
            .min_dimensions(180, 180)
            .dark_color(svg::Color("#090b0f"))
            .light_color(svg::Color("#f1f3f7"))
            .build())
    }

    pub fn check_rate_limit(&self, ip: &str) -> RateLimitDecision {
        let mut map = self.failed_attempts.lock().expect("rate limit lock");
        let now = now_ms();
        let Some(rec) = map.get(ip) else {
            return RateLimitDecision::Allowed;
        };
        if now - rec.last_attempt_ms > LOCKOUT_WINDOW_MS {
            map.remove(ip);
            return RateLimitDecision::Allowed;
        }
        if rec.count >= MAX_FAILED_ATTEMPTS {
            let rem_ms = (rec.last_attempt_ms + LOCKOUT_WINDOW_MS - now).max(1000);
            let remaining_sec = ((rem_ms + 999) / 1000) as u64;
            return RateLimitDecision::Locked { remaining_sec };
        }
        RateLimitDecision::Allowed
    }

    pub fn record_failed_attempt(&self, ip: &str) {
        let mut map = self.failed_attempts.lock().expect("rate limit lock");
        let now = now_ms();
        match map.get_mut(ip) {
            Some(rec) if now - rec.last_attempt_ms <= LOCKOUT_WINDOW_MS => {
                rec.count += 1;
                rec.last_attempt_ms = now;
            }
            _ => {
                map.insert(
                    ip.to_string(),
                    RateLimitRecord {
                        count: 1,
                        last_attempt_ms: now,
                    },
                );
            }
        }
    }

    pub fn reset_rate_limit(&self, ip: &str) {
        self.failed_attempts.lock().expect("rate limit lock").remove(ip);
    }

    pub fn create_session_token(&self) -> String {
        let epoch = self.get_auth_config().session_epoch.max(1);
        let ts_str = to_base36(now_ms().max(0) as u64);
        let mut nonce_bytes = [0u8; 16];
        rand::thread_rng().fill_bytes(&mut nonce_bytes);
        let nonce = hex::encode(nonce_bytes);
        let payload = format!("{ts_str}.{nonce}.{epoch}");

        let mut mac = Hmac::<Sha256>::new_from_slice(self.session_secret.as_bytes())
            .expect("HMAC-SHA256 accepts any key length");
        mac.update(payload.as_bytes());
        let sig = hex::encode(mac.finalize().into_bytes());
        format!("{payload}.{sig}")
    }

    pub fn verify_session_token(&self, token: &str) -> bool {
        let parts: Vec<&str> = token.split('.').collect();
        if parts.len() != 4 {
            return false;
        }
        let (ts_str, nonce, epoch_str, sig) = (parts[0], parts[1], parts[2], parts[3]);
        let Some(ts) = from_base36(ts_str) else {
            return false;
        };
        let now = now_ms();
        if now - ts > self.session_duration_ms || ts > now + 60_000 {
            return false;
        }
        let current_epoch = self.get_auth_config().session_epoch.max(1);
        let Ok(token_epoch) = epoch_str.parse::<u64>() else {
            return false;
        };
        if token_epoch != current_epoch {
            return false;
        }

        let payload = format!("{ts_str}.{nonce}.{epoch_str}");
        let mut mac = Hmac::<Sha256>::new_from_slice(self.session_secret.as_bytes())
            .expect("HMAC-SHA256 accepts any key length");
        mac.update(payload.as_bytes());
        let expected_sig = hex::encode(mac.finalize().into_bytes());

        sig.len() == expected_sig.len()
            && bool::from(sig.as_bytes().ct_eq(expected_sig.as_bytes()))
    }

    pub fn build_session_cookie(&self, token: &str) -> String {
        let max_age_sec = (self.session_duration_ms / 1000).max(0);
        format!(
            "{}={}; Path=/; HttpOnly; SameSite=Lax; Max-Age={}",
            self.session_cookie_name,
            pct_encode(token),
            max_age_sec
        )
    }

    pub fn build_clear_session_cookie(&self) -> String {
        format!(
            "{}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
            self.session_cookie_name
        )
    }
}

/// Extract a named cookie value from a raw `Cookie` header string.
pub fn extract_cookie_value(cookie_header: &str, target_name: &str) -> Option<String> {
    for pair in cookie_header.split(';') {
        if let Some((k, v)) = pair.split_once('=')
            && k.trim() == target_name
        {
            let trimmed = v.trim();
            return Some(
                url::form_urlencoded::parse(format!("v={trimmed}").as_bytes())
                    .find(|(key, _)| key == "v")
                    .map(|(_, val)| val.into_owned())
                    .unwrap_or_else(|| trimmed.to_string()),
            );
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn scrypt_session_token_epoch_and_totp_verify() {
        let tmp = TempDir::new().unwrap();
        let cfg = AppConfig::with_paths(tmp.path(), tmp.path(), &[]);
        let auth = AuthService::new(&cfg);

        // Default fallback password check
        assert!(auth.verify_password("sentinel123"));
        assert!(!auth.verify_password("wrong"));

        // Scrypt password hashing + epoch invalidation
        let token_before = auth.create_session_token();
        assert!(auth.verify_session_token(&token_before));

        auth.update_credentials(Some("opsadmin"), Some("newpass123"))
            .unwrap();
        assert!(!auth.verify_session_token(&token_before));
        assert!(auth.verify_username("opsadmin"));
        assert!(auth.verify_password("newpass123"));
        assert!(!auth.verify_password("sentinel123"));

        let token_after = auth.create_session_token();
        assert!(auth.verify_session_token(&token_after));

        // TOTP RFC 6238 verification
        let secret = AuthService::generate_totp_secret();
        let now_s = now_ms() / 1000;
        let code = AuthService::generate_totp_token_at(&secret, 0, now_s);
        assert!(AuthService::verify_totp_token(&code, &secret));
        assert!(!AuthService::verify_totp_token("abcdef", &secret));
        let svg = AuthService::render_totp_qr_svg(&AuthService::get_otpauth_url("opsadmin", &secret)).unwrap();
        assert!(svg.contains("<svg"));
    }
}
