//! Unified application error type mapping cleanly to JSON responses or HTMX alert partials.

use axum::Json;
use axum::http::StatusCode;
use axum::response::{Html, IntoResponse, Response};
use serde_json::json;
use thiserror::Error;

/// Structured error returned by handlers and middleware.
#[derive(Debug, Error)]
pub enum AppError {
    #[error("{message}")]
    Http {
        status: StatusCode,
        code: String,
        message: String,
        is_htmx: bool,
    },

    #[error("Internal error: {0}")]
    Internal(String),
}

impl AppError {
    pub fn bad_request(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self::Http {
            status: StatusCode::BAD_REQUEST,
            code: code.into(),
            message: message.into(),
            is_htmx: false,
        }
    }

    pub fn validation(message: impl Into<String>) -> Self {
        Self::bad_request("VALIDATION_ERROR", message)
    }

    pub fn unauthorized(message: impl Into<String>) -> Self {
        Self::Http {
            status: StatusCode::UNAUTHORIZED,
            code: "UNAUTHORIZED".to_string(),
            message: message.into(),
            is_htmx: false,
        }
    }

    pub fn forbidden(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self::Http {
            status: StatusCode::FORBIDDEN,
            code: code.into(),
            message: message.into(),
            is_htmx: false,
        }
    }

    pub fn not_found(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self::Http {
            status: StatusCode::NOT_FOUND,
            code: code.into(),
            message: message.into(),
            is_htmx: false,
        }
    }

    pub fn too_many_requests(message: impl Into<String>) -> Self {
        Self::Http {
            status: StatusCode::TOO_MANY_REQUESTS,
            code: "TOO_MANY_ATTEMPTS".to_string(),
            message: message.into(),
            is_htmx: false,
        }
    }

    pub fn with_htmx(mut self, htmx: bool) -> Self {
        if let Self::Http { is_htmx, .. } = &mut self {
            *is_htmx = htmx;
        }
        self
    }
}

fn escape_html(raw: &str) -> String {
    raw.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        match self {
            AppError::Http {
                status,
                code,
                message,
                is_htmx,
            } => {
                if is_htmx {
                    let html = format!(
                        "<div class=\"alert alert--error\" role=\"alert\">{}</div>",
                        escape_html(&message)
                    );
                    (status, Html(html)).into_response()
                } else {
                    let body = Json(json!({
                        "success": false,
                        "error": code,
                        "message": message,
                    }));
                    (status, body).into_response()
                }
            }
            AppError::Internal(err) => {
                tracing::error!(error = %err, "Internal server error");
                let body = Json(json!({
                    "success": false,
                    "error": "INTERNAL_ERROR",
                    "message": "An internal server error occurred.",
                }));
                (StatusCode::INTERNAL_SERVER_ERROR, body).into_response()
            }
        }
    }
}
