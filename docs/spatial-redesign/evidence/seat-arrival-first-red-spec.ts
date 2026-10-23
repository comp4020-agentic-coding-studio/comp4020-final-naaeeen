import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';
import { HOUSE_WORLD_VERSION } from '../public/house-version.js';
import { createLayout } from '../public/house-geometry.js';

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
  let state: any = initialSnapshot(), serverSeated = false, seatAck: ((reply: any) => void) | null = null;
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
      if (event === 'house.subscribe') return Promise.resolve({ ok: true, snapshot: structuredClone(state) });
      if (event === 'house.seat') {
        serverSeated = true;
        return new Promise(resolve => { seatAck = resolve; });
      }
      if (event === 'house.move') {
        // The real server rejects every move while its seat lease is occupied.
        if (serverSeated) return Promise.resolve({ ok: false, code: 'INVALID_MOVE' });
        Object.assign(state.players[0], { x: value.x, z: value.z, heading: value.heading });
        return Promise.resolve({ ok: true, sequence: value.sequence });
      }
      if (event === 'house.stand') { serverSeated = false; return Promise.resolve({ ok: true }); }
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
    async goStudy() {
      document.querySelector<HTMLButtonElement>('[data-panel="places"]')!.click();
      document.querySelector<HTMLButtonElement>('#places-panel [data-place="study"]')!.click();
      for (let frame = 0; frame < 240 && !calls.some(call => call.event === 'house.seat'); frame++) await step();
      expect(calls.filter(call => call.event === 'house.seat')).toHaveLength(1);
    },
    async acknowledgeSeat(reply: any = { ok: true }) { expect(seatAck).not.toBeNull(); seatAck!(reply); await flush(); },
    projectSeat() {
      const seatId = calls.find(call => call.event === 'house.seat')!.value.seatId;
      const seat = createLayout(2).seats.find(candidate => candidate.id === seatId)!;
      state = structuredClone(state);
      Object.assign(state.players[0], { seatId, x: seat.x, z: seat.z, heading: seat.heading, animation: 'sit', seatGeneration: 2 });
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
