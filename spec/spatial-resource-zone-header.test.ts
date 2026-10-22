import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { io, type Socket } from "socket.io-client";
import { expect, test } from "vitest";
import { HOUSE_WORLD_VERSION } from "../public/house-version.js";
import { createService } from "../src/server.ts";
import { spatialRequestHeaders } from "../tools/spatial-resource.mjs";

test("actual workload headers preserve missing/wrong-zone denial and admit one current-room effect", async () => {
  const directory = mkdtempSync(join(tmpdir(), "resource-zone-header-"));
  const app = createService({ dataDir: directory, secureCookies: false, activityLog: () => {} });
  let socket: Socket | undefined, db: DatabaseSync | undefined;
  const observations: { statuses: number[]; commandRows: number[]; roomRevisionDeltas: number[]; uniqueCommandIds: number; serviceClosed: boolean } = {
    statuses: [], commandRows: [], roomRevisionDeltas: [], uniqueCommandIds: 0, serviceClosed: false,
  };
  try {
    const owner = app.houseStore.ensureSession();
    app.houseStore.execute(owner.id, { commandId: randomUUID(), type: "house.create", payload: { capacity: 2, name: "Fixture owner", colour: "sage" } });
    const home = app.houseStore.me(owner.id).home!;
    const bedroom = app.houseStore.snapshot(owner.id).residents.find(person => person.id === owner.id)!.bedroomId;
    await new Promise<void>(resolve => app.server.listen(0, "127.0.0.1", resolve));
    const origin = "http://127.0.0.1:" + (app.server.address() as { port: number }).port;
    const cookie = "house_session=" + owner.token, token = randomUUID();
    socket = io(origin, { auth: { worldVersion: HOUSE_WORLD_VERSION }, transports: ["websocket"], reconnection: false, extraHeaders: { Origin: origin, Cookie: cookie } });
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("ZONE_FIXTURE_CONNECT_TIMEOUT")), 2500);
      socket!.once("connect", () => { clearTimeout(timeout); resolve(); });
      socket!.once("connect_error", error => { clearTimeout(timeout); reject(error); });
    });
    const subscribed = await socket.timeout(2500).emitWithAck("house.subscribe", { zoneId: bedroom, controllerToken: token });
    expect(subscribed.ok).toBe(true);
    const actor = { identity: owner.id, cookie, token, generation: subscribed.snapshot.generation, snapshot: subscribed.snapshot };
    expect(actor.snapshot.durable.zoneId).toBe(bedroom);
    expect(actor.snapshot.players.some((person: { id: string }) => person.id === actor.identity)).toBe(true);
    const headers: Record<string, string> = spatialRequestHeaders(origin, actor, true);
    const missing = { ...headers }; delete missing["X-House-Zone"];
    const revision = app.houseStore.snapshot(owner.id, bedroom).room!.revision;
    const originalOpen = app.houseStore.snapshot(owner.id, bedroom).room!.open;
    db = new DatabaseSync(join(directory, "house.sqlite"), { readOnly: true });
    const commandIds = [randomUUID(), randomUUID(), randomUUID()];
    observations.uniqueCommandIds = new Set(commandIds).size;
    const count = (commandId: string) => Number((db!.prepare("SELECT count(*) AS count FROM receipts WHERE actor_id=? AND command_id=?").get(owner.id, commandId) as { count: number }).count);
    for (const [index, candidate] of [missing, { ...headers, "X-House-Zone": "lounge" }, headers].entries()) {
      const commandId = commandIds[index]!;
      expect(count(commandId)).toBe(0);
      const response = await fetch(origin + "/api/house/command", { method: "POST", headers: candidate,
        body: JSON.stringify({ commandId, houseId: home.id, type: "room.configure", expectedRevision: revision,
          payload: { roomId: bedroom, open: !originalOpen, palette: "sage" } }), signal: AbortSignal.timeout(5000) });
      const reply = await response.json(), current = app.houseStore.snapshot(owner.id, bedroom).room!;
      observations.statuses.push(response.status); observations.commandRows.push(count(commandId)); observations.roomRevisionDeltas.push(current.revision - revision);
      if (index < 2) {
        expect(response.status).toBe(409); expect(reply.code).toBe("STALE_ZONE");
        expect(current.revision).toBe(revision); expect(current.open).toBe(originalOpen); expect(count(commandId)).toBe(0);
      } else {
        expect(response.status).toBe(200); expect(reply.ok).toBe(true);
        expect(current.revision).toBe(revision + 1); expect(current.open).toBe(!originalOpen); expect(count(commandId)).toBe(1);
      }
    }
    expect(commandIds.reduce((sum, commandId) => sum + count(commandId), 0)).toBe(1);
  } finally {
    socket?.disconnect(); db?.close(); await app.close(); observations.serviceClosed = true;
    rmSync(directory, { recursive: true, force: true });
    console.info("zone-header-observation", JSON.stringify(observations));
  }
}, 10000);
