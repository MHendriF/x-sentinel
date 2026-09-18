const logger = require('../../logger');
const db = require('../../db');

/**
 * Sleep helper supporting abort signal cancellation
 */
async function sleep(ms, abortSignal = null) {
  if (abortSignal?.aborted) {
    throw new Error('TASK_ABORTED');
  }
  return new Promise((resolve, reject) => {
    let timer = null;
    const onAbort = () => {
      if (timer) clearTimeout(timer);
      reject(new Error('TASK_ABORTED'));
    };

    if (abortSignal) {
      if (abortSignal.aborted) {
        return reject(new Error('TASK_ABORTED'));
      }
      abortSignal.addEventListener('abort', onAbort, { once: true });
    }

    timer = setTimeout(() => {
      if (abortSignal) {
        abortSignal.removeEventListener('abort', onAbort);
      }
      resolve();
    }, ms);
  });
}

/**
 * Random delay between min and max seconds
 */
async function randomDelay(minSec, maxSec, abortSignal = null) {
  const settings = db.getSettings() || {};
  const min = minSec || settings.minDelaySeconds || 15;
  const max = maxSec || settings.maxDelaySeconds || 35;
  const delayMs = Math.floor((Math.random() * (max - min + 1) + min) * 1000);
  logger.info(`⏳ Humanized delay cooldown: ${(delayMs / 1000).toFixed(1)}s...`);
  await sleep(delayMs, abortSignal);
}

/**
 * Humanized typing simulation with random jitter and micro pauses.
 * Prioritizes activePage.keyboard.type to prevent repeated element re-focusing
 * which breaks Lexical/contenteditable selection in Twitter/X.
 */
async function humanType(element, text, abortSignal = null, page = null) {
  const activePage =
    page ||
    (element && typeof element.ownerFrame === 'function' ? element.ownerFrame()?.page() : null);

  if (activePage && activePage.keyboard) {
    if (element && typeof element.focus === 'function') {
      await element.focus().catch(() => {});
    }
    for (let i = 0; i < text.length; i++) {
      if (abortSignal?.aborted) {
        throw new Error('TASK_ABORTED');
      }
      const char = text[i];
      await activePage.keyboard.type(char, { delay: Math.floor(Math.random() * 45) + 30 });
      if (Math.random() < 0.08) {
        await sleep(Math.floor(Math.random() * 120) + 60, abortSignal);
      }
    }
    return;
  }

  for (let i = 0; i < text.length; i++) {
    if (abortSignal?.aborted) {
      throw new Error('TASK_ABORTED');
    }
    const char = text[i];
    await element.type(char, { delay: Math.floor(Math.random() * 50) + 35 });
    if (Math.random() < 0.08) {
      await sleep(Math.floor(Math.random() * 150) + 80, abortSignal);
    }
  }
}

/**
 * Random humanized page scrolling
 */
async function humanScroll(page) {
  try {
    const scrollDistance = Math.floor(Math.random() * 250) + 150;
    await page.mouse.wheel(0, scrollDistance);
    await page.waitForTimeout(600 + Math.floor(Math.random() * 400));
  } catch (e) {
    // ignore scroll errors on detached pages
  }
}

/**
 * Extract Tweet ID from URL string
 */
function extractTweetId(url) {
  if (!url) return null;
  const match = url.match(/\/status\/(\d+)/);
  return match ? match[1] : null;
}

module.exports = {
  sleep,
  randomDelay,
  humanType,
  humanScroll,
  extractTweetId,
};
