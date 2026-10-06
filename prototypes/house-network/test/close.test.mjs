import test from 'node:test';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FixtureClient } from '../client.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
for (const transport of ['sse', 'socket.io']) {
  for (const closingClients of [false, true]) {
    test(transport + ': child exits zero when six streams ' + (closingClients ? 'disconnect together before shutdown' : 'remain connected at shutdown'), { timeout: 10000 }, async (t) => {
      await mkdir(resolve(root, '.local'), { recursive: true });
      const directory = await mkdtemp(resolve(root, '.local/close-'));
      const child = fork(resolve(root, 'server-cli.mjs'), [
        '--transport=' + transport, '--port=0', '--database=' + resolve(directory, 'state.sqlite'),
      ], { cwd: root, stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
      let stderr = '';
      let exited;
      child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
      const exit = new Promise((accept) => child.once('close', (code, signal) => { exited = { code, signal }; accept(exited); }));
      const deadline = setTimeout(() => child.kill('SIGKILL'), 7000);
      const clients = [];
      t.after(async () => {
        await Promise.all(clients.map((client) => client.disconnect()));
        if (!exited) child.kill('SIGTERM');
        await exit;
        clearTimeout(deadline);
      });
      const baseUrl = await new Promise((accept, reject) => {
        child.once('message', (message) => accept(message.baseUrl));
        child.once('error', reject);
        child.once('exit', (code) => reject(new Error('Startup exit ' + code + ': ' + stderr)));
      });
      for (let index = 0; index < 6; index++) clients.push(await FixtureClient.create(baseUrl, transport));
      const room = (await clients[0].request('/rooms', { capacity: 6 })).body;
      for (const client of clients.slice(1)) assert.equal((await client.request('/rooms/join', { code: room.code })).status, 200);
      await Promise.all(clients.map((client) => client.connect(room.id)));
      // Reproduce the runner's reconnect before simultaneous final cleanup.
      await clients[0].disconnect();
      await clients[0].connect(room.id);
      if (closingClients) await Promise.all(clients.map((client) => client.disconnect()));
      if (child.connected) child.send({ type: 'close' });
      const observed = await exit;
      clearTimeout(deadline);
      assert.deepEqual(observed, { code: 0, signal: null }, stderr);
      assert.equal(stderr, '', 'Unexpected child stderr: ' + stderr);
    });
  }
}
