import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { mkdtemp, readFile, readdir, rm, stat, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { backupMountedData, runBackupGate } from "../tools/backup-mounted-data.mjs";

const commit = "a".repeat(40);
let root: string;
let writer: DatabaseSync | undefined;
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), "backup-gate-test-")); });
afterEach(async () => { writer?.close(); writer = undefined; await rm(root, { recursive: true, force: true }); });

function seed(name = "neighbourhood.sqlite") {
  const db = new DatabaseSync(join(root, name));
  db.exec("PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0; CREATE TABLE messages(text TEXT); INSERT INTO messages VALUES ('before WAL');");
  return db;
}
function result(directory = "release-backup-1791326400000-12345678-1234-4123-8123-123456789abc") {
  return { sentinel: "MOUNTED_SQLITE_BACKUP_V1", commit, directory, node: "v24.21.0", databases: [{ name: "neighbourhood.sqlite", pages: 2 }] };
}
function machine(state = "started") {
  return { id: "123456789abcde", state, config: { guest: { cpu_kind: "shared", cpus: 1, memory_mb: 256 }, mounts: [{ path: "/data", volume: "vol_test123" }] } };
}
type Reply = { status?: number; body?: unknown; error?: string };
function fakeFetch(replies: Reply[], calls: { url: string; options: RequestInit }[] = []) {
  return (async (url: string | URL | Request, options: RequestInit = {}) => {
    calls.push({ url: String(url), options });
    const reply = replies.shift();
    if (!reply) throw new Error("unexpected request");
    if (reply.error) throw new Error(reply.error);
    return new Response(JSON.stringify(reply.body), { status: reply.status ?? 200 });
  }) as typeof fetch;
}
const execReply = () => ({ body: { stdout: JSON.stringify(result()), stderr: "" } });

describe("mounted SQLite online backup", () => {
  test("preserves committed WAL writes that a main-file-only copy misses", async () => {
    writer = seed();
    writer.exec("PRAGMA wal_checkpoint(TRUNCATE); INSERT INTO messages VALUES ('new committed WAL');");
    const mainCopy = join(root, "main-only.sqlite");
    await writeFile(mainCopy, await readFile(join(root, "neighbourhood.sqlite")));
    const main = new DatabaseSync(mainCopy, { readOnly: true });
    expect(main.prepare("SELECT text FROM messages").all()).toEqual([{ text: "before WAL" }]);
    main.close();
    const saved = await backupMountedData(root, commit);
    const restored = new DatabaseSync(join(root, saved.directory, "neighbourhood.sqlite"), { readOnly: true });
    expect(restored.prepare("SELECT text FROM messages").all()).toEqual([{ text: "before WAL" }, { text: "new committed WAL" }]);
    expect(restored.prepare("PRAGMA integrity_check").all()).toEqual([{ integrity_check: "ok" }]);
    restored.close();
  });
  test("creates private unique copies without overwriting an earlier backup", async () => {
    writer = seed();
    const first = await backupMountedData(root, commit);
    const bytes = await readFile(join(root, first.directory, "neighbourhood.sqlite"));
    writer.exec("INSERT INTO messages VALUES ('later')");
    const second = await backupMountedData(root, commit);
    expect(first.directory).not.toBe(second.directory);
    expect(await readFile(join(root, first.directory, "neighbourhood.sqlite"))).toEqual(bytes);
    expect((await stat(join(root, first.directory))).mode & 0o777).toBe(0o700);
    expect((await stat(join(root, first.directory, "neighbourhood.sqlite"))).mode & 0o777).toBe(0o600);
  });
  test("copies each existing fixed database and leaves absent additive databases absent", async () => {
    writer = seed();
    const saved = await backupMountedData(root, commit);
    expect(saved.databases.map(({ name }: { name: string }) => name)).toEqual(["neighbourhood.sqlite"]);
    expect(await readdir(root)).not.toContain("house.sqlite");
    expect(await readdir(root)).not.toContain("board.sqlite");
    const house = seed("house.sqlite"); house.close();
    const board = seed("board.sqlite"); board.close();
    expect((await backupMountedData(root, commit)).databases.map(({ name }: { name: string }) => name)).toEqual(["neighbourhood.sqlite", "house.sqlite", "board.sqlite"]);
  });
  test("rejects a missing legacy database without creating it", async () => {
    await expect(backupMountedData(root, commit)).rejects.toThrow("Mounted SQLite backup failed");
    expect(await readdir(root)).toEqual([]);
  });
  test("rejects a symlink data root and source or WAL paths", async () => {
    writer = seed();
    const rootLink = join(root, "root-link"); await symlink(root, rootLink);
    await expect(backupMountedData(rootLink, commit)).rejects.toThrow("Mounted SQLite backup failed");
    await symlink(join(root, "neighbourhood.sqlite"), join(root, "house.sqlite"));
    await expect(backupMountedData(root, commit)).rejects.toThrow("Mounted SQLite backup failed");
  });
  test("rejects a symlink WAL sidecar before opening SQLite", async () => {
    writer = seed(); writer.close(); writer = undefined;
    await symlink(join(root, "neighbourhood.sqlite"), join(root, "neighbourhood.sqlite-wal"));
    await expect(backupMountedData(root, commit)).rejects.toThrow("Mounted SQLite backup failed");
  });
  test("rejects a corrupt database and never emits a success report", async () => {
    await writeFile(join(root, "neighbourhood.sqlite"), "private corrupt database bytes");
    await expect(backupMountedData(root, commit)).rejects.toThrow("Mounted SQLite backup failed");
  });
  test("rejects foreign-key-invalid backups", async () => {
    writer = seed();
    writer.exec("PRAGMA foreign_keys=OFF; CREATE TABLE parent(id INTEGER PRIMARY KEY); CREATE TABLE child(parent_id INTEGER REFERENCES parent(id)); INSERT INTO child VALUES (99);");
    await expect(backupMountedData(root, commit)).rejects.toThrow("Mounted SQLite backup failed");
  });
  test("rejects many foreign-key violations within a constrained native heap", async () => {
    writer = seed();
    writer.exec("PRAGMA foreign_keys=OFF; CREATE TABLE parent(id INTEGER PRIMARY KEY); CREATE TABLE child(parent_id INTEGER REFERENCES parent(id)); WITH RECURSIVE rows(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM rows WHERE x<1000000) INSERT INTO child SELECT x FROM rows;");
    writer.close(); writer = undefined;
    const program = 'import {backupMountedData} from "./tools/backup-mounted-data.mjs";try{await backupMountedData(' + JSON.stringify(root) + ',' + JSON.stringify(commit) + ');process.exitCode=2}catch(error){if(error.message==="Mounted SQLite backup failed")process.stdout.write("REJECTED");else process.exitCode=3}';
    const run = spawnSync(process.execPath, ["--no-warnings", "--max-old-space-size=48", "--input-type=module", "-e", program], { encoding: "utf8", timeout: 10000 });
    expect(run.status).toBe(0);
    expect(run.signal).toBeNull();
    expect(run.stdout).toBe("REJECTED");
    expect(run.stderr).toBe("");
  }, 15000);
});

describe("fixed Fly API release gate", () => {
  test("uses command-array execution and returns only the verified harmless report", async () => {
    const calls: { url: string; options: RequestInit }[] = [];
    const actual = await runBackupGate({ token: "secret-not-for-output", commit, fetchImpl: fakeFetch([{ body: [machine()] }, execReply()], calls) });
    expect(actual).toEqual(result());
    expect(calls.map(({ url }) => url)).toEqual(["https://api.machines.dev/v1/apps/comp4020-final-naaeeen/machines", "https://api.machines.dev/v1/apps/comp4020-final-naaeeen/machines/123456789abcde/exec"]);
    const body = JSON.parse(String(calls[1]!.options.body));
    expect(Array.isArray(body.command)).toBe(true);
    expect(body.command.slice(0, 4)).toEqual(["node", "--no-warnings", "--input-type=module", "-e"]);
    expect(body.command[4]).toContain('("/data",');
    expect(body.command[4]).not.toContain("secret-not-for-output");
    expect(body.timeout).toBe(90);
    expect(calls.every(({ options }) => options.redirect === "error" && options.signal instanceof AbortSignal)).toBe(true);
  });
  test("executes the serialized constant remote program with real SQLite in a disposable root", async () => {
    writer = seed(); writer.exec("INSERT INTO messages VALUES ('private WAL data')");
    // Capture the production ESM function in native Node: Vite rewrites dynamic imports.
    const program = [
      'import { runBackupGate } from "./tools/backup-mounted-data.mjs";',
      'import { spawnSync } from "node:child_process";',
      'const replies=' + JSON.stringify([[machine()], execReply().body]) + '; const calls=[];',
      'await runBackupGate({token:"test",commit:' + JSON.stringify(commit) + ',fetchImpl:async(u,o)=>{calls.push(o);return new Response(JSON.stringify(replies.shift()))}});',
      'const command=JSON.parse(calls[1].body).command;',
      'command[4]=command[4].replace(' + JSON.stringify(')("/data",') + ',' + JSON.stringify(')(' + JSON.stringify(root) + ',') + ');',
      'const child=spawnSync(process.execPath,command.slice(1),{encoding:"utf8",timeout:10000});',
      'process.stdout.write(child.stdout);process.stderr.write(child.stderr);process.exitCode=child.status??1;',
    ].join(" ");
    const run = spawnSync(process.execPath, ["--input-type=module", "-e", program], { encoding: "utf8", timeout: 15000 });
    expect(run.status).toBe(0);
    expect(run.stderr).toBe("");
    expect(run.stdout).not.toContain("private WAL data");
    const saved = JSON.parse(run.stdout);
    expect(saved.commit).toBe(commit);
    expect((await stat(join(root, saved.directory, "neighbourhood.sqlite"))).mode & 0o777).toBe(0o600);
  });
  test("rejects oversized API bodies before parsing or executing any remote command", async () => {
    const calls: { url: string; options: RequestInit }[] = [];
    await expect(runBackupGate({ token: "test", commit, fetchImpl: fakeFetch([{ body: "x".repeat(65537) }], calls) })).rejects.toThrow("Machines API request failed");
    expect(calls).toHaveLength(1);
  });
  test("wakes a stopped existing machine with one bounded public GET and rechecks topology", async () => {
    const calls: { url: string; options: RequestInit }[] = [];
    await runBackupGate({ token: "test", commit, fetchImpl: fakeFetch([{ body: [machine("stopped")] }, { body: {} }, { body: [machine()] }, execReply()], calls) });
    expect(calls[1]!.url).toBe("https://comp4020-final-naaeeen.fly.dev/");
    expect(calls[1]!.options.headers).toBeUndefined();
    expect(calls[1]!.options.method).toBe("GET");
  });
  test.each([
    [],
    [machine(), machine()],
    [{ ...machine(), config: { ...machine().config, mounts: [{ path: "/wrong", volume: "vol_test123" }] } }],
    [{ ...machine(), config: { ...machine().config, guest: { cpu_kind: "shared", cpus: 1, memory_mb: 512 } } }],
    [{ ...machine(), config: { ...machine().config, mounts: [...machine().config.mounts, { path: "/other", volume: "vol_other" }] } }],
    [machine("starting")],
  ].map(topology => ({ topology })))("rejects unexpected or ambiguous machine topology", async ({ topology }) => {
    const calls: { url: string; options: RequestInit }[] = [];
    await expect(runBackupGate({ token: "test", commit, fetchImpl: fakeFetch([{ body: topology }], calls) })).rejects.toThrow("Unexpected mounted machine topology");
    expect(calls).toHaveLength(1);
  });
  test.each([
    { exit_code: 1, stdout: JSON.stringify(result()) },
    { exit_signal: 9, stdout: JSON.stringify(result()) },
    { exit_code: "0", stdout: JSON.stringify(result()) },
    { exit_code: null, stdout: JSON.stringify(result()) },
    { stdout: "private database rows" },
    { stdout: JSON.stringify({ ...result(), commit: "b".repeat(40) }) },
    { stdout: JSON.stringify({ ...result(), directory: "../private.sqlite" }) },
    { stdout: JSON.stringify({ ...result(), privateData: "secret" }) },
    { stdout: JSON.stringify({ ...result(), databases: [] }) },
  ])("rejects remote execution or malformed/missing success evidence (%j)", async (reply) => {
    await expect(runBackupGate({ token: "test", commit, fetchImpl: fakeFetch([{ body: [machine()] }, { body: reply }]) })).rejects.toThrow("Unverified mounted backup result");
  });
  test("accepts explicit zero remote exit values as well as documented omitted zeros", async () => {
    await expect(runBackupGate({ token: "test", commit, fetchImpl: fakeFetch([{ body: [machine()] }, { body: { ...execReply().body, exit_code: 0, exit_signal: 0 } }]) })).resolves.toEqual(result());
  });
  test("sanitizes HTTP and network failures without exposing tokens, data, or raw response bodies", async () => {
    const sensitive = "secret-token private rows raw body";
    for (const reply of [{ status: 401, body: { message: sensitive } }, { error: sensitive }]) {
      let message = "";
      try { await runBackupGate({ token: sensitive, commit, fetchImpl: fakeFetch([reply]) }); } catch (error) { message = String(error); }
      expect(message).toMatch(/Machines API request failed/);
      expect(message).not.toContain(sensitive);
    }
  });
  test("rejects missing token or invalid expected commit before calling the API", async () => {
    const calls: { url: string; options: RequestInit }[] = [];
    for (const options of [{ token: "", commit }, { token: "test", commit: "main;echo private" }]) {
      await expect(runBackupGate({ ...options, fetchImpl: fakeFetch([], calls) })).rejects.toThrow("Missing token or invalid expected commit");
    }
    expect(calls).toHaveLength(0);
  });
});
