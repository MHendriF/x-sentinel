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
 * Humanized delay with Gaussian jitter between min and max seconds.
 * Clustered around median to emulate realistic human browsing pauses.
 */
async function randomDelay(minSec, maxSec, abortSignal = null) {
  const settings = db.getSettings() || {};
  const min = Math.max(1, minSec || settings.minDelaySeconds || 15);
  const max = Math.max(min, maxSec || settings.maxDelaySeconds || 40);

  // Gaussian calculation centered on median
  const median = (min + max) / 2;
  const sd = (max - min) / 4;
  const u = 1 - Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  const sampleSec = Math.min(max, Math.max(min, Math.round((median + z * sd) * 10) / 10));
  const delayMs = Math.round(sampleSec * 1000);

  logger.info(`⏳ Humanized delay cooldown: ${sampleSec.toFixed(1)}s (Gaussian jitter)...`);
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
 * Organic filler routine to emulate natural non-action browsing (reading/skimming)
 * Implements 1 action : 4 non-action browsing ratio (§4.5)
 */
async function performOrganicFiller(page, abortSignal = null) {
  if (!page || typeof page.mouse?.wheel !== 'function') return;
  try {
    const pulses = Math.floor(Math.random() * 3) + 1;
    for (let p = 0; p < pulses; p++) {
      if (abortSignal?.aborted) throw new Error('TASK_ABORTED');
      const down = Math.floor(Math.random() * 320) + 180;
      await page.mouse.wheel(0, down);
      // Realistic reading pause
      const readPause = Math.floor(1800 + Math.random() * 2500);
      await sleep(readPause, abortSignal);
      // 30% chance of small scroll up (re-reading)
      if (Math.random() < 0.3) {
        await page.mouse.wheel(0, -(Math.floor(Math.random() * 120) + 60));
        await sleep(Math.floor(800 + Math.random() * 1000), abortSignal);
      }
    }
  } catch (e) {
    if (e.message === 'TASK_ABORTED') throw e;
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
  performOrganicFiller,
  extractTweetId,
};
