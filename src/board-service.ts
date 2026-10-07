import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Server, Socket } from "socket.io";
import { HouseError } from "./house-contract.ts";
import type { Me } from "./house-contract.ts";
import { HOUSE_SESSION_SECONDS, houseSessionDigest } from "./house-store.ts";
import type { HouseStore } from "./house-store.ts";
import { BOARD_LIMITS, BoardError, boardFail, boardKeys, boardObject, boardUuid, validateBoardPointer } from "./board-contract.ts";
import type { BoardPointer, BoardReceipt } from "./board-contract.ts";
import type { BoardStore } from "./board-store.ts";
interface Options {
    origin?: string;
    secureCookies?: boolean;
    log?: (record: Record<string, unknown>) => void;
}
export type BoardHouseAuthority = Pick<HouseStore, "session" | "me" | "ensureSession">;
type Actor = {
    id: string;
    digest: string;
};
type View = Actor & {
    socket: Socket;
    houseId: string | null;
    subscriptionId: string;
    pointer?: BoardPointer;
    pointerAt: number;
    budgetAt: number;
    events: number;
};
const failure = (error: unknown) => error instanceof BoardError || error instanceof HouseError ? { ok: false as const, code: error.code, message: error.message } : { ok: false as const, code: "STORAGE_UNAVAILABLE", message: "The board is temporarily unavailable. Keep local work and retry." };
function cookieToken(request: IncomingMessage): string | undefined {
    const matches = (request.headers.cookie ?? "").split(";").map(v => v.trim()).filter(v => v.startsWith("house_session="));
    if (matches.length !== 1)
        return undefined;
    const token = matches[0]!.slice(14);
    return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : undefined;
}
function allowedOrigin(request: IncomingMessage, options: Options, required: boolean): boolean {
    const site = request.headers["sec-fetch-site"];
    if (site && !['same-origin', 'none'].includes(String(site)))
        return false;
    const host = request.headers.host;
    if (!host)
        return false;
    const expected = options.origin ?? (!options.secureCookies && /^(localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/.test(host) ? `http://${host}` : undefined);
    return !!expected && (!request.headers.origin && !required || request.headers.origin === expected);
}
function json(response: ServerResponse, status: number, value: unknown): void {
    response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    response.end(JSON.stringify(value));
}
async function readBody(request: IncomingMessage, max: number): Promise<unknown> {
    if (!/^application\/json(?:\s*;|$)/i.test(String(request.headers['content-type'] ?? '')))
        boardFail("INVALID_INPUT", "Use a JSON request body.");
    const announced = request.headers['content-length'];
    if (announced && (!/^\d+$/.test(announced) || Number(announced) > max))
        boardFail("LIMIT_EXCEEDED", "This request exceeds the board upload limit.");
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of request) {
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += bytes.length;
        if (size > max) {
            request.resume();
            boardFail("LIMIT_EXCEEDED", "This request exceeds the board upload limit.");
        }
        chunks.push(bytes);
    }
    try {
        return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    }
    catch {
        return boardFail("INVALID_INPUT", "The request must contain valid JSON.");
    }
}
function outboundFits(socket: Socket, value: unknown): boolean {
    const conn = socket.conn as unknown as {
        readyState: string;
        writeBuffer?: {
            data?: unknown;
        }[];
        transport: {
            name: string;
            socket?: {
                bufferedAmount?: number;
            };
        };
    };
    if (conn.readyState !== "open" || conn.transport.name !== "websocket" || !Array.isArray(conn.writeBuffer) || typeof conn.transport.socket?.bufferedAmount !== "number")
        return false;
    let queued = conn.transport.socket.bufferedAmount;
    for (const p of conn.writeBuffer) {
        if (typeof p.data !== "string" && !Buffer.isBuffer(p.data))
            return false;
        queued += Buffer.byteLength(p.data) + 32;
    }
    return conn.writeBuffer.length < 8 && queued + Buffer.byteLength(JSON.stringify(value)) + 64 <= 4 * 1024 * 1024;
}
/** Membership is checked on each action, after asynchronous body arrival, and immediately before delivery. */
export function attachBoardService(io: Server, houseStore: BoardHouseAuthority, store: BoardStore, options: Options = {}) {
    const namespace = io.of("/board"), views = new Map<string, View>(), buckets = new Map<string, {
        at: number;
        count: number;
    }>();
    let closed = false;
    let activeBodies = 0;
    const log = (id: string, action: string, outcome: string) => {
        try {
            options.log?.({ at: Date.now(), actor: id, action, outcome });
        }
        catch {
        }
    };
    function actor(request: IncomingMessage): Actor {
        const token = cookieToken(request), digest = token ? houseSessionDigest(token) : "", current = digest ? houseStore.session(digest) : undefined;
        if (!current)
            boardFail("UNAUTHENTICATED", "Your house session changed. Reload or recover the original identity.");
        return { id: current.id, digest };
    }
    function sameActor(original: Actor): void {
        if (closed)
            boardFail("STORAGE_UNAVAILABLE", "The board is restarting. Keep the original pending save and retry after reconnecting.");
        if (houseStore.session(original.digest)?.id !== original.id)
            boardFail("UNAUTHENTICATED", "Your session changed. Recover the original identity before retrying.");
    }
    function member(a: Actor, houseId: string): Me {
        sameActor(a);
        const me = houseStore.me(a.id);
        if (me.home?.id !== houseId)
            boardFail("FORBIDDEN", "Current membership in this house is required for its shared board.");
        return me;
    }
    function intended(request: IncomingMessage, a: Actor, required = false): void {
        const id = request.headers["x-house-identity"];
        if ((required || id !== undefined) && id !== a.id)
            boardFail("IDENTITY_CHANGED", "Your identity changed. Return to the original identity to review this pending action.");
    }
    function rate(a: Actor, write: boolean, limit = 240, lane = ""): void {
        const now = Date.now(), key = lane + (write ? "write:" : "read:") + a.digest;
        for (const [id, b] of buckets)
            if (now - b.at >= 60000)
                buckets.delete(id);
        const b = buckets.get(key) ?? { at: now, count: 0 };
        if (b.count >= limit || !buckets.has(key) && buckets.size >= 2000)
            boardFail("RATE_LIMITED", "Please pause briefly before another board request.");
        b.count++;
        buckets.set(key, b);
    }
    function revoke(view: View, error: unknown): void {
        if (!view.houseId)
            return;
        const problem = failure(error), payload = { schemaVersion: 1, subscriptionId: view.subscriptionId, code: problem.code, message: problem.message };
        view.houseId = null;
        delete view.pointer;
        if (outboundFits(view.socket, payload))
            view.socket.emit("board.revoked", payload);
        else
            view.socket.conn.close(true);
        log(view.id, "board.subscription", problem.code);
    }
    function deliver(view: View, event: string, value: Record<string, unknown>): void {
        if (!view.houseId)
            return;
        try {
            member(view, view.houseId);
            const payload = { ...value, schemaVersion: 1, subscriptionId: view.subscriptionId };
            if (!outboundFits(view.socket, payload)) {
                revoke(view, new BoardError("SLOW_CONNECTION", "Your connection fell behind. Reconnect to the saved board."));
                view.socket.conn.close(true);
                return;
            }
            view.socket.emit(event, payload);
        }
        catch (error) {
            revoke(view, error);
        }
    }
    function publish(houseId: string, event: string, value: Record<string, unknown>): void {
        for (const view of views.values())
            if (view.houseId === houseId)
                deliver(view, event, value);
    }
    function presence(houseId: string): void {
        const people = [];
        for (const view of views.values()) {
            if (view.houseId !== houseId)
                continue;
            try {
                const me = member(view, houseId);
                people.push({ id: view.id, name: me.identity.name, colour: me.identity.colour, ...(view.pointer ? { pointer: view.pointer } : {}) });
            }
            catch (error) {
                revoke(view, error);
            }
        }
        publish(houseId, "board.presence", { houseId, views: people });
    }
    function snapshots(houseId: string): void {
        for (const view of views.values())
            if (view.houseId === houseId) {
                try {
                    member(view, houseId);
                    deliver(view, "board.snapshot", { ...store.snapshot(houseId) });
                }
                catch (error) {
                    revoke(view, error);
                }
            }
    }
    function boundedAck(view: View, ack: unknown, value: unknown): void {
        if (typeof ack !== "function")
            return;
        if (!outboundFits(view.socket, value)) {
            view.socket.conn.close(true);
            return;
        }
        (ack as (value: unknown) => void)(value);
    }
    function acknowledge(view: View, ack: unknown, value: unknown): void {
        try {
            sameActor(view);
            if (view.houseId)
                member(view, view.houseId);
            boundedAck(view, ack, value);
        }
        catch (error) {
            boundedAck(view, ack, { ...failure(error), schemaVersion: 1, subscriptionId: view.subscriptionId });
        }
    }
    namespace.use((socket, next) => {
        try {
            if (closed || !allowedOrigin(socket.request, options, true))
                boardFail("FORBIDDEN", "The board connection must come from this house page.");
            if (views.size >= BOARD_LIMITS.views)
                boardFail("LIMIT_EXCEEDED", "The board has reached its twelve-view limit. Close another tab first.");
            const current = actor(socket.request);
            socket.data.boardActor = current;
            next();
        }
        catch (error) {
            const e = new Error(failure(error).message);
            (e as Error & {
                data?: unknown;
            }).data = failure(error);
            next(e);
        }
    });
    function connected(socket: Socket): void {
        const current = socket.data.boardActor as Actor, view: View = { ...current, socket, houseId: null, subscriptionId: randomUUID(), pointerAt: 0, budgetAt: Date.now(), events: 0 };
        if (closed || views.size >= BOARD_LIMITS.views) {
            socket.disconnect();
            return;
        }
        views.set(socket.id, view);
        socket.on("board.subscribe", (value: unknown, ack: unknown) => {
            try {
                sameActor(view);
                rate(view, false, 24, "subscribe:");
                const p = boardObject(value);
                boardKeys(p, ["houseId"]);
                const houseId = boardUuid(p.houseId);
                const me = member(view, houseId);
                const old = view.houseId;
                view.houseId = houseId;
                view.subscriptionId = randomUUID();
                delete view.pointer;
                const snapshot = { ...store.snapshot(houseId), schemaVersion: 1 as const, subscriptionId: view.subscriptionId };
                member(view, houseId);
                if(typeof ack==="function")acknowledge(view, ack, { ok: true, schemaVersion: 1, subscriptionId: view.subscriptionId, snapshot });
                else deliver(view, "board.snapshot", snapshot);
                if (old && old !== houseId)
                    presence(old);
                presence(houseId);
                log(me.identity.id, "board.subscribe", "current");
            }
            catch (error) {
                revoke(view, error);
                boundedAck(view, ack, { ...failure(error), schemaVersion: 1, subscriptionId: view.subscriptionId });
            }
        });
        socket.on("board.pointer", (value: unknown, ack?: unknown) => {
            try {
                if (!view.houseId)
                    boardFail("FORBIDDEN", "Open a current board before sharing a pointer.");
                member(view, view.houseId);
                const now = Date.now();
                if (now - view.budgetAt >= 1000) {
                    view.budgetAt = now;
                    view.events = 0;
                }
                if (++view.events > 20)
                    boardFail("RATE_LIMITED", "Pointer updates are arriving too quickly.");
                const p = boardObject(value);
                boardKeys(p, ["subscriptionId", "x", "y", "selectedElementIds"], ["subscriptionId", "x", "y"]);
                if (p.subscriptionId !== view.subscriptionId)
                    boardFail("STALE_SUBSCRIPTION", "Reopen the current board before sharing a pointer.");
                const { subscriptionId: _, ...payload } = p;
                view.pointer = validateBoardPointer(payload);
                view.pointerAt = now;
                presence(view.houseId);
                if (ack)
                    acknowledge(view, ack, { ok: true, schemaVersion: 1, subscriptionId: view.subscriptionId });
            }
            catch (error) {
                if (failure(error).code === "FORBIDDEN" || failure(error).code === "UNAUTHENTICATED")
                    revoke(view, error);
                boundedAck(view, ack, { ...failure(error), schemaVersion: 1, subscriptionId: view.subscriptionId });
            }
        });
        socket.on("disconnect", () => {
            const houseId = view.houseId;
            views.delete(socket.id);
            if (houseId)
                presence(houseId);
        });
    }
    namespace.on("connection", connected);
    const sweep = setInterval(() => {
        const affected = new Set<string>();
        for (const view of views.values()) {
            if (!view.houseId)
                continue;
            try {
                member(view, view.houseId);
                if (view.pointer && Date.now() - view.pointerAt > 10000) {
                    affected.add(view.houseId);
                    delete view.pointer;
                }
            }
            catch (error) {
                affected.add(view.houseId);
                revoke(view, error);
            }
        }
        for (const houseId of affected)
            presence(houseId);
    }, 200);
    sweep.unref();
    async function handle(request: IncomingMessage, response: ServerResponse): Promise<boolean> {
        let url: URL;
        try {
            url = new URL(request.url ?? "/", "http://board.invalid");
        }
        catch {
            return false;
        }
        if (!url.pathname.startsWith("/api/board/"))
            return false;
        try {
            if (closed)
                boardFail("STORAGE_UNAVAILABLE", "The board is restarting. Keep local work and retry.");
            if (!allowedOrigin(request, options, request.method === "POST"))
                boardFail("FORBIDDEN", "Board requests must come from this house page.");
            if (request.method === "GET" && url.pathname === "/api/board/context") {
                rate({ id: "", digest: "context:" + (request.socket.remoteAddress ?? "local") }, false, 60, "bootstrap:");
                const identity = houseStore.ensureSession(cookieToken(request));
                if (identity.created)
                    response.setHeader("Set-Cookie", `house_session=${identity.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${HOUSE_SESSION_SECONDS}${options.secureCookies ? "; Secure" : ""}`);
                const a = { id: identity.id, digest: identity.digest };
                intended(request, a);
                rate(a, false);
                sameActor(a);
                json(response, 200, houseStore.me(a.id));
                return true;
            }
            const original = actor(request);
            intended(request, original, request.method === "POST");
            rate(original, request.method === "POST");
            if (request.method === "GET" && url.pathname === "/api/board/snapshot") {
                const houseId = boardUuid(url.searchParams.get("houseId"));
                member(original, houseId);
                const snapshot = store.snapshot(houseId);
                member(original, houseId);
                json(response, 200, snapshot);
                return true;
            }
            if (request.method === "GET" && url.pathname === "/api/board/asset") {
                const houseId = boardUuid(url.searchParams.get("houseId")), fileId = url.searchParams.get("fileId");
                if (typeof fileId !== "string")
                    boardFail("INVALID_INPUT", "Choose an image file.");
                sameActor(original);
                const own = store.isOwnAsset(original.id, houseId, fileId);
                if (!own)
                    member(original, houseId);
                const asset = store.getAsset(houseId, fileId);
                sameActor(original);
                if (!own)
                    member(original, houseId);
                if (!asset) {
                    json(response, 404, { ok: false, code: "NOT_FOUND", message: "This board image is unavailable." });
                    return true;
                }
                response.writeHead(200, { "Content-Type": asset.mimeType, "Content-Length": asset.bytes.length, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Cross-Origin-Resource-Policy": "same-origin", "Content-Disposition": "inline" });
                response.end(asset.bytes);
                return true;
            }
            if (request.method !== "POST" || !["/api/board/patch", "/api/board/asset", "/api/board/chat", "/api/board/export"].includes(url.pathname)) {
                json(response, 404, { ok: false, code: "INVALID_INPUT", message: "This board route is unavailable." });
                return true;
            }
            const max = url.pathname === "/api/board/asset" ? 3 * 1024 * 1024 : url.pathname === "/api/board/patch" ? BOARD_LIMITS.patchBytes : 32 * 1024;
            if (activeBodies >= 4)
                boardFail("RATE_LIMITED", "Other board uploads are still arriving. Keep your work and retry shortly.");
            activeBodies++;
            let parsed: unknown;
            request.setTimeout(10000, () => request.destroy(new Error("Board upload timed out")));
            try {
                parsed = await readBody(request, max);
            }
            finally {
                activeBodies--;
                request.setTimeout(0);
            }
            const body = boardObject(parsed);
            sameActor(original);
            intended(request, original, true);
            const houseId = boardUuid(body.houseId);
            if (url.pathname === "/api/board/export") {
                boardKeys(body, ["houseId"]);
                const result = store.ownExport(original.id, houseId);
                sameActor(original);
                json(response, 200, result);
                log(original.id, "board.export", "own");
                return true;
            }
            const me = member(original, houseId);
            const priorSequence = store.currentSequence(houseId);
            let receipt: BoardReceipt;
            if (url.pathname === "/api/board/patch")
                receipt = store.patch(original.id, body);
            else if (url.pathname === "/api/board/asset")
                receipt = store.asset(original.id, body);
            else
                receipt = store.chat(original.id, me.identity.name, body);
            member(original, houseId);
            json(response, 200, receipt);
            if (receipt.sequence > priorSequence && receipt.elements)
                publish(houseId, "board.patch", { houseId, sequence: receipt.sequence, elements: receipt.elements });
            if (receipt.sequence > priorSequence && receipt.message)
                publish(houseId, "board.chat", { houseId, sequence: receipt.sequence, message: receipt.message });
            if (receipt.sequence > priorSequence && receipt.file)
                snapshots(houseId);
            log(original.id, url.pathname.slice(5), "saved");
            return true;
        }
        catch (error) {
            const problem = failure(error), status = problem.code === "UNAUTHENTICATED" ? 401 : ["FORBIDDEN", "IDENTITY_CHANGED"].includes(problem.code) ? 403 : problem.code === "LIMIT_EXCEEDED" ? 413 : problem.code === "RATE_LIMITED" ? 429 : problem.code === "ID_REUSED" ? 409 : problem.code === "STORAGE_UNAVAILABLE" ? 503 : 400;
            if (!response.destroyed && !response.writableEnded)
                json(response, status, problem);
            return true;
        }
    }
    function close(): void {
        if (closed)
            return;
        closed = true;
        clearInterval(sweep);
        namespace.off("connection", connected);
        for (const view of views.values()) {
            revoke(view, new BoardError("STORAGE_UNAVAILABLE", "The board is restarting. Reconnect to its saved state."));
            view.socket.disconnect();
        }
        views.clear();
        buckets.clear();
    }
    return { handle, close };
}
