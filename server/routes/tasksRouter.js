const express = require('express');
const router = express.Router();
const logger = require('../logger');
const twitterBot = require('../automation/twitterBot');

// POST /api/tasks/post - Broadcast / publish new tweets
router.post('/post', async (req, res) => {
  const { accountIds, posts, delaySeconds, mediaPaths } = req.body;

  if (!posts || (Array.isArray(posts) && posts.length === 0)) {
    return res
      .status(400)
      .json({ success: false, message: 'Konten postingan tidak boleh kosong.' });
  }

  if (twitterBot.isRunning) {
    return res
      .status(400)
      .json({ success: false, message: 'Sebuah proses otomasi sedang berjalan.' });
  }

  twitterBot
    .runMultiAccountPostTask(accountIds, posts, {
      delaySeconds: delaySeconds ? Number(delaySeconds) : undefined,
      mediaPaths: Array.isArray(mediaPaths) ? mediaPaths : [],
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
router.post('/batch', async (req, res) => {
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

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: 'Daftar URL tweet target tidak boleh kosong.' });
  }

  if (twitterBot.isRunning) {
    return res
      .status(400)
      .json({ success: false, message: 'Sebuah proses otomasi sedang berjalan.' });
  }

  twitterBot
    .runMultiAccountBatchTask(accountIds, urls, {
      like: Boolean(like),
      retweet: Boolean(retweet),
      comment: Boolean(comment),
      commentText: commentText || null,
      minDelay: minDelay ? Number(minDelay) : undefined,
      maxDelay: maxDelay ? Number(maxDelay) : undefined,
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
router.post('/hunter', async (req, res) => {
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

  if (!keyword || !keyword.trim()) {
    return res
      .status(400)
      .json({ success: false, message: 'Kata kunci pencarian tidak boleh kosong.' });
  }

  if (twitterBot.isRunning) {
    return res
      .status(400)
      .json({ success: false, message: 'Sebuah proses otomasi sedang berjalan.' });
  }

  twitterBot
    .runMultiAccountHunter(accountIds, keyword.trim(), Number(count), {
      like: Boolean(like),
      retweet: Boolean(retweet),
      comment: Boolean(comment),
      commentText: commentText || null,
      minDelay: minDelay ? Number(minDelay) : undefined,
      maxDelay: maxDelay ? Number(maxDelay) : undefined,
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
