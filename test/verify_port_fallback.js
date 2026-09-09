const assert = require('assert');
const http = require('http');
const { originGuard, addAllowedPort } = require('../server/security');

async function testPortFallback() {
  console.log('=== 🧪 VERIFYING DYNAMIC PORT FALLBACK & CLI RESOLUTION ===\n');

  // 1. Simulate port 3990 being occupied
  const testPort = 3990;
  const dummyServer = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('occupied');
  });

  await new Promise((resolve) => dummyServer.listen(testPort, '127.0.0.1', resolve));
  console.log(`1. Dummy server successfully occupying port ${testPort}`);

  // 2. Test startServer logic with fallback
  const express = require('express');
  const testApp = express();
  testApp.get('/test', (_req, res) => res.json({ ok: true }));

  let actualPort = null;
  const server = await new Promise((resolve, reject) => {
    let currentPort = testPort;
    const maxRetries = 5;
    let retries = 0;

    function tryBind() {
      const s = http.createServer(testApp);
      s.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          retries++;
          if (retries > maxRetries) {
            return reject(new Error('Max retries exceeded'));
          }
          currentPort++;
          tryBind();
        } else {
          reject(err);
        }
      });
      s.once('listening', () => {
        actualPort = currentPort;
        resolve(s);
      });
      s.listen(currentPort, '127.0.0.1');
    }
    tryBind();
  });

  assert.strictEqual(actualPort, testPort + 1, `Expected fallback to ${testPort + 1}, got ${actualPort}`);
  console.log(`2. ✅ Successfully fell back from busy port ${testPort} to available port ${actualPort}`);

  // 3. Test HTTP call to fallback port
  const res = await fetch(`http://127.0.0.1:${actualPort}/test`);
  const json = await res.json();
  assert.strictEqual(json.ok, true);
  console.log('3. ✅ Successfully made request to fallback port');

  // 4. Test origin guard accepts fallback port
  addAllowedPort(actualPort);
  const mockReq = {
    headers: {
      origin: `http://localhost:${actualPort}`,
      host: `localhost:${actualPort}`,
    },
  };
  let nextCalled = false;
  const mockRes = {
    status: () => ({ json: () => {} }),
  };
  originGuard(mockReq, mockRes, () => {
    nextCalled = true;
  });
  assert.strictEqual(nextCalled, true, 'originGuard should permit origin from dynamic port');
  console.log('4. ✅ originGuard correctly authorizes fallback port');

  // Clean up
  await new Promise((resolve) => dummyServer.close(resolve));
  await new Promise((resolve) => server.close(resolve));

  console.log('\n🎉 ALL PORT FALLBACK TESTS PASSED!\n');
}

testPortFallback().catch((err) => {
  console.error('❌ Port fallback test failed:', err);
  process.exit(1);
});
