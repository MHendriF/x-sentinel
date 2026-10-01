const logger = require('../logger');

/**
 * Checks if a string is a valid Twitter / X status URL
 * Matches formats:
 * - https://x.com/username/status/123456789
 * - https://twitter.com/username/status/123456789
 * - https://x.com/i/status/123456789
 */
function isTweetUrl(str) {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.trim();
  return (
    /https?:\/\/(?:(?:www|mobile)\.)?(?:twitter\.com|x\.com)\/(?:#!\/)?[a-zA-Z0-9_]+\/status\/(\d+)/i.test(trimmed) ||
    /https?:\/\/(?:(?:www|mobile)\.)?(?:twitter\.com|x\.com)\/i\/status\/(\d+)/i.test(trimmed)
  );
}

/**
 * Extracts numeric Tweet ID from a Twitter / X status URL or string
 */
function extractTweetId(str) {
  if (!str || typeof str !== 'string') return null;
  const match = str.trim().match(/\/status\/(\d+)/i);
  if (match) return match[1];
  if (/^\d{8,25}$/.test(str.trim())) return str.trim();
  return null;
}

/**
 * Decode common HTML entities in tweet text
 */
function decodeHtmlEntities(text) {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function fetchFromFxTwitter(tweetId) {
  const url = `https://api.fxtwitter.com/status/${tweetId}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
    },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) {
    throw new Error(`FxTwitter returned status ${res.status}`);
  }
  const data = await res.json();
  if (data && data.tweet && typeof data.tweet.text === 'string') {
    return {
      text: decodeHtmlEntities(data.tweet.text.trim()),
      author: data.tweet.author?.screen_name || '',
      authorName: data.tweet.author?.name || '',
      provider: 'fxtwitter',
    };
  }
  throw new Error('FxTwitter did not return valid tweet data');
}

async function fetchFromVxTwitter(tweetId) {
  const url = `https://api.vxtwitter.com/Twitter/status/${tweetId}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
    },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) {
    throw new Error(`VxTwitter returned status ${res.status}`);
  }
  const data = await res.json();
  if (data && typeof data.text === 'string') {
    return {
      text: decodeHtmlEntities(data.text.trim()),
      author: data.user_screen_name || '',
      authorName: data.user_name || '',
      provider: 'vxtwitter',
    };
  }
  throw new Error('VxTwitter did not return valid tweet data');
}

/**
 * Fetch tweet content from a Twitter/X URL or Tweet ID
 * Multi-tier resolution with graceful fallbacks
 */
async function fetchTweetContent(urlOrId) {
  const tweetId = extractTweetId(urlOrId);
  if (!tweetId) {
    return {
      success: false,
      error: 'Invalid Twitter / X tweet link or ID. Please provide a link like https://x.com/user/status/123456.',
    };
  }

  // Tier 1: FxTwitter
  try {
    const data = await fetchFromFxTwitter(tweetId);
    logger.info(`📥 Successfully fetched tweet content for ID ${tweetId} via ${data.provider}`);
    return {
      success: true,
      tweetId,
      ...data,
    };
  } catch (err1) {
    logger.warn(`⚠️ Tier 1 (FxTwitter) failed for tweet ${tweetId}: ${err1.message}. Trying Tier 2 (VxTwitter)...`);
    
    // Tier 2: VxTwitter
    try {
      const data = await fetchFromVxTwitter(tweetId);
      logger.info(`📥 Successfully fetched tweet content for ID ${tweetId} via ${data.provider}`);
      return {
        success: true,
        tweetId,
        ...data,
      };
    } catch (err2) {
      logger.error(`❌ Both resolvers failed for tweet ${tweetId}: Tier1: ${err1.message}; Tier2: ${err2.message}`);
      return {
        success: false,
        error: `Unable to fetch tweet content from link (${tweetId}). Please check the link or paste the text directly.`,
      };
    }
  }
}

module.exports = {
  isTweetUrl,
  extractTweetId,
  fetchTweetContent,
};
