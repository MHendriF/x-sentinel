//! Local loopback Origin/Host security guard and secret masking helpers.

use axum::Json;
use axum::extract::Request;
use axum::http::{HeaderMap, StatusCode};
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};
use regex::Regex;
use serde_json::json;
use std::sync::LazyLock;
use url::Url;

use crate::domain::models::{Account, Settings};
use crate::domain::proxy::parse_proxy;

pub const MASK: &str = "••••";

static ALLOWED_HOST_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?i)^(localhost|127\.0\.0\.1)(:\d+)?$").expect("valid host regex"));

/// Check whether an HTTP Origin string belongs to localhost or 127.0.0.1.
pub fn is_allowed_origin(origin: &str) -> bool {
    let trimmed = origin.trim();
    if trimmed.is_empty() {
        return false;
    }
    let Ok(parsed) = Url::parse(trimmed) else {
        return false;
    };
    let scheme = parsed.scheme();
    if scheme != "http" && scheme != "https" {
        return false;
    }
    matches!(parsed.host_str(), Some("localhost") | Some("127.0.0.1"))
}

fn forbidden(code: &str, message: &str) -> Response {
    (
        StatusCode::FORBIDDEN,
        Json(json!({
            "success": false,
            "error": code,
            "message": message,
        })),
    )
        .into_response()
}

/// Validate request headers against cross-origin browser access and DNS rebinding.
pub fn validate_request_headers(headers: &HeaderMap) -> Result<(), Response> {
    if let Some(origin) = headers.get("origin").and_then(|v| v.to_str().ok())
        && !is_allowed_origin(origin)
    {
        return Err(forbidden(
            "FORBIDDEN_ORIGIN",
            "Requests from external origins are not permitted on this local instance.",
        ));
    }

    if let Some(sec_fetch_site) = headers.get("sec-fetch-site").and_then(|v| v.to_str().ok())
        && sec_fetch_site.eq_ignore_ascii_case("cross-site")
    {
        return Err(forbidden(
            "FORBIDDEN_CROSS_SITE",
            "Cross-site requests are blocked by security policy.",
        ));
    }

    if let Some(referer) = headers.get("referer").and_then(|v| v.to_str().ok()) {
        match Url::parse(referer) {
            Ok(parsed) => {
                let ref_origin = parsed.origin().ascii_serialization();
                if !is_allowed_origin(&ref_origin) {
                    return Err(forbidden(
                        "FORBIDDEN_REFERER",
                        "Requests from external referrers are not permitted on this local instance.",
                    ));
                }
            }
            Err(_) => {
                return Err(forbidden("INVALID_REFERER", "Invalid Referer header format."));
            }
        }
    }

    if let Some(host) = headers.get("host").and_then(|v| v.to_str().ok())
        && !ALLOWED_HOST_RE.is_match(host)
    {
        return Err(forbidden(
            "FORBIDDEN_HOST",
            "Requests with external Host headers are forbidden (DNS rebinding protection).",
        ));
    }

    Ok(())
}

/// Axum middleware enforcing `validate_request_headers` on every incoming request.
pub async fn origin_guard_middleware(req: Request, next: Next) -> Response {
    if let Err(resp) = validate_request_headers(req.headers()) {
        return resp;
    }
    next.run(req).await
}

/// Mask a secret token leaving only the last 4 characters visible when longer than 8 characters.
pub fn mask_secret(value: &str) -> String {
    if value.is_empty() {
        return String::new();
    }
    let count = value.chars().count();
    if count <= 8 {
        return MASK.to_string();
    }
    let tail: String = value.chars().skip(count - 4).collect();
    format!("{MASK}{tail}")
}

/// Mask proxy credentials while keeping `host:port` visible for the UI (`••••@host:port`).
pub fn mask_proxy_string(proxy: &str) -> String {
    let trimmed = proxy.trim();
    if trimmed.is_empty() {
        return String::new();
    }
    let Some(parsed) = parse_proxy(trimmed) else {
        return MASK.to_string();
    };
    let host_port = if let Some(idx) = parsed.server.find("://") {
        &parsed.server[idx + 3..]
    } else {
        parsed.server.as_str()
    };
    if parsed.username.is_some() {
        format!("{MASK}@{host_port}")
    } else {
        host_port.to_string()
    }
}

pub fn is_masked_value(value: &str) -> bool {
    value.contains(MASK)
}

/// Restore a masked secret field from its stored original when echoed back.
pub fn resolve_secret(incoming: &str, stored: &str) -> String {
    let val = incoming.trim();
    if val.is_empty() {
        return String::new();
    }
    if !is_masked_value(val) {
        return val.to_string();
    }
    stored.trim().to_string()
}

/// Restore a masked proxy string while allowing host:port edits when creds remain masked.
pub fn resolve_proxy_string(stored: &str, incoming: &str) -> String {
    let val = incoming.trim();
    if val.is_empty() {
        return String::new();
    }
    if !is_masked_value(val) {
        return val.to_string();
    }
    if stored.is_empty() {
        return val
            .rsplit(MASK)
            .next()
            .map(str::trim)
            .unwrap_or("")
            .to_string();
    }

    let parsed = parse_proxy(stored.trim());
    let creds = match parsed {
        Some(p) if p.username.is_some() => format!(
            "{}:{}",
            p.username.unwrap_or_default(),
            p.password.unwrap_or_default()
        ),
        _ => String::new(),
    };

    let prefix = format!("{MASK}@");
    if let Some(host_part) = val.strip_prefix(&prefix) {
        if creds.is_empty() {
            return host_part.to_string();
        }
        return format!("{creds}@{host_part}");
    }

    stored.trim().to_string()
}

pub fn redact_account(account: &Account) -> Account {
    let mut copy = account.clone();
    copy.auth_token = mask_secret(&account.auth_token);
    copy.ct0 = if account.ct0.is_empty() {
        String::new()
    } else {
        mask_secret(&account.ct0)
    };
    copy.proxy = mask_proxy_string(&account.proxy);
    copy
}

pub fn redact_settings(settings: &Settings) -> Settings {
    let mut copy = settings.clone();
    copy.ai_api_key = mask_secret(&settings.ai_api_key);
    copy.telegram_bot_token = mask_secret(&settings.telegram_bot_token);
    copy.discord_webhook_url = mask_secret(&settings.discord_webhook_url);
    copy
}

pub fn restore_masked_settings(mut incoming: Settings, stored: &Settings) -> Settings {
    incoming.ai_api_key = resolve_secret(&incoming.ai_api_key, &stored.ai_api_key);
    incoming.telegram_bot_token =
        resolve_secret(&incoming.telegram_bot_token, &stored.telegram_bot_token);
    incoming.discord_webhook_url =
        resolve_secret(&incoming.discord_webhook_url, &stored.discord_webhook_url);
    incoming
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn masks_and_restores_secrets_and_proxies() {
        assert_eq!(mask_secret(""), "");
        assert_eq!(mask_secret("short"), "••••");
        assert_eq!(mask_secret("a1b2c3d4e5f6"), "••••e5f6");

        let masked_proxy = mask_proxy_string("user:pass@31.56.70.92:1338");
        assert_eq!(masked_proxy, "••••@31.56.70.92:1338");

        assert_eq!(
            resolve_proxy_string("user:pass@31.56.70.92:1338", &masked_proxy),
            "user:pass@31.56.70.92:1338"
        );
        assert_eq!(
            resolve_proxy_string("user:pass@31.56.70.92:1338", "••••@1.2.3.4:9000"),
            "user:pass@1.2.3.4:9000"
        );
        assert_eq!(
            resolve_secret("••••e5f6", "a1b2c3d4e5f6"),
            "a1b2c3d4e5f6"
        );
        assert_eq!(resolve_secret("new_raw_key", "old_key"), "new_raw_key");
    }

    #[test]
    fn origin_guard_blocks_external_hosts_and_origins() {
        assert!(is_allowed_origin("http://localhost:3000"));
        assert!(is_allowed_origin("http://127.0.0.1:5173"));
        assert!(!is_allowed_origin("https://evil.example"));

        let mut bad_headers = HeaderMap::new();
        bad_headers.insert("origin", "https://evil.example".parse().unwrap());
        assert!(validate_request_headers(&bad_headers).is_err());

        let mut rebind_headers = HeaderMap::new();
        rebind_headers.insert("host", "evil.example".parse().unwrap());
        assert!(validate_request_headers(&rebind_headers).is_err());

        let mut ok_headers = HeaderMap::new();
        ok_headers.insert("host", "127.0.0.1:3000".parse().unwrap());
        ok_headers.insert("origin", "http://localhost:3000".parse().unwrap());
        assert!(validate_request_headers(&ok_headers).is_ok());
    }
}
