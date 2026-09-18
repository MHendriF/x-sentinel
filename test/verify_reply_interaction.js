const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { humanType } = require('../server/automation/bot/humanCadence');
const interactionEngine = require('../server/automation/bot/interactionEngine');
const tweetComposer = require('../server/automation/bot/tweetComposer');
const db = require('../server/db');

async function testHumanTypeWithKeyboard() {
  console.log('Testing humanType with page.keyboard...');
  let typedKeys = [];
  let focused = false;

  const mockPage = {
    keyboard: {
      type: async (char) => {
        typedKeys.push(char);
      },
      press: async () => {},
    },
  };

  const mockElement = {
    focus: async () => {
      focused = true;
    },
    type: async () => {
      throw new Error('Should not use element.type when page.keyboard is available');
    },
  };

  await humanType(mockElement, 'Hello', null, mockPage);
  assert.strictEqual(focused, true, 'Element should have been focused');
  assert.strictEqual(typedKeys.join(''), 'Hello', 'Chars should be typed via page.keyboard');
  console.log('✅ humanType with page.keyboard passed');
}

async function testHumanTypeAbort() {
  console.log('Testing humanType abort signal...');
  const controller = new AbortController();
  controller.abort();

  const mockPage = {
    keyboard: {
      type: async () => {},
    },
  };
  const mockElement = {
    focus: async () => {},
  };

  try {
    await humanType(mockElement, 'ShouldAbort', controller.signal, mockPage);
    assert.fail('Should have thrown TASK_ABORTED');
  } catch (err) {
    assert.strictEqual(err.message, 'TASK_ABORTED');
  }
  console.log('✅ humanType abort passed');
}

async function testHistoryEngineRecording() {
  console.log('Testing db history engine field persistence...');
  const testAccount = {
    id: 'acc_test_engine_1',
    label: 'Test Node Engine',
  };

  const testTweetId = 'test_engine_verify_999999';

  try {
    db.addHistory({
      accountId: testAccount.id,
      accountName: testAccount.label,
      tweetUrl: `https://x.com/test/status/${testTweetId}`,
      tweetId: testTweetId,
      action: 'COMMENT',
      status: 'SUCCESS',
      details: 'Great insights!',
      engine: 'camoufox',
    });

    const history = db.getHistory(5);
    const matched = history.find((h) => h.tweetId === testTweetId);
    assert(matched, 'History entry should exist');
    assert.strictEqual(matched.engine, 'camoufox', 'Engine field should be preserved');
    console.log('✅ db history engine recording passed');
  } finally {
    // Clean up test entry from history file to avoid test pollution
    const historyFile = path.resolve(__dirname, '../data/history.json');
    if (fs.existsSync(historyFile)) {
      try {
        const raw = fs.readFileSync(historyFile, 'utf8');
        const data = JSON.parse(raw);
        const filtered = data.filter((h) => h.tweetId !== testTweetId);
        fs.writeFileSync(historyFile, JSON.stringify(filtered, null, 2));
      } catch (_e) {
        // Ignore cleanup failure in test
      }
    }
  }
}

async function testSignatures() {
  console.log('Testing function signatures and exports...');
  assert(typeof interactionEngine.commentTweet === 'function', 'commentTweet should be a function');
  assert(typeof interactionEngine.likeTweet === 'function', 'likeTweet should be a function');
  assert(typeof interactionEngine.retweetTweet === 'function', 'retweetTweet should be a function');
  assert(typeof interactionEngine.processTweetWithAccount === 'function', 'processTweetWithAccount should be a function');
  assert(typeof tweetComposer.createPost === 'function', 'createPost should be a function');
  console.log('✅ function signatures verified');
}

async function run() {
  await testHumanTypeWithKeyboard();
  await testHumanTypeAbort();
  await testHistoryEngineRecording();
  await testSignatures();
  console.log('\n🎉 ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!');
}

run().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
