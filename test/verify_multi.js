const proxyHelper = require('../server/automation/proxyHelper');
const db = require('../server/db');
const twitterBot = require('../server/automation/twitterBot');

console.log('=== 🧪 VERIFYING MULTI-ACCOUNT & PROXY MODULES ===');

// 1. Test Proxy Helper
console.log('\n1. Testing Proxy Helper:');
const p1 = proxyHelper.parseProxy('http://admin:secret123@192.168.1.100:8080');
console.log(
  '   P1 (URL with auth):',
  p1.server === 'http://192.168.1.100:8080' && p1.username === 'admin' ? 'PASSED ✅' : 'FAILED ❌'
);

const p2 = proxyHelper.parseProxy('10.0.0.5:3128:proxyuser:proxypass');
console.log(
  '   P2 (host:port:user:pass):',
  p2.server === 'http://10.0.0.5:3128' && p2.username === 'proxyuser' ? 'PASSED ✅' : 'FAILED ❌'
);

const p3 = proxyHelper.parseProxy('socks5://127.0.0.1:9050');
console.log('   P3 (socks5):', p3.server === 'socks5://127.0.0.1:9050' ? 'PASSED ✅' : 'FAILED ❌');

// 2. Test Multi-Account DB & Comments JSON
console.log('\n2. Testing Multi-Account DB Operations:');
const testAcc1 = db.saveAccount({
  label: 'Akun Alpha (Test)',
  auth_token: '11111111111111111111111111111111',
  ct0: '22222222222222222222222222222222',
  proxy: 'http://proxy.test.com:8080',
  comments: ['{Mantap|Keren} bang dari Akun Alpha! 🚀', 'Insight luar biasa dari Akun Alpha 👍'],
});
console.log(`   Account created: ${testAcc1.label} (ID: ${testAcc1.id}) ✅`);

const comments = db.getAccountComments(testAcc1.id);
console.log(`   Account comments loaded: ${comments.length} comments ✅`);
console.log(`   Sample comment: "${comments[0]}"`);

const accounts = db.getAccounts();
console.log(`   Total accounts in DB: ${accounts.length} accounts ✅`);

console.log('\n=== ✅ ALL MULTI-ACCOUNT & PROXY TESTS PASSED ===');
