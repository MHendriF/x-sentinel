//! Multi-format proxy parser, structural validator, and live latency / GeoIP prober.

use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{LazyLock, Mutex};
use std::time::{Duration, Instant};

static SERVER_HOST_PORT_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?i)^[a-z][a-z0-9+.-]*://([^:]+):(\d+)$").expect("valid regex"));

/// Parsed proxy configuration matching Playwright's proxy object shape.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ParsedProxy {
    pub server: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub username: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub password: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub raw: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProxyTestResult {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub latency: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ip: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub country: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub country_code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timezone: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub city: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub isp: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GeoData {
    pub timezone: String,
    pub country: String,
    pub country_code: String,
    pub city: String,
    pub locale: String,
    pub languages: Vec<String>,
}

static GEO_CACHE: LazyLock<Mutex<HashMap<String, (GeoData, Instant)>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

/// Parse any supported proxy format (`user:pass@ip:port`, `ip:port:user:pass`, `user:pass:ip:port`, `ip:port`, with optional scheme).
pub fn parse_proxy(proxy_string: &str) -> Option<ParsedProxy> {
    let trimmed = proxy_string.trim();
    if trimmed.is_empty() {
        return None;
    }

    let (protocol, clean_str) = if let Some(rest) = trimmed.strip_prefix("socks5://") {
        ("socks5:", rest)
    } else if let Some(rest) = trimmed.strip_prefix("socks4://") {
        ("socks4:", rest)
    } else if let Some(rest) = trimmed.strip_prefix("http://") {
        ("http:", rest)
    } else if let Some(rest) = trimmed.strip_prefix("https://") {
        ("https:", rest)
    } else {
        ("http:", trimmed)
    };

    if let Some(last_at) = clean_str.rfind('@') {
        let auth_part = &clean_str[..last_at];
        let host_part = &clean_str[last_at + 1..];

        let (username, password) = if let Some(colon) = auth_part.find(':') {
            (
                auth_part[..colon].to_string(),
                auth_part[colon + 1..].to_string(),
            )
        } else {
            (auth_part.to_string(), String::new())
        };

        let (host, port) = if let Some(colon) = host_part.rfind(':') {
            (&host_part[..colon], &host_part[colon + 1..])
        } else {
            (host_part, "")
        };

        let server = if port.is_empty() {
            format!("{protocol}//{host}")
        } else {
            format!("{protocol}//{host}:{port}")
        };

        return Some(ParsedProxy {
            server,
            username: if username.is_empty() { None } else { Some(username) },
            password: if password.is_empty() { None } else { Some(password) },
            raw: Some(trimmed.to_string()),
        });
    }

    let parts: Vec<&str> = clean_str.split(':').collect();
    if parts.len() == 4 {
        let is_first_host = parts[0].contains('.') || parts[0] == "localhost";
        let is_third_host = parts[2].contains('.') || parts[2] == "localhost";

        let (host, port, user, pass) = if is_first_host && parts[1].parse::<u16>().is_ok() {
            (parts[0], parts[1], parts[2], parts[3])
        } else if is_third_host && parts[3].parse::<u16>().is_ok() {
            (parts[2], parts[3], parts[0], parts[1])
        } else {
            (parts[0], parts[1], parts[2], parts[3])
        };

        return Some(ParsedProxy {
            server: format!("{protocol}//{host}:{port}"),
            username: Some(user.trim().to_string()),
            password: Some(pass.trim().to_string()),
            raw: Some(trimmed.to_string()),
        });
    }

    if parts.len() == 2 {
        return Some(ParsedProxy {
            server: format!("{protocol}//{}:{}", parts[0], parts[1]),
            username: None,
            password: None,
            raw: Some(trimmed.to_string()),
        });
    }

    Some(ParsedProxy {
        server: format!("{protocol}//{clean_str}"),
        username: None,
        password: None,
        raw: Some(trimmed.to_string()),
    })
}

/// Structural proxy validation requiring an explicit host and valid TCP port (1..=65535).
pub fn is_valid_proxy_format(proxy_string: &str) -> bool {
    let Some(parsed) = parse_proxy(proxy_string) else {
        return false;
    };
    let Some(caps) = SERVER_HOST_PORT_RE.captures(&parsed.server) else {
        return false;
    };
    let host = caps.get(1).map(|m| m.as_str()).unwrap_or("");
    let port_str = caps.get(2).map(|m| m.as_str()).unwrap_or("");
    if host.trim().is_empty() || host.chars().any(char::is_whitespace) {
        return false;
    }
    port_str
        .parse::<u16>()
        .map(|p| p >= 1)
        .unwrap_or(false)
}

/// Extract clean `host:port` without credentials for CSV exports and display.
pub fn extract_proxy_host_port(proxy_string: &str) -> String {
    let Some(parsed) = parse_proxy(proxy_string) else {
        return proxy_string.trim().to_string();
    };
    if let Some(idx) = parsed.server.find("://") {
        parsed.server[idx + 3..].to_string()
    } else {
        parsed.server
    }
}

/// Build an authenticated `reqwest::Proxy` from any supported proxy string.
pub fn build_reqwest_proxy(proxy_string: &str) -> Result<reqwest::Proxy, String> {
    let parsed = parse_proxy(proxy_string).ok_or_else(|| "Invalid or empty proxy format.".to_string())?;
    let mut proxy = reqwest::Proxy::all(&parsed.server).map_err(|e| e.to_string())?;
    if let Some(user) = &parsed.username {
        proxy = proxy.basic_auth(user, parsed.password.as_deref().unwrap_or(""));
    }
    Ok(proxy)
}

/// Probe proxy reachability, latency, and GeoIP metadata via `http://ip-api.com/json`.
pub async fn test_proxy(proxy_string: &str) -> ProxyTestResult {
    if !is_valid_proxy_format(proxy_string) {
        return ProxyTestResult {
            success: false,
            latency: None,
            ip: None,
            country: None,
            country_code: None,
            timezone: None,
            city: None,
            isp: None,
            status: Some("DEAD".to_string()),
            message: Some("Invalid or empty proxy format.".to_string()),
        };
    }

    let req_proxy = match build_reqwest_proxy(proxy_string) {
        Ok(p) => p,
        Err(msg) => {
            return ProxyTestResult {
                success: false,
                latency: None,
                ip: None,
                country: None,
                country_code: None,
                timezone: None,
                city: None,
                isp: None,
                status: Some("DEAD".to_string()),
                message: Some(msg),
            };
        }
    };

    let client = match reqwest::Client::builder()
        .proxy(req_proxy)
        .timeout(Duration::from_secs(8))
        .build()
    {
        Ok(c) => c,
        Err(err) => {
            return ProxyTestResult {
                success: false,
                latency: None,
                ip: None,
                country: None,
                country_code: None,
                timezone: None,
                city: None,
                isp: None,
                status: Some("DEAD".to_string()),
                message: Some(err.to_string()),
            };
        }
    };

    let start = Instant::now();
    match client.get("http://ip-api.com/json").send().await {
        Ok(resp) => {
            let latency = start.elapsed().as_millis() as u64;
            let status_code = resp.status();
            if status_code.is_success() {
                match resp.json::<serde_json::Value>().await {
                    Ok(data) => ProxyTestResult {
                        success: true,
                        latency: Some(latency),
                        ip: data.get("query").and_then(|v| v.as_str()).map(String::from),
                        country: data.get("country").and_then(|v| v.as_str()).map(String::from),
                        country_code: data
                            .get("countryCode")
                            .and_then(|v| v.as_str())
                            .map(String::from),
                        timezone: data.get("timezone").and_then(|v| v.as_str()).map(String::from),
                        city: data.get("city").and_then(|v| v.as_str()).map(String::from),
                        isp: data
                            .get("isp")
                            .or_else(|| data.get("org"))
                            .and_then(|v| v.as_str())
                            .map(String::from),
                        status: Some("ALIVE".to_string()),
                        message: None,
                    },
                    Err(e) => ProxyTestResult {
                        success: false,
                        latency: Some(latency),
                        ip: None,
                        country: None,
                        country_code: None,
                        timezone: None,
                        city: None,
                        isp: None,
                        status: Some("DEAD".to_string()),
                        message: Some(format!("Failed to parse GeoIP response: {e}")),
                    },
                }
            } else {
                let code = status_code.as_u16();
                let msg = match code {
                    407 => "Proxy Auth Failed (407): Incorrect proxy username/password or IP not whitelisted.".to_string(),
                    403 => "Proxy Forbidden (403): Target access denied by proxy provider.".to_string(),
                    502 | 503 => format!("Proxy Bad Gateway ({code}): Proxy server is offline."),
                    _ => format!("Proxy HTTP Error: {code}"),
                };
                ProxyTestResult {
                    success: false,
                    latency: Some(latency),
                    ip: None,
                    country: None,
                    country_code: None,
                    timezone: None,
                    city: None,
                    isp: None,
                    status: Some("DEAD".to_string()),
                    message: Some(msg),
                }
            }
        }
        Err(err) => {
            let latency = start.elapsed().as_millis() as u64;
            let raw = err.to_string();
            let msg = if err.is_timeout() || raw.contains("timed out") {
                "Connection Timeout (8s): Proxy server did not respond.".to_string()
            } else if raw.contains("refused") {
                "Connection Refused: Proxy IP / Port is inactive.".to_string()
            } else if raw.contains("dns") || raw.contains("resolve") {
                "Host Not Found: Invalid proxy domain or IP.".to_string()
            } else {
                raw
            };
            ProxyTestResult {
                success: false,
                latency: Some(latency),
                ip: None,
                country: None,
                country_code: None,
                timezone: None,
                city: None,
                isp: None,
                status: Some("DEAD".to_string()),
                message: Some(msg),
            }
        }
    }
}

/// Resolve and cache GeoIP profile for a proxy string for 24 hours.
pub async fn get_proxy_geo(proxy_string: &str) -> Option<GeoData> {
    let key = proxy_string.trim().to_string();
    if key.is_empty() {
        return None;
    }

    if let Ok(cache) = GEO_CACHE.lock()
        && let Some((data, ts)) = cache.get(&key)
        && ts.elapsed() < Duration::from_secs(24 * 60 * 60)
    {
        return Some(data.clone());
    }

    let res = test_proxy(&key).await;
    if res.success
        && let Some(tz) = res.timezone
    {
        let cc = res.country_code.unwrap_or_default();
        let locale = if cc.is_empty() {
            "en-US".to_string()
        } else {
            format!("{}-{}", cc.to_lowercase(), cc.to_uppercase())
        };
        let languages = if cc.is_empty() {
            vec!["en-US".to_string(), "en".to_string()]
        } else {
            vec![
                locale.clone(),
                cc.to_lowercase(),
                "en-US".to_string(),
                "en".to_string(),
            ]
        };
        let geo = GeoData {
            timezone: tz,
            country: res.country.unwrap_or_default(),
            country_code: cc,
            city: res.city.unwrap_or_default(),
            locale,
            languages,
        };
        if let Ok(mut cache) = GEO_CACHE.lock() {
            cache.insert(key, (geo.clone(), Instant::now()));
        }
        return Some(geo);
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_all_supported_proxy_formats() {
        let p1 = parse_proxy("user:pass@103.145.2.1:8080").unwrap();
        assert_eq!(p1.server, "http://103.145.2.1:8080");
        assert_eq!(p1.username.as_deref(), Some("user"));
        assert_eq!(p1.password.as_deref(), Some("pass"));

        let p2 = parse_proxy("socks5://103.145.2.1:1080:alice:bob").unwrap();
        assert_eq!(p2.server, "socks5://103.145.2.1:1080");
        assert_eq!(p2.username.as_deref(), Some("alice"));
        assert_eq!(p2.password.as_deref(), Some("bob"));

        let p3 = parse_proxy("alice:bob:103.145.2.1:8080").unwrap();
        assert_eq!(p3.server, "http://103.145.2.1:8080");
        assert_eq!(p3.username.as_deref(), Some("alice"));

        assert!(is_valid_proxy_format("103.145.2.1:8080"));
        assert!(!is_valid_proxy_format("dsdsd2323"));
        assert!(!is_valid_proxy_format("103.145.2.1:99999"));
    }
}
