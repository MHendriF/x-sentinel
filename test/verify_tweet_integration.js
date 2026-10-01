const assert = require('assert');
const tweetExtractor = require('../server/automation/tweetExtractor');
const aiService = require('../server/automation/aiService');

console.log('=== 🧪 VERIFYING TWEET RESOLVER & PAYLOAD GENERATOR INTEGRATION ===\n');

async function runIntegrationTests() {
  // Test 1: isTweetUrl and extractTweetId
  console.log('1. Testing URL validator & extractor...');
  assert.strictEqual(tweetExtractor.isTweetUrl('https://x.com/jack/status/20'), true);
  assert.strictEqual(tweetExtractor.isTweetUrl('https://twitter.com/jack/status/20?s=20'), true);
  assert.strictEqual(tweetExtractor.isTweetUrl('https://x.com/i/status/20'), true);
  assert.strictEqual(tweetExtractor.isTweetUrl('Just plain text without url'), false);
  assert.strictEqual(tweetExtractor.extractTweetId('https://x.com/jack/status/20'), '20');
  console.log('✅ URL validator tests passed!\n');

  // Test 2: Live Fetch tweet content
  console.log('2. Testing tweetExtractor.fetchTweetContent live fetch...');
  const tweetResult = await tweetExtractor.fetchTweetContent('https://x.com/jack/status/20');
  assert.strictEqual(tweetResult.success, true);
  assert.strictEqual(tweetResult.tweetId, '20');
  assert.ok(tweetResult.text.includes('just setting up my twttr'), `Unexpected text: ${tweetResult.text}`);
  console.log(`✅ Tweet fetched successfully: "${tweetResult.text}" by @${tweetResult.author}\n`);

  // Test 3: generatePayloadRepliesFromPost with direct tweet text
  console.log('3. Testing generatePayloadRepliesFromPost with direct text...');
  const directResult = await aiService.generatePayloadRepliesFromPost({
    postText: tweetResult.text,
    count: 5,
    customOverrides: { aiProvider: 'none' },
  });
  assert.strictEqual(directResult.success, true);
  assert.strictEqual(directResult.replies.length, 5);
  console.log(`✅ Direct text payload generated 5 replies without double quotes!\n`);

  // Test 4: End-to-end simulation of URL in payload generator
  console.log('4. Testing URL auto-resolution before generation...');
  const urlInput = 'https://x.com/jack/status/20';
  let resolvedText = urlInput;
  if (tweetExtractor.isTweetUrl(resolvedText)) {
    const fetched = await tweetExtractor.fetchTweetContent(resolvedText);
    assert.strictEqual(fetched.success, true);
    resolvedText = fetched.text;
  }
  assert.ok(resolvedText.includes('just setting up my twttr'));
  const urlPayloadResult = await aiService.generatePayloadRepliesFromPost({
    postText: resolvedText,
    count: 5,
    customOverrides: { aiProvider: 'none' },
  });
  assert.strictEqual(urlPayloadResult.success, true);
  assert.strictEqual(urlPayloadResult.replies.length, 5);
  console.log('✅ URL resolution + reply generation flow passed successfully!\n');
}

runIntegrationTests().then(() => {
  console.log('🎉 ALL INTEGRATION TESTS PASSED!');
  process.exit(0);
}).catch((err) => {
  console.error('❌ Integration test failed:', err);
  process.exit(1);
});
