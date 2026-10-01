const assert = require('assert');

// Test URLs
const URLS = [
  'https://x.com/jack/status/20',
  'https://twitter.com/jack/status/20',
  'https://x.com/jack/status/20?s=20&t=abcdef',
  'https://mobile.twitter.com/jack/status/20',
  'https://x.com/i/status/20',
];

function isTweetUrl(str) {
  if (!str || typeof str !== 'string') return false;
  return /https?:\/\/(?:(?:www|mobile)\.)?(?:twitter\.com|x\.com)\/(?:#!\/)?[a-zA-Z0-9_]+\/status\/(\d+)/i.test(str.trim()) ||
         /https?:\/\/(?:(?:www|mobile)\.)?(?:twitter\.com|x\.com)\/i\/status\/(\d+)/i.test(str.trim());
}

function extractTweetId(str) {
  if (!str || typeof str !== 'string') return null;
  const match = str.trim().match(/\/status\/(\d+)/i);
  return match ? match[1] : null;
}

async function fetchTweetFromTier1(tweetId) {
  const res = await fetch(`https://api.fxtwitter.com/status/${tweetId}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`FxTwitter status: ${res.status}`);
  const data = await res.json();
  if (data && data.tweet && data.tweet.text) {
    return {
      text: data.tweet.text,
      author: data.tweet.author?.screen_name || '',
      authorName: data.tweet.author?.name || '',
      provider: 'fxtwitter',
    };
  }
  throw new Error('Invalid FxTwitter response structure');
}

async function fetchTweetFromTier2(tweetId) {
  const res = await fetch(`https://api.vxtwitter.com/Twitter/status/${tweetId}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`VxTwitter status: ${res.status}`);
  const data = await res.json();
  if (data && data.text) {
    return {
      text: data.text,
      author: data.user_screen_name || '',
      authorName: data.user_name || '',
      provider: 'vxtwitter',
    };
  }
  throw new Error('Invalid VxTwitter response structure');
}

async function fetchTweetContent(urlOrId) {
  const tweetId = extractTweetId(urlOrId) || (/^\d+$/.test(String(urlOrId).trim()) ? String(urlOrId).trim() : null);
  if (!tweetId) {
    return { success: false, error: 'Invalid Twitter / X tweet link or ID.' };
  }

  // Tier 1: FxTwitter
  try {
    const res = await fetchTweetFromTier1(tweetId);
    return { success: true, tweetId, ...res };
  } catch (err1) {
    // Tier 2: VxTwitter
    try {
      const res = await fetchTweetFromTier2(tweetId);
      return { success: true, tweetId, ...res };
    } catch (err2) {
      return {
        success: false,
        error: `Could not retrieve tweet content from link. (Details: ${err1.message}; ${err2.message})`,
      };
    }
  }
}

async function runTests() {
  console.log('🧪 Testing URL parsing...');
  for (const url of URLS) {
    assert.ok(isTweetUrl(url), `Failed to recognize tweet URL: ${url}`);
    assert.strictEqual(extractTweetId(url), '20', `Failed to extract tweet ID for: ${url}`);
  }
  assert.ok(!isTweetUrl('just some random text without a url'));
  assert.ok(!isTweetUrl('https://x.com/home'));
  console.log('✅ URL parsing tests passed.');

  console.log('🧪 Testing live tweet fetch for ID 20 (Jack status 20)...');
  const result = await fetchTweetContent('https://x.com/jack/status/20');
  console.log('Result:', result);
  assert.strictEqual(result.success, true, 'Fetch should succeed');
  assert.strictEqual(result.tweetId, '20');
  assert.ok(result.text.includes('just setting up my twttr'), 'Text should contain tweet text');
  console.log('✅ Live tweet fetch test passed.');
}

runTests().catch((e) => {
  console.error('❌ Test failed:', e);
  process.exit(1);
});
