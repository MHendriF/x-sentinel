const assert = require('assert');
const fs = require('fs');
const path = require('path');
const config = require('../server/config');
const db = require('../server/db');
const {
  getProfileDir,
  hasCamoufoxProfile,
  getCamoufoxProfileStatus,
  deleteCamoufoxProfile,
} = require('../server/automation/bot/camoufoxLoginManager');

console.log('=== 🧪 VERIFYING CAMOUFOX DEDICATED PROFILE & LOGIN MANAGER ===\n');

// 1. Profile Directory Structure
console.log('1. Testing Camoufox Profile Directory Resolution:');
const testAccountId = 'test-node-profile-123';
const expectedDir = path.join(config.CAMOUFOX_PROFILES_DIR, testAccountId);
const resolvedDir = getProfileDir(testAccountId);
assert.strictEqual(resolvedDir, expectedDir, 'Resolved dir must match expected path');
console.log(`   ✅ [PASS] Profile dir resolved correctly: ${resolvedDir}`);

// 2. Status Detection on Non-Existent Profile
console.log('\n2. Testing Profile Status Detection (Empty State):');
// Ensure clean state
if (fs.existsSync(resolvedDir)) {
  fs.rmSync(resolvedDir, { recursive: true, force: true });
}
const statusEmpty = getCamoufoxProfileStatus(testAccountId);
assert.strictEqual(statusEmpty.exists, false);
assert.strictEqual(statusEmpty.sizeBytes, 0);
assert.strictEqual(hasCamoufoxProfile(testAccountId), false);
console.log('   ✅ [PASS] Non-existent profile accurately detected as exists: false');

// 3. Status Detection on Created Profile with Files
console.log('\n3. Testing Profile Status Detection with Mock Storage State:');
fs.mkdirSync(resolvedDir, { recursive: true });
fs.writeFileSync(path.join(resolvedDir, 'storage_state.json'), JSON.stringify({ cookies: [{ name: 'auth_token', value: 'xyz' }] }));
fs.writeFileSync(path.join(resolvedDir, 'prefs.js'), 'user_pref("privacy.resistFingerprinting", false);');

assert.strictEqual(hasCamoufoxProfile(testAccountId), true);
const statusFilled = getCamoufoxProfileStatus(testAccountId);
assert.strictEqual(statusFilled.exists, true);
assert.strictEqual(statusFilled.hasStorageState, true);
assert(statusFilled.sizeBytes > 0, 'Directory size must be greater than 0');
console.log(`   ✅ [PASS] Profile detected: exists: true, size: ${statusFilled.sizeFormatted}`);

// 4. Test Profile Deletion & DB Cleanup
console.log('\n4. Testing Profile Deletion & Account State Reset:');
// Create a mock account in DB
const mockAcc = db.saveAccount({
  id: testAccountId,
  label: 'Test Profile Node',
  auth_token: 'dummy_token_12345678901234567890',
  ct0: 'dummy_ct0',
  camoufoxProfile: {
    hasProfile: true,
    profileDir: resolvedDir,
    lastLoginAt: new Date().toISOString(),
  },
});

assert.strictEqual(mockAcc.camoufoxProfile.hasProfile, true);

const deleteRes = deleteCamoufoxProfile(testAccountId);
assert.strictEqual(deleteRes.success, true);
assert.strictEqual(fs.existsSync(resolvedDir), false, 'Profile directory must be deleted');

const refreshed = db.getAccountById(testAccountId);
assert.strictEqual(refreshed.camoufoxProfile, null, 'camoufoxProfile must be reset to null');
console.log('   ✅ [PASS] Camoufox profile directory & DB state cleanly removed');

// Cleanup mock account
db.deleteAccount(testAccountId);
console.log('   ✅ [PASS] Mock account cleaned up');

console.log('\n=== 🎉 ALL CAMOUFOX LOGIN MANAGER TESTS PASSED ===');
