const assert = require('assert');
const twitterBot = require('../server/automation/twitterBot');

async function testNetworkErrorDetection() {
  console.log('🧪 1. Testing isNetworkConnectionError helper...');

  const offlineErrors = [
    new Error('page.goto: NS_ERROR_NET_TIMEOUT'),
    new Error('page.goto: net::ERR_INTERNET_DISCONNECTED'),
    new Error('connect ECONNREFUSED 127.0.0.1:80'),
    new Error('getaddrinfo ENOTFOUND x.com'),
    new Error('Navigation attempt failed: ETIMEDOUT'),
    new Error('Proxy unreachable (ECONNRESET)'),
    new Error('TypeError: fetch failed'),
  ];

  for (const err of offlineErrors) {
    assert.strictEqual(
      twitterBot.isNetworkConnectionError(err),
      true,
      `Should recognize "${err.message}" as a network connection error`
    );
  }

  const logicErrors = [
    new Error('Like button not found on target page.'),
    new Error('Reply input field not accessible.'),
    new Error('Invalid password provided for account.'),
    new Error('Selector "div.tweet" timed out after 5000ms'),
  ];

  for (const err of logicErrors) {
    assert.strictEqual(
      twitterBot.isNetworkConnectionError(err),
      false,
      `Should NOT recognize "${err.message}" as a network connection error`
    );
  }

  console.log('✅ isNetworkConnectionError correctly differentiates network errors from application errors.');
}

async function testPauseResumeState() {
  console.log('\n🧪 2. Testing Pause & Resume state transitions...');

  // Reset state
  twitterBot.isRunning = true;
  twitterBot.isPaused = false;
  twitterBot.pauseReason = null;
  twitterBot.abortController = new AbortController();
  twitterBot.currentTask = {
    type: 'MULTI_BATCH',
    currentAction: 'CONNECTING',
  };

  // Pause
  const pauseResult = twitterBot.pauseTask('Connection Lost (NS_ERROR_NET_TIMEOUT)');
  assert.strictEqual(pauseResult, true, 'pauseTask should return true when task is running');
  assert.strictEqual(twitterBot.isPaused, true, 'isPaused should be true');
  assert.strictEqual(twitterBot.pauseReason, 'Connection Lost (NS_ERROR_NET_TIMEOUT)');
  assert.strictEqual(twitterBot.currentTask.isPaused, true);
  assert.strictEqual(twitterBot.currentTask.currentAction, 'PAUSED (Connection Lost (NS_ERROR_NET_TIMEOUT))');

  // getStatus reflects paused state
  const status = twitterBot.getStatus();
  assert.strictEqual(status.isPaused, true);
  assert.strictEqual(status.pauseReason, 'Connection Lost (NS_ERROR_NET_TIMEOUT)');

  // Async barrier checkPauseState
  let barrierResolved = false;
  const pausePromise = twitterBot.checkPauseState().then(() => {
    barrierResolved = true;
  });

  // Ensure it does not resolve while paused
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert.strictEqual(barrierResolved, false, 'Barrier must hold execution while isPaused is true');

  // Resume
  const resumeResult = twitterBot.resumeTask();
  assert.strictEqual(resumeResult, true, 'resumeTask should return true');
  assert.strictEqual(twitterBot.isPaused, false, 'isPaused should now be false');
  assert.strictEqual(twitterBot.pauseReason, null);

  await pausePromise;
  assert.strictEqual(barrierResolved, true, 'Barrier must resolve when resumeTask is called');

  console.log('✅ Pause & Resume barrier transitions verified successfully.');
}

async function testAbortWhilePaused() {
  console.log('\n🧪 3. Testing Abort signal while task is paused...');

  twitterBot.isRunning = true;
  twitterBot.isPaused = true;
  twitterBot.pauseReason = 'Manual pause';
  twitterBot.abortController = new AbortController();

  const pausePromise = twitterBot.checkPauseState();

  // Abort while paused
  twitterBot.stopTask();

  try {
    await pausePromise;
    assert.fail('checkPauseState should throw TASK_ABORTED when aborted while paused');
  } catch (err) {
    assert.strictEqual(err.message, 'TASK_ABORTED');
  }

  // Cleanup
  twitterBot.isRunning = false;
  twitterBot.isPaused = false;
  twitterBot.pauseReason = null;
  twitterBot.currentTask = null;

  console.log('✅ Abort while paused cleanly throws TASK_ABORTED without hanging.');
}

async function run() {
  try {
    await testNetworkErrorDetection();
    await testPauseResumeState();
    await testAbortWhilePaused();
    console.log('\n🎉 ALL PAUSE / RESUME UNIT TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('\n❌ Test failure:', err.message);
    process.exit(1);
  }
}

run();
