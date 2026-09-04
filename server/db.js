const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('./config');

class LocalDB {
  constructor() {
    this.dataDir = config.DATA_DIR;
    this.commentsDir = path.join(this.dataDir, 'comments');
    this.mediaDir = path.join(this.dataDir, 'media');
    this.ensureDirs();

    this.files = {
      settings: path.join(this.dataDir, 'settings.json'),
      accounts: path.join(this.dataDir, 'accounts.json'),
      auth: path.join(this.dataDir, 'auth.json'), // legacy fallback
      history: path.join(this.dataDir, 'history.json'),
      templates: path.join(this.dataDir, 'templates.json'),
      stats: path.join(this.dataDir, 'stats.json'),
      schedules: path.join(this.dataDir, 'schedules.json'),
    };

    this.cache = {};
    this.loadAll();
  }

  ensureDirs() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    if (!fs.existsSync(this.commentsDir)) {
      fs.mkdirSync(this.commentsDir, { recursive: true });
    }
    if (!fs.existsSync(this.mediaDir)) {
      fs.mkdirSync(this.mediaDir, { recursive: true });
    }
  }

  loadAll() {
    // Default Settings
    const defaultNineRouterModels = [
      'openai/gpt-4o-mini',
      'deepseek/deepseek-chat',
      'anthropic/claude-3.5-sonnet',
      'meta-llama/llama-3.3-70b-instruct',
    ];

    this.cache.settings = this.readFile(this.files.settings, {
      minDelaySeconds: config.DEFAULTS.minDelaySeconds,
      maxDelaySeconds: config.DEFAULTS.maxDelaySeconds,
      accountSwitchDelaySec: 10,
      hourlyLimit: config.DEFAULTS.hourlyLimit,
      dailyLimit: config.DEFAULTS.dailyLimit,
      headless: config.DEFAULTS.headless,
      humanTypingDelayMs: config.DEFAULTS.humanTypingDelayMs,
      scrollBeforeAction: config.DEFAULTS.scrollBeforeAction,
      aiProvider: 'none',
      aiApiKey: '',
      aiPrompt:
        'Write a sharp, authentic, and context-aware 1-sentence English reply as a crypto/tech native. Be insightful, peer-to-peer, and zero generic praise.',
      telegramEnabled: false,
      telegramBotToken: '',
      telegramChatId: '',
      discordEnabled: false,
      discordWebhookUrl: '',
      nineRouterModels: defaultNineRouterModels,
    });

    if (!Array.isArray(this.cache.settings.nineRouterModels)) {
      this.cache.settings.nineRouterModels = defaultNineRouterModels;
    }

    // Default global templates
    const defaultTemplates = [
      '{Keren banget|Mantap sekali|Insightful banget} {infonya|pembahasannya|tweetnya} {bang|kak|gan}! 🔥 {Izin bookmark ya|Ditunggu update selanjutnya|Bermanfaat banget}.',
      '{Setuju banget|Sepakat|Benar sekali} dengan poin ini. {Sangat menginspirasi|Membuka wawasan|Top markotop} 👍',
      '{Wah gokil|Menarik banget|Keren nih}, {makasih sudah sharing|makasih infonya ya|semoga makin sukses} {kak|bang|mas}! 🚀',
    ];
    this.cache.templates = this.readFile(this.files.templates, defaultTemplates);

    // Multi Accounts
    this.cache.accounts = this.readFile(this.files.accounts, []);

    // Schedules
    this.cache.schedules = this.readFile(this.files.schedules, []);

    // If accounts is empty, check if legacy auth exists and migrate
    const legacyAuth = this.readFile(this.files.auth, null);
    if (this.cache.accounts.length === 0 && legacyAuth && legacyAuth.auth_token) {
      const initialAcc = {
        id: 'acc_' + crypto.randomUUID(),
        label: legacyAuth.name || 'Akun Utama',
        auth_token: legacyAuth.auth_token,
        ct0: legacyAuth.ct0 || '',
        username: legacyAuth.username || '',
        name: legacyAuth.name || 'User',
        avatar: legacyAuth.avatar || '',
        proxy: '',
        commentsFile: `comments_${Date.now().toString(36)}.json`,
        enabled: true,
        isValid: legacyAuth.isValid || false,
        lastChecked: legacyAuth.lastChecked || null,
        stats: { likes: 0, retweets: 0, comments: 0 },
      };
      this.cache.accounts.push(initialAcc);
      this.save('accounts');
      this.saveAccountComments(initialAcc.id, defaultTemplates);
    }

    // History
    this.cache.history = this.readFile(this.files.history, []);

    // Stats
    this.cache.stats = this.readFile(this.files.stats, {
      totalLikes: 0,
      totalRetweets: 0,
      totalComments: 0,
      totalPosts: 0,
      todayLikes: 0,
      todayRetweets: 0,
      todayComments: 0,
      todayPosts: 0,
      lastResetDate: new Date().toISOString().slice(0, 10),
    });

    this.checkAndResetDailyStats();
  }

  checkAndResetDailyStats() {
    const today = new Date().toISOString().slice(0, 10);
    if (this.cache.stats.lastResetDate !== today) {
      this.cache.stats.todayLikes = 0;
      this.cache.stats.todayRetweets = 0;
      this.cache.stats.todayComments = 0;
      this.cache.stats.todayPosts = 0;
      this.cache.stats.lastResetDate = today;
      this.save('stats');
    }
  }

  readFile(filePath, defaultValue) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        try {
          return JSON.parse(raw);
        } catch (parseErr) {
          // Quarantine the corrupt file so user data is never silently lost
          const quarantinePath = `${filePath}.corrupt.${Date.now()}`;
          try {
            fs.renameSync(filePath, quarantinePath);
          } catch (renameErr) {
            console.error(`Failed to quarantine corrupt file ${filePath}:`, renameErr.message);
          }
          console.error(
            `⚠️ Corrupted JSON detected at ${filePath}. File preserved at ${quarantinePath}. Continuing with default value.`
          );
        }
      }
    } catch (e) {
      console.error(`Error reading ${filePath}:`, e.message);
    }
    try {
      this.writeFile(filePath, defaultValue);
    } catch (writeErr) {
      console.error(`Failed to write default value for ${filePath}:`, writeErr.message);
    }
    return defaultValue;
  }

  sleepSync(ms) {
    try {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
    } catch (e) {
      // Atomics.wait unavailable (e.g. main thread restrictions); skip backoff
    }
  }

  /**
   * Atomic write: .tmp file + fsync + rename. Never falls back to a direct
   * non-atomic write; retries transient OS locks (Windows EBUSY/EPERM) then throws.
   */
  writeFile(filePath, data) {
    const json = JSON.stringify(data, null, 2);
    const maxAttempts = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const tempPath = `${filePath}.tmp.${process.pid}.${Date.now()}`;
      try {
        const fd = fs.openSync(tempPath, 'w');
        try {
          fs.writeFileSync(fd, json, 'utf8');
          fs.fsyncSync(fd);
        } finally {
          fs.closeSync(fd);
        }
        fs.renameSync(tempPath, filePath);
        return;
      } catch (e) {
        lastError = e;
        console.error(
          `Atomic write attempt ${attempt}/${maxAttempts} failed for ${filePath}: ${e.message}`
        );
        try {
          if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        } catch (cleanupErr) {
          // ignore cleanup failure
        }
        if (attempt < maxAttempts) this.sleepSync(50 * attempt);
      }
    }
    throw new Error(
      `Atomic write failed after ${maxAttempts} attempts for ${filePath}: ${lastError ? lastError.message : 'unknown error'}`
    );
  }

  save(key) {
    if (this.files[key] && this.cache[key] !== undefined) {
      this.writeFile(this.files[key], this.cache[key]);
    }
  }

  // Settings
  getSettings() {
    if (!this.cache.settings) {
      this.cache.settings = {};
    }
    if (!Array.isArray(this.cache.settings.nineRouterModels)) {
      this.cache.settings.nineRouterModels = [
        'openai/gpt-4o-mini',
        'deepseek/deepseek-chat',
        'anthropic/claude-3.5-sonnet',
        'meta-llama/llama-3.3-70b-instruct',
      ];
    }
    return this.cache.settings;
  }
  saveSettings(newSettings) {
    this.cache.settings = { ...this.cache.settings, ...newSettings };
    this.save('settings');
    return this.cache.settings;
  }

  // Multi-Account Operations
  getAccounts() {
    return this.cache.accounts || [];
  }

  getAccountById(id) {
    return (this.cache.accounts || []).find((acc) => acc.id === id);
  }

  getActiveAccounts() {
    return (this.cache.accounts || []).filter((acc) => acc.enabled !== false);
  }

  saveAccount(accountData) {
    const id = accountData.id || 'acc_' + crypto.randomUUID();
    const existingIndex = (this.cache.accounts || []).findIndex((acc) => acc.id === id);

    const defaultComments = this.getTemplates();
    const sanitizedId = String(id).replace(/[^a-zA-Z0-9_-]/g, '');

    const updatedAccount = {
      id,
      label: (accountData.label || 'Akun X').trim(),
      auth_token: (accountData.auth_token || '').trim(),
      ct0: (accountData.ct0 || '').trim(),
      username: (accountData.username || '').replace(/^@/, '').trim(),
      name: (accountData.name || '').trim(),
      avatar: accountData.avatar || '',
      proxy: (accountData.proxy || '').trim(),
      commentsFile: `comments_${sanitizedId}.json`,
      enabled: accountData.enabled !== undefined ? accountData.enabled : true,
      isValid: accountData.isValid !== undefined ? accountData.isValid : false,
      lastChecked: accountData.lastChecked || null,
      stats: accountData.stats || { likes: 0, retweets: 0, comments: 0 },
    };

    if (existingIndex >= 0) {
      this.cache.accounts[existingIndex] = {
        ...this.cache.accounts[existingIndex],
        ...updatedAccount,
      };
    } else {
      this.cache.accounts.push(updatedAccount);
      // Initialize comments JSON if provided or default
      if (Array.isArray(accountData.comments) && accountData.comments.length > 0) {
        this.saveAccountComments(id, accountData.comments);
      } else {
        this.saveAccountComments(id, defaultComments);
      }
    }

    this.save('accounts');
    return this.getAccountById(id);
  }

  deleteAccount(id) {
    const index = (this.cache.accounts || []).findIndex((acc) => acc.id === id);
    if (index >= 0) {
      this.cache.accounts.splice(index, 1);
      this.save('accounts');

      // Optionally delete comment file safely
      const commentFilePath = this.getAccountCommentsFilePath(id);
      if (fs.existsSync(commentFilePath)) {
        try {
          fs.unlinkSync(commentFilePath);
        } catch (e) {}
      }

      return true;
    }
    return false;
  }

  toggleAccount(id) {
    const acc = this.getAccountById(id);
    if (acc) {
      acc.enabled = !acc.enabled;
      this.save('accounts');
      return acc;
    }
    return null;
  }

  // ==========================================
  // FLEET EXPORT & BULK IMPORT
  // ==========================================

  /**
   * Full fleet backup including per-account comments.
   * NOTE: contains raw session cookies — only exposed via the authenticated
   * same-origin export endpoint, never in regular GET responses.
   */
  exportAccounts() {
    const accounts = (this.cache.accounts || []).map((acc) => ({
      ...acc,
      comments: this.getAccountComments(acc.id),
    }));
    return {
      app: 'x-sentinel',
      version: config.VERSION,
      exportedAt: new Date().toISOString(),
      accounts,
    };
  }

  /**
   * Bulk import accounts from multi-line text (colon/pipe delimited) or a
   * JSON array. Skips duplicates (by auth_token) instead of failing.
   */
  bulkImportAccounts(rawText) {
    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
      throw new Error('Import payload cannot be empty.');
    }

    const parsedList = this.parseBulkImportText(rawText);
    if (parsedList.length === 0) {
      throw new Error('No valid accounts could be parsed from the provided data.');
    }

    const existingTokens = new Set((this.cache.accounts || []).map((a) => a.auth_token));
    const imported = [];

    for (const item of parsedList) {
      if (!item.auth_token || existingTokens.has(item.auth_token)) continue;
      existingTokens.add(item.auth_token);
      const saved = this.saveAccount({
        label: item.label,
        auth_token: item.auth_token,
        ct0: item.ct0,
        proxy: item.proxy,
      });
      imported.push(saved);
    }

    return imported;
  }

  /**
   * Parse bulk import text. Supported per-line formats:
   *   auth_token:ct0:proxy:Label   (colon; proxy may contain colons, label is last segment)
   *   auth_token:ct0:proxy         (colon, no label)
   *   auth_token:ct0:Label         (colon, no proxy — heuristic: segment without '.'/'@' is a label)
   *   auth_token|ct0|proxy|Label   (pipe delimited)
   * Comment lines (# prefix) and blank lines are ignored. JSON array/object input is also accepted.
   */
  parseBulkImportText(rawText) {
    const trimmed = rawText.trim();

    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      const parsed = JSON.parse(trimmed);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      return list
        .filter((item) => item && (item.auth_token || item.token))
        .map((item, idx) => ({
          auth_token: String(item.auth_token || item.token || '').trim(),
          ct0: String(item.ct0 || '').trim(),
          proxy: String(item.proxy || '').trim(),
          label: String(item.label || item.name || `Node ${idx + 1}`).trim(),
        }));
    }

    const results = [];
    const lines = trimmed
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));

    lines.forEach((line) => {
      const delimiter = line.includes('|') ? '|' : ':';
      const parts = line.split(delimiter).map((p) => p.trim());
      if (parts.length < 2) return;

      const auth_token = parts[0];
      const ct0 = parts[1];
      const remaining = parts.slice(2);
      let proxy = '';
      let label = `Node ${results.length + 1}`;

      if (remaining.length === 1) {
        const segment = remaining[0];
        if (segment.includes('.') || segment.includes('@')) {
          proxy = segment;
        } else {
          label = segment;
        }
      } else if (remaining.length >= 2) {
        label = remaining[remaining.length - 1];
        proxy = remaining.slice(0, -1).join(':');
      }

      results.push({ auth_token, ct0, proxy, label });
    });

    return results;
  }

  // Global fallback comments (backed by the global spintax templates)
  getComments() {
    return this.getTemplates();
  }

  saveComments(comments) {
    return this.saveTemplates(comments);
  }

  // Account Comments JSON File Management with Path Traversal Hardening
  getAccountCommentsFilePath(accountId) {
    const sanitizedId = String(accountId).replace(/[^a-zA-Z0-9_-]/g, '');
    const fileName = `comments_${sanitizedId}.json`;
    const resolvedPath = path.resolve(this.commentsDir, fileName);
    // Security check: ensure path is inside commentsDir
    if (!resolvedPath.startsWith(path.resolve(this.commentsDir))) {
      throw new Error('Security Violation: Invalid comment file path traversal detected.');
    }
    return resolvedPath;
  }

  getAccountComments(accountId) {
    try {
      const filePath = this.getAccountCommentsFilePath(accountId);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error(`Error reading comments for ${accountId}:`, e.message);
    }
    // Fallback to global templates
    return this.getTemplates();
  }

  saveAccountComments(accountId, commentsArray) {
    if (!Array.isArray(commentsArray)) {
      throw new Error('Comments must be an array of strings');
    }
    const filePath = this.getAccountCommentsFilePath(accountId);
    this.writeFile(filePath, commentsArray);
    return commentsArray;
  }

  // Backward compatibility for single auth
  getAuth() {
    const active = this.getActiveAccounts();
    return active.length > 0 ? active[0] : { auth_token: '', ct0: '', isValid: false };
  }

  saveAuth(authData) {
    const accounts = this.getAccounts();
    if (accounts.length > 0) {
      const primary = accounts[0];
      primary.auth_token = authData.auth_token;
      primary.ct0 = authData.ct0;
      if (authData.username) primary.username = authData.username;
      if (authData.name) primary.name = authData.name;
      if (authData.avatar) primary.avatar = authData.avatar;
      if (authData.isValid !== undefined) primary.isValid = authData.isValid;
      this.save('accounts');
      return primary;
    } else {
      return this.saveAccount(authData);
    }
  }

  // History & Stats
  getHistory(limit = 100) {
    return this.cache.history.slice(-limit).reverse();
  }

  hasInteracted(tweetId, actionType, accountId = null) {
    return this.cache.history.some((item) => {
      const match =
        item.tweetId === tweetId && item.action === actionType && item.status === 'SUCCESS';
      return accountId ? match && item.accountId === accountId : match;
    });
  }

  addHistory(entry) {
    const item = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      timeFormatted: new Date().toLocaleTimeString('id-ID'),
      ...entry,
    };
    this.cache.history.push(item);
    if (this.cache.history.length > 2000) {
      this.cache.history = this.cache.history.slice(-2000);
    }
    this.save('history');

    // Update global & per-account stats
    if (item.status === 'SUCCESS') {
      this.checkAndResetDailyStats();
      if (item.action === 'LIKE') {
        this.cache.stats.totalLikes = (this.cache.stats.totalLikes || 0) + 1;
        this.cache.stats.todayLikes = (this.cache.stats.todayLikes || 0) + 1;
      } else if (item.action === 'RETWEET') {
        this.cache.stats.totalRetweets = (this.cache.stats.totalRetweets || 0) + 1;
        this.cache.stats.todayRetweets = (this.cache.stats.todayRetweets || 0) + 1;
      } else if (item.action === 'COMMENT') {
        this.cache.stats.totalComments = (this.cache.stats.totalComments || 0) + 1;
        this.cache.stats.todayComments = (this.cache.stats.todayComments || 0) + 1;
      } else if (item.action === 'POST' || item.action === 'TWEET') {
        this.cache.stats.totalPosts = (this.cache.stats.totalPosts || 0) + 1;
        this.cache.stats.todayPosts = (this.cache.stats.todayPosts || 0) + 1;
      }
      this.save('stats');

      // Update per-account stat
      if (item.accountId) {
        const acc = this.getAccountById(item.accountId);
        if (acc) {
          if (!acc.stats) acc.stats = { likes: 0, retweets: 0, comments: 0, posts: 0 };
          if (item.action === 'LIKE') acc.stats.likes = (acc.stats.likes || 0) + 1;
          if (item.action === 'RETWEET') acc.stats.retweets = (acc.stats.retweets || 0) + 1;
          if (item.action === 'COMMENT') acc.stats.comments = (acc.stats.comments || 0) + 1;
          if (item.action === 'POST' || item.action === 'TWEET')
            acc.stats.posts = (acc.stats.posts || 0) + 1;
          this.save('accounts');
        }
      }
    }

    return item;
  }

  getTemplates() {
    return this.cache.templates;
  }
  saveTemplates(templates) {
    if (Array.isArray(templates)) {
      this.cache.templates = templates;
      this.save('templates');
    }
    return this.cache.templates;
  }

  getStats() {
    this.checkAndResetDailyStats();
    return this.cache.stats;
  }

  // ==========================================
  // SCHEDULES OPERATIONS
  // ==========================================
  getSchedules() {
    return this.cache.schedules || [];
  }

  getScheduleById(id) {
    return (this.cache.schedules || []).find((s) => s.id === id);
  }

  saveSchedule(data) {
    const id = data.id || 'sch_' + crypto.randomUUID();
    const schedules = this.cache.schedules || [];
    const index = schedules.findIndex((s) => s.id === id);

    const scheduleItem = {
      id,
      type: data.type || 'POST_QUEUE', // 'POST_QUEUE' or 'RECURRING_HUNTER'
      title:
        data.title || (data.type === 'RECURRING_HUNTER' ? 'Recurring Hunter' : 'Scheduled Post'),
      enabled: data.enabled !== false,
      status: data.status || 'PENDING', // 'PENDING', 'RUNNING', 'COMPLETED', 'FAILED'
      scheduledAt: data.scheduledAt || new Date(Date.now() + 60000).toISOString(),
      intervalMinutes: Number(data.intervalMinutes) || 60,
      lastRunAt: data.lastRunAt || null,
      accountIds: data.accountIds || 'all',
      posts: Array.isArray(data.posts) ? data.posts : data.postText ? [data.postText] : [],
      mediaPaths: Array.isArray(data.mediaPaths) ? data.mediaPaths : [],
      delaySeconds: Number(data.delaySeconds) || 15,
      // Hunter specific
      keywords: Array.isArray(data.keywords) ? data.keywords : [],
      vectors: Array.isArray(data.vectors) ? data.vectors : ['LIKE', 'RETWEET', 'COMMENT'],
      maxTweets: Number(data.maxTweets) || 3,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (index >= 0) {
      schedules[index] = { ...schedules[index], ...scheduleItem };
    } else {
      schedules.unshift(scheduleItem);
    }

    this.cache.schedules = schedules;
    this.save('schedules');
    return scheduleItem;
  }

  deleteSchedule(id) {
    const initialLen = (this.cache.schedules || []).length;
    this.cache.schedules = (this.cache.schedules || []).filter((s) => s.id !== id);
    if (this.cache.schedules.length !== initialLen) {
      this.save('schedules');
      return true;
    }
    return false;
  }

  toggleSchedule(id, enabled) {
    const item = this.getScheduleById(id);
    if (item) {
      item.enabled = enabled !== undefined ? enabled : !item.enabled;
      item.updatedAt = new Date().toISOString();
      this.save('schedules');
      return item;
    }
    return null;
  }

  // ==========================================
  // HISTORY MAINTENANCE & PRUNING
  // ==========================================
  pruneHistory({ olderThanDays, status, dryRun = false } = {}) {
    let list = this.cache.history || [];
    const now = Date.now();
    const cutoffMs = olderThanDays ? olderThanDays * 24 * 60 * 60 * 1000 : null;

    const remaining = list.filter((item) => {
      // Filter by days
      if (cutoffMs && item.timestamp) {
        const itemTime = new Date(item.timestamp).getTime();
        if (!isNaN(itemTime) && now - itemTime > cutoffMs) {
          // If status specified as well
          if (!status || item.status === status) return false; // delete this
        }
      }

      // Filter by status only
      if (!cutoffMs && status && item.status === status) {
        return false; // delete this
      }

      return true;
    });

    const deletedCount = list.length - remaining.length;

    if (!dryRun && deletedCount > 0) {
      this.cache.history = remaining;
      this.save('history');
    }

    return { deletedCount, remainingCount: remaining.length };
  }

  clearHistory() {
    const count = (this.cache.history || []).length;
    this.cache.history = [];
    this.save('history');
    return { deletedCount: count };
  }
}

module.exports = new LocalDB();
