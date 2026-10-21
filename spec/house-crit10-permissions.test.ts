import { HOUSE_WORLD_VERSION } from "../public/house-version.js";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { io, type Socket } from "socket.io-client";
import type { Home, HouseCommand, LiveSnapshot, Me } from "../src/house-contract.ts";
import { createService } from "../src/server.ts";

type Actor = { id: string; cookie: string };
type Control = { generation: number; zoneId: string; token: string; socket: Socket };
type Fixture = { app: ReturnType<typeof createService>; base: string; directory: string; sockets: Socket[] };
const fixtures: Fixture[] = [];

async function fixture(): Promise<Fixture> {
  const directory = mkdtempSync(join(tmpdir(), "house-crit10-permissions-"));
  const app = createService({ dataDir: directory, secureCookies: false });
  const current: Fixture = { app, base: "", directory, sockets: [] };
  fixtures.push(current);
  await new Promise<void>(resolve => app.server.listen(0, "127.0.0.1", resolve));
  current.base = "http://127.0.0.1:" + (app.server.address() as { port: number }).port;
  return current;
}

afterEach(async () => {
  for (const f of fixtures.splice(0)) {
    for (const socket of f.sockets) socket.disconnect();
    try { await f.app.close(); }
    finally { rmSync(f.directory, { recursive: true, force: true }); }
  }
});

async function identity(f: Fixture): Promise<Actor> {
  const response = await fetch(f.base + "/api/house/me");
  expect(response.status).toBe(200);
  const state = await response.json() as Me;
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  expect(cookie).toMatch(/^house_session=/);
  return { id: state.identity.id, cookie: cookie! };
}

function command(type: string, payload: Record<string, unknown>, houseId?: string, expectedRevision?: number): HouseCommand {
  return { commandId: randomUUID(), type, payload, ...(houseId ? { houseId } : {}), ...(expectedRevision === undefined ? {} : { expectedRevision }) };
}

function post(f: Fixture, actor: Actor, value: HouseCommand, control?: Control) {
  return fetch(f.base + "/api/house/command", {
    method: "POST",
    headers: {
      Cookie: actor.cookie, Origin: f.base, "Content-Type": "application/json", "X-House-Identity": actor.id,
      ...(control ? { "X-House-Generation": String(control.generation), "X-House-Zone": control.zoneId, "X-House-Controller-Token": control.token } : {}),
    },
    body: JSON.stringify(value),
  });
}

async function createHouse(f: Fixture, actor: Actor, capacity: number, name = "Robin"): Promise<Home> {
  expect((await post(f, actor, command("house.create", { capacity, name, colour: "sage" }))).status).toBe(200);
  return f.app.houseStore.me(actor.id).home!;
}

async function joinHouse(f: Fixture, actor: Actor, home: Home, name = "Finch") {
  expect((await post(f, actor, command("house.join", { code: home.code, name, colour: "rose" }))).status).toBe(200);
}

async function takeControl(f: Fixture, actor: Actor, zoneId = "lounge"): Promise<Control> {
  const socket = io(f.base, { auth: { worldVersion: HOUSE_WORLD_VERSION },
    transports: ["websocket"], reconnection: false, timeout: 2000,
    extraHeaders: { Cookie: actor.cookie, Origin: f.base },
  });
  f.sockets.push(socket);
  await new Promise<void>((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("connect_error", reject);
  });
  const token = randomUUID();
  const reply = await socket.timeout(3000).emitWithAck("house.subscribe", { zoneId, controllerToken: token }) as { ok: boolean; snapshot: LiveSnapshot };
  expect(reply.ok).toBe(true);
  expect(reply.snapshot.controller).toBe(true);
  expect(reply.snapshot.durable.selfId).toBe(actor.id);
  return { generation: reply.snapshot.generation, zoneId, token, socket };
}

function membershipState(f: Fixture, owner: Actor, actors: Actor[]) {
  return {
    house: f.app.houseStore.snapshot(owner.id),
    homes: actors.map(actor => f.app.houseStore.me(actor.id).home),
    removed: f.app.houseStore.removedResidents(owner.id),
  };
}

it.each(["house.remove", "house.transfer", "house.reinstate"])(
  "rejects nonowner %s with an eligible target and leaves membership, owner and invite code unchanged",
  async type => {
    const f = await fixture(), owner = await identity(f), peer = await identity(f), target = await identity(f);
    const home = await createHouse(f, owner, 3);
    await joinHouse(f, peer, home);
    await joinHouse(f, target, home, "Wren");
    if (type === "house.reinstate") {
      f.app.houseStore.execute(owner.id, command("house.remove", { memberId: target.id }, home.id));
      expect(f.app.houseStore.me(target.id).home).toBeNull();
      expect(f.app.houseStore.removedResidents(owner.id).members).toEqual([{ id: target.id, name: "Wren" }]);
    } else {
      expect(f.app.houseStore.me(target.id).home?.id).toBe(home.id);
    }
    const before = membershipState(f, owner, [owner, peer, target]);
    const peerControl = await takeControl(f, peer);
    const denied = await post(f, peer, command(type, { memberId: target.id }, home.id), peerControl);
    expect(denied.status).toBe(403);
    expect(await denied.json()).toMatchObject({ ok: false, code: "FORBIDDEN" });
    expect(membershipState(f, owner, [owner, peer, target])).toEqual(before);

    // The same target/payload is eligible when submitted by the actual owner.
    const ownerControl = await takeControl(f, owner);
    const accepted = await post(f, owner, command(type, { memberId: target.id }, home.id), ownerControl);
    expect(accepted.status).toBe(200);
    expect(await accepted.json()).toMatchObject({ ok: true });
    if (type === "house.remove") {
      expect(f.app.houseStore.me(target.id).home).toBeNull();
      expect(f.app.houseStore.me(owner.id).home?.code).not.toBe(before.house.house.code);
    } else if (type === "house.transfer") {
      expect(f.app.houseStore.me(peer.id).home?.ownerId).toBe(target.id);
    } else {
      expect(f.app.houseStore.removedResidents(owner.id).members).toEqual([]);
    }
  },
);

it.each(["closed", "foreign"] as const)(
  "rejects direct HTTP reads and chat targeting a %s bedroom without inserting private chat",
  async boundary => {
    const f = await fixture(), owner = await identity(f), peer = await identity(f);
    const home = await createHouse(f, owner, 2);
    await joinHouse(f, peer, home);
    const roomOwner = boundary === "closed" ? owner : await identity(f);
    const roomHome = boundary === "closed" ? home : await createHouse(f, roomOwner, 2, "Other house");
    const roomId = f.app.houseStore.snapshot(roomOwner.id).residents.find(resident => resident.id === roomOwner.id)!.bedroomId;
    if (boundary === "foreign") {
      // An open door still belongs to its own house.
      f.app.houseStore.execute(roomOwner.id, command("room.configure", { roomId, open: true, palette: "sage" }, roomHome.id, 0));
    }
    f.app.houseStore.execute(roomOwner.id, command("chat.send", { zoneId: roomId, text: "Private fixture note" }, roomHome.id));
    const before = f.app.houseStore.snapshot(roomOwner.id, roomId);
    expect(before.room?.open).toBe(boundary === "foreign");
    expect(before.chat.map(message => message.text)).toEqual(["Private fixture note"]);

    const control = await takeControl(f, peer);
    const valid = await post(f, peer, command("chat.send", { zoneId: "lounge", text: "Allowed lounge message" }, home.id), control);
    expect(valid.status).toBe(200);
    // The permitted lounge message advances the house-wide work cursor, while
    // every private room field remains unchanged before the denied attempts.
    const afterAllowed = f.app.houseStore.snapshot(roomOwner.id, roomId);
    expect(afterAllowed).toEqual({ ...before, ownWork: { ...before.ownWork, sequence: before.ownWork.sequence + (boundary === "closed" ? 1 : 0) } });
    const read = await fetch(f.base + "/api/house/snapshot?zone=" + roomId, { headers: { Cookie: peer.cookie } });
    expect(read.status).toBe(403);
    expect(await read.json()).toMatchObject({ ok: false, code: "FORBIDDEN" });

    // Payload and header tampering both fail the current controlled-zone precondition.
    for (const zoneId of ["lounge", roomId]) {
      const denied = await post(f, peer, command("chat.send", { zoneId: roomId, text: "Must not enter the private stream" }, home.id), { ...control, zoneId });
      expect(denied.status).toBe(409);
      expect(await denied.json()).toMatchObject({ ok: false, code: "STALE_ZONE" });
    }
    expect(f.app.houseStore.snapshot(roomOwner.id, roomId)).toEqual(afterAllowed);
    expect(f.app.houseStore.snapshot(peer.id).chat.map(message => message.text)).toEqual(["Allowed lounge message"]);
  },
);

it("keeps separate identities and bedroom ownership when residents choose the same display name", async () => {
  const f = await fixture(), owner = await identity(f), peer = await identity(f);
  const home = await createHouse(f, owner, 2, "Robin");
  await joinHouse(f, peer, home, "Robin");
  expect(peer.id).not.toBe(owner.id);
  expect(peer.cookie).not.toBe(owner.cookie);
  const residents = f.app.houseStore.snapshot(owner.id).residents;
  expect(residents.map(resident => resident.name)).toEqual(["Robin", "Robin"]);
  const ownerRoomId = residents.find(resident => resident.id === owner.id)!.bedroomId;
  const peerRoomId = residents.find(resident => resident.id === peer.id)!.bedroomId;
  expect(peerRoomId).not.toBe(ownerRoomId);
  expect(f.app.houseStore.snapshot(peer.id, peerRoomId).room?.ownerId).toBe(peer.id);
  f.app.houseStore.execute(owner.id, command("room.configure", { roomId: ownerRoomId, open: true, palette: "sage" }, home.id, 0));
  const before = f.app.houseStore.snapshot(owner.id, ownerRoomId);
  const control = await takeControl(f, peer, ownerRoomId);
  const denied = await post(f, peer, command("room.configure", { roomId: ownerRoomId, open: false, palette: "rose" }, home.id, before.room!.revision), control);
  expect(denied.status).toBe(403);
  expect(await denied.json()).toMatchObject({ ok: false, code: "FORBIDDEN" });
  expect(f.app.houseStore.snapshot(owner.id, ownerRoomId)).toEqual(before);
  expect(f.app.houseStore.me(peer.id).home?.ownerId).toBe(owner.id);
});

it("keeps personal bedroom and study-card ownership separate from house membership administration", async () => {
  const f = await fixture(), owner = await identity(f), member = await identity(f), target = await identity(f);
  const home = await createHouse(f, owner, 3);
  await joinHouse(f, member, home);
  await joinHouse(f, target, home, "Wren");
  const roomId = f.app.houseStore.snapshot(member.id).residents.find(resident => resident.id === member.id)!.bedroomId;
  expect(f.app.houseStore.snapshot(member.id, roomId).room?.open).toBe(false);
  const closedRead = await fetch(f.base + "/api/house/snapshot?zone=" + roomId, { headers: { Cookie: owner.cookie } });
  expect(closedRead.status).toBe(403);
  expect(await closedRead.json()).toMatchObject({ ok: false, code: "FORBIDDEN" });

  f.app.houseStore.execute(member.id, command("room.configure", { roomId, open: true, palette: "rose" }, home.id, 0));
  const roomBefore = f.app.houseStore.snapshot(member.id, roomId);
  const control = await takeControl(f, owner, roomId);
  const deniedRoom = await post(f, owner, command("room.configure", {
    roomId, open: false, palette: "sage",
  }, home.id, roomBefore.room!.revision), control);
  expect(deniedRoom.status).toBe(403);
  expect(await deniedRoom.json()).toMatchObject({ ok: false, code: "FORBIDDEN" });
  expect(f.app.houseStore.snapshot(member.id, roomId)).toEqual(roomBefore);

  const cardFields = { smallGoal: "Understand vectors", question: "Why do the arrows add?", resourceUrl: "", nextStep: "Draw two arrows", helpRequested: true };
  f.app.houseStore.execute(member.id, command("card.save", cardFields, home.id, 0));
  const cardBefore = f.app.houseStore.snapshot(member.id).cards.find(card => card.authorId === member.id)!;
  expect(cardBefore.state).toBe("active");
  const switched = await control.socket.timeout(3000).emitWithAck("house.subscribe", {
    zoneId: "lounge", controllerToken: control.token,
  }) as { ok: boolean; snapshot: LiveSnapshot };
  expect(switched.ok).toBe(true);
  expect(switched.snapshot.controller).toBe(true);
  const loungeControl = { ...control, zoneId: "lounge", generation: switched.snapshot.generation };
  const loungeBefore = f.app.houseStore.snapshot(owner.id);
  for (const attempted of [
    command("card.save", { ...cardFields, cardId: cardBefore.id, smallGoal: "Owner rewrote the goal" }, home.id, cardBefore.revision),
    command("card.close", { cardId: cardBefore.id }, home.id, cardBefore.revision),
  ]) {
    const deniedCard = await post(f, owner, attempted, loungeControl);
    expect(deniedCard.status).toBe(403);
    expect(await deniedCard.json()).toMatchObject({ ok: false, code: "FORBIDDEN" });
    expect(f.app.houseStore.snapshot(owner.id)).toEqual(loungeBefore);
  }

  const administration = await post(f, owner, command("house.remove", { memberId: target.id }, home.id), loungeControl);
  expect(administration.status).toBe(200);
  expect(await administration.json()).toMatchObject({ ok: true });
  expect(f.app.houseStore.me(target.id).home).toBeNull();
  expect(f.app.houseStore.me(member.id).home?.ownerId).toBe(owner.id);
  expect(f.app.houseStore.snapshot(member.id).cards.find(card => card.id === cardBefore.id)).toEqual(cardBefore);
  const roomAfter = f.app.houseStore.snapshot(member.id, roomId);
  expect(roomAfter.room).toEqual(roomBefore.room);
  expect(roomAfter.chat).toEqual(roomBefore.chat);
  expect(roomAfter.sequence).toBe(roomBefore.sequence);
});
