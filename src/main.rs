//! X-SENTINEL Axum server entrypoint with port fallback and graceful lifecycle shutdown.

use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio_util::sync::CancellationToken;

use x_sentinel::config::AppConfig;
use x_sentinel::routes::build_router;
use x_sentinel::state::AppState;

const MAX_PORT_RETRIES: u16 = 30;

async fn bind_with_fallback(host: &str, initial_port: u16) -> Result<(TcpListener, u16), String> {
    let mut current_port = initial_port;
    for attempt in 0..=MAX_PORT_RETRIES {
        let addr_str = format!("{host}:{current_port}");
        match TcpListener::bind(&addr_str).await {
            Ok(listener) => return Ok((listener, current_port)),
            Err(err) if err.kind() == std::io::ErrorKind::AddrInUse => {
                if attempt == MAX_PORT_RETRIES {
                    return Err(format!(
                        "Could not find an available port after {MAX_PORT_RETRIES} attempts starting from {initial_port}."
                    ));
                }
                tracing::warn!(
                    port = current_port,
                    next_port = current_port + 1,
                    "Port already in use; trying next port"
                );
                current_port = current_port.saturating_add(1);
            }
            Err(err) => return Err(format!("Failed to bind {addr_str}: {err}")),
        }
    }
    Err("Failed to bind server listener.".to_string())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        if let Err(e) = tokio::signal::ctrl_c().await {
            tracing::error!("Failed to install Ctrl+C handler: {e}");
        }
    };

    #[cfg(unix)]
    let terminate = async {
        use tokio::signal::unix::{SignalKind, signal};
        if let Ok(mut sig) = signal(SignalKind::terminate()) {
            sig.recv().await;
        }
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let cfg = AppConfig::from_env();
    let initial_port = cfg.port;
    let host = cfg.host.clone();

    let state = match AppState::new(cfg) {
        Ok(st) => st,
        Err(err) => {
            tracing::error!("Failed to initialize X-SENTINEL state: {err}");
            std::process::exit(1);
        }
    };

    let (listener, bound_port) = match bind_with_fallback(&host, initial_port).await {
        Ok(res) => res,
        Err(err) => {
            state.logger.error(err);
            std::process::exit(1);
        }
    };

    let shutdown = CancellationToken::new();
    Arc::clone(&state.scheduler).start(shutdown.clone());

    state.logger.success(format!(
        "X-SENTINEL Cockpit Engine (Rust/Axum) listening at http://{host}:{bound_port}"
    ));
    println!("====================================================");
    println!("  X-SENTINEL: Autonomous Multi-Node Fleet Engine");
    println!("  Cockpit URL: http://{host}:{bound_port}");
    println!("====================================================");

    let app = build_router(Arc::clone(&state));
    let serve_result = axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .with_graceful_shutdown(shutdown_signal())
    .await;

    if let Err(err) = serve_result {
        state.logger.error(format!("HTTP server error: {err}"));
    }

    state.logger.warn("Shutdown signal received. Stopping scheduler and worker...");
    shutdown.cancel();
    if state.bot.is_running().await {
        let _ = state.bot.stop().await;
    }
    state.bot.shutdown().await;
    state.logger.info("Server shut down gracefully.");
}
