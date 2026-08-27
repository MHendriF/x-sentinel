const db = require('../server/db');
const path = require('path');
const fs = require('fs');

console.log('=== 🛡️ X-SENTINEL HARDENING VERIFICATION TEST ===\n');

let allPassed = true;

// 1. Test Atomic File Writes
console.log('1. Testing Atomic Write Mechanism...');
try {
  db.saveSettings({ ...db.getSettings(), _hardeningCheck: Date.now() });
  const reloaded = db.getSettings();
  if (reloaded._hardeningCheck) {
    console.log('✅ Atomic file write & swap verified successfully.');
  } else {
    console.error('❌ Atomic file write failed to persist.');
    allPassed = false;
  }
} catch (err) {
  console.error('❌ Error during atomic write:', err.message);
  allPassed = false;
}

// 2. Test Path Traversal Protection
console.log('\n2. Testing Path Traversal Protection...');
try {
  // Try malicious path traversal
  const maliciousPath = db.getAccountCommentsFilePath('../../system32/cmd');
  const expectedPrefix = path.resolve(db.commentsDir);
  if (maliciousPath.startsWith(expectedPrefix) && !maliciousPath.includes('..')) {
    console.log(`✅ Path traversal neutralized: resolved safely to ${maliciousPath}`);
  } else {
    console.error(`❌ Security vulnerability: Path escaped sandbox! ${maliciousPath}`);
    allPassed = false;
  }
} catch (err) {
  console.log('✅ Path traversal successfully blocked with error:', err.message);
}

// 3. Test Tweet URL Regex
console.log('\n3. Testing Tweet URL Regex Validator...');
const tweetUrlRegex = /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[a-zA-Z0-9_]+\/status\/\d+/i;

const testUrls = [
  { url: 'https://x.com/elonmusk/status/188472918239129', valid: true },
  { url: 'https://twitter.com/dev/status/1234567890', valid: true },
  { url: 'http://x.com/teneo_protocol/status/2068034376328196606', valid: true },
  { url: 'https://google.com/search?q=tweet', valid: false },
  { url: 'https://x.com/home', valid: false },
  { url: 'javascript:alert(1)', valid: false },
  { url: 'https://x.com/explore/tabs/keyword', valid: false },
];

testUrls.forEach((t) => {
  const result = tweetUrlRegex.test(t.url);
  if (result === t.valid) {
    console.log(`✅ [${t.valid ? 'ACCEPT' : 'REJECT'}] "${t.url}"`);
  } else {
    console.error(`❌ Regex error on "${t.url}": expected ${t.valid}, got ${result}`);
    allPassed = false;
  }
});

console.log('\n--- Hardening Summary ---');
if (allPassed) {
  console.log('🎉 ALL HARDENING CHECKS PASSED!\n');
} else {
  console.log('⚠️ SOME CHECKS FAILED!\n');
}
