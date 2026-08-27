const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const db = require('../db');
const logger = require('../logger');
const twitterBot = require('../automation/twitterBot');
const proxyHelper = require('../automation/proxyHelper');
const spintax = require('../automation/spintax');
const aiService = require('../automation/aiService');
const notifier = require('../automation/notifier');
const scheduler = require('../automation/scheduler');

// GET /api/status - Get current bot status, active accounts & stats
router.get('/status', (req, res) => {
  res.json({
    success: true,
    ...twitterBot.getStatus(),
  });
});

// ==========================================
// MULTI-ACCOUNT MANAGEMENT ENDPOINTS
// ==========================================

// GET /api/accounts - List all accounts
router.get('/accounts', (req, res) => {
  const accounts = db.getAccounts().map((acc) => {
    const comments = db.getAccountComments(acc.id);
    return {
      ...acc,
      commentsCount: comments.length,
    };
  });
  res.json({ success: true, accounts });
});

// POST /api/accounts - Add new account
router.post('/accounts', async (req, res) => {
  const { label, auth_token, ct0, proxy, comments } = req.body;

  if (!auth_token || !auth_token.trim()) {
    return res.status(400).json({ success: false, message: 'Cookie auth_token wajib diisi.' });
  }

  const newAccount = db.saveAccount({
    label: label || 'Akun X',
    auth_token: auth_token.trim(),
    ct0: (ct0 || '').trim(),
    proxy: (proxy || '').trim(),
    comments: Array.isArray(comments) ? comments : undefined,
  });

  logger.info(`👥 Akun baru ditambahkan: ${newAccount.label}`);
  res.json({ success: true, account: newAccount });
});

// PUT /api/accounts/:id - Update account
router.put('/accounts/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.getAccountById(id);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Akun tidak ditemukan.' });
  }

  const updated = db.saveAccount({
    ...existing,
    ...req.body,
    id,
  });

  logger.info(`✏️ Akun diperbarui: ${updated.label}`);
  res.json({ success: true, account: updated });
});

// DELETE /api/accounts/:id - Delete account
router.delete('/accounts/:id', (req, res) => {
  const { id } = req.params;
  const deleted = db.deleteAccount(id);
  if (deleted) {
    logger.info(`🗑️ Akun ${id} telah dihapus.`);
    res.json({ success: true, message: 'Akun berhasil dihapus.' });
  } else {
    res.status(404).json({ success: false, message: 'Akun tidak ditemukan.' });
  }
});

// POST /api/accounts/bulk-import - Bulk import accounts via text/CSV/JSON
router.post('/accounts/bulk-import', (req, res) => {
  const { rawText, accounts: jsonAccounts } = req.body;
  let toImport = [];

  if (Array.isArray(jsonAccounts) && jsonAccounts.length > 0) {
    toImport = jsonAccounts;
  } else if (typeof rawText === 'string' && rawText.trim()) {
    const lines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    lines.forEach((line, idx) => {
      // 1. Check if JSON line
      if (line.startsWith('{') && line.endsWith('}')) {
        try {
          const obj = JSON.parse(line);
          if (obj.auth_token) toImport.push(obj);
          return;
        } catch (e) {}
      }

      // 2. Delimiter parsing (| or :)
      let parts = [];
      if (line.includes('|')) {
        parts = line.split('|').map((p) => p.trim());
      } else {
        // Handle colon format: token:ct0:proxy:label or token:ct0:user:pass@ip:port:label
        parts = line.split(':').map((p) => p.trim());
      }

      if (parts.length >= 2) {
        const auth_token = parts[0];
        const ct0 = parts[1];
        let proxy = '';
        let label = `Node ${idx + 1}`;

        if (parts.length === 3) {
          // Could be token:ct0:proxy or token:ct0:label
          if (parts[2].includes('.') || parts[2].includes('@')) {
            proxy = parts[2];
          } else {
            label = parts[2];
          }
        } else if (parts.length >= 4) {
          // token:ct0:user:pass@ip:port:label OR token:ct0:ip:port:label
          if (line.includes('|')) {
            proxy = parts[2] || '';
            label = parts[3] || `Node ${idx + 1}`;
          } else {
            // Check if parts[2] has @ or is part of proxy
            const remaining = parts.slice(2);
            label = remaining.pop(); // last is label
            proxy = remaining.join(':'); // rest is proxy
          }
        }

        toImport.push({
          auth_token,
          ct0,
          proxy,
          label: label || `Node ${idx + 1}`,
        });
      }
    });
  }

  if (toImport.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Tidak ada data akun yang valid untuk diimpor. Periksa format teks/JSON.',
    });
  }

  const addedAccounts = [];
  const errors = [];

  toImport.forEach((item, i) => {
    if (!item.auth_token || item.auth_token.trim().length < 20) {
      errors.push(`Baris ${i + 1}: auth_token tidak valid.`);
      return;
    }

    try {
      const saved = db.saveAccount({
        label: item.label || `Node ${i + 1}`,
        auth_token: item.auth_token.trim(),
        ct0: (item.ct0 || '').trim(),
        proxy: (item.proxy || '').trim(),
        username: (item.username || '').trim(),
        name: (item.name || '').trim(),
        enabled: true,
      });
      addedAccounts.push(saved);
    } catch (err) {
      errors.push(`Baris ${i + 1}: ${err.message}`);
    }
  });

  logger.success(`📥 Bulk Import Selesai: Berhasil mengimpor ${addedAccounts.length} node akun.`);
  res.json({
    success: true,
    addedCount: addedAccounts.length,
    failedCount: errors.length,
    errors,
    message: `Berhasil mengimpor ${addedAccounts.length} akun${errors.length > 0 ? ` (${errors.length} gagal)` : ''}.`,
  });
});

// GET /api/accounts/export - Export Fleet Backup (JSON)
router.get('/accounts/export', (req, res) => {
  const accounts = db.getAccounts();
  const exportData = {
    version: '2.5',
    timestamp: new Date().toISOString(),
    totalNodes: accounts.length,
    fleet: accounts.map((a) => ({
      id: a.id,
      label: a.label,
      auth_token: a.auth_token,
      ct0: a.ct0,
      username: a.username,
      name: a.name,
      proxy: a.proxy,
      enabled: a.enabled,
      isValid: a.isValid,
      stats: a.stats,
    })),
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="x-sentinel-fleet-backup-${Date.now()}.json"`
  );
  res.send(JSON.stringify(exportData, null, 2));
});

// POST /api/accounts/:id/toggle - Toggle enabled/disabled status
router.post('/accounts/:id/toggle', (req, res) => {
  const { id } = req.params;
  const acc = db.toggleAccount(id);
  if (acc) {
    logger.info(`🔄 Status akun ${acc.label}: ${acc.enabled ? 'Aktif' : 'Nonaktif'}`);
    res.json({ success: true, account: acc });
  } else {
    res.status(404).json({ success: false, message: 'Akun tidak ditemukan.' });
  }
});

// POST /api/accounts/:id/verify - Verify account session & proxy on X
router.post('/accounts/:id/verify', async (req, res) => {
  const { id } = req.params;
  const account = db.getAccountById(id);
  if (!account) {
    return res.status(404).json({ success: false, message: 'Akun tidak ditemukan.' });
  }

  const result = await twitterBot.verifyAccount(account);
  res.json(result);
});

// GET /api/accounts/:id/comments - Get account JSON comments
router.get('/accounts/:id/comments', (req, res) => {
  const { id } = req.params;
  const comments = db.getAccountComments(id);
  res.json({ success: true, comments, file: db.getAccountCommentsFilePath(id) });
});

// POST /api/accounts/:id/comments - Save account JSON comments
router.post('/accounts/:id/comments', (req, res) => {
  const { id } = req.params;
  const { comments } = req.body;

  if (!Array.isArray(comments)) {
    return res.status(400).json({ success: false, message: 'Data comments harus berupa array.' });
  }

  try {
    const saved = db.saveAccountComments(id, comments);
    logger.info(`💾 ${comments.length} komentar disimpan untuk akun ${id}`);
    res.json({ success: true, comments: saved });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// TASKS & AUTOMATION ENDPOINTS
// ==========================================

// POST /api/tasks/batch - Start Batch Task with Multi-Account Rotation
router.post('/tasks/batch', async (req, res) => {
  if (twitterBot.isRunning) {
    return res.status(400).json({ success: false, message: 'Otomasi lain sedang berjalan.' });
  }

  const {
    accountIds = 'all',
    urls,
    like = true,
    retweet = true,
    comment = true,
    commentText = null,
  } = req.body;

  let urlList = [];
  if (Array.isArray(urls)) {
    urlList = urls;
  } else if (typeof urls === 'string') {
    urlList = urls
      .split('\n')
      .map((u) => u.trim())
      .filter(Boolean);
  }

  // Strict URL Validation Guard
  const tweetUrlRegex = /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[a-zA-Z0-9_]+\/status\/\d+/i;
  const validUrls = urlList.filter((u) => tweetUrlRegex.test(u));

  if (validUrls.length === 0) {
    return res.status(400).json({
      success: false,
      message:
        'Daftar URL tidak valid. Pastikan format URL tweet sesuai (contoh: https://x.com/username/status/1234567890).',
    });
  }

  try {
    // Run in background
    twitterBot
      .runMultiAccountBatchTask(accountIds, validUrls, { like, retweet, comment, commentText })
      .catch((err) => logger.error(`Unhandled batch error: ${err.message}`));

    res.json({
      success: true,
      message: `Otomasi dimulai untuk ${validUrls.length} tweet valid${validUrls.length < urlList.length ? ` (${urlList.length - validUrls.length} URL tidak valid dilewati)` : ''}.`,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/tasks/hunter - Start Auto Hunter with Multi-Account Rotation
router.post('/tasks/hunter', async (req, res) => {
  if (twitterBot.isRunning) {
    return res.status(400).json({ success: false, message: 'Otomasi lain sedang berjalan.' });
  }

  const {
    accountIds = 'all',
    keyword,
    count = 10,
    like = true,
    retweet = true,
    comment = true,
    commentText = null,
  } = req.body;

  if (!keyword || !keyword.trim()) {
    return res
      .status(400)
      .json({ success: false, message: 'Keyword atau hashtag pencarian wajib diisi.' });
  }

  try {
    // Run in background
    twitterBot
      .runMultiAccountHunter(accountIds, keyword.trim(), parseInt(count, 10) || 10, {
        like,
        retweet,
        comment,
        commentText,
      })
      .catch((err) => logger.error(`Unhandled hunter error: ${err.message}`));

    res.json({ success: true, message: `Auto Hunter dimulai untuk keyword "${keyword}".` });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/tasks/post - Start Post Publishing Task
router.post('/tasks/post', async (req, res) => {
  if (twitterBot.isRunning) {
    return res.status(400).json({ success: false, message: 'Otomasi lain sedang berjalan.' });
  }

  const { accountIds = 'all', posts, delaySeconds = 15 } = req.body;

  let postList = [];
  if (Array.isArray(posts)) {
    postList = posts.map((p) => String(p).trim()).filter(Boolean);
  } else if (typeof posts === 'string' && posts.trim()) {
    postList = [posts.trim()];
  }

  if (postList.length === 0) {
    return res.status(400).json({ success: false, message: 'Konten postingan wajib diisi.' });
  }

  try {
    // Run in background
    twitterBot
      .runMultiAccountPostTask(accountIds, postList, { delaySeconds })
      .catch((err) => logger.error(`Unhandled post task error: ${err.message}`));

    res.json({
      success: true,
      message: `Tugas memposting ke X dimulai untuk ${postList.length} konten postingan.`,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/tasks/stop - Stop ongoing task
router.post('/tasks/stop', (req, res) => {
  const stopped = twitterBot.stopTask();
  res.json({ success: true, stopped });
});

// ==========================================
// AI GENERATOR ENDPOINTS
// ==========================================

// POST /api/ai/generate-post - Generate High-Engagement Tweets from Keyword
router.post('/ai/generate-post', async (req, res) => {
  const {
    keyword,
    style = 'viral_hook',
    language = 'en',
    count = 3,
    customPrompt = '',
    customOverrides = {},
  } = req.body;

  if (!keyword || !keyword.trim()) {
    return res.status(400).json({ success: false, message: 'Kata kunci / topik wajib diisi.' });
  }

  const startTime = Date.now();
  try {
    const result = await aiService.generatePostFromKeyword({
      keyword: keyword.trim(),
      style,
      language,
      count: parseInt(count, 10) || 3,
      customPrompt: (customPrompt || '').trim(),
      customOverrides,
    });

    const duration = Date.now() - startTime;
    res.json({
      ...result,
      latency: duration,
      keyword: keyword.trim(),
      style,
      language,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: `Gagal meracik postingan: ${err.message}`,
    });
  }
});

// POST /api/proxy/test - Live ping & GeoIP test for any proxy string
router.post('/proxy/test', async (req, res) => {
  const { proxy } = req.body;
  if (!proxy || !proxy.trim()) {
    return res.status(400).json({ success: false, message: 'String proxy wajib diisi.' });
  }

  logger.info(`🌐 Menguji koneksi proxy: ${proxy.replace(/http:\/\/[^@]*@/, '')}...`);
  const result = await proxyHelper.testProxy(proxy.trim());
  if (result.success) {
    logger.success(
      `✅ Proxy aktif: ${result.ip} (${result.country}) - Latency: ${result.latency}ms`
    );
  } else {
    logger.warn(`❌ Proxy gagal: ${result.message} (${result.latency}ms)`);
  }
  res.json(result);
});

// POST /api/accounts/:id/test-proxy - Live ping test for specific account's proxy
router.post('/accounts/:id/test-proxy', async (req, res) => {
  const { id } = req.params;
  const account = db.getAccountById(id);
  if (!account) {
    return res.status(404).json({ success: false, message: 'Akun tidak ditemukan.' });
  }

  if (!account.proxy) {
    return res.json({
      success: true,
      isDirect: true,
      message: 'Akun menggunakan koneksi Direct IP (tanpa proxy).',
    });
  }

  logger.info(`🌐 Menguji proxy node ${account.label}...`);
  const result = await proxyHelper.testProxy(account.proxy);
  res.json(result);
});

// GET /api/settings - Get settings
router.get('/settings', (req, res) => {
  res.json({ success: true, settings: db.getSettings() });
});

// POST /api/settings - Update settings
router.post('/settings', (req, res) => {
  const updated = db.saveSettings(req.body);
  logger.info('⚙️ Pengaturan sistem diperbarui.');
  res.json({ success: true, settings: updated });
});

// POST /api/settings/test-ai - Test AI Connection & Model Ping
router.post('/settings/test-ai', async (req, res) => {
  const result = await aiService.testConnection(req.body);
  res.json(result);
});

// POST /api/settings/generate-ai-test - Test Contextual AI Reply Generation
router.post('/settings/generate-ai-test', async (req, res) => {
  const { tweetText, aiProvider, aiApiKey, aiModel, aiBaseUrl, aiPrompt } = req.body;
  if (!tweetText || !tweetText.trim()) {
    return res.status(400).json({ success: false, message: 'Sample tweet text wajib diisi.' });
  }

  const startTime = Date.now();
  const reply = await aiService.generateContextualReply(
    tweetText.trim(),
    {},
    { aiProvider, aiApiKey, aiModel, aiBaseUrl, aiPrompt }
  );

  const duration = Date.now() - startTime;
  if (reply) {
    res.json({
      success: true,
      latency: duration,
      model: aiModel || 'default',
      provider: aiProvider,
      sampleOutput: reply,
      message: `Berhasil meracik balasan AI (${duration}ms)!`,
    });
  } else {
    res.json({
      success: false,
      latency: duration,
      message: 'AI gagal merespons atau timeout. Periksa kembali endpoint, model, atau API Key.',
    });
  }
});

// GET /api/templates - Global Templates
router.get('/templates', (req, res) => {
  res.json({ success: true, templates: db.getTemplates() });
});

// POST /api/templates - Save Global Templates
router.post('/templates', (req, res) => {
  const { templates } = req.body;
  if (!Array.isArray(templates)) {
    return res.status(400).json({ success: false, message: 'Format templates harus array.' });
  }
  const saved = db.saveTemplates(templates);
  res.json({ success: true, templates: saved });
});

// POST /api/spintax/preview - Generate Spintax previews
router.post('/spintax/preview', (req, res) => {
  const { text, count = 5 } = req.body;
  if (!text) {
    return res.status(400).json({ success: false, message: 'Teks template tidak boleh kosong.' });
  }

  const variations = [];
  for (let i = 0; i < (count || 5); i++) {
    variations.push(spintax.parseSpintax(text));
  }
  res.json({ success: true, variations });
});

// ==========================================
// MEDIA / IMAGE UPLOAD ENDPOINT
// ==========================================
router.post('/media/upload', (req, res) => {
  try {
    const { imageBase64, filename } = req.body;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ success: false, message: 'Data gambar base64 wajib diisi.' });
    }

    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let buffer;
    let ext = '.png';

    if (matches && matches.length === 3) {
      const mime = matches[1];
      if (mime.includes('jpeg') || mime.includes('jpg')) ext = '.jpg';
      else if (mime.includes('gif')) ext = '.gif';
      else if (mime.includes('webp')) ext = '.webp';
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(imageBase64, 'base64');
    }

    const safeName = (filename || `img_${Date.now()}`).replace(/[^a-zA-Z0-9_\-\.]/g, '');
    const finalFilename = `${Date.now()}_${safeName.endsWith(ext) ? safeName : safeName + ext}`;
    const localPath = path.join(db.mediaDir, finalFilename);

    fs.writeFileSync(localPath, buffer);
    logger.info(
      `🖼️ File media diunggah: ${finalFilename} (${(buffer.length / 1024).toFixed(1)} KB)`
    );

    res.json({
      success: true,
      filename: finalFilename,
      localPath,
      sizeKb: (buffer.length / 1024).toFixed(1),
    });
  } catch (err) {
    logger.error(`❌ Gagal menyimpan media upload: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// FLEET HEALTH & SESSION CHECK ENDPOINTS
// ==========================================
router.post('/accounts/check-health', async (req, res) => {
  if (twitterBot.isRunning) {
    return res.status(400).json({ success: false, message: 'Bot sedang menjalankan tugas lain.' });
  }
  const result = await twitterBot.checkFleetHealth();
  res.json(result);
});

router.post('/accounts/:id/check-health', async (req, res) => {
  const { id } = req.params;
  const account = db.getAccountById(id);
  if (!account) {
    return res.status(404).json({ success: false, message: 'Akun tidak ditemukan.' });
  }
  if (twitterBot.isRunning) {
    return res.status(400).json({ success: false, message: 'Bot sedang menjalankan tugas lain.' });
  }
  const result = await twitterBot.checkAccountHealth(account);
  res.json(result);
});

// ==========================================
// ACCOUNT WARM-UP PROTOCOL ENDPOINTS
// ==========================================
router.post('/accounts/:id/warmup', async (req, res) => {
  const { id } = req.params;
  const account = db.getAccountById(id);
  if (!account) {
    return res.status(404).json({ success: false, message: 'Akun tidak ditemukan.' });
  }
  if (twitterBot.isRunning) {
    return res
      .status(400)
      .json({ success: false, message: 'Sebuah proses otomasi sedang berjalan.' });
  }

  // Run in background or wait
  twitterBot.runWarmupTask(account).catch((err) => {
    logger.error(`❌ Error pada warmup task: ${err.message}`);
  });

  res.json({
    success: true,
    message: `Memulai rutinitas pemanasan untuk @${account.username || account.label} (Hari ${account.warmupDay || 1}/7)...`,
  });
});

// ==========================================
// SCHEDULES & POST QUEUE ENDPOINTS
// ==========================================
router.get('/schedules', (req, res) => {
  res.json({ success: true, schedules: db.getSchedules() });
});

router.post('/schedules', (req, res) => {
  const schedule = db.saveSchedule(req.body);
  logger.info(`⏰ Jadwal baru ditambahkan: "${schedule.title}" (${schedule.type})`);
  res.json({ success: true, schedule });
});

router.delete('/schedules/:id', (req, res) => {
  const { id } = req.params;
  const deleted = db.deleteSchedule(id);
  if (deleted) {
    logger.info(`🗑️ Jadwal ${id} dihapus.`);
    res.json({ success: true, message: 'Jadwal berhasil dihapus.' });
  } else {
    res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan.' });
  }
});

router.post('/schedules/:id/toggle', (req, res) => {
  const { id } = req.params;
  const updated = db.toggleSchedule(id, req.body?.enabled);
  if (updated) {
    res.json({ success: true, schedule: updated });
  } else {
    res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan.' });
  }
});

// ==========================================
// WEBHOOK TEST ENDPOINT
// ==========================================
router.post('/settings/test-webhook', async (req, res) => {
  const { type, telegramBotToken, telegramChatId, discordWebhookUrl } = req.body;

  try {
    if (type === 'telegram' || (!type && telegramBotToken && telegramChatId)) {
      const tgRes = await notifier.sendTelegram(
        telegramBotToken,
        telegramChatId,
        `🔔 <b>X-SENTINEL Webhook Test</b>\n\nKoneksi Telegram Bot berhasil terverifikasi! Sistem siap mengirimkan alert real-time.`
      );
      return res.json(tgRes);
    } else if (type === 'discord' || (!type && discordWebhookUrl)) {
      const dcRes = await notifier.sendDiscord(discordWebhookUrl, {
        title: '🔔 X-SENTINEL Discord Webhook Test',
        description:
          'Koneksi Discord Webhook berhasil terverifikasi! Sistem siap mengirimkan alert real-time.',
        color: 0x10b981,
      });
      return res.json(dcRes);
    } else {
      return res.status(400).json({ success: false, message: 'Parameter webhook tidak lengkap.' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// HISTORY PRUNE & MAINTENANCE ENDPOINTS
// ==========================================
router.post('/history/prune', (req, res) => {
  const { olderThanDays, status } = req.body;
  const result = db.pruneHistory({
    olderThanDays: Number(olderThanDays) || null,
    status: status || null,
  });
  logger.info(
    `🧹 Pembersihan riwayat: ${result.deletedCount} log dihapus (${result.remainingCount} tersisa).`
  );
  res.json({ success: true, ...result });
});

router.post('/history/clear-all', (req, res) => {
  const result = db.clearHistory();
  logger.warn(`🧹 Seluruh riwayat interaksi telah dibersihkan (${result.deletedCount} entri).`);
  res.json({ success: true, ...result });
});

// GET /api/history - Get engagement history
router.get('/history', (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 100;
  res.json({ success: true, history: db.getHistory(limit), stats: db.getStats() });
});

// GET /api/logs - Get recent logs
router.get('/logs', (req, res) => {
  res.json({ success: true, logs: logger.getRecentLogs() });
});

module.exports = router;
