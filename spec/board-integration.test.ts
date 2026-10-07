import { mkdtempSync, readdirSync, readlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync, backup } from "node:sqlite";
import { io } from "socket.io-client";
import { afterEach, describe, expect, test } from "vitest";
import { createService } from "../src/server.ts";

const cleanups: Array<() => Promise<void>> = [];
afterEach(async () => { for (const cleanup of cleanups.splice(0).reverse()) await cleanup(); });
const command = (type: string, payload: Record<string, unknown>, houseId?: string) => ({ commandId: randomUUID(), type, payload, ...(houseId ? {houseId} : {}) });
function folder() { const path = mkdtempSync(join(tmpdir(), "night-board-integration-")); cleanups.push(async () => rmSync(path, {recursive:true,force:true})); return path; }
async function started(dataDir = folder()) {
  const service = createService({ dataDir }); cleanups.push(() => service.close());
  await new Promise<void>(resolve => service.server.listen(0, "127.0.0.1", resolve));
  const address = service.server.address() as {port:number};
  return {service, base:`http://127.0.0.1:${address.port}`, dataDir};
}
function seed(service: ReturnType<typeof createService>) {
  const actor = service.houseStore.ensureSession();
  service.houseStore.execute(actor.id, command("house.create", {capacity:2,name:"Reed",colour:"sage"}));
  return {actor,house:service.houseStore.me(actor.id).home!};
}
function rect(id = "integration-shape") {
  return {id,type:"rectangle",x:80,y:80,width:240,height:140,angle:0,strokeColor:"#1e1e1e",backgroundColor:"#fff3bf",fillStyle:"solid",strokeWidth:2,strokeStyle:"solid",roughness:1,opacity:100,groupIds:[],frameId:null,roundness:null,seed:1,version:1,versionNonce:10,isDeleted:false,boundElements:null,updated:Date.now(),link:null,locked:false,index:"a0"};
}
const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=";

describe("integrated standalone board boundary", () => {
  test("serves a standalone editor and self-hosted assets with a narrowly scoped frame policy", async () => {
    const {base} = await started();
    const root = await fetch(base+"/"); expect(root.headers.get("x-frame-options")).toBe("DENY");
    const board = await fetch(base+"/board/"); expect(board.status).toBe(200);
    expect(board.headers.get("x-frame-options")).toBe("SAMEORIGIN");
    expect(board.headers.get("content-security-policy")).toContain("frame-ancestors 'self'");
    const html = await board.text(); expect(html).toContain("/board-assets/app.js");
    expect(html).not.toMatch(/house-world|house-ui|three\.module/);
    for (const path of ["/board-assets/app.js","/board-assets/app.css","/house-shell.js"]) {
      const response = await fetch(base+path); expect(response.status).toBe(200); expect(response.headers.get("x-content-type-options")).toBe("nosniff"); expect(response.headers.get("cache-control")).toBe("no-cache");
    }
    expect((await fetch(base+"/healthz")).status).toBe(200);
    expect((await fetch(base+"/board-assets/%2e%2e/src/server.ts")).status).toBe(404);
  });
  test("authenticates the board through the same service and preserves scene/assets/identity across restart", async () => {
    const {service,base,dataDir} = await started(); const {actor,house} = seed(service);
    const headers = {cookie:`house_session=${actor.token}`,origin:base,"X-House-Identity":actor.id,"Content-Type":"application/json"};
    const saved = await fetch(base+"/api/board/patch", {method:"POST",headers,body:JSON.stringify({id:randomUUID(),houseId:house.id,elements:[rect()]})}); expect(saved.status).toBe(200);
    const uploaded = await fetch(base+"/api/board/asset", {method:"POST",headers,body:JSON.stringify({id:randomUUID(),houseId:house.id,file:{id:"integration-file",mimeType:"image/png",dataURL:png}})}); expect(uploaded.status).toBe(200);
    const forbidden = await fetch(base+"/api/board/snapshot?houseId="+house.id); expect(forbidden.status).toBe(401);
    await service.close(); const restarted = await started(dataDir);
    const response = await fetch(restarted.base+"/api/board/snapshot?houseId="+house.id,{headers:{cookie:headers.cookie}}); expect(response.status).toBe(200);
    const state = await response.json() as {elements: Array<{id:string}>,files:Array<{id:string,url:string}>};
    expect(state.elements.map(item=>item.id)).toContain("integration-shape");
    expect(state.files[0]!.id).toBe("integration-file");
    const image = await fetch(restarted.base+state.files[0]!.url,{headers:{cookie:headers.cookie}}); expect(image.status).toBe(200);
    expect(Buffer.from(await image.arrayBuffer()).equals(Buffer.from(png.split(",")[1]!,"base64"))).toBe(true);
    expect(restarted.service.houseStore.me(actor.id).home!.id).toBe(house.id);
  });
  test("restores all three quiescent SQLite databases including binary board assets through native WAL-aware backups", async () => {
    const {service,dataDir} = await started(); const {actor,house} = seed(service);
    service.boardStore.patch(actor.id,{id:randomUUID(),houseId:house.id,elements:[rect()]});
    service.boardStore.asset(actor.id,{id:randomUUID(),houseId:house.id,file:{id:"backup-image",mimeType:"image/png",dataURL:png}});
    const restoredDir=folder();
    for(const name of ["neighbourhood.sqlite","house.sqlite","board.sqlite"]) {
      const reader=new DatabaseSync(join(dataDir,name),{readOnly:true});
      try {await backup(reader,join(restoredDir,name));} finally {reader.close();}
    }
    const restored=await started(restoredDir);
    expect(restored.service.houseStore.session(actor.digest)?.id).toBe(actor.id);
    expect(restored.service.boardStore.snapshot(house.id).elements).toHaveLength(1);
    expect(restored.service.boardStore.snapshot(house.id).files[0]!.id).toBe("backup-image");
    expect(restored.service.store.ready()).toBe(true);
  });
  test("closes both existing stores if a new board database has an unsupported schema", () => {
    const dataDir=folder();const bad=new DatabaseSync(join(dataDir,"board.sqlite"));bad.exec("PRAGMA user_version=99");bad.close();
    const handles=()=>readdirSync("/proc/self/fd").filter(name=>{try{return readlinkSync("/proc/self/fd/"+name).startsWith(dataDir);}catch{return false;}}).length;
    const before=handles();expect(()=>createService({dataDir})).toThrow();expect(handles()).toBe(before);
  });
});

test("a full retained long-Unicode room transcript can be subscribed without disconnecting", async () => {
  const {service,base}=await started();const {actor,house}=seed(service);
  const text="🙂".repeat(2000);
  for(let n=0;n<100;n++) service.houseStore.execute(actor.id,command("chat.send",{zoneId:"lounge",text},house.id));
  const durable=service.houseStore.snapshot(actor.id,"lounge");
  expect(Buffer.byteLength(JSON.stringify(durable))).toBeGreaterThan(512*1024);
  expect(Buffer.byteLength(JSON.stringify(durable))).toBeLessThan(1024*1024);
  const socket=io(base,{forceNew:true,transports:["websocket"],reconnection:false,extraHeaders:{Origin:base,Cookie:`house_session=${actor.token}`}});
  cleanups.push(async()=>{socket.disconnect();});
  await new Promise<void>((resolve,reject)=>{socket.once("connect",resolve);socket.once("connect_error",reject);});
  const reply=await socket.timeout(2000).emitWithAck("house.subscribe",{zoneId:"lounge",controllerToken:randomUUID()});
  expect(reply.ok).toBe(true);expect(reply.snapshot.durable.chat).toHaveLength(100);
  expect(reply.snapshot.durable.chat[0].text).toBe(text);
  await new Promise(resolve=>setTimeout(resolve,100));expect(socket.connected).toBe(true);
});
