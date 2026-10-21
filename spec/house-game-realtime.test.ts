import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { io, type Socket } from "socket.io-client";
import { afterEach, describe, expect, test, vi } from "vitest";
import { HouseStore } from "../src/house-store.ts";
import { attachHouseRealtime } from "../src/house-realtime.ts";
import { HOUSE_WORLD_VERSION } from "../public/house-version.js";
import type { HouseCommand, LiveSnapshot } from "../src/house-contract.ts";
const cleanups: (()=>unknown|Promise<unknown>)[]=[];
afterEach(async()=>{vi.restoreAllMocks();for(const fn of cleanups.splice(0).reverse())await fn();});
const ask=(socket:Socket,event:string,body:unknown={})=>socket.timeout(1500).emitWithAck(event,body);
const snapshot=(socket:Socket,predicate:(state:LiveSnapshot)=>boolean)=>new Promise<LiveSnapshot>((resolve,reject)=>{
 const timer=setTimeout(()=>{socket.off("house.snapshot",receive);reject(new Error("No matching game snapshot"));},2200);
 function receive(state:LiveSnapshot){if(predicate(state)){clearTimeout(timer);socket.off("house.snapshot",receive);resolve(state);}}socket.on("house.snapshot",receive);
});
async function fixture(){
 const root=mkdtempSync(join(tmpdir(),"house-game-wire-")),path=join(root,"house.sqlite");cleanups.push(()=>rmSync(root,{recursive:true,force:true}));
 const store=new HouseStore(path);cleanups.push(()=>store.close());const people=Array.from({length:4},()=>store.ensureSession());
 store.execute(people[0]!.id,{commandId:randomUUID(),type:"house.create",payload:{capacity:3,name:"Ada",colour:"sage"}});
 const home=store.me(people[0]!.id).home!;for(const p of people.slice(1,3))store.execute(p.id,{commandId:randomUUID(),type:"house.join",payload:{code:home.code,name:"Friend",colour:"rose"}});
 const server=createServer(),live=attachHouseRealtime(server,store);await new Promise<void>(r=>server.listen(0,"127.0.0.1",r));cleanups.push(()=>live.close());
 const url="http://127.0.0.1:"+(server.address() as {port:number}).port;
 async function connect(n=0,zoneId="lounge",token=randomUUID()){
  const socket=io(url,{auth:{worldVersion:HOUSE_WORLD_VERSION},transports:["websocket"],reconnection:false,extraHeaders:{Origin:url,Cookie:"house_session="+people[n]!.token}});
  cleanups.push(()=>{socket.disconnect();});await new Promise<void>((r,j)=>{socket.once("connect",r);socket.once("connect_error",j);});
  const response=await ask(socket,"house.subscribe",{zoneId,controllerToken:token});return {socket,token,state:response.snapshot as LiveSnapshot,response};
 }
 const command=(type:string,payload:Record<string,unknown>,expectedRevision?:number):HouseCommand=>({commandId:randomUUID(),type,houseId:home.id,payload,...(expectedRevision===undefined?{}:{expectedRevision})});
 type Client=Awaited<ReturnType<typeof connect>>;
 const submit=(c:Client,cmd:HouseCommand)=>ask(c.socket,"house.command",{generation:c.state.generation,zoneId:c.state.durable.zoneId,command:cmd});
 const act=(c:Client,type:string,payload:Record<string,unknown>,rev?:number)=>submit(c,command(type,payload,rev));
 const game=()=>store.snapshot(people[0]!.id).game!;
 async function start(a:Client,b:Client){
  expect((await act(a,"game.join",{roundId:null},game().revision)).ok).toBe(true);const roundId=game().current!.roundId;
  expect((await act(b,"game.join",{roundId},game().revision)).ok).toBe(true);const rosterRevision=game().rosterRevision;
  const ready=await Promise.all([act(a,"game.ready",{roundId,rosterRevision}),act(b,"game.ready",{roundId,rosterRevision})]);expect(ready.every(r=>r.ok)).toBe(true);
  return roundId;
 }
 return {store,path,people,home,live,connect,command,submit,act,game,start};
}
describe("independent sockets and SQLite game authority",()=>{
 test("serializes simultaneous Join and composes same-roster consent; watchers and outsiders cannot act",async()=>{
  const f=await fixture(),a=await f.connect(),b=await f.connect(1),watcher=await f.connect(2),observer=await f.connect();
  const race=await Promise.all([f.act(a,"game.join",{roundId:null},0),f.act(b,"game.join",{roundId:null},0)]);
  expect(race.filter(r=>r.ok)).toHaveLength(1);const roundId=f.game().current!.roundId;
  const remaining=race[0].ok?b:a;expect((await f.act(remaining,"game.join",{roundId},1)).ok).toBe(true);
  expect((await f.act(watcher,"game.join",{roundId},2)).code).toBe("GAME_TABLE_FULL");
  expect((await f.act(observer,"game.ready",{roundId,rosterRevision:2})).code).toBe("NOT_CONTROLLER");
  const ready=await Promise.all([f.act(a,"game.ready",{roundId,rosterRevision:2}),f.act(b,"game.ready",{roundId,rosterRevision:2})]);
  expect(ready.every(r=>r.ok)).toBe(true);expect(f.game().current!.status).toBe("active");
  const outsider=await f.connect(3);expect(outsider.response.code).toBe("FORBIDDEN");
 });
 test("observer subscriptions and stale-controller disconnect cannot withdraw the live controller",async()=>{
  const f=await fixture(),a=await f.connect(),b=await f.connect(1),roundId=await f.start(a,b);
  const observer=await f.connect(),bedroom=f.store.snapshot(f.people[0]!.id).residents[0]!.bedroomId;
  await ask(observer.socket,"house.subscribe",{zoneId:bedroom,controllerToken:observer.token});observer.socket.disconnect();await new Promise(r=>setTimeout(r,25));
  expect(f.game().current!.status).toBe("active");const takeover=await f.connect();takeover.state=(await ask(takeover.socket,"house.takeover",{controllerToken:takeover.token})).snapshot;
  expect((await f.act(a,"game.move",{roundId,column:0},4)).code).toBe("NOT_CONTROLLER");a.socket.disconnect();await new Promise(r=>setTimeout(r,25));expect(f.game().current!.status).toBe("active");
  const moved=await ask(takeover.socket,"house.subscribe",{zoneId:bedroom,controllerToken:takeover.token});expect(moved.ok).toBe(true);expect(moved.snapshot.durable.game).toBeNull();expect(f.game().latestResult!.reason).toBe("left_lounge");
 });
 test("waiting disconnect releases slot; active disconnect pauses and reconnect needs both explicit original players",async()=>{
  const f=await fixture(),a=await f.connect(),b=await f.connect(1);
  await f.act(a,"game.join",{roundId:null},0);a.socket.disconnect();await vi.waitFor(()=>expect(f.game().current).toBeNull());
  const returned=await f.connect(0,"lounge",a.token),roundId=await f.start(returned,b);returned.socket.disconnect();await vi.waitFor(()=>expect(f.game().current!.status).toBe("paused"));
  const paused=f.game(),r=await f.connect(0,"lounge",a.token);expect(f.game().current!.status).toBe("paused");
  expect((await f.act(r,"game.move",{roundId,column:0},paused.revision)).code).toBe("GAME_NOT_ACTIVE");
  await f.act(r,"game.resume",{roundId,resumeRevision:paused.current!.resumeRevision});expect(f.game().current!.status).toBe("paused");
  await f.act(b,"game.resume",{roundId,resumeRevision:paused.current!.resumeRevision});expect(f.game().current!.status).toBe("active");
 });
 test("HTTP shares receipts, rejects forged token/wrong-zone replay and returns old accepted receipt on lounge return",async()=>{
  const f=await fixture(),a=await f.connect(),b=await f.connect(1),roundId=await f.start(a,b),move=f.command("game.move",{roundId,column:0},4);
  expect(()=>f.live.executeHttp(f.people[0]!.id,move,a.state.generation,"lounge",randomUUID())).toThrowError(expect.objectContaining({code:"NOT_CONTROLLER"}));
  const receipt=await f.submit(a,move);expect(receipt.ok).toBe(true);expect(f.live.executeHttp(f.people[0]!.id,move,a.state.generation,"lounge",a.token)).toEqual(receipt);
  const bedroom=f.store.snapshot(f.people[0]!.id).residents[0]!.bedroomId;a.state=(await ask(a.socket,"house.subscribe",{zoneId:bedroom,controllerToken:a.token})).snapshot;
  expect(()=>f.live.executeHttp(f.people[0]!.id,move,a.state.generation,bedroom,a.token)).toThrowError(expect.objectContaining({code:"STALE_ZONE"}));
  a.state=(await ask(a.socket,"house.subscribe",{zoneId:"lounge",controllerToken:a.token})).snapshot;
  expect(await f.submit(a,move)).toEqual(receipt);
  expect((await f.act(a,"game.move",{roundId,column:1},4)).code).toBe("GAME_WRONG_ROUND");
 });
 test("session expiry pauses before removing the current lease",async()=>{
  const f=await fixture(),a=await f.connect(),b=await f.connect(1),roundId=await f.start(a,b);
  f.store.db.prepare("UPDATE sessions SET expires_at=? WHERE identity_id=?").run(Date.now()-1,f.people[0]!.id);
  await vi.waitFor(()=>expect(a.socket.connected).toBe(false),{timeout:2000});
  expect(f.game().current!.status).toBe("paused");
  expect((await f.act(b,"game.move",{roundId,column:0},f.game().revision)).code).toBe("GAME_NOT_ACTIVE");
 });
 test("retries a failed disconnect save and broadcasts the recovered pause to an idle peer",async()=>{
  const f=await fixture(),a=await f.connect(),b=await f.connect(1);await f.start(a,b);
  f.store.db.exec("CREATE TRIGGER fail_game_pause BEFORE UPDATE ON game_tables BEGIN SELECT RAISE(ABORT,'fixture'); END");
  const disconnected=snapshot(b.socket,s=>s.durable.game?.current?.status==="active" && s.players.find(p=>p.id===f.people[0]!.id)?.connected===false);
  a.socket.disconnect();await disconnected;
  const recovered=snapshot(b.socket,s=>s.durable.game?.current?.status==="paused");
  f.store.db.exec("DROP TRIGGER fail_game_pause");
  await recovered;expect(f.game().current!.status).toBe("paused");
 });
 test("due timer maintenance broadcasts without a command; membership removal ends the round",async()=>{
  const f=await fixture(),a=await f.connect(),b=await f.connect(1),roundId=await f.start(a,b);
  const delivered=new Promise<any>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error("No expired-table snapshot")),2000);a.socket.on("house.snapshot",s=>{if(s.durable.game?.latestResult?.reason==="inactive"){clearTimeout(timer);resolve(s);}});});
  const due=f.game(),now=Date.now();
  (due.current as any).startedAt=now-301000;(due.current as any).lastMoveAt=now-300001;
  f.store.db.prepare("UPDATE game_tables SET state=?,next_due_at=? WHERE house_id=?").run(JSON.stringify(due),now-1,f.home.id);
  expect((await delivered).durable.game.current).toBeNull();
  const nextRound=await f.start(a,b);expect(nextRound).not.toBe(roundId);
  f.store.execute(f.people[0]!.id,f.command("house.remove",{memberId:f.people[1]!.id}));f.live.refresh();expect(f.game().latestResult!.reason).toBe("member_removed");
 });
});

