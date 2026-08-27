const express = require('express');
const router = express.Router();
const db = require('../db');
const logger = require('../logger');
const proxyHelper = require('../automation/proxyHelper');
const spintax = require('../automation/spintax');
const notifier = require('../automation/notifier');

// GET /api/settings - Get settings
router.get('/settings', (req, res) => {
  const settings = db.getSettings();
  res.json({ success: true, settings });
});

// POST /api/settings - Save settings
router.post('/settings', (req, res) => {
  const current = db.getSettings();
  const updated = db.saveSettings({
    ...current,
    ...req.body,
  });

  logger.info(`⚙️ Pengaturan sistem diperbarui.`);
  res.json({ success: true, settings: updated });
});

// POST /api/settings/test-webhook - Test webhook alert
router.post('/settings/test-webhook', async (req, res) => {
  try {
    const { type, telegramBotToken, telegramChatId, discordWebhookUrl } = req.body;
    const testResult = await notifier.testWebhook({
      type,
      telegramBotToken,
      telegramChatId,
      discordWebhookUrl,
    });
    res.json(testResult);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/proxy/test - Live proxy test
router.post('/proxy/test', async (req, res) => {
  const { proxy } = req.body;
  if (!proxy || !proxy.trim()) {
    return res.status(400).json({ success: false, message: 'Format proxy tidak boleh kosong.' });
  }

  logger.info(`🔍 Menguji koneksi & latensi proxy: ${proxyHelper.maskProxy(proxy)}`);
  const result = await proxyHelper.testProxy(proxy);

  if (result.success) {
    logger.success(
      `✅ Proxy aktif! Latensi: ${result.latencyMs}ms | IP: ${result.ip} (${result.country}, ${result.isp})`
    );
  } else {
    logger.warn(`❌ Proxy gagal: ${result.message}`);
  }

  res.json(result);
});

// POST /api/spintax/preview - Test spintax permutations
router.post('/spintax/preview', (req, res) => {
  const { text, count = 3 } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ success: false, message: 'Teks template tidak boleh kosong.' });
  }

  const results = [];
  const numCount = Math.min(Math.max(Number(count) || 3, 1), 10);
  for (let i = 0; i < numCount; i++) {
    results.push(spintax.parseSpintax(text.trim()));
  }

  res.json({ success: true, previews: results });
});

// GET /api/comments - Global fallback comments
router.get('/comments', (req, res) => {
  const comments = db.getComments();
  res.json({ success: true, comments });
});

// POST /api/comments - Save global fallback comments
router.post('/comments', (req, res) => {
  const { comments } = req.body;
  if (!Array.isArray(comments)) {
    return res
      .status(400)
      .json({ success: false, message: 'Format komentar harus berupa array string.' });
  }

  db.saveComments(comments);
  logger.info(`💾 Database fallback komentar diperbarui (${comments.length} item).`);
  res.json({ success: true, count: comments.length });
});

// GET /api/stats - System telemetry stats
router.get('/stats', (req, res) => {
  const stats = db.getStats();
  res.json({ success: true, stats });
});

module.exports = router;
