const assert = require('assert');
const aiService = require('../server/automation/aiService');

console.log('🧪 Running AI Service & Resilient Parser Verification Tests...\n');

// Test 1: 9router config resolution
const nineRouterConfig = aiService.getProviderConfig({ aiProvider: '9router' });
assert.ok(nineRouterConfig.baseUrl.includes('9router.com'));
assert.strictEqual(nineRouterConfig.defaultModel, 'openai/gpt-4o-mini');
console.log('✅ Test 1 Passed: 9router config resolved properly');

// Test 2: Standard JSON parsing
const standardJson = JSON.stringify({
  choices: [{ message: { content: 'X-SENTINEL AI ONLINE' } }]
});
const parsedStandard = aiService.safeParseResponse(standardJson);
assert.strictEqual(parsedStandard.choices[0].message.content, 'X-SENTINEL AI ONLINE');
console.log('✅ Test 2 Passed: Standard JSON parsed cleanly');

// Test 3: SSE Streaming response format (reproducing the error the user experienced)
const sseStreamText = `data: {"id":"chatcmpl-1","choices":[{"delta":{"content":"X-SENTINEL "}}]}

data: {"id":"chatcmpl-2","choices":[{"delta":{"content":"AI ONLINE"}}]}

data: [DONE]`;

const parsedSSE = aiService.safeParseResponse(sseStreamText);
assert.strictEqual(parsedSSE.choices[0].message.content, 'X-SENTINEL AI ONLINE');
console.log('✅ Test 3 Passed: SSE Stream chunks parsed and combined seamlessly!');

// Test 4: Trailing non-whitespace characters after JSON (Exact error reproduced)
const trailingJson = `{"id":"test","choices":[{"message":{"content":"Online OK"}}]}extra_non_whitespace_character`;
const parsedTrailing = aiService.safeParseResponse(trailingJson);
assert.strictEqual(parsedTrailing.choices[0].message.content, 'Online OK');
console.log('✅ Test 4 Passed: Trailing characters after JSON handled gracefully!');

// Test 5: Markdown codeblock JSON
const markdownJson = "```json\n" + standardJson + "\n```";
const parsedMarkdown = aiService.safeParseResponse(markdownJson);
assert.strictEqual(parsedMarkdown.choices[0].message.content, 'X-SENTINEL AI ONLINE');
console.log('✅ Test 5 Passed: Markdown codeblock JSON parsed successfully!');

// Test 6: Disabled AI returns null
(async () => {
  const result = await aiService.generateContextualReply('Some viral tweet', {}, { aiProvider: 'none' });
  assert.strictEqual(result, null);
  console.log('✅ Test 6 Passed: Disabled AI safely returns null fallback');

  console.log('\n🎉 ALL AI SERVICE & STREAM PARSER TESTS PASSED (100%)');
})();
