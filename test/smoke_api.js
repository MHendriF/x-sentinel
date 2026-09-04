/**
 * API Smoke Test — boots the real Express server against a throwaway data
 * directory and verifies the local security guard, secret masking, and the
 * previously-broken endpoints. Run: node test/smoke_api.js
 */

const assert = require('assert');
const path = require('path');
const os = require('os');
const fs = require('fs');
const http = require('http');

process.env.PORT = '4310';

const tmpDataDir = path.join(os.tmpdir(), `x-sentinel-smoke-${Date.now()}`);
fs.rmSync(tmpDataDir, { recursive: true, force: true });

// Patch DATA_DIR before the server (and its db singleton) boot
const config = require('../server/config');
config.DATA_DIR = tmpDataDir;

require('../server/index.js');

const db = require('../server/db');
const BASE = `http://127.0.0.1:${process.env.PORT}`;

const sameOrigin = { headers: { Origin: `http://localhost:${process.env.PORT}` } };
const post = (body, headers = {}) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify(body),
});

async function main() {
  // 1. Origin guard: cross-origin browser requests are rejected before any data leaks
  const evil = await fetch(`${BASE}/api/accounts`, {
    headers: { Origin: 'https://evil.example' },
  });
  assert.strictEqual(evil.status, 403, 'Foreign Origin must get 403');

  // fetch() forbids overriding Host, so use raw http.request for the rebinding check
  const rebindingStatus = await new Promise((resolve, reject) => {
    const req = http.request(`${BASE}/api/status`, { headers: { Host: 'evil.example' } }, (res) => {
      res.resume();
      resolve(res.statusCode);
    });
    req.on('error', reject);
    req.end();
  });
  assert.strictEqual(rebindingStatus, 403, 'Foreign Host header must get 403 (rebinding)');
  console.log('✅ 1. Origin/Host guard blocks cross-origin & DNS-rebinding requests');

  // 2. Same-origin & curl-style (no Origin) requests pass
  const status = await fetch(`${BASE}/api/status`, sameOrigin);
  assert.strictEqual(status.status, 200);
  assert.strictEqual((await status.json()).success, true);
  console.log('✅ 2. Same-origin API access still works');

  // 3. Create account → GET responses mask secrets
  const createRes = await fetch(`${BASE}/api/accounts`, {
    ...post(
      {
        label: 'Smoke Node',
        auth_token: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b01',
        ct0: 'ct0secretvalue123456',
        proxy: 'user:pass@31.56.70.92:1338',
      },
      sameOrigin.headers
    ),
  });
  const create = await createRes.json();
  assert.strictEqual(create.success, true, 'Account creation should succeed');

  const list = (await (await fetch(`${BASE}/api/accounts`, sameOrigin)).json()).accounts;
  assert.strictEqual(list.length, 1);
  assert.ok(list[0].auth_token.startsWith('••••'), 'auth_token must be masked');
  assert.ok(
    !JSON.stringify(list).includes('a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b01'),
    'Raw token must never appear in GET responses'
  );
  assert.ok(list[0].proxy.startsWith('••••@'), 'Proxy credentials must be masked');
  assert.ok(!JSON.stringify(list).includes('user:pass'), 'Raw proxy creds must never appear');
  const accountId = list[0].id;
  console.log('✅ 3. Secrets are masked in GET /api/accounts');

  // 4. Masked round-trip: PUT echoing masked values must not corrupt stored secrets
  const putRes = await fetch(`${BASE}/api/accounts/${accountId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...sameOrigin.headers },
    body: JSON.stringify({
      label: 'Smoke Node (edited)',
      auth_token: list[0].auth_token,
      ct0: list[0].ct0,
      proxy: list[0].proxy,
    }),
  });
  assert.strictEqual(putRes.status, 200, 'Masked PUT should be accepted');
  const exported = await (await fetch(`${BASE}/api/accounts/export`, sameOrigin)).json();
  assert.strictEqual(
    exported.accounts[0].auth_token,
    'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b01',
    'Stored auth_token must survive a masked round-trip'
  );
  assert.ok(
    exported.accounts[0].proxy.includes('user:pass@31.56.70.92:1338'),
    'Stored proxy creds must survive a masked round-trip'
  );
  assert.strictEqual(exported.accounts[0].label, 'Smoke Node (edited)');
  console.log('✅ 4. Masked value round-trip preserves stored secrets');

  // 4b. NEW raw secrets must replace stored ones on PUT (regression: edit-node save)
  const rawPut = await fetch(`${BASE}/api/accounts/${accountId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...sameOrigin.headers },
    body: JSON.stringify({
      auth_token: 'b1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b02',
      ct0: 'newct0value123456',
    }),
  });
  assert.strictEqual(rawPut.status, 200, 'Raw secret PUT should be accepted');
  const reExported = await (await fetch(`${BASE}/api/accounts/export`, sameOrigin)).json();
  assert.strictEqual(
    reExported.accounts[0].auth_token,
    'b1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b02',
    'A newly typed auth_token must replace the stored one'
  );
  assert.strictEqual(
    reExported.accounts[0].ct0,
    'newct0value123456',
    'A newly typed ct0 must replace the stored one'
  );
  console.log('✅ 4b. Newly typed auth_token/ct0 are persisted on edit');

  // 5. Zod validation rejects malformed bodies with a helpful 400
  const bad = await fetch(`${BASE}/api/accounts`, {
    ...post({ auth_token: 'x' }, sameOrigin.headers),
  });
  assert.strictEqual(bad.status, 400);
  assert.strictEqual((await bad.json()).error, 'VALIDATION_ERROR');
  console.log('✅ 5. Invalid bodies get 400 VALIDATION_ERROR');

  // 5b. Proxy tunnel format validation: garbage proxies are rejected with a
  // helpful message; masked round-trips and valid shapes still pass.
  const badProxy = await fetch(`${BASE}/api/accounts`, {
    ...post(
      { auth_token: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b03', proxy: 'dsdsd2323' },
      sameOrigin.headers
    ),
  });
  assert.strictEqual(badProxy.status, 400, 'Proxy without host:port must be rejected');
  const badProxyJson = await badProxy.json();
  assert.ok(
    /Invalid proxy tunnel format/i.test(badProxyJson.message),
    'Rejection message must explain the expected proxy format'
  );
  const badProxyTest = await fetch(`${BASE}/api/proxy/test`, {
    ...post({ proxy: 'not a proxy' }, sameOrigin.headers),
  });
  assert.strictEqual(badProxyTest.status, 400, '/api/proxy/test must reject malformed proxies');
  const maskedProxyPut = await fetch(`${BASE}/api/accounts/${accountId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...sameOrigin.headers },
    body: JSON.stringify({ proxy: '••••@31.56.70.92:1338' }),
  });
  assert.strictEqual(maskedProxyPut.status, 200, 'Masked proxy round-trip must stay accepted');
  console.log('✅ 5b. Proxy tunnel format is validated (garbage rejected, masked kept)');

  // 6. Bulk import (previously a 500 — db.bulkImportAccounts was missing)
  const bulk = await fetch(`${BASE}/api/accounts/bulk-import`, {
    ...post(
      {
        rawText:
          'tok_aaaaaaaaaaaaaaaaaaaaaaaa:ct0_aaaaaaaaaa:Import A\ntok_bbbbbbbbbbbbbbbbbbbbbbbb:ct0_bbbbbbbbbb:Import B',
      },
      sameOrigin.headers
    ),
  });
  const bulkJson = await bulk.json();
  assert.strictEqual(bulk.status, 200);
  assert.strictEqual(bulkJson.addedCount, 2, 'bulk-import must report addedCount');
  console.log('✅ 6. POST /api/accounts/bulk-import works (addedCount)');

  // 7. Global templates/comments routes (previously 404 — route missing)
  const templates = await fetch(`${BASE}/api/templates`, sameOrigin);
  assert.strictEqual(templates.status, 200);
  assert.ok(Array.isArray((await templates.json()).templates));
  const commentsRes = await fetch(`${BASE}/api/comments`, {
    ...post({ comments: ['x', 'y'] }, sameOrigin.headers),
  });
  assert.strictEqual(commentsRes.status, 200);
  console.log('✅ 7. GET/POST /api/templates and /api/comments work');

  // 8. Settings masking round-trip
  await fetch(`${BASE}/api/settings`, {
    ...post(
      { aiProvider: 'groq', aiApiKey: 'gsk_real_key_123456', telegramBotToken: '123:ABC-real' },
      sameOrigin.headers
    ),
  });
  const settingsGet = (await (await fetch(`${BASE}/api/settings`, sameOrigin)).json()).settings;
  assert.ok(settingsGet.aiApiKey.startsWith('••••'), 'aiApiKey must be masked');
  assert.ok(
    !JSON.stringify(settingsGet).includes('gsk_real_key_123456'),
    'Raw AI key must never appear'
  );
  await fetch(`${BASE}/api/settings`, {
    ...post({ aiApiKey: settingsGet.aiApiKey, aiPrompt: 'updated prompt' }, sameOrigin.headers),
  });
  assert.strictEqual(
    db.getSettings().aiApiKey,
    'gsk_real_key_123456',
    'Masked settings PUT must keep stored key'
  );
  assert.strictEqual(db.getSettings().aiPrompt, 'updated prompt', 'Non-secret fields still update');
  console.log('✅ 8. GET/POST /api/settings masks secrets and preserves stored keys');

  // 8b. 9router multi-model registry persistence
  await fetch(`${BASE}/api/settings`, {
    ...post(
      {
        aiProvider: '9router',
        aiModel: 'deepseek/deepseek-r1',
        nineRouterModels: [
          'openai/gpt-4o-mini',
          'deepseek/deepseek-r1',
          'custom-9router-model',
          'openai/gpt-4o-mini',
        ],
      },
      sameOrigin.headers
    ),
  });
  const nineRouterSettings = (await (await fetch(`${BASE}/api/settings`, sameOrigin)).json()).settings;
  assert.strictEqual(nineRouterSettings.aiModel, 'deepseek/deepseek-r1');
  assert.deepStrictEqual(nineRouterSettings.nineRouterModels, [
    'openai/gpt-4o-mini',
    'deepseek/deepseek-r1',
    'custom-9router-model',
  ]);
  console.log('✅ 8b. 9router multi-model registry is persisted and deduplicated');

  // 9. AI generate-post route is wired to the existing service method
  const aiRes = await fetch(`${BASE}/api/ai/generate-post`, {
    ...post({ keyword: 'smoke test topic', count: 1 }, sameOrigin.headers),
  });
  const aiJson = await aiRes.json();
  assert.strictEqual(
    aiRes.status,
    200,
    'AI generate must not 500 (method existed but was misnamed)'
  );
  assert.ok(
    Array.isArray(aiJson.posts) && aiJson.posts.length >= 1,
    'AI fallback generator should yield drafts'
  );
  console.log('✅ 9. POST /api/ai/generate-post works (generatePostFromKeyword wired)');

  // 10. 404 catch-all for unknown API endpoints
  const missing = await fetch(`${BASE}/api/definitely-not-real`, sameOrigin);
  assert.strictEqual(missing.status, 404);
  console.log('✅ 10. Unknown API endpoints return JSON 404');

  console.log('\n🎉 ALL API SMOKE TESTS PASSED');
  cleanup(0);
}

function cleanup(code) {
  try {
    fs.rmSync(tmpDataDir, { recursive: true, force: true });
  } catch (e) {
    // ignore
  }
  process.exit(code);
}

main().catch((err) => {
  console.error(`\n❌ SMOKE TEST FAILED: ${err.message}`);
  cleanup(1);
});
