import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { io, type Socket } from "socket.io-client";
import { afterAll, afterEach, describe, expect, test, vi } from "vitest";
import { createService } from "../src/server.ts";
import { HOUSE_WORLD_VERSION, createLayout, slide, validPosition } from "../public/house-geometry.js";
import type { LiveSnapshot } from "../src/house-contract.ts";
import { classifyBootstrapRateAck } from "../tools/spatial-resource.mjs";

// Actual service + Socket.IO I/O with independent injected elapsed and civil clocks.
// These deterministic regressions do not assert real pacing, B2 cause or hosting acceptance.
const cleanup: (() => unknown | Promise<unknown>)[] = [];
const cases: Record<string, unknown>[] = [];
const closure = { fixturesCreated: 0, servicesClosed: 0, socketsDisconnected: 0, directoriesRemoved: 0 };

function safeAck(ack: any) {
  return { ok: ack?.ok === true, code: ack?.ok === true ? "OK" : ["RATE_LIMITED", "INVALID_MOVE", "STALE_INPUT"].includes(ack?.code) ? ack.code : "OTHER", classification: classifyBootstrapRateAck(ack) };
}
async function ask(socket: Socket, event: string, body: unknown) {
  try { return await socket.timeout(2000).emitWithAck(event, body); }
  catch { throw new Error("SOCKET_ACK_UNAVAILABLE"); }
}
function summary(id: string, wallProfile: string, rows: any[], elapsedMs: number, wallDeltaMs: number, extra: Record<string, unknown> = {}) {
  const counter = { OK: 0, ACTION_BUDGET: 0, MOVE_INTERVAL: 0, OTHER: 0 };
  for (const row of rows) counter[row.classification as keyof typeof counter]++;
  const record = { id, wallProfile, sent: rows.length, accepted: rows.filter(row => row.ok).length, denied: rows.filter(row => !row.ok).length, classifications: counter, codes: rows.map(row => row.code), syntheticElapsedMs: elapsedMs, controlledWallDeltaMs: wallDeltaMs, ...extra };
  cases.push(record);
  return record;
}
afterEach(async () => {
  vi.restoreAllMocks();
  for (const fn of cleanup.splice(0).reverse()) await fn();
});
afterAll(() => {
  console.info(JSON.stringify({
    schemaVersion: 2,
    scope: "Actual loopback service and Socket.IO acknowledgements; independent injected elapsed and spied wall clocks; no real pacing, B2 attribution, sustained load or hosting acceptance claim.",
    elapsedClock: "Independent synthetic counter supplied through houseElapsedNow; native socket scheduling remains real.",
    wallClock: "Date.now spy; real socket I/O and real service scheduling remain active.",
    historicalEvidence: "Original bug-characterization spec and rate-attribution-controls-observations.json remain frozen; corrected regressions emit only to stdout.",
    cases, closure,
  }, null, 2));
});
async function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "spatial-rate-controls-"));
  cleanup.push(() => { rmSync(directory, { recursive: true, force: true }); closure.directoriesRemoved++; });
  let wall = Date.now(), elapsed = 0;
  const app = createService({ dataDir: directory, secureCookies: false, activityLog: () => {}, houseElapsedNow: () => elapsed });
  closure.fixturesCreated++;
  cleanup.push(async () => { await app.close(); closure.servicesClosed++; });
  const person = app.houseStore.ensureSession();
  app.houseStore.execute(person.id, { commandId: randomUUID(), type: "house.create", payload: { capacity: 6, name: "Rate fixture", colour: "sage" } });
  await new Promise<void>(resolve => app.server.listen(0, "127.0.0.1", resolve));
  const base = "http://127.0.0.1:" + (app.server.address() as { port: number }).port;
  vi.spyOn(Date, "now").mockImplementation(() => wall);
  const socket = io(base, { auth: { worldVersion: HOUSE_WORLD_VERSION }, transports: ["websocket"], reconnection: false, extraHeaders: { Origin: base, Cookie: "house_session=" + person.token } });
  cleanup.push(() => { socket.disconnect(); closure.socketsDisconnected++; });
  await new Promise<void>((resolve, reject) => { socket.once("connect", resolve); socket.once("connect_error", () => reject(new Error("SOCKET_CONNECT_UNAVAILABLE"))); });
  const subscribed = await ask(socket, "house.subscribe", { zoneId: "lounge", controllerToken: randomUUID() });
  expect(subscribed?.ok === true).toBe(true);
  const state = subscribed.snapshot as LiveSnapshot;
  const self = state.players.find(player => player.id === person.id)!;
  const origin = { x: self.x!, z: self.z! }, quarter = { x: self.x! + .25, z: self.z! };
  const layout = createLayout(6);
  for (const [from, to] of [[origin, quarter], [quarter, origin]]) {
    expect(validPosition(layout, from!)).toBe(true);
    expect(validPosition(layout, to!)).toBe(true);
    const swept = slide(layout, from!, to!.x - from!.x, to!.z - from!.z);
    expect(Math.hypot(swept.x - to!.x, swept.z - to!.z)).toBeLessThan(.01);
  }
  let sequence = 0;
  const step = (syntheticElapsedMs: number, wallMs = syntheticElapsedMs) => { elapsed += syntheticElapsedMs; wall += wallMs; };
  const move = (point = origin, inputSequence = ++sequence) => ask(socket, "house.move", { generation: state.generation, sequence: inputSequence, ...point, heading: 0 });
  const available = (index: number) => ask(socket, "house.availability", { generation: state.generation, value: index % 2 ? "chat" : "quiet" });
  return { step, move, available, origin, quarter, elapsed: () => elapsed, wall: () => wall };
}

describe("actual realtime elapsed-clock regressions with independent civil time", () => {
  test("normal synthetic elapsed100ms/wall100ms accepts paced quarter-metre moves", async () => {
    const f = await fixture(), start = f.wall(), rows = [];
    for (let index = 0; index < 12; index++) { f.step(100); rows.push(safeAck(await f.move(index % 2 ? f.origin : f.quarter))); }
    const result = summary("quarter-normal", "plus100ms-per-action", rows, f.elapsed(), f.wall() - start);
    expect(result.accepted).toBe(12);
    expect(result.classifications).toEqual({ OK: 12, ACTION_BUDGET: 0, MOVE_INTERVAL: 0, OTHER: 0 });
  });

  test("backward civil correction preserves a normally paced move", async () => {
    const f = await fixture(), start = f.wall();
    f.step(100); const first = safeAck(await f.move(f.quarter));
    // The accepted .25 m move earns .32 and leaves .07 by the source formula.
    // Elapsed advances100 while civil time advances100 then steps back30.
    // The wall correction must neither shorten the interval nor remove credit.
    f.step(100, 100); f.step(0, -30); const second = safeAck(await f.move(f.origin));
    summary("quarter-backstep-discriminator", "plus100ms-then-back30ms", [first, second], f.elapsed(), f.wall() - start, { derivedCreditAfterFirstMetres: .07 });
    expect(first).toEqual({ ok: true, code: "OK", classification: "OK" });
    expect(second).toEqual({ ok: true, code: "OK", classification: "OK" });
  });

  test("stalled civil time preserves normally accrued movement credit", async () => {
    const f = await fixture(), start = f.wall();
    f.step(100); const first = safeAck(await f.move(f.quarter));
    f.step(100, 0); const masked = safeAck(await f.move(f.origin));
    summary("quarter-stalled-credit-mask", "stalled-after-first-move", [first, masked], f.elapsed(), f.wall() - start, { derivedCreditAfterFirstMetres: .07 });
    expect(first).toEqual({ ok: true, code: "OK", classification: "OK" });
    expect(masked).toEqual({ ok: true, code: "OK", classification: "OK" });
  });

  // Forward500ms/action stays below Socket.IO heartbeat expiry across the31 actions.
  for (const action of ["zero-move", "availability"] as const) {
    for (const profile of ["normal", "stalled", "backward", "forward"] as const) {
      test(`${action}:31 paced elapsed100ms actions survive ${profile} civil time`, async () => {
        const f = await fixture();
        // Reset the elapsed budget before the loop so subscription is excluded.
        f.step(1000, 1000);
        const start = f.wall(), rows = [];
        for (let index = 0; index < 31; index++) {
          f.step(100, profile === "normal" ? 100 : profile === "forward" ? 500 : profile === "backward" && index > 0 ? -1 : 0);
          rows.push(safeAck(action === "zero-move" ? await f.move() : await f.available(index)));
        }
        const result = summary(`${action}-${profile}`, profile, rows, f.elapsed(), f.wall() - start, { subscriptionExcludedBySetupElapsedAdvanceMs: 1000 });
        expect(result.accepted).toBe(31);
        expect(result.classifications).toEqual({ OK: 31, ACTION_BUDGET: 0, MOVE_INTERVAL: 0, OTHER: 0 });
        expect(rows.at(-1)).toEqual({ ok: true, code: "OK", classification: "OK" });
      });
    }
  }

  test("genuinely fast synthetic elapsed10ms/wall10ms movement remains denied after credit accrues", async () => {
    const f = await fixture(), start = f.wall();
    f.step(200); const first = safeAck(await f.move(f.quarter));
    f.step(10); const fast = safeAck(await f.move(f.origin));
    const result = summary("genuine-fast-movement", "plus10ms-after200ms-accrual", [first, fast], f.elapsed(), f.wall() - start, { derivedCreditAfterFirstMetres: .39 });
    expect(result.classifications).toEqual({ OK: 1, ACTION_BUDGET: 0, MOVE_INTERVAL: 1, OTHER: 0 });
    expect(fast).toEqual({ ok: false, code: "RATE_LIMITED", classification: "MOVE_INTERVAL" });
  });

  test("genuine31-event burst remains denied by the general action budget", async () => {
    const f = await fixture(); f.step(1000, 1000);
    const start = f.wall(), rows = [];
    for (let index = 0; index < 31; index++) rows.push(safeAck(await f.available(index)));
    const result = summary("genuine-action-burst", "no-elapsed-or-wall-increments", rows, f.elapsed(), f.wall() - start, { subscriptionExcludedBySetupElapsedAdvanceMs: 1000 });
    expect(result.accepted).toBe(30);
    expect(result.classifications).toEqual({ OK: 30, ACTION_BUDGET: 1, MOVE_INTERVAL: 0, OTHER: 0 });
    expect(rows.at(-1)).toEqual({ ok: false, code: "RATE_LIMITED", classification: "ACTION_BUDGET" });
  });

  test("a forward civil jump cannot mint distance credit", async () => {
    const f = await fixture(), start = f.wall();
    f.step(0, 1000);
    const denied = safeAck(await f.move(f.quarter));
    summary("forward-wall-no-distance-credit", "plus1000ms-with-zero-elapsed", [denied], f.elapsed(), f.wall() - start);
    expect(denied).toEqual({ ok: false, code: "INVALID_MOVE", classification: "OTHER" });
  });

  test("forward civil jumps cannot refresh an immediate thirty-action elapsed budget", async () => {
    const f = await fixture(); f.step(1000, 1000);
    const start = f.wall(), rows = [];
    for (let index = 0; index < 31; index++) {
      f.step(0, 500);
      rows.push(safeAck(await f.available(index)));
    }
    const result = summary("forward-wall-no-budget-reset", "plus500ms-per-action-zero-elapsed", rows, f.elapsed(), f.wall() - start);
    expect(result.accepted).toBe(30);
    expect(result.classifications).toEqual({ OK: 30, ACTION_BUDGET: 1, MOVE_INTERVAL: 0, OTHER: 0 });
    expect(rows.at(-1)).toEqual({ ok: false, code: "RATE_LIMITED", classification: "ACTION_BUDGET" });
  });

  test("elapsed movement accepts exactly80ms but rejects79ms despite forward civil time", async () => {
    const f = await fixture(), start = f.wall();
    f.step(200); expect(safeAck(await f.move(f.quarter))).toEqual({ ok: true, code: "OK", classification: "OK" });
    f.step(79, 1000); const early = safeAck(await f.move(f.origin));
    f.step(1, 0); const boundary = safeAck(await f.move(f.origin));
    summary("elapsed-movement-boundary", "forward-civil-while-elapsed79-then80ms", [early, boundary], f.elapsed(), f.wall() - start);
    expect(early).toEqual({ ok: false, code: "RATE_LIMITED", classification: "MOVE_INTERVAL" });
    expect(boundary).toEqual({ ok: true, code: "OK", classification: "OK" });
  });

  test("duplicate accepted motion sequence remains STALE_INPUT below the general budget", async () => {
    const f = await fixture(), start = f.wall();
    f.step(100); const first = safeAck(await f.move(f.quarter, 1));
    f.step(100); const stale = safeAck(await f.move(f.origin, 1));
    summary("duplicate-sequence", "plus100ms-per-action", [first, stale], f.elapsed(), f.wall() - start);
    expect(first).toEqual({ ok: true, code: "OK", classification: "OK" });
    expect(stale).toEqual({ ok: false, code: "STALE_INPUT", classification: "OTHER" });
  });
});
