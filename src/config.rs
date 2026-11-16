//! Runtime configuration resolved from CLI flags, environment variables, and defaults.

use std::env;
use std::path::{Path, PathBuf};

/// Default values mirroring `server/config.js`.
#[derive(Debug, Clone)]
pub struct Defaults {
    pub min_delay_seconds: u64,
    pub max_delay_seconds: u64,
    pub hourly_limit: u64,
    pub daily_limit: u64,
    pub headless: bool,
    pub browser_engine: String,
    pub human_typing_delay_ms: u64,
    pub scroll_before_action: bool,
    pub enforce_warmup_gate: bool,
    pub cross_node_target_lock: bool,
}

impl Default for Defaults {
    fn default() -> Self {
        Self {
            min_delay_seconds: 15,
            max_delay_seconds: 40,
            hourly_limit: 25,
            daily_limit: 150,
            headless: false,
            browser_engine: "chromium".to_string(),
            human_typing_delay_ms: 65,
            scroll_before_action: true,
            enforce_warmup_gate: false,
            cross_node_target_lock: false,
        }
    }
}

/// Global server configuration.
#[derive(Debug, Clone)]
pub struct AppConfig {
    pub version: String,
    pub port: u16,
    pub host: String,
    pub root_dir: PathBuf,
    pub data_dir: PathBuf,
    pub user_data_dir: PathBuf,
    pub camoufox_profiles_dir: PathBuf,
    pub auth_enabled: bool,
    pub admin_username: String,
    pub admin_password: String,
    pub session_secret: String,
    pub session_cookie_name: String,
    pub session_duration_ms: i64,
    pub defaults: Defaults,
}

fn parse_port(val: &str) -> Option<u16> {
    let p: u16 = val.trim().parse().ok()?;
    if p > 0 { Some(p) } else { None }
}

fn resolve_initial_port(args: &[String]) -> u16 {
    let mut i = 0;
    while i < args.len() {
        let arg = &args[i];
        if let Some(rest) = arg.strip_prefix("--port=") {
            if let Some(p) = parse_port(rest) {
                return p;
            }
        } else if (arg == "--port" || arg == "-p") && i + 1 < args.len() {
            if let Some(p) = parse_port(&args[i + 1]) {
                return p;
            }
            i += 1;
        } else if let Some(rest) = arg.strip_prefix("-p=") {
            if let Some(p) = parse_port(rest) {
                return p;
            }
        }
        i += 1;
    }

    if let Ok(npm_port) = env::var("npm_config_port")
        && let Some(p) = parse_port(&npm_port)
    {
        return p;
    }

    if let Ok(env_port) = env::var("PORT")
        && let Some(p) = parse_port(&env_port)
    {
        return p;
    }

    3000
}

impl AppConfig {
    /// Load configuration from `.env`, process environment, and CLI arguments.
    pub fn from_env() -> Self {
        let _ = dotenvy::dotenv();
        let args: Vec<String> = env::args().collect();
        let root_dir = env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
        let data_dir = env::var("X_SENTINEL_DATA_DIR")
            .map(PathBuf::from)
            .unwrap_or_else(|_| root_dir.join("data"));

        Self::with_paths(root_dir, data_dir, &args)
    }

    /// Construct configuration with explicit root/data directories (used in tests).
    pub fn with_paths(root_dir: impl AsRef<Path>, data_dir: impl AsRef<Path>, args: &[String]) -> Self {
        let root_dir = root_dir.as_ref().to_path_buf();
        let data_dir = data_dir.as_ref().to_path_buf();
        let user_data_dir = data_dir.join("browser_profile");
        let camoufox_profiles_dir = data_dir.join("camoufox_profiles");

        Self {
            version: env!("CARGO_PKG_VERSION").to_string(),
            port: resolve_initial_port(args),
            host: env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string()),
            root_dir,
            data_dir,
            user_data_dir,
            camoufox_profiles_dir,
            auth_enabled: env::var("AUTH_ENABLED").map(|v| v != "false").unwrap_or(true),
            admin_username: env::var("ADMIN_USERNAME").unwrap_or_else(|_| "admin".to_string()),
            admin_password: env::var("ADMIN_PASSWORD").unwrap_or_else(|_| "sentinel123".to_string()),
            session_secret: env::var("SESSION_SECRET")
                .unwrap_or_else(|_| "x-sentinel-vault-key-change-in-env".to_string()),
            session_cookie_name: "x_sentinel_session".to_string(),
            session_duration_ms: 7 * 24 * 60 * 60 * 1000,
            defaults: Defaults::default(),
        }
    }
}
