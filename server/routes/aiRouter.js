const path = require('path');
const fs = require('fs');
const express = require('express');
const { z } = require('zod');
const aiService = require('../automation/aiService');
const db = require('../db');
const logger = require('../logger');
const { validateBody, httpError } = require('../utils/http');

const router = express.Router();

const generatePostSchema = z.object({
  keyword: z.string().min(1, 'Topic or keyword is required.').max(500),
  style: z.string().max(50).optional(),
  language: z.string().max(10).optional(),
  count: z.number().int().min(1).max(5).optional(),
  customPrompt: z.string().max(2000).optional(),
  customOverrides: z.any().optional(),
});

const generatePayloadRepliesSchema = z.object({
  postText: z.string().min(1, 'Target post text is required.').max(4000),
  count: z.number().int().min(1).max(50).optional(),
  tone: z.string().max(50).optional(),
  language: z.string().max(10).optional(),
  customInstruction: z.string().max(2000).optional(),
  customOverrides: z.any().optional(),
});

const savePayloadFileSchema = z.object({
  fileName: z.string().min(1, 'File name is required.').max(100),
  replies: z.array(z.string()).min(1, 'Reply list cannot be empty.'),
  targetAccountId: z.string().optional(),
  saveToTemplates: z.boolean().optional(),
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
      message: result.message || 'AI provider failed to generate draft.',
    });
  }

  res.json({
    success: true,
    provider: result.provider,
    posts: result.posts,
    isFallback: Boolean(result.isFallback),
  });
});

// POST /api/ai/generate-payload-replies - Generate multi reply payload bank from post
router.post(
  '/generate-payload-replies',
  validateBody(generatePayloadRepliesSchema),
  async (req, res) => {
    const { postText, count, tone, language, customInstruction, customOverrides } = req.body;

    const result = await aiService.generatePayloadRepliesFromPost({
      postText: postText.trim(),
      count: Math.min(Math.max(Number(count) || 15, 1), 50),
      tone: tone || 'peer_native',
      language: language || 'auto',
      customInstruction: customInstruction || '',
      customOverrides:
        customOverrides && typeof customOverrides === 'object' ? customOverrides : {},
    });

    if (result && result.success === false) {
      return res.status(502).json({
        success: false,
        message: result.message || 'Failed to generate reply payloads.',
      });
    }

    res.json({
      success: true,
      provider: result.provider,
      count: result.count || (result.replies || []).length,
      replies: result.replies || [],
      isFallback: Boolean(result.isFallback),
    });
  }
);

// POST /api/ai/save-payload-file - Save replies to a .json file safely
router.post('/save-payload-file', validateBody(savePayloadFileSchema), async (req, res) => {
  const { fileName, replies, targetAccountId, saveToTemplates } = req.body;

  // Clean strings and ensure NO double quotes exist in any line
  const cleanedReplies = replies.map((r) => String(r).replace(/["“”]/g, '').trim()).filter(Boolean);

  if (cleanedReplies.length === 0) {
    throw httpError(400, 'Reply list cannot be empty.', 'EMPTY_REPLIES');
  }

  // Sanitize filename to prevent directory traversal
  let baseName = path.basename(fileName).trim();
  if (!baseName.toLowerCase().endsWith('.json')) {
    baseName = `${baseName}.json`;
  }
  const safeName = baseName.replace(/[^a-zA-Z0-9_\-.]/g, '_');

  const targetPath = path.resolve(db.commentsDir, safeName);
  const normalizedCommentsDir = path.resolve(db.commentsDir);

  if (
    !targetPath.startsWith(normalizedCommentsDir + path.sep) &&
    targetPath !== normalizedCommentsDir
  ) {
    throw httpError(400, 'Invalid file path traversal detected.', 'SECURITY_VIOLATION');
  }

  try {
    db.writeFile(targetPath, cleanedReplies);
    logger.info(`💾 Payload file saved: ${safeName} (${cleanedReplies.length} replies).`);

    // Optionally assign directly to target account
    if (targetAccountId) {
      const account = db.getAccountById(targetAccountId);
      if (account) {
        db.saveAccountComments(targetAccountId, cleanedReplies);
        logger.info(
          `🎯 Payload linked to node @${account.username || account.label}`
        );
      }
    }

    // Optionally save to global templates fallback
    if (saveToTemplates) {
      db.saveTemplates(cleanedReplies);
      logger.info('🌐 Reply payload loaded into Global Templates Pool.');
    }

    res.json({
      success: true,
      fileName: safeName,
      filePath: `data/comments/${safeName}`,
      count: cleanedReplies.length,
      message: `Successfully saved ${cleanedReplies.length} replies to ${safeName}`,
    });
  } catch (err) {
    logger.error(`❌ Failed to save payload file: ${err.message}`);
    throw httpError(500, `Failed to save file: ${err.message}`, 'FILE_SAVE_ERROR');
  }
});

// GET /api/ai/payload-files - List all .json files in comments directory
router.get('/payload-files', (req, res) => {
  try {
    const files = fs.readdirSync(db.commentsDir);
    const result = [];

    for (const f of files) {
      if (!f.toLowerCase().endsWith('.json')) continue;
      const fullPath = path.join(db.commentsDir, f);
      try {
        const stat = fs.statSync(fullPath);
        let itemCount = 0;
        try {
          const raw = fs.readFileSync(fullPath, 'utf8');
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) itemCount = parsed.length;
        } catch (e) {}

        result.push({
          fileName: f,
          filePath: `data/comments/${f}`,
          count: itemCount,
          sizeBytes: stat.size,
          updatedAt: stat.mtime,
        });
      } catch (err) {}
    }

    res.json({ success: true, files: result });
  } catch (err) {
    res.json({ success: true, files: [] });
  }
});

// POST /api/ai/test-connection - Test AI provider API connectivity
router.post('/test-connection', async (req, res) => {
  const testResult = await aiService.testConnection(req.body || {});
  res.json(testResult);
});

module.exports = router;
