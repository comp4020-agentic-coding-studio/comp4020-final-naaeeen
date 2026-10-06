import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { server } from './server.mjs';
const request = (port, path, method = 'GET') => new Promise((resolve, reject) => {
  const req = http.request({ hostname: '127.0.0.1', port, path, method }, response => { let body = ''; response.setEncoding('utf8'); response.on('data', chunk => { body += chunk; }); response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body })); }); req.on('error', reject); req.end();
});
test('local prototype server allows only explicit files and rejects traversal/mutations', async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const port = server.address().port;
  try {
    assert.equal(server.address().address, '127.0.0.1');
    const page = await request(port, '/'); assert.equal(page.status, 200); assert.match(page.body, /simulated layout fixtures/);
    assert.equal((await request(port, '/vendor/three.module.js')).status, 200);
    assert.equal((await request(port, '/vendor/three.core.js')).status, 200);
    for (const path of ['/package.json', '/README.md', '/src/server.ts', '/vendor/../../package.json', '/%2e%2e/package.json', '/vendor%2fthree.module.js']) {
      const result = await request(port, path); assert.ok([400, 404].includes(result.status), path);
      assert.doesNotMatch(result.body, /dependencies|cookie|SESSION_SECRET/i);
    }
    assert.equal((await request(port, '/', 'POST')).status, 405);
    const head = await request(port, '/', 'HEAD'); assert.equal(head.status, 200); assert.equal(head.body, '');
  } finally { await new Promise(resolve => server.close(resolve)); }
});
