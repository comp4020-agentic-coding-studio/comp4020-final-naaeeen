import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createReadStream, existsSync, mkdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, extname, join, resolve, sep } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { marked, Renderer } from "marked";
import { DomainError } from "./domain.ts";
import { SESSION_SECONDS, sessionDigest, Store } from "./store.ts";
import type { Identity } from "./store.ts";
import { HouseStore } from "./house-store.ts";
import { HouseError } from "./house-contract.ts";
import { attachHouseRealtime } from "./house-realtime.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const COOKIE = "night_session";
const BODY_LIMIT = 16 * 1024;
const STATUS: Record<string, number> = { INVALID_INPUT: 400, COLLISION: 400, SPACE_FULL: 409, ALREADY_MEMBER: 409, CONTROL_MOVED: 409, SEAT_TAKEN: 409, NOT_CONTROLLER: 409, STALE_GENERATION: 409, STALE_ZONE: 409, UNAUTHENTICATED: 403, IDENTITY_CHANGED: 403, NO_HOUSE: 403, FORBIDDEN: 403, REVISION_CONFLICT: 409, COMMAND_ID_REUSED: 409, RATE_LIMITED: 429, STORAGE_UNAVAILABLE: 503 };
const MIME: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".glb": "model/gltf-binary", ".gltf": "model/gltf+json", ".bin": "application/octet-stream" };
export interface ServiceOptions { dataDir: string; publicDir?: string; readmePath?: string; secureCookies?: boolean; origin?: string }
interface Connection { response: ServerResponse; digest: string }

function cookieToken(request: IncomingMessage, name = COOKIE): string | undefined {
  const values = (request.headers.cookie ?? "").split(";").map((entry) => entry.trim()).filter((entry) => entry.startsWith(name + "="));
  if (values.length !== 1) return undefined;
  const token = values[0]!.slice(name.length + 1);
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : undefined;
}
function escapeHtml(value: string): string { return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!); }
function headers(response: ServerResponse): void {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "same-origin");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Cache-Control", "no-store");
}
function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" }); response.end(JSON.stringify(body));
}
async function readJson(request: IncomingMessage): Promise<unknown> {
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers["content-type"] ?? "") || request.headers["content-encoding"]) throw new DomainError("INVALID_INPUT", "Send an uncompressed JSON command.");
  const declared = request.headers["content-length"];
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > BODY_LIMIT)) throw new DomainError("INVALID_INPUT", "Commands must be at most 16 KiB.");
  const chunks: Buffer[] = []; let size = 0;
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.length;
    if (size > BODY_LIMIT) throw new DomainError("INVALID_INPUT", "Commands must be at most 16 KiB.");
    chunks.push(bytes);
  }
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks))); }
  catch { throw new DomainError("INVALID_INPUT", "The command must be valid UTF-8 JSON."); }
}
function confinedFile(base: string, relative: string): string | undefined {
  if (!relative || !relative.split("/").every((segment) => /^[A-Za-z0-9_.-]+$/.test(segment) && segment !== "." && segment !== "..")) return undefined;
  try {
    const canonicalBase = realpathSync(base); const file = realpathSync(join(base, relative));
    if (!file.startsWith(canonicalBase + sep) || !statSync(file).isFile()) return undefined;
    return file;
  } catch { return undefined; }
}

export function createService(options: ServiceOptions) {
  const dataDir = resolve(options.dataDir);
  if (!existsSync(dataDir) || !statSync(dataDir).isDirectory()) throw new Error("The configured data directory must already exist.");
  const publicDir = resolve(options.publicDir ?? join(ROOT, "public"));
  const readmePath = resolve(options.readmePath ?? join(ROOT, "README.md"));
  const secureCookies = options.secureCookies ?? process.env.NODE_ENV === "production";
  const store = new Store(join(dataDir, "neighbourhood.sqlite"));
  let houseStore: HouseStore;
  try { houseStore = new HouseStore(join(dataDir, "house.sqlite")); }
  catch (error) { store.close(); throw error; }
  function setHouseCookie(response: ServerResponse, token: string): void { response.setHeader("Set-Cookie", `house_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_SECONDS}${secureCookies ? "; Secure" : ""}`); }
  function houseAuth(request: IncomingMessage): {id: string; digest: string} {
    const token = cookieToken(request, "house_session"); const digest = token ? sessionDigest(token) : "";
    const actor = digest ? houseStore.session(digest) : undefined;
    if (!actor) throw new HouseError("FORBIDDEN", "Your house session expired. Reopen the house or use your recovery key.");
    return {id: actor.id, digest};
  }
  function intendedHouseIdentity(request: IncomingMessage, actorId: string): void {
    const expected = request.headers["x-house-identity"];
    // A precondition for delayed UI intent, never an authentication credential.
    // Older API callers omit it; the cookie-resolved identity remains authoritative.
    if (expected !== undefined && (typeof expected !== "string" || expected !== actorId)) {
      throw new HouseError("IDENTITY_CHANGED", "Your identity changed. Return to the original identity to review this pending action.");
    }
  }
  function actionLog(actor: string, action: string, outcome: string): void { console.log(JSON.stringify({at: new Date().toISOString(), actor, action, outcome})); }
  const connections = new Set<Connection>();
  const rateBuckets = new Map<string, { start: number; count: number }>();
  let stopping = false;
  function establish(request: IncomingMessage, response: ServerResponse): Identity {
    const identity = store.ensureSession(cookieToken(request));
    if (identity.created) response.setHeader("Set-Cookie", `${COOKIE}=${identity.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_SECONDS}${secureCookies ? "; Secure" : ""}`);
    return identity;
  }
  function authenticated(request: IncomingMessage): { visitorId: string; digest: string } {
    const token = cookieToken(request); const digest = token ? sessionDigest(token) : "";
    const identity = digest ? store.session(digest) : undefined;
    if (!identity) throw new DomainError("FORBIDDEN", "Open your window to establish a current visitor session.");
    return { ...identity, digest };
  }
  function sameOrigin(request: IncomingMessage): void {
    const host = request.headers.host;
    const expected = options.origin ?? `${secureCookies ? "https" : "http"}://${host ?? ""}`;
    if (!host || request.headers.origin !== expected || (request.headers["sec-fetch-site"] && !["same-origin", "none"].includes(String(request.headers["sec-fetch-site"])))) throw new DomainError("FORBIDDEN", "Commands must come from this neighbourhood page.");
  }
  function rateLimit(digest: string): void {
    const now = Date.now();
    for (const [key, bucket] of rateBuckets) if (now - bucket.start >= 60_000) rateBuckets.delete(key);
    const bucket = rateBuckets.get(digest) ?? { start: now, count: 0 };
    if (bucket.count >= 90 || (!rateBuckets.has(digest) && rateBuckets.size >= 2000)) throw new DomainError("RATE_LIMITED", "Please pause briefly before another edit.");
    bucket.count++; rateBuckets.set(digest, bucket);
  }
  function deliver(connection: Connection): void {
    try {
      const identity = store.session(connection.digest);
      if (!identity || connection.response.destroyed || connection.response.writableLength > 256 * 1024) { connection.response.end(); connections.delete(connection); return; }
      connection.response.write(`event: state\ndata: ${JSON.stringify(store.state(identity.visitorId))}\n\n`);
    } catch { connection.response.end(); connections.delete(connection); }
  }
  function broadcast(): void { for (const connection of connections) deliver(connection); }
  function staticFile(pathname: string): string | undefined {
    const pageFiles: Record<string, string> = { "/": existsSync(join(publicDir, "house.html")) ? "house.html" : "index.html", "/legacy/": "index.html", "/house.html": "house.html", "/house-ui.js": "house-ui.js", "/house-world.js": "house-world.js", "/house-label-layout.js": "house-label-layout.js", "/house-camera.js": "house-camera.js", "/house-geometry.js": "house-geometry.js", "/house-client.js": "house-client.js", "/house.css": "house.css", "/index.html": "index.html", "/app.js": "app.js", "/style.css": "style.css", "/readme.css": "readme.css", "/render-three.js": "render-three.js", "/render-iso.js": "render-iso.js", "/favicon.svg": "favicon.svg" };
    if (pageFiles[pathname]) return confinedFile(publicDir, pageFiles[pathname]);
    if (pathname.startsWith("/assets/") && /\.(?:glb|gltf|png|jpe?g|webp|svg|bin)$/.test(pathname)) return confinedFile(join(publicDir, "assets"), pathname.slice(8));
    if (["/vendor/build/three.module.js", "/vendor/build/three.core.js"].includes(pathname)) return confinedFile(join(ROOT, "node_modules/three/build"), pathname.slice("/vendor/build/".length));
    if (pathname.startsWith("/vendor/examples/jsm/") && pathname.endsWith(".js")) return confinedFile(join(ROOT, "node_modules/three/examples/jsm"), pathname.slice("/vendor/examples/jsm/".length));
    return undefined;
  }
  async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    headers(response);
    try {
      if (stopping) throw new DomainError("STORAGE_UNAVAILABLE", "The neighbourhood is restarting. Please retry.");
      let pathname: string;
      try { pathname = decodeURIComponent(new URL(request.url ?? "/", "http://local.invalid").pathname); }
      catch { throw new DomainError("INVALID_INPUT", "The requested path is invalid."); }
      if (pathname.includes("\\") || pathname.includes("\0")) throw new DomainError("INVALID_INPUT", "The requested path is invalid.");
      if (pathname === "/health" || pathname === "/healthz") {
        if (request.method !== "GET" && request.method !== "HEAD") { json(response, 405, { ok: false, code: "INVALID_INPUT", message: "Use GET." }); return; }
        const ready = store.ready() && houseStore.ready();
        json(response, ready ? 200 : 503, { ok: ready }); return;
      }
      if (pathname.startsWith("/api/house/")) {
        if (request.method === "GET" && pathname === "/api/house/me") {
          rateLimit("bootstrap:" + (request.socket.remoteAddress ?? "local"));
          const actor = houseStore.ensureSession(cookieToken(request, "house_session"));
          if (actor.created) setHouseCookie(response, actor.token);
          json(response, 200, houseStore.me(actor.id)); return;
        }
        if (request.method === "POST" && pathname === "/api/house/recover") {
          sameOrigin(request); rateLimit("recover:" + (request.socket.remoteAddress ?? "local"));
          const body = await readJson(request) as {proof?: unknown};
          if (!body || typeof body.proof !== "string") throw new HouseError("INVALID_INPUT", "Enter your recovery key.");
          const actor = houseStore.recover(body.proof); realtime.revokeIdentity(actor.id);
          setHouseCookie(response, actor.token); actionLog(actor.id, "identity.recover", "saved");
          json(response, 200, houseStore.me(actor.id)); return;
        }
        const actor = houseAuth(request);
        if (request.method === "GET" && pathname === "/api/house/removed-members") {
          const after = new URL(request.url ?? "/", "http://local.invalid").searchParams.get("after") ?? "";
          json(response, 200, houseStore.removedResidents(actor.id, after)); return;
        }
        if (request.method === "GET" && pathname === "/api/house/snapshot") {
          const zoneId = new URL(request.url ?? "/", "http://local.invalid").searchParams.get("zone") ?? "lounge";
          json(response, 200, houseStore.snapshot(actor.id, zoneId)); return;
        }
        if (request.method === "POST") {
          sameOrigin(request); intendedHouseIdentity(request, actor.id); rateLimit("house:" + actor.digest);
          const body = await readJson(request);
          const current = houseAuth(request); // body arrival may outlive a revoked session
          intendedHouseIdentity(request, current.id);
          if (pathname === "/api/house/recovery-key") {
            const proof = houseStore.issueRecovery(current.id); actionLog(current.id, "identity.recovery-key", "issued");
            json(response, 200, {proof}); return;
          }
          if (pathname === "/api/house/export") {
            actionLog(current.id, "identity.export", "read"); json(response, 200, houseStore.exportOwn(current.id)); return;
          }
          if (pathname === "/api/house/command") {
            const generation = request.headers["x-house-generation"];
            const receipt = realtime.executeHttp(current.id, body, typeof generation === "string" ? Number(generation) : undefined, typeof request.headers["x-house-zone"] === "string" ? request.headers["x-house-zone"] : undefined, typeof request.headers["x-house-controller-token"] === "string" ? request.headers["x-house-controller-token"] : undefined);
            json(response, 200, receipt); realtime.refresh(); return;
          }
        }
        json(response, 404, {ok: false, code: "INVALID_INPUT", message: "This house route is unavailable."}); return;
      }
      if (request.method === "GET" && pathname === "/api/state") {
        const identity = establish(request, response); json(response, 200, store.state(identity.visitorId)); return;
      }
      if (request.method === "GET" && pathname === "/api/events") {
        const identity = authenticated(request);
        if (connections.size >= 200 || [...connections].filter((connection) => connection.digest === identity.digest).length >= 3) throw new DomainError("RATE_LIMITED", "Too many live windows are open. Close another tab before reconnecting.");
        response.writeHead(200, { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
        response.flushHeaders();
        const connection = { response, digest: identity.digest }; connections.add(connection);
        response.on("close", () => connections.delete(connection)); deliver(connection); return;
      }
      if (request.method === "POST" && pathname === "/api/command") {
        sameOrigin(request); const identity = authenticated(request); rateLimit(identity.digest);
        const command = await readJson(request); const before = store.sequence();
        // Recheck after receiving the body; an expired session cannot submit a queued edit.
        const current = store.session(identity.digest); if (!current) throw new DomainError("FORBIDDEN", "Your visitor session expired. Reopen your window.");
        const receipt = store.execute(current.visitorId, command);
        json(response, 200, receipt);
        if (store.sequence() > before) broadcast();
        return;
      }
      if (pathname.startsWith("/api/")) { json(response, 404, { ok: false, code: "INVALID_INPUT", message: "This API route is unavailable." }); return; }
      if (request.method !== "GET" && request.method !== "HEAD") { json(response, 405, { ok: false, code: "INVALID_INPUT", message: "Use GET or HEAD for this page." }); return; }
      if (pathname === "/readme/" || pathname === "/readme") {
        const markdown = readFileSync(readmePath, "utf8");
        const renderer = new Renderer(); renderer.html = ({ text }) => escapeHtml(text);
        const renderLink = renderer.link;
        renderer.link = function(token) {
          const href = token.href;
          const absolute = href.startsWith("#") || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href);
          return renderLink.call(this, { ...token, href: absolute ? href : new URL(href, "https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/blob/main/").href });
        };
        const body = marked.parse(markdown, { async: false, renderer });
        const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Night Neighbourhood README</title><link rel="stylesheet" href="/readme.css"></head><body><header><a href="/">Night Neighbourhood</a><p>Project README</p></header><main>${body}</main></body></html>`;
        response.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'self'; frame-ancestors 'none'; base-uri 'none'");
        response.writeHead(200, { "Content-Type": MIME[".html"] }); response.end(request.method === "HEAD" ? undefined : page); return;
      }
      const file = staticFile(pathname);
      if (!file) { response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); response.end("Page not found."); return; }
      if (extname(file) === ".html") {
        const source = readFileSync(file, "utf8");
        const hashes = [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].filter((match) => match[1]!.trim()).map((match) => `'sha256-${createHash("sha256").update(match[1]!).digest("base64")}'`);
        response.setHeader("Content-Security-Policy", `default-src 'self'; script-src 'self' ${hashes.join(" ")}; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'`);
      }
      response.writeHead(200, { "Content-Type": MIME[extname(file)] ?? "application/octet-stream", "Content-Length": statSync(file).size, "Cache-Control": pathname.startsWith("/assets/") || pathname.startsWith("/vendor/") ? "public, max-age=3600" : "no-cache" });
      if (request.method === "HEAD") { response.end(); return; }
      const stream = createReadStream(file); stream.on("error", () => response.destroy()); stream.pipe(response);
    } catch (error) {
      if (response.headersSent || response.destroyed) { response.end(); return; }
      const failure = error instanceof DomainError || error instanceof HouseError ? error : new DomainError("STORAGE_UNAVAILABLE", "The neighbourhood is temporarily unavailable. Please retry.");
      json(response, STATUS[failure.code] ?? 503, { ok: false, code: failure.code, message: failure.message });
    }
  }
  const server = createServer((request, response) => { void handle(request, response); });
  const realtime = attachHouseRealtime(server, houseStore, {origin: options.origin, secureCookies, log: (record) => console.log(JSON.stringify(record))});
  server.requestTimeout = 15_000; server.headersTimeout = 10_000;
  const heartbeat = setInterval(() => {
    for (const connection of connections) {
      try { if (!store.session(connection.digest)) { connection.response.end(); connections.delete(connection); } else connection.response.write(": heartbeat\n\n"); }
      catch { connection.response.end(); connections.delete(connection); }
    }
  }, 15_000); heartbeat.unref();
  async function close(): Promise<void> {
    if (stopping) return;
    stopping = true; clearInterval(heartbeat);
    // End legacy streams before Socket.IO closes the shared HTTP listener.
    for (const connection of connections) connection.response.end(); connections.clear();
    const realtimeClosing = realtime.close();
    // A reader can pause a large asset response; bound shutdown without dropping committed state.
    const forceClose = setTimeout(() => server.closeAllConnections(), 1000); forceClose.unref();
    server.closeIdleConnections();
    try { await realtimeClosing; } finally { clearTimeout(forceClose); }
    await new Promise<void>((done, reject) => { if (!server.listening) { done(); return; } server.close((error) => error ? reject(error) : done()); server.closeIdleConnections(); });
    store.close(); houseStore.close();
  }
  return { server, store, houseStore, close };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const production = process.env.NODE_ENV === "production";
  const configured = process.env.DATA_DIR;
  if (production && configured !== "/data") throw new Error("Production DATA_DIR must be the mounted /data directory.");
  const dataDir = configured ?? join(ROOT, ".local/data");
  if (!production) mkdirSync(dataDir, { recursive: true });
  if (production && (!existsSync(dataDir) || !statSync(dataDir).isDirectory() || statSync(dataDir).dev === statSync("/").dev)) throw new Error("Production /data must be a mounted filesystem, separate from the root image.");
  const port = Number(process.env.PORT ?? 8080);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be an integer from 1 to 65535.");
  const service = createService({ dataDir, secureCookies: production, origin: process.env.PUBLIC_ORIGIN });
  service.server.listen(port, "0.0.0.0", () => console.log(`Night Neighbourhood listening on ${port}`));
  for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => { void service.close().then(() => process.exit(0), () => process.exit(1)); });
}
