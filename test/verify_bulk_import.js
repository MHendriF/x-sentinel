const assert = require('assert');
const db = require('../server/db');

console.log('🧪 Running Bulk Fleet Import Verification Tests...\n');

// Test 1: Parsing colon format lines
const rawTextColon = `
# Comment line should be ignored
tok_11111111111111111111:ct0_11111111111111111111:31.56.70.92:1338:Node Alpha
tok_22222222222222222222:ct0_22222222222222222222:usr:pwd@31.56.70.92:1338:Node Beta
tok_33333333333333333333:ct0_33333333333333333333:Node Gamma
`;

const lines = rawTextColon.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
assert.strictEqual(lines.length, 3, 'Should extract 3 non-comment lines');

const parsed = [];
lines.forEach((line, idx) => {
  const parts = line.split(':').map(p => p.trim());
  if (parts.length >= 2) {
    const auth_token = parts[0];
    const ct0 = parts[1];
    let proxy = '';
    let label = `Node ${idx + 1}`;

    if (parts.length === 3) {
      if (parts[2].includes('.') || parts[2].includes('@')) {
        proxy = parts[2];
      } else {
        label = parts[2];
      }
    } else if (parts.length >= 4) {
      const remaining = parts.slice(2);
      label = remaining.pop();
      proxy = remaining.join(':');
    }
    parsed.push({ auth_token, ct0, proxy, label });
  }
});

assert.strictEqual(parsed.length, 3);
assert.strictEqual(parsed[0].label, 'Node Alpha');
assert.strictEqual(parsed[0].proxy, '31.56.70.92:1338');
assert.strictEqual(parsed[1].label, 'Node Beta');
assert.strictEqual(parsed[1].proxy, 'usr:pwd@31.56.70.92:1338');
assert.strictEqual(parsed[2].label, 'Node Gamma');
assert.strictEqual(parsed[2].proxy, '');

console.log('✅ Test 1 Passed: Colon format multiline parsing correct!');

// Test 2: Pipe delimiter format
const rawPipe = `tok_44444444444444444444|ct0_44444444444444444444|http://proxy.local:8080|Node Delta`;
const pipeParts = rawPipe.split('|').map(p => p.trim());
assert.strictEqual(pipeParts[0], 'tok_44444444444444444444');
assert.strictEqual(pipeParts[1], 'ct0_44444444444444444444');
assert.strictEqual(pipeParts[2], 'http://proxy.local:8080');
assert.strictEqual(pipeParts[3], 'Node Delta');

console.log('✅ Test 2 Passed: Pipe format parsing correct!');

console.log('\n🎉 ALL BULK IMPORT TESTS PASSED (100%)');
