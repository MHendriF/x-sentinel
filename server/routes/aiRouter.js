const express = require('express');
const { z } = require('zod');
const aiService = require('../automation/aiService');
const { validateBody } = require('../utils/http');

const router = express.Router();

const generatePostSchema = z.object({
  keyword: z.string().min(1, 'Topik atau kata kunci wajib diisi.').max(500),
  style: z.string().max(50).optional(),
  language: z.string().max(10).optional(),
  count: z.number().int().min(1).max(5).optional(),
  customPrompt: z.string().max(2000).optional(),
  customOverrides: z.any().optional(),
});

// POST /api/ai/generate-post - Generate high-engagement tweet drafts
router.post('/generate-post', validateBody(generatePostSchema), async (req, res) => {
  const { keyword, style, language, count, customPrompt, customOverrides } = req.body;

  const result = await aiService.generatePostFromKeyword({
    keyword: keyword.trim(),
    style: style || 'viral_hook',
    language: language || 'en',
    count: Math.min(Math.max(Number(count) || 1, 1), 5),
    customPrompt: customPrompt || '',
    customOverrides: customOverrides && typeof customOverrides === 'object' ? customOverrides : {},
  });

  if (result && result.success === false) {
    return res.status(502).json({
      success: false,
      message: result.message || 'Provider AI gagal menghasilkan draf.',
    });
  }

  res.json({
    success: true,
    provider: result.provider,
    posts: result.posts,
    isFallback: Boolean(result.isFallback),
  });
});

// POST /api/ai/test-connection - Test AI provider API connectivity
router.post('/test-connection', async (req, res) => {
  const testResult = await aiService.testConnection(req.body || {});
  res.json(testResult);
});

module.exports = router;
