//! Background 15-second scheduler loop executing POST_QUEUE, BATCH_ENGAGEMENT, and RECURRING_HUNTER.

use chrono::{DateTime, Utc};
use serde_json::json;
use std::fs;
use std::sync::Arc;
use std::time::{Duration, SystemTime};
use tokio::sync::Mutex;
use tokio_util::sync::CancellationToken;

use crate::bot_bridge::BotBridge;
use crate::db::LocalDb;
use crate::domain::notifier;
use crate::logger::LogHub;

pub struct SchedulerService {
    db: Arc<LocalDb>,
    logger: Arc<LogHub>,
    bot: Arc<BotBridge>,
    is_processing: Mutex<bool>,
    last_media_prune: Mutex<Option<SystemTime>>,
}

pub fn prune_old_media(media_dir: &std::path::Path, max_age_days: u64) -> (usize, usize) {
    if !media_dir.exists() {
        return (0, 0);
    }
    let max_age = Duration::from_secs(max_age_days * 24 * 60 * 60);
    let now = SystemTime::now();
    let mut deleted = 0usize;
    let mut total = 0usize;

    if let Ok(entries) = fs::read_dir(media_dir) {
        for entry in entries.flatten() {
            total += 1;
            let path = entry.path();
            if let Ok(meta) = entry.metadata()
                && meta.is_file()
                && let Ok(mtime) = meta.modified()
                && let Ok(age) = now.duration_since(mtime)
                && age > max_age
                && fs::remove_file(path).is_ok()
            {
                deleted += 1;
            }
        }
    }
    (deleted, total.saturating_sub(deleted))
}

impl SchedulerService {
    pub fn new(db: Arc<LocalDb>, logger: Arc<LogHub>, bot: Arc<BotBridge>) -> Self {
        Self {
            db,
            logger,
            bot,
            is_processing: Mutex::new(false),
            last_media_prune: Mutex::new(None),
        }
    }

    pub fn start(self: Arc<Self>, shutdown: CancellationToken) {
        self.logger.info("Scheduler engine active (15s interval).");
        tokio::spawn(async move {
            tokio::select! {
                _ = shutdown.cancelled() => return,
                _ = tokio::time::sleep(Duration::from_secs(5)) => {}
            }
            self.tick().await;

            let mut interval = tokio::time::interval(Duration::from_secs(15));
            loop {
                tokio::select! {
                    _ = shutdown.cancelled() => {
                        self.logger.info("Scheduler engine stopped.");
                        break;
                    }
                    _ = interval.tick() => {
                        self.tick().await;
                    }
                }
            }
        });
    }

    pub async fn tick(&self) {
        {
            let mut last = self.last_media_prune.lock().await;
            let should_prune = match *last {
                None => true,
                Some(ts) => ts.elapsed().unwrap_or_default() > Duration::from_secs(24 * 60 * 60),
            };
            if should_prune {
                *last = Some(SystemTime::now());
                let _ = prune_old_media(&self.db.media_dir, 7);
            }
        }

        if self.bot.is_running().await {
            return;
        }

        {
            let mut proc = self.is_processing.lock().await;
            if *proc {
                return;
            }
            *proc = true;
        }

        self.process_due_schedules().await;

        let mut proc = self.is_processing.lock().await;
        *proc = false;
    }

    async fn process_due_schedules(&self) {
        let schedules = self.db.get_schedules();
        if schedules.is_empty() {
            return;
        }
        let now_ms = Utc::now().timestamp_millis();

        // 1. POST_QUEUE
        if let Some(mut post_sch) = schedules.iter().find(|s| {
            s.schedule_type == "POST_QUEUE"
                && s.enabled
                && s.status == "PENDING"
                && DateTime::parse_from_rfc3339(&s.scheduled_at)
                    .map(|dt| dt.timestamp_millis() <= now_ms)
                    .unwrap_or(false)
        }).cloned() {
            self.logger.info(format!(
                "[Scheduler] Executing scheduled post: \"{}\"",
                post_sch.title
            ));
            post_sch.status = "RUNNING".to_string();
            let _ = self.db.save_schedule(post_sch.clone());
            self.bot
                .set_running_state(true, Some(json!({ "type": "MULTI_POST", "title": post_sch.title })))
                .await;

            let res = self
                .bot
                .call(
                    "run_post_task",
                    json!({
                        "accountIds": post_sch.account_ids,
                        "posts": post_sch.posts,
                        "options": {
                            "mediaPaths": post_sch.media_paths,
                            "delaySeconds": post_sch.delay_seconds,
                        }
                    }),
                )
                .await;

            self.bot.set_running_state(false, None).await;
            let ok = res.is_ok();
            post_sch.status = if ok { "COMPLETED" } else { "FAILED" }.to_string();
            post_sch.executed_at = Some(Utc::now().to_rfc3339());
            post_sch.last_message = Some(match &res {
                Ok(_) => "Published successfully".to_string(),
                Err(e) => e.clone(),
            });
            let _ = self.db.save_schedule(post_sch.clone());

            let settings = self.db.get_settings();
            notifier::notify_event(
                &settings,
                if ok { "POST_PUBLISHED" } else { "TASK_FAILED" },
                &json!({
                    "text": post_sch.posts.first().cloned().unwrap_or_else(|| "Scheduled post".to_string()),
                    "accountName": if post_sch.account_ids == json!("all") { "All Fleet" } else { "Node" },
                    "error": res.err().unwrap_or_default(),
                }),
            )
            .await;
            return;
        }

        // 2. BATCH_ENGAGEMENT
        if let Some(mut batch_sch) = schedules.iter().find(|s| {
            s.schedule_type == "BATCH_ENGAGEMENT"
                && s.enabled
                && (s.status == "PENDING" || s.status.is_empty())
                && DateTime::parse_from_rfc3339(&s.scheduled_at)
                    .map(|dt| dt.timestamp_millis() <= now_ms)
                    .unwrap_or(false)
        }).cloned() {
            self.logger.info(format!(
                "[Scheduler] Executing scheduled batch engagement: \"{}\" ({} targets)",
                batch_sch.title,
                batch_sch.urls.len()
            ));
            batch_sch.status = "RUNNING".to_string();
            let _ = self.db.save_schedule(batch_sch.clone());
            self.bot
                .set_running_state(true, Some(json!({ "type": "MULTI_BATCH", "title": batch_sch.title })))
                .await;

            let res = self
                .bot
                .call(
                    "run_batch_task",
                    json!({
                        "accountIds": batch_sch.account_ids,
                        "urls": batch_sch.urls,
                        "options": {
                            "like": batch_sch.like.unwrap_or(true),
                            "retweet": batch_sch.retweet.unwrap_or(true),
                            "comment": batch_sch.comment.unwrap_or(false),
                            "commentText": batch_sch.comment_text,
                        }
                    }),
                )
                .await;

            self.bot.set_running_state(false, None).await;
            let ok = res.is_ok();
            batch_sch.status = if ok { "COMPLETED" } else { "FAILED" }.to_string();
            batch_sch.executed_at = Some(Utc::now().to_rfc3339());
            batch_sch.last_message = Some(match &res {
                Ok(_) => "Batch completed".to_string(),
                Err(e) => e.clone(),
            });
            let _ = self.db.save_schedule(batch_sch.clone());

            let settings = self.db.get_settings();
            notifier::notify_event(
                &settings,
                if ok { "TASK_COMPLETED" } else { "TASK_FAILED" },
                &json!({
                    "taskType": "Batch Engagement",
                    "totalTargets": batch_sch.urls.len(),
                    "error": res.err().unwrap_or_default(),
                }),
            )
            .await;
            return;
        }

        // 3. RECURRING_HUNTER
        if let Some(mut hunter_sch) = schedules.iter().find(|s| {
            if s.schedule_type != "RECURRING_HUNTER" || !s.enabled {
                return false;
            }
            match &s.last_run_at {
                None => true,
                Some(ts) => DateTime::parse_from_rfc3339(ts)
                    .map(|dt| now_ms - dt.timestamp_millis() >= (s.interval_minutes.max(1) as i64) * 60_000)
                    .unwrap_or(true),
            }
        }).cloned() {
            let keyword = hunter_sch
                .keywords
                .first()
                .cloned()
                .unwrap_or_else(|| "crypto".to_string());
            self.logger.info(format!(
                "[Scheduler] Executing Recurring Feed Hunter ({})",
                hunter_sch.keywords.join(", ")
            ));
            hunter_sch.last_run_at = Some(Utc::now().to_rfc3339());
            let _ = self.db.save_schedule(hunter_sch.clone());
            self.bot
                .set_running_state(true, Some(json!({ "type": "HUNTER", "keyword": keyword })))
                .await;

            let res = self
                .bot
                .call(
                    "run_hunter_task",
                    json!({
                        "accountIds": hunter_sch.account_ids,
                        "keyword": keyword,
                        "count": hunter_sch.max_tweets,
                        "options": {
                            "like": hunter_sch.vectors.iter().any(|v| v == "LIKE"),
                            "retweet": hunter_sch.vectors.iter().any(|v| v == "RETWEET"),
                            "comment": hunter_sch.vectors.iter().any(|v| v == "COMMENT"),
                            "commentText": hunter_sch.comment_text,
                            "minDelay": hunter_sch.delay_seconds,
                            "maxDelay": hunter_sch.delay_seconds * 2,
                        }
                    }),
                )
                .await;

            self.bot.set_running_state(false, None).await;
            let settings = self.db.get_settings();
            notifier::notify_event(
                &settings,
                if res.is_ok() { "TASK_COMPLETED" } else { "TASK_FAILED" },
                &json!({
                    "taskType": "Recurring Feed Hunter",
                    "totalTargets": hunter_sch.max_tweets,
                    "error": res.err().unwrap_or_default(),
                }),
            )
            .await;
        }
    }
}
