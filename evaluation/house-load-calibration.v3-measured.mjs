/** Source-backed clock/transport calibration, not persistence, live network or load acceptance. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { HouseError } from '../src/house-contract.ts';
import * as geometry from '../public/house-geometry.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const read = path => readFileSync(resolve(root, path), 'utf8');
const sha = source => createHash('sha256').update(source).digest('hex');
const protocol = JSON.parse(read('evaluation/house-load.protocol.json'));
assert.equal(protocol.version, 3, 'Declare version3 criteria before source calibration.');
const baseline = read('.local/load-pacing-v2-preserved/tools/house-load.mjs');
const candidate = read('tools/house-load.mjs');
const rtSource = read('src/house-realtime.ts');
assert.equal(sha(baseline), protocol.pacingRefinement.baseline.generatorSHA256);
assert.equal(sha(rtSource), protocol.pacingRefinement.baseline.realtimeSHA256, 'Realtime guard changed beneath calibration.');

function findSource(source) {
  const ast = ts.createSourceFile('house-load.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const callbacks = [], recorders = [], limits = [], connectors = [];
  function visit(node) {
    if (ts.isBinaryExpression(node) && ts.isIdentifier(node.left) && node.left.text === 'motionTimer'
      && ts.isCallExpression(node.right) && ts.isIdentifier(node.right.expression)
      && node.right.expression.text === 'setInterval' && ts.isArrowFunction(node.right.arguments[0])) {
      callbacks.push(node.right.arguments[0].getText(ast));
    }
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'recordMotionFailure') recorders.push(node.getText(ast));
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'connect') connectors.push(node.getText(ast));
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'rejectionTraceLimit') {
      assert.ok(ts.isNumericLiteral(node.initializer), 'Actual trace limit must be an explicit numeric declaration.');
      limits.push(Number(node.initializer.text));
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.equal(callbacks.length, 1, 'Expected one actual motion timer callback.');
  assert.ok(recorders.length <= 1, 'Expected at most one actual trace recorder.');
  assert.equal(connectors.length, 1, 'Expected one actual load connection function.');
  if (recorders.length) {
    assert.equal(limits.length, 1, 'Expected one actual trace-limit declaration.');
    assert.equal(protocol.measurement.rejectedFrameDiagnostics.limit, 32, 'Declared trace contract changed.');
    assert.equal(limits[0], protocol.measurement.rejectedFrameDiagnostics.limit, 'Actual trace limit differs from protocol.');
  }
  return { callback: callbacks[0], recorder: recorders[0] ?? '', traceLimit: limits[0] ?? 0, connect: connectors[0] };
}

function fixture(source) {
  let serverNow = 1000, clientNow = 0, instance;
  class Clock extends Date { static now() { return serverNow; } }
  class SocketServer {
    constructor() { instance = this; this.events = new Map(); }
    use(fn) { this.middleware = fn; }
    on(name, fn) { this.events.set(name, fn); }
    close(fn) { fn(); }
  }
  const module = { exports: {} };
  const js = ts.transpileModule(rtSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mapped = name => name === 'socket.io' ? { Server: SocketServer }
    : name === './house-contract.ts' ? { HouseError }
    : name === '../public/house-geometry.js' ? geometry : require(name);
  new Function('require', 'exports', 'module', 'Date', 'setInterval', 'clearInterval', js)(
    mapped, module.exports, module, Clock, () => ({ unref() {} }), () => {},
  );
  const identity = 'synthetic-member', house = 'synthetic-house';
  const durable = { house: { id: house, capacity: 6 }, zoneId: 'lounge', room: null,
    residents: [{ id: identity, slot: 2 }], cards: [], chat: [], sequence: 0 };
  const store = { session: () => ({ id: identity }), me: () => ({ home: { id: house } }), snapshot: () => durable };
  module.exports.attachHouseRealtime({}, store, { origin: 'http://127.0.0.1:5000' });
  const handlers = new Map();
  const serverSocket = { id: 'probe-socket', request: { headers: { cookie: 'house_session=' + 'x'.repeat(43) } },
    conn: { once() {}, readyState: 'open', writeBuffer: [], transport: { name: 'websocket', writable: true, socket: { bufferedAmount: 0 } } },
    on(name, fn) { handlers.set(name, fn); } };
  instance.middleware(serverSocket, error => assert.equal(error, undefined));
  instance.events.get('connection')(serverSocket);
  let subscribed;
  handlers.get('house.subscribe')({ zoneId: 'lounge', controllerToken: '00000000-0000-4000-8000-000000000001' }, reply => { subscribed = reply; });
  assert.equal(subscribed.ok, true);
  const own = subscribed.snapshot.players[0], frames = [], errors = [];
  const view = { index: 0, identity, controller: true, ready: true, preparingPause: false, paused: false,
    nextSend: 100, lastSend: 0, lastAck: 0, generation: subscribed.snapshot.generation, sequence: 0,
    x: own.x, z: own.z, direction: 1, motionSent: 0, outstanding: 0,
    socket: { connected: true, timeout() { return { emit(event, body, ack) {
      assert.equal(event, 'house.move'); frames.push({ sentAt: clientNow, body, ack });
    } }; } } };
  const { callback, recorder, traceLimit } = findSource(source);
  const scheduler = new Function('env', `
    const {views,performance,layout,slide,validPosition,problem,round,start}=env;
    let motionSent=0,motionOk=0,motionRejected=0,expectedTimeouts=0,unexpectedTimeouts=0;
    let maxOutstanding=0,maxOutstandingNormal=0,maxOutstandingPaused=0,droppedRejectedTraces=0;
    const rejectedFrameTraces=[],rejectionTraceLimit=${traceLimit};
    ${recorder}
    return {tick:${callback},recordMotionFailure:typeof recordMotionFailure==='function'?recordMotionFailure:null,
      stats:()=>({motionSent,motionOk,motionRejected,expectedTimeouts,unexpectedTimeouts,maxOutstanding,
        maxOutstandingNormal,maxOutstandingPaused,droppedRejectedTraces}),traces:()=>rejectedFrameTraces};
  `)({ views: [view], performance: { now: () => clientNow }, layout: geometry.createLayout(6),
    slide: geometry.slide, validPosition: geometry.validPosition, problem: code => errors.push(code),
    round: value => Math.round(value * 1000) / 1000, start: 0 });
  function dispatch(body, at) { serverNow = 1000 + at; let reply; handlers.get('house.move')(body, value => { reply = value; }); return reply; }
  function tick(at) { clientNow = at; scheduler.tick(); }
  function ack(frame, reply, at) { clientNow = at; frame.ack(null, reply); }
  return { own, view, frames, errors, scheduler, tick, ack, dispatch, handlers,
    setServer(at) { serverNow = 1000 + at; }, setClient(at) { clientNow = at; } };
}

const summaries = [];
function run(name, execute) { const detail = execute(); summaries.push({ case: name, status: 'PASS', ...detail }); console.log(JSON.stringify(summaries.at(-1))); }

run('preserved-v2 compressed-arrival negative control', () => {
  const f = fixture(baseline);
  f.tick(100); f.tick(200);
  assert.equal(f.frames.length, 2); assert.equal(f.view.outstanding, 2);
  const first = f.dispatch(f.frames[0].body, 200), second = f.dispatch(f.frames[1].body, 201);
  assert.equal(first.ok, true); assert.equal(second.code, 'RATE_LIMITED');
  assert.equal(second.message, 'Movement updates are limited to ten per second.');
  f.ack(f.frames[0], first, 202); f.ack(f.frames[1], second, 202);
  assert.equal(f.scheduler.stats().motionRejected, 1);
  assert.notEqual(f.view.x, f.frames[0].body.x, 'Baseline optimistic pose should expose the rejection drift.');
  return { sendsAtMs: [100, 200], receivesAtMs: [200, 201], maxOutstanding: f.scheduler.stats().maxOutstanding,
    rejectionCode: second.code, rejectionMessage: second.message, attributionToOldFullRun: false };
});

run('current readable scheduler blocks until actual ACK and post-ACK80ms', () => {
  const f = fixture(candidate);
  f.tick(100); f.tick(200);
  assert.equal(f.frames.length, 1, 'Readable scheduler sent another move while the first ACK was outstanding.');
  assert.equal(f.view.outstanding, 1);
  assert.equal(f.view.x, f.own.x, 'Readable route pose advanced before server acceptance.');
  const first = f.dispatch(f.frames[0].body, 200); assert.equal(first.ok, true);
  f.ack(f.frames[0], first, 202);
  assert.equal(f.view.x, f.frames[0].body.x);
  f.tick(281); assert.equal(f.frames.length, 1, 'Post-ACK79ms must stay blocked.');
  f.tick(282); assert.equal(f.frames.length, 2, 'Post-ACK80ms and due deadline should allow a move.');
  const second = f.dispatch(f.frames[1].body, 282); assert.equal(second.ok, true);
  f.ack(f.frames[1], second, 284);
  assert.equal(f.scheduler.stats().motionRejected, 0);
  assert.equal(f.scheduler.stats().maxOutstandingNormal, 1);
  return { sendsAtMs: f.frames.map(frame => frame.sentAt), accepted: 2, maxNormalOutstanding: 1 };
});

function ordinary(source, delayFirst = false) {
  const f = fixture(source), acknowledgements = [];
  let delivered = 0;
  for (let at = 0; at <= 60_000; at += 10) {
    while (acknowledgements.length && acknowledgements[0].at <= at) {
      const event = acknowledgements.shift(); f.ack(event.frame, event.reply, event.at);
    }
    f.tick(at);
    while (delivered < f.frames.length) {
      const frame = f.frames[delivered++], arrival = delayFirst && delivered === 1 ? 200 : frame.sentAt;
      const reply = f.dispatch(frame.body, arrival); assert.equal(reply.ok, true);
      acknowledgements.push({ at: delayFirst && delivered === 1 ? 202 : frame.sentAt + 2, frame, reply });
      acknowledgements.sort((a, b) => a.at - b.at);
    }
  }
  for (const event of acknowledgements) f.ack(event.frame, event.reply, event.at);
  const rate = f.frames.length / 60;
  assert.ok(rate >= 9.8 && rate <= 10.2, `Unchanged ordinary cadence failed: ${rate}Hz`);
  assert.equal(f.scheduler.stats().motionRejected, 0);
  return { frames: f.frames.length, rateHz: rate, maxOutstanding: f.scheduler.stats().maxOutstanding };
}
run('preserved-v2 ordinary60second cadence control', () => ordinary(baseline));
run('current ordinary60second cadence', () => ordinary(candidate));
run('current delayed first ACK recovers60second cadence', () => ordinary(candidate, true));

run('current deliberately paused stationary10Hz remains unthrottled', () => {
  const f = fixture(candidate); f.view.paused = true;
  for (let at = 100; at <= 2000; at += 100) {
    f.tick(at); const frame = f.frames.at(-1);
    assert.equal(frame.sentAt, at);
    assert.equal(frame.body.x, f.own.x); assert.equal(frame.body.z, f.own.z);
    assert.equal(f.dispatch(frame.body, at).ok, true);
  }
  assert.equal(f.frames.length, 20); assert.equal(f.view.outstanding, 20);
  assert.equal(f.scheduler.stats().maxOutstandingPaused, 20);
  assert.equal(f.scheduler.stats().maxOutstandingNormal, 0);
  return { frames: 20, rateHz: 10, suppressedACKs: 20, stationary: true, maxPausedOutstanding: 20 };
});

run('current readiness/connection/preparing-pause suppress sends', () => {
  for (const key of ['ready', 'connected', 'preparingPause']) {
    const f = fixture(candidate);
    if (key === 'ready') f.view.ready = false;
    else if (key === 'connected') f.view.socket.connected = false;
    else f.view.preparingPause = true;
    f.tick(100); assert.equal(f.frames.length, 0);
  }
  return { blockedModes: 3 };
});

run('current late ACK cannot overwrite actual takeover generation pose', () => {
  const f = fixture(candidate); f.tick(100);
  const reply = f.dispatch(f.frames[0].body, 200); assert.equal(reply.ok, true);
  f.setServer(201); let takeover;
  f.handlers.get('house.takeover')({ controllerToken: '00000000-0000-4000-8000-000000000002' }, value => { takeover = value; });
  assert.equal(takeover.ok, true);
  const own = takeover.snapshot.players[0]; f.view.generation = takeover.snapshot.generation;
  f.view.x = own.x; f.view.z = own.z; f.view.lastAck = 250;
  f.ack(f.frames[0], reply, 300);
  assert.equal(f.view.x, own.x); assert.equal(f.view.z, own.z); assert.equal(f.view.lastAck, 250);
  assert.equal(f.view.outstanding, 0);
  return { staleStateMutation: false, outstandingSettled: true };
});

run('unchanged actual server rejects compressed/excessive/general-action motion', () => {
  const compressed = fixture(candidate), first = { generation: compressed.view.generation, sequence: 1,
    x: compressed.own.x + .2, z: compressed.own.z, heading: Math.PI / 2 };
  assert.equal(compressed.dispatch(first, 100).ok, true);
  const limited = compressed.dispatch({ ...first, sequence: 2, x: first.x + .2 }, 110);
  assert.equal(limited.code, 'RATE_LIMITED'); assert.equal(limited.message, 'Movement updates are limited to ten per second.');
  const speed = fixture(candidate), invalid = speed.dispatch({ generation: speed.view.generation, sequence: 1,
    x: speed.own.x + 2, z: speed.own.z, heading: Math.PI / 2 }, 100);
  assert.equal(invalid.code, 'INVALID_MOVE');
  const stationary = fixture(candidate); let general;
  for (let sequence = 1; sequence <= 31; sequence++) {
    const result = stationary.dispatch({ generation: stationary.view.generation, sequence,
      x: stationary.own.x, z: stationary.own.z, heading: 0 }, 100);
    if (!result.ok) general = result;
  }
  assert.equal(general.code, 'RATE_LIMITED'); assert.notEqual(general.message, limited.message);
  return { movementRateCode: limited.code, excessiveCode: invalid.code, generalRateMessage: general.message };
});

run('trace grader rejects changed generator or protocol limit', () => {
  assert.throws(() => fixture(candidate.replace('rejectionTraceLimit=32', 'rejectionTraceLimit=64')), /Actual trace limit differs from protocol/);
  const oldLimit = protocol.measurement.rejectedFrameDiagnostics.limit;
  try {
    protocol.measurement.rejectedFrameDiagnostics.limit = 64;
    assert.throws(() => fixture(candidate), /Declared trace contract changed/);
  } finally { protocol.measurement.rejectedFrameDiagnostics.limit = oldLimit; }
  return { wrongCandidateLimitRejected: true, wrongProtocolLimitRejected: true };
});

run('actual callback timeout paths keep paused expected faults distinct', () => {
  const normal = fixture(candidate); normal.tick(100);
  normal.setClient(3600); normal.frames[0].ack(new Error('operation has timed out'));
  assert.equal(normal.scheduler.stats().unexpectedTimeouts, 1);
  assert.equal(normal.scheduler.stats().expectedTimeouts, 0);
  assert.equal(normal.scheduler.traces()[0].code, 'MOTION_ACK_TIMEOUT');
  assert.equal(normal.view.x, normal.own.x);
  const paused = fixture(candidate); paused.view.paused = true; paused.tick(100);
  paused.setClient(3600); paused.frames[0].ack(new Error('operation has timed out'));
  assert.equal(paused.scheduler.stats().expectedTimeouts, 1);
  assert.equal(paused.scheduler.stats().unexpectedTimeouts, 0);
  assert.equal(paused.scheduler.traces().length, 0, 'Expected paused timeout must not displace rejection diagnostics.');
  return { normalTimeoutRecorded: true, expectedPausedTimeoutExcludedFromTrace: true };
});

run('actual callback different-socket ACK cannot overwrite current route state', () => {
  const f = fixture(candidate); f.tick(100);
  const reply = f.dispatch(f.frames[0].body, 200); assert.equal(reply.ok, true);
  f.view.socket = { connected: true }; f.view.x = f.own.x; f.view.z = f.own.z; f.view.lastAck = 250;
  f.ack(f.frames[0], reply, 300);
  assert.equal(f.view.x, f.own.x); assert.equal(f.view.z, f.own.z); assert.equal(f.view.lastAck, 250);
  assert.equal(f.view.outstanding, 0);
  return { staleTransportStateMutation: false, outstandingSettled: true };
});

run('actual rejection recorder is bounded and omits private fields', () => {
  const f = fixture(candidate); assert.ok(f.scheduler.recordMotionFailure, 'Actual trace recorder is missing.');
  for (let sequence = 1; sequence <= 40; sequence++) f.scheduler.recordMotionFailure(f.view,
    { sequence, generation: f.view.generation },
    { sentAt: 100, elapsed: 100, previousAck: 0, outstanding: 1, paused: false, ready: true },
    'RATE_LIMITED', 'Movement updates are limited to ten per second.', 200);
  assert.equal(f.scheduler.traces().length, 32); assert.equal(f.scheduler.stats().droppedRejectedTraces, 8);
  const allowed = new Set(protocol.measurement.rejectedFrameDiagnostics.fields);
  for (const trace of f.scheduler.traces()) assert.ok(Object.keys(trace).every(key => allowed.has(key)));
  assert.ok(!JSON.stringify(f.scheduler.traces()).includes('synthetic-member'));
  assert.ok(!JSON.stringify(f.scheduler.traces()).includes('x'.repeat(43)));
  return { retained: 32, dropped: 8, privateFields: false };
});
const connector = new Function(`return (${findSource(candidate).connect});`)();
await assert.rejects(connector({ outstanding: 1 }), /Motion ACKs did not settle before reconnect/);
summaries.push({ case: 'actual connect refuses unresolved prior motion ACKs', status: 'PASS', networkCalls: 0 });
console.log(JSON.stringify(summaries.at(-1)));

console.log(JSON.stringify({ classification: 'actual-source synthetic-authority clock/transport calibration',
  status: 'PASS', cases: summaries.length, baselineGeneratorSHA256: sha(baseline), candidateGeneratorSHA256: sha(candidate),
  realtimeSHA256: sha(rtSource), sourceExtractedByAST: true, liveServiceOrFullLoadAcceptance: false }));
