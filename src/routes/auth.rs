//! Authentication routes (`/api/auth/*`) and session extractor middleware.

use axum::Json;
use axum::extract::{Query, Request, State};
use axum::http::{HeaderMap, HeaderValue, StatusCode, header};
use axum::middleware::Next;
use axum::response::{IntoResponse, Redirect, Response};
use serde::Deserialize;
use serde_json::json;
use std::collections::HashMap;
use std::sync::Arc;

use crate::auth::{AuthService, RateLimitDecision, extract_cookie_value};
use crate::error::AppError;
use crate::state::AppState;

pub fn extract_session_token(
    headers: &HeaderMap,
    query: Option<&str>,
    cookie_name: &str,
) -> Option<String> {
    if let Some(cookie_hdr) = headers.get(header::COOKIE).and_then(|v| v.to_str().ok())
        && let Some(token) = extract_cookie_value(cookie_hdr, cookie_name)
        && !token.is_empty()
    {
        return Some(token);
    }

    if let Some(auth_hdr) = headers
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        && let Some(bearer) = auth_hdr.strip_prefix("Bearer ")
    {
        let trimmed = bearer.trim();
        if !trimmed.is_empty() {
            return Some(trimmed.to_string());
        }
    }

    if let Some(q) = query {
        for (k, v) in url::form_urlencoded::parse(q.as_bytes()) {
            if k == "auth_token" && !v.is_empty() {
                return Some(v.into_owned());
            }
        }
    }

    None
}

pub fn is_request_authenticated(state: &AppState, req: &Request) -> bool {
    if !state.auth.auth_enabled {
        return true;
    }
    let token = extract_session_token(
        req.headers(),
        req.uri().query(),
        &state.auth.session_cookie_name,
    );
    token
        .map(|t| state.auth.verify_session_token(&t))
        .unwrap_or(false)
}

pub async fn require_api_auth(
    State(state): State<Arc<AppState>>,
    req: Request,
    next: Next,
) -> Response {
    if is_request_authenticated(&state, &req) {
        return next.run(req).await;
    }

    (
        StatusCode::UNAUTHORIZED,
        Json(json!({
            "success": false,
            "error": "UNAUTHORIZED",
            "message": "Access denied. Valid authentication session required.",
        })),
    )
        .into_response()
}

pub async fn require_ui_auth(
    State(state): State<Arc<AppState>>,
    req: Request,
    next: Next,
) -> Response {
    if is_request_authenticated(&state, &req) {
        return next.run(req).await;
    }
    if req.headers().contains_key("hx-request") {
        let mut resp = (StatusCode::UNAUTHORIZED, "").into_response();
        resp.headers_mut()
            .insert("hx-redirect", HeaderValue::from_static("/login"));
        return resp;
    }
    Redirect::to("/login").into_response()
}

fn client_ip(headers: &HeaderMap) -> String {
    if let Some(fwd) = headers.get("x-forwarded-for").and_then(|v| v.to_str().ok())
        && let Some(first) = fwd.split(',').next()
    {
        let t = first.trim();
        if !t.is_empty() {
            return t.to_string();
        }
    }
    "127.0.0.1".to_string()
}

pub async fn get_session(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Query(params): Query<HashMap<String, String>>,
) -> Response {
    if !state.auth.auth_enabled {
        return Json(json!({
            "success": true,
            "authenticated": true,
            "authEnabled": false,
            "username": "admin",
            "totpEnabled": false,
        }))
        .into_response();
    }

    let query_token = params.get("auth_token").map(|s| format!("auth_token={s}"));
    let token = extract_session_token(
        &headers,
        query_token.as_deref(),
        &state.auth.session_cookie_name,
    );
    let is_valid = token
        .map(|t| state.auth.verify_session_token(&t))
        .unwrap_or(false);
    let cfg = state.auth.get_auth_config();

    Json(json!({
        "success": true,
        "authenticated": is_valid,
        "authEnabled": true,
        "username": if is_valid { Some(cfg.username) } else { None },
        "totpEnabled": cfg.totp_enabled,
    }))
    .into_response()
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginPayload {
    pub username: Option<String>,
    pub password: Option<String>,
    pub totp_code: Option<String>,
}

pub async fn post_login(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(body): Json<LoginPayload>,
) -> Result<Response, AppError> {
    let ip = client_ip(&headers);
    if let RateLimitDecision::Locked { remaining_sec } = state.auth.check_rate_limit(&ip) {
        return Err(AppError::too_many_requests(format!(
            "Too many failed attempts. Access temporarily locked for {remaining_sec}s."
        )));
    }

    let password = body.password.unwrap_or_default();
    if password.is_empty() {
        return Err(AppError::bad_request("BAD_REQUEST", "Password is required."));
    }

    if let Some(username) = &body.username
        && !username.trim().is_empty()
        && !state.auth.verify_username(username)
    {
        state.auth.record_failed_attempt(&ip);
        return Err(AppError::unauthorized("Invalid username or password."));
    }

    if !state.auth.verify_password(&password) {
        state.auth.record_failed_attempt(&ip);
        return Err(AppError::unauthorized("Invalid username or password."));
    }

    let auth_cfg = state.auth.get_auth_config();
    if auth_cfg.totp_enabled {
        let code = body.totp_code.as_deref().unwrap_or("").trim();
        if code.is_empty() {
            return Ok(Json(json!({
                "success": false,
                "requireTotp": true,
                "message": "Two-factor authentication code required.",
            }))
            .into_response());
        }
        let secret = auth_cfg.totp_secret.as_deref().unwrap_or("");
        if !AuthService::verify_totp_token(code, secret) {
            state.auth.record_failed_attempt(&ip);
            return Err(AppError::Http {
                status: StatusCode::UNAUTHORIZED,
                code: "INVALID_TOTP".to_string(),
                message: "Invalid 6-digit Authenticator code.".to_string(),
                is_htmx: false,
            });
        }
    }

    state.auth.reset_rate_limit(&ip);
    let token = state.auth.create_session_token();
    let cookie = state.auth.build_session_cookie(&token);

    let mut resp = Json(json!({
        "success": true,
        "token": token,
        "username": auth_cfg.username,
        "message": "Authenticated successfully.",
    }))
    .into_response();
    if let Ok(val) = HeaderValue::from_str(&cookie) {
        resp.headers_mut().insert(header::SET_COOKIE, val);
    }
    Ok(resp)
}

pub async fn post_logout(State(state): State<Arc<AppState>>) -> Response {
    let cookie = state.auth.build_clear_session_cookie();
    let mut resp = Json(json!({
        "success": true,
        "message": "Logged out successfully.",
    }))
    .into_response();
    if let Ok(val) = HeaderValue::from_str(&cookie) {
        resp.headers_mut().insert(header::SET_COOKIE, val);
    }
    resp
}

pub async fn post_revoke_all(State(state): State<Arc<AppState>>) -> Result<Response, AppError> {
    state
        .auth
        .revoke_all_sessions()
        .map_err(AppError::Internal)?;
    let fresh_token = state.auth.create_session_token();
    let cookie = state.auth.build_session_cookie(&fresh_token);

    let mut resp = Json(json!({
        "success": true,
        "token": fresh_token,
        "message": "All other active sessions have been revoked.",
    }))
    .into_response();
    if let Ok(val) = HeaderValue::from_str(&cookie) {
        resp.headers_mut().insert(header::SET_COOKIE, val);
    }
    Ok(resp)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCredentialsPayload {
    pub current_password: Option<String>,
    pub new_username: Option<String>,
    pub new_password: Option<String>,
}

pub async fn put_credentials(
    State(state): State<Arc<AppState>>,
    Json(body): Json<UpdateCredentialsPayload>,
) -> Result<Response, AppError> {
    let current_pw = body.current_password.unwrap_or_default();
    if current_pw.is_empty() {
        return Err(AppError::bad_request(
            "BAD_REQUEST",
            "Current password is required to update credentials.",
        ));
    }
    if !state.auth.verify_password(&current_pw) {
        return Err(AppError::Http {
            status: StatusCode::UNAUTHORIZED,
            code: "INVALID_CURRENT_PASSWORD".to_string(),
            message: "Incorrect current password.".to_string(),
            is_htmx: false,
        });
    }

    if let Some(u) = &body.new_username
        && !u.trim().is_empty()
        && u.trim().len() < 3
    {
        return Err(AppError::bad_request(
            "INVALID_USERNAME",
            "Username must be at least 3 characters long.",
        ));
    }

    if let Some(p) = &body.new_password
        && !p.is_empty()
        && p.len() < 6
    {
        return Err(AppError::bad_request(
            "INVALID_PASSWORD",
            "New password must be at least 6 characters long.",
        ));
    }

    let updated = state
        .auth
        .update_credentials(body.new_username.as_deref(), body.new_password.as_deref())
        .map_err(AppError::Internal)?;

    let fresh_token = state.auth.create_session_token();
    let cookie = state.auth.build_session_cookie(&fresh_token);
    let mut resp = Json(json!({
        "success": true,
        "username": updated.username,
        "token": fresh_token,
        "message": "Credentials updated successfully. All other sessions have been revoked.",
    }))
    .into_response();
    if let Ok(val) = HeaderValue::from_str(&cookie) {
        resp.headers_mut().insert(header::SET_COOKIE, val);
    }
    Ok(resp)
}

pub async fn get_2fa_status(State(state): State<Arc<AppState>>) -> Json<serde_json::Value> {
    let current = state.auth.get_auth_config();
    Json(json!({
        "success": true,
        "enabled": current.totp_enabled,
    }))
}

pub async fn post_2fa_setup(State(state): State<Arc<AppState>>) -> Json<serde_json::Value> {
    let current = state.auth.get_auth_config();
    let secret = AuthService::generate_totp_secret();
    let otpauth_url = AuthService::get_otpauth_url(&current.username, &secret);
    let qr_svg = AuthService::render_totp_qr_svg(&otpauth_url).ok();

    Json(json!({
        "success": true,
        "secret": secret,
        "otpauthUrl": otpauth_url,
        "qrSvg": qr_svg,
        "issuer": "X-SENTINEL",
        "username": current.username,
    }))
}

#[derive(Debug, Deserialize)]
pub struct Enable2faPayload {
    pub secret: Option<String>,
    pub code: Option<String>,
}

pub async fn post_2fa_enable(
    State(state): State<Arc<AppState>>,
    Json(body): Json<Enable2faPayload>,
) -> Result<Json<serde_json::Value>, AppError> {
    let secret = body.secret.unwrap_or_default();
    let code = body.code.unwrap_or_default();
    if secret.is_empty() || code.is_empty() {
        return Err(AppError::bad_request(
            "BAD_REQUEST",
            "Secret and verification code are required.",
        ));
    }
    if !AuthService::verify_totp_token(&code, &secret) {
        return Err(AppError::bad_request(
            "INVALID_TOTP_CODE",
            "Invalid 6-digit code. Please verify the code in your Authenticator app.",
        ));
    }

    let mut cfg = state.auth.get_auth_config();
    cfg.totp_enabled = true;
    cfg.totp_secret = Some(secret);
    state.auth.save_auth_config(cfg).map_err(AppError::Internal)?;

    Ok(Json(json!({
        "success": true,
        "message": "Two-factor authentication successfully enabled.",
    })))
}

#[derive(Debug, Deserialize)]
pub struct Disable2faPayload {
    pub password: Option<String>,
}

pub async fn post_2fa_disable(
    State(state): State<Arc<AppState>>,
    Json(body): Json<Disable2faPayload>,
) -> Result<Json<serde_json::Value>, AppError> {
    let pw = body.password.unwrap_or_default();
    if pw.is_empty() || !state.auth.verify_password(&pw) {
        return Err(AppError::Http {
            status: StatusCode::UNAUTHORIZED,
            code: "INVALID_PASSWORD".to_string(),
            message: "Valid password required to disable 2FA.".to_string(),
            is_htmx: false,
        });
    }

    let mut cfg = state.auth.get_auth_config();
    cfg.totp_enabled = false;
    cfg.totp_secret = None;
    state.auth.save_auth_config(cfg).map_err(AppError::Internal)?;

    Ok(Json(json!({
        "success": true,
        "message": "Two-factor authentication successfully disabled.",
    })))
}
