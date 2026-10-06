import { fork, spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { readFile, mkdir, mkdtemp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { FixtureClient, sleep, until } from './client.mjs';

const root = fileURLToPath(new URL('./', import.meta.url));
const protocolPath = fileURLToPath(new URL('../../evaluation/shared-house-planning.protocol.json', import.meta.url));
const expectedProtocol = '57a4e07831b490ea15184707a1656f061dc32eab831036f07086f53c20128278';
const args = process.argv.slice(2);
if (args.some((argument) => !['--core-only', '--skip-core', '--reverse'].includes(argument))) throw new Error('Use --core-only, --skip-core or --reverse');
const digest = createHash('sha256').update(await readFile(protocolPath)).digest('hex');
if (digest !== expectedProtocol) throw new Error('Frozen comparison protocol hash mismatch');
if (process.version !== 'v24.21.0') throw new Error('Pinned Node v24.21.0 required');
const result = {
  fixtureOnly: true,
  protocolSha256: digest,
  runtime: { node: process.version, socketIo: '4.8.4', socketIoClient: '4.8.4' },
  observations: [],
  limitations: [
    'Synthetic clients on the same host; not human or browser usability',
    'Each transport server runs in its own process; RSS excludes this client harness',
    'TCP stream byte counters include HTTP/WebSocket framing and fixture metrics overhead, excluding TCP/IP headers and ACKs',
    'SSE full snapshots versus Socket.IO deltas intentionally compares payload strategy and transport together',
    'Socket.IO uses WebSocket only; no polling fallback or cross-origin deployment measured',
    'Opaque cookie identities are an explicitly loopback-only fixture, not production authentication',
    'No Fly latency, physical device FPS, long-run reliability, DIY/whiteboard or CRDT claim',
  ],
};
if (!args.includes('--skip-core')) {
  const core = spawnSync(process.execPath, ['--test', 'test/close.test.mjs', 'test/input.test.mjs', 'test/throttle.test.mjs', 'test/transport.test.mjs'], { cwd: root, encoding: 'utf8', timeout: 30000 });
  result.core = { exitCode: core.status, signal: core.signal, stdout: core.stdout, stderr: core.stderr };
  if (core.error) result.core.error = core.error.message;
  if (core.status !== 0) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    process.exitCode = 1;
  }
}
if (process.exitCode === 1 || args.includes('--core-only')) {
  if (process.exitCode !== 1) process.stdout.write(JSON.stringify(result, null, 2) + '\n');
} else {
  const order = args.includes('--reverse') ? ['socket.io', 'sse'] : ['sse', 'socket.io'];
  for (const transport of order) {
    try { result.observations.push(await benchmark(transport)); }
    catch (error) {
      result.observations.push({ transport, completed: false, error: error.message });
      process.exitCode = 1;
      break;
    }
  }
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

function describe(values) {
  const sorted = values.toSorted((a, b) => a - b);
  return { count: values.length, min: sorted[0] ?? null, p50: percentile(sorted, 0.5), p95: percentile(sorted, 0.95), max: sorted.at(-1) ?? null };
}
function percentile(sorted, fraction) {
  if (!sorted.length) return null;
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
}
async function benchmark(transport) {
  await mkdir(resolve(root, '.local'), { recursive: true });
  const data = await mkdtemp(resolve(root, '.local/measure-'));
  const child = fork(fileURLToPath(new URL('./server-cli.mjs', import.meta.url)), [
    '--transport=' + transport, '--port=0', '--database=' + resolve(data, 'state.sqlite'),
  ], { cwd: root, stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
  let childStderr = '';
  child.stderr.on('data', (chunk) => { childStderr += chunk.toString(); });
  const clients = [];
  let sampling;
  let stopDeadline;
  let serverExited;
  child.on('close', (code, signal) => { serverExited = { code, signal }; });
  try {
    const baseUrl = await new Promise((accept, reject) => {
      const timer = setTimeout(() => reject(new Error('Fixture server startup timed out')), 5000);
      child.once('message', (message) => { clearTimeout(timer); accept(message.baseUrl); });
      child.once('error', (error) => { clearTimeout(timer); reject(error); });
      child.once('exit', (code) => { clearTimeout(timer); reject(new Error('Fixture server exited: ' + code)); });
    });
    for (let index = 0; index < 6; index++) clients.push(await FixtureClient.create(baseUrl, transport));
    const roomResponse = await clients[0].request('/rooms', { capacity: 6 });
    if (roomResponse.status !== 201) throw new Error('Room create failed');
    const room = roomResponse.body;
    for (const client of clients.slice(1)) {
      const joined = await client.request('/rooms/join', { code: room.code });
      if (joined.status !== 200) throw new Error('Room join failed');
    }
    await Promise.all(clients.map((client) => client.connect(room.id)));
    // Exactly the same five durable chat texts and workload coordinates for both adapters.
    const fixtureChat = [
      'Welcome to the shared study room.', 'Working on assignment notes.',
      'Take a seat when ready.', 'A quiet five-minute break soon.', 'Good luck with your task.',
    ];
    for (const text of fixtureChat) {
      if (!(await clients[0].command('chat', { commandId: randomUUID(), text })).ok) throw new Error('Chat fixture failed');
    }
    const replayId = randomUUID();
    const first = await clients[0].command('chat', { commandId: replayId, text: 'Chat UUID replay fixture.' });
    const replay = await clients[0].command('chat', { commandId: replayId, text: 'Chat UUID replay fixture.' });
    const chatIdempotence = first.ok && JSON.stringify(first) === JSON.stringify(replay);
    if (!chatIdempotence) throw new Error('Chat replay check failed');

    const entries = new Map();
    const pending = [];
    const failures = [];
    clients.forEach((client, index) => client.listeners.add((event) => {
      const moves = event.kind === 'move' ? [{ identity: event.identity, position: event.position }]
        : event.state?.members ?? [];
      const visibleAt = performance.now();
      for (const move of moves) {
        const entry = entries.get(move.position.commandId);
        if (entry && !entry.seen.has(index)) {
          entry.seen.add(index);
          entry.visible.push(visibleAt - entry.sentAt);
        }
      }
    }));
    const getMetrics = async () => {
      const response = await fetch(baseUrl + '/fixture/metrics', { signal: AbortSignal.timeout(3000) });
      if (!response.ok) throw new Error('Metrics failed');
      return response.json();
    };
    const began = performance.now();
    let before;
    let measureBegan;
    const rss = [];
    const lateness = [];
    const sendIntervals = clients.map(() => []);
    const lastMeasuredSend = clients.map(() => undefined);
    for (let tick = 0; tick < 250; tick++) {
      const due = tick < 50 ? began + tick * 100 : (measureBegan ?? began + 5000) + (tick - 50) * 100;
      if (performance.now() < due) await sleep(due - performance.now());
      if (tick === 50) {
        // Warmup commands have acknowledged before defining the measurement boundary.
        await Promise.all(pending);
        before = await getMetrics();
        measureBegan = performance.now();
        rss.push(before.rssMiB);
        sampling = setInterval(() => {
          getMetrics().then((value) => rss.push(value.rssMiB)).catch((error) => failures.push('Metrics: ' + error.message));
        }, 1000);
      }
      if (tick >= 50) lateness.push(Math.max(0, performance.now() - (measureBegan + (tick - 50) * 100)));
      for (let index = 0; index < clients.length; index++) {
        const commandId = randomUUID();
        const entry = { sentAt: performance.now(), measured: tick >= 50, visible: [], seen: new Set(), accepted: false };
        if (entry.measured) {
          if (lastMeasuredSend[index] !== undefined) sendIntervals[index].push(entry.sentAt - lastMeasuredSend[index]);
          lastMeasuredSend[index] = entry.sentAt;
        }
        entries.set(commandId, entry);
        const request = clients[index].command('move', {
          commandId, x: (tick % 9) + index / 10, z: 1 + index,
        }).then((response) => {
          entry.accepted = response.ok === true;
          if (!response.ok) failures.push('Move: ' + response.code);
        }).catch((error) => failures.push('Command: ' + error.message));
        pending.push(request);
      }
    }
    const endAt = measureBegan + 20000;
    if (performance.now() < endAt) await sleep(endAt - performance.now());
    const sendEnded = performance.now();
    clearInterval(sampling);
    sampling = undefined;
    // Capture server/window counters before awaiting acknowledgement or visibility.
    const after = await getMetrics();
    rss.push(after.rssMiB);
    const drainStarted = performance.now();
    await Promise.all(pending);
    const acknowledgementDrainMs = performance.now() - drainStarted;
    try {
      await until(() => [...entries.values()].filter((entry) => entry.measured && entry.accepted).every((entry) => entry.seen.size === 6), 2500);
    } catch (error) { failures.push('Delivery: ' + error.message); }
    const deliveryDrainMs = performance.now() - sendEnded;
    const measured = [...entries.values()].filter((entry) => entry.measured);
    const accepted = measured.filter((entry) => entry.accepted);
    const latencies = accepted.flatMap((entry) => entry.visible).sort((a, b) => a - b);
    const latency = { p50: percentile(latencies, 0.5), p95: percentile(latencies, 0.95), max: latencies.at(-1) ?? null };
    const state = await clients[0].request('/rooms/' + room.id + '/snapshot');
    await clients[0].disconnect();
    await clients[0].connect(room.id);
    const rejoin = clients[0].events.findLast((event) => event.type === 'snapshot').state;
    const rejoinSnapshot = rejoin.members.length === 6 && rejoin.chat.length === state.body.chat.length;
    const peakRss = Math.max(...rss);
    const outcome = {
      transport, completed: true, clients: 6, requestsPerSecondPerClient: 10,
      warmupSeconds: 5, measureSeconds: 20, warmupWallMs: measureBegan - began,
      measureWallMs: sendEnded - measureBegan, acknowledgementDrainMs, deliveryDrainMs,
      attemptedMoves: measured.length, acceptedMoves: accepted.length,
      schedulerLatenessMs: describe(lateness),
      measuredClientSendIntervalsMs: sendIntervals.map((intervals, index) => ({ clientIndex: index, ...describe(intervals) })),
      serverAcceptedMovesDelta: after.acceptedMoves - before.acceptedMoves,
      observedClientDeliveries: latencies.length, expectedClientDeliveries: accepted.length * 6,
      visibleLatencyMs: latency, processRssMiB: { peak: peakRss, samples: rss.length, after: after.rssMiB },
      measuredTcpStreamBytes: {
        read: after.tcpStreamBytesRead - before.tcpStreamBytesRead,
        written: after.tcpStreamBytesWritten - before.tcpStreamBytesWritten,
      },
      failures, chatIdempotence, rejoinSnapshot,
      thresholds: { p95VisibleMs: 1000, rssMiB: 200 },
      passesThresholds: failures.length === 0 && accepted.length === 1200 && after.acceptedMoves - before.acceptedMoves === 1200 && latencies.length === 7200 && chatIdempotence && rejoinSnapshot && latency.p95 <= 1000 && peakRss <= 200,
      serverStderr: childStderr,
    };
    await Promise.all(clients.map((client) => client.disconnect()));
    await stopChild();
    outcome.serverExit = serverExited;
    outcome.serverStderr = childStderr; // Include shutdown diagnostics after stdio closes.
    if (!outcome.passesThresholds || serverExited?.code !== 0) process.exitCode = 1;
    return outcome;
  } finally {
    clearInterval(sampling);
    await Promise.all(clients.map((client) => client.disconnect()));
    await stopChild();
  }
  async function stopChild() {
    if (serverExited) return;
    await new Promise((accept) => {
      child.once('close', accept);
      stopDeadline = setTimeout(() => child.kill('SIGKILL'), 5000);
      if (child.connected) child.send({ type: 'close' });
      else child.kill('SIGTERM');
    });
    clearTimeout(stopDeadline);
  }
}
