const twitterBot = require('../server/automation/twitterBot');

console.log('=== 🧪 VERIFY JSON REPLIES & UNIQUE DISTRIBUTION ===\n');

let allPassed = true;

const samplePayload = JSON.stringify({
  "topic": "Agentic AI getting counterparties, not just rails",
  "replies": [
    "the rails are commodity now, occupying them is the game. that line sums up the whole shift honestly",
    "stripe buying openrouter for that much money says a lot about where the actual value is moving",
    "tao going live on base with no admin key is a bigger deal than it sounds, agents holding and deploying it directly changes a lot"
  ]
});

// 1. Test parsing
console.log('1. Testing parseCommentPayload()...');
const extracted = twitterBot.parseCommentPayload(samplePayload);
console.log(`Parsed ${extracted.length} replies.`);

if (extracted.length === 3) {
  console.log('✅ Correctly parsed 3 unique replies from JSON object.');
} else {
  console.error('❌ Failed to parse 3 replies.');
  allPassed = false;
}

// 2. Test 1-to-1 distribution across 3 accounts
console.log('\n2. Testing 1-to-1 distribution for 3 accounts...');
const mockAccounts = [
  { id: 'acc_1', label: 'Node Alpha' },
  { id: 'acc_2', label: 'Node Beta' },
  { id: 'acc_3', label: 'Node Gamma' }
];

mockAccounts.forEach((acc, a) => {
  const assignedReply = extracted[a % extracted.length];
  console.log(`[Account ${a + 1}: ${acc.label}] -> "${assignedReply}"`);
  if (assignedReply !== extracted[a]) {
    allPassed = false;
  }
});

// 3. Test uniqueness check on same tweet
const assignedSet = new Set(mockAccounts.map((_, a) => extracted[a % extracted.length]));
if (assignedSet.size === mockAccounts.length) {
  console.log('✅ Uniqueness check: All 3 accounts received 100% distinct, unique replies.');
} else {
  console.error('❌ Duplicate replies detected among accounts!');
  allPassed = false;
}

// 4. Test Array of Strings format
console.log('\n3. Testing JSON Array format ["r1", "r2"]...');
const arrayPayload = JSON.stringify(["Balasan A", "Balasan B"]);
const arrayExtracted = twitterBot.parseCommentPayload(arrayPayload);
if (arrayExtracted.length === 2 && arrayExtracted[0] === 'Balasan A') {
  console.log('✅ Correctly parsed JSON array of strings.');
} else {
  console.error('❌ Failed to parse JSON array.');
  allPassed = false;
}

console.log('\n--- Summary ---');
if (allPassed) {
  console.log('🎉 ALL JSON REPLIES & DISTRIBUTION TESTS PASSED!\n');
} else {
  console.log('⚠️ TESTS FAILED!\n');
}
