import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { io, type Socket } from "socket.io-client";
import { afterEach, expect, test } from "vitest";
import { HouseStore } from "../src/house-store.ts";
import { attachHouseRealtime } from "../src/house-realtime.ts";
interface Engine { readyState: string; writeBuffer: Array<{ type: string; data?: unknown }>; transport: { writable: boolean; socket: { bufferedAmount: number } }; sendPacket(type: string, data?: unknown): void; flush(): void; }
const cleanup: Array<() => void | Promise<void>> = [];
afterEach(async () => { for (const action of cleanup.splice(0).reverse()) await action(); });
const message = "A saved heartbeat fixture";
function nextSaved(socket: Socket) {
  return new Promise<any>((resolve, reject) => {
    const timer = setTimeout(() => { socket.off("house.snapshot", receive); reject(new Error("Expected saved house projection")); }, 1500);
    function receive(value: any) { if (value.durable.chat.some((entry: any) => entry.text === message)) { clearTimeout(timer); socket.off("house.snapshot", receive); resolve(value); } }
    socket.on("house.snapshot", receive);
  });
}
async function fixture() {
  const root = mkdtempSync(join(tmpdir(), "house-control-")), store = new HouseStore(join(root, "house.sqlite"));
  const owner = store.ensureSession(), peer = store.ensureSession();
  store.execute(owner.id, { commandId: randomUUID(), type: "house.create", payload: { capacity: 2, name: "Control owner", colour: "sage" } });
  store.execute(peer.id, { commandId: randomUUID(), type: "house.join", payload: { code: store.me(owner.id).home!.code, name: "Control peer", colour: "blue" } });
  const server = createServer((_request, response) => response.end("fixture"));
  const realtime = attachHouseRealtime(server, store, { log: () => {} });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  cleanup.push(() => { if (!root.startsWith(join(tmpdir(), "house-control-"))) throw new Error("Invalid fixture cleanup target"); rmSync(root, { recursive: true, force: true }); }, () => store.close(), () => realtime.close());
  async function connect(person: typeof owner) {
    const socket = io(origin, { forceNew: true, reconnection: false, transports: ["websocket"], extraHeaders: { Origin: origin, Cookie: `house_session=${person.token}` } });
    cleanup.push(() => { socket.disconnect(); });
    await new Promise<void>((resolve, reject) => { socket.once("connect", resolve); socket.once("connect_error", reject); });
    expect((await socket.timeout(1500).emitWithAck("house.subscribe", { zoneId: "lounge", controllerToken: randomUUID() })).ok).toBe(true);
    const conn = realtime.io.sockets.sockets.get(socket.id!)!.conn as unknown as Engine;
    await expect.poll(() => conn.writeBuffer.length).toBe(0); await expect.poll(() => conn.transport.writable).toBe(true);
    return { socket, conn };
  }
  const healthy = await connect(owner), stalled = await connect(peer);
  async function save() {
    const delivered = nextSaved(healthy.socket);
    store.execute(owner.id, { commandId: randomUUID(), type: "chat.send", houseId: store.me(owner.id).home!.id, payload: { zoneId: "lounge", text: message } });
    realtime.refresh(); await delivered;
  }
  function restore() { stalled.conn.transport.writable = true; if (stalled.conn.readyState === "open") stalled.conn.flush(); }
  return { healthy, stalled, save, restore };
}

test("a real queued house heartbeat waits below unchanged output bounds", async () => {
  const f = await fixture(); f.stalled.conn.transport.writable = false;
  try {
    f.stalled.conn.sendPacket("ping");
    expect(f.stalled.conn.writeBuffer.map(packet => ({ type: packet.type, dataType: typeof packet.data }))).toEqual([{ type: "ping", dataType: "undefined" }]);
    expect(f.stalled.conn.transport.socket.bufferedAmount).toBe(0);
    await f.save(); expect(f.stalled.conn.readyState).toBe("open"); expect(f.stalled.conn.writeBuffer.length).toBeLessThan(4);
    const delivered = nextSaved(f.stalled.socket); f.restore(); expect((await delivered).durable.chat.at(-1).text).toBe(message);
  } finally { f.restore(); }
});

test.each(["malformed-message", "unknown-kind"])("house output rejects %s while a healthy member receives saved state", async kind => {
  const f = await fixture(); f.stalled.conn.transport.writable = false;
  try {
    f.stalled.conn.sendPacket(kind === "unknown-kind" ? "unknown" : "message", kind === "unknown-kind" ? "invalid kind" : { unexpected: true });
    await f.save(); expect(f.stalled.conn.readyState).toBe("closed");
  } finally { f.restore(); }
});
