import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { afterEach, expect, it } from "vitest";
import { io } from "socket.io-client";
import { createLayout, bedroomLayout, validPosition } from "../public/house-geometry.js";
import { createService } from "../src/server.ts";
const fixtures: {app: ReturnType<typeof createService>; directory: string}[] = [];
async function fixture() {
 const directory = mkdtempSync(join(tmpdir(), "house-http-"));
 const app=createService({dataDir:directory, secureCookies:false});
 fixtures.push({app,directory});
 await new Promise<void>(resolve=>app.server.listen(0,"127.0.0.1",resolve));
 const base="http://127.0.0.1:"+(app.server.address() as {port:number}).port;
 const me=await fetch(base+"/api/house/me");
 return {app,base,me,cookie:me.headers.get("set-cookie")?.split(";")[0]??""};
}
afterEach(async()=>{for(const f of fixtures.splice(0)){await f.app.close();rmSync(f.directory,{recursive:true,force:true});}});
it("establishes an independent house identity without joining or exposing legacy visitors",async()=>{
 const {me,cookie}=await fixture(); expect(me.status).toBe(200);
 expect(cookie).toMatch(/^house_session=/); expect(me.headers.get("set-cookie")).toContain("HttpOnly");
 const state=await me.json(); expect(state.home).toBeNull(); expect(state.identity.id).toBeTruthy();
});
it("creates a private saved house and rejects cross-origin/oversized/unauthenticated writes",async()=>{
 const {base,cookie}=await fixture();
 const command={commandId:randomUUID(),type:"house.create",payload:{capacity:2,name:"Robin",colour:"sage"}};
 const headers={Cookie:cookie,"Content-Type":"application/json",Origin:base};
 const denied=await fetch(base+"/api/house/command",{method:"POST",headers:{...headers,Origin:"https://attacker.invalid"},body:JSON.stringify(command)}); expect(denied.status).toBe(403);
 const missing=await fetch(base+"/api/house/command",{method:"POST",headers:{"Content-Type":"application/json",Origin:base},body:JSON.stringify(command)}); expect(missing.status).toBe(403);
 const big=await fetch(base+"/api/house/command",{method:"POST",headers,body:JSON.stringify({...command,padding:"x".repeat(17000)})});expect(big.status).toBe(400);
 const save=await fetch(base+"/api/house/command",{method:"POST",headers,body:JSON.stringify(command)});expect(save.status).toBe(200);
 const returned=await fetch(base+"/api/house/me",{headers:{Cookie:cookie}});expect((await returned.json()).home.capacity).toBe(2);
 const legacy=await fetch(base+"/api/state");expect((await legacy.json()).neighbours).toEqual([]);
});
it("serves the game modules and both Three import siblings without exposing source or databases",async()=>{
 const {base}=await fixture();
 for(const path of ["/","/house.html","/house-ui.js","/house-world.js","/house-camera.js","/house-label-layout.js","/house-geometry.js","/house-client.js","/house.css","/socket.io/socket.io.js","/vendor/build/three.module.js","/vendor/build/three.core.js","/legacy/"]) expect((await fetch(base+path)).status,path).toBe(200);
 for(const path of ["/src/house-store.ts","/data/house.sqlite","/vendor/package.json"]) expect((await fetch(base+path)).status,path).toBe(404);
});

it("places real arrivals apart in safe lounge and bedroom positions", async()=>{
 const {app,base,cookie}=await fixture();
 const headers={Cookie:cookie,"Content-Type":"application/json",Origin:base};
 const created=await fetch(base+"/api/house/command",{method:"POST",headers,body:JSON.stringify({commandId:randomUUID(),type:"house.create",payload:{capacity:2,name:"Robin",colour:"sage"}})});
 expect(created.status).toBe(200);
 const ownerMe=await (await fetch(base+"/api/house/me",{headers:{Cookie:cookie}})).json();
 const peerStart=await fetch(base+"/api/house/me"), peerCookie=peerStart.headers.get("set-cookie")!.split(";")[0]!;
 const joined=await fetch(base+"/api/house/command",{method:"POST",headers:{...headers,Cookie:peerCookie},body:JSON.stringify({commandId:randomUUID(),type:"house.join",payload:{code:ownerMe.home.code,name:"Finch",colour:"rose"}})});
 expect(joined.status).toBe(200);
 const sockets:any[]=[];
 async function arrive(authCookie:string){
  const socket=io(base,{transports:["websocket"],reconnection:false,extraHeaders:{Cookie:authCookie,Origin:base}});
  sockets.push(socket);await new Promise<void>((resolve,reject)=>{socket.once("connect",resolve);socket.once("connect_error",reject);});
  const controllerToken=randomUUID();
  const reply=await socket.timeout(3000).emitWithAck("house.subscribe",{zoneId:"lounge",controllerToken});
  expect(reply.ok).toBe(true);return {socket,live:reply.snapshot,controllerToken};
 }
 try {
  const owner=await arrive(cookie),peer=await arrive(peerCookie);
  const players=peer.live.players.filter((p:any)=>p.connected);
  expect(players).toHaveLength(2);
  expect(Math.hypot(players[0].x-players[1].x,players[0].z-players[1].z)).toBeGreaterThanOrEqual(.6);
  for(const p of players)expect(validPosition(createLayout(2),p)).toBe(true);
  const roomId=app.houseStore.snapshot(ownerMe.identity.id).residents.find(p=>p.id===ownerMe.identity.id)!.bedroomId;
  const roomReply=await owner.socket.timeout(3000).emitWithAck("house.subscribe",{zoneId:roomId,controllerToken:owner.controllerToken});
  expect(roomReply.ok).toBe(true);
  const saved=await owner.socket.timeout(3000).emitWithAck("house.command",{generation:roomReply.snapshot.generation,zoneId:roomId,command:{commandId:randomUUID(),houseId:ownerMe.home.id,type:"room.configure",expectedRevision:0,payload:{roomId,open:true,palette:"sage"}}});
  expect(saved.ok).toBe(true);
  const visit=await peer.socket.timeout(3000).emitWithAck("house.subscribe",{zoneId:roomId,controllerToken:peer.controllerToken});
  expect(visit.ok).toBe(true);
  const occupants=visit.snapshot.players.filter((p:any)=>p.connected&&p.zoneId===roomId);
  expect(Math.hypot(occupants[0].x-occupants[1].x,occupants[0].z-occupants[1].z)).toBeGreaterThanOrEqual(.6);
  for(const p of occupants)expect(validPosition(bedroomLayout(visit.snapshot.durable.room.placements),p)).toBe(true);
 } finally {for(const socket of sockets)socket.disconnect();}
});
it("reports the house storage readiness as well as the legacy database",async()=>{
 const {app,base}=await fixture();app.houseStore.close();
 const response=await fetch(base+"/health");expect(response.status).toBe(503);expect(await response.json()).toEqual({ok:false});
});

it("shuts down with a legacy live stream still open",async()=>{
 const {app,base}=await fixture();
 const start=await fetch(base+"/api/state"),cookie=start.headers.get("set-cookie")!.split(";")[0]!;
 await start.json();
 const controller=new AbortController();
 const stream=await fetch(base+"/api/events",{headers:{Cookie:cookie},signal:controller.signal});
 expect(stream.status).toBe(200);
 const closing=app.close();let failure:unknown,timer:ReturnType<typeof setTimeout>|undefined;
 try{await Promise.race([closing,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error("Shutdown waited for its own unclosed legacy stream")),1500);})]);}
 catch(error){failure=error;}
 finally{if(timer)clearTimeout(timer);controller.abort();await closing;}
 if(failure)throw failure;
 expect(app.store.ready()).toBe(false);expect(app.houseStore.ready()).toBe(false);
});

it("renders source evidence links against the repository instead of unavailable readme subpaths",async()=>{
 const {base}=await fixture();const html=await (await fetch(base+"/readme/")).text();
 expect(html).toContain('href="https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/blob/main/docs/implementation/VALIDATION.md"');
 expect(html).not.toContain('href="docs/implementation/VALIDATION.md"');
 expect(html).toContain('href="https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/blob/main/PLAN.md"');
});


it("rejects a delayed draft or private request captured for another cookie identity",async()=>{
 const {app,base,me}=await fixture();const original=await me.json();
 const second=await fetch(base+"/api/house/me"), secondMe=await second.json();
 const otherCookie=second.headers.get("set-cookie")!.split(";")[0]!;
 const headers={Cookie:otherCookie,"Content-Type":"application/json",Origin:base,"X-House-Identity":original.identity.id};
 const command={commandId:randomUUID(),type:"house.create",payload:{capacity:2,name:"Delayed draft",colour:"sage"}};
 for(const [path,body] of [["command",command],["recovery-key",{}],["export",{}]] as const){
  const reply=await fetch(base+"/api/house/"+path,{method:"POST",headers,body:JSON.stringify(body)});
  expect(reply.status,path).toBe(403);expect((await reply.json()).code,path).toBe("IDENTITY_CHANGED");
 }
 expect(app.houseStore.me(secondMe.identity.id).home).toBeNull();
 const valid=await fetch(base+"/api/house/command",{method:"POST",headers:{...headers,"X-House-Identity":secondMe.identity.id},body:JSON.stringify(command)});
 expect(valid.status).toBe(200);
 expect(app.houseStore.me(secondMe.identity.id).identity.name).toBe("Delayed draft");
 expect(app.houseStore.me(original.identity.id).home).toBeNull();
});
