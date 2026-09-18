const assert = require('assert');
const {
  parseGraphQLResponse,
  checkToastAlert,
  createActionTracker,
} = require('../server/automation/bot/interactionEngine');

console.log('=== 🧪 VERIFYING GRAPHQL API INTERCEPTOR & ANTI-AUTOMATION ENGINE ===\n');

// -------------------------------------------------------------
// 1. Testing parseGraphQLResponse for RETWEET
// -------------------------------------------------------------
console.log('1. Testing Retweet (CreateRetweet) GraphQL Response Parsing:');

// 1a. Retweet Success
{
  const url = 'https://x.com/i/api/graphql/12345/CreateRetweet';
  const json = {
    data: {
      create_retweet: {
        retweet_results: {
          result: {
            rest_id: '1899123456789012345',
          },
        },
      },
    },
  };
  const parsed = parseGraphQLResponse(url, 200, json);
  assert.strictEqual(parsed.actionType, 'RETWEET');
  assert.strictEqual(parsed.success, true);
  assert.strictEqual(parsed.restId, '1899123456789012345');
  console.log('   ✅ [PASS] CreateRetweet Success parsed with valid rest_id');
}

// 1b. Retweet Error 226 (Anti-Automation Block)
{
  const url = 'https://x.com/i/api/graphql/12345/CreateRetweet';
  const json = {
    errors: [
      {
        message:
          "This request looks like it might be automated. To protect our users from spam and other malicious activity, we can't complete this action right now.",
        code: 226,
      },
    ],
  };
  const parsed = parseGraphQLResponse(url, 200, json);
  assert.strictEqual(parsed.actionType, 'RETWEET');
  assert.strictEqual(parsed.success, false);
  assert.strictEqual(parsed.isAutomated, true);
  assert.strictEqual(parsed.code, 226);
  assert(parsed.message.includes('automated'));
  console.log('   ✅ [PASS] CreateRetweet Error 226 flagged as isAutomated: true');
}

// 1c. Retweet Error 327 (Already Retweeted)
{
  const url = 'https://x.com/i/api/graphql/12345/CreateRetweet';
  const json = {
    errors: [
      {
        message: 'You have already retweeted this Tweet.',
        code: 327,
      },
    ],
  };
  const parsed = parseGraphQLResponse(url, 200, json);
  assert.strictEqual(parsed.actionType, 'RETWEET');
  assert.strictEqual(parsed.success, false);
  assert.strictEqual(parsed.isAlreadyDone, true);
  assert.strictEqual(parsed.code, 327);
  console.log('   ✅ [PASS] CreateRetweet Error 327 flagged as isAlreadyDone: true');
}

// -------------------------------------------------------------
// 2. Testing parseGraphQLResponse for REPLY / TWEET
// -------------------------------------------------------------
console.log('\n2. Testing Reply / Comment (CreateTweet) GraphQL Response Parsing:');

// 2a. CreateTweet Success
{
  const url = 'https://x.com/i/api/graphql/67890/CreateTweet';
  const json = {
    data: {
      create_tweet: {
        tweet_results: {
          result: {
            rest_id: '1900987654321098765',
            core: { user_results: {} },
          },
        },
      },
    },
  };
  const parsed = parseGraphQLResponse(url, 200, json);
  assert.strictEqual(parsed.actionType, 'TWEET');
  assert.strictEqual(parsed.success, true);
  assert.strictEqual(parsed.restId, '1900987654321098765');
  console.log('   ✅ [PASS] CreateTweet Success parsed with valid reply rest_id');
}

// 2b. CreateTweet Error 226 (Anti-Automation Block)
{
  const url = 'https://x.com/i/api/graphql/67890/CreateTweet';
  const json = {
    errors: [
      {
        message:
          "This request looks like it might be automated. To protect our users from spam and other malicious activity, we can't complete this action right now.",
        code: 226,
      },
    ],
  };
  const parsed = parseGraphQLResponse(url, 200, json);
  assert.strictEqual(parsed.actionType, 'TWEET');
  assert.strictEqual(parsed.success, false);
  assert.strictEqual(parsed.isAutomated, true);
  assert.strictEqual(parsed.code, 226);
  console.log('   ✅ [PASS] CreateTweet Error 226 flagged as isAutomated: true');
}

// 2c. CreateTweet Error 385 (Reply Restricted by Author)
{
  const url = 'https://x.com/i/api/graphql/67890/CreateTweet';
  const json = {
    errors: [
      {
        message: 'You cannot reply to this Tweet.',
        code: 385,
      },
    ],
  };
  const parsed = parseGraphQLResponse(url, 200, json);
  assert.strictEqual(parsed.actionType, 'TWEET');
  assert.strictEqual(parsed.success, false);
  assert.strictEqual(parsed.isAutomated, false);
  assert.strictEqual(parsed.code, 385);
  console.log('   ✅ [PASS] CreateTweet Error 385 (Restricted) parsed accurately');
}

// 2d. CreateTweet Error 344 (Daily Limit Reached / Phone Required)
{
  const url = 'https://x.com/i/api/graphql/67890/CreateTweet';
  const json = {
    errors: [
      {
        message:
          'Authorization: You have reached your daily limit for sending Tweets and messages. Please try again later.',
        code: 344,
      },
    ],
  };
  const parsed = parseGraphQLResponse(url, 200, json);
  assert.strictEqual(parsed.actionType, 'TWEET');
  assert.strictEqual(parsed.success, false);
  assert.strictEqual(parsed.isDailyLimit, true);
  assert.strictEqual(parsed.code, 344);
  console.log('   ✅ [PASS] CreateTweet Error 344 flagged as isDailyLimit: true');
}

// -------------------------------------------------------------
// 3. Testing parseGraphQLResponse for LIKE
// -------------------------------------------------------------
console.log('\n3. Testing Like (FavoriteTweet) GraphQL Response Parsing:');

// 3a. FavoriteTweet Success
{
  const url = 'https://x.com/i/api/graphql/11223/FavoriteTweet';
  const json = {
    data: {
      favorite_tweet: 'Done',
    },
  };
  const parsed = parseGraphQLResponse(url, 200, json);
  assert.strictEqual(parsed.actionType, 'LIKE');
  assert.strictEqual(parsed.success, true);
  console.log('   ✅ [PASS] FavoriteTweet Success parsed as success: true');
}

// 3b. FavoriteTweet Error 139 (Already Liked)
{
  const url = 'https://x.com/i/api/graphql/11223/FavoriteTweet';
  const json = {
    errors: [
      {
        message: 'You have already favorited this status.',
        code: 139,
      },
    ],
  };
  const parsed = parseGraphQLResponse(url, 200, json);
  assert.strictEqual(parsed.actionType, 'LIKE');
  assert.strictEqual(parsed.success, false);
  assert.strictEqual(parsed.isAlreadyDone, true);
  assert.strictEqual(parsed.code, 139);
  console.log('   ✅ [PASS] FavoriteTweet Error 139 flagged as isAlreadyDone: true');
}

// 3c. FavoriteTweet HTTP 403 Forbidden
{
  const url = 'https://x.com/i/api/graphql/11223/FavoriteTweet';
  const parsed = parseGraphQLResponse(url, 403, null);
  assert.strictEqual(parsed.actionType, 'LIKE');
  assert.strictEqual(parsed.success, false);
  assert.strictEqual(parsed.isAutomated, true);
  assert.strictEqual(parsed.code, 403);
  console.log('   ✅ [PASS] FavoriteTweet HTTP 403 flagged as automated block');
}

// -------------------------------------------------------------
// 4. Testing checkToastAlert UI Inspection
// -------------------------------------------------------------
console.log('\n4. Testing UI Toast Notification Detection:');

// 4a. English Automated Toast
(async () => {
  const mockPage = {
    async evaluate(fn) {
      global.document = {
        querySelectorAll: (sel) => {
          if (sel.includes('[data-testid="toast"]')) {
            return [
              {
                innerText:
                  "This request looks like it might be automated. To protect our users from spam and other malicious activity, we can't complete this action right now.",
              },
            ];
          }
          return [];
        },
      };
      try {
        return fn();
      } finally {
        delete global.document;
      }
    },
  };

  const toast = await checkToastAlert(mockPage);
  assert(toast !== null);
  assert.strictEqual(toast.isAutomated, true);
  assert.strictEqual(toast.isError, true);
  console.log(
    '   ✅ [PASS] Successfully detected English "This request looks like it might be automated" toast'
  );
})();

// 4b. Indonesian Automated Toast
(async () => {
  const mockPage = {
    async evaluate(fn) {
      global.document = {
        querySelectorAll: (sel) => {
          if (sel.includes('[data-testid="toast"]')) {
            return [
              {
                innerText:
                  'Permintaan ini tampaknya diotomatiskan. Untuk melindungi pengguna kami dari spam, kami tidak dapat menyelesaikan tindakan ini.',
              },
            ];
          }
          return [];
        },
      };
      try {
        return fn();
      } finally {
        delete global.document;
      }
    },
  };

  const toast = await checkToastAlert(mockPage);
  assert(toast !== null);
  assert.strictEqual(toast.isAutomated, true);
  assert.strictEqual(toast.isError, true);
  console.log(
    '   ✅ [PASS] Successfully detected Indonesian "Permintaan ini tampaknya diotomatiskan" toast'
  );
})();

// 4c. Generic Error Toast
(async () => {
  const mockPage = {
    async evaluate(fn) {
      global.document = {
        querySelectorAll: (sel) => {
          if (sel.includes('[data-testid="toast"]')) {
            return [
              {
                innerText: 'Something went wrong, but don’t fret — let’s give it another shot.',
              },
            ];
          }
          return [];
        },
      };
      try {
        return fn();
      } finally {
        delete global.document;
      }
    },
  };

  const toast = await checkToastAlert(mockPage);
  assert(toast !== null);
  assert.strictEqual(toast.isAutomated, false);
  assert.strictEqual(toast.isError, true);
  console.log('   ✅ [PASS] Successfully detected Generic "Something went wrong" toast');
})();

// 4d. Clean Page without Toast
(async () => {
  const mockPage = {
    async evaluate(fn) {
      global.document = {
        querySelectorAll: () => [],
      };
      try {
        return fn();
      } finally {
        delete global.document;
      }
    },
  };

  const toast = await checkToastAlert(mockPage);
  assert.strictEqual(toast, null);
  console.log('   ✅ [PASS] Clean page with no toasts returns null');
})();

// 4e. Daily Limit & Phone Requirement Sheet Dialog / Modal
(async () => {
  const mockPage = {
    async evaluate(fn) {
      global.document = {
        querySelectorAll: (sel) => {
          if (sel.includes('[data-testid="sheetDialog"]')) {
            return [
              {
                innerText:
                  'You have reached your daily limit for this action. Please add a phone number to your account to continue.',
              },
            ];
          }
          return [];
        },
      };
      try {
        return fn();
      } finally {
        delete global.document;
      }
    },
  };

  const alert = await checkToastAlert(mockPage);
  assert(alert !== null);
  assert.strictEqual(alert.isDailyLimit, true);
  assert.strictEqual(alert.isError, true);
  assert(alert.text.includes('daily limit'));
  console.log('   ✅ [PASS] Successfully detected "Daily limit / Add a phone" modal dialog');
})();

// -------------------------------------------------------------
// 5. Testing createActionTracker with Mock Page
// -------------------------------------------------------------
console.log('\n5. Testing createActionTracker Event Interception:');

(async () => {
  let registeredHandler = null;
  const mockPage = {
    on(event, handler) {
      if (event === 'response') registeredHandler = handler;
    },
    off(event, handler) {
      if (event === 'response' && registeredHandler === handler) registeredHandler = null;
    },
  };

  const tracker = createActionTracker(mockPage, 'RETWEET');
  assert(typeof registeredHandler === 'function', 'Should register response handler on page');

  // Simulate incoming GraphQL CreateRetweet Error 226 response
  const mockResponse = {
    url: () => 'https://x.com/i/api/graphql/abc/CreateRetweet',
    status: () => 200,
    async json() {
      return {
        errors: [{ message: 'This request looks like it might be automated.', code: 226 }],
      };
    },
  };

  await registeredHandler(mockResponse);

  const res = tracker.getResult();
  assert(res !== null, 'Tracker should capture result');
  assert.strictEqual(res.actionType, 'RETWEET');
  assert.strictEqual(res.isAutomated, true);
  assert.strictEqual(res.code, 226);
  console.log('   ✅ [PASS] createActionTracker intercepted and captured Error 226');

  tracker.cleanup();
  assert.strictEqual(
    registeredHandler,
    null,
    'Tracker should unregister response handler on cleanup'
  );
  console.log('   ✅ [PASS] Tracker cleaned up event listener cleanly');
})();

console.log('\n=== 🎉 ALL API INTERCEPTOR & ANTI-AUTOMATION TESTS PASSED ===');
