/**
 * Comprehensive Security Hardening Verification Test
 * Validates:
 * 1. HTTP Security Headers & Content-Security-Policy
 * 2. Sec-Fetch-Site and Referer Guard
 * 3. Tweet URL Validation in tasksRouter
 * 4. Safe mediaPaths sandbox (Sibling Traversal + Extension Whitelist)
 * 5. Scoped Request Body Limit (1MB global vs 25MB media)
 * 6. Discord Webhook & Telegram token validation in settingsRouter
 * 7. notifier.testWebhook implementation
 * 8. twitterBot.startPostTask and startHunterTask methods
 * 9. Media retention & auto-pruning
 */

const assert = require('assert');
const path = require('path');
const os = require('os');
const fs = require('fs');

process.env.PORT = '4325';
const tmpDataDir = path.join(os.tmpdir(), `x-sentinel-hardening-${Date.now()}`);
fs.rmSync(tmpDataDir, { recursive: true, force: true });

const config = require('../server/config');
config.DATA_DIR = tmpDataDir;

require('../server/index.js');
const twitterBot = require('../server/automation/twitterBot');
const notifier = require('../server/automation/notifier');
const { pruneOldMedia } = require('../server/routes/mediaRouter');

const BASE = `http://127.0.0.1:${process.env.PORT}`;
const sameOrigin = { headers: { Origin: `http://localhost:${process.env.PORT}` } };
const post = (body, headers = {}) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify(body),
});

async function runTests() {
  console.log('=== 🛡️ X-SENTINEL COMPREHENSIVE SECURITY HARDENING VERIFICATION ===\n');

  // 1. HTTP Security Headers Verification (including CSP)
  console.log('1. Testing HTTP Security Headers & Content-Security-Policy...');
  const res = await fetch(`${BASE}/api/status`, sameOrigin);
  assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff', 'Missing nosniff');
  assert.strictEqual(res.headers.get('x-frame-options'), 'DENY', 'Missing X-Frame-Options DENY');
  assert.strictEqual(
    res.headers.get('referrer-policy'),
    'strict-origin-when-cross-origin',
    'Missing Referrer-Policy'
  );
  assert.ok(res.headers.get('x-xss-protection'), 'Missing X-XSS-Protection');
  const csp = res.headers.get('content-security-policy');
  assert.ok(csp && csp.includes("frame-ancestors 'none'"), 'Missing or invalid CSP header');
  console.log('   ✅ HTTP Security Headers & CSP properly configured.');

  // 2. Sec-Fetch-Site and Referer Blocking
  console.log('\n2. Testing Sec-Fetch-Site & Referer Guard...');
  const crossSiteRes = await fetch(`${BASE}/api/status`, {
    headers: { ...sameOrigin.headers, 'Sec-Fetch-Site': 'cross-site' },
  });
  assert.strictEqual(crossSiteRes.status, 403, 'cross-site Sec-Fetch-Site must be 403');

  const foreignRefererRes = await fetch(`${BASE}/api/status`, {
    headers: { Referer: 'https://evil-hacker.com/phishing' },
  });
  assert.strictEqual(foreignRefererRes.status, 403, 'Foreign Referer must be 403');
  console.log('   ✅ Sec-Fetch-Site cross-site and foreign Referer blocked with 403.');

  // 3. Tweet URL Regex Validation
  console.log('\n3. Testing Tweet URL Validation in /api/tasks/batch...');
  const badUrlRes = await fetch(`${BASE}/api/tasks/batch`, {
    ...post({ urls: ['https://malicious-site.com/exploit'] }, sameOrigin.headers),
  });
  assert.strictEqual(badUrlRes.status, 400, 'Non-Twitter URL must be rejected with 400');
  const badUrlData = await badUrlRes.json();
  assert.strictEqual(badUrlData.error, 'VALIDATION_ERROR');

  const goodUrlRes = await fetch(`${BASE}/api/tasks/batch`, {
    ...post(
      {
        urls: ['https://x.com/jack/status/20'],
      },
      sameOrigin.headers
    ),
  });
  assert.notStrictEqual(goodUrlRes.status, 404);
  console.log('   ✅ Non-Twitter URLs properly rejected by batchTaskSchema.');

  // 4. Safe Media Paths Sandbox (Sibling Traversal + Extension Whitelist)
  console.log('\n4. Testing Safe mediaPaths Sandbox (Sibling Traversal + Whitelist)...');
  // Traversal outside data/media
  const traversalMediaRes = await fetch(`${BASE}/api/tasks/post`, {
    ...post(
      {
        posts: ['Test tweet'],
        mediaPaths: ['C:\\Windows\\System32\\cmd.exe'],
      },
      sameOrigin.headers
    ),
  });
  assert.strictEqual(
    traversalMediaRes.status,
    400,
    'Arbitrary mediaPath must be rejected with 400'
  );

  // Sibling folder traversal (data/media_sibling/photo.png)
  const siblingPath = path.join(config.DATA_DIR, 'media_sibling', 'photo.png');
  const siblingRes = await fetch(`${BASE}/api/tasks/post`, {
    ...post(
      {
        posts: ['Test tweet'],
        mediaPaths: [siblingPath],
      },
      sameOrigin.headers
    ),
  });
  assert.strictEqual(siblingRes.status, 400, 'Sibling media path must be rejected with 400');

  // Disallowed file extension inside data/media (e.g. .exe)
  const badExtPath = path.join(config.DATA_DIR, 'media', 'payload.exe');
  const badExtRes = await fetch(`${BASE}/api/tasks/post`, {
    ...post(
      {
        posts: ['Test tweet'],
        mediaPaths: [badExtPath],
      },
      sameOrigin.headers
    ),
  });
  assert.strictEqual(badExtRes.status, 400, 'Non-image extension must be rejected with 400');

  // Valid image path inside data/media
  const safeMediaPath = path.join(config.DATA_DIR, 'media', 'test_image.png');
  const safeMediaRes = await fetch(`${BASE}/api/tasks/post`, {
    ...post(
      {
        posts: ['Test tweet'],
        mediaPaths: [safeMediaPath],
      },
      sameOrigin.headers
    ),
  });
  assert.notStrictEqual(safeMediaRes.status, 404);
  console.log('   ✅ mediaPaths sandboxed (sibling traversal & extension whitelist enforced).');

  // 5. Scoped Request Body Limit (1MB global vs 25MB media)
  console.log('\n5. Testing Scoped Request Body Limits (DoS Prevention)...');
  const largePayload = 'A'.repeat(1.2 * 1024 * 1024); // 1.2MB payload
  const largeSettingsRes = await fetch(`${BASE}/api/settings`, {
    ...post({ aiPrompt: largePayload }, sameOrigin.headers),
  });
  assert.strictEqual(largeSettingsRes.status, 413, 'Payload > 1MB on standard route must get 413');
  console.log(
    '   ✅ Global 1MB payload limit enforced on standard routes (413 Payload Too Large).'
  );

  // 6. Discord Webhook & Telegram Token Format Validation
  console.log('\n6. Testing Discord Webhook & Telegram Token Schema...');
  const badDiscordRes = await fetch(`${BASE}/api/settings`, {
    ...post(
      {
        discordWebhookUrl: 'http://169.254.169.254/latest/meta-data',
      },
      sameOrigin.headers
    ),
  });
  assert.strictEqual(badDiscordRes.status, 400, 'SSRF Discord URL must be rejected with 400');

  const badTgRes = await fetch(`${BASE}/api/settings`, {
    ...post(
      {
        telegramBotToken: 'malicious-token/../../admin',
      },
      sameOrigin.headers
    ),
  });
  assert.strictEqual(badTgRes.status, 400, 'Invalid Telegram token must be rejected with 400');
  console.log('   ✅ Webhook SSRF targets and malformed tokens rejected with 400.');

  // 7. notifier.testWebhook Implementation
  console.log('\n7. Testing notifier.testWebhook Functionality...');
  assert.strictEqual(typeof notifier.testWebhook, 'function', 'testWebhook must be a function');
  const testWebhookEmpty = await notifier.testWebhook({});
  assert.strictEqual(testWebhookEmpty.success, false);

  const testWebhookBadDiscord = await notifier.testWebhook({
    type: 'discord',
    discordWebhookUrl: 'https://evil.com/webhook',
  });
  assert.strictEqual(testWebhookBadDiscord.success, false);
  assert.ok(testWebhookBadDiscord.message.includes('Domain atau endpoint'));
  console.log('   ✅ notifier.testWebhook safely rejects invalid targets.');

  // 8. twitterBot.startPostTask and startHunterTask Methods
  console.log('\n8. Testing twitterBot.startPostTask and startHunterTask Wrappers...');
  assert.strictEqual(typeof twitterBot.startPostTask, 'function', 'startPostTask must exist');
  assert.strictEqual(typeof twitterBot.startHunterTask, 'function', 'startHunterTask must exist');

  const postResult = await twitterBot.startPostTask({
    accountIds: ['dummy'],
    posts: ['test post'],
  });
  assert.strictEqual(typeof postResult.success, 'boolean');

  const hunterResult = await twitterBot.startHunterTask({
    keywords: ['test'],
  });
  assert.strictEqual(typeof hunterResult.success, 'boolean');
  console.log('   ✅ twitterBot.startPostTask and startHunterTask methods verified.');

  // 9. Media Retention & Pruning
  console.log('\n9. Testing Media Retention & Pruning...');
  const mediaDir = path.join(config.DATA_DIR, 'media');
  fs.mkdirSync(mediaDir, { recursive: true });

  const oldFile = path.join(mediaDir, 'old_image.png');
  fs.writeFileSync(oldFile, 'dummy data');
  // Set mtime to 10 days ago
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
  fs.utimesSync(oldFile, tenDaysAgo, tenDaysAgo);

  const newFile = path.join(mediaDir, 'recent_image.png');
  fs.writeFileSync(newFile, 'dummy data');

  const pruneDirect = pruneOldMedia(7);
  assert.strictEqual(pruneDirect.deletedCount, 1, 'Should prune exactly 1 file older than 7 days');
  assert.ok(!fs.existsSync(oldFile), 'Old file should be deleted');
  assert.ok(fs.existsSync(newFile), 'Recent file should be preserved');

  const pruneEndpointRes = await fetch(`${BASE}/api/media/prune`, {
    ...post({ maxAgeDays: 7 }, sameOrigin.headers),
  });
  assert.strictEqual(pruneEndpointRes.status, 200);
  const pruneJson = await pruneEndpointRes.json();
  assert.strictEqual(pruneJson.success, true);
  console.log('   ✅ Media pruning and retention verified.');

  const scheduler = require('../server/automation/scheduler');
  scheduler.stop();

  console.log('\n🎉 ALL SECURITY HARDENING TESTS (1-9) PASSED SUCCESSFULLY!\n');
  try {
    fs.rmSync(tmpDataDir, { recursive: true, force: true });
  } catch {}
  process.exit(0);
}

runTests().catch((err) => {
  console.error('\n❌ Security hardening test failed:', err);
  try {
    fs.rmSync(tmpDataDir, { recursive: true, force: true });
  } catch {}
  process.exit(1);
});
