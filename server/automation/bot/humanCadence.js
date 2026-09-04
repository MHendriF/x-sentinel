const logger = require('../../logger');
const db = require('../../db');

/**
 * Sleep helper supporting abort signal cancellation
 */
async function sleep(ms, abortSignal = null) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    if (abortSignal) {
      abortSignal.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          reject(new Error('TASK_ABORTED'));
        },
        { once: true }
      );
    }
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
 * Humanized typing simulation with random jitter and micro pauses
 */
async function humanType(element, text, abortSignal = null) {
  for (let i = 0; i < text.length; i++) {
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
