const assert = require('assert');
const {
  normalizeTweetUrl,
  checkAlreadyLiked,
  findLikeButton,
  findLikeInGroup,
  findTargetTweetArticle,
  handlePageInterstitials,
  checkAlreadyRetweeted,
  findRetweetButton,
  findRetweetInGroup,
  checkRepliesRestricted,
  findReplyButtonInGroup,
} = require('../server/automation/bot/interactionEngine');
const cookieManager = require('../server/automation/cookieManager');

console.log('=== 🧪 VERIFYING ENHANCED LIKE & ENGAGEMENT ENGINE ===\n');

// 1. URL Normalization Tests
console.log('1. Testing Tweet URL Normalization:');
const urlCases = [
  {
    input: 'https://twitter.com/elonmusk/status/188472918239129',
    expected: 'https://x.com/i/status/188472918239129',
    desc: 'Converts legacy twitter.com to canonical x.com/i/status',
  },
  {
    input: 'https://x.com/someone/status/987654321?s=20&t=xyz',
    expected: 'https://x.com/i/status/987654321',
    desc: 'Strips tracking query parameters (?s=20&t=xyz)',
  },
  {
    input: 'https://x.com/user/status/1122334455/photo/1',
    expected: 'https://x.com/i/status/1122334455',
    desc: 'Strips /photo/1 lightbox modal segment',
  },
  {
    input: 'https://x.com/user/status/1122334455/video/1',
    expected: 'https://x.com/i/status/1122334455',
    desc: 'Strips /video/1 lightbox modal segment',
  },
  {
    input: 'https://twitter.com/explore',
    expected: 'https://x.com/explore',
    desc: 'Converts general twitter.com to x.com',
  },
];

urlCases.forEach((tc) => {
  const result = normalizeTweetUrl(tc.input);
  assert.strictEqual(result, tc.expected, `Failed for ${tc.input}`);
  console.log(`   ✅ [PASS] ${tc.desc}`);
  console.log(`            Input:    ${tc.input}`);
  console.log(`            Expected: ${tc.expected}`);
});

// 2. Cookie Domain Coverage Tests
console.log('\n2. Testing Cookie Manager Domain Coverage:');
const testCookies = cookieManager.getPlaywrightCookies('valid_auth_token_1234567890', 'valid_ct0_1234567890');
const generatedDomains = [...new Set(testCookies.map((c) => c.domain))].sort();
const expectedDomains = ['.twitter.com', '.x.com', 'twitter.com', 'x.com'].sort();
assert.deepStrictEqual(generatedDomains, expectedDomains, 'Expected cookies for .x.com, x.com, .twitter.com, and twitter.com');
console.log(`   ✅ [PASS] All 4 required domains covered: ${generatedDomains.join(', ')} (${testCookies.length} cookies generated)`);

// 3. Mock DOM & Selector Logic Tests
console.log('\n3. Testing Like Engine Multi-Layer Selectors with Mock DOM:');

// Helper to create mock element
function createMockElement(attributes = {}, innerSvgs = [], computedStyle = {}, children = []) {
  return {
    getAttribute(attr) {
      return attributes[attr] || null;
    },
    async evaluate(fn) {
      const mockEl = {
        getAttribute: (a) => attributes[a] || null,
        querySelectorAll: (selector) => {
          if (selector === 'svg') return innerSvgs;
          return [];
        },
        querySelector: (selector) => {
          for (const child of children) {
            if (selector.includes('unlike') && child.getAttribute('data-testid') === 'unlike') return child;
            if (selector.includes('disukai') && (child.getAttribute('aria-label') || '').toLowerCase().includes('disukai')) return child;
          }
          return null;
        },
        closest: () => ({}),
      };
      // Emulate window.getComputedStyle
      const origWindow = global.window;
      global.window = {
        getComputedStyle: () => computedStyle,
      };
      try {
        return fn(mockEl);
      } finally {
        global.window = origWindow;
      }
    },
    async $(selector) {
      for (const child of children) {
        const testid = (child.getAttribute('data-testid') || '').toLowerCase();
        const aria = (child.getAttribute('aria-label') || '').toLowerCase();
        if (selector.includes('unlike') && testid === 'unlike') return child;
        if (selector.includes('disukai') && aria.includes('disukai')) return child;
        if (selector.includes('batal suka') && aria.includes('batal suka')) return child;
        if (selector.includes('like') && testid === 'like') return child;
        if (selector.includes('suka') && aria.includes('suka')) return child;
        if (selector.includes('unretweet') && testid === 'unretweet') return child;
        if (selector.includes('reposted') && aria.includes('reposted')) return child;
        if (selector.includes('diposting ulang') && aria.includes('diposting ulang')) return child;
        if (selector.includes('retweet') && testid === 'retweet') return child;
        if (selector.includes('reply') && testid === 'reply') return child;
      }
      return null;
    },
    async $$(_selector) {
      return children;
    },
    async scrollIntoViewIfNeeded() {},
  };
}

// Case 3a: Post Already Liked via English 'data-testid="unlike"'
(async () => {
  const mockUnlikeBtn = createMockElement({ 'data-testid': 'unlike', 'aria-label': 'Liked' });
  const mockArticle = createMockElement({}, [], {}, [mockUnlikeBtn]);
  const mockPage = { async $(_sel) { return null; } };

  const detected = await checkAlreadyLiked(mockArticle, mockPage);
  assert(detected !== null, 'Should detect already liked via unlike testid');
  console.log('   ✅ [PASS] Successfully detected Already Liked via data-testid="unlike"');
})();

// Case 3b: Post Already Liked via Indonesian aria-label="Disukai"
(async () => {
  const mockDisukaiBtn = createMockElement({ role: 'button', 'aria-label': 'Disukai' });
  const mockArticle = createMockElement({}, [], {}, [mockDisukaiBtn]);
  const mockPage = { async $(_sel) { return null; } };

  const detected = await checkAlreadyLiked(mockArticle, mockPage);
  assert(detected !== null, 'Should detect already liked via Indonesian Disukai aria-label');
  console.log('   ✅ [PASS] Successfully detected Already Liked via Indonesian aria-label="Disukai"');
})();

// Case 3c: Post Already Liked via lowercase Indonesian aria-label="Batal suka"
(async () => {
  const mockBatalBtn = createMockElement({ role: 'button', 'aria-label': 'Batal suka' });
  const mockArticle = createMockElement({}, [], {}, [mockBatalBtn]);
  const mockPage = { async $(_sel) { return null; } };

  const detected = await checkAlreadyLiked(mockArticle, mockPage);
  assert(detected !== null, 'Should detect already liked via case-insensitive "Batal suka"');
  console.log('   ✅ [PASS] Successfully detected Already Liked via case-insensitive "Batal suka"');
})();

// Case 3d: Post Unliked with standard Like button
(async () => {
  const mockLikeBtn = createMockElement({ 'data-testid': 'like', 'aria-label': 'Like' });
  const mockArticle = createMockElement({}, [], {}, [mockLikeBtn]);
  const mockPage = { async $(_sel) { return null; } };

  const btn = await findLikeButton(mockArticle, mockPage);
  assert(btn !== null, 'Should find like button via data-testid="like"');
  console.log('   ✅ [PASS] Successfully found unliked button via data-testid="like"');
})();

// Case 3e: Post Unliked with Indonesian div[role="button"][aria-label="Suka"]
(async () => {
  const mockIndoLikeBtn = createMockElement({ role: 'button', 'aria-label': 'Suka' });
  const mockArticle = createMockElement({}, [], {}, [mockIndoLikeBtn]);
  const mockPage = { async $(_sel) { return null; } };

  const btn = await findLikeButton(mockArticle, mockPage);
  assert(btn !== null, 'Should find like button via Indonesian aria-label="Suka"');
  console.log('   ✅ [PASS] Successfully found unliked button via Indonesian aria-label="Suka"');
})();

// Case 3f: Structural Fallback - Group inspection finding Heart SVG
(async () => {
  const mockHeartSvg = {
    querySelectorAll: (s) => (s === 'path' ? [{ getAttribute: (a) => (a === 'd' ? 'M16.697 5.5c-1.222-...' : null) }] : []),
  };
  const mockUnknownBtn = createMockElement({ role: 'button' }, [mockHeartSvg]);
  const mockGroup = createMockElement({ role: 'group' }, [], {}, [mockUnknownBtn]);
  const mockArticle = {
    async $(sel) {
      if (sel === 'div[role="group"]') return mockGroup;
      return null;
    },
    async scrollIntoViewIfNeeded() {},
  };

  const btn = await findLikeInGroup(mockArticle);
  assert(btn !== null, 'Should find like button inside group via Twitter heart SVG path (16.697)');
  console.log('   ✅ [PASS] Structural fallback: Found Like button via Twitter Heart SVG path signature (16.697)');
})();

// Case 3g: Interstitial state detection (Deleted / Unavailable Tweet)
(async () => {
  const mockPageWithDeletedTweet = {
    async $(_sel) { return null; },
    async evaluate(fn) {
      global.document = { body: { innerText: 'This Post was deleted by the Post author.' } };
      try {
        return fn();
      } finally {
        delete global.document;
      }
    },
  };

  const status = await handlePageInterstitials(mockPageWithDeletedTweet);
  assert.strictEqual(status.isUnavailable, true, 'Should detect deleted tweet as unavailable');
  console.log('   ✅ [PASS] Successfully identified deleted tweet notice and flagged as UNAVAILABLE');
})();

// Case 3h: Target Tweet Article Isolation
(async () => {
  const mockTargetTweet = createMockElement({ 'data-testid': 'tweet' });
  const mockPage = {
    async $(sel) {
      if (sel.includes('188472918239129')) return mockTargetTweet;
      return null;
    },
  };

  const found = await findTargetTweetArticle(mockPage, '188472918239129');
  assert.strictEqual(found, mockTargetTweet, 'Should isolate target tweet by ID');
  console.log('   ✅ [PASS] Target article isolation: Correctly identified article matching tweetId');
})();

// 4. Retweet / Repost Tests
console.log('\n4. Testing Retweet / Repost Multi-Layer Selectors:');

// Case 4a: Retweet Already Done via 'Reposted' aria-label
(async () => {
  const mockUnretweetBtn = createMockElement({ 'data-testid': 'unretweet', 'aria-label': '1 Repost. Reposted' });
  const mockArticle = createMockElement({}, [], {}, [mockUnretweetBtn]);
  const mockPage = { async $(_sel) { return null; } };

  const detected = await checkAlreadyRetweeted(mockArticle, mockPage);
  assert(detected !== null, 'Should detect already reposted via Reposted aria-label');
  console.log('   ✅ [PASS] Successfully detected Already Reposted via aria-label="1 Repost. Reposted"');
})();

// Case 4b: Retweet Already Done via Indonesian 'Diposting ulang'
(async () => {
  const mockIndoUnretweet = createMockElement({ role: 'button', 'aria-label': 'Diposting ulang' });
  const mockArticle = createMockElement({}, [], {}, [mockIndoUnretweet]);
  const mockPage = { async $(_sel) { return null; } };

  const detected = await checkAlreadyRetweeted(mockArticle, mockPage);
  assert(detected !== null, 'Should detect already reposted via Indonesian Diposting ulang');
  console.log('   ✅ [PASS] Successfully detected Already Reposted via Indonesian aria-label="Diposting ulang"');
})();

// Case 4c: Find Retweet Button via standard data-testid="retweet"
(async () => {
  const mockRetweetBtn = createMockElement({ 'data-testid': 'retweet', 'aria-label': 'Repost' });
  const mockArticle = createMockElement({}, [], {}, [mockRetweetBtn]);
  const mockPage = { async $(_sel) { return null; } };

  const btn = await findRetweetButton(mockArticle, mockPage);
  assert(btn !== null, 'Should find retweet button via data-testid="retweet"');
  console.log('   ✅ [PASS] Successfully found un-retweeted button via data-testid="retweet"');
})();

// Case 4d: Find Retweet Button via Twitter Retweet Arrow SVG Signature (4.5 3.88)
(async () => {
  const mockRetweetSvg = {
    querySelectorAll: (s) => (s === 'path' ? [{ getAttribute: (a) => (a === 'd' ? 'M4.5 3.88l4.432 4.14-...' : null) }] : []),
  };
  const mockRetweetItem = createMockElement({ role: 'button' }, [mockRetweetSvg]);
  const mockGroup = createMockElement({ role: 'group' }, [], {}, [mockRetweetItem]);
  const mockArticle = {
    async $(sel) {
      if (sel === 'div[role="group"]') return mockGroup;
      return null;
    },
    async scrollIntoViewIfNeeded() {},
  };

  const btn = await findRetweetInGroup(mockArticle);
  assert(btn !== null, 'Should find retweet button in group via Twitter Retweet arrows SVG path signature (4.5 3.88)');
  console.log('   ✅ [PASS] Structural fallback: Found Retweet button via Twitter Retweet arrows SVG signature (4.5 3.88)');
})();

// 5. Reply / Comment Tests
console.log('\n5. Testing Reply / Comment Multi-Layer Selectors & Restrictions:');

// Case 5a: Detect Author Reply Restriction
(async () => {
  const mockRestrictedPage = {
    async evaluate(fn) {
      global.document = { body: { innerText: 'Who can reply? Accounts @elonmusk follows or mentioned can reply' } };
      try {
        return fn();
      } finally {
        delete global.document;
      }
    },
  };

  const isRestricted = await checkRepliesRestricted(mockRestrictedPage);
  assert.strictEqual(isRestricted, true, 'Should detect reply restriction banner');
  console.log('   ✅ [PASS] Successfully detected author reply restriction ("Who can reply? Accounts...")');
})();

// Case 5b: Find Reply button via Speech Bubble SVG Path Signature (1.751 10)
(async () => {
  const mockBubbleSvg = {
    querySelectorAll: (s) => (s === 'path' ? [{ getAttribute: (a) => (a === 'd' ? 'M1.751 10c0-4.42 3.584-8 8.005-8h4.366...' : null) }] : []),
  };
  const mockReplyItem = createMockElement({ role: 'button' }, [mockBubbleSvg]);
  const mockGroup = createMockElement({ role: 'group' }, [], {}, [mockReplyItem]);
  const mockArticle = {
    async $(sel) {
      if (sel === 'div[role="group"]') return mockGroup;
      return null;
    },
    async scrollIntoViewIfNeeded() {},
  };

  const btn = await findReplyButtonInGroup(mockArticle);
  assert(btn !== null, 'Should find reply button via Twitter speech bubble SVG path signature (1.751)');
  console.log('   ✅ [PASS] Structural fallback: Found Reply button via Twitter speech bubble SVG signature (1.751)');
})();

// Case 5c: Find Reply button via Indonesian 'balas' aria-label
(async () => {
  const mockIndoReplyItem = createMockElement({ role: 'button', 'aria-label': 'Balas postingan' });
  const mockGroup = createMockElement({ role: 'group' }, [], {}, [mockIndoReplyItem]);
  const mockArticle = {
    async $(sel) {
      if (sel === 'div[role="group"]') return mockGroup;
      return null;
    },
    async scrollIntoViewIfNeeded() {},
  };

  const btn = await findReplyButtonInGroup(mockArticle);
  assert(btn !== null, 'Should find reply button via Indonesian aria-label="Balas postingan"');
  console.log('   ✅ [PASS] Successfully found Reply button via Indonesian aria-label="Balas postingan"');
})();

console.log('\n=== 🎉 ALL INTERACTION ENGINE VERIFICATION TESTS PASSED SUCCESSFULLY ===');
