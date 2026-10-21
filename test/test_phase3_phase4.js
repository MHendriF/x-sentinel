const assert = require('assert');

console.log('=== 🧪 TESTING PHASE 3 & 4: FINGERPRINT & COOKIE HYGIENE ===\n');

// 1. Test buildIdentity in browserFactory
console.log('1. Testing Seeded Deterministic Identity Generation...');
const { buildIdentity } = require('../server/automation/bot/browserFactory');

const idA1 = buildIdentity({ id: 'acc_123', label: 'Node Alpha' });
const idA2 = buildIdentity({ id: 'acc_123', label: 'Node Alpha' });
const idB = buildIdentity({ id: 'acc_456', label: 'Node Beta' });

// Determinism check: Same account ID must yield identical identity
assert.strictEqual(idA1.ua, idA2.ua, 'Same account must have deterministic UA');
assert.strictEqual(idA1.cores, idA2.cores, 'Same account must have deterministic cores');
assert.strictEqual(idA1.memory, idA2.memory, 'Same account must have deterministic memory');
assert.strictEqual(idA1.gpuRenderer, idA2.gpuRenderer, 'Same account must have deterministic GPU renderer');
assert.strictEqual(idA1.chromeVersion, idA2.chromeVersion, 'Same account must have deterministic Chrome version');
assert.notStrictEqual(idA1.cores + idA1.memory + idA1.gpuRenderer, idB.cores + idB.memory + idB.gpuRenderer, 'Different accounts should have distinct composite specs');

// Diversification check: Different account IDs should diversify across the fleet
const distinctCores = new Set();
const distinctGpus = new Set();
for (let i = 0; i < 20; i++) {
  const ident = buildIdentity({ id: `acc_test_fleet_${i}` });
  distinctCores.add(ident.cores);
  distinctGpus.add(ident.gpuRenderer);
}
assert.ok(distinctCores.size > 1, 'Fleet must have diversified CPU cores');
assert.ok(distinctGpus.size > 1, 'Fleet must have diversified GPU renderers');
console.log(`   Deterministic identity & fleet diversification check: PASSED ✅ (${distinctCores.size} core variants, ${distinctGpus.size} GPU variants)`);

// Client Hints & Platform Consistency check
assert.ok(idA1.ua.includes(`Chrome/${idA1.chromeVersion}.0.0.0`), 'UA must match Chrome version');
assert.ok(idA1.secChUa.includes(String(idA1.chromeVersion)), 'sec-ch-ua must match Chrome version');
assert.ok(idA1.secChUaPlatform.length > 0, 'sec-ch-ua-platform must not be empty');
assert.strictEqual(idA1.secChUaMobile, '?0', 'sec-ch-ua-mobile must be ?0 for desktop');
console.log('   Client Hints & Platform consistency check: PASSED ✅');

// Proxy Geo Sync check
const idGeo = buildIdentity({ id: 'acc_geo' }, {
  timezone: 'Europe/Berlin',
  locale: 'de-DE',
  languages: ['de-DE', 'de', 'en'],
});
assert.strictEqual(idGeo.timezoneId, 'Europe/Berlin', 'Timezone must sync with egress geo');
assert.strictEqual(idGeo.locale, 'de-DE', 'Locale must sync with egress geo');
assert.deepStrictEqual(idGeo.languages, ['de-DE', 'de', 'en'], 'Languages must sync with egress geo');
console.log('   Egress proxy Geo synchronization check: PASSED ✅');

// 2. Test CookieManager Scoping & Anti-Tampering
console.log('\n2. Testing CookieManager Jar Scoping & Anti-Tampering...');
const cookieManager = require('../server/automation/cookieManager');

const cookies = cookieManager.getPlaywrightCookies('test_auth_token_123', 'test_ct0_456');

// Must be exactly 2 cookies (auth_token & ct0) scoped to .x.com, NOT 8 cookies duplicated across 4 domains
assert.strictEqual(cookies.length, 2, 'Must not duplicate cookies across multiple domains');
const authCookie = cookies.find((c) => c.name === 'auth_token');
const ct0Cookie = cookies.find((c) => c.name === 'ct0');

assert.ok(authCookie, 'auth_token cookie must exist');
assert.strictEqual(authCookie.domain, '.x.com', 'auth_token must be host-scoped to .x.com');
assert.strictEqual(authCookie.httpOnly, true, 'auth_token must be httpOnly');
assert.strictEqual(authCookie.secure, true, 'auth_token must be secure');
assert.strictEqual(authCookie.sameSite, 'Lax', 'auth_token sameSite must be Lax');
assert.strictEqual(authCookie.expires, -1, 'auth_token must be session cookie (-1)');

assert.ok(ct0Cookie, 'ct0 cookie must exist');
assert.strictEqual(ct0Cookie.domain, '.x.com', 'ct0 must be host-scoped to .x.com');
assert.strictEqual(ct0Cookie.httpOnly, false, 'ct0 must be accessible to browser JS (httpOnly: false)');
assert.strictEqual(ct0Cookie.secure, true, 'ct0 must be secure');

// Test full session jar if provided as an object
const fullSession = {
  auth_token: 'full_auth',
  ct0: 'full_ct0',
  twid: 'u%3D12345678',
  kdt: 'secret_kdt',
  guest_id: 'v1%3A123',
  personalization_id: 'v1_pers',
};
const fullJar = cookieManager.getPlaywrightCookies(fullSession);
assert.strictEqual(fullJar.length, 6, 'Full session jar must include all supported tokens');
console.log('   Cookie jar scoping & security flags check: PASSED ✅');

console.log('\n=== ✅ ALL PHASE 3 & 4 TESTS PASSED ===\n');
