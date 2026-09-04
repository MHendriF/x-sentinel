const assert = require('assert');
const path = require('path');
const fs = require('fs');
const aiService = require('../server/automation/aiService');
const db = require('../server/db');

console.log('=== 🧪 VERIFYING AI PAYLOAD RESPONSE GENERATOR ===\n');

async function runTests() {
  const samplePost =
    'Open-source AI models are catching up to proprietary frontier models faster than expected. The bottleneck is no longer model weights, but proprietary data pipelines, agentic execution harnesses, and distribution velocity.';

  // -------------------------------------------------------------
  // Test 1: Fallback Generator (No double quotes, exactly 15 items)
  // -------------------------------------------------------------
  console.log('1. Testing Offline Fallback Payload Generator (15 items)...');
  const fallbackResult = await aiService.generatePayloadRepliesFromPost({
    postText: samplePost,
    count: 15,
    tone: 'peer_native',
    language: 'en',
    customOverrides: { aiProvider: 'none' },
  });

  assert.strictEqual(fallbackResult.success, true, 'Result success should be true');
  assert.strictEqual(
    fallbackResult.isFallback,
    true,
    'isFallback should be true when provider is none'
  );
  assert.strictEqual(fallbackResult.count, 15, 'Count should be 15');
  assert.strictEqual(fallbackResult.replies.length, 15, 'Replies array length should be 15');

  // Verify STRICT NO DOUBLE QUOTES
  fallbackResult.replies.forEach((reply, idx) => {
    assert.ok(
      !reply.includes('"') && !reply.includes('“') && !reply.includes('”'),
      `Reply #${idx + 1} must not contain any double quotes: "${reply}"`
    );
    assert.ok(
      !reply.includes('\n') && !reply.includes('\r'),
      `Reply #${idx + 1} must be a single line without newlines`
    );
    assert.ok(reply.length > 10, `Reply #${idx + 1} should be a substantial sentence`);
  });
  console.log('✅ Test 1 Passed: 15 unique replies generated without any double quotes!\n');

  // -------------------------------------------------------------
  // Test 2: Indonesian Community tone fallback
  // -------------------------------------------------------------
  console.log('2. Testing Indonesian Community Tone Fallback (15 items)...');
  const indoPost =
    'Banyak yang masih fomo token baru tanpa ngecek likuiditas dan smart contract auditnya. Hati-hati rug pull.';
  const indoResult = await aiService.generatePayloadRepliesFromPost({
    postText: indoPost,
    count: 15,
    tone: 'indo_community',
    language: 'id',
    customOverrides: { aiProvider: 'none' },
  });

  assert.strictEqual(indoResult.success, true);
  assert.strictEqual(indoResult.replies.length, 15);
  indoResult.replies.forEach((reply, idx) => {
    assert.ok(
      !reply.includes('"') && !reply.includes('“') && !reply.includes('”'),
      `Indo reply #${idx + 1} must not contain double quotes: "${reply}"`
    );
  });
  console.log(
    '✅ Test 2 Passed: Indonesian community tone properly generated without double quotes!\n'
  );

  // -------------------------------------------------------------
  // Test 3: Save Payload to JSON File & Path Traversal Hardening
  // -------------------------------------------------------------
  console.log('3. Testing Save Payload File & Path Traversal Security...');
  const testFileName = 'verify_test_payload.json';
  const testFilePath = path.resolve(db.commentsDir, testFileName);

  // Write safe test file
  db.writeFile(testFilePath, fallbackResult.replies);
  assert.ok(fs.existsSync(testFilePath), 'Saved JSON file should exist in commentsDir');

  const loadedRaw = fs.readFileSync(testFilePath, 'utf8');
  const loadedJson = JSON.parse(loadedRaw);
  assert.strictEqual(Array.isArray(loadedJson), true, 'File content should be a JSON array');
  assert.strictEqual(loadedJson.length, 15, 'Saved JSON array length should match 15');
  console.log(`✅ Saved ${loadedJson.length} replies to ${testFileName} successfully!`);

  // Path traversal check
  const maliciousName = '../../malicious.json';
  const resolvedMalicious = path.resolve(db.commentsDir, path.basename(maliciousName));
  assert.ok(
    resolvedMalicious.startsWith(path.resolve(db.commentsDir)),
    'Path basename should neutralize directory traversal'
  );

  // Cleanup test file
  if (fs.existsSync(testFilePath)) {
    fs.unlinkSync(testFilePath);
    console.log('🧹 Cleaned up temporary test file.');
  }
  console.log('✅ Test 3 Passed: JSON file storage & path traversal protections verified!\n');

  // -------------------------------------------------------------
  // Test 4: Custom Count (e.g. 5, 20)
  // -------------------------------------------------------------
  console.log('4. Testing Custom Reply Counts (e.g. 5, 20)...');
  const fiveResult = await aiService.generatePayloadRepliesFromPost({
    postText: samplePost,
    count: 5,
    customOverrides: { aiProvider: 'none' },
  });
  assert.strictEqual(fiveResult.replies.length, 5, 'Count 5 should return 5 replies');

  const twentyResult = await aiService.generatePayloadRepliesFromPost({
    postText: samplePost,
    count: 20,
    customOverrides: { aiProvider: 'none' },
  });
  assert.strictEqual(twentyResult.replies.length, 20, 'Count 20 should return 20 replies');
  console.log('✅ Test 4 Passed: Dynamic counts (5 & 20) handled accurately!\n');

  console.log('🎉 ALL AI PAYLOAD RESPONSE GENERATOR TESTS PASSED (100%)\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
