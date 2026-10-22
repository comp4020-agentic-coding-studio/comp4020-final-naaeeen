import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { beginAdmission, closeChat, closeTool } from './house-journey.ts';

// Deliberately avoid automatic UI/body capture around admission and wire observation.
process.env.PLAYWRIGHT_NO_COPY_PROMPT = '1';
test.use({ trace: 'off', screenshot: 'off', video: 'off' });
type Phase = 'admission' | 'idle-control' | 'steady-control' | 'study-route' | 'panel-control' | 'seat-held' | 'post-stand-control' | 'room-route' | 'zone-held' | 'room-steady-control' | 'cleanup';
type EventCategory = 'MOVE_NONZERO' | 'MOVE_ZERO' | 'MOVE_UNRESOLVED' | 'STAND' | 'SEAT' | 'SUBSCRIBE_LOUNGE' | 'SUBSCRIBE_ROOM';
type AckCategory = 'ACK_OK' | 'MOVE_INTERVAL' | 'ACTION_BUDGET' | 'RATE_UNKNOWN' | 'INVALID_MOVE' | 'OTHER_REJECT' | 'MALFORMED_ACK';
interface Observation { ordinal: number; phase: Phase; cycle: number; event: EventCategory; sentMs: number; distanceDelta: number | null; ackMs?: number; ack?: AckCategory }
interface NativeKey { category: Mark['category']; trusted: boolean; browserAtMs: number }
interface Mark { category: 'KEY_DOWN' | 'KEY_UP' | 'FRAME_READY' | 'HEAD_SEATED' | 'HEAD_STANDING' | 'HEAD_ROOM' | 'ZONE_KEY_LANDED_ROOM' | 'ZONE_KEY_LANDED_LOUNGE' | 'ZONE_KEY_LANDED_OTHER'; phase: Phase; cycle: number; atMs: number }
const world = (page: Page) => page.locator('.house-world-canvas');
const round = (value: number) => Math.round(value * 1000) / 1000;
function ackCategory(reply: Record<string, unknown> | null): AckCategory {
  if (!reply || typeof reply !== 'object') return 'MALFORMED_ACK';
  if (reply.ok === true) return 'ACK_OK';
  if (reply.code === 'RATE_LIMITED') {
    if (reply.message === 'Movement updates are limited to ten per second.') return 'MOVE_INTERVAL';
    if (reply.message === 'Please slow down your house actions.') return 'ACTION_BUDGET';
    return 'RATE_UNKNOWN';
  }
  return reply.code === 'INVALID_MOVE' ? 'INVALID_MOVE' : typeof reply.code === 'string' ? 'OTHER_REJECT' : 'MALFORMED_ACK';
}
function observeMotion(page: Page) {
  const started = performance.now(), rows: Observation[] = [], marks: Mark[] = [];
  let phase: Phase = 'admission', cycle = -1, selfId = '', roomId = '', anchor: { x: number; z: number } | null = null;
  let previousSeated: boolean | null = null, previousRoom = false, parseFailures = 0, pageErrors = 0;
  let roomHook: (() => void) | null = null;
  const elapsed = () => round(performance.now() - started);
  const mark = (category: Mark['category']) => marks.push({ category, phase, cycle, atMs: elapsed() });
  const head = (snapshot: Record<string, any>) => {
    if (typeof snapshot?.durable?.selfId === 'string') selfId = snapshot.durable.selfId;
    const player = Array.isArray(snapshot?.players) ? snapshot.players.find((entry: any) => entry.id === selfId) : null;
    if (Number.isFinite(player?.x) && Number.isFinite(player?.z)) anchor = { x: player.x, z: player.z };
    if (player && Boolean(player.seatId) !== previousSeated) { previousSeated = Boolean(player.seatId); mark(previousSeated ? 'HEAD_SEATED' : 'HEAD_STANDING'); }
    const inRoom = snapshot?.durable?.zoneId === roomId && Boolean(roomId);
    if (inRoom && !previousRoom) mark('HEAD_ROOM');
    if (snapshot?.durable) previousRoom = inRoom;
  };
  page.on('pageerror', () => pageErrors++);
  page.on('websocket', socket => {
    // ACK IDs and all wire bodies exist only in this closure; never emitted or attached.
    const pending = new Map<string, { row: Observation; position?: { x: number; z: number } }>();
    socket.on('framesent', frame => {
      const match = String(frame.payload).match(/^42([0-9]+)(\[.*)$/s); if (!match) return;
      try {
        const [event, body] = JSON.parse(match[2]);
        let category: EventCategory | null = null, distanceDelta: number | null = null;
        if (event === 'house.move') {
          distanceDelta = anchor && Number.isFinite(body?.x) && Number.isFinite(body?.z) ? round(Math.hypot(body.x - anchor.x, body.z - anchor.z)) : null;
          category = distanceDelta === null ? 'MOVE_UNRESOLVED' : distanceDelta > .001 ? 'MOVE_NONZERO' : 'MOVE_ZERO';
        } else if (event === 'house.stand') category = 'STAND';
        else if (event === 'house.seat') category = 'SEAT';
        else if (event === 'house.subscribe') category = body?.zoneId === 'lounge' ? 'SUBSCRIBE_LOUNGE' : 'SUBSCRIBE_ROOM';
        if (!category) return;
        const row: Observation = { ordinal: rows.length, phase, cycle, event: category, sentMs: elapsed(), distanceDelta };
        rows.push(row); pending.set(match[1], { row, position: event === 'house.move' ? { x: body.x, z: body.z } : undefined });
      } catch { parseFailures++; }
    });
    socket.on('framereceived', frame => {
      const match = String(frame.payload).match(/^4([23])([0-9]*)(\[.*)$/s); if (!match) return;
      try {
        const data = JSON.parse(match[3]);
        if (match[1] === '2' && data[0] === 'house.snapshot') head(data[1]);
        if (match[1] === '2' && data[0] === 'house.motion') head(data[1]);
        if (match[1] !== '3') return;
        const request = pending.get(match[2]); if (!request) return;
        pending.delete(match[2]); request.row.ackMs = elapsed(); request.row.ack = ackCategory(data[0]);
        if (request.row.ack === 'ACK_OK' && request.position) anchor = request.position;
        if (data[0]?.snapshot) head(data[0].snapshot);
        if (request.row.event === 'SUBSCRIBE_ROOM' && request.row.ack === 'ACK_OK' && roomHook) { const hook = roomHook; roomHook = null; hook(); }
      } catch { parseFailures++; }
    });
  });
  return { rows, marks, mark, setPhase(value: Phase, index = -1) { phase = value; cycle = index; }, setRoom(value: string) { roomId = value; }, armRoom(hook: () => void) { roomHook = hook; }, health: () => ({ parseFailures, pageErrors }), elapsed };
}
function transitionSummaries(rows: Observation[], marks: Mark[]) {
  return [0, 1, 2, 3].map(cycle => {
    const stand = rows.find(row => row.phase === 'seat-held' && row.cycle === cycle && row.event === 'STAND');
    const first = rows.find(row => row.phase === 'seat-held' && row.cycle === cycle && row.event === 'MOVE_NONZERO');
    const standing = marks.find(mark => mark.phase === 'seat-held' && mark.cycle === cycle && mark.category === 'HEAD_STANDING');
    return { cycle, declaredFrameOffsetMs: [0, 25, 50, 75][cycle], standAck: stand?.ack ?? null, firstMoveAck: first?.ack ?? null,
      standAckToProjectionMs: stand?.ackMs !== undefined && standing ? round(standing.atMs - stand.ackMs) : null,
      standAckToFirstMoveSendMs: stand?.ackMs !== undefined && first ? round(first.sentMs - stand.ackMs) : null,
      projectionToFirstMoveSendMs: standing && first ? round(first.sentMs - standing.atMs) : null,
      observedSub80AfterStandAck: stand?.ackMs !== undefined && first ? first.sentMs - stand.ackMs >= 0 && first.sentMs - stand.ackMs < 80 : false };
  });
}
async function held(page: Page, key: string, duration: number, wire: ReturnType<typeof observeMotion>) {
  wire.mark('KEY_DOWN'); await page.keyboard.down(key);
  try { await page.waitForTimeout(duration); }
  finally { await page.keyboard.up(key); wire.mark('KEY_UP'); }
}
async function save(info: TestInfo, value: unknown) {
  const path = info.outputPath('motion-transition-observations.json');
  await writeFile(path, JSON.stringify(value, null, 2) + '\n');
  await info.attach('motion-transition-observations', { path, contentType: 'application/json' });
}

test('native held movement keeps its ordinary cadence across physical Stand and room arrival', async ({ browser, baseURL }, info) => {
  if (!baseURL) throw new Error('The registered native diagnostic requires baseURL.');
  const controls = [
    { expected: 'ACK_OK', actual: ackCategory({ ok: true }) },
    { expected: 'MOVE_INTERVAL', actual: ackCategory({ ok: false, code: 'RATE_LIMITED', message: 'Movement updates are limited to ten per second.' }) },
    { expected: 'ACTION_BUDGET', actual: ackCategory({ ok: false, code: 'RATE_LIMITED', message: 'Please slow down your house actions.' }) },
    { expected: 'RATE_UNKNOWN', actual: ackCategory({ ok: false, code: 'RATE_LIMITED', message: 'Unclassified rate failure' }) },
    { expected: 'INVALID_MOVE', actual: ackCategory({ ok: false, code: 'INVALID_MOVE' }) },
    { expected: 'MALFORMED_ACK', actual: ackCategory(null) },
  ];
  for (const control of controls) expect(control.actual).toBe(control.expected);
  const context = await browser.newContext({ baseURL, viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage(), wire = observeMotion(page);
  let flowComplete = false, contextClosed = false, cleanupErrors = 0, zoneHookErrors = 0;
  const zoneCapture: { pressed: Promise<void> | null; nativeKey: NativeKey | null } = { pressed: null, nativeKey: null };
  const counts = (phase: Phase) => wire.rows.filter(row => row.phase === phase);
  try {
    await beginAdmission(page, 'create');
    await page.getByLabel('Your name', { exact: true }).fill('Motion diagnostic');
    await page.getByRole('combobox', { name: 'Bedrooms', exact: true }).selectOption('2');
    await page.getByRole('button', { name: 'Create house', exact: true }).click();
    await expect(page.locator('#connection-status')).toHaveText('Together, live');
    await expect(world(page)).toHaveAttribute('data-self-x', /^-?[0-9]/);
    const response = await page.request.get('/api/house/snapshot?zone=lounge'); expect(response.status()).toBe(200);
    const snapshot = await response.json(), ownRoom = snapshot.residents.find((resident: any) => resident.id === snapshot.selfId)?.bedroomId;
    expect(typeof ownRoom).toBe('string'); wire.setRoom(ownRoom);
    await closeChat(page); await world(page).focus(); await expect(world(page)).toBeFocused();
    wire.setPhase('idle-control'); await page.waitForTimeout(300);
    expect(counts('idle-control')).toHaveLength(0);
    wire.setPhase('steady-control'); await held(page, 's', 400, wire); await page.waitForTimeout(200);
    expect(counts('steady-control').some(row => row.event === 'MOVE_NONZERO' && row.ack === 'ACK_OK')).toBe(true);
    expect(counts('steady-control').every(row => row.ack === 'ACK_OK')).toBe(true);
    for (const [cycle, offset] of [0, 25, 50, 75].entries()) {
      wire.setPhase('study-route', cycle); await closeTool(page);
      await page.getByRole('button', { name: 'Places', exact: true }).click();
      await page.locator('#places-panel [data-place="study"]').click();
      await expect(world(page)).toHaveAttribute('data-self-animation', 'sit', { timeout: 20_000 });
      await expect(page.locator('#gathering-panel')).toBeVisible();
      if (cycle === 0) {
        wire.setPhase('panel-control', cycle); await held(page, 'w', 300, wire);
        expect(counts('panel-control')).toHaveLength(0);
      }
      await closeTool(page); await world(page).focus(); await expect(world(page)).toBeFocused();
      wire.setPhase('seat-held', cycle);
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve()))); wire.mark('FRAME_READY');
      if (offset) await page.waitForTimeout(offset);
      await held(page, 'w', 400, wire);
      await expect(world(page)).not.toHaveAttribute('data-self-animation', 'sit');
      await page.waitForTimeout(200);
      expect(wire.rows.some(row => row.phase === 'seat-held' && row.cycle === cycle && row.event === 'STAND' && row.ack === 'ACK_OK')).toBe(true);
      expect(wire.rows.some(row => row.phase === 'seat-held' && row.cycle === cycle && row.event === 'MOVE_NONZERO' && row.ack !== undefined)).toBe(true);
    }
    wire.setPhase('post-stand-control'); await page.waitForTimeout(200); await held(page, 's', 400, wire); await page.waitForTimeout(200);
    expect(counts('post-stand-control').some(row => row.event === 'MOVE_NONZERO' && row.ack === 'ACK_OK')).toBe(true);
    expect(counts('post-stand-control').every(row => row.ack === 'ACK_OK')).toBe(true);
    wire.setPhase('room-route');
    // Read-only capture records the visible zone at the actual native keydown,
    // rather than inferring it from a later Playwright RPC/DOM read.
    await page.evaluate(room => {
      const win = window as typeof window & { __motionNativeKey?: { category: string; trusted: boolean; browserAtMs: number } };
      window.addEventListener('keydown', event => {
        if (event.key.toLowerCase() !== 'w' || event.repeat) return;
        const zone = (document.querySelector('.house-world-canvas') as HTMLElement | null)?.dataset.zoneId;
        win.__motionNativeKey = { category: zone === room ? 'ZONE_KEY_LANDED_ROOM' : zone === 'lounge' ? 'ZONE_KEY_LANDED_LOUNGE' : 'ZONE_KEY_LANDED_OTHER', trusted: event.isTrusted, browserAtMs: performance.now() };
      }, { capture: true });
    }, ownRoom);
    wire.armRoom(() => {
      wire.setPhase('zone-held');
      zoneCapture.pressed = (async () => {
        wire.mark('KEY_DOWN'); await page.keyboard.down('w');
        zoneCapture.nativeKey = await page.evaluate(() => (window as typeof window & { __motionNativeKey?: NativeKey }).__motionNativeKey ?? null);
        wire.mark(zoneCapture.nativeKey?.category ?? 'ZONE_KEY_LANDED_OTHER');
      })().catch(() => { zoneHookErrors++; });
    });
    await page.getByRole('button', { name: 'Places', exact: true }).click();
    await page.locator('#places-panel [data-place="room"]').click();
    await expect(world(page)).toHaveAttribute('data-zone-id', ownRoom, { timeout: 20_000 });
    expect(zoneCapture.pressed !== null).toBe(true); await zoneCapture.pressed;
    try { await page.waitForTimeout(400); }
    finally { await page.keyboard.up('w'); wire.mark('KEY_UP'); }
    await page.waitForTimeout(200);
    wire.setPhase('room-steady-control'); await closeTool(page); await world(page).focus(); await page.waitForTimeout(150); await held(page, 'w', 400, wire); await page.waitForTimeout(200);
    expect(counts('room-steady-control').some(row => row.event === 'MOVE_NONZERO' && row.ack === 'ACK_OK')).toBe(true);
    expect(zoneHookErrors).toBe(0); expect(zoneCapture.nativeKey?.trusted).toBe(true); expect(wire.health()).toEqual({ parseFailures: 0, pageErrors: 0 });
    await expect.poll(() => wire.rows.filter(row => row.ack === undefined), { timeout: 2000 }).toEqual([]);
    flowComplete = true;
    // This intended behavior assertion is deliberately last: all native timings survive a real RED.
    const rejections = wire.rows.filter(row => row.ack && row.ack !== 'ACK_OK');
    expect(rejections, 'Ordinary UI movement must not trip movement/action rejection categories.').toEqual([]);
  } finally {
    wire.setPhase('cleanup');
    for (const key of ['w', 's']) try { await page.keyboard.up(key); } catch { cleanupErrors++; }
    try { await context.close(); contextClosed = true; } catch { cleanupErrors++; }
    const transitions = transitionSummaries(wire.rows, wire.marks);
    const roomSubscribe = wire.rows.find(row => row.event === 'SUBSCRIBE_ROOM');
    const firstZoneMove = wire.rows.find(row => row.phase === 'zone-held' && row.event === 'MOVE_NONZERO');
    await save(info, { scope: 'One native authenticated desktop; four actual study-seat held-key Stand cycles and one own-room arrival. Wire content is summarized into fixed categories and numeric deltas only. No raw IDs, controller tokens, bodies, cookies, keys or URLs are stored.',
      timingScope: 'All timestamps are monotonic Node-side observations of native input calls and Playwright WS frame notifications, not server receive/elapsed timestamps. Declared RAF offsets do not prove server push phase coverage.',
      flowComplete, controls, rows: wire.rows, marks: wire.marks, transitions, health: wire.health(), zoneHookErrors,
      zoneArrival: { subscribeAck: roomSubscribe?.ack ?? null, subscribeAckToFirstMoveSendMs: roomSubscribe?.ackMs !== undefined && firstZoneMove ? round(firstZoneMove.sentMs - roomSubscribe.ackMs) : null, firstMoveAck: firstZoneMove?.ack ?? null, noMoveInHeldWindow: !firstZoneMove, nativeKeyCapture: zoneCapture.nativeKey, browserClockIsSeparateFromNodeObservationClock: true },
      coverage: { observedSub80SeatCycles: transitions.filter(row => row.observedSub80AfterStandAck).length, declaredCycles: 4, unobservedSub80IsNotAClaimOfSafety: true },
      cleanup: { contextClosed, cleanupErrors }, totalObservedMs: wire.elapsed() });
    expect(contextClosed).toBe(true); expect(cleanupErrors).toBe(0);
  }
});
