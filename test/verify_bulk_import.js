const assert = require('assert');
const path = require('path');
const os = require('os');

// Redirect the DB to an isolated temp directory so tests never touch real user data
const config = require('../server/config');
config.DATA_DIR = path.join(os.tmpdir(), `x-sentinel-test-${Date.now()}`);
const db = require('../server/db');

console.log('🧪 Running Bulk Fleet Import Verification Tests...\n');

// Test 1: Parsing colon format lines
const rawTextColon = `
# Comment line should be ignored
tok_11111111111111111111:ct0_11111111111111111111:31.56.70.92:1338:Node Alpha
tok_22222222222222222222:ct0_22222222222222222222:usr:pwd@31.56.70.92:1338:Node Beta
tok_33333333333333333333:ct0_33333333333333333333:Node Gamma
`;

const parsed = db.parseBulkImportText(rawTextColon);
assert.strictEqual(parsed.length, 3, 'Should parse 3 non-comment lines');
assert.strictEqual(parsed[0].label, 'Node Alpha');
assert.strictEqual(parsed[0].proxy, '31.56.70.92:1338');
assert.strictEqual(parsed[1].label, 'Node Beta');
assert.strictEqual(parsed[1].proxy, 'usr:pwd@31.56.70.92:1338');
assert.strictEqual(parsed[2].label, 'Node Gamma');
assert.strictEqual(parsed[2].proxy, '');

console.log('✅ Test 1 Passed: Colon format multiline parsing correct!');

// Test 2: Pipe delimiter format
const rawPipe = `tok_44444444444444444444|ct0_44444444444444444444|http://proxy.local:8080|Node Delta`;
const parsedPipe = db.parseBulkImportText(rawPipe);
assert.strictEqual(parsedPipe.length, 1);
assert.strictEqual(parsedPipe[0].auth_token, 'tok_44444444444444444444');
assert.strictEqual(parsedPipe[0].ct0, 'ct0_44444444444444444444');
assert.strictEqual(parsedPipe[0].proxy, 'http://proxy.local:8080');
assert.strictEqual(parsedPipe[0].label, 'Node Delta');

console.log('✅ Test 2 Passed: Pipe format parsing correct!');

// Test 3: JSON array format
const parsedJson = db.parseBulkImportText(
  JSON.stringify([
    { auth_token: 'tok_json_aaaaaaaaaaaaaaaaaa', ct0: 'ct0_json', label: 'JSON Node' },
  ])
);
assert.strictEqual(parsedJson.length, 1);
assert.strictEqual(parsedJson[0].auth_token, 'tok_json_aaaaaaaaaaaaaaaaaa');
assert.strictEqual(parsedJson[0].label, 'JSON Node');

console.log('✅ Test 3 Passed: JSON array format parsing correct!');

// Test 4: bulkImportAccounts persists accounts and skips duplicates
const importedFirst = db.bulkImportAccounts(rawTextColon);
assert.strictEqual(importedFirst.length, 3, 'First import should add 3 accounts');
assert.ok(importedFirst[0].id.startsWith('acc_'), 'Account ID should use acc_ prefix');

const importedSecond = db.bulkImportAccounts(rawTextColon);
assert.strictEqual(importedSecond.length, 0, 'Duplicate tokens must be skipped on re-import');
assert.strictEqual(db.getAccounts().length, 3, 'No duplicate accounts stored');

console.log('✅ Test 4 Passed: Bulk import persists accounts & skips duplicates!');

// Test 5: exportAccounts round-trip (raw cookies + per-account comments)
const backup = db.exportAccounts();
assert.strictEqual(backup.app, 'x-sentinel');
assert.strictEqual(backup.accounts.length, 3);
assert.strictEqual(backup.accounts[0].auth_token, 'tok_11111111111111111111');
assert.ok(Array.isArray(backup.accounts[0].comments), 'Export should embed account comments');

console.log('✅ Test 5 Passed: Export backup round-trip correct!');

// Test 6: getComments / saveComments aliases (global fallback = templates)
const saved = db.saveComments(['Satu', 'Dua']);
assert.deepStrictEqual(db.getComments(), saved);
assert.deepStrictEqual(db.getComments(), db.getTemplates(), 'Comments alias templates');

console.log('✅ Test 6 Passed: Global comments aliases work!');

console.log('\n🎉 ALL BULK IMPORT TESTS PASSED (100%)');
