import { JSDOM } from 'jsdom';
import { afterEach, expect, it, vi } from 'vitest';
import { collectWorldPresence } from './dom-observation.mjs';
import { assertMappedAvatarLabels } from './guards.mjs';

// Use the production renderer's scene/DOM construction. Only GPU submission and
// host layout/hit APIs are mocked: this is offline selector/mapping calibration.
vi.mock('three', async importOriginal => {
  const actual = await importOriginal();
  class Renderer {
    shadowMap = {};
    setPixelRatio() {}
    setSize() {}
    render(scene, camera) { scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); }
    dispose() {}
  }
  return { ...actual, WebGLRenderer: Renderer };
});
import { createHouseWorld } from '../../../../public/house-world.js';
import { createLayout } from '../../../../public/house-geometry.js';

const cleanups = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  vi.unstubAllGlobals();
});

function productionDom() {
  const dom = new JSDOM('<div id="world"></div>', { url: 'http://localhost', runScripts: 'outside-only' });
  Object.defineProperty(dom.window, 'matchMedia', { value: () => ({ matches: false }) });
  vi.stubGlobal('window', dom.window); vi.stubGlobal('document', dom.window.document);
  vi.stubGlobal('HTMLElement', dom.window.HTMLElement);
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} unobserve() {} });
  let next = () => {};
  vi.stubGlobal('requestAnimationFrame', callback => { next = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  const container = dom.window.document.getElementById('world');
  Object.defineProperty(container, 'clientWidth', { value: 1920 });
  Object.defineProperty(container, 'clientHeight', { value: 1080 });
  const world = createHouseWorld(container);
  cleanups.push(() => { world.dispose(); dom.window.close(); });
  const gameSeats = createLayout(6).seats.filter(seat => seat.purpose === 'game');
  expect(gameSeats).toHaveLength(6);
  const identities = gameSeats.map((seat, index) => ({
    id: '00000000-0000-4000-8000-' + String(index + 1).padStart(12, '0'), name: 'Group contributor ' + (index + 1),
  }));
  const players = identities.map((person, index) => ({ ...person, colour: 'sage', connected: true, zoneId: 'lounge',
    x: gameSeats[index].x, z: gameSeats[index].z, heading: gameSeats[index].heading,
    animation: 'sit', seatId: gameSeats[index].id, seatGeneration: 2, availability: 'quiet', availabilitySetAt: 0 }));
  world.update({ serverEpoch: 'offline-epoch', accessGeneration: 1, generation: 1, controller: true,
    durable: { schemaVersion: 2, selfId: identities[0].id, house: { id: 'offline-house', ownerId: identities[0].id, capacity: 6, code: 'offline-fixture' },
      residents: players.map((player, index) => ({ ...player, slot: index, bedroomId: 'offline-room-' + index, open: false })),
      zoneId: 'lounge', streamId: 'lounge:offline-house', sequence: 0, room: null, cards: [], chat: [], puzzle: null }, players });
  world.setCameraMode('overview'); next(0); next(16);
  const canvas = container.querySelector('canvas');
  // JSDOM does not render or hit-test; those facts remain native-run conditions.
  dom.window.document.elementFromPoint = () => canvas;
  const reader = dom.window.eval('(' + collectWorldPresence.toString() + ')');
  // Playwright transfers evaluate results into Node, rather than returning a
  // live foreign-realm array. These mapping fixtures contain JSON-safe values.
  const read = (scope = { identities, selfId: identities[0].id }) => JSON.parse(JSON.stringify(reader(canvas, scope)));
  return { container, identities, read };
}

it('maps six actual production avatar display-name children and preserves mesh IDs', () => {
  const fixture = productionDom(), expectedIds = fixture.identities.map(person => person.id);
  expect(fixture.container.querySelectorAll('.house-world-label.avatar')).toHaveLength(6);
  expect(fixture.container.querySelectorAll('.house-world-label.avatar .house-avatar-display-name')).toHaveLength(6);
  const result = fixture.read();
  expect(result.labels.map(label => label.id)).toEqual(expectedIds);
  expect(result.labels[0].displayName).toBe('Group contributor 1 (you)');
  expect(() => assertMappedAvatarLabels(result.labels, expectedIds)).not.toThrow();
  expect(result.meshes.map(mesh => mesh.id).sort()).toEqual([...expectedIds].sort());
  if (process.env.SIX_DOM_CALIBRATION_OBSERVE === '1') console.info(JSON.stringify({
    scope: 'Offline actual production DOM construction; GPU and host layout mocked',
    structuralLabels: result.labels.length, mappedIds: result.labels.map(label => label.id),
    legacyAliasLabels: fixture.container.querySelectorAll('.house-avatar-name').length,
    legacyPlayerIdAttributes: fixture.container.querySelectorAll('.house-world-label.avatar[data-player-id]').length,
  }));
});

it.each(['removed', 'spoofed'])('does not depend on legacy class/playerId aliases when %s', mode => {
  const fixture = productionDom();
  for (const label of fixture.container.querySelectorAll('.house-world-label.avatar')) {
    label.classList.remove('house-avatar-name');
    if (mode === 'removed') delete label.dataset.playerId;
    else label.dataset.playerId = 'foreign-alias';
  }
  expect(() => assertMappedAvatarLabels(fixture.read().labels, fixture.identities.map(person => person.id))).not.toThrow();
});

it.each(['missing-child', 'unknown-name', 'duplicate-name', 'wrong-self-suffix'])('rejects a production label with %s', change => {
  const fixture = productionDom();
  const displays = [...fixture.container.querySelectorAll('.house-world-label.avatar .house-avatar-display-name')];
  if (change === 'missing-child') displays[1].remove();
  if (change === 'unknown-name') displays[1].textContent = 'Unrelated person';
  if (change === 'duplicate-name') displays[1].textContent = fixture.identities[2].name;
  if (change === 'wrong-self-suffix') displays[1].textContent = fixture.identities[1].name + ' (you)';
  expect(() => assertMappedAvatarLabels(fixture.read().labels, fixture.identities.map(person => person.id))).toThrow();
});

it.each(['duplicate-name', 'duplicate-id', 'unknown-self'])('rejects ambiguous authenticated mapping input: %s', change => {
  const fixture = productionDom(), identities = structuredClone(fixture.identities);
  const scope = { identities, selfId: identities[0].id };
  if (change === 'duplicate-name') identities[1].name = identities[0].name;
  if (change === 'duplicate-id') identities[1].id = identities[0].id;
  if (change === 'unknown-self') scope.selfId = 'foreign-self';
  expect(() => fixture.read(scope)).toThrow('Six distinct authenticated IDs and scripted names are required.');
});
