const assert = require('assert');
const gov = require('../server/automation/rateGovernor');

console.log('=== 🧪 TESTING RATE GOVERNOR & CIRCUIT BREAKER ===\n');

// 1. Warmup Caps Test
console.log('1. Testing Warmup Caps (Days 1 to 7)...');
const day1Acc = { id: 'test_acc_1', warmupDay: 1, enabled: true };
const day2Acc = { id: 'test_acc_2', warmupDay: 2, enabled: true };
const day3Acc = { id: 'test_acc_3', warmupDay: 3, enabled: true };

assert.strictEqual(gov.canAct(day1Acc, 'LIKE').allowed, false, 'Day 1 should disallow LIKE');
assert.strictEqual(gov.canAct(day2Acc, 'LIKE').allowed, false, 'Day 2 should disallow LIKE');
assert.strictEqual(gov.canAct(day3Acc, 'LIKE').allowed, true, 'Day 3 should allow initial LIKE');
assert.strictEqual(gov.canAct(day3Acc, 'RETWEET').allowed, false, 'Day 3 should disallow RETWEET');
assert.strictEqual(gov.canAct(day3Acc, 'REPLY').allowed, false, 'Day 3 should disallow REPLY');
console.log('   Warmup gate check: PASSED ✅');

// Register 3 likes for day 3 account to hit day cap
for (let i = 0; i < 3; i++) {
  gov.registerAction(day3Acc, 'LIKE');
}
assert.strictEqual(gov.canAct(day3Acc, 'LIKE').allowed, false, 'Day 3 LIKE cap (3) reached');
console.log('   Warmup cap enforcement check: PASSED ✅');

// 2. Hourly Quota Test
console.log('\n2. Testing Hourly Sliding Window Quota...');
const normalAcc = { id: 'test_acc_normal', warmupDay: 8, enabled: true };
for (let i = 0; i < 10; i++) {
  assert.strictEqual(gov.canAct(normalAcc, 'LIKE').allowed, true, `Action ${i + 1} should be allowed`);
  gov.registerAction(normalAcc, 'LIKE');
}
const blocked = gov.canAct(normalAcc, 'LIKE');
assert.strictEqual(blocked.allowed, false, 'Should be blocked once quota (10) reached');
assert.strictEqual(blocked.reason, 'HOURLY_QUOTA', 'Block reason must be HOURLY_QUOTA');
assert.ok(blocked.retryInMs > 0, 'RetryInMs must be positive');
console.log('   Hourly quota check: PASSED ✅');

// 3. Strike & Cooldown Escalation Test
console.log('\n3. Testing Strike Escalation & Auto-Quarantine...');
const flaggedAcc = { id: 'test_acc_flagged', warmupDay: 8, enabled: true };

// Strike 1
const s1 = gov.registerFlag(flaggedAcc, 226);
assert.strictEqual(s1.strikes, 1, 'Strike count should be 1');
assert.strictEqual(s1.cooldownMs, 30 * 60 * 1000, 'Strike 1 cooldown should be 30m');
assert.strictEqual(gov.canAct(flaggedAcc, 'LIKE').allowed, false, 'Account should be in cooldown');
assert.strictEqual(gov.canAct(flaggedAcc, 'LIKE').reason, 'COOLDOWN');
console.log('   Strike 1 (30m cooldown): PASSED ✅');

// Strike 2
const s2 = gov.registerFlag(flaggedAcc, 226);
assert.strictEqual(s2.strikes, 2, 'Strike count should be 2');
assert.strictEqual(s2.cooldownMs, 60 * 60 * 1000, 'Strike 2 cooldown should be 60m (exponential)');
console.log('   Strike 2 (60m cooldown): PASSED ✅');

// Strike 3 -> Auto-disable
const s3 = gov.registerFlag(flaggedAcc, 344);
assert.strictEqual(s3.strikes, 3, 'Strike count should be 3');
assert.strictEqual(s3.disabled, true, 'Strike 3 must auto-disable node');
assert.strictEqual(flaggedAcc.enabled, false, 'account.enabled must be false');
assert.strictEqual(gov.canAct(flaggedAcc, 'LIKE').reason, 'NODE_DISABLED');
console.log('   Strike 3 (Auto-disable 48h): PASSED ✅');

// 4. Gaussian Pacing Delays Test
console.log('\n4. Testing Gaussian Pacing Delays...');
for (let i = 0; i < 20; i++) {
  const ivd = gov.interVectorDelay();
  assert.ok(ivd >= 45000 && ivd <= 180000, `Inter-vector delay within bounds: ${ivd}`);
  const asd = gov.accountSwitchDelay();
  assert.ok(asd >= 20000 && asd <= 180000, `Account switch delay within bounds: ${asd}`);
}
console.log('   Gaussian distribution bounds check: PASSED ✅');

console.log('\n=== ✅ ALL RATE GOVERNOR TESTS PASSED ===');
