const assert = require('assert');

console.log('=== 🧪 TESTING WARMUP GATE TOGGLE (OPTION B) ===\n');

const db = require('../server/db');
const gov = require('../server/automation/rateGovernor');
const twitterBot = require('../server/automation/twitterBot');

const accDay1 = {
  id: 'acc_test_day1',
  username: 'Day1User',
  enabled: true,
  warmupDay: 1,
  state: {
    strikes: 0,
    windowHourly: [],
    dayCount: 0,
    cooldownUntil: 0,
    timezoneId: 'Asia/Jakarta',
  },
};

// 1. Test with enforceWarmupGate = false
console.log('1. Testing with enforceWarmupGate = false (Option B)...');
db.saveSettings({ enforceWarmupGate: false });

const eligibleDisabled = twitterBot.filterEligibleAccounts([accDay1]);
assert.strictEqual(eligibleDisabled.length, 1, 'Day 1 account MUST be eligible when enforceWarmupGate is false');

const gateDisabled = gov.canAct(accDay1, 'LIKE', { ignoreQuietHours: true });
assert.strictEqual(gateDisabled.allowed, true, 'canAct must allow LIKE when enforceWarmupGate is false');
console.log('   Bypass check with enforceWarmupGate = false: PASSED ✅');

// 2. Test with enforceWarmupGate = true
console.log('\n2. Testing with enforceWarmupGate = true (Strict Mode)...');
db.saveSettings({ enforceWarmupGate: true });

const eligibleEnabled = twitterBot.filterEligibleAccounts([accDay1]);
assert.strictEqual(eligibleEnabled.length, 0, 'Day 1 account MUST be filtered out when enforceWarmupGate is true');

const gateEnabled = gov.canAct(accDay1, 'LIKE', { ignoreQuietHours: true });
assert.strictEqual(gateEnabled.allowed, false, 'canAct must block LIKE on Day 1 when enforceWarmupGate is true');
assert.strictEqual(gateEnabled.reason, 'WARMUP_DAY_1_LIKE_CAP');
console.log('   Strict check with enforceWarmupGate = true: PASSED ✅');

// Set back to false as requested by the user
db.saveSettings({ enforceWarmupGate: false });
console.log('\n=== ✅ ALL WARMUP TOGGLE TESTS PASSED ===\n');
