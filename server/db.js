const fs = require('fs');
const path = require('path');
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
      schedules: path.join(this.dataDir, 'schedules.json')
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
      aiPrompt: 'Write a sharp, authentic, and context-aware 1-sentence English reply as a crypto/tech native. Be insightful, peer-to-peer, and zero generic praise.',
      telegramEnabled: false,
      telegramBotToken: '',
      telegramChatId: '',
      discordEnabled: false,
      discordWebhookUrl: ''
    });

    // Default global templates
    const defaultTemplates = [
      "{Keren banget|Mantap sekali|Insightful banget} {infonya|pembahasannya|tweetnya} {bang|kak|gan}! 🔥 {Izin bookmark ya|Ditunggu update selanjutnya|Bermanfaat banget}.",
      "{Setuju banget|Sepakat|Benar sekali} dengan poin ini. {Sangat menginspirasi|Membuka wawasan|Top markotop} 👍",
      "{Wah gokil|Menarik banget|Keren nih}, {makasih sudah sharing|makasih infonya ya|semoga makin sukses} {kak|bang|mas}! 🚀"
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
        id: 'acc_' + Date.now().toString(36),
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
        stats: { likes: 0, retweets: 0, comments: 0 }
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
      lastResetDate: new Date().toISOString().slice(0, 10)
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
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error(`Error reading ${filePath}:`, e.message);
    }
    this.writeFile(filePath, defaultValue);
    return defaultValue;
  }

  writeFile(filePath, data) {
    try {
      const tempPath = `${filePath}.tmp.${process.pid}.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
      fs.renameSync(tempPath, filePath);
    } catch (e) {
      console.error(`Error writing ${filePath}:`, e.message);
      // Fallback direct write
      try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      } catch (err) {
        console.error(`Direct fallback write failed for ${filePath}:`, err.message);
      }
    }
  }

  save(key) {
    if (this.files[key] && this.cache[key] !== undefined) {
      this.writeFile(this.files[key], this.cache[key]);
    }
  }

  // Settings
  getSettings() { return this.cache.settings; }
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
    return (this.cache.accounts || []).find(acc => acc.id === id);
  }

  getActiveAccounts() {
    return (this.cache.accounts || []).filter(acc => acc.enabled !== false);
  }

  saveAccount(accountData) {
    const id = accountData.id || 'acc_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
    const existingIndex = (this.cache.accounts || []).findIndex(acc => acc.id === id);

    const defaultComments = this.getTemplates();
    const sanitizedId = String(id).replace(/[^a-zA-Z0-9_\-]/g, '');

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
      stats: accountData.stats || { likes: 0, retweets: 0, comments: 0 }
    };

    if (existingIndex >= 0) {
      this.cache.accounts[existingIndex] = {
        ...this.cache.accounts[existingIndex],
        ...updatedAccount
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
    const index = (this.cache.accounts || []).findIndex(acc => acc.id === id);
    if (index >= 0) {
      const removed = this.cache.accounts.splice(index, 1)[0];
      this.save('accounts');

      // Optionally delete comment file safely
      const commentFilePath = this.getAccountCommentsFilePath(id);
      if (fs.existsSync(commentFilePath)) {
        try { fs.unlinkSync(commentFilePath); } catch (e) {}
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

  // Account Comments JSON File Management with Path Traversal Hardening
  getAccountCommentsFilePath(accountId) {
    const sanitizedId = String(accountId).replace(/[^a-zA-Z0-9_\-]/g, '');
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
    return this.cache.history.some(item => {
      const match = item.tweetId === tweetId && item.action === actionType && item.status === 'SUCCESS';
      return accountId ? match && item.accountId === accountId : match;
    });
  }

  addHistory(entry) {
    const item = {
      id: Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toISOString(),
      timeFormatted: new Date().toLocaleTimeString('id-ID'),
      ...entry
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
          if (item.action === 'POST' || item.action === 'TWEET') acc.stats.posts = (acc.stats.posts || 0) + 1;
          this.save('accounts');
        }
      }
    }

    return item;
  }

  getTemplates() { return this.cache.templates; }
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
    return (this.cache.schedules || []).find(s => s.id === id);
  }

  saveSchedule(data) {
    const id = data.id || 'sch_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 3);
    const schedules = this.cache.schedules || [];
    const index = schedules.findIndex(s => s.id === id);

    const scheduleItem = {
      id,
      type: data.type || 'POST_QUEUE', // 'POST_QUEUE' or 'RECURRING_HUNTER'
      title: data.title || (data.type === 'RECURRING_HUNTER' ? 'Recurring Hunter' : 'Scheduled Post'),
      enabled: data.enabled !== false,
      status: data.status || 'PENDING', // 'PENDING', 'RUNNING', 'COMPLETED', 'FAILED'
      scheduledAt: data.scheduledAt || new Date(Date.now() + 60000).toISOString(),
      intervalMinutes: Number(data.intervalMinutes) || 60,
      lastRunAt: data.lastRunAt || null,
      accountIds: data.accountIds || 'all',
      posts: Array.isArray(data.posts) ? data.posts : (data.postText ? [data.postText] : []),
      mediaPaths: Array.isArray(data.mediaPaths) ? data.mediaPaths : [],
      delaySeconds: Number(data.delaySeconds) || 15,
      // Hunter specific
      keywords: Array.isArray(data.keywords) ? data.keywords : [],
      vectors: Array.isArray(data.vectors) ? data.vectors : ['LIKE', 'RETWEET', 'COMMENT'],
      maxTweets: Number(data.maxTweets) || 3,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
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
    this.cache.schedules = (this.cache.schedules || []).filter(s => s.id !== id);
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

    const remaining = list.filter(item => {
      // Filter by days
      if (cutoffMs && item.timestamp) {
        const itemTime = new Date(item.timestamp).getTime();
        if (!isNaN(itemTime) && (now - itemTime) > cutoffMs) {
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
