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
  logger.action(`[@${account.username || account.label}] Dispatching Like: ${tweetUrl}`);

  try {
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
        .waitForSelector('[data-testid="like"], article [data-testid="like"]', { timeout: 8000 })
        .catch(() => null);
    }

    if (!likeBtn) {
      logger.warn(
        `⚠️ [@${account.username || account.label}] Like button not found on target page.`
      );
      return { success: false, message: 'Like button not found' };
    }

    await likeBtn.scrollIntoViewIfNeeded().catch(() => {});
    await sleep(400);
    await likeBtn.click();
    await sleep(1200);

    // 3. Verify like state
    const isLiked = await page.$('[data-testid="unlike"], article [data-testid="unlike"]');
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
      return { success: false, message: 'Like verification failed' };
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
        .waitForSelector('[data-testid="retweet"], article [data-testid="retweet"]', {
          timeout: 8000,
        })
        .catch(() => null);
    }

    if (!retweetBtn) {
      logger.warn(
        `⚠️ [@${account.username || account.label}] Retweet button not found on target page.`
      );
      return { success: false, message: 'Retweet button not found' };
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
      return { success: false, message: 'Retweet confirmation modal did not appear' };
    }

    await confirmBtn.click();
    await sleep(1500);

    const isRetweeted = await page.$(
      '[data-testid="unretweet"], article [data-testid="unretweet"]'
    );
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
      return { success: false, message: 'Retweet verification failed' };
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
      logger.warn(`⚠️ [@${account.username || account.label}] Reply input field not found.`);
      return { success: false, message: 'Reply input field not accessible' };
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
      return { success: false, message: 'Reply submit button not found' };
    }

    await replyBtn.click();
    await sleep(2000);

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
  likeTweet,
  retweetTweet,
  commentTweet,
  processTweetWithAccount,
};
