const express = require('express');
const path = require('path');
const { z } = require('zod');
const config = require('../config');
const logger = require('../logger');
const twitterBot = require('../automation/twitterBot');
const { validateBody, httpError } = require('../utils/http');

const router = express.Router();

const TWEET_URL_RE = /^https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[a-zA-Z0-9_]+\/status\/\d+/i;

const safeMediaPathSchema = z.string().refine((p) => {
  if (!p || typeof p !== 'string') return false;
  const resolvedPath = path.resolve(p);
  const mediaDir = path.resolve(config.DATA_DIR, 'media');
  return resolvedPath.startsWith(mediaDir);
}, 'Path file media harus berada di dalam direktori data/media yang diizinkan.');

const accountIdsSchema = z.union([z.string(), z.array(z.string())]).optional();

const postTaskSchema = z.object({
  accountIds: accountIdsSchema,
  posts: z.union([z.string().min(1), z.array(z.string()).min(1)], {
    message: 'Konten postingan tidak boleh kosong.',
  }),
  delaySeconds: z.number().min(0).max(3600).optional(),
  mediaPaths: z.array(safeMediaPathSchema).max(4).optional(),
});

const batchTaskSchema = z.object({
  accountIds: accountIdsSchema,
  urls: z
    .array(
      z
        .string()
        .refine(
          (url) => TWEET_URL_RE.test(url.trim()),
          'Setiap URL harus merupakan tautan tweet status resmi X/Twitter (misal: https://x.com/user/status/123456).'
        )
    )
    .min(1, 'Daftar URL tweet target tidak boleh kosong.'),
  like: z.boolean().optional(),
  retweet: z.boolean().optional(),
  comment: z.boolean().optional(),
  commentText: z.string().optional(),
  minDelay: z.number().min(0).max(3600).optional(),
  maxDelay: z.number().min(0).max(7200).optional(),
});

const hunterTaskSchema = z.object({
  accountIds: accountIdsSchema,
  keyword: z.string().min(1, 'Kata kunci pencarian tidak boleh kosong.').max(200),
  count: z.number().int().min(1).max(50).optional(),
  like: z.boolean().optional(),
  retweet: z.boolean().optional(),
  comment: z.boolean().optional(),
  commentText: z.string().optional(),
  minDelay: z.number().min(0).max(3600).optional(),
  maxDelay: z.number().min(0).max(7200).optional(),
});

// POST /api/tasks/post - Broadcast / publish new tweets
router.post('/post', validateBody(postTaskSchema), (req, res) => {
  const { accountIds, posts, delaySeconds, mediaPaths } = req.body;

  if (twitterBot.isRunning) {
    throw httpError(400, 'Sebuah proses otomasi sedang berjalan.', 'TASK_RUNNING');
  }

  twitterBot
    .runMultiAccountPostTask(accountIds, posts, {
      delaySeconds,
      mediaPaths: mediaPaths || [],
    })
    .catch((err) => {
      logger.error(`❌ Background post task error: ${err.message}`);
    });

  res.json({
    success: true,
    message: 'Tugas publikasi postingan telah dimulai di latar belakang.',
  });
});

// POST /api/tasks/batch - Run batch engagement
router.post('/batch', validateBody(batchTaskSchema), (req, res) => {
  const {
    accountIds,
    urls,
    like = true,
    retweet = true,
    comment = true,
    commentText,
    minDelay,
    maxDelay,
  } = req.body;

  if (twitterBot.isRunning) {
    throw httpError(400, 'Sebuah proses otomasi sedang berjalan.', 'TASK_RUNNING');
  }

  twitterBot
    .runMultiAccountBatchTask(accountIds, urls, {
      like: Boolean(like),
      retweet: Boolean(retweet),
      comment: Boolean(comment),
      commentText: commentText || null,
      minDelay,
      maxDelay,
    })
    .catch((err) => {
      logger.error(`❌ Background task error: ${err.message}`);
    });

  res.json({
    success: true,
    message: `Tugas batch multi-akun dimulai untuk ${urls.length} postingan.`,
  });
});

// POST /api/tasks/hunter - Run Feed Hunter
router.post('/hunter', validateBody(hunterTaskSchema), (req, res) => {
  const {
    accountIds,
    keyword,
    count = 10,
    like = true,
    retweet = true,
    comment = true,
    commentText,
    minDelay,
    maxDelay,
  } = req.body;

  if (twitterBot.isRunning) {
    throw httpError(400, 'Sebuah proses otomasi sedang berjalan.', 'TASK_RUNNING');
  }

  twitterBot
    .runMultiAccountHunter(accountIds, keyword.trim(), count, {
      like: Boolean(like),
      retweet: Boolean(retweet),
      comment: Boolean(comment),
      commentText: commentText || null,
      minDelay,
      maxDelay,
    })
    .catch((err) => {
      logger.error(`❌ Background hunter error: ${err.message}`);
    });

  res.json({
    success: true,
    message: `Tugas Feed Hunter untuk "${keyword}" dimulai di latar belakang.`,
  });
});

// POST /api/tasks/stop - Stop running task
router.post('/stop', (req, res) => {
  const stopped = twitterBot.stopTask();
  if (stopped) {
    res.json({ success: true, message: 'Sinyal penghentian tugas berhasil dikirim.' });
  } else {
    res.json({ success: false, message: 'Tidak ada tugas yang sedang berjalan.' });
  }
});

module.exports = router;
