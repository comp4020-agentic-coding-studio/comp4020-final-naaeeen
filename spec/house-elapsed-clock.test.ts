import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { io, type Socket } from "socket.io-client";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createService } from "../src/server.ts";
import { HouseStore } from "../src/house-store.ts";
import { attachHouseRealtime } from "../src/house-realtime.ts";
import { createLayout, bedroomLayout, findRoute, HOUSE_WORLD_VERSION } from "../public/house-geometry.js";
import type { LiveSnapshot } from "../src/house-contract.ts";
const cleanups: (()=>unknown|Promise<unknown>)[]=[];
afterEach(async()=>{vi.restoreAllMocks();for(const cleanup of cleanups.splice(0).reverse())await cleanup();});
const ask=(socket:Socket,event:string,body:unknown={})=>socket.timeout(2000).emitWithAck(event,body);
async function fixture(injectElapsed=true,rawLogs=false){
 const directory=mkdtempSync(join(tmpdir(),"house-elapsed-"));cleanups.push(()=>rmSync(directory,{recursive:true,force:true}));
 let wall=Date.now(),elapsed=0;const wallStart=wall,records:Record<string,unknown>[]=[];vi.spyOn(Date,"now").mockImplementation(()=>wall);
 const app=rawLogs?(()=>{const server=createServer(),houseStore=new HouseStore(join(directory,"house.sqlite")),realtime=attachHouseRealtime(server,houseStore,{...(injectElapsed?{elapsedNow:()=>elapsed}:{}),log:record=>records.push(record)});return {server,houseStore,close:async()=>{await realtime.close();houseStore.close();}};})():createService({dataDir:directory,secureCookies:false,activityLog:record=>records.push({...record}),...(injectElapsed?{houseElapsedNow:()=>elapsed}:{})});cleanups.push(()=>app.close());
 const store=app.houseStore,people=[store.ensureSession(),store.ensureSession()];
 store.execute(people[0]!.id,{commandId:randomUUID(),type:"house.create",payload:{capacity:2,name:"Ada",colour:"sage"}});const home=store.me(people[0]!.id).home!;
 store.execute(people[1]!.id,{commandId:randomUUID(),type:"house.join",payload:{code:home.code,name:"Lin",colour:"blue"}});
 await new Promise<void>(resolve=>app.server.listen(0,"127.0.0.1",resolve));const base="http://127.0.0.1:"+(app.server.address() as {port:number}).port;
 async function connect(n=0,token:string=randomUUID()){
  const socket=io(base,{auth:{worldVersion:HOUSE_WORLD_VERSION},transports:["websocket"],reconnection:false,extraHeaders:{Origin:base,Cookie:"house_session="+people[n]!.token}});cleanups.push(()=>socket.disconnect());
  await new Promise<void>((resolve,reject)=>{socket.once("connect",resolve);socket.once("connect_error",reject);});
  const result=await ask(socket,"house.subscribe",{zoneId:"lounge",controllerToken:token});expect(result.ok,JSON.stringify(result)).toBe(true);
  const initial=result.snapshot as LiveSnapshot,pose=initial.players.find(player=>player.id===people[n]!.id)!;
  const client={n,token,socket,state:initial,sequence:0,pose:{x:pose.x!,z:pose.z!},players:initial.players};
  socket.on("house.snapshot",snapshot=>{client.state=snapshot;client.players=snapshot.players;});socket.on("house.motion",motion=>{client.players=motion.players;});return client;
 }
 type Client=Awaited<ReturnType<typeof connect>>;
 const self=(c:Client)=>c.players.find(player=>player.id===people[c.n]!.id)!;
 async function move(c:Client,dx:number,dz=0,sequence=++c.sequence){const body={generation:c.state.generation,sequence,x:c.pose.x+dx,z:c.pose.z+dz,heading:0},result=await ask(c.socket,"house.move",body);if(result.ok)c.pose={x:body.x,z:body.z};return result;}
 async function subscribe(c:Client,zoneId="lounge"){const result=await ask(c.socket,"house.subscribe",{zoneId,controllerToken:c.token});expect(result.ok,JSON.stringify(result)).toBe(true);c.state=result.snapshot;c.players=result.snapshot.players;c.sequence=0;const pose=self(c);c.pose={x:pose.x!,z:pose.z!};return result.snapshot as LiveSnapshot;}
 async function sit(c:Client,seatId="game-seat-2"){
  const state=c.state,layout=state.durable.room?bedroomLayout(state.durable.room.placements):createLayout(state.durable.house.capacity),seat=layout.seats.find(s=>s.id===seatId)!,route=findRoute(layout,c.pose,seat.target);expect(route).not.toBeNull();let previous={...c.pose};
  for(const point of route!.slice(1)){const distance=Math.hypot(point.x-previous.x,point.z-previous.z),step=Math.max(100,Math.ceil(distance/3.2*1000)+5);elapsed+=step;wall+=step;const ack=await ask(c.socket,"house.move",{generation:c.state.generation,sequence:++c.sequence,...point,heading:0});expect(ack.ok,JSON.stringify(ack)).toBe(true);previous=point;c.pose={...point};}
  expect(await ask(c.socket,"house.seat",{generation:c.state.generation,seatId})).toMatchObject({ok:true});c.pose={x:seat.x,z:seat.z};await vi.waitFor(()=>expect(self(c).seatId).toBe(seat.id));
 }
 return {app,store,people,home,base,records,wallStart,connect,self,move,subscribe,sit,wall:()=>wall,elapsed:()=>elapsed,setWall:(value:number)=>{wall=value;},setElapsed:(value:number)=>{elapsed=value;},advance:(ms:number)=>{elapsed+=ms;wall+=ms;}};
}
describe("server-local elapsed pacing through actual Socket.IO handlers",()=>{
 test.each([[-5000,"rollback"],[0,"stalled"],[5000,"forward"]] as const)("a normally paced quarter-metre move survives wall %s (%s)",async(shift,_label)=>{
  const f=await fixture(),a=await f.connect();f.setElapsed(100);f.setWall(f.wallStart+shift);const result=await f.move(a,.25);expect(result.ok,JSON.stringify(result)).toBe(true);
 });
 test.each([[-5000,"rollback"],[0,"stalled"],[1001,"forward"]] as const)("30-action window follows elapsed time under wall %s (%s)",async(shift,_label)=>{
  const f=await fixture(),a=await f.connect();
  // The initial subscription is action1;29 availability requests fill the same window.
  for(let n=0;n<29;n++)expect(await ask(a.socket,"house.availability",{generation:a.state.generation,value:"quiet"})).toMatchObject({ok:true});
  f.setElapsed(999);f.setWall(f.wallStart+shift);expect(await ask(a.socket,"house.availability",{generation:a.state.generation,value:"quiet"})).toMatchObject({ok:false,code:"RATE_LIMITED"});
  f.setElapsed(1000);const next=await ask(a.socket,"house.availability",{generation:a.state.generation,value:"quiet"});expect(next.ok,JSON.stringify(next)).toBe(true);
 });
 test("79ms stays denied,80ms is allowed, duplicate sequences and excess distance stay denied",async()=>{
  const f=await fixture(),a=await f.connect();f.setWall(f.wallStart+5000);f.setElapsed(79);
  expect(await f.move(a,.1)).toMatchObject({ok:false,code:"RATE_LIMITED"});f.setElapsed(80);expect(await f.move(a,.1)).toMatchObject({ok:true});
  expect(await f.move(a,0,0,a.sequence)).toMatchObject({ok:false,code:"STALE_INPUT"});f.setElapsed(1000);
  expect(await f.move(a,.71)).toMatchObject({ok:false,code:"INVALID_MOVE"});expect(await f.move(a,.64)).toMatchObject({ok:true});
 });
 test("zero-distance input remains allowed while nonzero input requires80elapsedms after it",async()=>{
  const f=await fixture(),a=await f.connect();f.setWall(f.wallStart+5000);f.setElapsed(79);expect(await f.move(a,0)).toMatchObject({ok:true});
  f.setElapsed(158);expect(await f.move(a,.1)).toMatchObject({ok:false,code:"RATE_LIMITED"});f.setElapsed(159);expect(await f.move(a,.1)).toMatchObject({ok:true});
 });
 test("walk idle is still walking at250elapsedms and stops at251 with wall-stamped logs",async()=>{
  const f=await fixture(true,true),a=await f.connect();f.advance(100);expect(await f.move(a,.1)).toMatchObject({ok:true});
  await vi.waitFor(()=>expect(f.self(a).animation).toBe("walk"));f.setElapsed(350);await new Promise(resolve=>setTimeout(resolve,110));expect(f.self(a).animation).toBe("walk");
  f.setElapsed(351);f.setWall(f.wallStart-1000);await vi.waitFor(()=>expect(f.self(a).animation).toBe("idle"));
  const stopped=f.records.filter(record=>record.actor===f.people[0]!.id&&record.action==="motion.stop");expect(stopped).toHaveLength(1);expect(stopped[0]!.at).toBe(f.wall());
 });
 test.each(["resubscribe","zone","takeover","geometry","stand","reconnect"] as const)("%s resets the elapsed movement origin",async reset=>{
  const f=await fixture(),a=await f.connect();let active=a;
  if(reset==="geometry"||reset==="stand")await f.sit(a);
  f.setElapsed(10000);
  if(reset==="resubscribe")await f.subscribe(a);
  if(reset==="zone"){const room=f.store.snapshot(f.people[0]!.id).residents.find(r=>r.id===f.people[0]!.id)!.bedroomId;await f.subscribe(a,room);}
  if(reset==="takeover"){active=await f.connect();const result=await ask(active.socket,"house.takeover",{controllerToken:active.token});expect(result.ok,JSON.stringify(result)).toBe(true);active.state=result.snapshot;active.players=result.snapshot.players;active.sequence=0;const pose=f.self(active);active.pose={x:pose.x!,z:pose.z!};}
  if(reset==="geometry"){const generation=a.state.generation;f.store.db.prepare("UPDATE houses SET capacity=3 WHERE id=?").run(f.home.id);await f.connect(1);await vi.waitFor(()=>expect(a.state.generation).toBeGreaterThan(generation));a.sequence=0;const pose=f.self(a);a.pose={x:pose.x!,z:pose.z!};}
  if(reset==="stand"){expect(await ask(a.socket,"house.stand",{generation:a.state.generation})).toMatchObject({ok:true});await vi.waitFor(()=>expect(f.self(a).seatId).toBeNull());const pose=f.self(a);a.pose={x:pose.x!,z:pose.z!};}
  if(reset==="reconnect"){a.socket.disconnect();active=await f.connect(0,a.token);}
  f.setElapsed(10079);f.setWall(f.wall()+100);expect(await f.move(active,.1)).toMatchObject({ok:false,code:"RATE_LIMITED"});
  f.setElapsed(10080);const result=await f.move(active,.1);expect(result.ok,JSON.stringify(result)).toBe(true);
 });
 test("availability, logs and30-second disconnected chair reservations keep wall timestamps",async()=>{
  const f=await fixture(true,true),a=await f.connect(),b=await f.connect(1);await f.sit(a);f.setWall(f.wall()+123);const chosenAt=f.wall();
  expect(await ask(a.socket,"house.availability",{generation:a.state.generation,value:"chat"})).toMatchObject({ok:true});await vi.waitFor(()=>expect(f.self(a).availabilitySetAt).toBe(chosenAt));
  expect(f.records.findLast(record=>record.actor===f.people[0]!.id&&record.action==="availability.set")!.at).toBe(chosenAt);
  a.socket.disconnect();await vi.waitFor(()=>{const reserved=b.players.find(p=>p.id===f.people[0]!.id)!;expect(reserved.connected).toBe(false);expect(reserved.seatReservedUntil).toBe(chosenAt+30000);});
  f.setElapsed(1000000);expect(await ask(b.socket,"house.availability",{generation:b.state.generation,value:"quiet"})).toMatchObject({ok:true});
  await vi.waitFor(()=>expect(b.players.find(p=>p.id===f.people[0]!.id)?.seatId).toBe("game-seat-2"));
  f.setWall(chosenAt+30001);await vi.waitFor(()=>expect(b.players.find(p=>p.id===f.people[0]!.id)?.seatId).toBeUndefined());
 });
 test("default bound performance clock permits a real-timer walk after a wall adjustment",async()=>{
  const f=await fixture(false),a=await f.connect();await new Promise(resolve=>setTimeout(resolve,100));f.setWall(f.wallStart-5000);
  const result=await f.move(a,.15);expect(result.ok,JSON.stringify(result)).toBe(true);
 });
});
