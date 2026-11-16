//! Interaction history audit ledger endpoints (`/api/history/*`).

use axum::Json;
use axum::extract::{Query, State};
use serde::Deserialize;
use serde_json::{Value, json};
use std::sync::Arc;

use crate::error::AppError;
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct HistoryQuery {
    pub limit: Option<usize>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PruneHistoryPayload {
    pub older_than_days: Option<i64>,
    pub status: Option<String>,
    pub dry_run: Option<bool>,
}

/// `GET /api/history`
pub async fn get_history(
    State(state): State<Arc<AppState>>,
    Query(query): Query<HistoryQuery>,
) -> Json<Value> {
    let limit = query.limit.unwrap_or(100).clamp(1, 1000);
    let history = state.db.get_history(limit);
    let stats = state.db.get_stats();
    Json(json!({
        "success": true,
        "history": history,
        "stats": stats,
    }))
}

/// `POST /api/history/prune`
pub async fn prune_history(
    State(state): State<Arc<AppState>>,
    Json(body): Json<PruneHistoryPayload>,
) -> Result<Json<Value>, AppError> {
    let older_than_days = match body.older_than_days {
        Some(d) if !(1..=3650).contains(&d) => {
            return Err(AppError::validation(
                "olderThanDays must be between 1 and 3650.",
            ));
        }
        Some(d) => Some(d as u64),
        None => None,
    };

    if let Some(status) = &body.status
        && status.chars().count() > 30
    {
        return Err(AppError::validation("status must be at most 30 characters."));
    }

    let dry_run = body.dry_run.unwrap_or(false);
    let result = state
        .db
        .prune_history(older_than_days, body.status.as_deref(), dry_run)
        .map_err(AppError::Internal)?;

    state.logger.info(format!(
        "Audit Ledger pruned: {} entries removed{}.",
        result.deleted_count,
        if dry_run { " (dry-run)" } else { "" }
    ));

    Ok(Json(json!({
        "success": true,
        "deletedCount": result.deleted_count,
        "remainingCount": result.remaining_count,
    })))
}

/// `POST /api/history/clear-all`
pub async fn clear_history(State(state): State<Arc<AppState>>) -> Result<Json<Value>, AppError> {
    let deleted_count = state.db.clear_history().map_err(AppError::Internal)?;
    state.logger.warn(format!(
        "Entire Audit Ledger history reset ({deleted_count} entries removed)."
    ));
    Ok(Json(json!({
        "success": true,
        "deletedCount": deleted_count,
    })))
}
