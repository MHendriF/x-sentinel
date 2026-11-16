//! Unified application error type mapping cleanly to JSON responses.

use axum::Json;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
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
        }
    }

    pub fn forbidden(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self::Http {
            status: StatusCode::FORBIDDEN,
            code: code.into(),
            message: message.into(),
        }
    }

    pub fn not_found(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self::Http {
            status: StatusCode::NOT_FOUND,
            code: code.into(),
            message: message.into(),
        }
    }

    pub fn too_many_requests(message: impl Into<String>) -> Self {
        Self::Http {
            status: StatusCode::TOO_MANY_REQUESTS,
            code: "TOO_MANY_ATTEMPTS".to_string(),
            message: message.into(),
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        match self {
            AppError::Http {
                status,
                code,
                message,
            } => {
                let body = Json(json!({
                    "success": false,
                    "error": code,
                    "message": message,
                }));
                (status, body).into_response()
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
