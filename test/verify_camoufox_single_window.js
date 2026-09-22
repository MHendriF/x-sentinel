const assert = require('assert');
const fs = require('fs');
const path = require('path');
const config = require('../server/config');
const twitterBot = require('../server/automation/twitterBot');
const { getContextPrimaryPage } = require('../server/automation/bot/browserFactory');

async function testPersistentContextPageCount() {
  console.log('🧪 Testing Camoufox Persistent Context Page Count Reproduction...');

  const testAccountId = 'test_camoufox_single_win';
  const profileDir = path.join(config.CAMOUFOX_PROFILES_DIR, testAccountId);
  fs.mkdirSync(profileDir, { recursive: true });

  const testAccount = {
    id: testAccountId,
    label: 'TestCamoufoxWin',
    username: 'test_camoufox_win',
    browserEngine: 'camoufox',
  };

  try {
    const page = await twitterBot.getOrCreatePageForAccount(testAccount, {
      headless: true,
      engine: 'camoufox',
    });

    assert.strictEqual(twitterBot.currentEngine, 'camoufox', 'Engine MUST be camoufox');
    const pages = twitterBot.context.pages();
    console.log(`Pages count in Camoufox persistent context: ${pages.length}`);

    // Failure reproduction: In unfixed code, pages.length is 2 because newPage() was called on an existing persistent context
    assert.strictEqual(
      pages.length,
      1,
      `Expected exactly 1 window/page in Camoufox persistent context, but found ${pages.length}`
    );
    assert.strictEqual(page, pages[0], 'Expected returned page to be the first existing page');

    console.log('✅ Camoufox persistent context maintained strictly 1 page.');
  } finally {
    await twitterBot.closeBrowser();
    if (fs.existsSync(profileDir)) {
      fs.rmSync(profileDir, { recursive: true, force: true });
    }
  }
}

async function testMockContextPagePruning() {
  console.log('🧪 Testing getContextPrimaryPage helper logic...');

  let closedCount = 0;
  const mockPage1 = { id: 1, setDefaultTimeout: () => {} };
  const mockPage2 = { id: 2, close: async () => { closedCount++; } };

  // Case 1: multiple existing pages -> prunes secondary
  const mockContextMulti = {
    pages: () => [mockPage1, mockPage2],
    newPage: async () => ({ id: 3 }),
  };
  const res1 = await getContextPrimaryPage(mockContextMulti);
  assert.strictEqual(res1.id, 1, 'Should return the first page');
  assert.strictEqual(closedCount, 1, 'Should have closed secondary page');

  // Case 2: empty pages (Chromium) -> calls newPage
  let newPageCalled = false;
  const mockContextEmpty = {
    pages: () => [],
    newPage: async () => {
      newPageCalled = true;
      return { id: 4, setDefaultTimeout: () => {} };
    },
  };
  const res2 = await getContextPrimaryPage(mockContextEmpty);
  assert.strictEqual(res2.id, 4);
  assert.strictEqual(newPageCalled, true, 'Should call newPage when no pages exist');

  console.log('✅ getContextPrimaryPage logic verified successfully.');
}

async function run() {
  try {
    await testMockContextPagePruning();
    await testPersistentContextPageCount();
    console.log('\n🎉 All Tests Passed: Camoufox single-window verified!');
  } catch (err) {
    console.error('\n❌ Test Failed:', err.message);
    process.exit(1);
  }
}

run();
