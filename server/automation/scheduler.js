/**
 * X-SENTINEL Cron & Auto-Scheduler Service
 * Manages background execution of Post Queue and Recurring Feed Hunter.
 */

const db = require('../db');
const logger = require('../logger');
const twitterBot = require('./twitterBot');
const notifier = require('./notifier');

class SchedulerService {
  constructor() {
    this.interval = null;
    this.isProcessing = false;
    this.intervalMs = 15000; // Check every 15 seconds
    this.lastPruneCheck = 0;
  }

  /**
   * Start the scheduler background loop
   */
  start() {
    if (this.interval) return;
    logger.info('⏰ Scheduler engine active (15s interval).');
    this.interval = setInterval(() => this.tick(), this.intervalMs);
    // Run initial tick after 5s
    setTimeout(() => this.tick(), 5000);
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      logger.info('⏰ Scheduler engine stopped.');
    }
  }

  /**
   * Core tick evaluation
   */
  async tick() {
    const now = Date.now();

    // Periodic daily media cleanup (every 24h)
    if (now - this.lastPruneCheck > 24 * 60 * 60 * 1000) {
      this.lastPruneCheck = now;
      try {
        const { pruneOldMedia } = require('../routes/mediaRouter');
        if (typeof pruneOldMedia === 'function') {
          pruneOldMedia(7);
        }
      } catch {}
    }

    if (this.isProcessing || twitterBot.isRunning) {
      return; // Skip tick if bot is busy
    }

    const schedules = db.getSchedules();
    if (!schedules || schedules.length === 0) return;

    // 1. Process Pending Post Queues
    const pendingPost = schedules.find(
      (s) =>
        s.type === 'POST_QUEUE' &&
        s.enabled &&
        s.status === 'PENDING' &&
        new Date(s.scheduledAt).getTime() <= now
    );

    if (pendingPost) {
      this.isProcessing = true;
      logger.info(
        `⏰ [Scheduler] Executing scheduled post: "${pendingPost.title || pendingPost.posts?.[0]?.slice(0, 30)}"...`
      );

      db.saveSchedule({
        ...pendingPost,
        status: 'RUNNING',
      });

      try {
        const result = await twitterBot.startPostTask({
          accountIds: pendingPost.accountIds || 'all',
          posts: pendingPost.posts || [],
          mediaPaths: pendingPost.mediaPaths || [],
          delaySeconds: pendingPost.delaySeconds || 15,
        });

        db.saveSchedule({
          ...pendingPost,
          status: result.success ? 'COMPLETED' : 'FAILED',
          executedAt: new Date().toISOString(),
          lastMessage: result.message || (result.success ? 'Published successfully' : 'Failed'),
        });

        notifier.notify(result.success ? 'POST_PUBLISHED' : 'TASK_FAILED', {
          text: pendingPost.posts?.[0] || 'Scheduled post',
          accountName: pendingPost.accountIds === 'all' ? 'All Fleet' : 'Node',
          error: result.message,
        });
      } catch (err) {
        logger.error(`❌ [Scheduler Error]: ${err.message}`);
        db.saveSchedule({
          ...pendingPost,
          status: 'FAILED',
          executedAt: new Date().toISOString(),
          lastMessage: err.message,
        });
      } finally {
        this.isProcessing = false;
      }
      return;
    }

    // 2. Process Recurring Feed Hunter
    const dueHunter = schedules.find((s) => {
      if (s.type !== 'RECURRING_HUNTER' || !s.enabled) return false;
      if (!s.lastRunAt) return true;
      const elapsedMs = now - new Date(s.lastRunAt).getTime();
      return elapsedMs >= (s.intervalMinutes || 60) * 60 * 1000;
    });

    if (dueHunter) {
      this.isProcessing = true;
      logger.info(
        `📡 [Scheduler] Executing Recurring Feed Hunter (${dueHunter.keywords?.join(', ')})...`
      );

      db.saveSchedule({
        ...dueHunter,
        lastRunAt: new Date().toISOString(),
      });

      try {
        const result = await twitterBot.startHunterTask({
          keywords: dueHunter.keywords || [],
          vectors: dueHunter.vectors || ['LIKE', 'RETWEET', 'COMMENT'],
          maxTweets: dueHunter.maxTweets || 3,
          delaySeconds: dueHunter.delaySeconds || 15,
        });

        notifier.notify(result.success ? 'TASK_COMPLETED' : 'TASK_FAILED', {
          taskType: 'Recurring Feed Hunter',
          totalTargets: dueHunter.maxTweets || 3,
          error: result.message,
        });
      } catch (err) {
        logger.error(`❌ [Scheduler Hunter Error]: ${err.message}`);
      } finally {
        this.isProcessing = false;
      }
    }
  }
}

module.exports = new SchedulerService();
