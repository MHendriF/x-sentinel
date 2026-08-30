const express = require('express');
const { z } = require('zod');
const db = require('../db');
const logger = require('../logger');
const proxyHelper = require('../automation/proxyHelper');
const spintax = require('../automation/spintax');
const notifier = require('../automation/notifier');
const aiService = require('../automation/aiService');
const {
  redactSettings,
  resolveSecret,
  restoreMaskedSettings,
  maskProxyString,
} = require('../security');
const { validateBody, httpError } = require('../utils/http');

const router = express.Router();

const settingsSchema = z.object({
  minDelaySeconds: z.number().int().min(0).max(3600).optional(),
  maxDelaySeconds: z.number().int().min(1).max(7200).optional(),
  accountSwitchDelaySec: z.number().int().min(0).max(3600).optional(),
  hourlyLimit: z.number().int().min(1).max(1000).optional(),
  dailyLimit: z.number().int().min(1).max(10000).optional(),
  headless: z.boolean().optional(),
  scrollBeforeAction: z.boolean().optional(),
  aiProvider: z.string().max(50).optional(),
  aiApiKey: z.string().max(500).optional(),
  aiModel: z.string().max(200).optional(),
  aiBaseUrl: z.string().max(500).optional(),
  aiPrompt: z.string().max(8000).optional(),
  telegramEnabled: z.boolean().optional(),
  telegramBotToken: z.string().max(200).optional(),
  telegramChatId: z.string().max(100).optional(),
  discordEnabled: z.boolean().optional(),
  discordWebhookUrl: z.string().max(500).optional(),
});

const webhookTestSchema = z.object({
  type: z.enum(['telegram', 'discord']).optional(),
  telegramBotToken: z.string().max(200).optional(),
  telegramChatId: z.string().max(100).optional(),
  discordWebhookUrl: z.string().max(500).optional(),
});

const aiConnectionTestSchema = z.object({
  aiProvider: z.string().max(50).optional(),
  aiApiKey: z.string().max(500).optional(),
  aiModel: z.string().max(200).optional(),
  aiBaseUrl: z.string().max(500).optional(),
});

const aiGenerationTestSchema = z.object({
  tweetText: z.string().min(1, 'Teks tweet target wajib diisi.'),
  aiProvider: z.string().max(50).optional(),
  aiApiKey: z.string().max(500).optional(),
  aiModel: z.string().max(200).optional(),
  aiBaseUrl: z.string().max(500).optional(),
  aiPrompt: z.string().max(8000).optional(),
});

const proxyTestSchema = z.object({
  proxy: z
    .string()
    .min(1, 'Format proxy tidak boleh kosong.')
    .max(500)
    .refine((val) => proxyHelper.isValidProxyFormat(val.trim()), {
      message:
        'Format proxy tidak valid. Gunakan: user:pass@ip:port, ip:port:user:pass, atau ip:port (HTTP/SOCKS5).',
    }),
});

const spintaxPreviewSchema = z.object({
  text: z.string().min(1, 'Teks template tidak boleh kosong.').max(8000),
  count: z.number().int().min(1).max(10).optional(),
});

const templatesSchema = z.object({
  templates: z.array(z.string()).max(500),
});

const commentsSchema = z.object({
  comments: z.array(z.string()).max(500),
});

// Build AI overrides from a validated body, dropping masked API keys so the
// stored key from settings.json is used instead.
function buildAiOverrides(body) {
  const overrides = { ...body };
  if (overrides.aiApiKey && overrides.aiApiKey.includes('••')) {
    delete overrides.aiApiKey;
  }
  return overrides;
}

// GET /api/settings - Get settings (AI keys & webhook tokens masked)
router.get('/settings', (req, res) => {
  const settings = db.getSettings();
  res.json({ success: true, settings: redactSettings(settings) });
});

// POST /api/settings - Save settings (masked values are restored from storage)
router.post('/settings', validateBody(settingsSchema), (req, res) => {
  const current = db.getSettings();
  const updated = db.saveSettings(restoreMaskedSettings(req.body, current));

  logger.info(`⚙️ Pengaturan sistem diperbarui.`);
  res.json({ success: true, settings: redactSettings(updated) });
});

// POST /api/settings/test-webhook - Test webhook alert
router.post('/settings/test-webhook', validateBody(webhookTestSchema), async (req, res) => {
  const { type, telegramChatId } = req.body;
  const stored = db.getSettings();
  const testResult = await notifier.testWebhook({
    type,
    telegramBotToken: resolveSecret(req.body.telegramBotToken, stored.telegramBotToken),
    telegramChatId,
    discordWebhookUrl: resolveSecret(req.body.discordWebhookUrl, stored.discordWebhookUrl),
  });
  res.json(testResult);
});

// POST /api/settings/test-ai - Quick provider connectivity & credential ping
router.post('/settings/test-ai', validateBody(aiConnectionTestSchema), async (req, res) => {
  const testResult = await aiService.testConnection(buildAiOverrides(req.body));
  res.json(testResult);
});

// POST /api/settings/generate-ai-test - Live contextual reply generation on a sample tweet
router.post(
  '/settings/generate-ai-test',
  validateBody(aiGenerationTestSchema),
  async (req, res) => {
    const { tweetText } = req.body;
    const reply = await aiService.generateContextualReply(
      tweetText,
      {},
      buildAiOverrides(req.body)
    );

    if (!reply) {
      throw httpError(
        422,
        'AI tidak menghasilkan balasan. Periksa provider, API key, atau prompt.',
        'AI_NO_REPLY'
      );
    }

    res.json({ success: true, message: 'Balasan AI berhasil dirender.', sampleOutput: reply });
  }
);

// POST /api/proxy/test - Live proxy test
router.post('/proxy/test', validateBody(proxyTestSchema), async (req, res) => {
  const { proxy } = req.body;

  logger.info(`🔍 Menguji koneksi & latensi proxy: ${maskProxyString(proxy)}`);
  const result = await proxyHelper.testProxy(proxy);

  if (result.success) {
    logger.success(
      `✅ Proxy aktif! Latensi: ${result.latency}ms | IP: ${result.ip} (${result.country}, ${result.isp})`
    );
  } else {
    logger.warn(`❌ Proxy gagal: ${result.message}`);
  }

  res.json(result);
});

// POST /api/spintax/preview - Test spintax permutations
router.post('/spintax/preview', validateBody(spintaxPreviewSchema), (req, res) => {
  const { text, count = 3 } = req.body;

  const results = [];
  for (let i = 0; i < count; i++) {
    results.push(spintax.parseSpintax(text.trim()));
  }

  res.json({ success: true, previews: results });
});

// GET /api/templates - Global spintax templates (fallback comments)
router.get('/templates', (req, res) => {
  res.json({ success: true, templates: db.getTemplates() });
});

// POST /api/templates - Save global spintax templates
router.post('/templates', validateBody(templatesSchema), (req, res) => {
  const saved = db.saveTemplates(req.body.templates);
  logger.info(`💾 Global spintax template diperbarui (${saved.length} item).`);
  res.json({ success: true, count: saved.length, templates: saved });
});

// GET /api/comments - Global fallback comments (alias of templates)
router.get('/comments', (req, res) => {
  res.json({ success: true, comments: db.getComments() });
});

// POST /api/comments - Save global fallback comments (alias of templates)
router.post('/comments', validateBody(commentsSchema), (req, res) => {
  const saved = db.saveComments(req.body.comments);
  logger.info(`💾 Database fallback komentar diperbarui (${saved.length} item).`);
  res.json({ success: true, count: saved.length });
});

// GET /api/stats - System telemetry stats
router.get('/stats', (req, res) => {
  const stats = db.getStats();
  res.json({ success: true, stats });
});

module.exports = router;
