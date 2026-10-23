import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { io, type Socket } from "socket.io-client";
import { afterAll, describe, expect, test } from "vitest";
import { createService } from "../src/server.ts";
import type { LiveSnapshot } from "../src/house-contract.ts";
import {
  AVATAR_RADIUS, HOUSE_WORLD_VERSION, bedroomLayout, createLayout, findRoute, slide, validPosition,
} from "../public/house-geometry.js";
import { classifyBootstrapRateAck, resourceMotionDue } from "../tools/spatial-resource.mjs";

// Bounded actual handlers with an explicitly supplied monotonic counter. Date.now,
// Socket.IO I/O and service scheduling stay real. This does not attribute the two
// historical normal-input rejections or establish native-client/network pacing.
type Point = { x: number; z: number };
type Category = "OK" | "ACTION_BUDGET" | "MOVE_INTERVAL" | "OTHER";
type Code = "OK" | "RATE_LIMITED" | "INVALID_MOVE" | "STALE_INPUT" | "STALE_GENERATION" | "NOT_CONTROLLER" | "OTHER";
type SafeAck = { accepted: 0 | 1; code: Code; classification: Category };
const OK: SafeAck = { accepted: 1, code: "OK", classification: "OK" };
const INTERVAL: SafeAck = { accepted: 0, code: "RATE_LIMITED", classification: "MOVE_INTERVAL" };
const BUDGET: SafeAck = { accepted: 0, code: "RATE_LIMITED", classification: "ACTION_BUDGET" };
const invalid = (code: Code): SafeAck => ({ accepted: 0, code, classification: "OTHER" });
const rows: Record<string, string | number>[] = [];
const closure = { fixturesCreated: 0, servicesClosed: 0, socketsOpened: 0, socketsDisconnected: 0, directoriesRemoved: 0, cleanupFailures: 0 };
let fixtureIndex = 0;

function safeAck(ack: any): SafeAck {
  const code: Code = ack?.ok === true ? "OK" : ["RATE_LIMITED", "INVALID_MOVE", "STALE_INPUT", "STALE_GENERATION", "NOT_CONTROLLER"].includes(ack?.code) ? ack.code : "OTHER";
  return { accepted: ack?.ok === true ? 1 : 0, code, classification: classifyBootstrapRateAck(ack) as Category };
}
function record(row: Record<string, string | number>) {
  if (rows.length >= 320) throw new Error("MOTION_CONTROL_OBSERVATION_BOUND");
  rows.push(row);
}
async function ask(socket: Socket, event: string, body: unknown) {
  try { return await socket.timeout(2000).emitWithAck(event, body); }
  catch { throw new Error("MOTION_CONTROL_ACK_UNAVAILABLE"); }
}
async function connected(socket: Socket) {
  await new Promise<void>((resolve, reject) => {
    const finish = (ok: boolean) => {
      clearTimeout(timer); socket.off("connect", success); socket.off("connect_error", failure);
      if (ok) resolve(); else reject(new Error("MOTION_CONTROL_CONNECT_UNAVAILABLE"));
    };
    const success = () => finish(true), failure = () => finish(false);
    const timer = setTimeout(failure, 2000);
    socket.once("connect", success); socket.once("connect_error", failure);
  });
}

async function withFixture(run: (fixture: Awaited<ReturnType<typeof newFixture>>) => Promise<void>) {
  const directory = mkdtempSync(join(tmpdir(), "spatial-motion-pacer-"));
  const sockets: Socket[] = [];
  let app: ReturnType<typeof createService> | undefined, failure: unknown;
  const index = ++fixtureIndex;
  try {
    let elapsed = 0;
    app = createService({ dataDir: directory, secureCookies: false, activityLog: () => {}, houseElapsedNow: () => elapsed });
    closure.fixturesCreated++;
    await run(await newFixture(app, index, sockets, () => elapsed, (next: number) => {
      expect(Number.isFinite(next) && next >= elapsed).toBe(true);
      elapsed = next;
    }));
  } catch (error) { failure = error; }
  finally {
    for (const socket of sockets.reverse()) { socket.disconnect(); closure.socketsDisconnected++; }
    try { if (app) { await app.close(); closure.servicesClosed++; } }
    catch { closure.cleanupFailures++; failure ??= new Error("MOTION_CONTROL_SERVICE_CLOSE_UNAVAILABLE"); }
    try { rmSync(directory, { recursive: true, force: true }); closure.directoriesRemoved++; }
    catch { closure.cleanupFailures++; failure ??= new Error("MOTION_CONTROL_DIRECTORY_CLEANUP_UNAVAILABLE"); }
  }
  if (failure) throw failure;
}

async function newFixture(app: ReturnType<typeof createService>, index: number, sockets: Socket[], elapsed: () => number, setElapsed: (next: number) => void) {
  const person = app.houseStore.ensureSession();
  app.houseStore.execute(person.id, { commandId: randomUUID(), type: "house.create", payload: { capacity: 2, name: "Motion control", colour: "sage" } });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("MOTION_CONTROL_LISTEN_UNAVAILABLE")), 2000);
    app.server.listen(0, "127.0.0.1", () => { clearTimeout(timer); resolve(); });
  });
  const base = "http://127.0.0.1:" + (app.server.address() as { port: number }).port;
  const controllerToken = randomUUID(), observerToken = randomUUID();
  const connect = async () => {
    const socket = io(base, { auth: { worldVersion: HOUSE_WORLD_VERSION }, transports: ["websocket"], reconnection: false, timeout: 2000, extraHeaders: { Origin: base, Cookie: "house_session=" + person.token } });
    sockets.push(socket); closure.socketsOpened++; await connected(socket); return socket;
  };
  const socket = await connect();
  let state: LiveSnapshot, pose: Point, acceptedSequence = 0;
  function check(phase: string, ack: any, expected: SafeAck, extra: Record<string, number> = {}) {
    const actual = safeAck(ack);
    record({ fixtureIndex: index, phase, elapsedMs: elapsed(), ...actual, expectedAccepted: expected.accepted, expectedCode: expected.code, expectedClassification: expected.classification, ...extra });
    // A surprising ACK stops this single sequential test immediately. Raw ACKs,
    // snapshots, messages, controller tokens and request bodies are never printed.
    expect(actual).toEqual(expected);
    return actual;
  }
  function self(snapshot: LiveSnapshot) {
    const player = snapshot.players.find(value => value.id === person.id);
    expect(!!player && Number.isFinite(player.x) && Number.isFinite(player.z)).toBe(true);
    return player!;
  }
  const layout = () => state.durable.room ? bedroomLayout(state.durable.room.placements) : createLayout(state.durable.house.capacity);
  const verifyClear = (from: Point, to: Point) => {
    expect(validPosition(layout(), from)).toBe(true); expect(validPosition(layout(), to)).toBe(true);
    const swept = slide(layout(), from, to.x - from.x, to.z - from.z);
    expect(Math.hypot(swept.x - to.x, swept.z - to.z)).toBeLessThan(.01);
  };
  async function subscribe(zoneId = "lounge") {
    const previousGeneration = state?.generation ?? 0, previousAccess = state?.accessGeneration ?? 0;
    const ack = await ask(socket, "house.subscribe", { zoneId, controllerToken });
    check("CONTROLLER_SUBSCRIBE", ack, OK);
    state = ack.snapshot as LiveSnapshot;
    expect(state.controller).toBe(true); expect(state.durable.zoneId === zoneId).toBe(true);
    expect(state.generation).toBeGreaterThan(previousGeneration); expect(state.accessGeneration).toBeGreaterThan(previousAccess);
    const player = self(state); pose = { x: player.x!, z: player.z! }; acceptedSequence = 0;
    return { previousGeneration, generation: state.generation };
  }
  await subscribe();
  const observer = await connect();
  async function inspect() {
    const ack = await ask(observer, "house.subscribe", { zoneId: state.durable.zoneId, controllerToken: observerToken });
    check("OBSERVER_INSPECT", ack, OK);
    const snapshot = ack.snapshot as LiveSnapshot;
    expect(snapshot.controller).toBe(false); expect(snapshot.generation).toBe(state.generation);
    return self(snapshot);
  }
  async function unchanged(before: Point) {
    const current = await inspect();
    expect({ x: current.x, z: current.z }).toEqual(before);
  }
  async function move(phase: string, target: Point, expected = OK, options: { sequence?: number; generation?: number; observer?: boolean } = {}) {
    const sequence = options.sequence ?? acceptedSequence + 1, generation = options.generation ?? state.generation;
    const ack = await ask(options.observer ? observer : socket, "house.move", { generation, sequence, ...target, heading: 0 });
    const result = check(phase, ack, expected, { sequence, generation });
    if (result.accepted) {
      expect(ack.sequence === sequence).toBe(true);
      pose = { ...target }; acceptedSequence = sequence;
    }
    return sequence;
  }
  function smallStep() {
    // Select a deterministic clear small displacement using the actual current
    // lounge/bedroom/Stand anchor, rather than forging a player position.
    for (const delta of [{ x: .1, z: 0 }, { x: -.1, z: 0 }, { x: 0, z: .1 }, { x: 0, z: -.1 }]) {
      const candidate = { x: pose.x + delta.x, z: pose.z + delta.z };
      if (!validPosition(layout(), candidate)) continue;
      const swept = slide(layout(), pose, delta.x, delta.z);
      if (Math.hypot(swept.x - candidate.x, swept.z - candidate.z) <= .01) return candidate;
    }
    throw new Error("MOTION_CONTROL_CLEAR_STEP_UNAVAILABLE");
  }
  async function approach(destination: Point) {
    const route = findRoute(layout(), pose, destination);
    expect(route !== null).toBe(true); expect(route!.length).toBeLessThanOrEqual(64);
    for (const point of route!.slice(1)) {
      verifyClear(pose, point);
      const distance = Math.hypot(point.x - pose.x, point.z - pose.z);
      setElapsed(elapsed() + Math.max(100, Math.ceil(distance / 3.2 * 1000) + 1));
      await move("LEGAL_APPROACH", point);
    }
  }
  async function seatedThenStand() {
    const seat = layout().seats.find(value => value.id === "seat-1");
    expect(!!seat).toBe(true); await approach(seat!.target);
    expect(Math.hypot(pose.x - seat!.x, pose.z - seat!.z)).toBeLessThanOrEqual(1.5);
    check("LEGAL_SEAT", await ask(socket, "house.seat", { generation: state.generation, seatId: seat!.id }), OK);
    expect((await inspect()).seatId === seat!.id).toBe(true);
    // Exclude every setup action from the timing window and accrue valid credit.
    setElapsed(elapsed() + 1000);
    check("LEGAL_STAND", await ask(socket, "house.stand", { generation: state.generation }), OK);
    const player = await inspect(); expect(player.seatId === null).toBe(true);
    pose = { x: player.x!, z: player.z! };
    expect(pose).toEqual(seat!.target);
    return elapsed();
  }
  await inspect();
  const bedroom = app.houseStore.snapshot(person.id).residents.find(value => value.id === person.id)!.bedroomId;
  return { index, elapsed, setElapsed, subscribe, inspect, unchanged, move, smallStep, approach, seatedThenStand, verifyClear, layout, bedroom, pose: () => ({ ...pose }), generation: () => state.generation, sequence: () => acceptedSequence };
}

afterAll(() => {
  console.info(JSON.stringify({ schemaVersion: 1, clock: "INJECTED_MONOTONIC_REAL_SOCKET_IO", wallClock: "UNMODIFIED", maximumRows: 320, rows, closure }));
});

describe("normal resource motion pacing against actual realtime handlers", () => {
  test("isolates interval/reset/budget guards, then requires the actual caller helper to avoid catch-up", async () => {
    const ioStarted = performance.now();
    // Deliberately one sequential test: an unexpected handler outcome ends all
    // later trials. Every fixture closes before the next one is created.
    for (const secondAt of [200, 249]) {
      await withFixture(async f => {
        const origin = f.pose(), target = f.smallStep(); f.verifyClear(origin, target);
        f.setElapsed(149); await f.move("LATE_FIRST_149", target);
        f.setElapsed(secondAt);
        const sequence = await f.move(secondAt === 200 ? "COMPRESSED_SECOND_200" : "PACED_SECOND_249", origin, secondAt === 200 ? INTERVAL : OK);
        if (secondAt === 200) {
          await f.unchanged(target);
          f.setElapsed(249); await f.move("REJECTED_SEQUENCE_VALID_AT_249", origin, OK, { sequence });
        }
        expect(f.sequence()).toBe(2);
      });
    }
    await withFixture(async f => {
      const origin = f.pose(), target = f.smallStep();
      f.setElapsed(100); await f.move("NOMINAL_FIRST_100", target);
      f.setElapsed(200); await f.move("NOMINAL_SECOND_200", origin);
    });

    for (const delay of [50, 100]) {
      await withFixture(async f => {
        const resetAt = await f.seatedThenStand(), origin = f.pose(), target = f.smallStep();
        f.setElapsed(resetAt + delay);
        const sequence = await f.move(delay === 50 ? "STAND_PLUS_50" : "STAND_PLUS_100", target, delay === 50 ? INTERVAL : OK);
        if (delay === 50) {
          await f.unchanged(origin);
          f.setElapsed(resetAt + 100); await f.move("STAND_REJECTED_SEQUENCE_PLUS_100", target, OK, { sequence });
        }
      });
    }

    for (const transition of ["SAME_ZONE", "BEDROOM_ZONE"] as const) {
      for (const delay of [50, 100]) {
        await withFixture(async f => {
          f.setElapsed(500); await f.move("PRE_RESET_ACCEPTED_SEQUENCE", f.smallStep());
          const oldGeneration = f.generation(); f.setElapsed(1000);
          const returned = await f.subscribe(transition === "BEDROOM_ZONE" ? f.bedroom : "lounge");
          expect(returned.previousGeneration).toBe(oldGeneration); expect(returned.generation).toBeGreaterThan(oldGeneration);
          expect(f.sequence()).toBe(0);
          const origin = f.pose(), target = f.smallStep(); f.verifyClear(origin, target);
          f.setElapsed(1000 + delay);
          const sequence = await f.move(transition + "_PLUS_" + delay, target, delay === 50 ? INTERVAL : OK);
          expect(sequence).toBe(1);
          if (delay === 50) {
            await f.unchanged(origin);
            f.setElapsed(1100); await f.move(transition + "_REJECTED_SEQUENCE_PLUS_100", target, OK, { sequence });
          }
        });
      }
    }

    await withFixture(async f => {
      // Initial main subscription is in elapsed window0; this new window contains
      // only the thirty stationary moves and the deliberately denied31st move.
      f.setElapsed(1000); const origin = f.pose();
      for (let n = 0; n < 30; n++) await f.move("FRESH_WINDOW_STATIONARY_30", origin);
      const sequence = await f.move("FRESH_WINDOW_STATIONARY_31", origin, BUDGET);
      await f.unchanged(origin); expect(f.sequence()).toBe(30);
      f.setElapsed(2000); await f.move("NEXT_WINDOW_REJECTED_SEQUENCE", origin, OK, { sequence });
      expect(f.sequence()).toBe(31);
    });

    for (const movingAt of [1100, 1150]) {
      await withFixture(async f => {
        f.setElapsed(1000); await f.subscribe();
        const origin = f.pose(), target = f.smallStep();
        f.setElapsed(1050); await f.move("RESET_STATIONARY_PLUS_50", origin);
        f.setElapsed(movingAt);
        const sequence = await f.move(movingAt === 1100 ? "STATIONARY_THEN_MOVE_PLUS_100" : "STATIONARY_THEN_MOVE_PLUS_150", target, movingAt === 1100 ? INTERVAL : OK);
        if (movingAt === 1100) {
          await f.unchanged(origin);
          f.setElapsed(1150); await f.move("STATIONARY_REJECTED_SEQUENCE_PLUS_150", target, OK, { sequence });
        }
      });
    }

    await withFixture(async f => {
      f.setElapsed(1000); const origin = f.pose(), tooFar = { x: origin.x + .71, z: origin.z }; f.verifyClear(origin, tooFar);
      const sequence = await f.move("OVERSPEED_NEGATIVE", tooFar, invalid("INVALID_MOVE"));
      await f.unchanged(origin);
      await f.move("OVERSPEED_REJECTED_SEQUENCE_VALID", f.smallStep(), OK, { sequence });
    });
    await withFixture(async f => {
      const furniture = f.layout().obstacles.find(value => value.id === "rest-sofa-a");
      expect(!!furniture).toBe(true);
      const edge = { x: furniture!.x - furniture!.w / 2 - AVATAR_RADIUS - .02, z: furniture!.z };
      await f.approach(edge); const origin = f.pose(), blocked = { x: origin.x + .1, z: origin.z };
      expect(validPosition(f.layout(), blocked)).toBe(false); f.setElapsed(f.elapsed() + 1000);
      const sequence = await f.move("COLLISION_NEGATIVE", blocked, invalid("INVALID_MOVE"));
      await f.unchanged(origin);
      await f.move("COLLISION_REJECTED_SEQUENCE_STATIONARY", origin, OK, { sequence });
    });
    await withFixture(async f => {
      f.setElapsed(1000); const origin = f.pose(), target = f.smallStep();
      await f.move("OBSERVER_AUTHORITY_NEGATIVE", target, invalid("NOT_CONTROLLER"), { observer: true });
      await f.unchanged(origin);
      const sequence = await f.move("STALE_GENERATION_NEGATIVE", target, invalid("STALE_GENERATION"), { generation: f.generation() + 1 });
      await f.unchanged(origin);
      await f.move("AUTHORITY_REJECTED_SEQUENCE_VALID", target, OK, { sequence });
    });
    await withFixture(async f => {
      const origin = f.pose(), target = f.smallStep();
      f.setElapsed(100); const sequence = await f.move("DUPLICATE_POSITIVE_FIRST", target);
      f.setElapsed(200); await f.move("DUPLICATE_SEQUENCE_NEGATIVE", origin, invalid("STALE_INPUT"), { sequence });
      await f.unchanged(target);
      await f.move("DUPLICATE_NEXT_SEQUENCE_VALID", origin, OK, { sequence: sequence + 1 });
    });

    expect(closure.cleanupFailures).toBe(0);
    expect(closure.servicesClosed).toBe(closure.fixturesCreated);
    expect(closure.socketsDisconnected).toBe(closure.socketsOpened);
    expect(closure.directoriesRemoved).toBe(closure.fixturesCreated);
    record({ phase: "WIRE_CONTROLS_CLOSED", fixtures: closure.fixturesCreated, actualIoDurationMs: Math.round((performance.now() - ioStarted) * 1000) / 1000 });

    // This uses the exported function called by the real board timer. The old
    // nominal-phase helper returns true at200 after dispatch149: an intentional
    // RED after every real-handler control and its cleanup have completed.
    const view = { nextMotion: 100 };
    const decisions = [149, 200, 249].map(now => {
      const due = resourceMotionDue(view, now);
      record({ phase: "ACTUAL_CALLER_PACER", elapsedMs: now, due: Number(due), nextMotionMs: view.nextMotion });
      return due;
    });
    expect(decisions).toEqual([true, false, true]);
  }, 30000);
});
