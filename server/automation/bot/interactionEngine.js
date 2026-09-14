const db = require('../../db');
const logger = require('../../logger');
const spintax = require('../spintax');
const aiService = require('../aiService');
const { sleep, humanType, humanScroll, extractTweetId } = require('./humanCadence');

/**
 * Dismiss popups, dialog overlays, backdrops, and sheets that may intercept pointer events
 */
async function dismissOverlays(page) {
  try {
    const mask = await page.$('[data-testid="mask"]');
    if (mask) {
      await page.keyboard.press('Escape');
      await sleep(300);
    }
    const closeBtn = await page.$(
      '[data-testid="app-bar-close"], [aria-label="Close"], button[aria-label*="Batal"], button[aria-label*="Cancel"]'
    );
    if (closeBtn) {
      const isVisible = await closeBtn.isVisible().catch(() => false);
      if (isVisible) {
        await closeBtn.click().catch(() => {});
        await sleep(300);
      }
    }
  } catch (e) {
    // ignore
  }
}

/**
 * Click element safely, dismissing intercepting overlays or forcing click if needed
 */
async function safeClick(page, element, options = {}) {
  if (!element) return;
  await element.scrollIntoViewIfNeeded().catch(() => {});
  await sleep(300);
  try {
    await element.click({ timeout: 5000, ...options });
  } catch (err) {
    if (
      err.message.includes('intercepts pointer events') ||
      err.message.includes('Timeout') ||
      err.message.includes('not visible')
    ) {
      await dismissOverlays(page);
      await sleep(300);
      try {
        await element.click({ force: true, timeout: 5000, ...options });
      } catch (forceErr) {
        await page.evaluate((el) => el.click(), element).catch(() => {});
      }
    } else {
      throw err;
    }
  }
}

/**
 * Like a tweet with validation
 */
async function likeTweet(page, tweetUrl, account) {
  const tweetId = extractTweetId(tweetUrl);
  logger.action(`[@${account.username || account.label}] Dispatching Like: ${tweetUrl}`);

  try {
    await dismissOverlays(page);

    // 1. Check if already liked
    const unlikeBtn = await page.$(
      '[data-testid="unlike"], article [data-testid="unlike"], button[aria-label*="Liked"], button[aria-label*="Batal Suka"]'
    );
    if (unlikeBtn) {
      logger.info(`ℹ️ [@${account.username || account.label}] Post already liked previously.`);
      db.addHistory({
        accountId: account.id,
        accountName: account.username || account.label,
        tweetUrl,
        tweetId,
        action: 'LIKE',
        status: 'ALREADY_DONE',
        message: 'Already liked',
      });
      return { success: true, status: 'ALREADY_DONE' };
    }

    // 2. Find Like button (with retry wait)
    let likeBtn = await page.$(
      '[data-testid="like"], article [data-testid="like"], button[aria-label*="Like"], button[aria-label*="Suka"]'
    );
    if (!likeBtn) {
      likeBtn = await page
        .waitForSelector(
          '[data-testid="like"], article [data-testid="like"], button[aria-label*="Like"], button[aria-label*="Suka"]',
          { timeout: 8000 }
        )
        .catch(() => null);
    }

    if (!likeBtn) {
      const msg = 'Like button not found on target page';
      logger.warn(`⚠️ [@${account.username || account.label}] ${msg}.`);
      db.addHistory({
        accountId: account.id,
        accountName: account.username || account.label,
        tweetUrl,
        tweetId,
        action: 'LIKE',
        status: 'FAILED',
        message: msg,
      });
      return { success: false, message: msg };
    }

    await safeClick(page, likeBtn);
    await sleep(800);

    // 3. Verify like state (wait up to 5000ms for network/proxy roundtrip)
    let isLiked = await page
      .waitForSelector(
        '[data-testid="unlike"], article [data-testid="unlike"], button[aria-label*="Liked"], button[aria-label*="Batal Suka"]',
        { timeout: 5000 }
      )
      .catch(() => null);

    if (!isLiked) {
      isLiked = await page.$(
        '[data-testid="unlike"], article [data-testid="unlike"], button[aria-label*="Liked"], button[aria-label*="Batal Suka"]'
      );
    }

    if (isLiked) {
      logger.success(`❤️ [@${account.username || account.label}] Successfully Liked: ${tweetUrl}`);
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
      const msg = 'Like verification failed (status did not change to unlike)';
      logger.warn(`⚠️ [@${account.username || account.label}] ${msg}`);
      db.addHistory({
        accountId: account.id,
        accountName: account.username || account.label,
        tweetUrl,
        tweetId,
        action: 'LIKE',
        status: 'FAILED',
        message: msg,
      });
      return { success: false, message: msg };
    }
  } catch (err) {
    logger.error(`❌ [@${account.username || account.label}] Like failed: ${err.message}`);
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
  logger.action(`[@${account.username || account.label}] Dispatching Retweet: ${tweetUrl}`);

  try {
    await dismissOverlays(page);

    const unretweetBtn = await page.$(
      '[data-testid="unretweet"], article [data-testid="unretweet"], button[aria-label*="Undo Repost"], button[aria-label*="Batal Posting Ulang"]'
    );
    if (unretweetBtn) {
      logger.info(
        `ℹ️ [@${account.username || account.label}] Post already reposted previously.`
      );
      db.addHistory({
        accountId: account.id,
        accountName: account.username || account.label,
        tweetUrl,
        tweetId,
        action: 'RETWEET',
        status: 'ALREADY_DONE',
        message: 'Already reposted',
      });
      return { success: true, status: 'ALREADY_DONE' };
    }

    let retweetBtn = await page.$(
      '[data-testid="retweet"], article [data-testid="retweet"], button[aria-label*="Repost"], button[aria-label*="Posting ulang"]'
    );
    if (!retweetBtn) {
      retweetBtn = await page
        .waitForSelector(
          '[data-testid="retweet"], article [data-testid="retweet"], button[aria-label*="Repost"], button[aria-label*="Posting ulang"]',
          { timeout: 8000 }
        )
        .catch(() => null);
    }

    if (!retweetBtn) {
      const msg = 'Retweet button not found on target page';
      logger.warn(`⚠️ [@${account.username || account.label}] ${msg}.`);
      db.addHistory({
        accountId: account.id,
        accountName: account.username || account.label,
        tweetUrl,
        tweetId,
        action: 'RETWEET',
        status: 'FAILED',
        message: msg,
      });
      return { success: false, message: msg };
    }

    await safeClick(page, retweetBtn);
    await sleep(800);

    const confirmBtn = await page
      .waitForSelector(
        '[data-testid="retweetConfirm"], [role="menuitem"][data-testid="retweetConfirm"]',
        { timeout: 6000 }
      )
      .catch(() => null);

    if (!confirmBtn) {
      const msg = 'Retweet confirmation modal did not appear';
      logger.warn(`⚠️ [@${account.username || account.label}] ${msg}`);
      db.addHistory({
        accountId: account.id,
        accountName: account.username || account.label,
        tweetUrl,
        tweetId,
        action: 'RETWEET',
        status: 'FAILED',
        message: msg,
      });
      return { success: false, message: msg };
    }

    await safeClick(page, confirmBtn);
    await sleep(1000);

    // Dismiss any modal or toast after retweet confirmation
    await dismissOverlays(page);

    let isRetweeted = await page
      .waitForSelector(
        '[data-testid="unretweet"], article [data-testid="unretweet"], button[aria-label*="Undo Repost"], button[aria-label*="Batal Posting Ulang"]',
        { timeout: 5000 }
      )
      .catch(() => null);

    if (!isRetweeted) {
      isRetweeted = await page.$(
        '[data-testid="unretweet"], article [data-testid="unretweet"], button[aria-label*="Undo Repost"], button[aria-label*="Batal Posting Ulang"]'
      );
    }

    if (isRetweeted) {
      logger.success(`🔁 [@${account.username || account.label}] Successfully Retweeted: ${tweetUrl}`);
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
      const msg = 'Retweet verification failed';
      logger.warn(`⚠️ [@${account.username || account.label}] ${msg}`);
      db.addHistory({
        accountId: account.id,
        accountName: account.username || account.label,
        tweetUrl,
        tweetId,
        action: 'RETWEET',
        status: 'FAILED',
        message: msg,
      });
      return { success: false, message: msg };
    }
  } catch (err) {
    logger.error(`❌ [@${account.username || account.label}] Retweet failed: ${err.message}`);
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
  logger.action(`[@${account.username || account.label}] Dispatching Reply: ${tweetUrl}`);

  try {
    await dismissOverlays(page);

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

    logger.info(`💬 [@${account.username || account.label}] Reply payload: "${replyText}"`);

    let textarea = await page.$(
      '[data-testid="tweetTextarea_0"], article [data-testid="tweetTextarea_0"]'
    );
    if (!textarea) {
      const replyIcon = await page.$(
        '[data-testid="reply"], article [data-testid="reply"], button[aria-label*="Reply"], button[aria-label*="Balas"]'
      );
      if (replyIcon) {
        await safeClick(page, replyIcon);
        await sleep(1000);
      }
      textarea = await page
        .waitForSelector('[data-testid="tweetTextarea_0"]', { timeout: 8000 })
        .catch(() => null);
    }

    if (!textarea) {
      const msg = 'Reply input field not accessible';
      logger.warn(`⚠️ [@${account.username || account.label}] ${msg}.`);
      db.addHistory({
        accountId: account.id,
        accountName: account.username || account.label,
        tweetUrl,
        tweetId,
        action: 'COMMENT',
        status: 'FAILED',
        message: msg,
      });
      return { success: false, message: msg };
    }

    await safeClick(page, textarea);
    await sleep(400);

    await humanType(textarea, replyText);
    await sleep(800);

    const replyBtn = await page
      .waitForSelector('[data-testid="tweetButtonInline"], [data-testid="tweetButton"]', {
        timeout: 8000,
      })
      .catch(() => null);
    if (!replyBtn) {
      const msg = 'Reply submit button not found';
      logger.warn(`⚠️ [@${account.username || account.label}] ${msg}.`);
      db.addHistory({
        accountId: account.id,
        accountName: account.username || account.label,
        tweetUrl,
        tweetId,
        action: 'COMMENT',
        status: 'FAILED',
        message: msg,
      });
      return { success: false, message: msg };
    }

    await safeClick(page, replyBtn);
    await sleep(2500);

    // Dismiss any modal/toast after replying
    await dismissOverlays(page);

    logger.success(
      `💬 [@${account.username || account.label}] Reply dispatched successfully: "${replyText}"`
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
    logger.error(`❌ [@${account.username || account.label}] Reply failed: ${err.message}`);
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

  logger.info(`🌐 [@${account.username || account.label}] Navigating to: ${tweetUrl}`);
  let navSuccess = false;
  let lastNavError = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await page.goto(tweetUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
      navSuccess = true;
      break;
    } catch (e) {
      lastNavError = e;
      if (attempt < 2) {
        logger.warn(
          `⚠️ [@${account.username || account.label}] Navigation attempt ${attempt} failed: ${e.message}. Retrying in 3s...`
        );
        await sleep(3000);
      }
    }
  }

  if (!navSuccess) {
    throw new Error(
      `Navigation to tweet failed: ${lastNavError ? lastNavError.message : 'Timeout'}`
    );
  }

  await page
    .waitForSelector(
      '[data-testid="tweet"], article, [data-testid="like"], [data-testid="unlike"]',
      { timeout: 15000 }
    )
    .catch(() => null);
  await sleep(2000);

  // Clean up any initial popups or modal overlays
  await dismissOverlays(page);

  if (page.url().includes('/login') || page.url().includes('/i/flow/login')) {
    logger.error(
      `❌ [@${account.username || account.label}] Login session expired / redirected to login page.`
    );
    db.addHistory({
      accountId: account.id,
      accountName: account.username || account.label,
      tweetUrl,
      action: 'SESSION',
      status: 'FAILED',
      message: 'Login session expired',
    });
    return { success: false, message: 'Login session expired' };
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
  dismissOverlays,
  safeClick,
  likeTweet,
  retweetTweet,
  commentTweet,
  processTweetWithAccount,
};
