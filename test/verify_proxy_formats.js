const proxyHelper = require('../server/automation/proxyHelper');

const testCases = [
  {
    input: 'user123:pass456@103.145.2.1:8080',
    expected: { server: 'http://103.145.2.1:8080', username: 'user123', password: 'pass456' },
  },
  {
    input: 'http://myuser:mypassword@192.168.1.1:3128',
    expected: { server: 'http://192.168.1.1:3128', username: 'myuser', password: 'mypassword' },
  },
  {
    input: 'socks5://socksuser:sockspass@45.67.89.10:1080',
    expected: { server: 'socks5://45.67.89.10:1080', username: 'socksuser', password: 'sockspass' },
  },
  {
    input: '103.145.2.1:8080:user123:pass456',
    expected: { server: 'http://103.145.2.1:8080', username: 'user123', password: 'pass456' },
  },
  {
    input: '103.145.2.1:8080',
    expected: { server: 'http://103.145.2.1:8080' },
  },
  {
    input: 'http://103.145.2.1:8080',
    expected: { server: 'http://103.145.2.1:8080' },
  },
  {
    input: 'admin:p@ss#word!@111.222.33.44:9090',
    expected: { server: 'http://111.222.33.44:9090', username: 'admin', password: 'p@ss#word!' },
  },
];

console.log('--- Testing Proxy Formats ---');
let allPassed = true;

testCases.forEach((tc, idx) => {
  const parsed = proxyHelper.parseProxy(tc.input);
  console.log(`\nTest #${idx + 1}: "${tc.input}"`);
  console.log('Result:', parsed);

  if (!parsed) {
    console.error('❌ Failed: result is null');
    allPassed = false;
    return;
  }

  const serverMatch = parsed.server === tc.expected.server;
  const userMatch = tc.expected.username
    ? parsed.username === tc.expected.username
    : !parsed.username;
  const passMatch = tc.expected.password
    ? parsed.password === tc.expected.password
    : !parsed.password;

  if (serverMatch && userMatch && passMatch) {
    console.log('✅ PASSED');
  } else {
    console.error('❌ FAILED. Expected:', tc.expected, 'Got:', parsed);
    allPassed = false;
  }
});

console.log('\n--- Summary ---');
console.log(allPassed ? 'ALL TESTS PASSED! 🎉' : 'SOME TESTS FAILED ⚠️');
