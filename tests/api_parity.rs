use axum::body::Body;
use axum::http::{Method, Request, StatusCode, header};
use base64::Engine;
use base64::engine::general_purpose::STANDARD;
use http_body_util::BodyExt;
use serde_json::{Value, json};
use std::sync::Arc;
use tempfile::TempDir;
use tower::ServiceExt;

use x_sentinel::config::AppConfig;
use x_sentinel::routes::build_router;
use x_sentinel::state::AppState;

fn setup_test_app() -> (TempDir, Arc<AppState>, axum::Router) {
    let tmp = TempDir::new().expect("tempdir");
    let cfg = AppConfig::with_paths(tmp.path(), tmp.path(), &[]);
    let state = AppState::new(cfg).expect("init app state");
    let app = build_router(Arc::clone(&state));
    (tmp, state, app)
}

async fn read_json(resp: axum::response::Response) -> (StatusCode, Value) {
    let status = resp.status();
    let bytes = resp
        .into_body()
        .collect()
        .await
        .expect("collect body")
        .to_bytes();
    let val: Value = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
    (status, val)
}

async fn login_cookie(app: &axum::Router, password: &str) -> String {
    let req = Request::builder()
        .method(Method::POST)
        .uri("/api/auth/login")
        .header(header::CONTENT_TYPE, "application/json")
        .header(header::ORIGIN, "http://localhost:3000")
        .body(Body::from(json!({ "password": password }).to_string()))
        .unwrap();
    let resp = app.clone().oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::OK, "login must succeed");
    let set_cookie = resp
        .headers()
        .get(header::SET_COOKIE)
        .expect("set-cookie present")
        .to_str()
        .unwrap();
    set_cookie.split(';').next().unwrap().to_string()
}

#[tokio::test]
async fn smoke_api_parity_and_security_guards() {
    let (_tmp, state, app) = setup_test_app();

    // 1. Origin guard blocks foreign Origin & Host
    let evil_origin = Request::builder()
        .uri("/api/accounts")
        .header(header::ORIGIN, "https://evil.example")
        .body(Body::empty())
        .unwrap();
    assert_eq!(
        app.clone().oneshot(evil_origin).await.unwrap().status(),
        StatusCode::FORBIDDEN
    );

    let evil_host = Request::builder()
        .uri("/api/status")
        .header(header::HOST, "evil.example")
        .body(Body::empty())
        .unwrap();
    assert_eq!(
        app.clone().oneshot(evil_host).await.unwrap().status(),
        StatusCode::FORBIDDEN
    );

    // 1b. Unauthenticated protected API & auth management endpoints return 401
    let unauth_accounts = Request::builder()
        .uri("/api/accounts")
        .header(header::ORIGIN, "http://localhost:3000")
        .body(Body::empty())
        .unwrap();
    assert_eq!(
        app.clone().oneshot(unauth_accounts).await.unwrap().status(),
        StatusCode::UNAUTHORIZED
    );

    let unauth_2fa = Request::builder()
        .uri("/api/auth/2fa/status")
        .header(header::ORIGIN, "http://localhost:3000")
        .body(Body::empty())
        .unwrap();
    assert_eq!(
        app.clone().oneshot(unauth_2fa).await.unwrap().status(),
        StatusCode::UNAUTHORIZED
    );

    // Authenticate session
    let cookie = login_cookie(&app, &state.config.admin_password).await;

    // 2. GET /api/status succeeds with same-origin + session cookie + Cache-Control: no-store
    let status_req = Request::builder()
        .uri("/api/status")
        .header(header::ORIGIN, "http://localhost:3000")
        .header(header::COOKIE, &cookie)
        .body(Body::empty())
        .unwrap();
    let status_resp = app.clone().oneshot(status_req).await.unwrap();
    assert_eq!(
        status_resp
            .headers()
            .get(header::CACHE_CONTROL)
            .and_then(|v| v.to_str().ok()),
        Some("no-store")
    );
    let (code, body) = read_json(status_resp).await;
    assert_eq!(code, StatusCode::OK);
    assert_eq!(body["success"], true);

    // 3. Create account -> GET masks secrets
    let create_req = Request::builder()
        .method(Method::POST)
        .uri("/api/accounts")
        .header(header::CONTENT_TYPE, "application/json")
        .header(header::ORIGIN, "http://localhost:3000")
        .header(header::COOKIE, &cookie)
        .body(Body::from(
            json!({
                "label": "Smoke Node",
                "auth_token": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b01",
                "ct0": "ct0secretvalue123456",
                "proxy": "user:pass@31.56.70.92:1338",
            })
            .to_string(),
        ))
        .unwrap();
    let (create_code, create_json) = read_json(app.clone().oneshot(create_req).await.unwrap()).await;
    assert_eq!(create_code, StatusCode::OK);
    assert_eq!(create_json["success"], true);

    let list_req = Request::builder()
        .uri("/api/accounts")
        .header(header::COOKIE, &cookie)
        .body(Body::empty())
        .unwrap();
    let (_, list_json) = read_json(app.clone().oneshot(list_req).await.unwrap()).await;
    let list = list_json["accounts"].as_array().unwrap();
    assert_eq!(list.len(), 1);
    assert!(list[0]["auth_token"].as_str().unwrap().starts_with("••••"));
    assert!(list[0]["proxy"].as_str().unwrap().starts_with("••••@"));
    assert!(!list_json.to_string().contains("a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b01"));
    assert!(!list_json.to_string().contains("user:pass"));
    let account_id = list[0]["id"].as_str().unwrap().to_string();

    // 4. Masked round-trip on PUT preserves secrets
    let put_masked = Request::builder()
        .method(Method::PUT)
        .uri(format!("/api/accounts/{account_id}"))
        .header(header::CONTENT_TYPE, "application/json")
        .header(header::COOKIE, &cookie)
        .body(Body::from(
            json!({
                "label": "Smoke Node (edited)",
                "auth_token": list[0]["auth_token"],
                "ct0": list[0]["ct0"],
                "proxy": list[0]["proxy"],
            })
            .to_string(),
        ))
        .unwrap();
    assert_eq!(app.clone().oneshot(put_masked).await.unwrap().status(), StatusCode::OK);

    let export_req = Request::builder()
        .uri("/api/accounts/export")
        .header(header::COOKIE, &cookie)
        .body(Body::empty())
        .unwrap();
    let (_, export_json) = read_json(app.clone().oneshot(export_req).await.unwrap()).await;
    assert_eq!(
        export_json["accounts"][0]["auth_token"],
        "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b01"
    );
    assert!(
        export_json["accounts"][0]["proxy"]
            .as_str()
            .unwrap()
            .contains("user:pass@31.56.70.92:1338")
    );
    assert_eq!(export_json["accounts"][0]["label"], "Smoke Node (edited)");

    // 4b. New raw secrets replace stored ones
    let put_raw = Request::builder()
        .method(Method::PUT)
        .uri(format!("/api/accounts/{account_id}"))
        .header(header::CONTENT_TYPE, "application/json")
        .header(header::COOKIE, &cookie)
        .body(Body::from(
            json!({
                "auth_token": "b1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b02",
                "ct0": "newct0value123456",
            })
            .to_string(),
        ))
        .unwrap();
    assert_eq!(app.clone().oneshot(put_raw).await.unwrap().status(), StatusCode::OK);
    let export_req2 = Request::builder()
        .uri("/api/accounts/export")
        .header(header::COOKIE, &cookie)
        .body(Body::empty())
        .unwrap();
    let (_, export_json2) = read_json(app.clone().oneshot(export_req2).await.unwrap()).await;
    assert_eq!(
        export_json2["accounts"][0]["auth_token"],
        "b1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b02"
    );
    assert_eq!(export_json2["accounts"][0]["ct0"], "newct0value123456");

    // 5. Invalid body -> 400 VALIDATION_ERROR
    let bad_acc = Request::builder()
        .method(Method::POST)
        .uri("/api/accounts")
        .header(header::CONTENT_TYPE, "application/json")
        .header(header::COOKIE, &cookie)
        .body(Body::from(json!({ "auth_token": "x" }).to_string()))
        .unwrap();
    let (bad_code, bad_json) = read_json(app.clone().oneshot(bad_acc).await.unwrap()).await;
    assert_eq!(bad_code, StatusCode::BAD_REQUEST);
    assert_eq!(bad_json["error"], "VALIDATION_ERROR");

    // 5b. Invalid proxy -> 400 with "Invalid proxy tunnel format"
    let bad_proxy = Request::builder()
        .method(Method::POST)
        .uri("/api/accounts")
        .header(header::CONTENT_TYPE, "application/json")
        .header(header::COOKIE, &cookie)
        .body(Body::from(
            json!({ "auth_token": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b03", "proxy": "dsdsd2323" }).to_string(),
        ))
        .unwrap();
    let (bp_code, bp_json) = read_json(app.clone().oneshot(bad_proxy).await.unwrap()).await;
    assert_eq!(bp_code, StatusCode::BAD_REQUEST);
    assert!(bp_json["message"].as_str().unwrap().contains("Invalid proxy tunnel format"));

    // 6. Bulk import
    let bulk_req = Request::builder()
        .method(Method::POST)
        .uri("/api/accounts/bulk-import")
        .header(header::CONTENT_TYPE, "application/json")
        .header(header::COOKIE, &cookie)
        .body(Body::from(
            json!({
                "rawText": "tok_aaaaaaaaaaaaaaaaaaaaaaaa:ct0_aaaaaaaaaa:Import A\ntok_bbbbbbbbbbbbbbbbbbbbbbbb:ct0_bbbbbbbbbb:Import B"
            })
            .to_string(),
        ))
        .unwrap();
    let (bulk_code, bulk_json) = read_json(app.clone().oneshot(bulk_req).await.unwrap()).await;
    assert_eq!(bulk_code, StatusCode::OK);
    assert_eq!(bulk_json["addedCount"], 2);

    // 7. Templates & comments
    let tpl_get = Request::builder()
        .uri("/api/templates")
        .header(header::COOKIE, &cookie)
        .body(Body::empty())
        .unwrap();
    let (tpl_code, tpl_json) = read_json(app.clone().oneshot(tpl_get).await.unwrap()).await;
    assert_eq!(tpl_code, StatusCode::OK);
    assert!(tpl_json["templates"].is_array());

    // 8 + 8b. Settings secret masking + 9router deduplication
    let save_set = Request::builder()
        .method(Method::POST)
        .uri("/api/settings")
        .header(header::CONTENT_TYPE, "application/json")
        .header(header::COOKIE, &cookie)
        .body(Body::from(
            json!({
                "aiProvider": "9router",
                "aiApiKey": "gsk_real_key_123456",
                "telegramBotToken": "123:ABC-real",
                "aiModel": "deepseek/deepseek-r1",
                "nineRouterModels": [
                    "openai/gpt-4o-mini",
                    "deepseek/deepseek-r1",
                    "custom-9router-model",
                    "openai/gpt-4o-mini"
                ]
            })
            .to_string(),
        ))
        .unwrap();
    assert_eq!(app.clone().oneshot(save_set).await.unwrap().status(), StatusCode::OK);

    let get_set = Request::builder()
        .uri("/api/settings")
        .header(header::COOKIE, &cookie)
        .body(Body::empty())
        .unwrap();
    let (_, set_json) = read_json(app.clone().oneshot(get_set).await.unwrap()).await;
    assert!(set_json["settings"]["aiApiKey"].as_str().unwrap().starts_with("••••"));
    assert!(!set_json.to_string().contains("gsk_real_key_123456"));
    assert_eq!(
        set_json["settings"]["nineRouterModels"],
        json!(["openai/gpt-4o-mini", "deepseek/deepseek-r1", "custom-9router-model"])
    );

    // Round-trip masked aiApiKey keeps stored raw key
    let put_masked_set = Request::builder()
        .method(Method::POST)
        .uri("/api/settings")
        .header(header::CONTENT_TYPE, "application/json")
        .header(header::COOKIE, &cookie)
        .body(Body::from(
            json!({
                "aiApiKey": set_json["settings"]["aiApiKey"],
                "aiPrompt": "updated prompt"
            })
            .to_string(),
        ))
        .unwrap();
    assert_eq!(
        app.clone().oneshot(put_masked_set).await.unwrap().status(),
        StatusCode::OK
    );
    assert_eq!(state.db.get_settings().ai_api_key, "gsk_real_key_123456");
    assert_eq!(state.db.get_settings().ai_prompt, "updated prompt");

    // 9. AI fallback generate-post works offline
    let ai_req = Request::builder()
        .method(Method::POST)
        .uri("/api/ai/generate-post")
        .header(header::CONTENT_TYPE, "application/json")
        .header(header::COOKIE, &cookie)
        .body(Body::from(
            json!({ "keyword": "rust async", "count": 1 }).to_string(),
        ))
        .unwrap();
    let (ai_code, ai_json) = read_json(app.clone().oneshot(ai_req).await.unwrap()).await;
    assert_eq!(ai_code, StatusCode::OK);
    assert!(!ai_json["posts"].as_array().unwrap().is_empty());

    // 10. Unknown API endpoints return JSON 404
    let missing = Request::builder()
        .uri("/api/definitely-not-real")
        .header(header::COOKIE, &cookie)
        .body(Body::empty())
        .unwrap();
    let (m_code, m_json) = read_json(app.clone().oneshot(missing).await.unwrap()).await;
    assert_eq!(m_code, StatusCode::NOT_FOUND);
    assert_eq!(m_json["error"], "API_ENDPOINT_NOT_FOUND");
}

#[tokio::test]
async fn media_schedules_history_and_system_routes_work() {
    let (_tmp, state, app) = setup_test_app();
    let cookie = login_cookie(&app, &state.config.admin_password).await;

    // 1x1 transparent PNG
    let png_bytes: [u8; 67] = [
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
        0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f,
        0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00,
        0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
        0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ];
    let data_uri = format!("data:image/png;base64,{}", STANDARD.encode(png_bytes));

    let upload_req = Request::builder()
        .method(Method::POST)
        .uri("/api/media/upload")
        .header(header::CONTENT_TYPE, "application/json")
        .header(header::COOKIE, &cookie)
        .body(Body::from(
            json!({ "imageBase64": data_uri, "filename": "pixel" }).to_string(),
        ))
        .unwrap();
    let (up_code, up_json) = read_json(app.clone().oneshot(upload_req).await.unwrap()).await;
    assert_eq!(up_code, StatusCode::OK);
    let local_path = up_json["localPath"].as_str().unwrap().to_string();

    // Schedule traversal rejected
    let bad_sched = Request::builder()
        .method(Method::POST)
        .uri("/api/schedules")
        .header(header::CONTENT_TYPE, "application/json")
        .header(header::COOKIE, &cookie)
        .body(Body::from(
            json!({
                "type": "POST_QUEUE",
                "scheduledAt": "2030-01-01T12:00:00Z",
                "mediaPaths": ["../../evil.png"]
            })
            .to_string(),
        ))
        .unwrap();
    assert_eq!(
        app.clone().oneshot(bad_sched).await.unwrap().status(),
        StatusCode::BAD_REQUEST
    );

    // Valid schedule created, toggled, deleted
    let ok_sched = Request::builder()
        .method(Method::POST)
        .uri("/api/schedules")
        .header(header::CONTENT_TYPE, "application/json")
        .header(header::COOKIE, &cookie)
        .body(Body::from(
            json!({
                "type": "POST_QUEUE",
                "title": "Test Dispatch",
                "scheduledAt": "2030-01-01T12:00:00Z",
                "posts": ["Hello X-SENTINEL"],
                "mediaPaths": [local_path]
            })
            .to_string(),
        ))
        .unwrap();
    let (sch_code, sch_json) = read_json(app.clone().oneshot(ok_sched).await.unwrap()).await;
    assert_eq!(sch_code, StatusCode::OK);
    let sched_id = sch_json["schedule"]["id"].as_str().unwrap().to_string();

    let tog_req = Request::builder()
        .method(Method::POST)
        .uri(format!("/api/schedules/{sched_id}/toggle"))
        .header(header::COOKIE, &cookie)
        .body(Body::empty())
        .unwrap();
    let (_, tog_json) = read_json(app.clone().oneshot(tog_req).await.unwrap()).await;
    assert_eq!(tog_json["schedule"]["enabled"], false);

    let del_req = Request::builder()
        .method(Method::DELETE)
        .uri(format!("/api/schedules/{sched_id}"))
        .header(header::COOKIE, &cookie)
        .body(Body::empty())
        .unwrap();
    assert_eq!(app.clone().oneshot(del_req).await.unwrap().status(), StatusCode::OK);

    // System health + 6-pillar diagnostics
    let health_req = Request::builder()
        .uri("/api/system/health")
        .header(header::COOKIE, &cookie)
        .body(Body::empty())
        .unwrap();
    let (h_code, h_json) = read_json(app.clone().oneshot(health_req).await.unwrap()).await;
    assert_eq!(h_code, StatusCode::OK);
    assert_eq!(h_json["runtime"], "rust-axum");

    let diag_req = Request::builder()
        .uri("/api/system/diagnostics")
        .header(header::COOKIE, &cookie)
        .body(Body::empty())
        .unwrap();
    let (d_code, d_json) = read_json(app.clone().oneshot(diag_req).await.unwrap()).await;
    assert_eq!(d_code, StatusCode::OK);
    assert_eq!(d_json["totalPillars"], 6);
}

#[tokio::test]
async fn spa_healthz_and_security_headers_work() {
    let (_tmp, _state, app) = setup_test_app();

    let health_req = Request::builder().uri("/healthz").body(Body::empty()).unwrap();
    let health_resp = app.clone().oneshot(health_req).await.unwrap();
    assert_eq!(health_resp.status(), StatusCode::OK);
    assert_eq!(
        health_resp
            .headers()
            .get(header::X_FRAME_OPTIONS)
            .and_then(|v| v.to_str().ok()),
        Some("DENY")
    );
    let csp = health_resp
        .headers()
        .get(header::CONTENT_SECURITY_POLICY)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    assert!(csp.contains("script-src 'self'"));
    assert!(!csp.contains("unsafe-eval"));

    let (_, health_json) = read_json(health_resp).await;
    assert_eq!(health_json["ok"], true);
    assert_eq!(health_json["engine"], "axum");

    // Verify serving real client/dist SPA when root_dir points to workspace root
    let spa_tmp = TempDir::new().expect("tempdir");
    let cfg = AppConfig::with_paths(std::env::current_dir().unwrap(), spa_tmp.path(), &[]);
    let spa_state = AppState::new(cfg).expect("init app state");
    let spa_app = build_router(spa_state);

    let root_req = Request::builder().uri("/").body(Body::empty()).unwrap();
    let root_resp = spa_app.clone().oneshot(root_req).await.unwrap();
    assert_eq!(root_resp.status(), StatusCode::OK);

    let route_req = Request::builder().uri("/analytics").body(Body::empty()).unwrap();
    let route_resp = spa_app.oneshot(route_req).await.unwrap();
    assert_eq!(route_resp.status(), StatusCode::OK);
}
