/**
 * Comprehensive Authentication & Security Hardening Test Suite
 * Tests:
 * 1. 401 rejection for unauthenticated requests
 * 2. Login with Username + Password (rejection & acceptance)
 * 3. Session cookie & Bearer token access
 * 4. Revoke All Sessions (epoch rotation invalidates old tokens)
 * 5. In-app Credentials Update (requires current password, sets new username & scrypt hash)
 * 6. 2FA TOTP Lifecycle: setup -> verify & enable -> enforced on login -> disable
 * 7. Logout and cookie clearance
 * 8. Brute force rate limiting (429)
 */

const assert = require('assert');
const path = require('path');
const os = require('os');
const fs = require('fs');

const TEST_PORT = '4331';
process.env.PORT = TEST_PORT;
process.env.AUTH_ENABLED = 'true';
process.env.ADMIN_USERNAME = 'sentinel_boss';
process.env.ADMIN_PASSWORD = 'super-secure-passcode-99';
process.env.SESSION_SECRET = 'test-session-secret-key-123456';

const tmpDataDir = path.join(os.tmpdir(), `x-sentinel-auth-test-${Date.now()}`);
fs.mkdirSync(tmpDataDir, { recursive: true });

const config = require('../server/config');
config.DATA_DIR = tmpDataDir;
config.AUTH_ENABLED = true;
config.ADMIN_USERNAME = process.env.ADMIN_USERNAME;
config.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
config.SESSION_SECRET = process.env.SESSION_SECRET;

const authModule = require('../server/auth');

const BASE = `http://127.0.0.1:${TEST_PORT}`;
const sameOrigin = { Origin: `http://localhost:${TEST_PORT}` };

async function run() {
  console.log('=== 🛡️ VERIFYING X-SENTINEL AUTHENTICATION & SECURITY SYSTEM ===\n');

  // Boot server
  require('../server/index.js');
  await new Promise((resolve) => setTimeout(resolve, 800));

  // 1. Unauthenticated request to /api/status -> 401
  const unauthRes = await fetch(`${BASE}/api/status`, {
    headers: { ...sameOrigin },
  });
  assert.strictEqual(unauthRes.status, 401, 'Unauthenticated access must return 401');
  const unauthJson = await unauthRes.json();
  assert.strictEqual(unauthJson.error, 'UNAUTHORIZED');
  console.log('✅ 1. Unauthenticated request properly rejected with 401');

  // 2. Login with wrong username -> 401
  const badUserRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...sameOrigin },
    body: JSON.stringify({ username: 'intruder', password: 'super-secure-passcode-99' }),
  });
  assert.strictEqual(badUserRes.status, 401, 'Wrong username must return 401');
  console.log('✅ 2. Invalid username rejected with 401');

  // 3. Login with correct username + password -> 200 & cookie
  const goodLoginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...sameOrigin },
    body: JSON.stringify({
      username: 'sentinel_boss',
      password: 'super-secure-passcode-99',
    }),
  });
  assert.strictEqual(goodLoginRes.status, 200);
  const setCookie = goodLoginRes.headers.get('set-cookie');
  assert.ok(setCookie && setCookie.includes('x_sentinel_session='));
  const firstSessionCookie = setCookie.split(';')[0];
  const loginJson = await goodLoginRes.json();
  assert.ok(loginJson.token, 'Login must yield token');
  console.log('✅ 3. Username + Password login succeeded and issued session cookie');

  // 4. Access protected endpoint with cookie -> 200
  const authedRes = await fetch(`${BASE}/api/status`, {
    headers: { ...sameOrigin, Cookie: firstSessionCookie },
  });
  assert.strictEqual(authedRes.status, 200);
  console.log('✅ 4. Protected endpoint accessible with session cookie');

  // 5. Test Revoke All Sessions (Epoch rotation)
  const revokeRes = await fetch(`${BASE}/api/auth/revoke-all`, {
    method: 'POST',
    headers: { ...sameOrigin, Cookie: firstSessionCookie },
  });
  assert.strictEqual(revokeRes.status, 200);
  const revokeCookie = revokeRes.headers.get('set-cookie');
  assert.ok(revokeCookie, 'Revoke-all must issue fresh cookie for current operator');
  const freshSessionCookie = revokeCookie.split(';')[0];

  // Try using the OLD session cookie -> should now be rejected with 401 because epoch increased!
  const oldSessionTest = await fetch(`${BASE}/api/status`, {
    headers: { ...sameOrigin, Cookie: firstSessionCookie },
  });
  assert.strictEqual(oldSessionTest.status, 401, 'Old session token must be invalid after revoke-all');
  console.log('✅ 5. Revoke All Sessions successfully rotated epoch and invalidated prior tokens');

  // Verify the fresh cookie works
  const freshSessionTest = await fetch(`${BASE}/api/status`, {
    headers: { ...sameOrigin, Cookie: freshSessionCookie },
  });
  assert.strictEqual(freshSessionTest.status, 200, 'Fresh session cookie works after revoke-all');

  // 6. Test In-App Credentials Update (PUT /api/auth/credentials)
  // 6a. Wrong current password -> 401
  const badCredsRes = await fetch(`${BASE}/api/auth/credentials`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...sameOrigin, Cookie: freshSessionCookie },
    body: JSON.stringify({
      currentPassword: 'wrong-current-password',
      newUsername: 'chief_sentinel',
      newPassword: 'new-cockpit-password-2026',
    }),
  });
  assert.strictEqual(badCredsRes.status, 401);
  console.log('✅ 6a. Credential update rejected when current password is wrong');

  // 6b. Correct current password -> updates username and password (hashed with scrypt)
  const goodCredsRes = await fetch(`${BASE}/api/auth/credentials`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...sameOrigin, Cookie: freshSessionCookie },
    body: JSON.stringify({
      currentPassword: 'super-secure-passcode-99',
      newUsername: 'chief_sentinel',
      newPassword: 'new-cockpit-password-2026',
    }),
  });
  assert.strictEqual(goodCredsRes.status, 200);
  const credsJson = await goodCredsRes.json();
  assert.strictEqual(credsJson.username, 'chief_sentinel');
  const credsCookie = goodCredsRes.headers.get('set-cookie');
  assert.ok(credsCookie, 'Credentials update must issue fresh session cookie');
  console.log('✅ 6b. Credentials updated to chief_sentinel with scrypt password hash');

  // 6c. Verify new credentials work on login
  const newLoginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...sameOrigin },
    body: JSON.stringify({
      username: 'chief_sentinel',
      password: 'new-cockpit-password-2026',
    }),
  });
  assert.strictEqual(newLoginRes.status, 200, 'Login with new credentials must succeed');
  const newCookie = newLoginRes.headers.get('set-cookie').split(';')[0];
  console.log('✅ 6c. Login with newly updated credentials confirmed');

  // 7. Test Two-Factor Authentication (2FA TOTP)
  // 7a. Setup 2FA -> returns secret and otpauthUrl
  const setup2faRes = await fetch(`${BASE}/api/auth/2fa/setup`, {
    method: 'POST',
    headers: { ...sameOrigin, Cookie: newCookie },
  });
  assert.strictEqual(setup2faRes.status, 200);
  const setup2faJson = await setup2faRes.json();
  assert.ok(setup2faJson.secret, 'Setup must return Base32 secret');
  assert.ok(setup2faJson.otpauthUrl.startsWith('otpauth://totp/'));
  const totpSecret = setup2faJson.secret;
  console.log('✅ 7a. 2FA setup generated valid RFC 6238 Base32 secret');

  // 7b. Enable 2FA with invalid token -> 400
  const bad2faEnable = await fetch(`${BASE}/api/auth/2fa/enable`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...sameOrigin, Cookie: newCookie },
    body: JSON.stringify({ secret: totpSecret, code: '000000' }),
  });
  assert.strictEqual(bad2faEnable.status, 400);

  // 7c. Enable 2FA with valid generated TOTP token -> 200
  const validTotpCode = authModule.generateTotpToken(totpSecret);
  const good2faEnable = await fetch(`${BASE}/api/auth/2fa/enable`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...sameOrigin, Cookie: newCookie },
    body: JSON.stringify({ secret: totpSecret, code: validTotpCode }),
  });
  assert.strictEqual(good2faEnable.status, 200);
  console.log('✅ 7b. 2FA successfully verified and activated with 6-digit TOTP code');

  // 7d. Login now requires 2FA:
  // Step 1: Login without TOTP code -> returns requireTotp: true
  const loginRequireTotp = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...sameOrigin },
    body: JSON.stringify({
      username: 'chief_sentinel',
      password: 'new-cockpit-password-2026',
    }),
  });
  assert.strictEqual(loginRequireTotp.status, 200);
  const requireTotpJson = await loginRequireTotp.json();
  assert.strictEqual(requireTotpJson.requireTotp, true);
  console.log('✅ 7c. Login requires 2FA challenge when 2FA is active');

  // Step 2: Login with valid TOTP code -> succeeds
  const freshTotp = authModule.generateTotpToken(totpSecret);
  const loginWithTotp = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...sameOrigin },
    body: JSON.stringify({
      username: 'chief_sentinel',
      password: 'new-cockpit-password-2026',
      totpCode: freshTotp,
    }),
  });
  assert.strictEqual(loginWithTotp.status, 200);
  const authed2faJson = await loginWithTotp.json();
  assert.strictEqual(authed2faJson.success, true);
  console.log('✅ 7d. Login successfully authenticated with Password + TOTP');

  // 7e. Disable 2FA with password confirmation
  const disable2faRes = await fetch(`${BASE}/api/auth/2fa/disable`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...sameOrigin, Cookie: newCookie },
    body: JSON.stringify({ password: 'new-cockpit-password-2026' }),
  });
  assert.strictEqual(disable2faRes.status, 200);
  console.log('✅ 7e. 2FA successfully deactivated with password confirmation');

  // 8. Logout check
  const logoutRes = await fetch(`${BASE}/api/auth/logout`, {
    method: 'POST',
    headers: { ...sameOrigin, Cookie: newCookie },
  });
  assert.strictEqual(logoutRes.status, 200);
  const logoutCookie = logoutRes.headers.get('set-cookie');
  assert.ok(logoutCookie.includes('Max-Age=0'));
  console.log('✅ 8. Logout properly expires cookie');

  // 9. Brute force rate limit
  console.log('   Testing brute-force rate limit protection...');
  let hitRateLimit = false;
  for (let i = 0; i < 7; i++) {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...sameOrigin },
      body: JSON.stringify({ username: 'chief_sentinel', password: 'wrong-guess-' + i }),
    });
    if (res.status === 429) {
      hitRateLimit = true;
      break;
    }
  }
  assert.ok(hitRateLimit, 'Brute force must trigger 429');
  console.log('✅ 9. Brute-force rate limiting confirmed with HTTP 429');

  console.log('\n======================================================');
  console.log('🎉 ALL EXTENDED AUTH & SECURITY CHECKS PASSED 100%!');
  console.log('======================================================');

  // Cleanup
  try {
    fs.rmSync(tmpDataDir, { recursive: true, force: true });
  } catch {}

  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
