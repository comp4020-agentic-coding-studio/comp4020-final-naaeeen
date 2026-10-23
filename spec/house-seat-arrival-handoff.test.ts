import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';
import { HOUSE_WORLD_VERSION } from '../public/house-version.js';
import { createLayout, bedroomLayout, validPosition } from '../public/house-geometry.js';

// The actual UI, World and client are imported below. Only the renderer and
// external transport/HTTP boundary are replaced; RAF is this DOM's manual clock.
vi.mock('three', async importOriginal => {
  const actual = await importOriginal<any>();
  class Renderer {
    shadowMap: any = {}; outputColorSpace: any; toneMapping: any; toneMappingExposure: any;
    setPixelRatio() {} setSize() {} render() {} dispose() {}
  }
  return { ...actual, WebGLRenderer: Renderer };
});

const houseId = '00000000-0000-4000-8000-000000000001';
const selfId = '00000000-0000-4000-8000-000000000002';
const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  vi.unstubAllGlobals(); vi.restoreAllMocks();
});
async function flush() { for (let n = 0; n < 12; n++) await Promise.resolve(); }
function initialSnapshot() {
  return {
    worldVersion: HOUSE_WORLD_VERSION, serverEpoch: 'seat-arrival-epoch', accessGeneration: 1,
    generation: 1, controller: true,
    durable: {
      schemaVersion: 2, selfId, house: { id: houseId, capacity: 2, ownerId: selfId, code: '12345678' },
      residents: [{ id: selfId, name: 'Robin', colour: 'sage', revision: 1, slot: 0, bedroomId: 'own', open: false }],
      streamId: 'lounge:' + houseId, sequence: 0, zoneId: 'lounge', room: null, cards: [], chat: [],
      ownWork: { streamId: 'lounge:' + houseId, sequence: 0, card: null },
    },
    players: [{ id: selfId, name: 'Robin', colour: 'sage', connected: true, zoneId: 'lounge',
      x: 0, z: 2.85, heading: 0, animation: 'idle', availability: 'quiet', generation: 1, seatGeneration: 1 }],
  };
}
async function actualHouse() {
  vi.resetModules();
  const dom = new JSDOM(readFileSync(new URL('../public/house.html', import.meta.url), 'utf8'), { url: 'http://localhost' });
  const document = dom.window.document;
  let clock = 0, nextFrame = 0;
  const frames = new Map<number, FrameRequestCallback>();
  const requestFrame = (callback: FrameRequestCallback) => { frames.set(++nextFrame, callback); return nextFrame; };
  const cancelFrame = (id: number) => { frames.delete(id); };
  Object.defineProperty(dom.window, 'matchMedia', { value: () => ({ matches: false }) });
  Object.defineProperty(dom.window, 'requestAnimationFrame', { value: requestFrame });
  Object.defineProperty(dom.window, 'cancelAnimationFrame', { value: cancelFrame });
  vi.spyOn(dom.window.performance, 'now').mockImplementation(() => clock);
  const worldElement = document.getElementById('world')!;
  Object.defineProperty(worldElement, 'clientWidth', { value: 1920 });
  Object.defineProperty(worldElement, 'clientHeight', { value: 1080 });
  vi.stubGlobal('window', dom.window); vi.stubGlobal('document', document);
  vi.stubGlobal('navigator', dom.window.navigator); vi.stubGlobal('HTMLElement', dom.window.HTMLElement);
  vi.stubGlobal('sessionStorage', dom.window.sessionStorage);
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('requestAnimationFrame', requestFrame); vi.stubGlobal('cancelAnimationFrame', cancelFrame);
  let state: any = initialSnapshot(), serverSeated = false, seatAck: ((reply: any) => void) | null = null, seatTimeout: (() => void) | null = null;
  let lastControllerToken: string | null = null, serverSeatGeneration = 1;
  let deferMotion = false, motionReceipt: { resolve: (reply: any) => void; sequence: number } | null = null;
  const calls: { event: string; value: any; afterSeatCommit: boolean }[] = [];
  const listeners = new Map<string, Function>();
  const socket: any = {
    connected: false,
    on(event: string, handler: Function) { listeners.set(event, handler); return socket; },
    connect() { socket.connected = true; listeners.get('connect')?.(); return socket; },
    disconnect() { socket.connected = false; }, timeout() { return socket; },
    get volatile() { return socket; },
    emitWithAck(event: string, value: any) {
      calls.push({ event, value, afterSeatCommit: serverSeated });
      if (event === 'house.subscribe') {
        // A deliberate title/re-entry creates a new controller token. Mirror the
        // server's acquire/reset contract; no automatic refresh is injected.
        if (lastControllerToken && lastControllerToken !== value.controllerToken) {
          serverSeated = false; state = structuredClone(state); state.generation++; state.accessGeneration++;
          Object.assign(state.players[0], { ...(createLayout(2).arrivals?.[0] ?? createLayout(2).spawn), animation: 'idle', seatGeneration: ++serverSeatGeneration });
          delete state.players[0].seatId;
        }
        lastControllerToken = value.controllerToken;
        return Promise.resolve({ ok: true, snapshot: structuredClone(state) });
      }
      if (event === 'house.seat') {
        serverSeated = true; serverSeatGeneration++;
        return new Promise((resolve, reject) => { seatAck = resolve; seatTimeout = () => reject(new Error('Missing fixture ACK')); });
      }
      if (event === 'house.move') {
        // The real server rejects every move while its seat lease is occupied.
        if (serverSeated) return Promise.resolve({ ok: false, code: 'INVALID_MOVE' });
        Object.assign(state.players[0], { x: value.x, z: value.z, heading: value.heading });
        if (deferMotion) { deferMotion = false; return new Promise(resolve => { motionReceipt = { resolve, sequence: value.sequence }; }); }
        return Promise.resolve({ ok: true, sequence: value.sequence });
      }
      if (event === 'house.stand') { if (serverSeated) serverSeatGeneration++; serverSeated = false; return Promise.resolve({ ok: true }); }
      return Promise.resolve({ ok: true });
    },
  };
  vi.stubGlobal('io', () => socket);
  vi.stubGlobal('fetch', vi.fn(async (path: string) => {
    if (path === '/api/house/me') return { ok: true, json: async () => ({
      identity: { id: selfId, name: 'Robin', colour: 'sage', revision: 1 }, home: state.durable.house, archiveCount: 0,
    }) };
    if (path.startsWith('/api/house/gathering')) return { ok: true, json: async () => ({
      ok: true, kind: 'study', houseId, sessionId: '00000000-0000-4000-8000-000000000003',
      revision: 0, members: [], presenterId: null, item: null, view: { x: .5, y: .5, zoom: 1 }, pointer: null, selfJoined: false,
    }) };
    throw new Error('Unexpected fixture HTTP request');
  }));
  const element = (id: string) => document.getElementById(id)!;
  const step = async (milliseconds = 100) => {
    clock += milliseconds;
    const pending = [...frames.values()]; frames.clear();
    for (const callback of pending) callback(clock);
    await flush();
  };
  cleanups.push(() => { dom.window.dispatchEvent(new dom.window.Event('pagehide')); dom.window.close(); });
  await import('../public/house-ui.js'); await flush();
  expect(element('title-status').textContent).toContain('saved home');
  element('title-continue').click(); await flush();
  expect(element('connection-status').textContent).toBe('Together, live');
  await step(0);
  return {
    calls, step, element, dom, socket,
    deferNextMotion() { deferMotion = true; },
    async settleMotion() { expect(motionReceipt).not.toBeNull(); motionReceipt!.resolve({ ok: true, sequence: motionReceipt!.sequence }); await flush(); },
    syntheticLeaseRelease(position: { x: number; z: number }) {
      // Deliberate exported-client contract fixture. Actual room-edit release
      // also changes controller generation; this is not that native producer.
      state = structuredClone(state); Object.assign(state.players[0], { ...position, animation: 'idle', seatGeneration: 3 });
      delete state.players[0].seatId; listeners.get('house.snapshot')!(state);
    },
    async goStudy() {
      document.querySelector<HTMLButtonElement>('[data-panel="places"]')!.click();
      document.querySelector<HTMLButtonElement>('#places-panel [data-place="study"]')!.click();
      for (let frame = 0; frame < 240 && !calls.some(call => call.event === 'house.seat'); frame++) await step();
      expect(calls.filter(call => call.event === 'house.seat')).toHaveLength(1);
    },
    async acknowledgeSeat(reply: any = { ok: true }) { expect(seatAck).not.toBeNull(); if (!reply.ok) serverSeated = false; seatAck!(reply); await flush(); },
    async timeoutSeat() { expect(seatTimeout).not.toBeNull(); seatTimeout!(); await flush(); },
    key(type: 'keydown' | 'keyup', key: string) {
      const canvas = element('house-world'); canvas.focus();
      canvas.dispatchEvent(new dom.window.KeyboardEvent(type, { key, bubbles: true, cancelable: true }));
    },
    projectStanding() {
      const seatId = calls.find(call => call.event === 'house.seat')!.value.seatId;
      const seat = createLayout(2).seats.find(candidate => candidate.id === seatId)!;
      serverSeated = false; state = structuredClone(state);
      Object.assign(state.players[0], { ...seat.target, animation: 'idle', seatGeneration: serverSeatGeneration }); delete state.players[0].seatId;
      listeners.get('house.snapshot')!(state);
    },
    projectSeat() {
      const seatId = calls.find(call => call.event === 'house.seat')!.value.seatId;
      const seat = createLayout(2).seats.find(candidate => candidate.id === seatId)!;
      state = structuredClone(state);
      Object.assign(state.players[0], { seatId, x: seat.x, z: seat.z, heading: seat.heading, animation: 'sit', seatGeneration: serverSeatGeneration });
      listeners.get('house.snapshot')!(state);
    },
  };
}

it('holds the actual Places study route across seat ACK before the seated projection', async () => {
  const f = await actualHouse(); await f.goStudy(); await f.acknowledgeSeat();
  expect(f.element('panel').hidden).toBe(true);
  for (let frame = 0; frame < 6; frame++) await f.step(50);
  expect(f.calls.filter(call => call.event === 'house.move' && call.afterSeatCommit)).toEqual([]);
  f.projectSeat(); await flush(); await f.step();
  expect(f.element('panel').hidden).toBe(false);
  expect(f.element('panel').dataset.tool).toBe('gathering');
  expect(f.element('gathering-panel').hidden).toBe(false);
});


it('keeps the actual chair panel closed when projection precedes its ACK', async () => {
  const f = await actualHouse(); await f.goStudy(); f.projectSeat(); await flush(); await f.step();
  expect(f.element('panel').hidden).toBe(true);
  await f.acknowledgeSeat();
  expect(f.element('panel').dataset.tool).toBe('gathering');
  expect(f.calls.filter(call => call.event === 'house.move' && call.afterSeatCommit)).toEqual([]);
});

it('retains actual held walking intent without reopening its canceled chair panel', async () => {
  const f = await actualHouse(); await f.goStudy(); await f.acknowledgeSeat();
  f.key('keydown', 'w'); await f.step();
  expect(f.calls.filter(call => call.event === 'house.move' && call.afterSeatCommit)).toEqual([]);
  f.projectSeat(); await flush(); await f.step();
  expect(f.element('panel').hidden).toBe(true);
  expect(f.calls.filter(call => call.event === 'house.stand')).toHaveLength(1);
  const beforeStanding = f.calls.filter(call => call.event === 'house.move').length;
  await f.step(); expect(f.calls.filter(call => call.event === 'house.move')).toHaveLength(beforeStanding);
  f.projectStanding(); await flush(); await f.step(100);
  expect(f.calls.filter(call => call.event === 'house.move').length).toBeGreaterThan(beforeStanding);
  f.key('keyup', 'w');
});

it('shows actual visible recovery labels after an unknown chair reply and never retries it automatically', async () => {
  const f = await actualHouse(); await f.goStudy(); await f.timeoutSeat();
  expect(f.element('notice').textContent).toContain('Return to title');
  expect(f.element('notice').textContent).toContain('Continue saved home');
  for (let frame = 0; frame < 10; frame++) await f.step(100);
  expect(f.calls.filter(call => call.event === 'house.seat')).toHaveLength(1);
  expect(f.calls.filter(call => call.event === 'house.subscribe')).toHaveLength(1);
  expect(f.calls.filter(call => call.event === 'house.move' && call.afterSeatCommit)).toEqual([]);
  f.element('pause-button').click();
  expect(f.element('return-title').textContent).toBe('Return to title');
  f.element('return-title').click(); await flush();
  expect(f.element('title-screen').hidden).toBe(false);
  expect(f.element('title-continue').textContent).toContain('Continue saved home');
  f.element('title-continue').click(); await flush(); await f.step();
  expect(f.element('connection-status').textContent).toBe('Together, live');
  expect(f.calls.filter(call => call.event === 'house.subscribe')).toHaveLength(2);
  const beforeWalking = f.calls.filter(call => call.event === 'house.move').length;
  f.key('keydown', 's'); await f.step(100); f.key('keyup', 's');
  expect(f.calls.filter(call => call.event === 'house.move').length).toBeGreaterThan(beforeWalking);
  expect(f.calls.filter(call => call.event === 'house.seat')).toHaveLength(1);
});

async function transportClient() {
  let state: any = initialSnapshot();
  const listeners = new Map<string, Function>();
  const calls: { event: string; value: any }[] = [];
  let motionMode: 'ok' | 'defer' | 'reject' = 'ok';
  const motions: { resolve: (reply: any) => void; sequence: number }[] = [];
  const seats: { resolve: (reply: any) => void; reject: (error: Error) => void }[] = [];
  const stands: { resolve: (reply: any) => void; reject: (error: Error) => void }[] = [];
  const socket: any = {
    connected: false, on(event: string, listener: Function) { listeners.set(event, listener); return socket; },
    connect() { socket.connected = true; listeners.get('connect')?.(); return socket; },
    disconnect() { socket.connected = false; }, timeout() { return socket; }, get volatile() { return socket; },
    emitWithAck(event: string, value: any) {
      calls.push({ event, value });
      if (event === 'house.subscribe') return Promise.resolve({ ok: true, snapshot: structuredClone(state) });
      if (event === 'house.seat') return new Promise((resolve, reject) => seats.push({ resolve, reject }));
      if (event === 'house.stand') return new Promise((resolve, reject) => stands.push({ resolve, reject }));
      if (event === 'house.move') {
        if (motionMode === 'defer') return new Promise(resolve => motions.push({ resolve, sequence: value.sequence }));
        if (motionMode === 'reject') return Promise.resolve({ ok: false, code: 'INVALID_MOVE' });
        return Promise.resolve({ ok: true, sequence: value.sequence });
      }
      return Promise.resolve({ ok: true });
    },
  };
  const values = new Map<string, string>(), errors: any[] = [];
  vi.stubGlobal('io', () => socket);
  const { createHouseClient } = await import('../public/house-client.js');
  const client = createHouseClient({
    storage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } },
    fetchMe: async () => ({ identity: { id: selfId }, home: state.durable.house }), onError: error => errors.push(error),
  });
  cleanups.push(() => client.close()); await client.connect();
  return {
    client, calls, seats, stands, socket, errors, motions,
    motionMode(value: typeof motionMode) { motionMode = value; },
    head(next: any) { state = structuredClone(next); listeners.get('house.snapshot')!(state); },
    state(next: any) { state = structuredClone(next); },
    emit(event: string, value?: any) { listeners.get(event)?.(value); },
  };
}
const motion = { x: .1, z: 2.85, heading: 0 };
function seatedHead(generation = 2) {
  const head: any = initialSnapshot();
  Object.assign(head.players[0], { seatId: 'seat-1', animation: 'sit', seatGeneration: generation }); return head;
}

it('blocks pending and accepted chair claims through queued old standing heads and allows one claim', async () => {
  const f = await transportClient(), claim = f.client.claimSeat('seat-1');
  expect(f.client.move(motion)).toBe(false);
  await expect(f.client.claimSeat('seat-2')).rejects.toMatchObject({ code: 'PENDING' });
  expect(f.seats).toHaveLength(1);
  f.head(initialSnapshot()); expect(f.client.move(motion)).toBe(false);
  f.seats[0].resolve({ ok: true }); await claim;
  f.head(initialSnapshot()); expect(f.client.move(motion)).toBe(false);
  f.head(seatedHead()); expect(f.client.move(motion)).toBe(false);
  const stand = f.client.stand(); f.stands[0].resolve({ ok: true }); await stand;
  expect(f.client.move(motion)).toBe(false);
  const standing = initialSnapshot(); standing.players[0].seatGeneration = 3; f.head(standing);
  await expect(f.client.move(motion)).resolves.toMatchObject({ ok: true });
});

it('preserves a definitive seat rejection and releases movement without fabricating ownership', async () => {
  const f = await transportClient(), claim = f.client.claimSeat('seat-1');
  const rejected = expect(claim).rejects.toMatchObject({ code: 'SEAT_TAKEN', message: 'That seat is occupied.' });
  f.seats[0].resolve({ ok: false, code: 'SEAT_TAKEN', message: 'That seat is occupied.' }); await rejected;
  await expect(f.client.move(motion)).resolves.toMatchObject({ ok: true });
  expect(f.errors.at(-1)).toMatchObject({ code: 'SEAT_TAKEN', message: 'That seat is occupied.' });
});

it('keeps an unknown chair claim safe and lets explicit Stand resolve it after its current head', async () => {
  const f = await transportClient(), claim = f.client.claimSeat('seat-1');
  const pending = expect(claim).rejects.toMatchObject({ code: 'PENDING', message: expect.stringContaining('Return to title') });
  f.seats[0].reject(new Error('ACK unavailable')); await pending;
  f.head(initialSnapshot()); expect(f.client.move(motion)).toBe(false);
  expect(f.calls.filter(call => call.event === 'house.subscribe')).toHaveLength(1);
  const stand = f.client.stand(); f.stands[0].resolve({ ok: true }); await stand;
  expect(f.client.move(motion)).toBe(false);
  f.head(initialSnapshot());
  await expect(f.client.move(motion)).resolves.toMatchObject({ ok: true });
});

it('does not unlock an unknown claim when explicit Stand also remains unavailable', async () => {
  const f = await transportClient(), claim = f.client.claimSeat('seat-1');
  const pending = expect(claim).rejects.toMatchObject({ code: 'PENDING' }); f.seats[0].reject(new Error('Missing ACK')); await pending;
  const stand = f.client.stand(), standPending = expect(stand).rejects.toMatchObject({ code: 'PENDING' });
  f.stands[0].reject(new Error('Missing Stand ACK')); await standPending;
  f.head(initialSnapshot()); expect(f.client.move(motion)).toBe(false);
  expect(f.calls.filter(call => call.event === 'house.seat')).toHaveLength(1);
});

it.each(['epoch', 'house', 'identity', 'control', 'access', 'zone', 'connection'] as const)(
  'invalidates the old %s claim and ignores its late ACK while a new claim is pending', async change => {
    const f = await transportClient(), old = f.client.claimSeat('seat-1');
    const next: any = initialSnapshot();
    if (change === 'epoch') next.serverEpoch = 'new-epoch';
    if (change === 'house') { next.accessGeneration++; next.durable.house.id = '00000000-0000-4000-8000-000000000005'; next.durable.streamId = 'lounge:' + next.durable.house.id; next.durable.ownWork.streamId = next.durable.streamId; }
    if (change === 'identity') { next.accessGeneration++; next.durable.selfId = '00000000-0000-4000-8000-000000000006'; next.players[0].id = next.durable.selfId; next.durable.residents[0].id = next.durable.selfId; }
    if (change === 'control') next.generation++;
    if (change === 'access') next.accessGeneration++;
    if (change === 'zone') {
      next.generation++; next.accessGeneration++; next.durable.zoneId = '00000000-0000-4000-8000-000000000004'; next.durable.streamId = 'bedroom:' + next.durable.zoneId;
      next.durable.room = { id: next.durable.zoneId, ownerId: selfId, revision: 1, open: false, palette: 'sage', placements: [] };
      f.state(next); await f.client.subscribe(next.durable.zoneId);
    } else if (change === 'connection') {
      f.socket.connected = false; f.emit('disconnect', 'transport close');
      f.state(next); f.socket.connected = true; f.emit('connect'); await flush();
    } else f.head(next);
    const current = f.client.claimSeat('seat-2'), rejected = expect(current).rejects.toMatchObject({ code: 'SEAT_TAKEN' }); expect(f.seats).toHaveLength(2);
    f.seats[0].resolve({ ok: true }); await old;
    expect(f.client.move(motion)).toBe(false);
    f.seats[1].resolve({ ok: false, code: 'SEAT_TAKEN', message: 'Occupied' });
    await rejected;
    await expect(f.client.move(motion)).resolves.toMatchObject({ ok: true });
  },
);

it('ignores a chair ACK after close and leaves all movement closed', async () => {
  const f = await transportClient(), claim = f.client.claimSeat('seat-1'); f.client.close();
  f.seats[0].resolve({ ok: true }); await claim;
  expect(f.client.move(motion)).toBe(false);
  expect(f.calls.filter(call => call.event === 'house.move')).toHaveLength(0);
});


it('retains the ordinary final idle stop after a tool disables walking without a chair request', async () => {
  const f = await actualHouse(); f.key('keydown', 's'); await f.step(100);
  const before = f.calls.filter(call => call.event === 'house.move'); expect(before.length).toBeGreaterThan(0);
  f.dom.window.document.querySelector<HTMLButtonElement>('[data-panel="places"]')!.click();
  await f.step(100);
  const after = f.calls.filter(call => call.event === 'house.move');
  expect(after).toHaveLength(before.length + 1);
  expect(after.at(-1)!.value).toMatchObject({ x: before.at(-1)!.value.x, z: before.at(-1)!.value.z });
  expect(f.calls.filter(call => call.event === 'house.seat')).toHaveLength(0);
});

it('keeps actual typing and composition from producing movement', async () => {
  const f = await actualHouse(), input = f.element('chat-input'); input.focus();
  input.dispatchEvent(new f.dom.window.KeyboardEvent('keydown', { key: 'w', bubbles: true })); await f.step(100);
  f.dom.window.document.dispatchEvent(new f.dom.window.CompositionEvent('compositionstart', { bubbles: true }));
  f.key('keydown', 'w'); await f.step(100);
  expect(f.calls.filter(call => call.event === 'house.move')).toHaveLength(0);
  f.dom.window.document.dispatchEvent(new f.dom.window.CompositionEvent('compositionend', { bubbles: true }));
  f.key('keyup', 'w');
});

it('ignores an old rejected claim while the replacement authority has its own pending chair request', async () => {
  const f = await transportClient(), old = f.client.claimSeat('seat-1');
  const oldRejection = expect(old).rejects.toMatchObject({ code: 'SEAT_TAKEN' });
  const next = initialSnapshot(); next.accessGeneration++; f.head(next);
  const current = f.client.claimSeat('seat-2'), currentRejection = expect(current).rejects.toMatchObject({ code: 'SEAT_TAKEN' });
  f.seats[0].resolve({ ok: false, code: 'SEAT_TAKEN', message: 'Old chair occupied' }); await oldRejection;
  expect(f.client.move(motion)).toBe(false);
  f.seats[1].resolve({ ok: false, code: 'SEAT_TAKEN', message: 'Current chair occupied' }); await currentRejection;
  await expect(f.client.move(motion)).resolves.toMatchObject({ ok: true });
});

it('uses late seated authority after an unknown claim without claiming ACK success or replaying the request', async () => {
  const f = await transportClient(), claim = f.client.claimSeat('seat-1');
  const pending = expect(claim).rejects.toMatchObject({ code: 'PENDING' }); f.seats[0].reject(new Error('Missing ACK')); await pending;
  f.head(seatedHead()); expect(f.client.move(motion)).toBe(false);
  const stand = f.client.stand(); f.stands[0].resolve({ ok: true }); await stand;
  const standing = initialSnapshot(); standing.players[0].seatGeneration = 3; f.head(standing);
  await expect(f.client.move(motion)).resolves.toMatchObject({ ok: true });
  expect(f.seats).toHaveLength(1);
});

it('a late seat ACK cannot pass the explicit Stand barrier without a subsequent standing head', async () => {
  const f = await transportClient(), claim = f.client.claimSeat('seat-1');
  const stand = f.client.stand(); f.stands[0].resolve({ ok: true }); await stand;
  f.seats[0].resolve({ ok: true }); await claim;
  expect(f.client.move(motion)).toBe(false);
  const standing = initialSnapshot(); standing.players[0].seatGeneration = 3; f.head(standing);
  await expect(f.client.move(motion)).resolves.toMatchObject({ ok: true });
});


it.each(['ACK first', 'head first'] as const)(
  'resumes a synthetic same-scope lease release from advanced standing authority: %s', async order => {
    const f = await transportClient(), claim = f.client.claimSeat('seat-1');
    const released = initialSnapshot();
    Object.assign(released.players[0], { x: 2, z: 3, seatGeneration: 3 });
    // Synthetic exported-client lease-generation contract, not the actual
    // room-edit producer, which also changes pose and controller generation.
    if (order === 'head first') f.head(released);
    else { f.seats[0].resolve({ ok: true }); await claim; }
    if (order === 'head first') { f.seats[0].resolve({ ok: true }); await claim; }
    else f.head(released);
    const currentMotion = { x: released.players[0].x + .1, z: released.players[0].z, heading: 0 };
    const moving = f.client.move(currentMotion); expect(moving).toBeInstanceOf(Promise);
    await expect(moving).resolves.toMatchObject({ ok: true, position: { x: 2.1, z: 3 } });
    expect(f.calls.filter(call => call.event === 'house.stand')).toHaveLength(0);
    expect(f.calls.filter(call => call.event === 'house.subscribe')).toHaveLength(1);
  },
);


it('keeps current client authority for synthetic same-scope lease release after a preclaim motion ACK', async () => {
  const f = await transportClient(); f.motionMode('defer');
  const oldMotion = f.client.move(motion), claim = f.client.claimSeat('seat-1');
  f.seats[0].resolve({ ok: true }); await claim;
  const released = initialSnapshot(); Object.assign(released.players[0], { x: 2, z: 3, seatGeneration: 3 }); f.head(released);
  f.motions[0].resolve({ ok: true, sequence: f.motions[0].sequence });
  // This case measures client receipt shape and anchor only. The coupled
  // small-correction World fixture below measures actual flight settlement.
  await expect(oldMotion).resolves.toMatchObject({ ok: false, position: { x: 2, z: 3 } });
  await expect(oldMotion).resolves.not.toHaveProperty('stale', true);
  f.motionMode('reject');
  await expect(f.client.move({ x: 2.1, z: 3, heading: 0 })).resolves.toMatchObject({ ok: false, position: { x: 2, z: 3 } });
  f.motionMode('ok');
  await expect(f.client.move({ x: 2.1, z: 3, heading: 0 })).resolves.toMatchObject({ ok: true });
});


it('refuses a replacement chair until the previous Stand has a current standing head', async () => {
  const f = await transportClient(), seats = createLayout(2).seats;
  const a = seats.find(seat => seat.id === 'rest-seat-2')!, b = seats.find(seat => seat.id === 'rest-seat-1')!;
  expect(Math.hypot(b.x - a.target.x, b.z - a.target.z)).toBeLessThan(1.5);
  const seatedA: any = initialSnapshot();
  Object.assign(seatedA.players[0], { seatId: a.id, x: a.x, z: a.z, heading: a.heading, animation: 'sit', seatGeneration: 2 }); f.head(seatedA);
  const stand = f.client.stand(); f.stands[0].resolve({ ok: true }); await stand;
  const replacement = f.client.claimSeat(b.id);
  const refused = expect(replacement).rejects.toMatchObject({ code: 'ALREADY_SEATED', message: expect.stringContaining('standing') });
  const standingA: any = structuredClone(seatedA);
  Object.assign(standingA.players[0], { ...a.target, animation: 'idle', seatGeneration: 3 }); delete standingA.players[0].seatId;
  f.head(standingA); // The earlier Stand head arrives before the replacement ACK.
  if (f.seats[0]) f.seats[0].resolve({ ok: true }); // Finish the unguarded round-1 counterexample.
  await refused; expect(f.seats).toHaveLength(0);
  const current = f.client.claimSeat(b.id); expect(f.seats).toHaveLength(1);
  f.head(standingA); f.seats[0].resolve({ ok: true }); await current;
  expect(f.client.move(motion)).toBe(false); // B is committed, its head is still withheld.
  const seatedB: any = structuredClone(standingA);
  Object.assign(seatedB.players[0], { seatId: b.id, x: b.x, z: b.z, heading: b.heading, animation: 'sit', seatGeneration: 4 }); f.head(seatedB);
  expect(f.client.move(motion)).toBe(false);
  const leave = f.client.stand(); f.stands[1].resolve({ ok: true }); await leave;
  const standingB: any = structuredClone(seatedB);
  Object.assign(standingB.players[0], { ...b.target, animation: 'idle', seatGeneration: 5 }); delete standingB.players[0].seatId; f.head(standingB);
  await expect(f.client.move({ x: b.target.x, z: b.target.z - .1, heading: 0 })).resolves.toMatchObject({ ok: true });
});


it.each(['ACK first', 'head first'] as const)(
  'mirrors actual room-edit chair removal with pose and controller-generation reconciliation: %s', async order => {
    const f = await transportClient(), roomId = '00000000-0000-4000-8000-000000000004';
    const chairId = '00000000-0000-4000-8000-000000000007';
    const placements = [{ id: chairId, kind: 'chair', x: 0, z: 0, rotation: 0, colour: 'sage' }];
    const chair = bedroomLayout(placements).seats[0], room: any = initialSnapshot();
    room.generation = 2; room.accessGeneration = 2; room.durable.zoneId = roomId; room.durable.streamId = 'bedroom:' + roomId;
    room.durable.residents[0].bedroomId = roomId;
    room.durable.room = { id: roomId, ownerId: selfId, revision: 1, open: false, palette: 'sage', placements };
    Object.assign(room.players[0], { ...chair.target, zoneId: roomId, generation: 2 });
    f.state(room); await f.client.subscribe(roomId);
    const claim = f.client.claimSeat(chairId), released = structuredClone(room);
    released.durable.room.placements = []; released.durable.room.revision++;
    // realtime project()->resetZone() changes the pose AND lease generation;
    // release() advances seatGeneration when the claimed chair is removed.
    released.generation = 3;
    const arrival = { x: .65 * (0 - (released.durable.house.capacity - 1) / 2), z: 3.3 };
    expect(validPosition(bedroomLayout([]), arrival)).toBe(true);
    Object.assign(released.players[0], { ...arrival, heading: 0, animation: 'idle', generation: 3, seatGeneration: 3 });
    if (order === 'head first') f.head(released);
    else { f.seats[0].resolve({ ok: true }); await claim; }
    if (order === 'head first') { f.seats[0].resolve({ ok: true }); await claim; }
    else f.head(released);
    await expect(f.client.move({ x: arrival.x + .1, z: arrival.z, heading: 0 })).resolves.toMatchObject({ ok: true });
    expect(f.calls.filter(call => call.event === 'house.move').at(-1)!.value.generation).toBe(3);
    expect(f.stands).toHaveLength(0);
    expect(f.calls.filter(call => call.event === 'house.subscribe')).toHaveLength(2);
  },
);

it('settles a real World flight after a synthetic same-scope lease change smaller than its correction threshold', async () => {
  const f = await actualHouse(); f.deferNextMotion(); f.key('keydown', 's'); await f.step(100);
  const before = f.calls.filter(call => call.event === 'house.move'); expect(before).toHaveLength(1);
  const sent = before[0].value, authority = { x: sent.x + .1, z: sent.z };
  expect(Math.hypot(authority.x - sent.x, authority.z - sent.z)).toBeLessThan(1.15);
  f.syntheticLeaseRelease(authority); await flush(); await f.step(0);
  // Same controller/access/zone/seatId scope and a 0.1-unit correction leave
  // World's existing prediction/flight intact until its real client receipt.
  expect(Number(f.element('house-world').dataset.selfX)).toBeCloseTo(sent.x, 3);
  await f.settleMotion(); await f.step(0);
  expect(Number(f.element('house-world').dataset.selfX)).toBeCloseTo(authority.x, 3);
  expect(Number(f.element('house-world').dataset.selfZ)).toBeCloseTo(authority.z, 3);
  await f.step(100);
  const resumed = f.calls.filter(call => call.event === 'house.move'); expect(resumed).toHaveLength(2);
  expect(Math.hypot(resumed[1].value.x - authority.x, resumed[1].value.z - authority.z)).toBeGreaterThan(.1);
  f.key('keyup', 's');
});
