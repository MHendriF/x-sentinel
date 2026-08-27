const fs = require('fs');
const { chromium } = require('playwright');
const config = require('../config');
const db = require('../db');
const logger = require('../logger');
const cookieManager = require('./cookieManager');
const proxyHelper = require('./proxyHelper');
const spintax = require('./spintax');
const aiService = require('./aiService');
const notifier = require('./notifier');

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

  /**
   * Helper delay with cancellation support
   */
  async sleep(ms) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, ms);
      if (this.abortController?.signal) {
        this.abortController.signal.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
            reject(new Error('TASK_ABORTED'));
          },
          { once: true }
        );
      }
    });
  }

  /**
   * Random delay between min and max seconds
   */
  async randomDelay(minSec, maxSec) {
    const min = minSec || db.getSettings().minDelaySeconds || 15;
    const max = maxSec || db.getSettings().maxDelaySeconds || 35;
    const delayMs = Math.floor((Math.random() * (max - min + 1) + min) * 1000);
    logger.info(`⏳ Jeda humanized delay selama ${(delayMs / 1000).toFixed(1)} detik...`);
    await this.sleep(delayMs);
  }

  /**
   * Extract Tweet ID from URL
   */
  extractTweetId(url) {
    if (!url) return null;
    const match = url.match(/\/status\/(\d+)/);
    return match ? match[1] : null;
  }

  /**
   * Inject advanced anti-bot stealth scripts into Playwright browser context
   */
  async applyStealthScripts(context) {
    await context.addInitScript(() => {
      // 1. Mask navigator.webdriver
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
        configurable: true,
      });

      // 2. Mock window.chrome runtime
      window.chrome = {
        runtime: {},
        loadTimes: function () {},
        csi: function () {},
        app: {},
      };

      // 3. Mock navigator.plugins & mimeTypes
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          {
            name: 'Chrome PDF Plugin',
            filename: 'internal-pdf-viewer',
            description: 'Portable Document Format',
          },
          {
            name: 'Chrome PDF Viewer',
            filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
            description: '',
          },
          { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
        ],
        configurable: true,
      });

      // 4. Mock languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en', 'id'],
        configurable: true,
      });

      // 5. Mock realistic hardware concurrency & memory
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8, configurable: true });
      Object.defineProperty(navigator, 'deviceMemory', { get: () => 8, configurable: true });

      // 6. Mock WebGL Vendor & Renderer (Spoof to hardware GPU)
      try {
        const getParameterProto = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function (parameter) {
          // UNMASKED_VENDOR_WEBGL
          if (parameter === 37445) return 'Google Inc. (NVIDIA)';
          // UNMASKED_RENDERER_WEBGL
          if (parameter === 37446)
            return 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)';
          return getParameterProto.apply(this, arguments);
        };
      } catch (e) {}

      // 7. Mock Notification Permissions
      if (window.navigator.permissions) {
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) =>
          parameters.name === 'notifications'
            ? Promise.resolve({ state: Notification.permission })
            : originalQuery(parameters);
      }
    });
  }

  /**
   * Initialize Playwright Browser & Context for a specific account with its proxy and cookies
   */
  async initAccountBrowser(account, forceNew = false) {
    if (!account) {
      throw new Error('Akun tidak ditemukan atau belum dipilih.');
    }

    // Reuse if same account
    if (this.browser && this.context && this.currentAccount?.id === account.id && !forceNew) {
      return { browser: this.browser, context: this.context };
    }

    await this.closeBrowser();

    this.currentAccount = account;
    const settings = db.getSettings();
    const isHeadless = Boolean(settings.headless);

    const launchOptions = {
      headless: isHeadless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--window-size=1280,850',
        '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
        '--enforce-webrtc-ip-permission-check',
        '--ignore-certificate-errors',
      ],
    };

    // Apply Proxy if specified for this account
    if (account.proxy) {
      const proxyLaunch = proxyHelper.getPlaywrightLaunchProxy(account.proxy);
      if (proxyLaunch) {
        launchOptions.proxy = proxyLaunch;
        logger.info(
          `🌐 Menggunakan Proxy untuk @${account.username || account.label}: ${proxyLaunch.server}`
        );
      }
    }

    logger.info(
      `🚀 Membuka browser untuk akun @${account.username || account.label} (Headless: ${isHeadless ? 'Aktif' : 'Nonaktif'})...`
    );
    this.browser = await chromium.launch(launchOptions);

    this.context = await this.browser.newContext({
      userAgent: config.USER_AGENT,
      viewport: { width: 1280, height: 850 },
      locale: 'en-US',
      timezoneId: 'Asia/Jakarta',
    });

    // Apply Stealth Scripts
    await this.applyStealthScripts(this.context);

    // Inject cookies
    if (account.auth_token) {
      await cookieManager.applyCookies(this.context, account.auth_token, account.ct0);
    }

    return { browser: this.browser, context: this.context };
  }

  async closeBrowser() {
    try {
      if (this.page) {
        await this.page.close().catch(() => {});
        this.page = null;
      }
      if (this.context) {
        await this.context.close().catch(() => {});
        this.context = null;
      }
      if (this.browser) {
        await this.browser.close().catch(() => {});
        this.browser = null;
      }
    } catch (e) {
      // ignore teardown errors
    }
    this.currentAccount = null;
  }

  /**
   * Verify an Account's session and proxy connection on X
   */
  async verifyAccount(account) {
    let tempBrowser = null;
    try {
      logger.info(`🔍 Memverifikasi akun: ${account.label} (@${account.username || 'unknown'})...`);

      const validation = cookieManager.validateFormat(account.auth_token, account.ct0);
      if (!validation.valid) {
        return { success: false, message: validation.message };
      }

      const launchOptions = {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
          '--enforce-webrtc-ip-permission-check',
        ],
      };

      if (account.proxy) {
        const proxyLaunch = proxyHelper.getPlaywrightLaunchProxy(account.proxy);
        if (proxyLaunch) {
          launchOptions.proxy = proxyLaunch;
          logger.info(`🌐 Memeriksa koneksi melalui Proxy: ${proxyLaunch.server}`);
        }
      }

      tempBrowser = await chromium.launch(launchOptions);
      const tempContext = await tempBrowser.newContext({
        userAgent: config.USER_AGENT,
        viewport: { width: 1280, height: 800 },
      });

      await this.applyStealthScripts(tempContext);
      await cookieManager.applyCookies(tempContext, account.auth_token, account.ct0);

      const page = await tempContext.newPage();
      page.setDefaultTimeout(30000);

      await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(4000);

      const currentUrl = page.url();

      if (currentUrl.includes('/login') || currentUrl.includes('/i/flow/login')) {
        logger.error(`❌ Cookie untuk ${account.label} tidak valid atau kedaluwarsa.`);
        db.saveAccount({ ...account, isValid: false, lastChecked: new Date().toISOString() });
        return { success: false, message: 'Cookie auth_token tidak valid atau sudah kedaluwarsa.' };
      }

      let username = '';
      let name = '';
      let avatar = '';

      try {
        const accountSwitcher = await page
          .waitForSelector('[data-testid="SideNav_AccountSwitcher_Button"]', { timeout: 8000 })
          .catch(() => null);
        if (accountSwitcher) {
          const accountText = await accountSwitcher.innerText();
          const lines = accountText
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean);
          if (lines.length > 0) {
            name = lines[0] || '';
            username = lines.find((l) => l.startsWith('@')) || '';
          }
          const imgEl = await accountSwitcher.$('img');
          if (imgEl) {
            avatar = await imgEl.getAttribute('src');
          }
        }
      } catch (e) {}

      if (!username) {
        const isHome = await page.$('[data-testid="primaryColumn"]');
        if (isHome) {
          username = account.username ? `@${account.username}` : '@ActiveUser';
          name = account.name || 'X User';
        }
      }

      if (username) {
        const updated = db.saveAccount({
          ...account,
          username: username.replace('@', ''),
          name: name || username,
          avatar: avatar || account.avatar || '',
          isValid: true,
          lastChecked: new Date().toISOString(),
        });

        logger.success(`🎉 Berhasil terhubung ke akun: @${updated.username} (${updated.name})`);
        return { success: true, account: updated };
      } else {
        return { success: false, message: 'Gagal memverifikasi akun. Periksa cookie & proxy.' };
      }
    } catch (err) {
      logger.error(`❌ Error verifikasi ${account.label}: ${err.message}`);
      return { success: false, message: `Gagal verifikasi: ${err.message}` };
    } finally {
      if (tempBrowser) {
        await tempBrowser.close().catch(() => {});
      }
    }
  }

  /**
   * Verify session legacy helper
   */
  async verifySession(authToken, ct0) {
    const acc = db.getAuth();
    acc.auth_token = authToken;
    acc.ct0 = ct0;
    return this.verifyAccount(acc);
  }

  /**
   * Ensure page is open for current account
   */
  async getOrCreatePageForAccount(account) {
    await this.initAccountBrowser(account);
    if (!this.page || this.page.isClosed()) {
      this.page = await this.context.newPage();
      this.page.setDefaultTimeout(35000);
    }
    return this.page;
  }

  async humanScroll(page) {
    try {
      const scrollDistance = Math.floor(Math.random() * 250) + 150;
      await page.mouse.wheel(0, scrollDistance);
      await page.waitForTimeout(600 + Math.floor(Math.random() * 400));
    } catch (e) {}
  }

  async humanType(element, text) {
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      await element.type(char, { delay: Math.floor(Math.random() * 50) + 35 });
      if (Math.random() < 0.08) {
        await this.sleep(Math.floor(Math.random() * 150) + 80);
      }
    }
  }

  /**
   * Like Tweet with multi-fallback selectors
   */
  async likeTweet(page, tweetUrl, account) {
    const tweetId = this.extractTweetId(tweetUrl);
    logger.action(`[@${account.username || account.label}] Mencoba Like: ${tweetUrl}`);

    try {
      // 1. Check if already liked
      const unlikeBtn = await page.$(
        '[data-testid="unlike"], article [data-testid="unlike"], button[aria-label*="Liked"], button[aria-label*="Batal Suka"]'
      );
      if (unlikeBtn) {
        logger.info(
          `ℹ️ [@${account.username || account.label}] Postingan sudah di-Like sebelumnya.`
        );
        db.addHistory({
          accountId: account.id,
          accountName: account.username || account.label,
          tweetUrl,
          tweetId,
          action: 'LIKE',
          status: 'ALREADY_DONE',
          message: 'Sudah di-like',
        });
        return { success: true, status: 'ALREADY_DONE' };
      }

      // 2. Find Like button (with retry wait)
      let likeBtn = await page.$(
        '[data-testid="like"], article [data-testid="like"], button[aria-label*="Like"], button[aria-label*="Suka"]'
      );
      if (!likeBtn) {
        likeBtn = await page
          .waitForSelector('[data-testid="like"], article [data-testid="like"]', { timeout: 8000 })
          .catch(() => null);
      }

      if (!likeBtn) {
        logger.warn(
          `⚠️ [@${account.username || account.label}] Tombol Like tidak ditemukan pada halaman.`
        );
        return { success: false, message: 'Tombol Like tidak ditemukan' };
      }

      await likeBtn.scrollIntoViewIfNeeded().catch(() => {});
      await this.sleep(400);
      await likeBtn.click();
      await this.sleep(1200);

      // 3. Verify like state
      const isLiked = await page.$('[data-testid="unlike"], article [data-testid="unlike"]');
      if (isLiked) {
        logger.success(`❤️ [@${account.username || account.label}] Berhasil Like: ${tweetUrl}`);
        db.addHistory({
          accountId: account.id,
          accountName: account.username || account.label,
          tweetUrl,
          tweetId,
          action: 'LIKE',
          status: 'SUCCESS',
        });
        return { success: true, status: 'SUCCESS' };
      } else {
        return { success: false, message: 'Verifikasi Like gagal' };
      }
    } catch (err) {
      logger.error(`❌ [@${account.username || account.label}] Gagal Like: ${err.message}`);
      db.addHistory({
        accountId: account.id,
        accountName: account.username || account.label,
        tweetUrl,
        tweetId,
        action: 'LIKE',
        status: 'FAILED',
        message: err.message,
      });
      return { success: false, message: err.message };
    }
  }

  /**
   * Retweet / Repost Post with multi-fallback selectors
   */
  async retweetTweet(page, tweetUrl, account) {
    const tweetId = this.extractTweetId(tweetUrl);
    logger.action(`[@${account.username || account.label}] Mencoba Retweet: ${tweetUrl}`);

    try {
      // 1. Check if already reposted
      const unretweetBtn = await page.$(
        '[data-testid="unretweet"], article [data-testid="unretweet"], button[aria-label*="Undo Repost"], button[aria-label*="Batal mem-posting ulang"]'
      );
      if (unretweetBtn) {
        logger.info(
          `ℹ️ [@${account.username || account.label}] Postingan sudah di-Retweet sebelumnya.`
        );
        db.addHistory({
          accountId: account.id,
          accountName: account.username || account.label,
          tweetUrl,
          tweetId,
          action: 'RETWEET',
          status: 'ALREADY_DONE',
          message: 'Sudah di-retweet',
        });
        return { success: true, status: 'ALREADY_DONE' };
      }

      // 2. Find Retweet button (with retry wait)
      let retweetBtn = await page.$(
        '[data-testid="retweet"], article [data-testid="retweet"], button[aria-label*="Repost"], button[aria-label*="Posting ulang"]'
      );
      if (!retweetBtn) {
        retweetBtn = await page
          .waitForSelector('[data-testid="retweet"], article [data-testid="retweet"]', {
            timeout: 8000,
          })
          .catch(() => null);
      }

      if (!retweetBtn) {
        logger.warn(`⚠️ [@${account.username || account.label}] Tombol Retweet tidak ditemukan.`);
        return { success: false, message: 'Tombol Retweet tidak ditemukan' };
      }

      await retweetBtn.scrollIntoViewIfNeeded().catch(() => {});
      await this.sleep(400);
      await retweetBtn.click();
      await this.sleep(800);

      // 3. Confirm popup modal
      const confirmBtn = await page
        .waitForSelector(
          '[data-testid="retweetConfirm"], [role="menuitem"][data-testid="retweetConfirm"]',
          { timeout: 6000 }
        )
        .catch(() => null);
      if (confirmBtn) {
        await confirmBtn.click();
        await this.sleep(1500);
      }

      // 4. Verify repost state
      const isRetweeted = await page.$(
        '[data-testid="unretweet"], article [data-testid="unretweet"]'
      );
      if (isRetweeted) {
        logger.success(`🔁 [@${account.username || account.label}] Berhasil Retweet: ${tweetUrl}`);
        db.addHistory({
          accountId: account.id,
          accountName: account.username || account.label,
          tweetUrl,
          tweetId,
          action: 'RETWEET',
          status: 'SUCCESS',
        });
        return { success: true, status: 'SUCCESS' };
      } else {
        return { success: false, message: 'Verifikasi Retweet gagal' };
      }
    } catch (err) {
      logger.error(`❌ [@${account.username || account.label}] Gagal Retweet: ${err.message}`);
      db.addHistory({
        accountId: account.id,
        accountName: account.username || account.label,
        tweetUrl,
        tweetId,
        action: 'RETWEET',
        status: 'FAILED',
        message: err.message,
      });
      return { success: false, message: err.message };
    }
  }

  /**
   * Comment on Tweet using Account's specific JSON Comments File
   */
  async commentTweet(page, tweetUrl, account, customReplyText = null) {
    const tweetId = this.extractTweetId(tweetUrl);
    logger.action(`[@${account.username || account.label}] Mencoba Comment: ${tweetUrl}`);

    try {
      let replyText = '';
      if (customReplyText && customReplyText.trim()) {
        replyText = spintax.parseSpintax(customReplyText.trim());
      } else {
        const settings = db.getSettings();
        if (settings.aiProvider && settings.aiProvider !== 'none') {
          // Extract tweet text from page
          let tweetText = await page
            .$eval('[data-testid="tweetText"]', (el) => el.innerText)
            .catch(() => '');
          if (!tweetText) {
            tweetText = await page.$eval('article [lang]', (el) => el.innerText).catch(() => '');
          }

          if (tweetText && tweetText.trim()) {
            const aiGenerated = await aiService.generateContextualReply(tweetText.trim(), account);
            if (aiGenerated) {
              replyText = aiGenerated;
            }
          }
        }

        // Fallback to Account's specific JSON comment pool
        if (!replyText) {
          const accountComments = db.getAccountComments(account.id);
          replyText = spintax.getRandomTemplate(accountComments);
        }
      }

      logger.info(`💬 [@${account.username || account.label}] Komentar: "${replyText}"`);

      let textarea = await page.$(
        '[data-testid="tweetTextarea_0"], article [data-testid="tweetTextarea_0"]'
      );
      if (!textarea) {
        const replyIcon = await page.$('[data-testid="reply"], article [data-testid="reply"]');
        if (replyIcon) {
          await replyIcon.click();
          await this.sleep(1000);
        }
        textarea = await page
          .waitForSelector('[data-testid="tweetTextarea_0"]', { timeout: 8000 })
          .catch(() => null);
      }

      if (!textarea) {
        logger.warn(`⚠️ [@${account.username || account.label}] Kolom komentar tidak ditemukan.`);
        return { success: false, message: 'Kolom komentar tidak dapat diakses' };
      }

      await textarea.click();
      await this.sleep(400);

      await this.humanType(textarea, replyText);
      await this.sleep(800);

      const replyBtn = await page
        .waitForSelector('[data-testid="tweetButtonInline"], [data-testid="tweetButton"]', {
          timeout: 6000,
        })
        .catch(() => null);
      if (!replyBtn) {
        return { success: false, message: 'Tombol kirim balasan tidak ditemukan' };
      }

      await replyBtn.click();
      await this.sleep(2000);

      logger.success(
        `💬 [@${account.username || account.label}] Berhasil kirim komentar: "${replyText}"`
      );
      db.addHistory({
        accountId: account.id,
        accountName: account.username || account.label,
        tweetUrl,
        tweetId,
        action: 'COMMENT',
        status: 'SUCCESS',
        details: replyText,
      });
      return { success: true, status: 'SUCCESS', replyText };
    } catch (err) {
      logger.error(`❌ [@${account.username || account.label}] Gagal komentar: ${err.message}`);
      db.addHistory({
        accountId: account.id,
        accountName: account.username || account.label,
        tweetUrl,
        tweetId,
        action: 'COMMENT',
        status: 'FAILED',
        message: err.message,
      });
      return { success: false, message: err.message };
    }
  }

  /**
   * Process a single tweet URL with a specific account
   */
  async processTweetWithAccount(tweetUrl, account, options = {}) {
    const { like = true, retweet = true, comment = true, commentText = null } = options;
    const page = await this.getOrCreatePageForAccount(account);

    logger.info(`🌐 [@${account.username || account.label}] Membuka: ${tweetUrl}`);
    await page.goto(tweetUrl, { waitUntil: 'domcontentloaded' });

    // Wait for the tweet content / focal article to finish rendering
    await page
      .waitForSelector(
        '[data-testid="tweet"], article, [data-testid="like"], [data-testid="unlike"]',
        { timeout: 15000 }
      )
      .catch(() => null);
    await page.waitForTimeout(2000);

    // Check if redirected to login
    if (page.url().includes('/login') || page.url().includes('/i/flow/login')) {
      logger.error(
        `❌ [@${account.username || account.label}] Sesi login kedaluwarsa / dialihkan ke halaman login.`
      );
      db.addHistory({
        accountId: account.id,
        accountName: account.username || account.label,
        tweetUrl,
        action: 'SESSION',
        status: 'FAILED',
        message: 'Sesi login kedaluwarsa',
      });
      return { success: false, message: 'Sesi login kedaluwarsa' };
    }

    if (db.getSettings().scrollBeforeAction) {
      await this.humanScroll(page);
    }

    const results = { tweetUrl, accountId: account.id };

    if (like) {
      results.like = await this.likeTweet(page, tweetUrl, account);
      if (retweet || comment) await this.sleep(2000 + Math.floor(Math.random() * 2000));
    }

    if (retweet) {
      results.retweet = await this.retweetTweet(page, tweetUrl, account);
      if (comment) await this.sleep(2500 + Math.floor(Math.random() * 2000));
    }

    if (comment) {
      results.comment = await this.commentTweet(page, tweetUrl, account, commentText);
    }

    return results;
  }

  /**
   * Resolve Accounts for Task Execution
   */
  resolveTaskAccounts(accountIds) {
    if (
      !accountIds ||
      accountIds === 'all' ||
      (Array.isArray(accountIds) && accountIds.includes('all'))
    ) {
      const active = db.getActiveAccounts();
      if (active.length === 0)
        throw new Error(
          'Tidak ada akun aktif yang ditemukan. Silakan tambahkan atau aktifkan akun di menu Multi-Akun.'
        );
      return active;
    }

    if (Array.isArray(accountIds)) {
      const matched = accountIds.map((id) => db.getAccountById(id)).filter(Boolean);
      if (matched.length === 0) throw new Error('Akun yang dipilih tidak valid.');
      return matched;
    }

    const single = db.getAccountById(accountIds);
    if (!single) throw new Error('Akun yang dipilih tidak ditemukan.');
    return [single];
  }

  /**
   * Parse Custom Comment Text / JSON payload into an array of replies
   * Supports:
   * 1. JSON object with { "replies": [...] }
   * 2. JSON array ["reply 1", "reply 2"]
   * 3. Multi-line separated strings
   * 4. Plain text or Spintax string
   */
  parseCommentPayload(rawPayload) {
    if (!rawPayload || typeof rawPayload !== 'string') return [];

    const trimmed = rawPayload.trim();
    if (!trimmed) return [];

    // Try parsing as JSON first
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((s) => String(s).trim()).filter(Boolean);
        }
        if (parsed && Array.isArray(parsed.replies)) {
          return parsed.replies.map((s) => String(s).trim()).filter(Boolean);
        }
      } catch (e) {
        // Not valid JSON, fallback to text parsing
      }
    }

    return [trimmed];
  }

  /**
   * Run Multi-Account Batch Task
   */
  async runMultiAccountBatchTask(accountIds, urls, options = {}) {
    if (this.isRunning) {
      throw new Error('Sebuah proses otomasi sedang berjalan.');
    }

    const targetAccounts = this.resolveTaskAccounts(accountIds);
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
    if (parsedReplies.length > 1) {
      logger.info(
        `📋 Terdeteksi ${parsedReplies.length} template balasan unik untuk didistribusikan ke ${targetAccounts.length} akun.`
      );
    }

    logger.info(
      `🚀 Memulai Multi-Account Batch (${targetAccounts.length} Akun, ${urls.length} Postingan)...`
    );

    try {
      for (let u = 0; u < urls.length; u++) {
        if (this.abortController.signal.aborted) break;
        const url = urls[u].trim();
        if (!url) continue;

        logger.action(`📌 [Target ${u + 1}/${urls.length}] Menjalankan rotasi engagement: ${url}`);

        for (let a = 0; a < targetAccounts.length; a++) {
          if (this.abortController.signal.aborted) break;
          const account = targetAccounts[a];

          logger.info(
            `👤 Menggunakan Akun [${a + 1}/${targetAccounts.length}]: ${account.label} (@${account.username || 'user'})`
          );

          // Assign unique reply for this account if reply array provided
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
            logger.error(`❌ Error pada akun ${account.label}: ${err.message}`);
            this.currentTask.failed++;
          }

          // Delay between accounts
          if (a < targetAccounts.length - 1) {
            const switchDelay = db.getSettings().accountSwitchDelaySec || 10;
            logger.info(`⏳ Jeda rotasi antar akun ${switchDelay} detik...`);
            await this.sleep(switchDelay * 1000);
          }
        }

        // Delay before next target tweet
        if (u < urls.length - 1) {
          await this.randomDelay(options.minDelay, options.maxDelay);
        }
      }

      logger.success(
        `🏁 Selesai memproses seluruh target engagement dengan ${targetAccounts.length} akun.`
      );
    } catch (err) {
      if (err.message === 'TASK_ABORTED') {
        logger.warn(`🛑 Tugas multi-akun dihentikan pengguna.`);
      } else {
        logger.error(`❌ Terjadi error pada runner: ${err.message}`);
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
      throw new Error('Sebuah proses otomasi sedang berjalan.');
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
      `🔍 Memulai Multi-Account Auto Hunter untuk "${keyword}" (${targetAccounts.length} Akun)...`
    );

    try {
      // Step 1: Scrape target tweets using primary account
      const scraperAccount = targetAccounts[0];
      const page = await this.getOrCreatePageForAccount(scraperAccount);
      const searchUrl = `https://x.com/search?q=${encodeURIComponent(keyword)}&f=live`;

      logger.info(`🌐 Mengumpulkan tweet dari X: ${searchUrl}`);
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
        `🎯 Mengumpulkan ${targetList.length} tweet untuk di-engage oleh ${targetAccounts.length} akun.`
      );

      const parsedReplies = this.parseCommentPayload(options.commentText);

      // Step 2: Engage each collected tweet with each account
      for (let i = 0; i < targetList.length; i++) {
        if (this.abortController.signal.aborted) break;
        const tweetUrl = targetList[i];

        logger.action(`📌 [Hunter ${i + 1}/${targetList.length}] Target: ${tweetUrl}`);

        for (let a = 0; a < targetAccounts.length; a++) {
          if (this.abortController.signal.aborted) break;
          const account = targetAccounts[a];

          logger.info(
            `👤 Aksi Akun [${a + 1}/${targetAccounts.length}]: ${account.label} (@${account.username || 'user'})`
          );

          // Assign unique reply for this account if reply array provided
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
            logger.error(`❌ Gagal interaksi dengan akun ${account.label}: ${err.message}`);
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

      logger.success(`🏁 Multi-Account Hunter selesai memproses seluruh postingan.`);
    } catch (err) {
      if (err.message === 'TASK_ABORTED') {
        logger.warn(`🛑 Auto Hunter multi-akun dihentikan.`);
      } else {
        logger.error(`❌ Error Hunter: ${err.message}`);
      }
    } finally {
      await this.closeBrowser();
      this.isRunning = false;
      this.currentTask = null;
      this.abortController = null;
    }
  }

  /**
   * Create and publish a new Tweet/Post on X
   * @param {Page} page - Playwright page instance
   * @param {string} postText - Text to post
   * @param {object} account - Node account
   * @param {string[]} mediaPaths - Optional local media file paths to upload
   */
  async createPost(page, postText, account, mediaPaths = []) {
    logger.action(
      `[@${account.username || account.label}] Mempersiapkan publikasi postingan baru...`
    );

    try {
      const trimmedText = spintax.parseSpintax(postText.trim());
      logger.info(
        `📝 [@${account.username || account.label}] Isi postingan (${trimmedText.length} karakter): "${trimmedText}"`
      );

      // 1. Navigate to compose page or home
      await page
        .goto('https://x.com/compose/post', { waitUntil: 'domcontentloaded' })
        .catch(() => {});
      await page.waitForTimeout(3000);

      // Check if redirected to login
      if (page.url().includes('/login') || page.url().includes('/i/flow/login')) {
        logger.error(`❌ [@${account.username || account.label}] Sesi login kedaluwarsa.`);
        db.addHistory({
          accountId: account.id,
          accountName: account.username || account.label,
          action: 'POST',
          status: 'FAILED',
          message: 'Sesi login kedaluwarsa',
        });
        notifier.notify('SESSION_EXPIRED', {
          accountName: account.username || account.label,
        });
        return { success: false, message: 'Sesi login kedaluwarsa' };
      }

      // 2. Find post textarea
      let textarea = await page.$(
        '[data-testid="tweetTextarea_0"], div[role="textbox"][data-testid="tweetTextarea_0"]'
      );
      if (!textarea) {
        // Fallback: Try home timeline composer
        logger.info(`ℹ️ Membuka timeline home untuk akses composer fallback...`);
        await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3500);

        // Check if there is a side compose button
        const sideComposeBtn = await page.$(
          '[data-testid="SideNav_NewTweet_Button"], a[href="/compose/post"]'
        );
        if (sideComposeBtn) {
          await sideComposeBtn.click();
          await this.sleep(1500);
        }

        textarea = await page
          .waitForSelector('[data-testid="tweetTextarea_0"]', { timeout: 10000 })
          .catch(() => null);
      }

      if (!textarea) {
        logger.warn(
          `⚠️ [@${account.username || account.label}] Kolom editor tweet tidak ditemukan.`
        );
        return { success: false, message: 'Editor postingan tidak dapat diakses' };
      }

      await textarea.click();
      await this.sleep(600);

      // 3. Emulate human typing
      await this.humanType(textarea, trimmedText);
      await this.sleep(1000);

      // 4. Attach Media / Images if provided
      if (Array.isArray(mediaPaths) && mediaPaths.length > 0) {
        try {
          const validFiles = mediaPaths.filter((p) => p && fs.existsSync(p));
          if (validFiles.length > 0) {
            logger.info(
              `🖼️ [@${account.username || account.label}] Melampirkan ${validFiles.length} file gambar ke postingan...`
            );
            const fileInput = await page.$(
              'input[data-testid="fileInput"], input[type="file"][accept*="image"]'
            );
            if (fileInput) {
              await fileInput.setInputFiles(validFiles);
              await this.sleep(3000); // wait for image thumbnail render
            }
          }
        } catch (e) {
          logger.warn(`⚠️ Gagal melampirkan file media: ${e.message}`);
        }
      }

      // 5. Set up listener to capture GraphQL CreateTweet response before clicking Post
      let capturedTweetId = null;
      let capturedTweetUrl = null;

      const onResponse = async (response) => {
        try {
          const url = response.url();
          if (
            url.includes('CreateTweet') ||
            (url.includes('/graphql/') && response.request().method() === 'POST')
          ) {
            const json = await response.json().catch(() => null);
            if (json) {
              const tweetResult =
                json?.data?.create_tweet?.tweet_results?.result ||
                json?.data?.create_tweet_mutation?.tweet_results?.result;
              const tweetId =
                tweetResult?.rest_id ||
                tweetResult?.legacy?.id_str ||
                tweetResult?.tweet?.rest_id ||
                json?.data?.create_tweet?.tweet_results?.result?.legacy?.id_str;
              if (tweetId) {
                capturedTweetId = tweetId;
              }
            }
          }
        } catch (e) {}
      };

      page.on('response', onResponse);

      // Find and click Post Button
      const postBtn = await page
        .waitForSelector(
          '[data-testid="tweetButton"], [data-testid="tweetButtonInline"], button[aria-label*="Post"], button[aria-label*="Posting"]',
          { timeout: 8000 }
        )
        .catch(() => null);

      if (!postBtn) {
        page.off('response', onResponse);
        logger.warn(
          `⚠️ [@${account.username || account.label}] Tombol Post/Tweet tidak ditemukan.`
        );
        return { success: false, message: 'Tombol kirim postingan tidak ditemukan' };
      }

      // Trigger input event safety check
      try {
        const isDisabled = await postBtn.getAttribute('disabled');
        if (isDisabled !== null) {
          await textarea.click();
          await page.keyboard.press('Space');
          await page.keyboard.press('Backspace');
          await this.sleep(500);
        }
      } catch (e) {}

      await postBtn.click();

      // Wait up to 5s for GraphQL response or toast
      for (let i = 0; i < 15; i++) {
        if (capturedTweetId) break;
        await this.sleep(300);
      }

      page.off('response', onResponse);

      if (capturedTweetId) {
        capturedTweetUrl = `https://x.com/${account.username || 'i'}/status/${capturedTweetId}`;
      } else {
        // Fallback 1: Check toast "View" or status link in DOM
        try {
          const toastLink = await page.$('a[href*="/status/"]');
          if (toastLink) {
            const href = await toastLink.getAttribute('href');
            if (href && href.includes('/status/')) {
              capturedTweetUrl = href.startsWith('http') ? href : `https://x.com${href}`;
            }
          }
        } catch (e) {}
      }

      // Fallback 2: Check user's profile latest tweet
      if (!capturedTweetUrl && account.username) {
        try {
          logger.info(
            `🔍 [@${account.username}] Mengambil link postingan terbaru dari timeline profil...`
          );
          await page
            .goto(`https://x.com/${account.username}`, {
              waitUntil: 'domcontentloaded',
              timeout: 12000,
            })
            .catch(() => {});
          await this.sleep(2000);
          const firstTweetLink = await page.$('article[data-testid="tweet"] a[href*="/status/"]');
          if (firstTweetLink) {
            const href = await firstTweetLink.getAttribute('href');
            if (href && href.includes('/status/')) {
              capturedTweetUrl = href.startsWith('http') ? href : `https://x.com${href}`;
            }
          }
        } catch (e) {}
      }

      const finalTweetUrl =
        capturedTweetUrl || (account.username ? `https://x.com/${account.username}` : '-');

      logger.success(
        `🚀 [@${account.username || account.label}] Berhasil memposting tweet: "${trimmedText}" (${finalTweetUrl})`
      );
      db.addHistory({
        accountId: account.id,
        accountName: account.username || account.label,
        tweetUrl: finalTweetUrl,
        tweetId:
          capturedTweetId ||
          (finalTweetUrl.includes('/status/')
            ? finalTweetUrl.split('/status/')[1]?.split(/[?#]/)[0]
            : undefined),
        action: 'POST',
        status: 'SUCCESS',
        details: trimmedText,
      });

      // Send webhook alert
      notifier.notify('POST_PUBLISHED', {
        accountName: account.username || account.label,
        text: trimmedText,
        tweetUrl: finalTweetUrl,
      });

      return { success: true, status: 'SUCCESS', postText: trimmedText, tweetUrl: finalTweetUrl };
    } catch (err) {
      logger.error(
        `❌ [@${account.username || account.label}] Gagal membuat postingan: ${err.message}`
      );
      db.addHistory({
        accountId: account.id,
        accountName: account.username || account.label,
        tweetUrl: account.username ? `https://x.com/${account.username}` : '-',
        action: 'POST',
        status: 'FAILED',
        message: err.message,
      });
      return { success: false, message: err.message };
    }
  }

  /**
   * Run Multi-Account Post Publisher Task
   */
  async runMultiAccountPostTask(accountIds, posts, options = {}) {
    if (this.isRunning) {
      throw new Error('Sebuah proses otomasi sedang berjalan.');
    }

    const targetAccounts = this.resolveTaskAccounts(accountIds);
    let postList = [];
    if (Array.isArray(posts)) {
      postList = posts.map((p) => String(p).trim()).filter(Boolean);
    } else if (typeof posts === 'string' && posts.trim()) {
      postList = [posts.trim()];
    }

    if (postList.length === 0) {
      throw new Error('Konten postingan tidak boleh kosong.');
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
      `🚀 Memulai Multi-Account Post Publishing (${targetAccounts.length} Akun, ${postList.length} Draf Konten)...`
    );

    try {
      for (let a = 0; a < targetAccounts.length; a++) {
        if (this.abortController.signal.aborted) break;
        const account = targetAccounts[a];

        const postText = postList[a % postList.length];
        logger.action(
          `👤 [Post ${a + 1}/${targetAccounts.length}] Akun: ${account.label} (@${account.username || 'user'})`
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
          logger.error(`❌ Error posting pada akun ${account.label}: ${err.message}`);
          this.currentTask.failed++;
        }

        // Delay between accounts
        if (a < targetAccounts.length - 1) {
          const switchDelay = options.delaySeconds || db.getSettings().accountSwitchDelaySec || 15;
          logger.info(`⏳ Jeda rotasi antar akun ${switchDelay} detik...`);
          await this.sleep(switchDelay * 1000);
        }
      }

      logger.success(`🏁 Selesai mempublikasikan postingan ke ${targetAccounts.length} node akun.`);
      notifier.notify('TASK_COMPLETED', {
        taskType: 'Fleet Post Publisher',
        totalTargets: targetAccounts.length,
      });
    } catch (err) {
      if (err.message === 'TASK_ABORTED') {
        logger.warn(`🛑 Tugas posting multi-akun dihentikan pengguna.`);
      } else {
        logger.error(`❌ Terjadi error pada runner posting: ${err.message}`);
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
   * Check Health & Session Validity of a Single Account
   */
  async checkAccountHealth(account) {
    logger.info(`🩺 Memeriksa kesehatan node ${account.label} (@${account.username || 'user'})...`);

    // 1. Check Proxy connectivity first
    if (account.proxy) {
      const proxyRes = await proxyHelper.testProxy(account.proxy);
      if (!proxyRes.success) {
        logger.warn(
          `❌ [Proxy Dead] Node ${account.label} proxy tidak terhubung: ${proxyRes.message}`
        );
        const updated = db.saveAccount({
          ...account,
          enabled: false,
          healthStatus: 'PROXY_DEAD',
          healthMessage: `Proxy mati: ${proxyRes.message}`,
          lastCheckedAt: new Date().toISOString(),
        });
        notifier.notify('PROXY_DEAD', {
          accountName: account.username || account.label,
          proxy: account.proxy,
        });
        return {
          success: false,
          healthStatus: 'PROXY_DEAD',
          account: updated,
          message: `Proxy tidak terjangkau (${proxyRes.message}). Akun otomatis di-pause.`,
        };
      }
    }

    // 2. Check Session Validity
    let context = null;
    try {
      context = await this.createAccountContext(account);
      const page = await context.newPage();

      await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(3000);

      const currentUrl = page.url();
      if (currentUrl.includes('/login') || currentUrl.includes('/i/flow/login')) {
        logger.warn(
          `⚠️ [Session Expired] Cookie auth_token node ${account.label} sudah tidak valid.`
        );
        const updated = db.saveAccount({
          ...account,
          healthStatus: 'EXPIRED',
          healthMessage: 'Cookie auth_token sudah kedaluwarsa',
          lastCheckedAt: new Date().toISOString(),
        });
        notifier.notify('SESSION_EXPIRED', {
          accountName: account.username || account.label,
        });
        await context.close();
        return {
          success: false,
          healthStatus: 'EXPIRED',
          account: updated,
          message: 'Sesi akun kedaluwarsa. Silakan perbarui cookie auth_token.',
        };
      }

      // Try extract screen name from DOM profile link
      let detectedUsername = account.username;
      try {
        const accountLink = await page.$('a[data-testid="AppTabBar_Profile_Link"]');
        if (accountLink) {
          const href = await accountLink.getAttribute('href');
          if (href && href.length > 1) {
            detectedUsername = href.replace('/', '').trim();
          }
        }
      } catch (e) {}

      const updated = db.saveAccount({
        ...account,
        username: detectedUsername || account.username,
        healthStatus: 'HEALTHY',
        healthMessage: 'Sesi aktif & terverifikasi sehat',
        lastCheckedAt: new Date().toISOString(),
      });

      logger.success(
        `✅ [Healthy] Node ${account.label} (@${detectedUsername || account.username}) aktif & valid.`
      );
      await context.close();

      return {
        success: true,
        healthStatus: 'HEALTHY',
        account: updated,
        message: 'Sesi aktif dan terverifikasi sehat!',
      };
    } catch (err) {
      if (context) await context.close().catch(() => {});
      return {
        success: false,
        healthStatus: 'UNKNOWN_ERROR',
        message: `Error saat memeriksa sesi: ${err.message}`,
      };
    }
  }

  /**
   * Mass Check Health of All Accounts
   */
  async checkFleetHealth() {
    const accounts = db.getAccounts();
    if (accounts.length === 0) {
      return { success: false, message: 'Tidak ada akun terdaftar untuk dicek.' };
    }

    logger.info(`🩺 Memulai pengecekan kesehatan massal untuk ${accounts.length} node armada...`);
    const results = [];

    for (const acc of accounts) {
      try {
        const res = await this.checkAccountHealth(acc);
        results.push({ accountId: acc.id, label: acc.label, ...res });
      } catch (err) {
        results.push({ accountId: acc.id, label: acc.label, success: false, message: err.message });
      }
      await this.sleep(1500);
    }

    const healthyCount = results.filter((r) => r.healthStatus === 'HEALTHY').length;
    logger.success(
      `🏁 Pengecekan armada selesai: ${healthyCount}/${accounts.length} node dalam kondisi sehat.`
    );

    return {
      success: true,
      total: accounts.length,
      healthy: healthyCount,
      results,
    };
  }

  /**
   * Run Warm-up Protocol Routine for an Account
   */
  async runWarmupTask(account) {
    if (this.isRunning) {
      throw new Error('Sebuah proses otomasi sedang berjalan.');
    }

    const currentDay = Math.min(Math.max(Number(account.warmupDay) || 1, 1), 7);
    logger.action(
      `🐣 [@${account.username || account.label}] Memulai rutinitas pemanasan Hari ke-${currentDay}/7...`
    );

    let context = null;
    try {
      this.isRunning = true;
      this.abortController = new AbortController();
      this.currentTask = { type: 'WARMUP', accountId: account.id, day: currentDay };

      context = await this.createAccountContext(account);
      const page = await context.newPage();

      await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(4000);

      if (page.url().includes('/login')) {
        throw new Error('Sesi akun kedaluwarsa');
      }

      // 1. Natural Timeline Scrolling
      const scrollCount = 2 + currentDay;
      for (let s = 0; s < scrollCount; s++) {
        if (this.abortController.signal.aborted) break;
        logger.info(
          `📜 [@${account.username || account.label}] Scrolling timeline organik (${s + 1}/${scrollCount})...`
        );
        await page.mouse.wheel(0, 300 + Math.random() * 400);
        await this.sleep(2000 + Math.random() * 3000);
      }

      // 2. Organic Likes based on warmup day tier
      const targetLikes = Math.min(2 + currentDay, 8);
      let likesDone = 0;

      const likeButtons = await page.$$('button[data-testid="like"]');
      for (const btn of likeButtons) {
        if (this.abortController.signal.aborted || likesDone >= targetLikes) break;
        try {
          await btn.scrollIntoViewIfNeeded();
          await this.sleep(1000 + Math.random() * 1500);
          await btn.click();
          likesDone++;
          logger.success(
            `❤️ [@${account.username || account.label}] Organik like tweet (${likesDone}/${targetLikes})`
          );
          await this.sleep(3000 + Math.random() * 4000);
        } catch (e) {}
      }

      // 3. Increment warmup day progress
      const nextDay = currentDay < 7 ? currentDay + 1 : 7;
      const updated = db.saveAccount({
        ...account,
        warmupDay: nextDay,
        lastWarmupAt: new Date().toISOString(),
      });

      db.addHistory({
        accountId: account.id,
        accountName: account.username || account.label,
        action: 'WARMUP',
        status: 'SUCCESS',
        details: `Selesai pemanasan Hari ke-${currentDay}: ${likesDone} organic likes`,
      });

      notifier.notify('WARMUP_DAY_COMPLETED', {
        accountName: account.username || account.label,
        day: currentDay,
        activity: `${likesDone} organic likes & ${scrollCount} timeline scrolls`,
      });

      await context.close();
      this.isRunning = false;
      this.currentTask = null;

      logger.success(
        `🎉 [@${account.username || account.label}] Berhasil menyelesaikan pemanasan Hari ke-${currentDay}! (Lanjut ke Hari ${nextDay})`
      );
      return {
        success: true,
        day: currentDay,
        nextDay,
        likesDone,
        account: updated,
        message: `Berhasil menyelesaikan pemanasan Hari ke-${currentDay}!`,
      };
    } catch (err) {
      if (context) await context.close().catch(() => {});
      this.isRunning = false;
      this.currentTask = null;
      logger.error(`❌ [@${account.username || account.label}] Gagal pemanasan: ${err.message}`);
      return { success: false, message: err.message };
    }
  }

  stopTask() {
    if (this.isRunning && this.abortController) {
      logger.warn(`⚠️ Mengirim sinyal penghentian ke bot runner...`);
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
