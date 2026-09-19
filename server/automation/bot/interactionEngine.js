const db = require('../../db');
const logger = require('../../logger');
const spintax = require('../spintax');
const aiService = require('../aiService');
const { sleep, humanType, humanScroll, extractTweetId } = require('./humanCadence');

/**
 * Normalizes any X/Twitter tweet URL into canonical https://x.com/i/status/${tweetId}
 * Strips tracking queries (?s=..., &t=...) and lightbox modals (/photo/1, /video/1).
 */
function normalizeTweetUrl(url) {
  if (!url || typeof url !== 'string') return url;
  const tweetId = extractTweetId(url);
  if (tweetId) {
    return `https://x.com/i/status/${tweetId}`;
  }
  return url.trim().replace(/^https?:\/\/(?:www\.)?twitter\.com/i, 'https://x.com');
}

/**
 * Comprehensive overlay and modal dismissal
 */
async function dismissOverlays(page) {
  try {
    // 1. Dismiss mask / backdrop with Escape
    const mask = await page.$('[data-testid="mask"]');
    if (mask) {
      await page.keyboard.press('Escape');
      await sleep(250);
    }

    // 2. Cookie consent / Sheet dialog buttons
    const consentSelectors = [
      '[data-testid="sheetDialog"] button',
      'button:has-text("Refuse non-essential cookies")',
      'button:has-text("Accept all cookies")',
      'button:has-text("Tolak cookie nonesensial")',
      'button:has-text("Terima semua cookie")',
      'button:has-text("Got it")',
      'button:has-text("Mengerti")',
      'button:has-text("Dismiss")',
      'button:has-text("Abaikan")',
    ];
    for (const sel of consentSelectors) {
      const btn = await page.$(sel).catch(() => null);
      if (btn) {
        const isVisible = await btn.isVisible().catch(() => false);
        if (isVisible) {
          await btn.click({ timeout: 2000 }).catch(() => {});
          await sleep(250);
          break;
        }
      }
    }

    // 3. Close button on dialogs / app bars
    const closeBtn = await page
      .$(
        '[data-testid="app-bar-close"], [aria-label="Close"], [aria-label="Tutup"], button[aria-label*="Batal"], button[aria-label*="Cancel"]'
      )
      .catch(() => null);
    if (closeBtn) {
      const isVisible = await closeBtn.isVisible().catch(() => false);
      if (isVisible) {
        await closeBtn.click({ timeout: 2000 }).catch(() => {});
        await sleep(250);
      }
    }
  } catch (e) {
    // ignore
  }
}

/**
 * Handle Twitter interstitial states (Reload/Retry button, sensitive media warnings, deleted/unavailable posts)
 */
async function handlePageInterstitials(page) {
  try {
    // 1. Check for Twitter's "Something went wrong" / Retry button
    const retryBtn = await page
      .$(
        '[data-testid="primaryColumn"] button:has-text("Retry"), button:has-text("Retry"), button:has-text("Coba lagi"), [data-testid="empty_state_button_text"]'
      )
      .catch(() => null);
    if (retryBtn) {
      const isVisible = await retryBtn.isVisible().catch(() => false);
      if (isVisible) {
        logger.info('🔄 Detected "Something went wrong" reload prompt on X. Clicking Retry...');
        await retryBtn.click({ timeout: 3000 }).catch(() => {});
        await sleep(2500);
      }
    }

    // 2. Check for deleted / unavailable tweet text
    const unavailableState = await page
      .evaluate(() => {
        const text = document.body ? document.body.innerText : '';
        const patterns = [
          'This Post is unavailable',
          'Postingan ini tidak tersedia',
          'This Post was deleted',
          'Postingan ini dihapus',
          'You’re unable to view this Post',
          'Anda tidak dapat melihat Postingan ini',
          'This account has been suspended',
          'Akun ini telah ditangguhkan',
        ];
        return patterns.some((p) => text.includes(p));
      })
      .catch(() => false);

    if (unavailableState) {
      return {
        isUnavailable: true,
        message: 'Target post is deleted, unavailable, or account is suspended/private.',
      };
    }

    // 3. Check for sensitive media warning and click "View" / "Show" / "Lihat" / "Tampilkan"
    const sensitiveViewSelectors = [
      'article button:has-text("View")',
      'article button:has-text("Show")',
      'article button:has-text("Lihat")',
      'article button:has-text("Tampilkan")',
      'article [role="button"]:has-text("View")',
      'article [role="button"]:has-text("Show")',
      'article [role="button"]:has-text("Lihat")',
      'article [role="button"]:has-text("Tampilkan")',
      'div[role="button"]:has-text("View")',
      'div[role="button"]:has-text("Show")',
      'div[role="button"]:has-text("Lihat")',
      'div[role="button"]:has-text("Tampilkan")',
      'button:has-text("Lihat")',
      'button:has-text("Tampilkan")',
      '[data-testid="empty_state_button_text"]',
    ].join(', ');

    const sensitiveViewBtn = await page.$(sensitiveViewSelectors).catch(() => null);
    if (sensitiveViewBtn) {
      const isVisible = await sensitiveViewBtn.isVisible().catch(() => false);
      if (isVisible) {
        logger.info('👁️ Clicking sensitive content "View" button to reveal tweet payload...');
        await sensitiveViewBtn.click({ timeout: 2000 }).catch(() => {});
        await sleep(400);
      }
    }
  } catch (e) {
    // ignore
  }
  return { isUnavailable: false };
}

/**
 * Parse an intercepted GraphQL response from X
 */
function parseGraphQLResponse(url, status, json) {
  if (!url || !url.includes('/graphql/')) return null;

  let actionType = null;
  if (url.includes('CreateRetweet')) actionType = 'RETWEET';
  else if (url.includes('DeleteRetweet')) actionType = 'UNRETWEET';
  else if (url.includes('CreateTweet')) actionType = 'TWEET';
  else if (url.includes('FavoriteTweet')) actionType = 'LIKE';
  else if (url.includes('UnfavoriteTweet')) actionType = 'UNLIKE';

  if (!actionType) return null;

  // Check for GraphQL errors
  if (json?.errors && Array.isArray(json.errors) && json.errors.length > 0) {
    const err = json.errors[0];
    const code = err.code || status;
    const message = err.message || 'Unknown GraphQL Error';
    const isAutomated =
      code === 226 ||
      /automated/i.test(message) ||
      /diotomatiskan/i.test(message) ||
      /spam/i.test(message) ||
      /protect our users/i.test(message);
    const isDailyLimit =
      code === 344 ||
      code === 185 ||
      code === 88 ||
      /daily limit/i.test(message) ||
      /batas harian/i.test(message) ||
      /add a phone/i.test(message) ||
      /nomor telepon/i.test(message) ||
      /over daily status update limit/i.test(message) ||
      /sending tweets and messages/i.test(message);
    const isAlreadyDone =
      code === 327 ||
      code === 139 ||
      /already (?:re)?tweeted/i.test(message) ||
      /already favorited/i.test(message);

    return {
      actionType,
      success: false,
      isAutomated,
      isDailyLimit,
      isAlreadyDone,
      code,
      message,
      status,
      raw: json,
    };
  }

  // Check for HTTP error status without structured errors
  if (status >= 400) {
    const isAutomated = status === 403;
    const isDailyLimit = status === 429;
    return {
      actionType,
      success: false,
      isAutomated,
      isDailyLimit,
      code: status,
      message: `HTTP ${status}`,
      status,
      raw: json,
    };
  }

  // Check for GraphQL success data
  if (json?.data) {
    let restId = null;
    if (actionType === 'RETWEET') {
      restId = json.data?.create_retweet?.retweet_results?.result?.rest_id;
    } else if (actionType === 'TWEET') {
      restId =
        json.data?.create_tweet?.tweet_results?.result?.rest_id ||
        json.data?.create_tweet?.tweet_results?.result?.legacy?.id_str;
    }

    return {
      actionType,
      success: true,
      restId,
      status,
      raw: json,
    };
  }

  return null;
}

/**
 * Inspect page for toast alerts, error banners, or anti-automation warnings
 */
async function checkToastAlert(page) {
  if (!page || typeof page.evaluate !== 'function') return null;
  return await page
    .evaluate(() => {
      const selectors = [
        '[data-testid="toast"]',
        'div[role="alert"]',
        '[data-testid="error-detail"]',
        '#layers [role="status"]',
        '#layers [role="dialog"]',
        '[data-testid="sheetDialog"]',
        'div[role="dialog"][aria-modal="true"]',
      ];
      for (const sel of selectors) {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
          const text = (el.innerText || el.textContent || '').trim();
          if (text) {
            const lower = text.toLowerCase();
            const isAutomated =
              lower.includes('automated') ||
              lower.includes('otomatiskan') ||
              lower.includes('diotomatiskan') ||
              lower.includes('spam and other malicious') ||
              lower.includes('protect our users');
            const isDailyLimit =
              lower.includes('daily limit') ||
              lower.includes('batas harian') ||
              lower.includes('add a phone') ||
              lower.includes('nomor telepon') ||
              lower.includes('sending tweets and messages') ||
              lower.includes('try again later');
            return {
              text,
              isAutomated,
              isDailyLimit,
              isError:
                isAutomated ||
                isDailyLimit ||
                lower.includes('wrong') ||
                lower.includes('error') ||
                lower.includes('gagal') ||
                lower.includes('kesalahan') ||
                lower.includes('cannot') ||
                lower.includes('tidak dapat'),
            };
          }
        }
      }
      return null;
    })
    .catch(() => null);
}

/**
 * Create an action tracker that monitors GraphQL network responses
 */
function createActionTracker(page, targetAction) {
  let captured = null;

  if (!page || typeof page.on !== 'function') {
    return {
      cleanup: () => {},
      getResult: () => null,
      waitForResult: async () => null,
    };
  }

  const responseHandler = async (response) => {
    try {
      const url = typeof response?.url === 'function' ? response.url() : '';
      if (!url || !url.includes('/graphql/')) return;

      const status = typeof response.status === 'function' ? response.status() : 200;
      const json = await response.json().catch(() => null);

      const parsed = parseGraphQLResponse(url, status, json);
      if (parsed) {
        if (
          !targetAction ||
          parsed.actionType === targetAction ||
          (targetAction === 'REPLY' && parsed.actionType === 'TWEET')
        ) {
          captured = parsed;
        }
      }
    } catch (e) {
      // ignore interceptor errors
    }
  };

  page.on('response', responseHandler);

  return {
    cleanup: () => {
      try {
        if (typeof page.off === 'function') {
          page.off('response', responseHandler);
        } else if (typeof page.removeListener === 'function') {
          page.removeListener('response', responseHandler);
        }
      } catch (e) {}
    },
    getResult: () => captured,
    waitForResult: async (timeoutMs = 6000) => {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        if (captured) return captured;
        await sleep(200);
      }
      return captured;
    },
  };
}

/**
 * Locate the primary or target tweet article container on page
 */
async function findTargetTweetArticle(page, tweetId) {
  let targetArticle = null;

  if (tweetId) {
    targetArticle = await page.$(`article:has(a[href*="${tweetId}"])`).catch(() => null);
    if (!targetArticle) {
      targetArticle = await page
        .$(`[data-testid="tweet"]:has(a[href*="${tweetId}"])`)
        .catch(() => null);
    }
  }

  if (!targetArticle) {
    targetArticle = await page
      .$('[data-testid="primaryColumn"] article[data-testid="tweet"]')
      .catch(() => null);
  }
  if (!targetArticle) {
    targetArticle = await page.$('article[data-testid="tweet"]').catch(() => null);
  }
  if (!targetArticle) {
    targetArticle = await page.$('article').catch(() => null);
  }

  if (targetArticle) {
    await targetArticle.scrollIntoViewIfNeeded().catch(() => {});
    await sleep(250);
  }

  return targetArticle;
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
      err.message.includes('not visible') ||
      err.message.includes('not attached') ||
      err.message.includes('Element is not attached')
    ) {
      await dismissOverlays(page);
      await sleep(300);
      try {
        await element.click({ force: true, timeout: 5000, ...options });
      } catch (forceErr) {
        try {
          await page.evaluate((el) => el && el.click(), element).catch(() => {});
        } catch (_) {}
      }
    } else {
      throw err;
    }
  }
}

// ---------------------------------------------------------
// LIKE VECTOR ENGINE
// ---------------------------------------------------------

const UNLIKE_SELECTOR_STR = [
  '[data-testid="unlike"]',
  '[role="button"][data-testid="unlike"]',
  'button[data-testid="unlike"]',
  '[role="button"][aria-label*="unlike" i]',
  'button[aria-label*="unlike" i]',
  '[role="button"][aria-label*="liked" i]',
  'button[aria-label*="liked" i]',
  '[role="button"][aria-label*="batal suka" i]',
  'button[aria-label*="batal suka" i]',
  '[role="button"][aria-label*="disukai" i]',
  'button[aria-label*="disukai" i]',
  '[role="button"][aria-label*="batal menyukai" i]',
  'button[aria-label*="batal menyukai" i]',
  '[role="button"][aria-label*="ya no me gusta" i]',
  '[role="button"][aria-label*="je n\'aime plus" i]',
  '[role="button"][aria-label*="descurtir" i]',
].join(', ');

const LIKE_SELECTOR_STR = [
  '[data-testid="like"]',
  '[role="button"][data-testid="like"]',
  'button[data-testid="like"]',
  '[role="button"][aria-label*="like" i]:not([aria-label*="unlike" i]):not([aria-label*="liked" i])',
  'button[aria-label*="like" i]:not([aria-label*="unlike" i]):not([aria-label*="liked" i])',
  '[role="button"][aria-label*="suka" i]:not([aria-label*="batal" i]):not([aria-label*="disukai" i]):not([aria-label*="tidak" i])',
  'button[aria-label*="suka" i]:not([aria-label*="batal" i]):not([aria-label*="disukai" i]):not([aria-label*="tidak" i])',
  '[aria-label*="menyukai" i]:not([aria-label*="batal" i])',
  '[aria-label*="sukai" i]:not([aria-label*="batal" i])',
  '[aria-label*="me gusta" i]:not([aria-label*="ya no" i])',
  '[aria-label*="curtir" i]:not([aria-label*="descurtir" i])',
].join(', ');

/**
 * Check if the tweet is already liked (via testid, aria-labels, or SVG heart color)
 */
async function checkAlreadyLiked(targetArticle, page) {
  if (targetArticle) {
    const unlikeEl = await targetArticle.$(UNLIKE_SELECTOR_STR).catch(() => null);
    if (unlikeEl) return unlikeEl;

    const likedHeartInArticle = await targetArticle
      .evaluate((art) => {
        const group = art.querySelector('div[role="group"]');
        if (!group) return false;
        const svgs = group.querySelectorAll('svg');
        for (const svg of svgs) {
          const fill = (window.getComputedStyle(svg).fill || '').toLowerCase();
          const color = (window.getComputedStyle(svg).color || '').toLowerCase();
          if (
            fill.includes('249, 24, 128') ||
            color.includes('249, 24, 128') ||
            fill.includes('#f91880') ||
            color.includes('#f91880')
          ) {
            return true;
          }
        }
        return false;
      })
      .catch(() => false);

    if (likedHeartInArticle) return targetArticle;
  }

  const globalUnlike = await page.$(UNLIKE_SELECTOR_STR).catch(() => null);
  if (globalUnlike) return globalUnlike;

  return null;
}

/**
 * Structural group inspection for Like button
 */
async function findLikeInGroup(container) {
  if (!container) return null;
  const group = await container.$('div[role="group"]').catch(() => null);
  if (!group) return null;

  const buttons = await group.$$('button, [role="button"]').catch(() => []);
  if (!buttons || buttons.length === 0) return null;

  for (const btn of buttons) {
    const isLikeOrHeart = await btn
      .evaluate((el) => {
        const testid = el.getAttribute('data-testid') || '';
        const aria = (el.getAttribute('aria-label') || '').toLowerCase();
        if (
          testid === 'like' ||
          (!testid.includes('unlike') &&
            aria.includes('like') &&
            !aria.includes('unlike') &&
            !aria.includes('liked'))
        ) {
          return true;
        }
        const svgs = el.querySelectorAll('svg');
        for (const svg of svgs) {
          const paths = svg.querySelectorAll('path');
          for (const p of paths) {
            const d = p.getAttribute('d') || '';
            if (
              d.includes('16.697') ||
              d.includes('20.884') ||
              d.includes('21.35') ||
              d.includes('12 4.24')
            ) {
              return true;
            }
          }
        }
        return false;
      })
      .catch(() => false);

    if (isLikeOrHeart) return btn;
  }

  // If group has 3+ action items, convention is 0: Reply, 1: Retweet, 2: Like
  if (buttons.length >= 3) {
    const isCandidate = await buttons[2]
      .evaluate((el) => {
        const testid = (el.getAttribute('data-testid') || '').toLowerCase();
        return !testid.includes('reply') && !testid.includes('retweet');
      })
      .catch(() => false);
    if (isCandidate) return buttons[2];
  }

  return null;
}

/**
 * Find Like button in target article or fallback to page
 */
async function findLikeButton(targetArticle, page) {
  if (targetArticle) {
    const btn = await targetArticle.$(LIKE_SELECTOR_STR).catch(() => null);
    if (btn) return btn;

    const groupBtn = await findLikeInGroup(targetArticle);
    if (groupBtn) return groupBtn;
  }

  const pageBtn = await page.$(LIKE_SELECTOR_STR).catch(() => null);
  if (pageBtn) return pageBtn;

  const pageGroupBtn = await findLikeInGroup(page);
  if (pageGroupBtn) return pageGroupBtn;

  return null;
}

/**
 * Like a tweet with multi-layer validation
 */
async function likeTweet(page, tweetUrl, account, abortSignal = null, options = {}) {
  if (abortSignal?.aborted) throw new Error('TASK_ABORTED');
  const tweetId = extractTweetId(tweetUrl);
  const engineTag = options.engine ? ` [Engine: ${options.engine.toUpperCase()}]` : '';
  logger.action(`[@${account.username || account.label}]${engineTag} Dispatching Like: ${tweetUrl}`);

  try {
    await dismissOverlays(page);
    await handlePageInterstitials(page);
    if (abortSignal?.aborted) throw new Error('TASK_ABORTED');

    let targetArticle = await findTargetTweetArticle(page, tweetId);
    let likeBtn = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      if (abortSignal?.aborted) throw new Error('TASK_ABORTED');
      const alreadyLiked = await checkAlreadyLiked(targetArticle, page);
      if (alreadyLiked) {
        logger.info(`ℹ️ [@${account.username || account.label}] Post already liked previously.`);
        db.addHistory({
          accountId: account.id,
          accountName: account.username || account.label,
          tweetUrl,
          tweetId,
          action: 'LIKE',
          status: 'ALREADY_DONE',
          message: 'Already liked',
          engine: options.engine,
        });
        return { success: true, status: 'ALREADY_DONE' };
      }

      likeBtn = await findLikeButton(targetArticle, page);
      if (likeBtn) break;

      if (attempt < 3) {
        if (abortSignal?.aborted) throw new Error('TASK_ABORTED');
        await page.evaluate(() => window.scrollBy(0, 200)).catch(() => {});
        await sleep(800, abortSignal);
        await dismissOverlays(page);
        targetArticle = await findTargetTweetArticle(page, tweetId);
      }
    }

    if (!likeBtn) {
      const { isUnavailable, message: unavailMsg } = await handlePageInterstitials(page);
      if (isUnavailable) {
        logger.warn(`⚠️ [@${account.username || account.label}] ${unavailMsg}`);
        db.addHistory({
          accountId: account.id,
          accountName: account.username || account.label,
          tweetUrl,
          tweetId,
          action: 'LIKE',
          status: 'FAILED',
          message: unavailMsg,
          engine: options.engine,
        });
        return { success: false, status: 'UNAVAILABLE', message: unavailMsg };
      }

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
        engine: options.engine,
      });
      return { success: false, message: msg };
    }

    const tracker = createActionTracker(page, 'LIKE');

    try {
      if (abortSignal?.aborted) throw new Error('TASK_ABORTED');
      await safeClick(page, likeBtn);

      let isLiked = false;
      let failureReason = null;
      let isAutomatedBlock = false;
      let isDailyLimitBlock = false;
      let errorCode = null;

      const startTime = Date.now();
      while (Date.now() - startTime < 6000) {
        if (abortSignal?.aborted) throw new Error('TASK_ABORTED');
        // 1. Check API response
        const apiRes = tracker.getResult();
        if (apiRes) {
          if (apiRes.success) {
            isLiked = true;
            break;
          } else if (apiRes.isAlreadyDone) {
            logger.info(
              `ℹ️ [@${account.username || account.label}] Post already liked previously.`
            );
            db.addHistory({
              accountId: account.id,
              accountName: account.username || account.label,
              tweetUrl,
              tweetId,
              action: 'LIKE',
              status: 'ALREADY_DONE',
              message: 'Already liked',
              engine: options.engine,
            });
            return { success: true, status: 'ALREADY_DONE' };
          } else {
            failureReason = apiRes.message || 'Like rejected by X API';
            isAutomatedBlock = Boolean(apiRes.isAutomated);
            isDailyLimitBlock = Boolean(apiRes.isDailyLimit);
            errorCode = apiRes.code;
            break;
          }
        }

        // 2. Check toast
        const toast = await checkToastAlert(page);
        if (toast && toast.isError) {
          failureReason = toast.text;
          isAutomatedBlock = Boolean(toast.isAutomated);
          isDailyLimitBlock = Boolean(toast.isDailyLimit);
          break;
        }

        // 3. Check DOM button state
        const verified = await checkAlreadyLiked(targetArticle, page);
        if (verified) {
          isLiked = true;
          break;
        }
        await sleep(400, abortSignal);
      }

      if (isLiked) {
        logger.success(
          `❤️ [@${account.username || account.label}] Successfully Liked: ${tweetUrl}`
        );
        db.addHistory({
          accountId: account.id,
          accountName: account.username || account.label,
          tweetUrl,
          tweetId,
          action: 'LIKE',
          status: 'SUCCESS',
          engine: options.engine,
        });
        return { success: true, status: 'SUCCESS' };
      } else {
        const errorMsg =
          failureReason || 'Like verification failed (status did not change to unlike)';
        if (isAutomatedBlock || /automated/i.test(errorMsg) || /otomatis/i.test(errorMsg)) {
          logger.error(
            `🛡️ [@${account.username || account.label}] Like BLOCKED by X Anti-Automation: "${errorMsg}" (Code: ${errorCode || 226})`
          );
          db.addHistory({
            accountId: account.id,
            accountName: account.username || account.label,
            tweetUrl,
            tweetId,
            action: 'LIKE',
            status: 'FAILED',
            message: `Anti-Automation Block (${errorCode || 226}): ${errorMsg}`,
            engine: options.engine,
          });
          return {
            success: false,
            status: 'AUTOMATED_FLAG',
            code: errorCode || 226,
            message: errorMsg,
          };
        }

        if (
          isDailyLimitBlock ||
          /daily limit/i.test(errorMsg) ||
          /batas harian/i.test(errorMsg) ||
          /add a phone/i.test(errorMsg) ||
          /nomor telepon/i.test(errorMsg) ||
          errorCode === 344 ||
          errorCode === 185
        ) {
          logger.error(
            `🛑 [@${account.username || account.label}] Like BLOCKED by X Daily Limit / Phone Required: "${errorMsg}" (Code: ${errorCode || 344})`
          );
          db.addHistory({
            accountId: account.id,
            accountName: account.username || account.label,
            tweetUrl,
            tweetId,
            action: 'LIKE',
            status: 'FAILED',
            message: `Daily Limit Reached / Phone Required (${errorCode || 344}): ${errorMsg}`,
            engine: options.engine,
          });
          return {
            success: false,
            status: 'DAILY_LIMIT_EXCEEDED',
            code: errorCode || 344,
            message: errorMsg,
          };
        }

        logger.warn(`⚠️ [@${account.username || account.label}] ${errorMsg}`);
        db.addHistory({
          accountId: account.id,
          accountName: account.username || account.label,
          tweetUrl,
          tweetId,
          action: 'LIKE',
          status: 'FAILED',
          message: errorMsg,
          engine: options.engine,
        });
        return { success: false, message: errorMsg };
      }
    } finally {
      tracker.cleanup();
    }
  } catch (err) {
    if (err.message === 'TASK_ABORTED' || abortSignal?.aborted) {
      throw new Error('TASK_ABORTED');
    }
    logger.error(`❌ [@${account.username || account.label}] Like failed: ${err.message}`);
    db.addHistory({
      accountId: account.id,
      accountName: account.username || account.label,
      tweetUrl,
      tweetId,
      action: 'LIKE',
      status: 'FAILED',
      message: err.message,
      engine: options.engine,
    });
    return { success: false, message: err.message };
  }
}

// ---------------------------------------------------------
// RETWEET / REPOST VECTOR ENGINE
// ---------------------------------------------------------

const UNRETWEET_SELECTOR_STR = [
  '[data-testid="unretweet"]',
  '[role="button"][data-testid="unretweet"]',
  'button[data-testid="unretweet"]',
  '[role="button"][aria-label*="undo repost" i]',
  'button[aria-label*="undo repost" i]',
  '[role="button"][aria-label*="undo retweet" i]',
  'button[aria-label*="undo retweet" i]',
  '[role="button"][aria-label*="reposted" i]',
  'button[aria-label*="reposted" i]',
  '[role="button"][aria-label*="retweeted" i]',
  'button[aria-label*="retweeted" i]',
  '[role="button"][aria-label*="batal posting ulang" i]',
  'button[aria-label*="batal posting ulang" i]',
  '[role="button"][aria-label*="batalkan posting ulang" i]',
  'button[aria-label*="batalkan posting ulang" i]',
  '[role="button"][aria-label*="urungkan posting ulang" i]',
  'button[aria-label*="urungkan posting ulang" i]',
  '[role="button"][aria-label*="diposting ulang" i]',
  'button[aria-label*="diposting ulang" i]',
  '[role="button"][aria-label*="unretweet" i]',
  'button[aria-label*="unretweet" i]',
].join(', ');

const RETWEET_SELECTOR_STR = [
  '[data-testid="retweet"]',
  '[role="button"][data-testid="retweet"]',
  'button[data-testid="retweet"]',
  '[role="button"][aria-label*="repost" i]:not([aria-label*="undo" i]):not([aria-label*="reposted" i])',
  'button[aria-label*="repost" i]:not([aria-label*="undo" i]):not([aria-label*="reposted" i])',
  '[role="button"][aria-label*="retweet" i]:not([aria-label*="undo" i]):not([aria-label*="retweeted" i])',
  'button[aria-label*="retweet" i]:not([aria-label*="undo" i]):not([aria-label*="retweeted" i])',
  '[role="button"][aria-label*="posting ulang" i]:not([aria-label*="batal" i]):not([aria-label*="urung" i]):not([aria-label*="diposting" i])',
  'button[aria-label*="posting ulang" i]:not([aria-label*="batal" i]):not([aria-label*="urung" i]):not([aria-label*="diposting" i])',
].join(', ');

const CONFIRM_RETWEET_SELECTORS = [
  '[data-testid="retweetConfirm"]',
  '[role="menuitem"][data-testid="retweetConfirm"]',
  '[data-testid="Dropdown"] [data-testid="retweetConfirm"]',
  'div[role="menu"] [data-testid="retweetConfirm"]',
].join(', ');

/**
 * Resiliently click the Repost confirmation option from the X dropdown/popover.
 * Specifically targets data-testid="retweetConfirm" and strictly skips data-testid="quote".
 * Immune to React DOM detachment / stale ElementHandle errors.
 */
async function clickRetweetConfirmOption(page, abortSignal = null, maxTimeoutMs = 5000) {
  const startTime = Date.now();

  while (Date.now() - startTime < maxTimeoutMs) {
    if (abortSignal?.aborted) throw new Error('TASK_ABORTED');

    // 1. Try Playwright locator click if available (auto-re-resolves detached DOM nodes)
    try {
      if (typeof page.locator === 'function') {
        const confirmLoc = page.locator(CONFIRM_RETWEET_SELECTORS).first();
        const isVisible = await confirmLoc.isVisible().catch(() => false);
        if (isVisible) {
          await confirmLoc.click({ timeout: 2000 });
          return true;
        }
      }
    } catch (_) {
      // ignore locator detachment/timeout and proceed to next layer
    }

    // 2. Direct page.click with selector (auto-resolves fresh element in Playwright)
    try {
      await page.click(CONFIRM_RETWEET_SELECTORS, { timeout: 1000 });
      return true;
    } catch (_) {}

    // 3. Fallback: inspect open menu/dropdown for menuitem text (explicitly skipping quote)
    try {
      const confirmedInMenu = await page
        .evaluate(() => {
          const menus = document.querySelectorAll(
            '[data-testid="Dropdown"], div[role="menu"], #layers [role="menu"]'
          );
          for (const menu of menus) {
            const items = menu.querySelectorAll(
              '[role="menuitem"], div[role="button"], div[tabindex="0"]'
            );
            for (const item of items) {
              const testid = (item.getAttribute('data-testid') || '').toLowerCase();
              if (testid === 'quote') continue; // Explicitly avoid quote tweet

              const text = (item.innerText || item.textContent || '').trim().toLowerCase();
              if (
                testid === 'retweetconfirm' ||
                text === 'repost' ||
                text === 'posting ulang' ||
                text === 'retweet' ||
                text.startsWith('repost') ||
                text.startsWith('posting ulang')
              ) {
                item.click();
                return true;
              }
            }
          }
          return false;
        })
        .catch(() => false);

      if (confirmedInMenu) {
        return true;
      }
    } catch (_) {}

    await sleep(250, abortSignal);
  }

  return false;
}

/**
 * Check if the tweet is already retweeted (via testid, aria, or green color)
 */
async function checkAlreadyRetweeted(targetArticle, page) {
  if (targetArticle) {
    const unretweetEl = await targetArticle.$(UNRETWEET_SELECTOR_STR).catch(() => null);
    if (unretweetEl) return unretweetEl;

    // Check for green retweet icon (Twitter uses rgb(0, 186, 124) #00ba7c)
    const retweetGreenInArticle = await targetArticle
      .evaluate((art) => {
        const group = art.querySelector('div[role="group"]');
        if (!group) return false;
        const svgs = group.querySelectorAll('svg');
        for (const svg of svgs) {
          const fill = (window.getComputedStyle(svg).fill || '').toLowerCase();
          const color = (window.getComputedStyle(svg).color || '').toLowerCase();
          if (
            fill.includes('0, 186, 124') ||
            color.includes('0, 186, 124') ||
            fill.includes('#00ba7c') ||
            color.includes('#00ba7c')
          ) {
            return true;
          }
        }
        return false;
      })
      .catch(() => false);

    if (retweetGreenInArticle) return targetArticle;
  }

  const globalUnretweet = await page.$(UNRETWEET_SELECTOR_STR).catch(() => null);
  if (globalUnretweet) return globalUnretweet;

  return null;
}

/**
 * Structural group inspection for Retweet button
 */
async function findRetweetInGroup(container) {
  if (!container) return null;
  const group = await container.$('div[role="group"]').catch(() => null);
  if (!group) return null;

  const buttons = await group.$$('button, [role="button"]').catch(() => []);
  if (!buttons || buttons.length === 0) return null;

  for (const btn of buttons) {
    const isRetweet = await btn
      .evaluate((el) => {
        const testid = (el.getAttribute('data-testid') || '').toLowerCase();
        const aria = (el.getAttribute('aria-label') || '').toLowerCase();
        if (
          testid === 'retweet' ||
          (aria.includes('repost') && !aria.includes('undo') && !aria.includes('reposted')) ||
          (aria.includes('posting ulang') && !aria.includes('batal') && !aria.includes('diposting'))
        ) {
          return true;
        }
        const svgs = el.querySelectorAll('svg');
        for (const svg of svgs) {
          const paths = svg.querySelectorAll('path');
          for (const p of paths) {
            const d = p.getAttribute('d') || '';
            if (
              d.includes('4.5 3.88') ||
              d.includes('4.432') ||
              d.includes('2.068') ||
              d.includes('16.5 6') ||
              d.includes('2.209')
            ) {
              return true;
            }
          }
        }
        return false;
      })
      .catch(() => false);

    if (isRetweet) return btn;
  }

  // Convention: 2nd button (index 1) in action group is Retweet
  if (buttons.length >= 2) {
    const isCandidate = await buttons[1]
      .evaluate((el) => {
        const testid = (el.getAttribute('data-testid') || '').toLowerCase();
        return !testid.includes('reply') && !testid.includes('like');
      })
      .catch(() => false);
    if (isCandidate) return buttons[1];
  }

  return null;
}

/**
 * Find Retweet button in target article or fallback to page
 */
async function findRetweetButton(targetArticle, page) {
  if (targetArticle) {
    const btn = await targetArticle.$(RETWEET_SELECTOR_STR).catch(() => null);
    if (btn) return btn;

    const groupBtn = await findRetweetInGroup(targetArticle);
    if (groupBtn) return groupBtn;
  }

  const pageBtn = await page.$(RETWEET_SELECTOR_STR).catch(() => null);
  if (pageBtn) return pageBtn;

  const pageGroupBtn = await findRetweetInGroup(page);
  if (pageGroupBtn) return pageGroupBtn;

  return null;
}

/**
 * Retweet / Repost a tweet
 */
async function retweetTweet(page, tweetUrl, account, abortSignal = null, options = {}) {
  if (abortSignal?.aborted) throw new Error('TASK_ABORTED');
  const tweetId = extractTweetId(tweetUrl);
  const engineTag = options.engine ? ` [Engine: ${options.engine.toUpperCase()}]` : '';
  logger.action(`[@${account.username || account.label}]${engineTag} Dispatching Retweet: ${tweetUrl}`);

  try {
    await dismissOverlays(page);
    await handlePageInterstitials(page);
    if (abortSignal?.aborted) throw new Error('TASK_ABORTED');

    let targetArticle = await findTargetTweetArticle(page, tweetId);
    let retweetBtn = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      if (abortSignal?.aborted) throw new Error('TASK_ABORTED');
      const unretweetBtn = await checkAlreadyRetweeted(targetArticle, page);
      if (unretweetBtn) {
        logger.info(`ℹ️ [@${account.username || account.label}] Post already reposted previously.`);
        db.addHistory({
          accountId: account.id,
          accountName: account.username || account.label,
          tweetUrl,
          tweetId,
          action: 'RETWEET',
          status: 'ALREADY_DONE',
          message: 'Already reposted',
          engine: options.engine,
        });
        return { success: true, status: 'ALREADY_DONE' };
      }

      retweetBtn = await findRetweetButton(targetArticle, page);
      if (retweetBtn) break;

      if (attempt < 3) {
        if (abortSignal?.aborted) throw new Error('TASK_ABORTED');
        if (targetArticle) {
          const actionGroup = await targetArticle.$('div[role="group"]').catch(() => null);
          if (actionGroup) {
            await actionGroup.scrollIntoViewIfNeeded().catch(() => {});
          } else {
            await targetArticle.scrollIntoViewIfNeeded().catch(() => {});
          }
        } else {
          await page.evaluate(() => window.scrollBy(0, 200)).catch(() => {});
        }
        await sleep(800, abortSignal);
        await handlePageInterstitials(page);
        await dismissOverlays(page);
        targetArticle = await findTargetTweetArticle(page, tweetId);
      }
    }

    if (!retweetBtn) {
      const isRetweetDisabled = await page
        .evaluate(() => {
          const btn = document.querySelector('[data-testid="retweet"]');
          if (btn && btn.getAttribute('aria-disabled') === 'true') return true;
          const text = document.body ? document.body.innerText : '';
          return (
            text.includes("You can't Repost") || text.includes('Anda tidak dapat memposting ulang')
          );
        })
        .catch(() => false);

      if (isRetweetDisabled) {
        const msg = 'Author has disabled reposts on this post.';
        logger.warn(`⚠️ [@${account.username || account.label}] ${msg}`);
        db.addHistory({
          accountId: account.id,
          accountName: account.username || account.label,
          tweetUrl,
          tweetId,
          action: 'RETWEET',
          status: 'FAILED',
          message: msg,
          engine: options.engine,
        });
        return { success: false, status: 'RESTRICTED', message: msg };
      }

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
        engine: options.engine,
      });
      return { success: false, message: msg };
    }

    const tracker = createActionTracker(page, 'RETWEET');

    try {
      if (abortSignal?.aborted) throw new Error('TASK_ABORTED');
      await safeClick(page, retweetBtn);
      await sleep(500, abortSignal);

      // Verify if dropdown/popover menu appeared, retry click if swallowed
      const isMenuOpen = await page
        .evaluate(() => {
          return !!(
            document.querySelector('[data-testid="retweetConfirm"]') ||
            document.querySelector('[data-testid="Dropdown"]') ||
            document.querySelector('div[role="menu"]')
          );
        })
        .catch(() => false);

      if (!isMenuOpen) {
        const freshRetweetBtn = await findRetweetButton(targetArticle, page);
        if (freshRetweetBtn) {
          await safeClick(page, freshRetweetBtn);
          await sleep(500, abortSignal);
        }
      }

      // Resilient confirmation click: handles dropdown animation and ensures Repost (not Quote) is selected
      const confirmed = await clickRetweetConfirmOption(page, abortSignal, 4500);

      if (!confirmed) {
        const alreadyActive = await checkAlreadyRetweeted(targetArticle, page);
        if (alreadyActive) {
          logger.info(`ℹ️ [@${account.username || account.label}] Post confirmed already reposted.`);
          db.addHistory({
            accountId: account.id,
            accountName: account.username || account.label,
            tweetUrl,
            tweetId,
            action: 'RETWEET',
            status: 'ALREADY_DONE',
            message: 'Already reposted',
            engine: options.engine,
          });
          return { success: true, status: 'ALREADY_DONE' };
        }

        const msg = 'Retweet confirmation modal not found';
        logger.warn(`⚠️ [@${account.username || account.label}] ${msg}.`);
        db.addHistory({
          accountId: account.id,
          accountName: account.username || account.label,
          tweetUrl,
          tweetId,
          action: 'RETWEET',
          status: 'FAILED',
          message: msg,
          engine: options.engine,
        });
        return { success: false, message: msg };
      }

      let isRetweeted = false;
      let failureReason = null;
      let isAutomatedBlock = false;
      let isDailyLimitBlock = false;
      let errorCode = null;

      const startTime = Date.now();
      while (Date.now() - startTime < 6000) {
        if (abortSignal?.aborted) throw new Error('TASK_ABORTED');
        // 1. Check API response
        const apiRes = tracker.getResult();
        if (apiRes) {
          if (apiRes.success) {
            isRetweeted = true;
            break;
          } else if (apiRes.isAlreadyDone) {
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
              message: apiRes.message || 'Already reposted',
              engine: options.engine,
            });
            return { success: true, status: 'ALREADY_DONE' };
          } else {
            failureReason = apiRes.message || 'Retweet rejected by X API';
            isAutomatedBlock = Boolean(apiRes.isAutomated);
            isDailyLimitBlock = Boolean(apiRes.isDailyLimit);
            errorCode = apiRes.code;
            break;
          }
        }

        // 2. Check UI Toast alert for instant error notification
        const toast = await checkToastAlert(page);
        if (toast && toast.isError) {
          failureReason = toast.text;
          isAutomatedBlock = Boolean(toast.isAutomated);
          isDailyLimitBlock = Boolean(toast.isDailyLimit);
          break;
        }

        // 3. Check DOM for button state change
        const verified = await checkAlreadyRetweeted(targetArticle, page);
        if (verified) {
          isRetweeted = true;
          break;
        }

        await sleep(400, abortSignal);
      }

      await dismissOverlays(page);

      if (isRetweeted) {
        logger.success(
          `🔁 [@${account.username || account.label}] Successfully Retweeted: ${tweetUrl}`
        );
        db.addHistory({
          accountId: account.id,
          accountName: account.username || account.label,
          tweetUrl,
          tweetId,
          action: 'RETWEET',
          status: 'SUCCESS',
          engine: options.engine,
        });
        return { success: true, status: 'SUCCESS' };
      } else {
        const errorMsg =
          failureReason || 'Retweet verification failed (no state change or API confirmation)';
        if (isAutomatedBlock || /automated/i.test(errorMsg) || /otomatis/i.test(errorMsg)) {
          logger.error(
            `🛡️ [@${account.username || account.label}] Retweet BLOCKED by X Anti-Automation: "${errorMsg}" (Code: ${errorCode || 226})`
          );
          db.addHistory({
            accountId: account.id,
            accountName: account.username || account.label,
            tweetUrl,
            tweetId,
            action: 'RETWEET',
            status: 'FAILED',
            message: `Anti-Automation Block (${errorCode || 226}): ${errorMsg}`,
            engine: options.engine,
          });
          return {
            success: false,
            status: 'AUTOMATED_FLAG',
            code: errorCode || 226,
            message: errorMsg,
          };
        }

        if (
          isDailyLimitBlock ||
          /daily limit/i.test(errorMsg) ||
          /batas harian/i.test(errorMsg) ||
          /add a phone/i.test(errorMsg) ||
          /nomor telepon/i.test(errorMsg) ||
          errorCode === 344 ||
          errorCode === 185
        ) {
          logger.error(
            `🛑 [@${account.username || account.label}] Retweet BLOCKED by X Daily Limit / Phone Required: "${errorMsg}" (Code: ${errorCode || 344})`
          );
          db.addHistory({
            accountId: account.id,
            accountName: account.username || account.label,
            tweetUrl,
            tweetId,
            action: 'RETWEET',
            status: 'FAILED',
            message: `Daily Limit Reached / Phone Required (${errorCode || 344}): ${errorMsg}`,
            engine: options.engine,
          });
          return {
            success: false,
            status: 'DAILY_LIMIT_EXCEEDED',
            code: errorCode || 344,
            message: errorMsg,
          };
        }

        logger.warn(`⚠️ [@${account.username || account.label}] Retweet failed: ${errorMsg}`);
        db.addHistory({
          accountId: account.id,
          accountName: account.username || account.label,
          tweetUrl,
          tweetId,
          action: 'RETWEET',
          status: 'FAILED',
          message: errorMsg,
          engine: options.engine,
        });
        return { success: false, status: 'FAILED', message: errorMsg };
      }
    } finally {
      tracker.cleanup();
    }
  } catch (err) {
    if (err.message === 'TASK_ABORTED' || abortSignal?.aborted) {
      throw new Error('TASK_ABORTED');
    }
    logger.error(`❌ [@${account.username || account.label}] Retweet failed: ${err.message}`);
    db.addHistory({
      accountId: account.id,
      accountName: account.username || account.label,
      tweetUrl,
      tweetId,
      action: 'RETWEET',
      status: 'FAILED',
      message: err.message,
      engine: options.engine,
    });
    return { success: false, message: err.message };
  }
}
// ---------------------------------------------------------
// COMMENT / REPLY VECTOR ENGINE
// ---------------------------------------------------------

const TEXTAREA_SELECTORS = [
  '[data-testid="tweetTextarea_0"]',
  'div[role="dialog"] [data-testid="tweetTextarea_0"]',
  'div[role="dialog"] [role="textbox"][contenteditable="true"]',
  'div[role="dialog"] div[contenteditable="true"]',
  '[data-testid="inline_reply"] [role="textbox"]',
  '[data-testid="inline_reply"] div[contenteditable="true"]',
  'div[role="textbox"][contenteditable="true"]',
  'div[contenteditable="true"][aria-label*="Post text" i]',
  'div[contenteditable="true"][aria-label*="Teks postingan" i]',
  'div[contenteditable="true"][aria-label*="Post your reply" i]',
  'div[contenteditable="true"][aria-label*="Posting balasan" i]',
  'div[contenteditable="true"][role="textbox"]',
].join(', ');

const INLINE_REPLY_PLACEHOLDERS = [
  '[data-testid="tweetTextarea_0_label"]',
  '[data-testid="inline_reply"]',
  'div[aria-label*="Post your reply" i]',
  'div[aria-label*="Posting balasan" i]',
  'div:has-text("Post your reply")',
  'div:has-text("Posting balasan Anda")',
  'div:has-text("Balas postingan")',
].join(', ');

const REPLY_TRIGGER_SELECTORS = [
  '[data-testid="reply"]',
  '[role="button"][data-testid="reply"]',
  'button[data-testid="reply"]',
  '[role="button"][aria-label*="reply" i]',
  'button[aria-label*="reply" i]',
  '[role="button"][aria-label*="balas" i]',
  'button[aria-label*="balas" i]',
  '[role="button"][aria-label*="responder" i]',
].join(', ');

/**
 * Check if the tweet author restricted who can reply
 */
async function checkRepliesRestricted(page) {
  return await page
    .evaluate(() => {
      const text = document.body ? document.body.innerText : '';
      const patterns = [
        'Who can reply',
        'Siapa yang dapat membalas',
        'You can’t reply to this Post',
        "You can't reply to this Post",
        'Anda tidak dapat membalas Postingan ini',
        'Only accounts mentioned',
        'Hanya akun yang disebutkan',
        'can reply to this Post',
        'dapat membalas Postingan ini',
      ];
      return patterns.some((p) => text.toLowerCase().includes(p.toLowerCase()));
    })
    .catch(() => false);
}

/**
 * Structural group inspection for Reply button
 */
async function findReplyButtonInGroup(container) {
  if (!container) return null;
  const group = await container.$('div[role="group"]').catch(() => null);
  if (!group) return null;

  const buttons = await group.$$('button, [role="button"]').catch(() => []);
  if (!buttons || buttons.length === 0) return null;

  for (const btn of buttons) {
    const isReply = await btn
      .evaluate((el) => {
        const testid = el.getAttribute('data-testid') || '';
        const aria = (el.getAttribute('aria-label') || '').toLowerCase();
        if (
          testid === 'reply' ||
          aria.includes('reply') ||
          aria.includes('balas') ||
          aria.includes('responder')
        ) {
          return true;
        }
        const svgs = el.querySelectorAll('svg');
        for (const svg of svgs) {
          const paths = svg.querySelectorAll('path');
          for (const p of paths) {
            const d = p.getAttribute('d') || '';
            // Twitter speech bubble path signature
            if (d.includes('1.751') || d.includes('8.005') || d.includes('8.129')) {
              return true;
            }
          }
        }
        return false;
      })
      .catch(() => false);

    if (isReply) return btn;
  }

  // Convention: 1st button (index 0) in action group is Reply
  return buttons[0];
}

/**
 * Comment on Tweet using Account's specific comments, spintax, or AI contextual engine
 */
async function commentTweet(page, tweetUrl, account, customReplyText = null, abortSignal = null, options = {}) {
  if (abortSignal?.aborted) throw new Error('TASK_ABORTED');
  const tweetId = extractTweetId(tweetUrl);
  const engineTag = options.engine ? ` [Engine: ${options.engine.toUpperCase()}]` : '';
  logger.action(`[@${account.username || account.label}]${engineTag} Dispatching Reply: ${tweetUrl}`);

  try {
    await dismissOverlays(page);
    await handlePageInterstitials(page);
    if (abortSignal?.aborted) throw new Error('TASK_ABORTED');

    // 1. Check if author restricted replies
    const isRestricted = await checkRepliesRestricted(page);
    if (isRestricted) {
      const msg = 'Author has restricted replies on this post.';
      logger.warn(`⚠️ [@${account.username || account.label}] ${msg}`);
      db.addHistory({
        accountId: account.id,
        accountName: account.username || account.label,
        tweetUrl,
        tweetId,
        action: 'COMMENT',
        status: 'FAILED',
        message: msg,
        engine: options.engine,
      });
      return { success: false, status: 'RESTRICTED', message: msg };
    }

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

    let targetArticle = await findTargetTweetArticle(page, tweetId);
    let textarea = null;

    // Retry loop with micro-scroll
    for (let attempt = 1; attempt <= 3; attempt++) {
      if (abortSignal?.aborted) throw new Error('TASK_ABORTED');
      // Step A: Check if textarea already active and visible
      textarea = await page.$(TEXTAREA_SELECTORS).catch(() => null);
      if (textarea) {
        const isVisible = await textarea.isVisible().catch(() => false);
        if (isVisible) break;
      }

      // Step B: Try clicking inline reply placeholder if present
      const inlinePlaceholder = await page.$(INLINE_REPLY_PLACEHOLDERS).catch(() => null);
      if (inlinePlaceholder) {
        const isVisible = await inlinePlaceholder.isVisible().catch(() => false);
        if (isVisible) {
          if (abortSignal?.aborted) throw new Error('TASK_ABORTED');
          await safeClick(page, inlinePlaceholder);
          await sleep(600, abortSignal);
          textarea = await page.$(TEXTAREA_SELECTORS).catch(() => null);
          if (textarea) break;
        }
      }

      // Step C: Try finding and clicking the reply icon on target article or group
      let replyIcon = null;
      if (targetArticle) {
        replyIcon = await targetArticle.$(REPLY_TRIGGER_SELECTORS).catch(() => null);
        if (!replyIcon) {
          replyIcon = await findReplyButtonInGroup(targetArticle);
        }
      }
      if (!replyIcon) {
        replyIcon = await page.$(REPLY_TRIGGER_SELECTORS).catch(() => null);
        if (!replyIcon) {
          replyIcon = await findReplyButtonInGroup(page);
        }
      }

      if (replyIcon) {
        if (abortSignal?.aborted) throw new Error('TASK_ABORTED');
        await safeClick(page, replyIcon);
        await sleep(800, abortSignal);
        textarea = await page
          .waitForSelector(TEXTAREA_SELECTORS, { timeout: 5000 })
          .catch(() => null);
        if (textarea) break;
      }

      if (attempt < 3) {
        if (abortSignal?.aborted) throw new Error('TASK_ABORTED');
        await page.evaluate(() => window.scrollBy(0, 200)).catch(() => {});
        await sleep(800, abortSignal);
        await dismissOverlays(page);
        targetArticle = await findTargetTweetArticle(page, tweetId);
      }
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
        engine: options.engine,
      });
      return { success: false, message: msg };
    }

    if (abortSignal?.aborted) throw new Error('TASK_ABORTED');
    await safeClick(page, textarea);
    await textarea.focus().catch(() => {});
    await sleep(300, abortSignal);

    if (abortSignal?.aborted) throw new Error('TASK_ABORTED');
    try {
      await humanType(textarea, replyText, abortSignal, page);
    } catch (typeErr) {
      if (typeErr.message === 'TASK_ABORTED' || abortSignal?.aborted) {
        throw new Error('TASK_ABORTED');
      }
      await page.keyboard.insertText(replyText).catch(() => {});
    }
    await sleep(800, abortSignal);

    // Determine active container (Modal dialog vs inline reply container)
    const isInsideDialog = await textarea
      .evaluate((el) => Boolean(el.closest('[role="dialog"]')))
      .catch(() => false);

    let replyBtn = null;

    if (isInsideDialog) {
      const dialogContainer = await page.$('[role="dialog"]').catch(() => null);
      if (dialogContainer) {
        const dialogSelectors = [
          '[data-testid="tweetButton"]',
          'button[data-testid="tweetButton"]',
          'button:has-text("Reply")',
          'button:has-text("Balas")',
          'button:has-text("Post")',
          'button:has-text("Posting")',
          'button:has-text("Responder")',
        ];
        for (const sel of dialogSelectors) {
          const btn = await dialogContainer.$(sel).catch(() => null);
          if (btn) {
            const isVis = await btn.isVisible().catch(() => false);
            if (isVis) {
              replyBtn = btn;
              break;
            }
          }
        }
      }
    } else {
      const inlineSelectors = [
        '[data-testid="tweetButtonInline"]',
        'button[data-testid="tweetButtonInline"]',
        '[data-testid="inline_reply"] [data-testid="tweetButton"]',
        '[data-testid="tweetButton"]',
        'button:has-text("Reply")',
        'button:has-text("Balas")',
        'button:has-text("Post")',
      ];
      for (const sel of inlineSelectors) {
        const btn = await page.$(sel).catch(() => null);
        if (btn) {
          const isVis = await btn.isVisible().catch(() => false);
          if (isVis) {
            replyBtn = btn;
            break;
          }
        }
      }
    }

    if (!replyBtn) {
      const fallbackSelector = isInsideDialog
        ? '[role="dialog"] [data-testid="tweetButton"], [data-testid="tweetButton"]'
        : '[data-testid="tweetButtonInline"], [data-testid="tweetButton"]';
      replyBtn = await page
        .waitForSelector(fallbackSelector, { timeout: 6000 })
        .catch(() => null);
    }

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
        engine: options.engine,
      });
      return { success: false, message: msg };
    }

    // Check if the submit button is disabled (aria-disabled="true")
    let isBtnDisabled = await replyBtn.getAttribute('aria-disabled').catch(() => null);

    if (isBtnDisabled === 'true') {
      // Lexical editor may need an event dispatch to trigger state re-calculation
      await page.keyboard.press('Space').catch(() => {});
      await sleep(100, abortSignal);
      await page.keyboard.press('Backspace').catch(() => {});
      await sleep(400, abortSignal);

      const pollStart = Date.now();
      while (Date.now() - pollStart < 3000) {
        isBtnDisabled = await replyBtn.getAttribute('aria-disabled').catch(() => null);
        if (isBtnDisabled !== 'true') break;
        await sleep(300, abortSignal);
      }
    }

    // Fallback: If still disabled, check if text was actually placed into editor
    if (isBtnDisabled === 'true') {
      const editorText = await textarea
        .evaluate((el) => el.innerText || el.textContent || '')
        .catch(() => '');
      if (!editorText.trim()) {
        logger.warn(
          `⚠️ [@${account.username || account.label}] Lexical editor was empty. Re-injecting reply text via keyboard insertText...`
        );
        await safeClick(page, textarea);
        await textarea.focus().catch(() => {});
        await page.keyboard.insertText(replyText).catch(() => {});
        await sleep(500, abortSignal);
        isBtnDisabled = await replyBtn.getAttribute('aria-disabled').catch(() => null);
      }
    }

    if (isBtnDisabled === 'true') {
      const msg = 'Reply submit button is disabled (editor state empty or character limit exceeded)';
      logger.warn(`⚠️ [@${account.username || account.label}] ${msg}.`);
      db.addHistory({
        accountId: account.id,
        accountName: account.username || account.label,
        tweetUrl,
        tweetId,
        action: 'COMMENT',
        status: 'FAILED',
        message: msg,
        details: replyText,
        engine: options.engine,
      });
      return { success: false, message: msg };
    }

    const tracker = createActionTracker(page, 'REPLY');

    try {
      if (abortSignal?.aborted) throw new Error('TASK_ABORTED');
      await safeClick(page, replyBtn);

      let isReplySuccess = false;
      let failureReason = null;
      let isAutomatedBlock = false;
      let isDailyLimitBlock = false;
      let errorCode = null;
      let capturedReplyId = null;

      const startTime = Date.now();
      while (Date.now() - startTime < 8000) {
        if (abortSignal?.aborted) throw new Error('TASK_ABORTED');
        // 1. Check API response from GraphQL interceptor
        const apiRes = tracker.getResult();
        if (apiRes) {
          if (apiRes.success) {
            isReplySuccess = true;
            capturedReplyId = apiRes.restId;
            break;
          } else {
            failureReason = apiRes.message || 'Reply rejected by X API';
            isAutomatedBlock = Boolean(apiRes.isAutomated);
            isDailyLimitBlock = Boolean(apiRes.isDailyLimit);
            errorCode = apiRes.code;
            break;
          }
        }

        // 2. Check UI Toast alert for instant error notification
        const toast = await checkToastAlert(page);
        if (toast && toast.isError) {
          failureReason = toast.text;
          isAutomatedBlock = Boolean(toast.isAutomated);
          isDailyLimitBlock = Boolean(toast.isDailyLimit);
          break;
        }

        // 3. Check if textarea dialog/inline input has closed
        const isStillVisible = await textarea.isVisible().catch(() => false);
        if (!isStillVisible && Date.now() - startTime > 1500) {
          isReplySuccess = true;
          break;
        }

        await sleep(400, abortSignal);
      }

      await dismissOverlays(page);

      if (isReplySuccess) {
        const idTag = capturedReplyId ? ` (Tweet ID: ${capturedReplyId})` : '';
        logger.success(
          `💬 [@${account.username || account.label}] Reply verified & published successfully${idTag}: "${replyText}"`
        );
        db.addHistory({
          accountId: account.id,
          accountName: account.username || account.label,
          tweetUrl,
          tweetId: capturedReplyId || tweetId,
          action: 'COMMENT',
          status: 'SUCCESS',
          details: replyText,
          engine: options.engine,
        });
        return { success: true, status: 'SUCCESS', replyText, tweetId: capturedReplyId };
      } else {
        const stillOpen = await textarea.isVisible().catch(() => false);
        const errorMsg =
          failureReason ||
          (stillOpen
            ? 'Reply submission failed: input editor remained open and unsubmitted'
            : 'Reply verification failed');

        if (isAutomatedBlock || /automated/i.test(errorMsg) || /otomatis/i.test(errorMsg)) {
          logger.error(
            `🛡️ [@${account.username || account.label}] Reply BLOCKED by X Anti-Automation: "${errorMsg}" (Code: ${errorCode || 226})`
          );
          db.addHistory({
            accountId: account.id,
            accountName: account.username || account.label,
            tweetUrl,
            tweetId,
            action: 'COMMENT',
            status: 'FAILED',
            message: `Anti-Automation Block (${errorCode || 226}): ${errorMsg}`,
            details: replyText,
            engine: options.engine,
          });
          return {
            success: false,
            status: 'AUTOMATED_FLAG',
            code: errorCode || 226,
            message: errorMsg,
          };
        }

        if (
          isDailyLimitBlock ||
          /daily limit/i.test(errorMsg) ||
          /batas harian/i.test(errorMsg) ||
          /add a phone/i.test(errorMsg) ||
          /nomor telepon/i.test(errorMsg) ||
          errorCode === 344 ||
          errorCode === 185
        ) {
          logger.error(
            `🛑 [@${account.username || account.label}] Reply BLOCKED by X Daily Limit / Phone Required: "${errorMsg}" (Code: ${errorCode || 344})`
          );
          db.addHistory({
            accountId: account.id,
            accountName: account.username || account.label,
            tweetUrl,
            tweetId,
            action: 'COMMENT',
            status: 'FAILED',
            message: `Daily Limit Reached / Phone Required (${errorCode || 344}): ${errorMsg}`,
            details: replyText,
            engine: options.engine,
          });
          return {
            success: false,
            status: 'DAILY_LIMIT_EXCEEDED',
            code: errorCode || 344,
            message: errorMsg,
          };
        }

        logger.warn(`⚠️ [@${account.username || account.label}] Reply failed: ${errorMsg}`);
        db.addHistory({
          accountId: account.id,
          accountName: account.username || account.label,
          tweetUrl,
          tweetId,
          action: 'COMMENT',
          status: 'FAILED',
          message: errorMsg,
          details: replyText,
          engine: options.engine,
        });
        return { success: false, status: 'FAILED', message: errorMsg };
      }
    } finally {
      tracker.cleanup();
    }
  } catch (err) {
    if (err.message === 'TASK_ABORTED' || abortSignal?.aborted) {
      throw new Error('TASK_ABORTED');
    }
    logger.error(`❌ [@${account.username || account.label}] Reply failed: ${err.message}`);
    db.addHistory({
      accountId: account.id,
      accountName: account.username || account.label,
      tweetUrl,
      tweetId,
      action: 'COMMENT',
      status: 'FAILED',
      message: err.message,
      engine: options.engine,
    });
    return { success: false, message: err.message };
  }
}

/**
 * Process a single tweet URL with a specific account and vector flags
 */
async function processTweetWithAccount(page, tweetUrl, account, options = {}) {
  const {
    like = true,
    retweet = true,
    comment = true,
    commentText = null,
    abortSignal = null,
  } = options;

  if (abortSignal?.aborted) throw new Error('TASK_ABORTED');

  const targetUrl = normalizeTweetUrl(tweetUrl);
  const engineTag = options.engine ? ` [Engine: ${options.engine.toUpperCase()}]` : '';
  logger.info(`🌐 [@${account.username || account.label}]${engineTag} Navigating to: ${targetUrl}`);
  let navSuccess = false;
  let lastNavError = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    if (abortSignal?.aborted) throw new Error('TASK_ABORTED');
    try {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
      navSuccess = true;
      break;
    } catch (e) {
      if (e.message === 'TASK_ABORTED' || abortSignal?.aborted) throw new Error('TASK_ABORTED');
      lastNavError = e;
      if (attempt < 2) {
        if (abortSignal?.aborted) throw new Error('TASK_ABORTED');
        logger.warn(
          `⚠️ [@${account.username || account.label}] Navigation attempt ${attempt} failed: ${e.message}. Retrying in 3s...`
        );
        await sleep(3000, abortSignal);
      }
    }
  }

  if (abortSignal?.aborted) throw new Error('TASK_ABORTED');

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
  if (abortSignal?.aborted) throw new Error('TASK_ABORTED');
  await sleep(1500, abortSignal);

  // Clean up any initial popups or modal overlays
  await dismissOverlays(page);
  if (abortSignal?.aborted) throw new Error('TASK_ABORTED');

  // Check login and checkpoint status
  const currentUrl = typeof page?.url === 'function' ? page.url() : '';
  if (currentUrl.includes('/login') || currentUrl.includes('/i/flow/login')) {
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
      engine: options.engine,
    });
    return { success: false, message: 'Login session expired' };
  }

  if (
    currentUrl.includes('/account/access') ||
    currentUrl.includes('/i/flow/consent_flow') ||
    currentUrl.includes('/account/suspended')
  ) {
    const chkMsg = 'Account checkpoint or verification challenge encountered on X';
    logger.error(`❌ [@${account.username || account.label}] ${chkMsg}.`);
    db.addHistory({
      accountId: account.id,
      accountName: account.username || account.label,
      tweetUrl,
      action: 'SESSION',
      status: 'FAILED',
      message: chkMsg,
      engine: options.engine,
    });
    return { success: false, message: chkMsg };
  }

  // Handle reload prompts or deleted post notices
  const { isUnavailable, message: unavailMsg } = await handlePageInterstitials(page);
  if (isUnavailable) {
    logger.warn(`⚠️ [@${account.username || account.label}] ${unavailMsg}`);
    db.addHistory({
      accountId: account.id,
      accountName: account.username || account.label,
      tweetUrl,
      action: 'TASK',
      status: 'FAILED',
      message: unavailMsg,
      engine: options.engine,
    });
    return { success: false, status: 'UNAVAILABLE', message: unavailMsg };
  }

  if (db.getSettings().scrollBeforeAction) {
    if (abortSignal?.aborted) throw new Error('TASK_ABORTED');
    await humanScroll(page);
  }

  const results = { tweetUrl, accountId: account.id };

  if (like) {
    if (abortSignal?.aborted) throw new Error('TASK_ABORTED');
    if (typeof options.onAction === 'function') options.onAction('LIKE');
    results.like = await likeTweet(page, tweetUrl, account, abortSignal, options);
    if (
      results.like?.status === 'AUTOMATED_FLAG' ||
      results.like?.status === 'DAILY_LIMIT_EXCEEDED'
    ) {
      logger.warn(
        `🛡️ [@${account.username || account.label}] Safeguard trigger (${results.like?.status}) on Like vector. Aborting subsequent vectors to protect account node.`
      );
      return results;
    }
    if (retweet || comment) {
      if (abortSignal?.aborted) throw new Error('TASK_ABORTED');
      await sleep(2000 + Math.floor(Math.random() * 2000), abortSignal);
    }
  }

  if (retweet) {
    if (abortSignal?.aborted) throw new Error('TASK_ABORTED');
    if (typeof options.onAction === 'function') options.onAction('RETWEET');
    results.retweet = await retweetTweet(page, tweetUrl, account, abortSignal, options);
    if (
      results.retweet?.status === 'AUTOMATED_FLAG' ||
      results.retweet?.status === 'DAILY_LIMIT_EXCEEDED'
    ) {
      logger.warn(
        `🛡️ [@${account.username || account.label}] Safeguard trigger (${results.retweet?.status}) on Retweet vector. Aborting subsequent vectors to protect account node.`
      );
      return results;
    }
    if (comment) {
      if (abortSignal?.aborted) throw new Error('TASK_ABORTED');
      await sleep(2500 + Math.floor(Math.random() * 2000), abortSignal);
    }
  }

  if (comment) {
    if (abortSignal?.aborted) throw new Error('TASK_ABORTED');
    if (typeof options.onAction === 'function') options.onAction('REPLY');
    results.comment = await commentTweet(page, tweetUrl, account, commentText, abortSignal, options);
    if (results.comment?.status === 'DAILY_LIMIT_EXCEEDED') {
      logger.warn(
        `🛑 [@${account.username || account.label}] Node reached X daily action limit or requires phone verification.`
      );
    }
  }

  return results;
}

module.exports = {
  normalizeTweetUrl,
  dismissOverlays,
  handlePageInterstitials,
  findTargetTweetArticle,
  safeClick,
  checkAlreadyLiked,
  findLikeButton,
  findLikeInGroup,
  likeTweet,
  checkAlreadyRetweeted,
  findRetweetButton,
  findRetweetInGroup,
  retweetTweet,
  clickRetweetConfirmOption,
  checkRepliesRestricted,
  findReplyButtonInGroup,
  commentTweet,
  processTweetWithAccount,
  parseGraphQLResponse,
  checkToastAlert,
  createActionTracker,
};
