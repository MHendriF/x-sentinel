const db = require('../../db');
const logger = require('../../logger');
const spintax = require('../spintax');
const aiService = require('../aiService');
const { sleep, humanType, humanScroll, extractTweetId } = require('./humanCadence');

/**
 * Like a tweet with validation
 */
async function likeTweet(page, tweetUrl, account) {
  const tweetId = extractTweetId(tweetUrl);
  logger.action(`[@${account.username || account.label}] Mencoba Like: ${tweetUrl}`);

  try {
    // 1. Check if already liked
    const unlikeBtn = await page.$(
      '[data-testid="unlike"], article [data-testid="unlike"], button[aria-label*="Liked"], button[aria-label*="Batal Suka"]'
    );
    if (unlikeBtn) {
      logger.info(`ℹ️ [@${account.username || account.label}] Postingan sudah di-Like sebelumnya.`);
      db.addHistory({
        accountId: account.id,
        accountName: account.username || account.label,
        tweetUrl,
        tweetId,
        action: 'LIKE',
        status: 'ALREADY_DONE',
        message: 'Sudah di-like',
      });
      return { success: true, status: 'ALREADY_DONE' };
    }

    // 2. Find Like button (with retry wait)
    let likeBtn = await page.$(
      '[data-testid="like"], article [data-testid="like"], button[aria-label*="Like"], button[aria-label*="Suka"]'
    );
    if (!likeBtn) {
      likeBtn = await page
        .waitForSelector('[data-testid="like"], article [data-testid="like"]', { timeout: 8000 })
        .catch(() => null);
    }

    if (!likeBtn) {
      logger.warn(
        `⚠️ [@${account.username || account.label}] Tombol Like tidak ditemukan pada halaman.`
      );
      return { success: false, message: 'Tombol Like tidak ditemukan' };
    }

    await likeBtn.scrollIntoViewIfNeeded().catch(() => {});
    await sleep(400);
    await likeBtn.click();
    await sleep(1200);

    // 3. Verify like state
    const isLiked = await page.$('[data-testid="unlike"], article [data-testid="unlike"]');
    if (isLiked) {
      logger.success(`❤️ [@${account.username || account.label}] Berhasil Like: ${tweetUrl}`);
      db.addHistory({
        accountId: account.id,
        accountName: account.username || account.label,
        tweetUrl,
        tweetId,
        action: 'LIKE',
        status: 'SUCCESS',
      });
      return { success: true, status: 'SUCCESS' };
    } else {
      return { success: false, message: 'Verifikasi Like gagal' };
    }
  } catch (err) {
    logger.error(`❌ [@${account.username || account.label}] Gagal Like: ${err.message}`);
    db.addHistory({
      accountId: account.id,
      accountName: account.username || account.label,
      tweetUrl,
      tweetId,
      action: 'LIKE',
      status: 'FAILED',
      message: err.message,
    });
    return { success: false, message: err.message };
  }
}

/**
 * Retweet / Repost a tweet
 */
async function retweetTweet(page, tweetUrl, account) {
  const tweetId = extractTweetId(tweetUrl);
  logger.action(`[@${account.username || account.label}] Mencoba Retweet: ${tweetUrl}`);

  try {
    const unretweetBtn = await page.$(
      '[data-testid="unretweet"], article [data-testid="unretweet"], button[aria-label*="Undo Repost"], button[aria-label*="Batal Posting Ulang"]'
    );
    if (unretweetBtn) {
      logger.info(
        `ℹ️ [@${account.username || account.label}] Postingan sudah di-Retweet sebelumnya.`
      );
      db.addHistory({
        accountId: account.id,
        accountName: account.username || account.label,
        tweetUrl,
        tweetId,
        action: 'RETWEET',
        status: 'ALREADY_DONE',
        message: 'Sudah di-retweet',
      });
      return { success: true, status: 'ALREADY_DONE' };
    }

    let retweetBtn = await page.$(
      '[data-testid="retweet"], article [data-testid="retweet"], button[aria-label*="Repost"], button[aria-label*="Posting ulang"]'
    );
    if (!retweetBtn) {
      retweetBtn = await page
        .waitForSelector('[data-testid="retweet"], article [data-testid="retweet"]', {
          timeout: 8000,
        })
        .catch(() => null);
    }

    if (!retweetBtn) {
      logger.warn(
        `⚠️ [@${account.username || account.label}] Tombol Retweet tidak ditemukan pada halaman.`
      );
      return { success: false, message: 'Tombol Retweet tidak ditemukan' };
    }

    await retweetBtn.scrollIntoViewIfNeeded().catch(() => {});
    await sleep(400);
    await retweetBtn.click();
    await sleep(800);

    const confirmBtn = await page
      .waitForSelector(
        '[data-testid="retweetConfirm"], [role="menuitem"][data-testid="retweetConfirm"]',
        { timeout: 5000 }
      )
      .catch(() => null);

    if (!confirmBtn) {
      return { success: false, message: 'Tombol konfirmasi Retweet tidak muncul' };
    }

    await confirmBtn.click();
    await sleep(1500);

    const isRetweeted = await page.$(
      '[data-testid="unretweet"], article [data-testid="unretweet"]'
    );
    if (isRetweeted) {
      logger.success(`🔁 [@${account.username || account.label}] Berhasil Retweet: ${tweetUrl}`);
      db.addHistory({
        accountId: account.id,
        accountName: account.username || account.label,
        tweetUrl,
        tweetId,
        action: 'RETWEET',
        status: 'SUCCESS',
      });
      return { success: true, status: 'SUCCESS' };
    } else {
      return { success: false, message: 'Verifikasi Retweet gagal' };
    }
  } catch (err) {
    logger.error(`❌ [@${account.username || account.label}] Gagal Retweet: ${err.message}`);
    db.addHistory({
      accountId: account.id,
      accountName: account.username || account.label,
      tweetUrl,
      tweetId,
      action: 'RETWEET',
      status: 'FAILED',
      message: err.message,
    });
    return { success: false, message: err.message };
  }
}

/**
 * Comment on Tweet using Account's specific comments, spintax, or AI contextual engine
 */
async function commentTweet(page, tweetUrl, account, customReplyText = null) {
  const tweetId = extractTweetId(tweetUrl);
  logger.action(`[@${account.username || account.label}] Mencoba Comment: ${tweetUrl}`);

  try {
    let replyText = '';
    if (customReplyText && customReplyText.trim()) {
      replyText = spintax.parseSpintax(customReplyText.trim());
    } else {
      const settings = db.getSettings() || {};
      if (settings.aiProvider && settings.aiProvider !== 'none') {
        let tweetText = await page
          .$eval('[data-testid="tweetText"]', (el) => el.innerText)
          .catch(() => '');
        if (!tweetText) {
          tweetText = await page.$eval('article [lang]', (el) => el.innerText).catch(() => '');
        }

        if (tweetText && tweetText.trim()) {
          const aiGenerated = await aiService.generateContextualReply(tweetText.trim(), account);
          if (aiGenerated) {
            replyText = aiGenerated;
          }
        }
      }

      if (!replyText) {
        const accountComments = db.getAccountComments(account.id);
        replyText = spintax.getRandomTemplate(accountComments);
      }
    }

    logger.info(`💬 [@${account.username || account.label}] Komentar: "${replyText}"`);

    let textarea = await page.$(
      '[data-testid="tweetTextarea_0"], article [data-testid="tweetTextarea_0"]'
    );
    if (!textarea) {
      const replyIcon = await page.$('[data-testid="reply"], article [data-testid="reply"]');
      if (replyIcon) {
        await replyIcon.click();
        await sleep(1000);
      }
      textarea = await page
        .waitForSelector('[data-testid="tweetTextarea_0"]', { timeout: 8000 })
        .catch(() => null);
    }

    if (!textarea) {
      logger.warn(`⚠️ [@${account.username || account.label}] Kolom komentar tidak ditemukan.`);
      return { success: false, message: 'Kolom komentar tidak dapat diakses' };
    }

    await textarea.click();
    await sleep(400);

    await humanType(textarea, replyText);
    await sleep(800);

    const replyBtn = await page
      .waitForSelector('[data-testid="tweetButtonInline"], [data-testid="tweetButton"]', {
        timeout: 6000,
      })
      .catch(() => null);
    if (!replyBtn) {
      return { success: false, message: 'Tombol kirim balasan tidak ditemukan' };
    }

    await replyBtn.click();
    await sleep(2000);

    logger.success(
      `💬 [@${account.username || account.label}] Berhasil kirim komentar: "${replyText}"`
    );
    db.addHistory({
      accountId: account.id,
      accountName: account.username || account.label,
      tweetUrl,
      tweetId,
      action: 'COMMENT',
      status: 'SUCCESS',
      details: replyText,
    });
    return { success: true, status: 'SUCCESS', replyText };
  } catch (err) {
    logger.error(`❌ [@${account.username || account.label}] Gagal komentar: ${err.message}`);
    db.addHistory({
      accountId: account.id,
      accountName: account.username || account.label,
      tweetUrl,
      tweetId,
      action: 'COMMENT',
      status: 'FAILED',
      message: err.message,
    });
    return { success: false, message: err.message };
  }
}

/**
 * Process a single tweet URL with a specific account and vector flags
 */
async function processTweetWithAccount(page, tweetUrl, account, options = {}) {
  const { like = true, retweet = true, comment = true, commentText = null } = options;

  logger.info(`🌐 [@${account.username || account.label}] Membuka: ${tweetUrl}`);
  await page.goto(tweetUrl, { waitUntil: 'domcontentloaded' });

  await page
    .waitForSelector(
      '[data-testid="tweet"], article, [data-testid="like"], [data-testid="unlike"]',
      { timeout: 15000 }
    )
    .catch(() => null);
  await page.waitForTimeout(2000);

  if (page.url().includes('/login') || page.url().includes('/i/flow/login')) {
    logger.error(
      `❌ [@${account.username || account.label}] Sesi login kedaluwarsa / dialihkan ke halaman login.`
    );
    db.addHistory({
      accountId: account.id,
      accountName: account.username || account.label,
      tweetUrl,
      action: 'SESSION',
      status: 'FAILED',
      message: 'Sesi login kedaluwarsa',
    });
    return { success: false, message: 'Sesi login kedaluwarsa' };
  }

  if (db.getSettings().scrollBeforeAction) {
    await humanScroll(page);
  }

  const results = { tweetUrl, accountId: account.id };

  if (like) {
    results.like = await likeTweet(page, tweetUrl, account);
    if (retweet || comment) await sleep(2000 + Math.floor(Math.random() * 2000));
  }

  if (retweet) {
    results.retweet = await retweetTweet(page, tweetUrl, account);
    if (comment) await sleep(2500 + Math.floor(Math.random() * 2000));
  }

  if (comment) {
    results.comment = await commentTweet(page, tweetUrl, account, commentText);
  }

  return results;
}

module.exports = {
  likeTweet,
  retweetTweet,
  commentTweet,
  processTweetWithAccount,
};
