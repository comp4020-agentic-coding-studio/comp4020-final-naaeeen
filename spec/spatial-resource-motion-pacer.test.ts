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

// Appended calibrations keep the original real-handler trial above unchanged.
import { readFileSync as readMotionSource } from "node:fs";
import ts from "typescript";
import {
  resourceMotionControl, resourceMotionDispatched, resourceMotionSettled,
  newNormalMotionDiagnostics, recordNormalMotionRejection,
} from "../tools/spatial-resource.mjs";

const motionBoardSource = readMotionSource(new URL("../tools/board-resource.mjs", import.meta.url), "utf8");
const motionSpatialSource = readMotionSource(new URL("../tools/spatial-resource.mjs", import.meta.url), "utf8");
const motionPrivate = "synthetic-private-cookie-token-identity-message-body";
const motionBudgetAck = { ok: false, code: "RATE_LIMITED", message: "Please slow down your house actions." };
const motionIntervalAck = { ok: false, code: "RATE_LIMITED", message: "Movement updates are limited to ten per second." };

function motionActualNode(source: string, select: (node: ts.Node) => boolean) {
  const ast = ts.createSourceFile("instrument.mjs", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS), found: ts.Node[] = [];
  function visit(node: ts.Node) { if (select(node)) found.push(node); ts.forEachChild(node, visit); }
  visit(ast);
  if (found.length !== 1) throw new Error("MOTION_SOURCE_NODE_COUNT_" + found.length);
  return found[0];
}
function motionActualFunction(name: string) {
  return motionActualNode(motionSpatialSource, node => ts.isFunctionDeclaration(node) && node.name?.text === name).getText();
}
function motionSafeDiagnosticRow(row: any) {
  const numeric = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : value === null ? null : "INVALID";
  const enumeration = (value: unknown, allowed: string[]) => typeof value === "string" && allowed.includes(value) ? value : "INVALID";
  return { viewIndex: numeric(row?.viewIndex), connectionOrdinal: numeric(row?.connectionOrdinal), sentAtMs: numeric(row?.sentAtMs), ackAtMs: numeric(row?.ackAtMs), previousSendAtMs: numeric(row?.previousSendAtMs), controlAtMs: numeric(row?.controlAtMs), controlKind: enumeration(row?.controlKind, ["readiness", "subscribe", "stand", "none"]), motionKind: enumeration(row?.motionKind, ["route", "stationary"]), faultAtSend: row?.faultAtSend === 0 || row?.faultAtSend === 1 ? row.faultAtSend : -1, code: enumeration(row?.code, ["RATE_LIMITED", "INVALID_MOVE", "STALE_INPUT", "STALE_GENERATION", "STALE_ZONE", "NOT_CONTROLLER", "FORBIDDEN", "UNAUTHENTICATED", "INVALID_INPUT", "NOT_SUBSCRIBED", "OTHER"]), category: enumeration(row?.category, ["ACTION_BUDGET", "MOVE_INTERVAL", "OTHER"]) };
}
function motionSafeCategoryCounts(diagnostic: any) {
  const count = (value: unknown) => Number.isSafeInteger(value) && (value as number) >= 0 ? value : -1;
  return { ACTION_BUDGET: count(diagnostic.categoryCounts?.ACTION_BUDGET), MOVE_INTERVAL: count(diagnostic.categoryCounts?.MOVE_INTERVAL), OTHER: count(diagnostic.categoryCounts?.OTHER) };
}
function motionDiagnosticIsPrivate(diagnostic: any) {
  const serialized = JSON.stringify(diagnostic);
  return !serialized.includes(motionPrivate) && !serialized.includes(motionBudgetAck.message) && !serialized.includes(motionIntervalAck.message);
}
function motionDiagnosticRowKeysAreFixed(row: any) {
  return JSON.stringify(Object.keys(row ?? {}).sort()) === JSON.stringify(["viewIndex", "connectionOrdinal", "sentAtMs", "ackAtMs", "previousSendAtMs", "controlAtMs", "controlKind", "motionKind", "faultAtSend", "code", "category"].sort());
}
function motionSafeErrorCodes(errors: unknown[]) {
  const allowed = ["RATE_LIMITED", "INVALID_MOVE", "STALE_INPUT", "STALE_GENERATION", "STALE_ZONE", "NOT_CONTROLLER", "FORBIDDEN", "UNAUTHENTICATED", "INVALID_INPUT", "NOT_SUBSCRIBED", "MOTION_NO_ACK"];
  return errors.map(value => typeof value === "string" && allowed.includes(value) ? value : "OTHER");
}
function motionSafeStats(stats: any) {
  return { motionSent: Number(stats.motionSent), motionOk: Number(stats.motionOk), motionRejected: Number(stats.motionRejected), motionTimeouts: Number(stats.motionTimeouts), expectedFaultTimeouts: Number(stats.expectedFaultTimeouts) };
}
function normalTimerHarness(reply: unknown, options: { transport?: boolean; fault?: boolean; stationary?: boolean } = {}) {
  const assignment = motionActualNode(motionBoardSource, node => ts.isBinaryExpression(node) && ts.isIdentifier(node.left) && node.left.text === "motionTimer" && ts.isCallExpression(node.right) && ts.isIdentifier(node.right.expression) && node.right.expression.text === "setInterval") as ts.BinaryExpression;
  const callback = (assignment.right as ts.CallExpression).arguments[0].getText();
  let now = 149, resolve!: (ack: unknown) => void, reject!: (error: Error) => void;
  const ack = new Promise((done, fail) => { resolve = done; reject = fail; });
  const calls: { event: string; generation: number; sequence: number; x: number; z: number; heading: number }[] = [], timeoutMs: number[] = [], jobs: Promise<unknown>[] = [], errors: string[] = [];
  const point = options.stationary ? { x: 2, z: 4 } : { x: 2.1, z: 4 };
  const socket = { connected: true, timeout(ms: number) { timeoutMs.push(ms); return this; }, emitWithAck(event: string, body: any) {
    calls.push({ event, generation: body.generation, sequence: body.sequence, x: body.x, z: body.z, heading: body.heading }); return ack;
  } };
  const view: any = { index: 7, role: "house", ready: true, socket, connections: 3, generation: 17, intendedFault: options.fault === true, nextMotion: 100, motionPending: false, motionSent: 0, normalMotionSent: 0, motionSequence: 11, x: 2, z: 4, motionSentAt: 40, motionControlAt: 50, motionControlKind: "subscribe", spatialRoute: options.stationary ? [] : [point] };
  const stats = { motionSent: 0, motionOk: 0, motionRejected: 0, motionTimeouts: 0, expectedFaultTimeouts: 0 };
  const diagnostic = newNormalMotionDiagnostics(); let motionAcknowledged = 0;
  const bindings = { performance: { now: () => now }, spatial: { sampleMotion() {}, shouldMove: () => true, motionTarget: () => point, motionACK() { motionAcknowledged++; } }, views: [view], resourceMotionDue, resourceMotionDispatched, resourceMotionSettled, stats, normalMotionDiagnostics: diagnostic, recordNormalMotionRejection, error: (code: string) => errors.push(code), launch: (job: () => Promise<unknown>) => { const result = job(); jobs.push(result); return result; } };
  const tick = new Function("env", "const {" + Object.keys(bindings).join(",") + "}=env;return (" + callback + ");")(bindings);
  return {
    view, stats, diagnostic, calls, timeoutMs, errors, jobs,
    acknowledged: () => motionAcknowledged,
    fire(at = 149) { now = at; tick(); },
    async settle(at = 240) { now = at; if (options.transport) reject(new Error(motionPrivate)); else resolve(reply); await Promise.all(jobs); },
  };
}

function spatialTransitionHarness(accepted: boolean) {
  const actor: any = { identity: motionPrivate, token: motionPrivate, generation: 8, motionSequence: 11, nextMotion: 100, motionPending: false, spatialSubscribing: false, spatialSeat: "seat-1", x: 1, z: 2, snapshot: { players: [{ id: motionPrivate, x: 1, z: 2, seatId: "seat-1" }] } };
  const coolDowns: Record<string, string | number>[] = [], requests: { event: string; timeoutMs: number }[] = [];
  const nextSnapshot = { generation: 9, players: [{ id: motionPrivate, x: 3, z: 4, seatId: null }] };
  actor.socket = { timeout(ms: number) { requests.push({ event: "TIMEOUT", timeoutMs: ms }); return this; }, async emitWithAck(event: string) { requests.push({ event, timeoutMs: 5000 }); return accepted ? { ok: true, snapshot: nextSnapshot } : { ok: false, code: "RATE_LIMITED", message: motionPrivate }; } };
  const bindings = {
    waitFor: async (predicate: () => boolean) => { if (!predicate()) throw new Error("MOTION_SOURCE_PREDICATE_NOT_READY"); },
    self: (value: any) => value.snapshot.players[0],
    ask: async (value: any, event: string) => { requests.push({ event, timeoutMs: 5000 }); if (accepted) value.snapshot.players[0] = { id: motionPrivate, x: 4, z: 5, seatId: null }; return { ok: accepted }; },
    ok: (ack: any) => { if (!ack?.ok) throw new Error("MOTION_TRANSITION_DENIED"); return ack; },
    onSubscribe: (value: any, snapshot: any) => { value.snapshot = snapshot; value.generation = snapshot.generation; },
    performance: { now: () => 200 },
    resourceMotionControl: (value: any, at: number, kind: string) => { resourceMotionControl(value, at, kind); coolDowns.push({ kind, at, pending: Number(value.motionPending), subscribing: Number(value.spatialSubscribing), x: value.x, z: value.z, sequence: value.motionSequence }); },
  };
  const operations = new Function("env", [
    "const {" + Object.keys(bindings).join(",") + "}=env;",
    ...["updatePosition", "control", "subscribe", "stand"].map(motionActualFunction),
    "return {subscribe,stand};",
  ].join("\n"))(bindings);
  return { actor, coolDowns, requests, ...operations };
}

describe("resource pacing repair pure calibrations and actual extracted callbacks", () => {
  test("dispatch deadlines and ACK settlement independently enforce100ms and80ms floors", () => {
    const view: any = { nextMotion: 0 };
    resourceMotionDispatched(view, 149);
    expect({ sentAt: view.motionSentAt, next: view.nextMotion }).toEqual({ sentAt: 149, next: 249 });
    resourceMotionSettled(view, 160);
    expect({ ackAt: view.motionAckAt, next: view.nextMotion }).toEqual({ ackAt: 160, next: 249 });
    expect(resourceMotionDue(view, 248)).toBe(false);
    resourceMotionSettled(view, 240);
    expect(view.nextMotion).toBe(320);
    expect(resourceMotionDue(view, 319)).toBe(false); expect(resourceMotionDue(view, 320)).toBe(true);
    expect(view.nextMotion).toBe(420);
  });

  test("readiness, subscription and Stand replace old deadlines with a fresh100ms cooldown", () => {
    for (const kind of ["readiness", "subscribe", "stand"]) {
      const view: any = { nextMotion: 10, motionSentAt: 70, motionAckAt: 90 };
      resourceMotionControl(view, 1000, kind);
      expect({ at: view.motionControlAt, kind: view.motionControlKind, next: view.nextMotion }).toEqual({ at: 1000, kind, next: 1100 });
      expect(resourceMotionDue(view, 1050)).toBe(false); expect(resourceMotionDue(view, 1099)).toBe(false); expect(resourceMotionDue(view, 1100)).toBe(true);
      expect({ sent: view.motionSentAt, ack: view.motionAckAt }).toEqual({ sent: 70, ack: 90 });
    }
  });

  test("the16-row diagnostic cap retains every aggregate and strips forged private ACK/context fields", () => {
    const diagnostic = newNormalMotionDiagnostics();
    const context = { viewIndex: 7, connectionOrdinal: 3, sentAtMs: 149, ackAtMs: 240, previousSendAtMs: 40, controlAtMs: 50, controlKind: "subscribe", motionKind: "route", faultAtSend: false, identity: motionPrivate, token: motionPrivate, body: motionPrivate, message: motionPrivate };
    for (let n = 0; n < 50; n++) {
      const ack = n % 3 === 0 ? motionBudgetAck : n % 3 === 1 ? motionIntervalAck : { ok: false, code: motionPrivate, message: motionPrivate, category: "ACTION_BUDGET" };
      recordNormalMotionRejection(diagnostic, { ...ack, identity: motionPrivate, token: motionPrivate, body: motionPrivate }, context);
    }
    expect(motionDiagnosticIsPrivate(diagnostic)).toBe(true);
    expect({ maximumRows: Number(diagnostic.maximumRows), total: Number(diagnostic.totalRejected), counts: motionSafeCategoryCounts(diagnostic), rows: diagnostic.rows.length }).toEqual({ maximumRows: 16, total: 50, counts: { ACTION_BUDGET: 17, MOVE_INTERVAL: 17, OTHER: 16 }, rows: 16 });
    expect(diagnostic.rows.every(motionDiagnosticRowKeysAreFixed)).toBe(true);
    expect(motionSafeDiagnosticRow(diagnostic.rows[0])).toEqual({ viewIndex: 7, connectionOrdinal: 3, sentAtMs: 149, ackAtMs: 240, previousSendAtMs: 40, controlAtMs: 50, controlKind: "subscribe", motionKind: "route", faultAtSend: 0, code: "RATE_LIMITED", category: "ACTION_BUDGET" });
  });

  test("invalid numeric context and forged categories cannot masquerade as retained diagnostic data", () => {
    const diagnostic = newNormalMotionDiagnostics();
    recordNormalMotionRejection(diagnostic, { ok: false, code: "RATE_LIMITED", message: motionPrivate, category: "ACTION_BUDGET", ackCategory: "MOVE_INTERVAL" }, { viewIndex: motionPrivate, connectionOrdinal: NaN, sentAtMs: Infinity, ackAtMs: -Infinity, previousSendAtMs: undefined, controlAtMs: motionPrivate, controlKind: motionPrivate, motionKind: motionPrivate, faultAtSend: motionPrivate, rawAck: motionPrivate });
    expect(motionDiagnosticIsPrivate(diagnostic)).toBe(true); expect(motionDiagnosticRowKeysAreFixed(diagnostic.rows[0])).toBe(true);
    expect(motionSafeDiagnosticRow(diagnostic.rows[0])).toEqual({ viewIndex: null, connectionOrdinal: null, sentAtMs: null, ackAtMs: null, previousSendAtMs: null, controlAtMs: null, controlKind: "none", motionKind: "stationary", faultAtSend: 0, code: "RATE_LIMITED", category: "OTHER" });
    expect(motionSafeCategoryCounts(diagnostic)).toEqual({ ACTION_BUDGET: 0, MOVE_INTERVAL: 0, OTHER: 1 });
  });

  test("the actual timer and async move callback preserve successful dispatch, timeout, body and ACK counters", async () => {
    const h = normalTimerHarness({ ok: true, message: motionPrivate, token: motionPrivate });
    h.fire(); expect(h.jobs.length).toBe(1); expect(h.view.motionPending).toBe(true);
    expect(h.view.motionSentAt).toBe(149); expect(h.view.nextMotion).toBe(249);
    expect(h.calls).toEqual([{ event: "house.move", generation: 17, sequence: 12, x: 2.1, z: 4, heading: 0 }]);
    expect(h.timeoutMs).toEqual([5000]);
    await h.settle();
    expect(motionSafeStats(h.stats)).toEqual({ motionSent: 1, motionOk: 1, motionRejected: 0, motionTimeouts: 0, expectedFaultTimeouts: 0 });
    expect({ pending: h.view.motionPending, sent: h.view.motionSent, normal: h.view.normalMotionSent, ack: h.view.motionAckAt, next: h.view.nextMotion }).toEqual({ pending: false, sent: 1, normal: 1, ack: 240, next: 320 });
    expect(h.acknowledged()).toBe(1); expect(h.errors.length).toBe(0); expect(Number(h.diagnostic.totalRejected)).toBe(0);
    h.fire(319); expect(h.jobs.length).toBe(1);
  });

  for (const item of [
    { label: "budget", ack: motionBudgetAck, code: "RATE_LIMITED", category: "ACTION_BUDGET" },
    { label: "interval", ack: motionIntervalAck, code: "RATE_LIMITED", category: "MOVE_INTERVAL" },
    { label: "other", ack: { ok: false, code: "INVALID_MOVE", message: motionPrivate }, code: "INVALID_MOVE", category: "OTHER" },
  ]) {
    test("the actual rejected normal move retains stats/errors and sanitized context: " + item.label, async () => {
      const h = normalTimerHarness({ ...item.ack, identity: motionPrivate, body: motionPrivate, category: "FORGED" });
      h.fire(); await h.settle();
      expect(motionSafeStats(h.stats)).toEqual({ motionSent: 1, motionOk: 0, motionRejected: 1, motionTimeouts: 0, expectedFaultTimeouts: 0 });
      expect(motionDiagnosticIsPrivate(h.errors)).toBe(true); expect(motionSafeErrorCodes(h.errors)).toEqual([item.code]); expect(h.acknowledged()).toBe(0); expect(h.view.motionPending).toBe(false);
      expect(Number(h.diagnostic.totalRejected)).toBe(1);
      expect(motionDiagnosticIsPrivate(h.diagnostic)).toBe(true); expect(h.diagnostic.rows.every(motionDiagnosticRowKeysAreFixed)).toBe(true);
      expect(h.diagnostic.rows.map(motionSafeDiagnosticRow)).toEqual([{ viewIndex: 7, connectionOrdinal: 3, sentAtMs: 149, ackAtMs: 240, previousSendAtMs: 40, controlAtMs: 50, controlKind: "subscribe", motionKind: "route", faultAtSend: 0, code: item.code, category: item.category }]);
    });
  }

  test("actual stationary callback records the fault at send and keeps original normal/fault counters", async () => {
    for (const fault of [false, true]) {
      const h = normalTimerHarness(motionIntervalAck, { stationary: true, fault });
      h.fire(); h.view.intendedFault = !fault; await h.settle();
      expect(Number(h.stats.motionRejected)).toBe(1); expect(motionDiagnosticIsPrivate(h.errors)).toBe(true); expect(motionSafeErrorCodes(h.errors)).toEqual(["RATE_LIMITED"]);
      expect(h.view.normalMotionSent).toBe(fault ? 0 : 1);
      const retained = motionSafeDiagnosticRow(h.diagnostic.rows[0]);
      expect({ motionKind: retained.motionKind, faultAtSend: retained.faultAtSend }).toEqual({ motionKind: "stationary", faultAtSend: Number(fault) });
    }
  });

  test("actual transport failures retain existing normal versus intended-fault timeout counters", async () => {
    for (const fault of [false, true]) {
      const h = normalTimerHarness(null, { transport: true, fault }); h.fire(); await h.settle();
      expect(motionSafeStats(h.stats)).toEqual({ motionSent: 1, motionOk: 0, motionRejected: 0, motionTimeouts: fault ? 0 : 1, expectedFaultTimeouts: fault ? 1 : 0 });
      expect(h.view.motionPending).toBe(false); expect(h.errors.length).toBe(0);
      expect(Number(h.diagnostic.totalRejected)).toBe(0); expect(h.diagnostic.rows.length).toBe(0);
      expect(JSON.stringify(h.diagnostic).includes(motionPrivate)).toBe(false);
    }
  });

  test("an ACK from the prior connection cannot overwrite current pacing deadlines", async () => {
    const h = normalTimerHarness(motionIntervalAck); h.fire();
    h.view.socket = { connected: true }; h.view.connections = 4; h.view.nextMotion = 5000; h.view.motionAckAt = 4000;
    await h.settle(300);
    expect({ next: h.view.nextMotion, ack: h.view.motionAckAt }).toEqual({ next: 5000, ack: 4000 });
    const retained = motionSafeDiagnosticRow(h.diagnostic.rows[0]);
    expect(retained.connectionOrdinal).toBe(3); expect(retained.ackAtMs).toBe(300);
  });

  test("actual spatial subscribe and Stand establish cooldown after successful state updates before unlocking", async () => {
    const subscription = spatialTransitionHarness(true);
    await subscription.subscribe(subscription.actor, "lounge");
    expect(subscription.coolDowns).toEqual([{ kind: "subscribe", at: 200, pending: 1, subscribing: 1, x: 3, z: 4, sequence: 0 }]);
    expect({ generation: subscription.actor.generation, sequence: subscription.actor.motionSequence, pending: subscription.actor.motionPending, subscribing: subscription.actor.spatialSubscribing, next: subscription.actor.nextMotion }).toEqual({ generation: 9, sequence: 0, pending: false, subscribing: false, next: 300 });
    expect(subscription.requests).toEqual([{ event: "TIMEOUT", timeoutMs: 5000 }, { event: "house.subscribe", timeoutMs: 5000 }]);
    const standing = spatialTransitionHarness(true);
    await standing.stand(standing.actor);
    expect(standing.coolDowns).toEqual([{ kind: "stand", at: 200, pending: 1, subscribing: 0, x: 4, z: 5, sequence: 11 }]);
    expect({ pending: standing.actor.motionPending, seatCleared: standing.actor.spatialSeat === null, next: standing.actor.nextMotion }).toEqual({ pending: false, seatCleared: true, next: 300 });
    expect(standing.requests).toEqual([{ event: "house.stand", timeoutMs: 5000 }]);
  });

  test("actual denied spatial transitions unlock without claiming a successful reset", async () => {
    for (const operation of ["subscribe", "stand"]) {
      const h = spatialTransitionHarness(false);
      await expect(h[operation](h.actor, "lounge")).rejects.toThrow("MOTION_TRANSITION_DENIED");
      expect(h.coolDowns).toEqual([]);
      expect({ pending: h.actor.motionPending, subscribing: h.actor.spatialSubscribing, next: h.actor.nextMotion, sequence: h.actor.motionSequence, x: h.actor.x, z: h.actor.z }).toEqual({ pending: false, subscribing: false, next: 100, sequence: 11, x: 1, z: 2 });
    }
  });
});

