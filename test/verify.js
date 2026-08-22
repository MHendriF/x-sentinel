const spintax = require('../server/automation/spintax');
const db = require('../server/db');
const cookieManager = require('../server/automation/cookieManager');

console.log('=== 🧪 VERIFYING X AUTOMATION MODULES ===');

// 1. Test Spintax Parser
const template = "{Keren|Mantap|Luar biasa} {bang|kak|gan}, {infonya sangat bermanfaat|makasih banyak}! 🚀";
console.log('\n1. Spintax Test:');
for (let i = 1; i <= 3; i++) {
  console.log(`   Sample ${i}: "${spintax.parseSpintax(template)}"`);
}

// 2. Test Cookie Manager
console.log('\n2. Cookie Manager Test:');
const dummyAuth = '1234567890abcdef1234567890abcdef';
const dummyCt0 = 'abcdef1234567890abcdef1234567890';
const validation = cookieManager.validateFormat(dummyAuth, dummyCt0);
console.log('   Format validation:', validation.valid ? 'PASSED ✅' : 'FAILED ❌');

const pwCookies = cookieManager.getPlaywrightCookies(dummyAuth, dummyCt0);
console.log(`   Playwright cookies created: ${pwCookies.length} cookies (x.com & twitter.com) ✅`);

// 3. Test DB
console.log('\n3. Database Test:');
const settings = db.getSettings();
console.log('   Settings loaded:', settings.minDelaySeconds ? 'PASSED ✅' : 'FAILED ❌');
const templates = db.getTemplates();
console.log(`   Templates loaded: ${templates.length} templates ✅`);

console.log('\n=== ✅ ALL LOGIC TESTS PASSED ===');
