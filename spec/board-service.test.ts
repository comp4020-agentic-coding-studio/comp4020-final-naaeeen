import { crc32, deflateSync } from "node:zlib";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer, request as httpRequest } from "node:http";
import { Server } from "socket.io";
import { io, type Socket } from "socket.io-client";
import { afterEach, describe, expect, test } from "vitest";
import { BoardStore } from "../src/board-store.ts";
import { HouseStore } from "../src/house-store.ts";
import { attachBoardService } from "../src/board-service.ts";
const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=";
function element(id = "a", x = 0, version = 1) {
    return { id, type: "rectangle", x, y: 0, width: 100, height: 80, angle: 0, strokeColor: "#1e1e1e", backgroundColor: "transparent", fillStyle: "solid", strokeWidth: 2, strokeStyle: "solid", roughness: 1, opacity: 100, seed: 1, version, versionNonce: 100, index: "a0", isDeleted: false, groupIds: [], frameId: null, boundElements: null, updated: 1000, link: null, locked: false, roundness: null };
}
const cleanup: (() => Promise<void> | void)[] = [];
afterEach(async () => {
    for (const action of cleanup.splice(0).reverse())
        await action();
});
async function fixture() {
    const root = mkdtempSync(join(tmpdir(), "board-http-")), house = new HouseStore(join(root, "house.sqlite")), board = new BoardStore(join(root, "board.sqlite"));
    const owner = house.ensureSession(), guest = house.ensureSession(), outsider = house.ensureSession();
    house.execute(owner.id, { commandId: randomUUID(), type: "house.create", payload: { capacity: 3, name: "Ada", colour: "sage" } });
    const home = house.me(owner.id).home!;
    house.execute(guest.id, { commandId: randomUUID(), type: "house.join", payload: { code: home.code, name: "Lin", colour: "blue" } });
    let seenBody: ((() => void) | null) = null;
    const server = createServer((req, res) => {
        if (req.method === "POST")
            req.once("data", () => seenBody?.());
        void service.handle(req, res).then(handled => {
            if (!handled)
                res.writeHead(404).end();
        });
    });
    const sockets = new Server(server, { transports: ["websocket"], maxHttpBufferSize: 16 * 1024, perMessageDeflate: false });
    const logs: Record<string, unknown>[] = [];
    const service = attachBoardService(sockets, house, board, { log: record => logs.push(record) });
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const url = `http://127.0.0.1:${(server.address() as {
        port: number;
    }).port}`;
    cleanup.push(() => rmSync(root, { recursive: true, force: true }), () => house.close(), () => board.close(), () => new Promise<void>(resolve => {
        service.close();
        server.closeAllConnections();
        sockets.close(() => resolve());
    }));
    const headers = (person = owner) => ({ Origin: url, Cookie: `house_session=${person.token}`, "Content-Type": "application/json", "X-House-Identity": person.id });
    const post = async (path: string, body: unknown, person = owner, extra: Record<string, string> = {}) => {
        const response = await fetch(url + path, { method: "POST", headers: { ...headers(person), ...extra }, body: JSON.stringify(body) });
        return { status: response.status, body: await response.json() as any };
    };
    const get = async (path: string, person = owner, extra: Record<string, string> = {}) => {
        const response = await fetch(url + path, { headers: { ...headers(person), ...extra } });
        return { status: response.status, body: await response.json() as any };
    };
    async function client(person = owner, origin = url) {
        const socket = io(url + "/board", { transports: ["websocket"], reconnection: false, forceNew: true, extraHeaders: { Origin: origin, Cookie: `house_session=${person.token}` } });
        cleanup.push(() => {
            socket.disconnect();
        });
        await new Promise<void>((resolve, reject) => {
            socket.once("connect", resolve);
            socket.once("connect_error", reject);
        });
        return socket;
    }
    return { sockets, root, house, board, home, owner, guest, outsider, service, url, headers, post, get, client, logs, onBody: (fn: () => void) => {
            seenBody = fn;
        } };
}
const ask = (socket: Socket, event: string, value: unknown) => socket.timeout(1500).emitWithAck(event, value) as Promise<any>;
function next(socket: Socket, event: string) {
    return new Promise<any>((resolve, reject) => {
        const timer = setTimeout(() => {
            socket.off(event, receive);
            reject(new Error("Missing " + event));
        }, 1500);
        function receive(value: unknown) {
            clearTimeout(timer);
            socket.off(event, receive);
            resolve(value);
        }
        socket.once(event, receive);
    });
}
const patchBody = (houseId: string, elements: unknown[]) => ({ id: randomUUID(), houseId, elements });
describe("actual board HTTP and Socket.IO", () => {
    test("standalone context creates opaque house cookie and returns existing identity", async () => {
        const f = await fixture();
        const response = await fetch(f.url + "/api/board/context");
        expect(response.status).toBe(200);
        expect(response.headers.get("set-cookie")).toMatch(/house_session=.+HttpOnly; SameSite=Lax/);
        const context = await f.get("/api/board/context");
        expect(context.body.identity.id).toBe(f.owner.id);
        expect(context.body.home.id).toBe(f.home.id);
        expect(await f.service.handle({ url: "/unrelated" } as any, {} as any)).toBe(false);
    });
    test("actual concurrent transports receive winners and renewed subscription envelopes", async () => {
        const f = await fixture(), a = await f.client(), b = await f.client(f.guest);
        const first = await ask(a, "board.subscribe", { houseId: f.home.id }), second = await ask(b, "board.subscribe", { houseId: f.home.id });
        expect(first).toMatchObject({ ok: true, schemaVersion: 1, snapshot: { schemaVersion: 1, houseId: f.home.id } });
        expect(first.subscriptionId).toBe(first.snapshot.subscriptionId);
        const received = next(b, "board.patch");
        const saved = await f.post("/api/board/patch", patchBody(f.home.id, [element()]));
        expect(saved.status).toBe(200);
        expect(await received).toMatchObject({ schemaVersion: 1, subscriptionId: second.subscriptionId, elements: [{ id: "a" }] });
        await f.post("/api/board/patch", patchBody(f.home.id, [element("peer")]), f.guest);
        const stale = await f.post("/api/board/patch", patchBody(f.home.id, [element("a", 99)]));
        expect(stale.body.elements[0].x).toBe(0);
        expect(f.board.snapshot(f.home.id).elements.map(e => e.id)).toEqual(["a", "peer"]);
        const renewed = await ask(a, "board.subscribe", { houseId: f.home.id });
        expect(renewed.subscriptionId).not.toBe(first.subscriptionId);
        expect((await ask(a, "board.pointer", { subscriptionId: first.subscriptionId, x: 0, y: 0 })).code).toBe("STALE_SUBSCRIPTION");
    });
    test("rejects cross-house, cross-origin, stale identity and anonymous writes", async () => {
        const f = await fixture(), body = patchBody(f.home.id, [element()]);
        expect((await f.post("/api/board/patch", body, f.outsider)).status).toBe(403);
        expect((await f.post("/api/board/patch", body, f.owner, { Origin: "https://foreign.invalid" })).status).toBe(403);
        expect((await f.post("/api/board/patch", body, f.owner, { "X-House-Identity": f.guest.id })).body.code).toBe("IDENTITY_CHANGED");
        expect((await f.post("/api/board/patch", body, f.owner, { Cookie: "" })).status).toBe(401);
        expect((await f.get(`/api/board/snapshot?houseId=${f.home.id}`, f.outsider)).status).toBe(403);
        await expect(f.client(f.owner, "https://foreign.invalid")).rejects.toThrow();
        expect(f.board.snapshot(f.home.id).elements).toEqual([]);
    });
    test("reads binary separately, rejects MIME spoof, and preserves own export after removal", async () => {
        const f = await fixture(), houseId = f.home.id;
        const upload = await f.post("/api/board/asset", { id: randomUUID(), houseId, file: { id: "image_a", mimeType: "image/png", dataURL: "data:image/png;base64," + png } }, f.guest);
        expect(upload.status).toBe(200);
        expect(upload.body.file).toMatchObject({ id: "image_a", mimeType: "image/png" });
        await f.post("/api/board/patch", patchBody(houseId, [element("guest_contribution", 12)]), f.guest);
        await f.post("/api/board/patch", patchBody(houseId, [element("guest_contribution", 25, 2)]), f.owner);
        const snapshot = await f.get(`/api/board/snapshot?houseId=${houseId}`);
        expect(snapshot.body.files[0]).not.toHaveProperty("dataURL");
        const asset = await fetch(f.url + upload.body.file.url, { headers: f.headers() });
        expect(asset.headers.get("content-type")).toBe("image/png");
        expect(Buffer.from(await asset.arrayBuffer()).toString("base64")).toBe(png);
        expect((await f.post("/api/board/asset", { id: randomUUID(), houseId, file: { id: "bad", mimeType: "image/jpeg", dataURL: "data:image/jpeg;base64," + png } })).status).toBe(400);
        f.house.execute(f.owner.id, { commandId: randomUUID(), type: "house.remove", houseId, payload: { memberId: f.guest.id } });
        expect((await f.get(`/api/board/snapshot?houseId=${houseId}`, f.guest)).status).toBe(403);
        const own = await f.post("/api/board/export", { houseId }, f.guest);
        expect(own.status).toBe(200);
        expect(own.body.elements[0].x).toBe(12);
        expect(own.body.sequence).toBe(0);
        expect(own.body.files[0].id).toBe("image_a");
        expect((await fetch(f.url + upload.body.file.url, { headers: f.headers(f.guest) })).status).toBe(200);
        expect((await fetch(f.url + upload.body.file.url, { headers: f.headers(f.outsider) })).status).toBe(403);
    });
    test.each(["remove", "recover", "leave"])("clears current board view after %s within sweep", async (action) => {
        const f = await fixture(), socket = await f.client(f.guest);
        const subscription = await ask(socket, "board.subscribe", { houseId: f.home.id }), revoked = next(socket, "board.revoked");
        if (action === "remove")
            f.house.execute(f.owner.id, { commandId: randomUUID(), type: "house.remove", houseId: f.home.id, payload: { memberId: f.guest.id } });
        else if (action === "recover")
            f.house.recover(f.house.issueRecovery(f.guest.id));
        else
            f.house.execute(f.guest.id, { commandId: randomUUID(), type: "house.leave", houseId: f.home.id, payload: {} });
        const started = Date.now(), event = await revoked;
        expect(Date.now() - started).toBeLessThan(250);
        expect(event).toMatchObject({ schemaVersion: 1, subscriptionId: subscription.subscriptionId });
        expect(["FORBIDDEN", "UNAUTHENTICATED"]).toContain(event.code);
        expect((await ask(socket, "board.pointer", { x: 0, y: 0 })).ok).toBe(false);
    });
    test("rechecks the captured session after slow body arrives", async () => {
        const f = await fixture(), proof = f.house.issueRecovery(f.guest.id), body = JSON.stringify(patchBody(f.home.id, [element("delayed")]));
        let observed!: () => void;
        const started = new Promise<void>(resolve => {
            observed = resolve;
        });
        f.onBody(observed);
        let end!: () => void;
        const response = new Promise<{
            status: number;
            body: any;
        }>((resolve, reject) => {
            const req = httpRequest(f.url + "/api/board/patch", { method: "POST", headers: f.headers(f.guest) }, res => {
                let data = "";
                res.on("data", chunk => data += chunk);
                res.on("end", () => resolve({ status: res.statusCode!, body: JSON.parse(data) }));
            });
            req.on("error", reject);
            req.write(body.slice(0, 30));
            end = () => req.end(body.slice(30));
        });
        await started;
        f.house.recover(proof);
        end();
        expect((await response).status).toBe(401);
        expect(f.board.snapshot(f.home.id).elements).toEqual([]);
    });
    test("enforces request/body bounds and logs no private text", async () => {
        const f = await fixture();
        const r = await f.post("/api/board/patch", { ...patchBody(f.home.id, [element()]), padding: "x".repeat(128 * 1024) });
        expect(r.status).toBe(413);
        const chat = await f.post("/api/board/chat", { id: randomUUID(), houseId: f.home.id, text: "A long note\nsecond paragraph" });
        expect(chat.status).toBe(200);
        const snapshot = await f.get(`/api/board/snapshot?houseId=${f.home.id}`);
        expect(snapshot.body.chat[0].text).toContain("second paragraph");
        expect(JSON.stringify(f.logs)).not.toContain("second paragraph");
        expect(JSON.stringify(f.logs)).not.toContain(f.owner.token);
        for (let n = 0; n < 241; n++) {
            const result = await f.get("/api/board/context");
            if (result.status === 429) {
                expect(n).toBeLessThan(241);
                break;
            }
            if (n === 240)
                throw new Error("Read rate limit did not apply");
        }
    });
    test("pointer selection is transient and membership-rechecked before any broadcast", async () => {
        const f = await fixture(), a = await f.client(), b = await f.client(f.guest);
        await ask(a, "board.subscribe", { houseId: f.home.id });
        const subscription = await ask(b, "board.subscribe", { houseId: f.home.id });
        expect((await ask(b, "board.pointer", { subscriptionId: subscription.subscriptionId, x: 33, y: 45, selectedElementIds: ["a"] })).ok).toBe(true);
        expect(f.board.snapshot(f.home.id)).not.toHaveProperty("views");
        f.house.execute(f.owner.id, { commandId: randomUUID(), type: "house.remove", houseId: f.home.id, payload: { memberId: f.guest.id } });
        const patches: any[] = [];
        b.on("board.patch", payload => patches.push(payload));
        await f.post("/api/board/patch", patchBody(f.home.id, [element()]));
        expect(patches).toEqual([]);
    });
    test("accepts a real near-limit PNG over bounded HTTP while keeping socket inbound at 16 KiB", async () => {
        const f = await fixture();
        const chunk = (type: string, data: Buffer) => {
            const output = Buffer.alloc(data.length + 12);
            output.writeUInt32BE(data.length);
            output.write(type, 4, "ascii");
            data.copy(output, 8);
            output.writeUInt32BE(crc32(output.subarray(4, -4)), output.length - 4);
            return output;
        };
        const size = 820, header = Buffer.alloc(13);
        header.writeUInt32BE(size);
        header.writeUInt32BE(size, 4);
        header[8] = 8;
        header[9] = 2;
        const scanlines = Buffer.concat(Array.from({ length: size }, () => Buffer.concat([Buffer.from([0]), randomBytes(size * 3)])));
        const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header), chunk("IDAT", deflateSync(scanlines)), chunk("IEND", Buffer.alloc(0))]);
        expect(png.length).toBeGreaterThan(1900 * 1024);
        expect(png.length).toBeLessThan(2 * 1024 * 1024);
        const wire = { id: randomUUID(), houseId: f.home.id, file: { id: "large-real-png", mimeType: "image/png", dataURL: "data:image/png;base64," + png.toString("base64") } };
        expect(Buffer.byteLength(JSON.stringify(wire))).toBeGreaterThan(2 * 1024 * 1024);
        expect((await f.post("/api/board/asset", wire)).status).toBe(200);
        const snapshot = await f.get(`/api/board/snapshot?houseId=${f.home.id}`);
        expect(Buffer.byteLength(JSON.stringify(snapshot.body))).toBeLessThan(1024);
        const bytes = await fetch(f.url + snapshot.body.files[0].url, { headers: f.headers() });
        expect(Buffer.from(await bytes.arrayBuffer()).equals(png)).toBe(true);
    });
    test("last resident archive clears board and leaves own contribution export readable", async () => {
        const f = await fixture();
        f.house.execute(f.guest.id, { commandId: randomUUID(), type: "house.leave", houseId: f.home.id, payload: {} });
        await f.post("/api/board/patch", patchBody(f.home.id, [element("author")]), f.owner);
        const socket = await f.client(), subscription = await ask(socket, "board.subscribe", { houseId: f.home.id }), revoked = next(socket, "board.revoked");
        f.house.execute(f.owner.id, { commandId: randomUUID(), type: "house.leave", houseId: f.home.id, payload: {} });
        expect(await revoked).toMatchObject({ schemaVersion: 1, subscriptionId: subscription.subscriptionId, code: "FORBIDDEN" });
        expect((await f.get(`/api/board/snapshot?houseId=${f.home.id}`)).status).toBe(403);
        expect((await f.post("/api/board/export", { houseId: f.home.id })).body.elements[0].id).toBe("author");
    });
    test("bounds board view count independently and rejects ambiguous session cookies", async () => {
        const f = await fixture();
        const sockets = [];
        for (let n = 0; n < 12; n++)
            sockets.push(await f.client());
        await expect(f.client()).rejects.toThrow();
        const result = await f.get(`/api/board/snapshot?houseId=${f.home.id}`, f.owner, { Cookie: `house_session=${f.owner.token}; house_session=${f.guest.token}` });
        expect(result.status).toBe(401);
        expect((await f.post("/api/board/export", { houseId: f.home.id, actorId: f.guest.id })).status).toBe(400);
        expect((await f.get("/api/board/missing")).status).toBe(404);
    });
    test("rejects stale membership after slow body, invalid JSON, content type and unsupported HTTP methods", async () => {
        const f = await fixture(), body = JSON.stringify(patchBody(f.home.id, [element("delayed")]));
        let resolveStarted!: () => void;
        const started = new Promise<void>(resolve => {
            resolveStarted = resolve;
        });
        f.onBody(resolveStarted);
        let end!: () => void;
        const response = new Promise<number>((resolve, reject) => {
            const req = httpRequest(f.url + "/api/board/patch", { method: "POST", headers: f.headers(f.guest) }, res => {
                res.resume();
                res.on("end", () => resolve(res.statusCode!));
            });
            req.on("error", reject);
            req.write(body.slice(0, 30));
            end = () => req.end(body.slice(30));
        });
        await started;
        f.house.execute(f.owner.id, { commandId: randomUUID(), type: "house.remove", houseId: f.home.id, payload: { memberId: f.guest.id } });
        end();
        expect(await response).toBe(403);
        expect(f.board.snapshot(f.home.id).elements).toEqual([]);
        const bad = await fetch(f.url + "/api/board/patch", { method: "POST", headers: f.headers(), body: "{" });
        expect(bad.status).toBe(400);
        expect((await f.post("/api/board/patch", patchBody(f.home.id, []), f.owner, { "Content-Type": "text/plain" })).status).toBe(400);
        const method = await fetch(f.url + "/api/board/snapshot", { method: "PUT", headers: f.headers() });
        expect(method.status).toBe(404);
    });
    test("bounds concurrent asynchronous uploads before buffering more bodies", async () => {
        const f = await fixture(), body = JSON.stringify(patchBody(f.home.id, [element("late")]));
        const held: ReturnType<typeof httpRequest>[] = [];
        const started: Promise<void>[] = [];
        let count = 0, resolveAll!: () => void;
        const allStarted = new Promise<void>(resolve => {
            resolveAll = resolve;
        });
        f.onBody(() => {
            if (++count === 4)
                resolveAll();
        });
        for (let n = 0; n < 4; n++) {
            const req = httpRequest(f.url + "/api/board/patch", { method: "POST", headers: f.headers() }, res => {
                res.resume();
            });
            req.on("error", () => {
            });
            req.write(body.slice(0, 30));
            held.push(req);
        }
        await allStarted;
        const result = await f.post("/api/board/patch", patchBody(f.home.id, [element("extra")]));
        expect(result.status).toBe(429);
        expect(result.body.code).toBe("RATE_LIMITED");
        expect(f.board.snapshot(f.home.id).elements).toEqual([]);
        for (const req of held)
            req.destroy();
    });
    test("reports restart during body arrival without falsely revoking the identity", async () => {
        const f = await fixture(), body = JSON.stringify(patchBody(f.home.id, [element("lateRestart")]));
        let resolveStarted!: () => void;
        const started = new Promise<void>(resolve => {
            resolveStarted = resolve;
        });
        f.onBody(resolveStarted);
        let end!: () => void;
        const response = new Promise<{
            status: number;
            body: any;
        }>((resolve, reject) => {
            const req = httpRequest(f.url + "/api/board/patch", { method: "POST", headers: f.headers() }, res => {
                let text = "";
                res.on("data", chunk => text += chunk);
                res.on("end", () => resolve({ status: res.statusCode!, body: JSON.parse(text) }));
            });
            req.on("error", reject);
            req.write(body.slice(0, 30));
            end = () => req.end(body.slice(30));
        });
        await started;
        f.service.close();
        end();
        const result = await response;
        expect(result.status).toBe(503);
        expect(result.body.code).toBe("STORAGE_UNAVAILABLE");
        expect(f.house.session(f.owner.digest)).toEqual({ id: f.owner.id });
        expect(f.board.snapshot(f.home.id).elements).toEqual([]);
    });
    test("bounds error acknowledgements on a stalled real transport", async () => {
        const f = await fixture(), client = await f.client();
        const subscription = await ask(client, "board.subscribe", { houseId: f.home.id });
        const peer = [...f.sockets.of("/board").sockets.values()][0]!;
        let handled = 0, resolveHandled!: () => void;
        const allHandled = new Promise<void>(resolve => {
            resolveHandled = resolve;
        });
        peer.onAny(() => {
            if (++handled === 100)
                resolveHandled();
        });
        const disconnected = new Promise<void>(resolve => client.once("disconnect", () => resolve()));
        (peer.conn.transport as any).writable = false;
        for (let n = 0; n < 100; n++)
            client.emit("board.pointer", { subscriptionId: subscription.subscriptionId, x: null, y: 0 }, () => {
            });
        await Promise.race([allHandled, disconnected, new Promise(resolve => setTimeout(resolve, 400))]);
        const queued = (peer.conn as any).writeBuffer.length;
        expect(queued).toBeLessThanOrEqual(8);
        expect(peer.conn.readyState).not.toBe("open");
    });
    test("retains original expired chat receipt but does not redeliver it", async () => {
        const f = await fixture(), socket = await f.client();
        await ask(socket, "board.subscribe", { houseId: f.home.id });
        const body = { id: randomUUID(), houseId: f.home.id, text: "expired message" };
        const initial = next(socket, "board.chat");
        const saved = await f.post("/api/board/chat", body);
        await initial;
        f.board.db.prepare("UPDATE chat SET at=? WHERE id=?").run(Date.now() - 8 * 86400000, body.id);
        expect(f.board.snapshot(f.home.id).chat).toEqual([]);
        const messages: any[] = [];
        socket.on("board.chat", value => messages.push(value));
        const replay = await f.post("/api/board/chat", body);
        await new Promise(resolve => setTimeout(resolve, 20));
        expect(replay.body).toEqual(saved.body);
        expect(messages).toEqual([]);
    });
    test("subscribes to a valid near-limit scene plus maximum retained chat without duplicate full frames",async()=>{
        const f=await fixture(),houseId=f.home.id;let objects=[];
        for(let n=0;n<80;n++)objects.push({...element("largeNote"+n),type:"text",fontSize:20,fontFamily:5,text:"n".repeat(11000),originalText:"n".repeat(11000),textAlign:"left",verticalAlign:"top",containerId:null,autoResize:true,lineHeight:1.25});
        for(let n=0;n<objects.length;n+=4)f.board.patch(f.owner.id,{id:randomUUID(),houseId,elements:objects.slice(n,n+4)});
        for(let n=0;n<100;n++)f.board.chat(f.owner.id,"Ada",{id:randomUUID(),houseId,text:"c".repeat(4000)});
        const bytes=Buffer.byteLength(JSON.stringify(f.board.snapshot(houseId)));expect(bytes).toBeGreaterThan(2*1024*1024);expect(Buffer.byteLength(JSON.stringify(f.board.snapshot(houseId).elements))).toBeLessThan(2*1024*1024);
        const client=await f.client(),snapshots:any[]=[];client.on("board.snapshot",value=>snapshots.push(value));const subscribed=await ask(client,"board.subscribe",{houseId});await new Promise(resolve=>setTimeout(resolve,30));expect(subscribed.ok).toBe(true);expect(subscribed.snapshot.elements).toHaveLength(80);expect(subscribed.snapshot.chat).toHaveLength(100);expect(client.connected).toBe(true);expect(snapshots).toEqual([]);
    });

});
