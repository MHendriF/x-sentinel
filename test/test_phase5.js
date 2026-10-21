const assert = require('assert');

console.log('=== 🧪 TESTING PHASE 5: ADVANCED RESILIENCY & BEHAVIORAL PROTOCOLS ===\n');

const gov = require('../server/automation/rateGovernor');

// 1. Testing Time-Of-Day & Quiet Hours
console.log('1. Testing Time-Of-Day Profile & Quiet Hours...');
const testAccTokyo = {
  id: 'acc_tokyo_node',
  username: 'TokyoNode',
  state: {
    timezoneId: 'Asia/Tokyo',
  },
};

// Test specific hours: 03:00 (night -> quiet) vs 15:00 (day -> active)
// UTC 18:00 is 03:00 AM next day in Asia/Tokyo (UTC+9)
const nightDate = new Date('2026-10-21T18:00:00Z');
// UTC 06:00 is 15:00 PM in Asia/Tokyo (UTC+9)
const dayDate = new Date('2026-10-21T06:00:00Z');

const nightCheck = gov.isQuietHour(testAccTokyo, nightDate);
assert.strictEqual(nightCheck.isQuiet, true, '03:00 AM local time must be flagged as Quiet Hours');
assert.strictEqual(nightCheck.localHour, 3, 'Local hour must resolve to 3 AM');

const dayCheck = gov.isQuietHour(testAccTokyo, dayDate);
assert.strictEqual(dayCheck.isQuiet, false, '15:00 PM local time must NOT be Quiet Hours');
assert.strictEqual(dayCheck.localHour, 15, 'Local hour must resolve to 15 PM');

console.log('   Time-of-day quiet hour resolver: PASSED ✅');

// 2. Testing Restriction Risk Score (0-100)
console.log('\n2. Testing Composite Restriction Risk Score (0-100)...');
const cleanAcc = {
  id: 'acc_clean',
  warmupDay: 7,
  state: {
    strikes: 0,
    windowHourly: [],
    dayCount: 0,
    cooldownUntil: 0,
  },
};

const riskyAcc = {
  id: 'acc_risky',
  warmupDay: 7,
  state: {
    strikes: 2,
    windowHourly: [Date.now(), Date.now() - 1000],
    dayCount: 40,
    cooldownUntil: Date.now() + 100000,
  },
};

const cleanScore = gov.calculateRiskScore(cleanAcc);
const riskyScore = gov.calculateRiskScore(riskyAcc);

assert.ok(typeof cleanScore === 'number', 'Risk score must be a number');
assert.ok(cleanScore >= 0 && cleanScore <= 30, `Clean account must have low risk score (got: ${cleanScore})`);
assert.ok(riskyScore >= 70 && riskyScore <= 100, `Risky account must have high risk score (got: ${riskyScore})`);

const snap = gov.snapshot(riskyAcc);
assert.strictEqual(snap.riskScore, riskyScore, 'Snapshot must include computed risk score');
console.log(`   Composite risk score check: PASSED ✅ (Clean: ${cleanScore}, Risky: ${riskyScore})`);

// 3. Testing Organic Filler Configuration
console.log('\n3. Testing Organic Filler Routine...');
const { performOrganicFiller } = require('../server/automation/bot/humanCadence');
assert.strictEqual(typeof performOrganicFiller, 'function', 'performOrganicFiller helper must be a function');
console.log('   Organic filler function availability check: PASSED ✅');

console.log('\n=== ✅ ALL PHASE 5 TESTS PASSED ===\n');
