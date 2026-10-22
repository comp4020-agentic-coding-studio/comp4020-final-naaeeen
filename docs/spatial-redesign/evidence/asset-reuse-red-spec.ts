import { createHash, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer, type ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { crc32, deflateSync } from "node:zlib";
import { Server } from "socket.io";
import { afterEach, describe, expect, test, vi } from "vitest";
import { attachBoardService } from "../src/board-service.ts";
import { BoardStore } from "../src/board-store.ts";
import { HouseStore } from "../src/house-store.ts";

const tinyPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=", "base64");
const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const cleanup: Array<() => Promise<void> | void> = [];
afterEach(async () => {
    vi.restoreAllMocks();
    for (const action of cleanup.splice(0).reverse()) await action();
});

// Exact registered board-resource.mjs fixture algorithm, seeds and file IDs.
function resourcePng(seed: number): Buffer {
    const side = 820, header = Buffer.alloc(13), data = Buffer.alloc(side * (side * 3 + 1));
    header.writeUInt32BE(side); header.writeUInt32BE(side, 4); header[8] = 8; header[9] = 2;
    let state = seed >>> 0;
    for (let y = 0; y < side; y++) for (let x = 1; x <= side * 3; x++) {
        state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
        data[y * (side * 3 + 1) + x] = state & 255;
    }
    const chunk = (type: string, bytes: Buffer) => {
        const out = Buffer.alloc(bytes.length + 12);
        out.writeUInt32BE(bytes.length); out.write(type, 4, "ascii"); bytes.copy(out, 8);
        out.writeUInt32BE(crc32(out.subarray(4, -4)), out.length - 4);
        return out;
    };
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header), chunk("IDAT", deflateSync(data)), chunk("IEND", Buffer.alloc(0))]);
}

async function fixture(residents = 2) {
    const root = mkdtempSync(join(tmpdir(), "board-asset-reuse-"));
    const house = new HouseStore(join(root, "house.sqlite")), board = new BoardStore(join(root, "board.sqlite"));
    const groups = Array.from({ length: 2 }, () => {
        const people = Array.from({ length: residents }, () => house.ensureSession()), owner = people[0]!;
        house.execute(owner.id, { commandId: randomUUID(), type: "house.create", payload: { capacity: Math.max(2, residents), name: "Owner", colour: "sage" } });
        const home = house.me(owner.id).home!;
        for (const person of people.slice(1)) house.execute(person.id, { commandId: randomUUID(), type: "house.join", payload: { code: home.code, name: "Reader", colour: "blue" } });
        return { home, people, owner, guest: people[1]! };
    });
    const materialized: Buffer[] = [], delivered: Buffer[] = [];
    const prepare = board.db.prepare.bind(board.db);
    vi.spyOn(board.db, "prepare").mockImplementation(sql => {
        const statement = prepare(sql);
        if (sql === "SELECT mime_type,bytes FROM assets WHERE house_id=? AND id=?") {
            const get = statement.get.bind(statement);
            vi.spyOn(statement, "get").mockImplementation((...args) => {
                const row = get(...args);
                if (row) {
                    const bytes = row.bytes as Uint8Array;
                    materialized.push(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength));
                }
                return row;
            });
        }
        return statement;
    });
    const server = createServer((request, response) => {
        const end = response.end;
        response.end = function (chunk: unknown, ...args: unknown[]) {
            if (Buffer.isBuffer(chunk)) delivered.push(chunk);
            return Reflect.apply(end, response, [chunk, ...args]) as ServerResponse;
        } as typeof response.end;
        void service.handle(request, response).then(handled => { if (!handled) response.writeHead(404).end(); });
    });
    const sockets = new Server(server, { transports: ["websocket"], maxHttpBufferSize: 16 * 1024, perMessageDeflate: false });
    const service = attachBoardService(sockets, house, board);
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    cleanup.push(() => {
        if (!root.startsWith(join(tmpdir(), "board-asset-reuse-"))) throw new Error("Unexpected fixture target");
        rmSync(root, { recursive: true, force: true });
    }, () => house.close(), () => board.close(), () => new Promise<void>(resolve => {
        service.close(); server.closeAllConnections(); sockets.close(() => resolve());
    }));
    const headers = (person = groups[0]!.owner) => ({ Origin: url, Cookie: `house_session=${person.token}`, "X-House-Identity": person.id });
    const assetUrl = (houseId: string, fileId: string) => `${url}/api/board/asset?houseId=${houseId}&fileId=${fileId}`;
    const put = (group: typeof groups[number], fileId: string, bytes = tinyPng, person = group.owner) => board.asset(person.id, { id: randomUUID(), houseId: group.home.id, file: { id: fileId, mimeType: "image/png", dataURL: "data:image/png;base64," + bytes.toString("base64") } });
    const get = async (group: typeof groups[number], fileId: string, person = group.owner, extra: Record<string, string> = {}) => {
        const response = await fetch(assetUrl(group.home.id, fileId), { headers: { ...headers(person), ...extra } });
        const bytes = Buffer.from(await response.arrayBuffer());
        return { response, bytes };
    };
    return { house, board, groups, service, materialized, delivered, headers, assetUrl, put, get };
}

describe("immutable HTTP asset allocation", () => {
    test("24 matched reads preserve all four registered images while sharing server backing stores", async () => {
        const f = await fixture(6), images = [resourcePng(101), resourcePng(102), resourcePng(201), resourcePng(202)];
        const files: Array<{ seed: number; houseIndex: number; fileId: string; bytes: number; sha256: string }> = [];
        for (const [index, group] of f.groups.entries()) for (let n = 0; n < 2; n++) {
            const image = images[index * 2 + n]!, fileId = `resource_png_${n}`;
            expect(image.length).toBeGreaterThan(1900 * 1024); expect(image.length).toBeLessThan(2 * 1024 * 1024);
            f.put(group, fileId, image, group.people[n]);
            files.push({ seed: 101 + index * 100 + n, houseIndex: index, fileId, bytes: image.length, sha256: digest(image) });
        }
        for (const [index, group] of f.groups.entries()) for (const reader of group.people) for (let n = 0; n < 2; n++) {
            const { response, bytes } = await f.get(group, `resource_png_${n}`, reader);
            expect(response.status).toBe(200); expect(digest(bytes)).toBe(files[index * 2 + n]!.sha256);
            expect(Object.fromEntries(["content-type", "content-length", "cache-control", "x-content-type-options", "cross-origin-resource-policy", "content-disposition"].map(key => [key, response.headers.get(key)]))).toEqual({
                "content-type": "image/png", "content-length": String(bytes.length), "cache-control": "no-store", "x-content-type-options": "nosniff", "cross-origin-resource-policy": "same-origin", "content-disposition": "inline"
            });
        }
        const stores = new Set(f.materialized.map(bytes => bytes.buffer)), responseStores = new Set(f.delivered.map(bytes => bytes.buffer));
        console.info("ASSET_ALLOCATION_COMPARISON", JSON.stringify({ task: "two houses, six resident reads each, two original images per reader", files, reads: f.delivered.length, sqliteBlobMaterializations: f.materialized.length, uniqueSQLiteBackingStores: stores.size, uniqueResponseBackingStores: responseStores.size, retainedObservedBackingBytes: [...responseStores].reduce((sum, buffer) => sum + buffer.byteLength, 0), claim: "allocation counts only; no RSS or full-workload result" }));
        expect(f.delivered).toHaveLength(24);
        expect(f.materialized).toHaveLength(4);
        expect(stores.size).toBe(4); expect(responseStores.size).toBe(4);
    });

    test("house and file keys stay separate, misses stay 404, and store buffers remain independently mutable", async () => {
        const f = await fixture(), [a, b] = f.groups;
        f.put(a!, "same_file", resourcePng(101)); f.put(b!, "same_file", resourcePng(201)); f.put(a!, "other_file");
        expect(digest((await f.get(a!, "same_file")).bytes)).not.toBe(digest((await f.get(b!, "same_file")).bytes));
        expect((await f.get(a!, "other_file")).bytes.equals(tinyPng)).toBe(true);
        const reads = f.materialized.length;
        expect((await f.get(a!, "same_file")).response.status).toBe(200); expect(f.materialized).toHaveLength(reads);
        const missing = await f.get(a!, "missing"); expect(missing.response.status).toBe(404); expect(missing.response.headers.get("cache-control")).toBe("no-store");
        f.put(a!, "missing"); expect((await f.get(a!, "missing")).bytes.equals(tinyPng)).toBe(true);
        const first = f.board.getAsset(a!.home.id, "other_file")!, second = f.board.getAsset(a!.home.id, "other_file")!;
        expect(first.bytes.buffer).not.toBe(second.bytes.buffer); first.bytes.fill(0);
        expect(second.bytes.equals(tinyPng)).toBe(true); expect(f.board.getAsset(a!.home.id, "other_file")!.bytes.equals(tinyPng)).toBe(true);
        expect((await f.get(a!, "other_file")).bytes.equals(tinyPng)).toBe(true);
        expect(() => f.put(a!, "other_file", resourcePng(102))).toThrow("different bytes");
    });

    test("cached reads still enforce current membership, own export, identity, origin and recovered sessions", async () => {
        const f = await fixture(), group = f.groups[0]!, other = f.groups[1]!;
        f.put(group, "owner_file"); f.put(group, "guest_file", tinyPng, group.guest);
        expect((await f.get(group, "owner_file", group.guest)).response.status).toBe(200);
        expect((await f.get(group, "guest_file", group.guest)).response.status).toBe(200);
        const own = vi.spyOn(f.board, "isOwnAsset"), reads = f.materialized.length;
        expect((await f.get(group, "owner_file", group.guest)).response.status).toBe(200); expect(own).toHaveBeenCalledOnce();
        f.house.execute(group.owner.id, { commandId: randomUUID(), type: "house.remove", houseId: group.home.id, payload: { memberId: group.guest.id } });
        expect((await f.get(group, "owner_file", group.guest)).response.status).toBe(403);
        expect((await f.get(group, "guest_file", group.guest)).response.status).toBe(200);
        expect((await f.get(group, "guest_file", other.owner)).response.status).toBe(403);
        expect((await f.get(group, "guest_file", group.guest, { "X-House-Identity": group.owner.id })).response.status).toBe(403);
        expect((await f.get(group, "guest_file", group.guest, { Origin: "https://foreign.invalid" })).response.status).toBe(403);
        f.house.recover(f.house.issueRecovery(group.guest.id));
        expect((await f.get(group, "guest_file", group.guest)).response.status).toBe(401);
        expect(f.materialized).toHaveLength(reads);
    });

    test("rechecks membership and sessions immediately after a cache hit", async () => {
        const f = await fixture(), group = f.groups[0]!;
        f.put(group, "cached"); await f.get(group, "cached", group.guest);
        const me = f.house.me.bind(f.house); let checks = 0;
        const memberSpy = vi.spyOn(f.house, "me").mockImplementation(id => {
            if (id === group.guest.id && ++checks === 2) f.house.execute(group.owner.id, { commandId: randomUUID(), type: "house.remove", houseId: group.home.id, payload: { memberId: group.guest.id } });
            return me(id);
        });
        expect((await f.get(group, "cached", group.guest)).response.status).toBe(403);
        expect(checks).toBe(2); memberSpy.mockRestore();
        // Own-export reads bypass membership, but still recheck their persisted session after lookup.
        const session = f.house.session.bind(f.house); let sessions = 0;
        const proof = f.house.issueRecovery(group.owner.id);
        vi.spyOn(f.house, "session").mockImplementation(value => { if (++sessions === 3) f.house.recover(proof); return session(value); });
        expect((await f.get(group, "cached", group.owner)).response.status).toBe(401);
        expect(sessions).toBe(3); expect(f.materialized).toHaveLength(1);
    });
});
