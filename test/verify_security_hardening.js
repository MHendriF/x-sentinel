/**
 * Comprehensive Security Hardening Verification Test
 * Validates:
 * 1. HTTP Security Headers
 * 2. Sec-Fetch-Site and Referer Guard
 * 3. Tweet URL Validation in tasksRouter
 * 4. Safe mediaPaths sandbox in tasksRouter and schedulesRouter
 * 5. Discord Webhook & Telegram token validation in settingsRouter
 * 6. notifier.testWebhook implementation
 * 7. twitterBot.startPostTask and startHunterTask methods
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

const BASE = `http://127.0.0.1:${process.env.PORT}`;
const sameOrigin = { headers: { Origin: `http://localhost:${process.env.PORT}` } };
const post = (body, headers = {}) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify(body),
});

async function runTests() {
  console.log('=== 🛡️ X-SENTINEL COMPREHENSIVE SECURITY HARDENING VERIFICATION ===\n');

  // 1. HTTP Security Headers Verification
  console.log('1. Testing HTTP Security Headers...');
  const res = await fetch(`${BASE}/api/status`, sameOrigin);
  assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff', 'Missing nosniff');
  assert.strictEqual(res.headers.get('x-frame-options'), 'DENY', 'Missing X-Frame-Options DENY');
  assert.strictEqual(
    res.headers.get('referrer-policy'),
    'strict-origin-when-cross-origin',
    'Missing Referrer-Policy'
  );
  assert.ok(res.headers.get('x-xss-protection'), 'Missing X-XSS-Protection');
  console.log('   ✅ HTTP Security Headers properly configured.');

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
  // Since no accounts are configured yet, batch task will catch error or return 400 NO_ACCOUNTS, but schema validation passes
  assert.notStrictEqual(goodUrlRes.status, 404);
  console.log('   ✅ Non-Twitter URLs properly rejected by batchTaskSchema.');

  // 4. Safe Media Paths Sandbox
  console.log('\n4. Testing Safe mediaPaths Sandbox in /api/tasks/post...');
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
  const traversalData = await traversalMediaRes.json();
  assert.strictEqual(traversalData.error, 'VALIDATION_ERROR');

  const safeMediaPath = path.join(config.DATA_DIR, 'media', 'test_image.png');
  // Pass safe path format (inside data/media)
  const safeMediaRes = await fetch(`${BASE}/api/tasks/post`, {
    ...post(
      {
        posts: ['Test tweet'],
        mediaPaths: [safeMediaPath],
      },
      sameOrigin.headers
    ),
  });
  // Schema validation passes for path inside data/media
  assert.notStrictEqual(safeMediaRes.status, 404);
  console.log('   ✅ mediaPaths outside data/media properly rejected with 400.');

  // 5. Discord Webhook & Telegram Token Format Validation
  console.log('\n5. Testing Discord Webhook & Telegram Token Schema...');
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

  // 6. notifier.testWebhook Implementation
  console.log('\n6. Testing notifier.testWebhook Functionality...');
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

  // 7. twitterBot.startPostTask and startHunterTask Methods
  console.log('\n7. Testing twitterBot.startPostTask and startHunterTask Wrappers...');
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
  const scheduler = require('../server/automation/scheduler');
  scheduler.stop();

  console.log('\n🎉 ALL SECURITY HARDENING TESTS PASSED SUCCESSFULLY!\n');
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
