//! Top-level Axum router wiring security headers, origin guard, auth gates, API endpoints, and React SPA serving.

use axum::Json;
use axum::Router;
use axum::extract::{DefaultBodyLimit, Request};
use axum::http::{HeaderValue, Method, StatusCode, Uri, header};
use axum::middleware::{self, Next};
use axum::response::{Html, IntoResponse, Response};
use axum::routing::{delete, get, post, put};
use serde_json::json;
use std::sync::Arc;
use tower_http::services::ServeDir;

use crate::security::origin_guard_middleware;
use crate::state::AppState;

pub mod accounts;
pub mod ai;
pub mod auth;
pub mod history;
pub mod media;
pub mod schedules;
pub mod settings;
pub mod system;
pub mod tasks;

const ONE_MB: usize = 1024 * 1024;
const TWENTY_FIVE_MB: usize = 25 * 1024 * 1024;

async fn security_headers_middleware(req: Request, next: Next) -> Response {
    let mut resp = next.run(req).await;
    let headers = resp.headers_mut();
    headers.insert(
        header::X_CONTENT_TYPE_OPTIONS,
        HeaderValue::from_static("nosniff"),
    );
    headers.insert(header::X_FRAME_OPTIONS, HeaderValue::from_static("DENY"));
    headers.insert(
        header::HeaderName::from_static("x-xss-protection"),
        HeaderValue::from_static("1; mode=block"),
    );
    headers.insert(
        header::REFERRER_POLICY,
        HeaderValue::from_static("strict-origin-when-cross-origin"),
    );
    headers.insert(
        header::CONTENT_SECURITY_POLICY,
        HeaderValue::from_static(
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*; frame-ancestors 'none';",
        ),
    );
    resp
}

async fn api_no_store_middleware(req: Request, next: Next) -> Response {
    let mut resp = next.run(req).await;
    resp.headers_mut().insert(
        header::CACHE_CONTROL,
        HeaderValue::from_static("no-store"),
    );
    resp
}

async fn api_not_found(method: Method, uri: Uri) -> Response {
    (
        StatusCode::NOT_FOUND,
        Json(json!({
            "success": false,
            "error": "API_ENDPOINT_NOT_FOUND",
            "message": format!("API endpoint '{method} {uri}' was not found."),
        })),
    )
        .into_response()
}

async fn healthz() -> impl IntoResponse {
    (StatusCode::OK, Json(json!({ "ok": true, "engine": "axum" })))
}

async fn fallback_missing_dist() -> impl IntoResponse {
    (
        StatusCode::NOT_FOUND,
        Html(
            "<h1>Frontend build missing</h1><p>Run <code>npm run client:build</code> inside <code>client/</code> to generate <code>client/dist/</code>.</p>",
        ),
    )
}

async fn serve_spa_index(
    axum::extract::State(state): axum::extract::State<Arc<AppState>>,
) -> Response {
    let index_path = state
        .config
        .root_dir
        .join("client")
        .join("dist")
        .join("index.html");
    match tokio::fs::read(&index_path).await {
        Ok(bytes) => (
            StatusCode::OK,
            [(header::CONTENT_TYPE, "text/html; charset=utf-8")],
            bytes,
        )
            .into_response(),
        Err(_) => fallback_missing_dist().await.into_response(),
    }
}

pub fn build_router(state: Arc<AppState>) -> Router {
    let public_auth_api = Router::new()
        .route("/session", get(auth::get_session))
        .route("/login", post(auth::post_login))
        .route("/logout", post(auth::post_logout))
        .layer(DefaultBodyLimit::max(ONE_MB));

    let protected_auth_api = Router::new()
        .route("/revoke-all", post(auth::post_revoke_all))
        .route("/credentials", put(auth::put_credentials))
        .route("/2fa/status", get(auth::get_2fa_status))
        .route("/2fa/setup", post(auth::post_2fa_setup))
        .route("/2fa/enable", post(auth::post_2fa_enable))
        .route("/2fa/disable", post(auth::post_2fa_disable))
        .layer(DefaultBodyLimit::max(ONE_MB))
        .layer(middleware::from_fn_with_state(
            Arc::clone(&state),
            auth::require_api_auth,
        ));

    let auth_router = Router::new()
        .merge(public_auth_api)
        .merge(protected_auth_api);

    let media_upload_router = Router::new()
        .route("/media/upload", post(media::upload_media))
        .layer(DefaultBodyLimit::max(TWENTY_FIVE_MB));

    let accounts_router = Router::new()
        .route("/", get(accounts::list_accounts).post(accounts::create_account))
        .route("/export", get(accounts::export_accounts_json))
        .route("/export-csv", get(accounts::export_accounts_csv))
        .route("/batch-toggle", post(accounts::batch_toggle_accounts))
        .route("/batch-delete", post(accounts::batch_delete_accounts))
        .route("/test-proxies", post(accounts::test_proxies_batch))
        .route("/bulk-import", post(accounts::bulk_import_accounts))
        .route("/check-health", post(accounts::check_fleet_health))
        .route(
            "/camoufox/batch-delete",
            post(accounts::batch_delete_camoufox_profiles),
        )
        .route(
            "/{id}",
            get(accounts::get_account)
                .put(accounts::update_account)
                .delete(accounts::delete_account),
        )
        .route("/{id}/toggle", post(accounts::toggle_account))
        .route("/{id}/verify", post(accounts::verify_account))
        .route("/{id}/check-health", post(accounts::check_account_health))
        .route("/{id}/warmup", post(accounts::start_warmup))
        .route("/{id}/test-proxy", post(accounts::test_account_proxy))
        .route(
            "/{id}/comments",
            get(accounts::get_account_comments).post(accounts::save_account_comments),
        )
        .route("/{id}/camoufox-login", post(accounts::start_camoufox_login))
        .route("/{id}/camoufox-status", get(accounts::get_camoufox_status))
        .route(
            "/{id}/camoufox-profile",
            delete(accounts::delete_camoufox_profile),
        );

    let tasks_router = Router::new()
        .route("/post", post(tasks::post_task))
        .route("/batch", post(tasks::batch_task))
        .route("/hunter", post(tasks::hunter_task))
        .route("/pause", post(tasks::pause_task))
        .route("/resume", post(tasks::resume_task))
        .route("/stop", post(tasks::stop_task))
        .route("/clear-locks", post(tasks::clear_locks))
        .route("/locks", get(tasks::get_locks));

    let ai_router = Router::new()
        .route("/fetch-tweet", post(ai::fetch_tweet))
        .route("/generate-post", post(ai::generate_post))
        .route(
            "/generate-payload-replies",
            post(ai::generate_payload_replies),
        )
        .route("/save-payload-file", post(ai::save_payload_file))
        .route("/payload-files", get(ai::list_payload_files))
        .route(
            "/payload-file/{filename}",
            get(ai::get_payload_file).delete(ai::delete_payload_file),
        )
        .route("/test-connection", post(ai::test_ai_connection));

    let schedules_router = Router::new()
        .route("/", get(schedules::list_schedules).post(schedules::create_schedule))
        .route("/{id}", delete(schedules::delete_schedule))
        .route("/{id}/toggle", post(schedules::toggle_schedule));

    let history_router = Router::new()
        .route("/", get(history::get_history))
        .route("/prune", post(history::prune_history))
        .route("/clear-all", post(history::clear_history));

    let system_router = Router::new()
        .route("/health", get(system::get_system_health))
        .route("/diagnostics", get(system::get_system_diagnostics));

    let protected_standard_api = Router::new()
        .route("/status", get(system::get_status))
        .route("/logs/stream", get(system::stream_logs))
        .route("/logs/files", get(system::list_log_files))
        .route("/logs/file", get(system::download_log_file))
        .route("/media/prune", post(media::prune_media))
        .route(
            "/settings",
            get(settings::get_settings).post(settings::save_settings),
        )
        .route("/settings/test-browser", post(settings::test_browser))
        .route("/settings/test-webhook", post(settings::test_webhook))
        .route("/settings/test-ai", post(settings::test_ai_settings))
        .route("/settings/generate-ai-test", post(settings::generate_ai_test))
        .route("/proxy/test", post(settings::test_proxy_endpoint))
        .route("/spintax/preview", post(settings::preview_spintax))
        .route(
            "/templates",
            get(settings::get_templates).post(settings::save_templates),
        )
        .route(
            "/comments",
            get(settings::get_comments).post(settings::save_comments),
        )
        .route("/stats", get(settings::get_stats))
        .nest("/system", system_router)
        .nest("/accounts", accounts_router)
        .nest("/tasks", tasks_router)
        .nest("/ai", ai_router)
        .nest("/schedules", schedules_router)
        .nest("/history", history_router)
        .layer(DefaultBodyLimit::max(ONE_MB));

    let protected_api = Router::new()
        .merge(media_upload_router)
        .merge(protected_standard_api)
        .layer(middleware::from_fn_with_state(
            Arc::clone(&state),
            auth::require_api_auth,
        ));

    let api_router = Router::new()
        .nest("/auth", auth_router)
        .merge(protected_api)
        .fallback(api_not_found)
        .layer(middleware::from_fn(api_no_store_middleware));

    let client_dist_dir = state.config.root_dir.join("client").join("dist");
    let client_assets_dir = client_dist_dir.join("assets");
    let client_index = client_dist_dir.join("index.html");

    let base_router = Router::new()
        .route("/healthz", get(healthz))
        .nest("/api", api_router);

    let app_router = if client_index.exists() {
        base_router
            .nest_service("/assets", ServeDir::new(client_assets_dir))
            .fallback(serve_spa_index)
    } else {
        base_router.fallback(fallback_missing_dist)
    };

    app_router
        .layer(middleware::from_fn(origin_guard_middleware))
        .layer(middleware::from_fn(security_headers_middleware))
        .with_state(state)
}
