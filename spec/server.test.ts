import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { request as httpRequest } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { createService } from "../src/server.ts";
import type { State } from "../src/store.ts";

const fixtures: Array<{ app: ReturnType<typeof createService>; directory: string; controllers: AbortController[] }> = [];
async function fixture(secureCookies = false) {
  const directory = mkdtempSync(join(tmpdir(), "night-http-spec-"));
  const publicDir = join(directory, "public"); mkdirSync(publicDir); mkdirSync(join(publicDir, "assets"));
  writeFileSync(join(publicDir, "index.html"), '<!doctype html><html><head><script type="importmap">{"imports":{"three":"/vendor/build/three.module.js"}}</script></head><body><h1>Night Neighbourhood</h1></body></html>');
  writeFileSync(join(publicDir, "app.js"), "export const fixture = true;");
  writeFileSync(join(publicDir, "style.css"), "body { color: #333; }");
  writeFileSync(join(publicDir, "render-three.js"), "export const renderer = true;");
  writeFileSync(join(publicDir, "readme.css"), "main { max-width: 70ch; }");
  writeFileSync(join(directory, "README.md"), "# Full README\n\nThe complete argument.\n\n## Capabilities\n\nA saved trace returns.\n\n## Limits\n\n<script>alert('untrusted')</script>\n");
  const app = createService({ dataDir: directory, publicDir, readmePath: join(directory, "README.md"), secureCookies });
  const controllers: AbortController[] = []; fixtures.push({ app, directory, controllers });
  await new Promise<void>((done) => app.server.listen(0, "127.0.0.1", done));
  const base = `http://127.0.0.1:${(app.server.address() as { port: number }).port}`;
  async function visitor() {
    const response = await fetch(base + "/api/state");
    const setCookie = response.headers.get("set-cookie")!;
    return { state: await response.json() as State, cookie: setCookie.split(";")[0]!, setCookie };
  }
  async function command(cookie: string, body: unknown, origin: string | undefined = base) {
    const headers: Record<string, string> = { Cookie: cookie, "Content-Type": "application/json" };
    if (origin) headers.Origin = origin;
    return fetch(base + "/api/command", { method: "POST", headers, body: JSON.stringify(body) });
  }
  async function events(cookie: string) {
    const controller = new AbortController(); controllers.push(controller);
    const response = await fetch(base + "/api/events", { headers: { Cookie: cookie }, signal: controller.signal });
    return { response, reader: response.body!.getReader(), controller };
  }
  return { app, directory, publicDir, base, visitor, command, events };
}
afterEach(async () => {
  for (const { app, directory, controllers } of fixtures.splice(0)) {
    for (const controller of controllers) controller.abort();
    await app.close(); rmSync(directory, { recursive: true, force: true });
  }
});
function profile(visitorId: string, name = "A lamp by the lane") {
  return { commandId: randomUUID(), type: "window.configure", targetId: visitorId, expectedRevision: 0, payload: { name, windowColour: "mint" } };
}
function parseEvent(bytes: Uint8Array | undefined): State {
  const line = new TextDecoder().decode(bytes).split("\n").find((entry) => entry.startsWith("data: "));
  expect(line).toBeDefined(); return JSON.parse(line!.slice(6)) as State;
}

describe("actual HTTP and SSE boundary", () => {
  it("issues a secure opaque cookie, stores only its digest, and publishes nothing on initial viewing", async () => {
    const service = await fixture(true); const owner = await service.visitor();
    expect(owner.setCookie).toContain("HttpOnly"); expect(owner.setCookie).toContain("SameSite=Lax"); expect(owner.setCookie).toContain("Secure"); expect(owner.setCookie).toContain("Max-Age=2592000");
    expect(owner.state.visitor.published).toBe(false); expect(owner.state.neighbours).toEqual([]); expect(owner.state.lantern.parts).toEqual([]);
    const digest = service.app.store.db.prepare("SELECT token_digest FROM sessions").get() as { token_digest: string };
    expect(digest.token_digest).toMatch(/^[a-f0-9]{64}$/); expect(digest.token_digest).not.toBe(owner.cookie.split("=")[1]);
    expect((await fetch(service.base + "/health")).status).toBe(200);
  });
  it("commits a saved window, returns the original receipt on retry, and rejects changed/stale/forged commands", async () => {
    const service = await fixture(); const owner = await service.visitor(); const draft = profile(owner.state.visitor.id);
    const saved = await service.command(owner.cookie, draft); const receipt = await saved.json(); expect(saved.status).toBe(200);
    expect(await (await service.command(owner.cookie, draft)).json()).toEqual(receipt);
    expect((await service.command(owner.cookie, { ...draft, payload: { ...draft.payload, name: "Another lamp" } })).status).toBe(409);
    expect((await service.command(owner.cookie, { ...draft, commandId: randomUUID() })).status).toBe(409);
    expect((await service.command(owner.cookie, { ...profile(owner.state.visitor.id), actor: owner.state.visitor.id })).status).toBe(400);
    const returned = await (await fetch(service.base + "/api/state", { headers: { Cookie: owner.cookie } })).json() as State;
    expect(returned.sequence).toBe(1); expect(returned.visitor.name).toBe("A lamp by the lane");
  });
  it("rejects cross-origin and missing-origin mutations, other owners, invalid JSON and oversized bodies", async () => {
    const service = await fixture(); const owner = await service.visitor(); const stranger = await service.visitor(); const draft = profile(owner.state.visitor.id);
    expect((await service.command(owner.cookie, draft, "https://example.invalid")).status).toBe(403);
    const noOrigin = await fetch(service.base + "/api/command", { method: "POST", headers: { Cookie: stranger.cookie, "Content-Type": "application/json" }, body: JSON.stringify(profile(stranger.state.visitor.id)) });
    expect(noOrigin.status).toBe(403);
    expect((await service.command(stranger.cookie, draft)).status).toBe(403);
    const invalidJson = await fetch(service.base + "/api/command", { method: "POST", headers: { Cookie: stranger.cookie, Origin: service.base, "Content-Type": "application/json" }, body: "{" }); expect(invalidJson.status).toBe(400);
    expect((await service.command(stranger.cookie, { ...profile(stranger.state.visitor.id), payload: { name: "x".repeat(18000), windowColour: "mint" } })).status).toBe(400);
    expect(service.app.store.state(stranger.state.visitor.id).visitor.published).toBe(false);
  });
  it("returns a bounded JSON error for an oversized chunked request without Content-Length", async () => {
    const service = await fixture(); const owner = await service.visitor();
    const response = await new Promise<{ status: number; body: string }>((done, reject) => {
      const request = httpRequest(service.base + "/api/command", { method: "POST", headers: { Cookie: owner.cookie, Origin: service.base, "Content-Type": "application/json" } }, (response) => {
        let body = ""; response.setEncoding("utf8"); response.on("data", (chunk) => { body += chunk; }); response.on("end", () => done({ status: response.statusCode!, body }));
      }); request.on("error", reject);
      request.write("{\"padding\":\""); request.write("x".repeat(17000)); request.end("\"}");
    });
    expect(response.status).toBe(400); expect(JSON.parse(response.body)).toMatchObject({ ok: false, code: "INVALID_INPUT" }); expect(service.app.store.sequence()).toBe(0);
  });
  it("sends full committed projections through SSE while keeping each editable room owned", async () => {
    const service = await fixture(); const owner = await service.visitor(); const observer = await service.visitor();
    const ownEvents = await service.events(owner.cookie); const otherEvents = await service.events(observer.cookie);
    expect(parseEvent((await ownEvents.reader.read()).value).room.id).toBe(owner.state.room.id);
    expect(parseEvent((await otherEvents.reader.read()).value).room.id).toBe(observer.state.room.id);
    const saved = await service.command(owner.cookie, profile(owner.state.visitor.id)); expect(saved.status).toBe(200);
    const ownUpdate = parseEvent((await ownEvents.reader.read()).value); const otherUpdate = parseEvent((await otherEvents.reader.read()).value);
    expect(ownUpdate.sequence).toBe(1); expect(otherUpdate.sequence).toBe(1); expect(otherUpdate.room.id).toBe(observer.state.room.id); expect(otherUpdate.neighbours[0]?.id).toBe(owner.state.visitor.id);
    expect(otherUpdate.room.furniture.some((item) => item.owner === owner.state.visitor.id)).toBe(false);
    service.app.store.db.prepare("UPDATE sessions SET expires_at=0 WHERE visitor_id=?").run(owner.state.visitor.id);
    await service.command(observer.cookie, profile(observer.state.visitor.id, "An observer's light"));
    expect((await ownEvents.reader.read()).done).toBe(true);
  });
  it("bounds concurrent SSE streams for one session and frees slots on close", async () => {
    const service = await fixture(); const owner = await service.visitor();
    const active = await Promise.all(Array.from({ length: 3 }, () => service.events(owner.cookie)));
    for (const event of active) { expect(event.response.status).toBe(200); await event.reader.read(); }
    const excessive = await fetch(service.base + "/api/events", { headers: { Cookie: owner.cookie } }); expect(excessive.status).toBe(429);
    active[0]!.controller.abort(); await new Promise((done) => setTimeout(done, 30));
    const replacement = await service.events(owner.cookie); expect(replacement.response.status).toBe(200); await replacement.reader.read();
  });
  it("publishes full README HTML and permits only confined public assets and installed Three modules", async () => {
    const service = await fixture();
    const readme = await fetch(service.base + "/readme/"); const html = await readme.text(); expect(readme.status).toBe(200); expect(html).toContain('href="/readme.css"'); expect(html).toContain('<a href="/"'); expect(html).toContain("The complete argument."); expect(html.indexOf("Full README")).toBeLessThan(html.indexOf("Capabilities")); expect(html.indexOf("Capabilities")).toBeLessThan(html.indexOf("Limits")); expect(html).toContain("&lt;script&gt;"); expect(html).not.toContain("<script>alert");
    const index = await fetch(service.base + "/"); expect(index.status).toBe(200); expect(index.headers.get("content-security-policy")).toContain("sha256-");
    for (const path of ["/", "/app.js", "/style.css", "/render-three.js", "/readme.css"]) {
      const response = await fetch(service.base + path); expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-cache");
    }
    expect((await fetch(service.base + "/vendor/build/three.module.js")).headers.get("cache-control")).toBe("public, max-age=3600");
    expect((await fetch(service.base + "/vendor/build/three.module.js")).status).toBe(200); expect((await fetch(service.base + "/vendor/examples/jsm/loaders/GLTFLoader.js")).status).toBe(200);
    for (const path of ["/src/store.ts", "/README.md", "/data/neighbourhood.sqlite", "/assets/%2e%2e/README.md", "/vendor/build/three.cjs"]) expect((await fetch(service.base + path)).status).toBe(404);
    writeFileSync(join(service.directory, "private.glb"), "private fixture"); symlinkSync(join(service.directory, "private.glb"), join(service.publicDir, "assets/leak.glb"));
    expect((await fetch(service.base + "/assets/leak.glb")).status).toBe(404);
  });
  it("reports storage unavailability after a failed commit and permits the same command to retry", async () => {
    const service = await fixture(); const owner = await service.visitor(); const draft = profile(owner.state.visitor.id);
    service.app.store.db.exec("CREATE TRIGGER fail_http_receipt BEFORE INSERT ON receipts BEGIN SELECT RAISE(ABORT, 'fixture error'); END;");
    const failed = await service.command(owner.cookie, draft); expect(failed.status).toBe(503); expect(await failed.json()).toMatchObject({ ok: false, code: "STORAGE_UNAVAILABLE" }); expect(service.app.store.sequence()).toBe(0);
    service.app.store.db.exec("DROP TRIGGER fail_http_receipt"); expect((await service.command(owner.cookie, draft)).status).toBe(200);
  });
});
