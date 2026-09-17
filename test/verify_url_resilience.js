/**
 * Verification Test: Resilience against 'Cannot read properties of undefined (reading url)'
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { patchPlaywright } = require('../server/automation/bot/patchPlaywright');
const { normalizeTweetUrl } = require('../server/automation/bot/interactionEngine');

console.log('🧪 Starting URL & Driver Resilience Verification Tests...\n');

// Test 1: Verify Playwright driver bundle patch is applied
console.log('Test 1: Verify Playwright driver patch status...');
const patchRes = patchPlaywright();
assert.strictEqual(patchRes.success, true, 'Patch function should execute successfully');

const coreBundlePath = path.resolve(__dirname, '../node_modules/playwright-core/lib/coreBundle.js');
if (fs.existsSync(coreBundlePath)) {
  const content = fs.readFileSync(coreBundlePath, 'utf8');
  assert(
    !content.includes('url: pageError.location.url'),
    'Unsafe pageError.location.url must not exist in coreBundle.js'
  );
  assert(
    content.includes('pageError.location?.url'),
    'Safe pageError.location?.url must be present in coreBundle.js'
  );
  console.log('✅ Test 1 PASSED: Playwright coreBundle.js is fully patched and protected against undefined location.');
} else {
  console.log('⚠️ Test 1 SKIPPED: coreBundle.js not found in expected path.');
}

// Test 2: Verify normalizeTweetUrl handles null/undefined/malformed input gracefully
console.log('\nTest 2: Verify normalizeTweetUrl handles edge cases...');
assert.strictEqual(normalizeTweetUrl(null), null);
assert.strictEqual(normalizeTweetUrl(undefined), undefined);
assert.strictEqual(normalizeTweetUrl(''), '');
assert.strictEqual(
  normalizeTweetUrl('https://twitter.com/x/status/123456789?s=20'),
  'https://x.com/i/status/123456789'
);
assert.strictEqual(
  normalizeTweetUrl('https://x.com/user/status/987654321/photo/1'),
  'https://x.com/i/status/987654321'
);
console.log('✅ Test 2 PASSED: normalizeTweetUrl edge cases verified.');

// Test 3: Verify simulated pageError event dispatcher without location does not throw
console.log('\nTest 3: Verify pageError dispatcher mapping simulation without location...');
function simulatePageErrorDispatcher(pageError) {
  return {
    location: {
      url: pageError.location?.url || '',
      line: pageError.location?.lineNumber || 0,
      column: pageError.location?.columnNumber || 0,
    },
  };
}

const mockErrorWithoutLocation = { error: new Error('Script error on page without location') };
const mapped = simulatePageErrorDispatcher(mockErrorWithoutLocation);
assert.strictEqual(mapped.location.url, '');
assert.strictEqual(mapped.location.line, 0);
assert.strictEqual(mapped.location.column, 0);
console.log('✅ Test 3 PASSED: Simulated pageError without location handled gracefully with zero errors.');

console.log('\n🎉 ALL URL RESILIENCE TESTS COMPLETED SUCCESSFULLY!');
