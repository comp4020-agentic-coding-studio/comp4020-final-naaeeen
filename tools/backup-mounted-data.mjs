/** Pre-deploy gate: private per-file snapshots on the existing volume, never an off-volume backup. */
import { pathToFileURL } from "node:url";

export async function backupMountedData(root = "/data", commit = "") {
  // Self-contained: this reviewed function is serialized into the remote command.
  const fs = await import("node:fs/promises");
  const { join, isAbsolute } = await import("node:path");
  const { randomUUID } = await import("node:crypto");
  const sources = [];
  try {
    if (!/^v24[.]/.test(process.version) || !/^[a-f0-9]{40}$/.test(commit) ||
        !isAbsolute(root) || (await fs.realpath(root)) !== root || !(await fs.lstat(root)).isDirectory()) throw new Error();
    const { DatabaseSync, backup } = await import("node:sqlite");
    let bytes = 0;
    for (const name of ["neighbourhood.sqlite", "house.sqlite", "board.sqlite"]) {
      const path = join(root, name);
      let info;
      try { info = await fs.lstat(path); } catch (error) { if (error.code !== "ENOENT") throw error; }
      if (!info) { if (name === "neighbourhood.sqlite") throw new Error(); else continue; }
      if (!info.isFile() || info.isSymbolicLink()) throw new Error();
      for (const suffix of ["-wal", "-shm", "-journal"]) {
        try {
          const sidecar = await fs.lstat(path + suffix);
          if (!sidecar.isFile() || sidecar.isSymbolicLink()) throw new Error();
        } catch (error) { if (error.code !== "ENOENT") throw error; }
      }
      const db = new DatabaseSync(path, { readOnly: true, allowExtension: false, timeout: 5000 });
      sources.push({ db, name });
      const pages = Number(db.prepare("PRAGMA page_count").get().page_count);
      const pageSize = Number(db.prepare("PRAGMA page_size").get().page_size);
      if (!Number.isSafeInteger(pages) || pages < 1 || !Number.isSafeInteger(pageSize) || pageSize < 512) throw new Error();
      bytes += pages * pageSize;
    }
    // Conservative growth margin plus 32 MiB reserve. This is a preflight, not a disk quota.
    const space = await fs.statfs(root, { bigint: true });
    if (!Number.isSafeInteger(bytes) || space.bavail * space.bsize < BigInt(bytes) * 2n + 33554432n) throw new Error();
    const directory = "release-backup-" + Date.now() + "-" + randomUUID();
    const destination = join(root, directory);
    await fs.mkdir(destination, { mode: 0o700 }); // Exclusive creation: never reuse or overwrite a directory.
    await fs.chmod(destination, 0o700);
    const databases = [];
    for (const { db, name } of sources) {
      const target = join(destination, name);
      const reserved = await fs.open(target, "wx", 0o600);
      await reserved.close();
      const pages = await backup(db, target);
      await fs.chmod(target, 0o600);
      const copy = new DatabaseSync(target, { readOnly: true, allowExtension: false, timeout: 5000 });
      try {
        const integrity = copy.prepare("PRAGMA integrity_check").all();
        if (integrity.length !== 1 || integrity[0].integrity_check !== "ok" ||
            copy.prepare("PRAGMA foreign_key_check").get() !== undefined) throw new Error();
      } finally { copy.close(); }
      databases.push({ name, pages });
    }
    return { sentinel: "MOUNTED_SQLITE_BACKUP_V1", commit, directory, node: process.version, databases };
  } catch { throw new Error("Mounted SQLite backup failed"); }
  finally { for (const { db } of sources) db.close(); }
}

const app = "comp4020-final-naaeeen";
const origin = "https://api.machines.dev/v1/apps/" + app;

function mountedMachine(list) {
  if (!Array.isArray(list) || list.length !== 1) throw new Error("Unexpected mounted machine topology");
  const machine = list[0], guest = machine?.config?.guest, mounts = machine?.config?.mounts;
  if (!/^[a-f0-9]{14,32}$/.test(machine?.id) || !["started", "stopped"].includes(machine.state) ||
      guest?.cpu_kind !== "shared" || guest?.cpus !== 1 || guest?.memory_mb !== 256 ||
      !Array.isArray(mounts) || mounts.length !== 1 || mounts[0]?.path !== "/data" ||
      !/^vol_[a-z0-9]+$/.test(mounts[0]?.volume)) throw new Error("Unexpected mounted machine topology");
  return machine;
}

function verifiedResult(reply, commit) {
  const failure = () => { throw new Error("Unverified mounted backup result"); };
  if (!reply || typeof reply !== "object" || [reply.exit_code, reply.exit_signal].some(value => value !== undefined && value !== 0) ||
      typeof reply.stdout !== "string" || (reply.stderr !== undefined && typeof reply.stderr !== "string")) failure();
  let report;
  try { report = JSON.parse(reply.stdout); } catch { failure(); }
  if (!report || Object.keys(report).sort().join() !== "commit,databases,directory,node,sentinel" ||
      report.sentinel !== "MOUNTED_SQLITE_BACKUP_V1" || report.commit !== commit ||
      !/^release-backup-[0-9]{13}-[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(report.directory) ||
      !/^v24[.][0-9]+[.][0-9]+$/.test(report.node) || !Array.isArray(report.databases) ||
      report.databases.length < 1 || report.databases.length > 3 || report.databases[0]?.name !== "neighbourhood.sqlite") failure();
  const names = new Set();
  for (const database of report.databases) {
    if (!database || Object.keys(database).sort().join() !== "name,pages" ||
        !["neighbourhood.sqlite", "house.sqlite", "board.sqlite"].includes(database.name) ||
        names.has(database.name) || !Number.isSafeInteger(database.pages) || database.pages < 1) failure();
    names.add(database.name);
  }
  return report;
}

export async function runBackupGate({ token = process.env.FLY_API_TOKEN, commit = process.env.GITHUB_SHA, fetchImpl = globalThis.fetch } = {}) {
  if (!token || !/^[a-f0-9]{40}$/.test(commit ?? "")) throw new Error("Missing token or invalid expected commit");
  async function request(path, body) {
    try {
      const response = await fetchImpl(origin + path, {
        method: body ? "POST" : "GET", redirect: "error",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(body ? 100000 : 15000),
      });
      if (!response.ok) { await response.body?.cancel(); throw new Error(); }
      const reader = response.body?.getReader(), chunks = [];
      if (!reader) throw new Error();
      let bytes = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 65536) { await reader.cancel(); throw new Error(); }
        chunks.push(value);
      }
      return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch { throw new Error("Machines API request failed"); }
  }
  let machine = mountedMachine(await request("/machines"));
  if (machine.state === "stopped") {
    try {
      const wake = await fetchImpl("https://" + app + ".fly.dev/", { method: "GET", redirect: "error", signal: AbortSignal.timeout(45000) });
      if (!wake.ok) throw new Error();
      await wake.body?.cancel();
    } catch { throw new Error("Existing mounted machine did not wake"); }
    machine = mountedMachine(await request("/machines"));
    if (machine.state !== "started") throw new Error("Unexpected mounted machine topology");
  }
  const code = "const deadline=setTimeout(()=>process.exit(1),80000);(" + backupMountedData.toString() + ')("/data",' + JSON.stringify(commit) + ").then(r=>console.log(JSON.stringify(r)),()=>{console.error('Mounted SQLite backup failed');process.exitCode=1}).finally(()=>clearTimeout(deadline));";
  return verifiedResult(await request("/machines/" + machine.id + "/exec", { command: ["node", "--no-warnings", "--input-type=module", "-e", code], timeout: 90 }), commit);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(JSON.stringify(await runBackupGate())); }
  catch (error) { console.error("Mounted data backup gate failed: " + error.message); process.exitCode = 1; }
}
