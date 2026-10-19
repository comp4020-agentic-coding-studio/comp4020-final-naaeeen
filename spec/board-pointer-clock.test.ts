import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { setTimeout as delay } from "node:timers/promises";
import { Server } from "socket.io";
import { io, type Socket } from "socket.io-client";
import { afterEach, expect, test, vi } from "vitest";
import { attachBoardService } from "../src/board-service.ts";
import { BoardStore } from "../src/board-store.ts";
import { HouseStore } from "../src/house-store.ts";

type Ack = { ok: boolean; code?: string; subscriptionId?: string };
const cleanup: (() => Promise<void> | void)[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  for (const action of cleanup.splice(0).reverse()) await action();
});

async function fixture() {
  const root = mkdtempSync(join(tmpdir(), "board-pointer-clock-"));
  const house = new HouseStore(join(root, "house.sqlite"));
  const board = new BoardStore(join(root, "board.sqlite"));
  const owner = house.ensureSession();
  house.execute(owner.id, {
    commandId: randomUUID(), type: "house.create", payload: { capacity: 2, name: "Clock fixture", colour: "sage" },
  });
  const home = house.me(owner.id).home!;
  const server = createServer((_request, response) => response.writeHead(404).end());
  const sockets = new Server(server, { transports: ["websocket"], maxHttpBufferSize: 16 * 1024, perMessageDeflate: false });
  const service = attachBoardService(sockets, house, board, { log: () => undefined });
  cleanup.push(
    () => rmSync(root, { recursive: true, force: true }),
    () => house.close(),
    () => board.close(),
    () => new Promise<void>(resolve => {
      service.close();
      server.closeAllConnections();
      sockets.close(() => resolve());
    }),
  );
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const url = "http://127.0.0.1:" + (server.address() as { port: number }).port;
  async function subscribe() {
    const socket = io(url + "/board", {
      transports: ["websocket"], reconnection: false, forceNew: true, timeout: 1500,
      extraHeaders: { Origin: url, Cookie: "house_session=" + owner.token },
    });
    cleanup.push(() => { socket.disconnect(); });
    await new Promise<void>((resolve, reject) => {
      socket.once("connect", resolve);
      socket.once("connect_error", reject);
    });
    const reply = await socket.timeout(1500).emitWithAck("board.subscribe", { houseId: home.id }) as Ack;
    expect(reply.ok).toBe(true);
    expect(reply.subscriptionId).toBeTypeOf("string");
    return { socket, subscriptionId: reply.subscriptionId! };
  }
  return { house, board, owner, home, subscribe };
}

function pointer(socket: Socket, subscriptionId: string, index: number): Promise<Ack> {
  return socket.timeout(1500).emitWithAck("board.pointer", {
    subscriptionId, x: index, y: index, selectedElementIds: [],
  }) as Promise<Ack>;
}

test("accepts paced real pointers after the wall clock moves backwards", async () => {
  const f = await fixture(), { socket, subscriptionId } = await f.subscribe();
  const before = f.board.snapshot(f.home.id);
  const first = await pointer(socket, subscriptionId, 0);
  expect(first.ok).toBe(true);
  const replies = [first], gaps: number[] = [];
  const started = performance.now(), realDateNow = Date.now.bind(Date);
  let previousAck = started;
  const clock = vi.spyOn(Date, "now").mockImplementation(() => realDateNow() - 60_000);
  let elapsed = 0;
  try {
    expect(f.house.session(f.owner.digest)).toEqual({ id: f.owner.id });
    for (let index = 1; index <= 20; index++) {
      // Native timers and the monotonic clock remain real; wait from the previous ACK.
      while (performance.now() - previousAck < 55) {
        await delay(Math.max(1, 55 - (performance.now() - previousAck)));
      }
      gaps.push(performance.now() - previousAck);
      replies.push(await pointer(socket, subscriptionId, index));
      previousAck = performance.now();
    }
    elapsed = performance.now() - started;
  } finally {
    clock.mockRestore();
  }
  console.info(JSON.stringify({
    scenario: "backwards-wall-clock", wallStepMs: -60_000, pointerCount: replies.length,
    minimumAckGapMs: Math.min(...gaps), monotonicElapsedMs: elapsed,
    accepted: replies.filter(reply => reply.ok).length,
    rateLimited: replies.filter(reply => reply.code === "RATE_LIMITED").length,
  }));
  expect(gaps).toHaveLength(20);
  expect(Math.min(...gaps)).toBeGreaterThanOrEqual(55);
  expect(elapsed).toBeGreaterThanOrEqual(1000);
  expect(replies.map(reply => ({ ok: reply.ok, code: reply.code ?? null }))).toEqual(
    Array.from({ length: 21 }, () => ({ ok: true, code: null })),
  );
  expect(f.board.snapshot(f.home.id)).toEqual(before);
});

test("still rejects the twenty-first immediate pointer on a fresh real socket", async () => {
  const f = await fixture(), started = performance.now();
  const { socket, subscriptionId } = await f.subscribe();
  const replies: Ack[] = [];
  for (let index = 0; index < 21; index++) replies.push(await pointer(socket, subscriptionId, index));
  const elapsed = performance.now() - started;
  console.info(JSON.stringify({
    scenario: "immediate-pointer-abuse", pointerCount: replies.length, monotonicElapsedMs: elapsed,
    accepted: replies.filter(reply => reply.ok).length,
    lastCode: replies.at(-1)?.code ?? null,
  }));
  // Include connection/subscription time so no hidden pre-burst reset can validate this control.
  expect(elapsed, "The abuse control must complete inside one native 1000 ms window.").toBeLessThan(1000);
  expect(replies.slice(0, 20).every(reply => reply.ok)).toBe(true);
  expect(replies.filter(reply => reply.ok).length).toBeLessThanOrEqual(20);
  expect(replies[20]).toMatchObject({ ok: false, code: "RATE_LIMITED" });
});
