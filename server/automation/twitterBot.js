const db = require('../db');
const logger = require('../logger');
const gov = require('./rateGovernor');
const targetLock = require('./targetLock');
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
  getContextPrimaryPage,
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
    this.isPaused = false;
    this.pauseReason = null;
    this.abortController = null;
    this.currentTask = null;
    this.lastMission = db.getLastMission ? db.getLastMission() : null;
  }

  isNetworkConnectionError(err) {
    if (!err || !err.message) return false;
    const msg = (err.message + ' ' + (err.stack || '')).toLowerCase();
    return (
      msg.includes('ns_error_net_timeout') ||
      msg.includes('ns_error_connection_refused') ||
      msg.includes('ns_error_unknown_host') ||
      msg.includes('ns_error_net_reset') ||
      msg.includes('err_internet_disconnected') ||
      msg.includes('err_connection_timed_out') ||
      msg.includes('err_connection_refused') ||
      msg.includes('err_connection_reset') ||
      msg.includes('err_name_not_resolved') ||
      msg.includes('err_proxy_connection_failed') ||
      msg.includes('econnrefused') ||
      msg.includes('enotfound') ||
      msg.includes('etimedout') ||
      msg.includes('econnreset') ||
      msg.includes('fetch failed') ||
      msg.includes('network is offline') ||
      msg.includes('proxy unreachable') ||
      msg.includes('net_error')
    );
  }

  async checkPauseState() {
    while (this.isPaused && !this.abortController?.signal?.aborted) {
      await this.sleep(500);
    }
    if (this.abortController?.signal?.aborted) {
      throw new Error('TASK_ABORTED');
    }
  }

  async interruptibleSleep(ms) {
    const slice = 250;
    let remaining = ms;
    while (remaining > 0) {
      if (this.abortController?.signal?.aborted) {
        throw new Error('TASK_ABORTED');
      }
      await this.checkPauseState();
      const currentSlice = Math.min(remaining, slice);
      await this.sleep(currentSlice);
      remaining -= currentSlice;
    }
  }

  pauseTask(reason = 'Manual pause by operator') {
    if (!this.isRunning || this.isPaused) {
      return false;
    }
    this.isPaused = true;
    this.pauseReason = reason;
    if (this.currentTask) {
      this.currentTask.previousAction = this.currentTask.currentAction || 'RUNNING';
      this.currentTask.currentAction = `PAUSED (${reason})`;
      this.currentTask.isPaused = true;
      this.currentTask.pauseReason = reason;
    }
    logger.warn(`⏸️ Automation task paused: ${reason}`);
    notifier.notify('TASK_PAUSED', {
      taskType: this.currentTask?.type || 'Automation Task',
      reason,
    });
    return true;
  }

  resumeTask() {
    if (!this.isRunning || !this.isPaused) {
      return false;
    }
    this.isPaused = false;
    this.pauseReason = null;
    if (this.currentTask) {
      this.currentTask.currentAction = this.currentTask.previousAction || 'RESUMED';
      this.currentTask.isPaused = false;
      this.currentTask.pauseReason = null;
    }
    logger.success(`▶️ Automation task resumed.`);
    return true;
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
  async initAccountBrowser(account, forceNew = false, options = {}) {
    if (!account) {
      throw new Error('Account node not found or not selected.');
    }

    if (this.browser && this.context && this.currentAccount?.id === account.id && !forceNew) {
      return { browser: this.browser, context: this.context };
    }

    await this.closeBrowser();
    this.currentAccount = account;

    const { browser, context, engine, isPersistent } = await launchAccountBrowser(account, options);
    this.browser = browser;
    this.context = context;
    this.currentEngine = engine;
    this.isPersistent = Boolean(isPersistent);

    const pages = typeof this.context?.pages === 'function' ? this.context.pages() : [];
    if (pages.length > 0) {
      this.page = pages[0];
      for (let i = 1; i < pages.length; i++) {
        await pages[i].close().catch(() => {});
      }
      this.page.setDefaultTimeout(35000);
    } else {
      this.page = null;
    }

    return { browser: this.browser, context: this.context };
  }

  async createAccountContext(account, options = {}) {
    const { context } = await this.initAccountBrowser(account, false, options);
    return context;
  }

  async getOrCreatePageForAccount(account, options = {}) {
    await this.initAccountBrowser(account, false, options);
    if (!this.page || this.page.isClosed()) {
      this.page = await getContextPrimaryPage(this.context, 35000);
    }
    return this.page;
  }

  async closeBrowser() {
    await closeBrowserResources(this.browser, this.context, this.page);
    this.page = null;
    this.context = null;
    this.browser = null;
    this.currentAccount = null;
    this.currentEngine = null;
    this.isPersistent = false;
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

  /**
   * Filter eligible accounts based on cooldown and warmup protocol
   */
  filterEligibleAccounts(accounts) {
    if (!Array.isArray(accounts)) return [];
    return accounts.filter((acc) => {
      if (acc.enabled === false) return false;
      const snap = gov.snapshot(acc);
      if (snap.coolingDown) {
        logger.warn(
          `⏸️ [@${acc.username || acc.label}] Sedang cooldown/karantina hingga ${new Date(snap.cooldownUntil).toLocaleTimeString()}. Dilewati dari batch.`
        );
        return false;
      }
      if (snap.riskScore >= 80) {
        logger.warn(
          `⚠️ [@${acc.username || acc.label}] Skor risiko restriksi terlalu tinggi (${snap.riskScore}/100). Node diistirahatkan dari batch.`
        );
        return false;
      }
      const quiet = snap.quietHour || gov.isQuietHour(acc);
      if (quiet.isQuiet) {
        logger.info(
          `🌙 [@${acc.username || acc.label}] Jam lokal node menunjukkan waktu istirahat (${quiet.localHour}:00 di ${quiet.timezone}). Dilewati dari batch.`
        );
        return false;
      }
      const settings = typeof db.getSettings === 'function' ? db.getSettings() : {};
      const enforceWarmup = settings.enforceWarmupGate !== false;
      if (enforceWarmup) {
        const day = Number(acc.warmupDay) || 1;
        if (day <= 2) {
          logger.info(
            `🐣 [@${acc.username || acc.label}] Masih warmup Day ${day}/7 (0 aksi diizinkan). Dilewati dari task batch.`
          );
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Pre-flight standing probe (§4.2)
   * Evaluates account standing, risk score, and active session before burning actions.
   */
  async performPreflightProbe(account, page = null) {
    if (!account) return { ok: false, reason: 'INVALID_ACCOUNT' };
    const snap = gov.snapshot(account);
    if (snap.coolingDown) {
      return { ok: false, reason: 'COOLDOWN', detail: snap.cooldownUntil };
    }
    if (snap.riskScore >= 80) {
      return { ok: false, reason: 'HIGH_RISK_SCORE', detail: snap.riskScore };
    }
    if (snap.quietHour?.isQuiet) {
      return { ok: false, reason: 'QUIET_HOURS', detail: snap.quietHour };
    }
    if (page && typeof page.url === 'function') {
      try {
        const currentUrl = page.url();
        if (
          currentUrl.includes('/login') ||
          currentUrl.includes('/account/suspended') ||
          currentUrl.includes('/account/access')
        ) {
          return { ok: false, reason: 'SESSION_RESTRICTED', detail: currentUrl };
        }
      } catch {}
    }
    return { ok: true };
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
  async likeTweet(page, tweetUrl, account, options = {}) {
    return likeTweet(page, tweetUrl, account, this.abortController?.signal, {
      ...options,
      engine: this.currentEngine,
    });
  }

  async retweetTweet(page, tweetUrl, account, options = {}) {
    return retweetTweet(page, tweetUrl, account, this.abortController?.signal, {
      ...options,
      engine: this.currentEngine,
    });
  }

  async commentTweet(page, tweetUrl, account, customReplyText = null, options = {}) {
    return commentTweet(page, tweetUrl, account, customReplyText, this.abortController?.signal, {
      ...options,
      engine: this.currentEngine,
    });
  }

  async processTweetWithAccount(tweetUrl, account, options = {}) {
    const page = await this.getOrCreatePageForAccount(account);
    return processTweetWithAccount(page, tweetUrl, account, {
      ...options,
      engine: this.currentEngine,
      abortSignal: this.abortController?.signal,
    });
  }

  async createPost(page, postText, account, mediaPaths = [], options = {}) {
    return createPost(page, postText, account, mediaPaths, this.abortController?.signal, {
      ...options,
      engine: this.currentEngine,
    });
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
        if (this.abortController?.signal?.aborted) {
          throw new Error('TASK_ABORTED');
        }
        await this.checkPauseState();
        const account = targetAccounts[a];
        const postText = postList[a % postList.length];

        await this.initAccountBrowser(account, false, options);
        const engineTag = this.currentEngine
          ? ` [Engine: ${this.currentEngine.toUpperCase()}${this.isPersistent ? ' (Persistent Profile)' : ''}]`
          : '';

        logger.action(
          `👤 [Post ${a + 1}/${targetAccounts.length}] Node: ${account.label} (@${account.username || 'user'})${engineTag}`
        );

        try {
          await this.checkPauseState();
          const page = await this.getOrCreatePageForAccount(account);
          const result = await this.createPost(page, postText, account, mediaPaths, {
            engine: this.currentEngine,
          });
          if (this.abortController?.signal?.aborted) {
            throw new Error('TASK_ABORTED');
          }
          if (result.success) {
            this.currentTask.completed++;
          } else {
            this.currentTask.failed++;
          }
        } catch (err) {
          if (err.message === 'TASK_ABORTED' || this.abortController?.signal?.aborted) {
            throw new Error('TASK_ABORTED');
          }
          if (this.isNetworkConnectionError(err)) {
            logger.warn(
              `⚠️ Network connection error on node ${account.label}: ${err.message}. Auto-pausing post publishing...`
            );
            this.pauseTask(`Offline / Network Error: ${err.message}`);
            a--;
            await this.checkPauseState();
            continue;
          }
          logger.error(`❌ Post error on node ${account.label}: ${err.message}`);
          db.addHistory({
            accountId: account.id,
            accountName: account.username || account.label,
            tweetUrl: '-',
            action: 'POST',
            status: 'FAILED',
            message: err.message,
            engine: this.currentEngine,
          });
          this.currentTask.failed++;
        }

        if (this.abortController?.signal?.aborted) {
          throw new Error('TASK_ABORTED');
        }

        if (a < targetAccounts.length - 1) {
          const switchDelayMs = gov.accountSwitchDelay();
          const switchDelaySec = Math.round(switchDelayMs / 1000);
          logger.info(`⏳ Node rotation cooldown: ${switchDelaySec}s...`);
          await this.interruptibleSleep(switchDelayMs);
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
      this.isPaused = false;
      this.pauseReason = null;
      if (this.currentTask) {
        this.lastMission = {
          ...this.currentTask,
          endedAt: new Date().toISOString(),
        };
        if (db.saveLastMission) {
          db.saveLastMission(this.lastMission);
        }
      }
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

    const rawAccounts = this.resolveTaskAccounts(accountIds);
    const targetAccounts = this.filterEligibleAccounts(rawAccounts);
    if (targetAccounts.length === 0) {
      throw new Error('Semua akun yang dipilih sedang dalam cooldown/karantina atau warmup Day 1-2.');
    }
    if (!urls || urls.length === 0) {
      throw new Error('Target tweet URL list cannot be empty.');
    }

    this.isRunning = true;
    this.abortController = new AbortController();
    const startedAt = new Date().toISOString();
    this.currentTask = {
      type: 'MULTI_BATCH',
      accountsCount: targetAccounts.length,
      urlsCount: urls.length,
      urls: [...urls],
      targetUrls: [...urls],
      total: urls.length * targetAccounts.length,
      completed: 0,
      failed: 0,
      quarantined: [],
      startedAt,
      currentNode: targetAccounts[0]?.username || targetAccounts[0]?.label || '',
      currentAction: 'INITIALIZING',
      currentUrl: urls[0]?.trim() || '',
    };

    const parsedReplies = this.parseCommentPayload(options.commentText);
    const networkRetries = new Map();

    logger.info(
      `🚀 Launching Fleet Engagement Batch (${targetAccounts.length} Nodes, ${urls.length} Posts)...`
    );

    try {
      for (let u = 0; u < urls.length; u++) {
        if (this.abortController?.signal?.aborted) {
          throw new Error('TASK_ABORTED');
        }
        await this.checkPauseState();
        const url = urls[u].trim();
        if (!url) continue;

        const tweetId = this.extractTweetId(url);
        logger.action(`📌 [Target ${u + 1}/${urls.length}] Executing engagement rotation: ${url}`);

        for (let a = 0; a < targetAccounts.length; a++) {
          if (this.abortController?.signal?.aborted) {
            throw new Error('TASK_ABORTED');
          }
          await this.checkPauseState();
          const account = targetAccounts[a];

          if (this.currentTask?.quarantined?.includes(account.id)) {
            continue;
          }
          const probe = await this.performPreflightProbe(account);
          if (!probe.ok) {
            logger.warn(`⏸️ [@${account.username || account.label}] Pre-flight probe ditolak (${probe.reason}). Dilewati untuk URL ini.`);
            continue;
          }

          // Target Lock: Cegah benturan multi-node pada target yang sama dalam jendela waktu
          if (tweetId) {
            const lockKind = options.comment ? 'REPLY' : 'ENGAGE';
            const ttlMs = lockKind === 'REPLY' ? 90 * 60 * 1000 : 20 * 60 * 1000;
            const lockDecision = targetLock.acquire(tweetId, account.id, { kind: lockKind, ttlMs });
            if (!lockDecision.ok) {
              const freeInMin = Math.ceil((lockDecision.freeInMs || 0) / 60000);
              logger.info(
                `🔒 [@${account.username || account.label}] Target ${tweetId} masih terkunci (${lockDecision.reason}, bebas ~${freeInMin}m). Skip target untuk node ini.`
              );
              continue;
            }
          }

          if (this.currentTask) {
            this.currentTask.currentNode = account.username || account.label;
            this.currentTask.currentUrl = url;
            this.currentTask.currentAction = 'CONNECTING';
          }

          await this.initAccountBrowser(account, false, options);
          const engineTag = this.currentEngine
            ? ` [Engine: ${this.currentEngine.toUpperCase()}${this.isPersistent ? ' (Persistent Profile)' : ''}]`
            : '';

          logger.info(
            `👤 Engaging via Node [${a + 1}/${targetAccounts.length}]: ${account.label} (@${account.username || 'user'})${engineTag}`
          );

          let accountSpecificCommentText = options.commentText;
          if (parsedReplies.length > 0) {
            accountSpecificCommentText = parsedReplies[a % parsedReplies.length];
          }

          try {
            await this.checkPauseState();
            const res = await this.processTweetWithAccount(url, account, {
              ...options,
              commentText: accountSpecificCommentText,
              onAction: (act) => {
                if (this.currentTask) {
                  this.currentTask.currentAction = act;
                }
              },
            });
            if (this.abortController?.signal?.aborted) {
              throw new Error('TASK_ABORTED');
            }

            const flagged =
              ['AUTOMATED_FLAG', 'DAILY_LIMIT_EXCEEDED'].includes(res?.like?.status) ||
              ['AUTOMATED_FLAG', 'DAILY_LIMIT_EXCEEDED'].includes(res?.retweet?.status) ||
              ['AUTOMATED_FLAG', 'DAILY_LIMIT_EXCEEDED'].includes(res?.comment?.status);

            if (flagged) {
              const code = res?.like?.code || res?.retweet?.code || res?.comment?.code || 226;
              gov.registerFlag(account, code);
              this.currentTask.quarantined = this.currentTask.quarantined || [];
              if (!this.currentTask.quarantined.includes(account.id)) {
                this.currentTask.quarantined.push(account.id);
              }
              notifier.notify('TASK_FAILED', {
                taskType: 'Node Quarantined',
                accountName: account.username || account.label,
                error: `Security flag / limit encountered (${code}). Node dikarantina dari sisa antrean.`,
              });
              logger.warn(
                `🛡️ [@${account.username || account.label}] Safeguard flag (${code}). Node dikarantina dari misi ini.`
              );
              continue;
            }

            networkRetries.delete(account.id);
            this.currentTask.completed++;
            if (this.currentTask) {
              this.currentTask.currentAction = 'SUCCESS';
            }
          } catch (err) {
            if (err.message === 'TASK_ABORTED' || this.abortController?.signal?.aborted) {
              throw new Error('TASK_ABORTED');
            }
            if (this.isNetworkConnectionError(err)) {
              const retries = (networkRetries.get(account.id) || 0) + 1;
              networkRetries.set(account.id, retries);

              if (retries > 3) {
                logger.error(
                  `❌ Node @${account.username || account.label} mengalami kendala jaringan ${retries}x berturut-turut. Node dikeluarkan dari sisa misi.`
                );
                this.currentTask.quarantined = this.currentTask.quarantined || [];
                this.currentTask.quarantined.push(account.id);
                continue;
              }

              const backoffMs = Math.min(300000, 2000 * Math.pow(2, retries - 1));
              logger.warn(
                `⚠️ Kendala koneksi jaringan pada node ${account.label}: ${err.message}. Percobaan ${retries}/3, backoff ${(backoffMs / 1000).toFixed(0)}s...`
              );
              this.pauseTask(`Offline / Network Error: ${err.message}`);
              a--;
              await this.interruptibleSleep(backoffMs);
              await this.checkPauseState();
              continue;
            }
            logger.error(`❌ Error on node ${account.label}: ${err.message}`);
            db.addHistory({
              accountId: account.id,
              accountName: account.username || account.label,
              tweetUrl: url,
              tweetId: this.extractTweetId(url),
              action: 'TASK',
              status: 'FAILED',
              message: err.message,
              engine: this.currentEngine,
            });
            this.currentTask.failed++;
            if (this.currentTask) {
              this.currentTask.currentAction = 'FAILED';
            }
          }

          if (this.abortController?.signal?.aborted) {
            throw new Error('TASK_ABORTED');
          }

          if (a < targetAccounts.length - 1) {
            const switchDelayMs = gov.accountSwitchDelay();
            const switchDelaySec = Math.round(switchDelayMs / 1000);
            if (this.currentTask) {
              this.currentTask.currentAction = `COOLDOWN (${switchDelaySec}s)`;
            }
            logger.info(`⏳ Node rotation cooldown: ${switchDelaySec}s...`);
            await this.interruptibleSleep(switchDelayMs);
          }
        }

        if (this.abortController?.signal?.aborted) {
          throw new Error('TASK_ABORTED');
        }

        if (u < urls.length - 1) {
          await this.checkPauseState();
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
      this.isPaused = false;
      this.pauseReason = null;
      if (this.currentTask) {
        this.lastMission = {
          ...this.currentTask,
          endedAt: new Date().toISOString(),
        };
        if (db.saveLastMission) {
          db.saveLastMission(this.lastMission);
        }
      }
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

    const rawAccounts = this.resolveTaskAccounts(accountIds);
    const targetAccounts = this.filterEligibleAccounts(rawAccounts);
    if (targetAccounts.length === 0) {
      throw new Error('Semua akun yang dipilih sedang dalam cooldown/karantina atau warmup Day 1-2.');
    }

    this.isRunning = true;
    this.abortController = new AbortController();
    this.currentTask = {
      type: 'HUNTER',
      keyword,
      accountsCount: targetAccounts.length,
      targetCount: count,
      total: count * targetAccounts.length,
      completed: 0,
      failed: 0,
      quarantined: [],
      startedAt: new Date().toISOString(),
      currentNode: targetAccounts[0]?.username || targetAccounts[0]?.label || '',
      currentAction: 'SEARCHING',
    };

    const hunterRetries = new Map();

    logger.info(
      `🔍 Launching Fleet Auto Hunter for "${keyword}" (${targetAccounts.length} Nodes)...`
    );

    try {
      const scraperAccount = targetAccounts[0];
      const page = await this.getOrCreatePageForAccount(scraperAccount, options);
      const searchUrl = `https://x.com/search?q=${encodeURIComponent(keyword)}&f=live`;

      logger.info(`🌐 Scraping posts from X: ${searchUrl}`);
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(4000);

      const collectedUrls = new Set();
      let scrollAttempts = 0;
      const maxScrolls = 15;

      while (collectedUrls.size < count && scrollAttempts < maxScrolls) {
        if (this.abortController?.signal?.aborted) throw new Error('TASK_ABORTED');

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
        if (this.abortController?.signal?.aborted) throw new Error('TASK_ABORTED');
        await this.humanScroll(page);
        await this.sleep(2000);
        scrollAttempts++;
      }

      if (this.abortController?.signal?.aborted) throw new Error('TASK_ABORTED');

      const targetList = Array.from(collectedUrls).slice(0, count);
      if (this.currentTask) {
        this.currentTask.urls = [...targetList];
        this.currentTask.targetUrls = [...targetList];
        this.currentTask.total = targetList.length * targetAccounts.length;
      }
      logger.success(
        `🎯 Harvested ${targetList.length} posts for engagement across ${targetAccounts.length} nodes.`
      );

      const parsedReplies = this.parseCommentPayload(options.commentText);

      for (let i = 0; i < targetList.length; i++) {
        if (this.abortController?.signal?.aborted) throw new Error('TASK_ABORTED');
        const tweetUrl = targetList[i];
        const tweetId = this.extractTweetId(tweetUrl);

        logger.action(`📌 [Hunter ${i + 1}/${targetList.length}] Target: ${tweetUrl}`);

        for (let a = 0; a < targetAccounts.length; a++) {
          if (this.abortController?.signal?.aborted) throw new Error('TASK_ABORTED');
          await this.checkPauseState();
          const account = targetAccounts[a];

          if (this.currentTask?.quarantined?.includes(account.id)) {
            continue;
          }
          const probe = await this.performPreflightProbe(account);
          if (!probe.ok) {
            logger.warn(`⏸️ [@${account.username || account.label}] Pre-flight probe ditolak (${probe.reason}). Dilewati untuk target ini.`);
            continue;
          }

          // Target Lock: Cegah benturan multi-node pada target yang sama dalam jendela waktu
          if (tweetId) {
            const lockKind = options.comment ? 'REPLY' : 'ENGAGE';
            const ttlMs = lockKind === 'REPLY' ? 90 * 60 * 1000 : 20 * 60 * 1000;
            const lockDecision = targetLock.acquire(tweetId, account.id, { kind: lockKind, ttlMs });
            if (!lockDecision.ok) {
              const freeInMin = Math.ceil((lockDecision.freeInMs || 0) / 60000);
              logger.info(
                `🔒 [@${account.username || account.label}] Target ${tweetId} masih terkunci (${lockDecision.reason}, bebas ~${freeInMin}m). Skip target untuk node ini.`
              );
              continue;
            }
          }

          await this.initAccountBrowser(account, false, options);
          const engineTag = this.currentEngine
            ? ` [Engine: ${this.currentEngine.toUpperCase()}${this.isPersistent ? ' (Persistent Profile)' : ''}]`
            : '';

          logger.info(
            `👤 Node Action [${a + 1}/${targetAccounts.length}]: ${account.label} (@${account.username || 'user'})${engineTag}`
          );

          let accountSpecificCommentText = options.commentText;
          if (parsedReplies.length > 0) {
            accountSpecificCommentText = parsedReplies[a % parsedReplies.length];
          }

          try {
            await this.checkPauseState();
            const res = await this.processTweetWithAccount(tweetUrl, account, {
              ...options,
              commentText: accountSpecificCommentText,
            });
            if (this.abortController?.signal?.aborted) throw new Error('TASK_ABORTED');

            const flagged =
              ['AUTOMATED_FLAG', 'DAILY_LIMIT_EXCEEDED'].includes(res?.like?.status) ||
              ['AUTOMATED_FLAG', 'DAILY_LIMIT_EXCEEDED'].includes(res?.retweet?.status) ||
              ['AUTOMATED_FLAG', 'DAILY_LIMIT_EXCEEDED'].includes(res?.comment?.status);

            if (flagged) {
              const code = res?.like?.code || res?.retweet?.code || res?.comment?.code || 226;
              gov.registerFlag(account, code);
              this.currentTask.quarantined = this.currentTask.quarantined || [];
              if (!this.currentTask.quarantined.includes(account.id)) {
                this.currentTask.quarantined.push(account.id);
              }
              notifier.notify('TASK_FAILED', {
                taskType: 'Node Quarantined',
                accountName: account.username || account.label,
                error: `Security flag / limit encountered (${code}). Node dikarantina dari sisa hunter mission.`,
              });
              logger.warn(
                `🛡️ [@${account.username || account.label}] Flag (${code}) terdeteksi. Node dikarantina dari antrean hunter.`
              );
              continue;
            }

            hunterRetries.delete(account.id);
            this.currentTask.completed++;
          } catch (err) {
            if (err.message === 'TASK_ABORTED' || this.abortController?.signal?.aborted) {
              throw new Error('TASK_ABORTED');
            }
            if (this.isNetworkConnectionError(err)) {
              const retries = (hunterRetries.get(account.id) || 0) + 1;
              hunterRetries.set(account.id, retries);

              if (retries > 3) {
                logger.error(
                  `❌ Node @${account.username || account.label} gagal koneksi jaringan ${retries}x. Node diskip dari sisa hunter mission.`
                );
                this.currentTask.quarantined = this.currentTask.quarantined || [];
                this.currentTask.quarantined.push(account.id);
                continue;
              }

              const backoffMs = Math.min(300000, 2000 * Math.pow(2, retries - 1));
              logger.warn(
                `⚠️ Kendala koneksi jaringan pada node ${account.label}: ${err.message}. Percobaan ${retries}/3, backoff ${(backoffMs / 1000).toFixed(0)}s...`
              );
              this.pauseTask(`Offline / Network Error: ${err.message}`);
              a--;
              await this.interruptibleSleep(backoffMs);
              await this.checkPauseState();
              continue;
            }
            logger.error(`❌ Engagement failed on node ${account.label}: ${err.message}`);
            db.addHistory({
              accountId: account.id,
              accountName: account.username || account.label,
              tweetUrl,
              tweetId: this.extractTweetId(tweetUrl),
              action: 'TASK',
              status: 'FAILED',
              message: err.message,
              engine: this.currentEngine,
            });
          }

          if (this.abortController?.signal?.aborted) throw new Error('TASK_ABORTED');

          if (a < targetAccounts.length - 1) {
            const switchDelayMs = gov.accountSwitchDelay();
            const switchDelaySec = Math.round(switchDelayMs / 1000);
            logger.info(`⏳ Node rotation cooldown: ${switchDelaySec}s...`);
            await this.interruptibleSleep(switchDelayMs);
          }
        }

        if (this.abortController?.signal?.aborted) throw new Error('TASK_ABORTED');

        if (i < targetList.length - 1) {
          await this.checkPauseState();
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
      this.isPaused = false;
      this.pauseReason = null;
      if (this.currentTask) {
        this.lastMission = {
          ...this.currentTask,
          endedAt: new Date().toISOString(),
        };
        if (db.saveLastMission) {
          db.saveLastMission(this.lastMission);
        }
      }
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
    accountIds = 'all',
    commentText = null,
  } = {}) {
    try {
      const keyword = Array.isArray(keywords) && keywords.length > 0 ? keywords[0] : 'crypto';
      await this.runMultiAccountHunter(accountIds || 'all', keyword, maxTweets, {
        like: vectors.includes('LIKE'),
        retweet: vectors.includes('RETWEET'),
        comment: vectors.includes('COMMENT'),
        commentText: commentText || null,
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
      if (this.page && !this.page.isClosed()) {
        this.page.close().catch(() => {});
      }
      return true;
    }
    return false;
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      pauseReason: this.pauseReason,
      currentTask: this.currentTask,
      lastMission: this.lastMission || (db.getLastMission ? db.getLastMission() : null),
      accounts: db.getAccounts(),
      activeAccountsCount: db.getActiveAccounts().length,
      stats: db.getStats(),
    };
  }
}

module.exports = new TwitterBot();
