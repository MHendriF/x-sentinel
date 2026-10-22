const assert = require('assert');
const targetLock = require('../server/automation/targetLock');
const gov = require('../server/automation/rateGovernor');

console.log('=== 🧪 TESTING PHASE 2: ADAPTIVE PACING & TARGET LOCK ===\n');

// 1. TargetLock Tests
console.log('1. Testing TargetLock Coordination...');
targetLock.clear();
targetLock.setCrossNodeLock(true);

const tweet1 = '1846573829102938475';
const accA = 'acc_alpha';
const accB = 'acc_beta';

// Node A acquires lock on tweet1
const lockA = targetLock.acquire(tweet1, accA, { kind: 'ENGAGE' });
assert.strictEqual(lockA.ok, true, 'Node A should acquire initial target lock');

// Node B tries to acquire same tweet1 -> must be rejected
const lockB = targetLock.acquire(tweet1, accB, { kind: 'ENGAGE' });
assert.strictEqual(lockB.ok, false, 'Node B should be blocked from locked target');
assert.strictEqual(lockB.reason, 'TARGET_LOCKED_BY_ANOTHER_NODE');
assert.strictEqual(lockB.lockedBy, accA);
assert.ok(lockB.freeInMs > 0, 'freeInMs must be positive');
console.log('   Collision prevention between 2 nodes: PASSED ✅');

// Reply mode has 15m TTL
const tweet2 = '1846573829102938999';
targetLock.acquire(tweet2, accA, { kind: 'REPLY' });
const lockBReply = targetLock.acquire(tweet2, accB, { kind: 'REPLY' });
assert.strictEqual(lockBReply.ok, false);
assert.ok(lockBReply.freeInMs > 13 * 60 * 1000, 'Reply lock TTL should be ~15 minutes');
console.log('   Reply 15-minute TTL lock: PASSED ✅');

// Early release test
targetLock.release(tweet1, accA);
const lockBAfterRelease = targetLock.acquire(tweet1, accB, { kind: 'ENGAGE' });
assert.strictEqual(lockBAfterRelease.ok, true, 'Node B should acquire lock after Node A releases');
console.log('   Early lock release check: PASSED ✅');

// Pruning test
const snap = targetLock.snapshot();
assert.ok(typeof snap.activeTargets === 'number', 'Snapshot returns activeTargets count');
assert.ok(typeof snap.totalLocks === 'number', 'Snapshot returns totalLocks count');
console.log('   Snapshot & pruning check: PASSED ✅');

// Cross-Node Lock Toggle Tests
const tweet3 = '1846573829102939111';
targetLock.acquire(tweet3, accA, { kind: 'ENGAGE' });

// Case 1: Disabled via options -> Node B can engage same target
const lockBWithDisabledOption = targetLock.acquire(tweet3, accB, {
  kind: 'ENGAGE',
  crossNodeTargetLock: false,
});
assert.strictEqual(
  lockBWithDisabledOption.ok,
  true,
  'Node B should acquire lock when crossNodeTargetLock is false via options'
);

// Same-node duplicate check must still be enforced even when crossNodeTargetLock is false
const lockAAgain = targetLock.acquire(tweet3, accA, {
  kind: 'ENGAGE',
  crossNodeTargetLock: false,
});
assert.strictEqual(lockAAgain.ok, false, 'Node A cannot engage same target twice');
assert.strictEqual(lockAAgain.reason, 'TARGET_ALREADY_ENGAGED_BY_THIS_NODE');
console.log('   Disable via options + same-node duplicate safeguard: PASSED ✅');

// Case 2: Disabled via targetLock.setCrossNodeLock(false)
const tweet4 = '1846573829102939222';
targetLock.setCrossNodeLock(false);
targetLock.acquire(tweet4, accA, { kind: 'ENGAGE' });
const lockBInstanceDisabled = targetLock.acquire(tweet4, accB, { kind: 'ENGAGE' });
assert.strictEqual(
  lockBInstanceDisabled.ok,
  true,
  'Node B should acquire lock when instance crossNodeLock is disabled'
);

// Enforce lock again explicitly
targetLock.setCrossNodeLock(true);
const tweet5 = '1846573829102939333';
targetLock.acquire(tweet5, accA, { kind: 'ENGAGE' });
const lockBEnforcedAgain = targetLock.acquire(tweet5, accB, { kind: 'ENGAGE' });
assert.strictEqual(lockBEnforcedAgain.ok, false);
assert.strictEqual(lockBEnforcedAgain.reason, 'TARGET_LOCKED_BY_ANOTHER_NODE');
console.log('   Cross-node lock enable/disable state toggle: PASSED ✅');

// Case 3: Clearing all locks
targetLock.clear();
const snapAfterClear = targetLock.snapshot();
assert.strictEqual(snapAfterClear.totalLocks, 0, 'Total locks must be 0 after clear()');
assert.strictEqual(snapAfterClear.activeTargets, 0, 'Active targets must be 0 after clear()');
console.log('   Clear target locks check: PASSED ✅');

// 2. Rate Limit Headers Handling Tests
console.log('\n2. Testing X-Rate-Limit Headers Handling in Rate Governor...');
const testAccount = { id: 'test_node_rate', label: 'RateNode', warmupDay: 8, enabled: true };

// Case A: Quota exhausted (remaining = 0, reset epoch)
const resetEpochSec = Math.floor(Date.now() / 1000) + 900; // 15 mins from now
gov.handleRateLimitHeaders(testAccount, {
  limit: 50,
  remaining: 0,
  reset: resetEpochSec,
  retryAfter: null,
});

assert.strictEqual(gov.canAct(testAccount, 'LIKE').allowed, false, 'Account should be in cooldown after remaining = 0');
assert.strictEqual(gov.canAct(testAccount, 'LIKE').reason, 'COOLDOWN');
assert.ok(testAccount.state.cooldownUntil >= resetEpochSec * 1000, 'cooldownUntil must align with reset epoch');
console.log('   Remaining = 0 reset epoch backoff: PASSED ✅');

// Case B: retry-after header
const testAccount2 = { id: 'test_node_retry', label: 'RetryNode', warmupDay: 8, enabled: true };
gov.handleRateLimitHeaders(testAccount2, {
  limit: 50,
  remaining: 10,
  reset: null,
  retryAfter: 120, // 2 minutes
});

assert.strictEqual(gov.canAct(testAccount2, 'LIKE').allowed, false, 'Account should be in cooldown from retry-after');
assert.strictEqual(gov.canAct(testAccount2, 'LIKE').reason, 'COOLDOWN');
assert.ok(testAccount2.state.cooldownUntil >= Date.now() + 110 * 1000, 'cooldownUntil must match retry-after');
console.log('   Retry-After header direct adherence: PASSED ✅');

// 3. Adaptive Pacing Multiplier Test
console.log('\n3. Testing Adaptive Delay Multiplier...');
let totalNormal = 0;
let totalStretched = 0;
for (let i = 0; i < 30; i++) {
  const norm = gov.interVectorDelay(1);
  const stretch = gov.interVectorDelay(2.5);
  assert.ok(norm >= 45000 && norm <= 180000, `Normal delay within bounds: ${norm}`);
  assert.ok(stretch >= 45000 * 2.5 && stretch <= 180000 * 2.5, `Stretched delay within bounds: ${stretch}`);
  totalNormal += norm;
  totalStretched += stretch;
}
const avgNormal = totalNormal / 30;
const avgStretched = totalStretched / 30;
assert.ok(
  avgStretched > avgNormal * 1.8,
  `Stretched delay average (${avgStretched}) should be ~2.5x base average (${avgNormal})`
);
console.log('   Adaptive multiplier scaling (30-sample average): PASSED ✅');

console.log('\n=== ✅ ALL PHASE 2 TESTS PASSED ===');
