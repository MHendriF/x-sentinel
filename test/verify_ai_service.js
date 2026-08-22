const assert = require('assert');
const aiService = require('../server/automation/aiService');

console.log('🧪 Running AI Service Configuration Tests...\n');

// Test 1: Provider Config Resolution
const openRouterConfig = aiService.getProviderConfig({ aiProvider: 'openrouter' });
assert.ok(openRouterConfig.baseUrl.includes('openrouter.ai'));
assert.strictEqual(openRouterConfig.defaultModel, 'openai/gpt-4o-mini');
console.log('✅ Test 1 Passed: OpenRouter config resolved properly');

const groqConfig = aiService.getProviderConfig({ aiProvider: 'groq' });
assert.ok(groqConfig.baseUrl.includes('groq.com'));
assert.strictEqual(groqConfig.defaultModel, 'llama-3.3-70b-versatile');
console.log('✅ Test 2 Passed: Groq config resolved properly');

const ollamaConfig = aiService.getProviderConfig({ aiProvider: 'ollama', aiBaseUrl: 'http://127.0.0.1:11434/v1' });
assert.strictEqual(ollamaConfig.baseUrl, 'http://127.0.0.1:11434/v1');
console.log('✅ Test 3 Passed: Local Ollama config resolved properly');

// Test 4: Disabled AI Mode returns null
(async () => {
  const result = await aiService.generateContextualReply('Some viral tweet', {}, { aiProvider: 'none' });
  assert.strictEqual(result, null, 'Disabled AI should return null immediately');
  console.log('✅ Test 4 Passed: Disabled AI safely returns null fallback');

  console.log('\n🎉 ALL AI SERVICE UNIT TESTS PASSED (100%)');
})();
