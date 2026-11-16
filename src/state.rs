//! Shared Axum application state.

use std::sync::Arc;
use std::time::Instant;

use crate::auth::AuthService;
use crate::bot_bridge::BotBridge;
use crate::config::AppConfig;
use crate::db::LocalDb;
use crate::domain::scheduler::SchedulerService;
use crate::domain::target_lock::TargetLock;
use crate::logger::LogHub;

pub struct AppState {
    pub config: AppConfig,
    pub db: Arc<LocalDb>,
    pub auth: Arc<AuthService>,
    pub logger: Arc<LogHub>,
    pub target_lock: Arc<TargetLock>,
    pub bot: Arc<BotBridge>,
    pub scheduler: Arc<SchedulerService>,
    pub started_at: Instant,
}

impl AppState {
    pub fn new(config: AppConfig) -> Result<Arc<Self>, String> {
        let db = Arc::new(LocalDb::new(&config)?);
        let auth = Arc::new(AuthService::new(&config));
        let logger = Arc::new(LogHub::new(&config));
        let target_lock = Arc::new(TargetLock::new());
        let bot = Arc::new(BotBridge::new(&config, Arc::clone(&db), Arc::clone(&logger)));
        let scheduler = Arc::new(SchedulerService::new(
            Arc::clone(&db),
            Arc::clone(&logger),
            Arc::clone(&bot),
        ));

        Ok(Arc::new(Self {
            config,
            db,
            auth,
            logger,
            target_lock,
            bot,
            scheduler,
            started_at: Instant::now(),
        }))
    }
}
