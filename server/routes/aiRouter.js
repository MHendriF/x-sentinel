const express = require('express');
const router = express.Router();
const logger = require('../logger');
const aiService = require('../automation/aiService');

// POST /api/ai/generate-post - Generate high-engagement tweet drafts
router.post('/generate-post', async (req, res) => {
  const { keyword, style, language, count, customPrompt } = req.body;

  if (!keyword || !keyword.trim()) {
    return res.status(400).json({ success: false, message: 'Topik atau kata kunci wajib diisi.' });
  }

  try {
    const result = await aiService.generatePostContent({
      keyword: keyword.trim(),
      style: style || 'viral_hook',
      language: language || 'en',
      count: Math.min(Math.max(Number(count) || 1, 1), 5),
      customPrompt: customPrompt || '',
    });

    res.json({
      success: true,
      provider: result.provider,
      posts: result.posts,
    });
  } catch (err) {
    logger.error(`❌ Gagal generate postingan AI: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/ai/test-connection - Test AI provider API connectivity
router.post('/test-connection', async (req, res) => {
  try {
    const testResult = await aiService.testConnection(req.body);
    res.json(testResult);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
