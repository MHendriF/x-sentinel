const db = require('../db');
const logger = require('../logger');
const notifier = require('./notifier');

const {
  sleep,
  randomDelay,
  humanType,
  humanScroll,
  extractTweetId,
} = require('./bot/humanCadence');
const {
  launchAccountBrowser,
  closeBrowserResources,
  applyStealthScripts,
} = require('./bot/browserFactory');
const { createPost } = require('./bot/tweetComposer');
const {
  likeTweet,
  retweetTweet,
  commentTweet,
  processTweetWithAccount,
} = require('./bot/interactionEngine');
const {
  verifyAccount,
  checkAccountHealth,
  checkFleetHealth,
  executeWarmupProtocol,
} = require('./bot/healthRunner');

class TwitterBot {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.currentAccount = null;
    this.isRunning = false;
    this.abortController = null;
    this.currentTask = null;
  }

  // Delegated utilities
  async sleep(ms) {
    return sleep(ms, this.abortController?.signal);
  }

  async randomDelay(minSec, maxSec) {
    return randomDelay(minSec, maxSec, this.abortController?.signal);
  }

  extractTweetId(url) {
    return extractTweetId(url);
  }

  async humanScroll(page) {
    return humanScroll(page);
  }

  async humanType(element, text) {
    return humanType(element, text, this.abortController?.signal);
  }

  async applyStealthScripts(context) {
    return applyStealthScripts(context);
  }

  /**
   * Initialize or reuse browser context for a specific node account
   */
  async initAccountBrowser(account, forceNew = false) {
    if (!account) {
      throw new Error('Account node not found or not selected.');
    }

    if (this.browser && this.context && this.currentAccount?.id === account.id && !forceNew) {
      return { browser: this.browser, context: this.context };
    }

    await this.closeBrowser();
    this.currentAccount = account;

    const { browser, context } = await launchAccountBrowser(account);
    this.browser = browser;
    this.context = context;

    return { browser: this.browser, context: this.context };
  }

  async createAccountContext(account) {
    const { context } = await this.initAccountBrowser(account);
    return context;
  }

  async getOrCreatePageForAccount(account) {
    await this.initAccountBrowser(account);
    if (!this.page || this.page.isClosed()) {
      this.page = await this.context.newPage();
      this.page.setDefaultTimeout(35000);
    }
    return this.page;
  }

  async closeBrowser() {
    await closeBrowserResources(this.browser, this.context, this.page);
    this.page = null;
    this.context = null;
    this.browser = null;
    this.currentAccount = null;
  }

  /**
   * Account resolution helper
   */
  resolveTaskAccounts(accountIds) {
    if (
      !accountIds ||
      accountIds === 'all' ||
      (Array.isArray(accountIds) && accountIds.includes('all'))
    ) {
      const active = db.getActiveAccounts();
      if (active.length === 0) {
        throw new Error(
          'No active accounts found. Please add or enable nodes in the Fleet Management deck.'
        );
      }
      return active;
    }

    if (Array.isArray(accountIds)) {
      const matched = accountIds.map((id) => db.getAccountById(id)).filter(Boolean);
      if (matched.length === 0) throw new Error('Selected accounts are invalid.');
      return matched;
    }

    const single = db.getAccountById(accountIds);
    if (!single) throw new Error('Selected account not found.');
    return [single];
  }

  parseCommentPayload(rawPayload) {
    if (!rawPayload || typeof rawPayload !== 'string') return [];
    const trimmed = rawPayload.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && Array.isArray(parsed.replies)) {
        return parsed.replies.map((r) => String(r).trim()).filter(Boolean);
      }
      if (Array.isArray(parsed)) {
        return parsed.map((r) => String(r).trim()).filter(Boolean);
      }
    } catch (e) {}

    const lines = trimmed
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    return lines;
  }

  // Delegated Actions
  async likeTweet(page, tweetUrl, account) {
    return likeTweet(page, tweetUrl, account);
  }

  async retweetTweet(page, tweetUrl, account) {
    return retweetTweet(page, tweetUrl, account);
  }

  async commentTweet(page, tweetUrl, account, customReplyText = null) {
    return commentTweet(page, tweetUrl, account, customReplyText);
  }

  async processTweetWithAccount(tweetUrl, account, options = {}) {
    const page = await this.getOrCreatePageForAccount(account);
    return processTweetWithAccount(page, tweetUrl, account, options);
  }

  async createPost(page, postText, account, mediaPaths = []) {
    return createPost(page, postText, account, mediaPaths);
  }

  async verifyAccount(account) {
    return verifyAccount(account);
  }

  async verifySession(authToken, ct0) {
    const acc = db.getAuth();
    acc.auth_token = authToken;
    acc.ct0 = ct0;
    return verifyAccount(acc);
  }

  async checkAccountHealth(account) {
    return checkAccountHealth(account);
  }

  async checkFleetHealth() {
    return checkFleetHealth();
  }

  async runWarmupTask(account) {
    if (this.isRunning) {
      throw new Error('An automation process is already active.');
    }
    this.isRunning = true;
    this.abortController = new AbortController();
    this.currentTask = { type: 'WARMUP', accountId: account.id };

    try {
      const res = await executeWarmupProtocol(account, this.abortController.signal);
      return res;
    } finally {
      this.isRunning = false;
      this.currentTask = null;
      this.abortController = null;
    }
  }

  /**
   * Run Multi-Account Post Publisher Task
   */
  async runMultiAccountPostTask(accountIds, posts, options = {}) {
    if (this.isRunning) {
      throw new Error('An automation process is already active.');
    }

    const targetAccounts = this.resolveTaskAccounts(accountIds);
    let postList = [];
    if (Array.isArray(posts)) {
      postList = posts.map((p) => String(p).trim()).filter(Boolean);
    } else if (typeof posts === 'string' && posts.trim()) {
      postList = [posts.trim()];
    }

    if (postList.length === 0) {
      throw new Error('Post content cannot be empty.');
    }

    this.isRunning = true;
    this.abortController = new AbortController();
    this.currentTask = {
      type: 'MULTI_POST',
      accountsCount: targetAccounts.length,
      postsCount: postList.length,
      total: targetAccounts.length,
      completed: 0,
      failed: 0,
    };

    const mediaPaths = options.mediaPaths || [];

    logger.info(
      `🚀 Launching Fleet Post Publishing (${targetAccounts.length} Nodes, ${postList.length} Content Drafts)...`
    );

    try {
      for (let a = 0; a < targetAccounts.length; a++) {
        if (this.abortController.signal.aborted) break;
        const account = targetAccounts[a];
        const postText = postList[a % postList.length];

        logger.action(
          `👤 [Post ${a + 1}/${targetAccounts.length}] Node: ${account.label} (@${account.username || 'user'})`
        );

        try {
          const page = await this.getOrCreatePageForAccount(account);
          const result = await this.createPost(page, postText, account, mediaPaths);
          if (result.success) {
            this.currentTask.completed++;
          } else {
            this.currentTask.failed++;
          }
        } catch (err) {
          if (err.message === 'TASK_ABORTED') throw err;
          logger.error(`❌ Post error on node ${account.label}: ${err.message}`);
          this.currentTask.failed++;
        }

        if (a < targetAccounts.length - 1) {
          const switchDelay = options.delaySeconds || db.getSettings().accountSwitchDelaySec || 15;
          logger.info(`⏳ Node rotation cooldown: ${switchDelay}s...`);
          await this.sleep(switchDelay * 1000);
        }
      }

      logger.success(`🏁 Completed publishing posts across ${targetAccounts.length} account nodes.`);
      notifier.notify('TASK_COMPLETED', {
        taskType: 'Fleet Post Publisher',
        totalTargets: targetAccounts.length,
      });
    } catch (err) {
      if (err.message === 'TASK_ABORTED') {
        logger.warn(`🛑 Fleet post publishing task aborted by operator.`);
      } else {
        logger.error(`❌ Post runner error: ${err.message}`);
        notifier.notify('TASK_FAILED', {
          taskType: 'Fleet Post Publisher',
          error: err.message,
        });
      }
    } finally {
      await this.closeBrowser();
      this.isRunning = false;
      this.currentTask = null;
      this.abortController = null;
    }
  }

  /**
   * Run Multi-Account Batch Engagement Task
   */
  async runMultiAccountBatchTask(accountIds, urls, options = {}) {
    if (this.isRunning) {
      throw new Error('An automation process is already active.');
    }

    const targetAccounts = this.resolveTaskAccounts(accountIds);
    if (!urls || urls.length === 0) {
      throw new Error('Target tweet URL list cannot be empty.');
    }

    this.isRunning = true;
    this.abortController = new AbortController();
    this.currentTask = {
      type: 'MULTI_BATCH',
      accountsCount: targetAccounts.length,
      urlsCount: urls.length,
      total: urls.length * targetAccounts.length,
      completed: 0,
      failed: 0,
    };

    const parsedReplies = this.parseCommentPayload(options.commentText);

    logger.info(
      `🚀 Launching Fleet Engagement Batch (${targetAccounts.length} Nodes, ${urls.length} Posts)...`
    );

    try {
      for (let u = 0; u < urls.length; u++) {
        if (this.abortController.signal.aborted) break;
        const url = urls[u].trim();
        if (!url) continue;

        logger.action(`📌 [Target ${u + 1}/${urls.length}] Executing engagement rotation: ${url}`);

        for (let a = 0; a < targetAccounts.length; a++) {
          if (this.abortController.signal.aborted) break;
          const account = targetAccounts[a];

          logger.info(
            `👤 Engaging via Node [${a + 1}/${targetAccounts.length}]: ${account.label} (@${account.username || 'user'})`
          );

          let accountSpecificCommentText = options.commentText;
          if (parsedReplies.length > 0) {
            accountSpecificCommentText = parsedReplies[a % parsedReplies.length];
          }

          try {
            await this.processTweetWithAccount(url, account, {
              ...options,
              commentText: accountSpecificCommentText,
            });
            this.currentTask.completed++;
          } catch (err) {
            if (err.message === 'TASK_ABORTED') throw err;
            logger.error(`❌ Error on node ${account.label}: ${err.message}`);
            this.currentTask.failed++;
          }

          if (a < targetAccounts.length - 1) {
            const switchDelay = db.getSettings().accountSwitchDelaySec || 10;
            logger.info(`⏳ Node rotation cooldown: ${switchDelay}s...`);
            await this.sleep(switchDelay * 1000);
          }
        }

        if (u < urls.length - 1) {
          await this.randomDelay(options.minDelay, options.maxDelay);
        }
      }

      logger.success(
        `🏁 Finished processing all target engagements with ${targetAccounts.length} nodes.`
      );
    } catch (err) {
      if (err.message === 'TASK_ABORTED') {
        logger.warn(`🛑 Fleet engagement task aborted by operator.`);
      } else {
        logger.error(`❌ Runner error: ${err.message}`);
      }
    } finally {
      await this.closeBrowser();
      this.isRunning = false;
      this.currentTask = null;
      this.abortController = null;
    }
  }

  /**
   * Run Multi-Account Keyword Hunter
   */
  async runMultiAccountHunter(accountIds, keyword, count = 10, options = {}) {
    if (this.isRunning) {
      throw new Error('An automation process is already active.');
    }

    const targetAccounts = this.resolveTaskAccounts(accountIds);
    this.isRunning = true;
    this.abortController = new AbortController();
    this.currentTask = {
      type: 'MULTI_HUNTER',
      keyword,
      accountsCount: targetAccounts.length,
      targetCount: count,
      completed: 0,
    };

    logger.info(
      `🔍 Launching Fleet Auto Hunter for "${keyword}" (${targetAccounts.length} Nodes)...`
    );

    try {
      const scraperAccount = targetAccounts[0];
      const page = await this.getOrCreatePageForAccount(scraperAccount);
      const searchUrl = `https://x.com/search?q=${encodeURIComponent(keyword)}&f=live`;

      logger.info(`🌐 Scraping posts from X: ${searchUrl}`);
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(4000);

      const collectedUrls = new Set();
      let scrollAttempts = 0;
      const maxScrolls = 15;

      while (collectedUrls.size < count && scrollAttempts < maxScrolls) {
        if (this.abortController.signal.aborted) break;

        const tweetLinks = await page.$$eval('article a[href*="/status/"]', (links) => {
          return links
            .map((a) => a.href)
            .filter(
              (href) =>
                !href.includes('/photo/') &&
                !href.includes('/video/') &&
                !href.includes('/analytics')
            );
        });

        tweetLinks.forEach((url) => {
          const cleanUrl = url.split('?')[0];
          if (cleanUrl.match(/\/status\/\d+$/)) {
            collectedUrls.add(cleanUrl);
          }
        });

        if (collectedUrls.size >= count) break;
        await this.humanScroll(page);
        await this.sleep(2000);
        scrollAttempts++;
      }

      const targetList = Array.from(collectedUrls).slice(0, count);
      logger.success(
        `🎯 Harvested ${targetList.length} posts for engagement across ${targetAccounts.length} nodes.`
      );

      const parsedReplies = this.parseCommentPayload(options.commentText);

      for (let i = 0; i < targetList.length; i++) {
        if (this.abortController.signal.aborted) break;
        const tweetUrl = targetList[i];

        logger.action(`📌 [Hunter ${i + 1}/${targetList.length}] Target: ${tweetUrl}`);

        for (let a = 0; a < targetAccounts.length; a++) {
          if (this.abortController.signal.aborted) break;
          const account = targetAccounts[a];

          logger.info(
            `👤 Node Action [${a + 1}/${targetAccounts.length}]: ${account.label} (@${account.username || 'user'})`
          );

          let accountSpecificCommentText = options.commentText;
          if (parsedReplies.length > 0) {
            accountSpecificCommentText = parsedReplies[a % parsedReplies.length];
          }

          try {
            await this.processTweetWithAccount(tweetUrl, account, {
              ...options,
              commentText: accountSpecificCommentText,
            });
            this.currentTask.completed++;
          } catch (err) {
            if (err.message === 'TASK_ABORTED') throw err;
            logger.error(`❌ Engagement failed on node ${account.label}: ${err.message}`);
          }

          if (a < targetAccounts.length - 1) {
            const switchDelay = db.getSettings().accountSwitchDelaySec || 10;
            await this.sleep(switchDelay * 1000);
          }
        }

        if (i < targetList.length - 1) {
          await this.randomDelay(options.minDelay, options.maxDelay);
        }
      }

      logger.success(`🏁 Fleet Hunter finished processing all target posts.`);
    } catch (err) {
      if (err.message === 'TASK_ABORTED') {
        logger.warn(`🛑 Fleet Auto Hunter aborted.`);
      } else {
        logger.error(`❌ Hunter error: ${err.message}`);
      }
    } finally {
      await this.closeBrowser();
      this.isRunning = false;
      this.currentTask = null;
      this.abortController = null;
    }
  }

  /**
   * Wrapper for scheduler post task execution
   */
  async startPostTask({ accountIds, posts, mediaPaths, delaySeconds } = {}) {
    try {
      await this.runMultiAccountPostTask(accountIds, posts, {
        mediaPaths: mediaPaths || [],
        delaySeconds: delaySeconds || 15,
      });
      return { success: true, message: 'Scheduled posts published successfully.' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  /**
   * Wrapper for scheduler hunter task execution
   */
  async startHunterTask({
    keywords = [],
    vectors = ['LIKE', 'RETWEET', 'COMMENT'],
    maxTweets = 3,
    delaySeconds = 15,
  } = {}) {
    try {
      const keyword = Array.isArray(keywords) && keywords.length > 0 ? keywords[0] : 'crypto';
      await this.runMultiAccountHunter('all', keyword, maxTweets, {
        like: vectors.includes('LIKE'),
        retweet: vectors.includes('RETWEET'),
        comment: vectors.includes('COMMENT'),
        minDelay: delaySeconds,
        maxDelay: delaySeconds * 2,
      });
      return { success: true, message: `Scheduled Hunter task for "${keyword}" completed.` };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  stopTask() {
    if (this.isRunning && this.abortController) {
      logger.warn(`⚠️ Sending abort signal to bot runner...`);
      this.abortController.abort();
      return true;
    }
    return false;
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      currentTask: this.currentTask,
      accounts: db.getAccounts(),
      activeAccountsCount: db.getActiveAccounts().length,
      stats: db.getStats(),
    };
  }
}

module.exports = new TwitterBot();
