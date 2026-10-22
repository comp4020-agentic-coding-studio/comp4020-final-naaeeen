import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { io, type Socket } from "socket.io-client";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createService } from "../src/server.ts";
import { HOUSE_WORLD_VERSION, createLayout, findRoute } from "../public/house-geometry.js";
import { PUZZLE_PIECES } from "../public/house-puzzle-content.js";
import type { HouseCommand, LiveSnapshot } from "../src/house-contract.ts";
const cleanup: (()=>unknown|Promise<unknown>)[]=[];
afterEach(async()=>{vi.restoreAllMocks(); for(const fn of cleanup.splice(0).reverse()) await fn();});
const ask=(socket:Socket,event:string,body:unknown={})=>socket.timeout(2000).emitWithAck(event,body);
async function fixture() {
 const directory=mkdtempSync(join(tmpdir(),"picture-wire-")); cleanup.push(()=>rmSync(directory,{recursive:true,force:true}));
 const app=createService({dataDir:directory,secureCookies:false,activityLog:()=>{}}); cleanup.push(()=>app.close());
 const realNow=Date.now.bind(Date);let offset=0;vi.spyOn(Date,"now").mockImplementation(()=>realNow()+offset);
 const positions=new WeakMap<Socket,{x:number,z:number}>(),motion=new WeakMap<Socket,number>();
 const store=app.houseStore, people=Array.from({length:7},()=>store.ensureSession());
 store.execute(people[0]!.id,{commandId:randomUUID(),type:"house.create",payload:{capacity:6,name:"Ada",colour:"sage"}});
 const home=store.me(people[0]!.id).home!;
 for(const p of people.slice(1,6)) store.execute(p.id,{commandId:randomUUID(),type:"house.join",payload:{code:home.code,name:"Friend",colour:"rose"}});
 await new Promise<void>(r=>app.server.listen(0,"127.0.0.1",r)); const base="http://127.0.0.1:"+(app.server.address() as {port:number}).port;
 async function connect(n=0,token=randomUUID()) {
  const socket=io(base,{auth:{worldVersion:HOUSE_WORLD_VERSION},transports:["websocket"],reconnection:false,extraHeaders:{Origin:base,Cookie:"house_session="+people[n]!.token}});
  cleanup.push(()=>socket.disconnect()); await new Promise<void>((r,j)=>{socket.once("connect",r);socket.once("connect_error",j);});
  const response=await ask(socket,"house.subscribe",{zoneId:"lounge",controllerToken:token});
  const client={socket,token,n,state:response.snapshot as LiveSnapshot,sequence:0,response};
  socket.on("house.snapshot",state=>{client.state=state;});
  if(client.state?.controller && !client.state.players.find(player=>player.id===people[n]!.id)?.seatId)await sit(client);
  return client;
 }
 type Client=Awaited<ReturnType<typeof connect>>;
 async function sit(c:Client){
  // Walk on a monotonic fixture clock: CPU scheduling and host wall-clock
  // adjustments must not supply (or remove) the movement credit this route needs.
  let walkingNow=realNow()+offset;vi.spyOn(Date,"now").mockImplementation(()=>walkingNow);
  try {
   const layout=createLayout(6),self=c.state.players.find(player=>player.id===people[c.n]!.id)!,seat=layout.seats.find(candidate=>candidate.id==="game-seat-"+(c.n+1))!;
   const route=findRoute(layout,{x:self.x!,z:self.z!},seat.target);expect(route).not.toBeNull();let sequence=0,previous={x:self.x!,z:self.z!};
   for(const point of route!.slice(1)){
    const distance=Math.hypot(point.x-previous.x,point.z-previous.z),advanceMs=Math.max(80,Math.ceil(distance/3.2*1000)+5);
    walkingNow+=advanceMs;
    const response=await ask(c.socket,"house.move",{generation:c.state.generation,sequence:++sequence,...point,heading:0});
    expect(response.ok,JSON.stringify({phase:"seat-approach",actor:c.n,sequence,from:previous,to:point,distance,advanceMs,response})).toBe(true);previous=point;
   }
   motion.set(c.socket,sequence);positions.set(c.socket,{x:seat.x,z:seat.z});
   const response=await ask(c.socket,"house.seat",{generation:c.state.generation,seatId:seat.id});expect(response.ok,JSON.stringify({phase:"seat-claim",actor:c.n,seatId:seat.id,response})).toBe(true);
  } finally {
   offset=walkingNow-realNow();vi.spyOn(Date,"now").mockImplementation(()=>realNow()+offset);
  }
 }

 const command=(type:string,payload:Record<string,unknown>,expectedRevision?:number):HouseCommand=>({commandId:randomUUID(),type,houseId:home.id,payload,...(expectedRevision===undefined?{}:{expectedRevision})});
 const submit=(c:Client,command:HouseCommand)=>ask(c.socket,"house.command",{generation:c.state.generation,zoneId:c.state.durable.zoneId,command});
 const table=()=>store.snapshot(people[0]!.id).puzzle!;
 const body=(c:Client,mode:"join"|"leave",changes:Record<string,unknown>={})=>({generation:c.state.generation,zoneId:"lounge",serverEpoch:c.state.serverEpoch,accessGeneration:c.state.accessGeneration,intentSequence:++c.sequence,requestId:randomUUID(),roundId:table().current!.id,mode,...changes});
 const intent=(c:Client,mode:"join"|"leave",changes:Record<string,unknown>={})=>ask(c.socket,"house.puzzle.intent",body(c,mode,changes));
 function startCommand(c:Client,confirmUnfinished=false) {
  const state=table();return command("puzzle.start",{expectedRoundId:state.current?.id??null,illustrationId:"rainy-nook",illustrationVersion:1,confirmUnfinished,authority:{serverEpoch:c.state.serverEpoch,accessGeneration:c.state.accessGeneration,generation:c.state.generation},expectedRoster:{serverEpoch:c.state.serverEpoch,revision:c.state.puzzleRoster!.revision}},state.revision);
 }
 async function start(c:Client,confirm=false){const cmd=startCommand(c,confirm),receipt=await submit(c,cmd);expect(receipt.ok).toBe(true);await vi.waitFor(()=>expect(c.state.durable.puzzle!.current!.id).toBe(receipt.result.roundId));return {cmd,receipt};}
 const place=(c:Client,participationId:string,n:number,destination=n)=>command("puzzle.place",{roundId:table().current!.id,participationId,pieceId:PUZZLE_PIECES[n]!.id,destination});
 async function roster(c:Client,ids:string[]) { await vi.waitFor(()=>expect(c.state.puzzleRoster!.memberIds).toEqual([...ids].sort())); }
 async function http(c:Client,cmd:HouseCommand,headers:Record<string,string>={}) {
  const response=await fetch(base+"/api/house/command",{method:"POST",headers:{Cookie:"house_session="+people[c.n]!.token,Origin:base,"Content-Type":"application/json","X-House-Identity":people[c.n]!.id,"X-House-Generation":String(c.state.generation),"X-House-Zone":c.state.durable.zoneId,"X-House-Controller-Token":c.token,...headers},body:JSON.stringify(cmd)});
  return {status:response.status,body:await response.json()};
 }
 return {app,store,people,home,base,connect,command,submit,table,body,intent,startCommand,start,place,roster,http,sit};
}
describe("real Socket.IO and HTTP picture participation",()=>{
 test("three then six explicit participants each contribute; independent placements compose and same-piece race has one effect",async()=>{
  const f=await fixture(),clients=[];for(let n=0;n<6;n++)clients.push(await f.connect(n));
  await f.start(clients[0]!);expect(clients[0]!.state.puzzleRoster!.memberIds).toEqual([]);
  const receiptRows=f.store.db.prepare("SELECT COUNT(*) AS n FROM receipts").get();
  const joins: any[]=[];for(const c of clients.slice(0,3))joins.push(await f.intent(c,"join"));
  await f.roster(clients[0]!,f.people.slice(0,3).map(p=>p.id));
  for(const c of clients.slice(3))joins.push(await f.intent(c,"join"));
  await f.roster(clients[0]!,f.people.slice(0,6).map(p=>p.id));expect(f.store.db.prepare("SELECT COUNT(*) AS n FROM receipts").get()).toEqual(receiptRows);
  const effects=await Promise.all(clients.map((c,n)=>f.submit(c,f.place(c,joins[n].participationId,n))));expect(effects.every(r=>r.ok)).toBe(true);
  expect(new Set(f.table().current!.placements.map(p=>p.actorId)).size).toBe(6);
  const race=await Promise.all(clients.slice(0,2).map((c,n)=>f.submit(c,f.place(c,joins[n].participationId,6))));
  expect(race.filter(r=>r.ok)).toHaveLength(1);expect(race.find(r=>!r.ok).code).toBe("PUZZLE_PIECE_TAKEN");
  expect((await f.submit(clients[0]!,f.place(clients[0]!,joins[0].participationId,7,8))).code).toBe("PUZZLE_WRONG_PLACE");
  await f.intent(clients[0]!,"leave");expect((await f.submit(clients[1]!,f.place(clients[1]!,joins[1].participationId,7))).ok).toBe(true);
  expect(f.table().current!.placements).toHaveLength(8);expect(Buffer.byteLength(JSON.stringify(f.table()))).toBeLessThan(8192);
 });
 test("newer Leave cancels a lost Join and a Join that has not arrived, without knowing its participation UUID",async()=>{
  const f=await fixture(),a=await f.connect();await f.start(a);
  const join=f.body(a,"join"),accepted=await ask(a.socket,"house.puzzle.intent",join);expect(accepted.ok).toBe(true);
  const leave=f.body(a,"leave");expect((await ask(a.socket,"house.puzzle.intent",leave)).ok).toBe(true);
  expect((await ask(a.socket,"house.puzzle.intent",join)).code).toBe("STALE_INTENT");await f.roster(a,[]);
  const delayed=f.body(a,"join"),withdraw=f.body(a,"leave");expect((await ask(a.socket,"house.puzzle.intent",withdraw)).ok).toBe(true);
  expect((await ask(a.socket,"house.puzzle.intent",delayed)).code).toBe("STALE_INTENT");
  expect(await ask(a.socket,"house.puzzle.intent",withdraw)).toMatchObject({ok:true,participationId:null});
  expect((await ask(a.socket,"house.puzzle.intent",{...withdraw,requestId:randomUUID()})).code).toBe("INTENT_ID_REUSED");
 });
 test("domain denials stay cached, already-joined intent keeps UUID and malformed/auth/rate failures consume no sequence",async()=>{
  const f=await fixture(),a=await f.connect();await f.start(a);
  const game=f.command("game.join",{roundId:null},0),gameReceipt=await f.submit(a,game);expect(gameReceipt.ok).toBe(true);
  const denied=f.body(a,"join"),ack=await ask(a.socket,"house.puzzle.intent",denied);expect(ack.code).toBe("ACTIVITY_ACTIVE");
  await f.submit(a,f.command("game.leave",{roundId:gameReceipt.result.roundId}));
  expect(await ask(a.socket,"house.puzzle.intent",denied)).toEqual(ack);
  const first=await f.intent(a,"join");expect(first.ok).toBe(true);const second=await f.intent(a,"join");expect(second.code).toBe("ALREADY_JOINED");
  await f.roster(a,[f.people[0]!.id]);expect(a.state.puzzleRoster!.selfParticipationId).toBe(first.participationId);
  await f.intent(a,"leave");
  const fresh=f.body(a,"join");expect((await ask(a.socket,"house.puzzle.intent",{...fresh,extra:1})).code).toBe("INVALID_INPUT");
  expect((await ask(a.socket,"house.puzzle.intent",{...fresh,serverEpoch:randomUUID()})).code).toBe("STALE_GENERATION");
  expect((await ask(a.socket,"house.puzzle.intent",fresh)).ok).toBe(true);
  await new Promise(r=>setTimeout(r,1050));
  for(let n=0;n<30;n++)await ask(a.socket,"house.availability",{generation:a.state.generation,value:"quiet"});
  const limited=f.body(a,"leave");expect((await ask(a.socket,"house.puzzle.intent",limited)).code).toBe("RATE_LIMITED");
  await new Promise(r=>setTimeout(r,1050));expect((await ask(a.socket,"house.puzzle.intent",limited)).ok).toBe(true);
 });
 test("authority change preserves intent sequence continuity; reconnect and resubscription require new explicit Join",async()=>{
  const f=await fixture(),a=await f.connect();await f.start(a);const original=await f.intent(a,"join"),save=f.place(a,original.participationId,0),receipt=await f.submit(a,save);
  const old=f.body(a,"join");a.state=(await ask(a.socket,"house.subscribe",{zoneId:"lounge",controllerToken:a.token})).snapshot;expect(a.state.puzzleRoster!.selfParticipationId).toBeNull();
  expect((await ask(a.socket,"house.puzzle.intent",old)).code).toBe("STALE_GENERATION");
  const newer=f.body(a,"join",{intentSequence:old.intentSequence});expect((await ask(a.socket,"house.puzzle.intent",newer)).ok).toBe(true);
  expect((await f.intent(a,"leave",{intentSequence:0})).code).toBe("STALE_INTENT");
  a.socket.disconnect();const returned=await f.connect(0,a.token);expect(returned.state.puzzleRoster!.selfParticipationId).toBeNull();expect(returned.state.durable.puzzle!.current!.placements).toHaveLength(1);
  expect(await f.submit(returned,save)).toEqual(receipt);expect((await f.submit(returned,f.place(returned,original.participationId,1))).code).toBe("PUZZLE_NOT_JOINED");
  const joined=await f.intent(returned,"join");expect(joined.ok).toBe(true);expect(joined.participationId).not.toBe(original.participationId);
 });
 test("owner reset confirmation detects Join/Leave ABA and old Start replay preserves the new roster",async()=>{
  const f=await fixture(),a=await f.connect(),b=await f.connect(1),original=await f.start(a);
  const stale=f.startCommand(a,true);await f.intent(b,"join");const left=await f.intent(b,"leave");await vi.waitFor(()=>expect(a.state.puzzleRoster!.revision).toBeGreaterThanOrEqual(left.rosterRevision));await f.roster(a,[]);
  expect((await f.submit(a,stale)).code).toBe("PUZZLE_RESET_CHANGED");
  await f.start(a,true);const joined=await f.intent(b,"join");await f.roster(a,[f.people[1]!.id]);
  expect(await f.submit(a,original.cmd)).toEqual(original.receipt);await f.roster(b,[f.people[1]!.id]);expect(b.state.puzzleRoster!.selfParticipationId).toBe(joined.participationId);
 });
 test("completion clears once and final receipt replay cannot clear later-round participants",async()=>{
  const f=await fixture(),a=await f.connect(),b=await f.connect(1);await f.start(a);const joined=await f.intent(a,"join");
  for(let n=0;n<23;n++)expect((await f.submit(a,f.place(a,joined.participationId,n))).ok).toBe(true);
  const final=f.place(a,joined.participationId,23),receipt=await f.submit(a,final);expect(receipt.result.completed).toBe(true);await f.roster(a,[]);
  expect((await f.intent(a,"join")).code).toBe("PUZZLE_COMPLETE");
  await f.start(b);const next=await f.intent(b,"join");await f.roster(b,[f.people[1]!.id]);
  expect(await f.submit(a,final)).toEqual(receipt);await f.roster(b,[f.people[1]!.id]);expect(b.state.puzzleRoster!.selfParticipationId).toBe(next.participationId);
 });
 test("activity exclusivity is checked on first effect in both directions; successful historical game receipt stays safe",async()=>{
  const f=await fixture(),a=await f.connect(),b=await f.connect(1);await f.start(a);
  const game=f.command("game.join",{roundId:null},0),receipt=await f.submit(a,game);expect(receipt.ok).toBe(true);
  expect((await f.intent(a,"join")).code).toBe("ACTIVITY_ACTIVE");
  await f.submit(a,f.command("game.leave",{roundId:receipt.result.roundId}));expect((await f.intent(a,"join")).ok).toBe(true);
  expect(await f.submit(a,game)).toEqual(receipt);
  const current=f.store.snapshot(f.people[0]!.id).game!;
  expect((await f.submit(a,f.command("game.join",{roundId:null},current.revision))).code).toBe("ACTIVITY_ACTIVE");
  await f.intent(a,"leave");const g=await f.submit(a,f.command("game.join",{roundId:null},current.revision));
  await f.submit(b,f.command("game.join",{roundId:g.result.roundId},current.revision+1));const gameState=f.store.snapshot(f.people[0]!.id).game!;
  await f.submit(a,f.command("game.ready",{roundId:g.result.roundId,rosterRevision:gameState.rosterRevision}));await f.submit(b,f.command("game.ready",{roundId:g.result.roundId,rosterRevision:gameState.rosterRevision}));
  b.socket.disconnect();await vi.waitFor(()=>expect(f.store.snapshot(f.people[0]!.id).game!.current!.status).toBe("paused"));
  expect((await f.intent(a,"join")).code).toBe("ACTIVITY_ACTIVE");
 });
 test("observer disconnect preserves consent while real takeover, exit and disconnect clear before failing game housekeeping",async()=>{
  const f=await fixture(),a=await f.connect(),b=await f.connect(1);await f.start(a);await f.intent(a,"join");await f.roster(b,[f.people[0]!.id]);
  const observer=await f.connect();observer.socket.disconnect();await new Promise(r=>setTimeout(r,30));expect(b.state.puzzleRoster!.memberIds).toEqual([f.people[0]!.id]);
  const replacement=await f.connect();replacement.state=(await ask(replacement.socket,"house.takeover",{controllerToken:replacement.token})).snapshot;
  expect(replacement.state.puzzleRoster!.memberIds).toEqual([]);await f.sit(replacement);await f.intent(replacement,"join");a.socket.disconnect();await f.roster(b,[f.people[0]!.id]);
  const failing=vi.spyOn(f.store,"gameLifecycle").mockImplementation(()=>{throw new Error("injected game housekeeping failure");});
  const bedroom=f.store.snapshot(f.people[0]!.id).residents[0]!.bedroomId;
  const exit=await ask(replacement.socket,"house.subscribe",{zoneId:bedroom,controllerToken:replacement.token});expect(exit.ok).toBe(true);await f.roster(b,[]);
  failing.mockRestore();replacement.state=(await ask(replacement.socket,"house.subscribe",{zoneId:"lounge",controllerToken:replacement.token})).snapshot;await f.sit(replacement);await f.intent(replacement,"join");await f.roster(b,[f.people[0]!.id]);
  vi.spyOn(f.store,"gameLifecycle").mockImplementation(()=>{throw new Error("injected game housekeeping failure");});replacement.socket.disconnect();await f.roster(b,[]);
 });
 test("old-round Leave and old participation cannot remove or use fresh consent after replacement",async()=>{
  const f=await fixture(),a=await f.connect(),b=await f.connect(1);await f.start(a);const first=await f.intent(b,"join"),oldLeave=f.body(b,"leave");
  await f.intent(b,"leave");await vi.waitFor(()=>expect(a.state.puzzleRoster!.memberIds).toEqual([]));
  await new Promise(r=>setTimeout(r,120));await f.start(a,true);const joined=await f.intent(b,"join");
  const stale={...oldLeave,intentSequence:++b.sequence,requestId:randomUUID()};expect((await ask(b.socket,"house.puzzle.intent",stale)).code).toBe("PUZZLE_STALE_ROUND");
  await f.roster(b,[f.people[1]!.id]);expect(b.state.puzzleRoster!.selfParticipationId).toBe(joined.participationId);
  expect((await f.submit(b,f.place(b,first.participationId,0))).code).toBe("PUZZLE_NOT_JOINED");
  expect((await f.submit(b,f.place(b,joined.participationId,0))).ok).toBe(true);
 });
 test("denied takeover has no effect, but a valid takeover clears consent before unrelated storage failure",async()=>{
  const f=await fixture(),a=await f.connect(),b=await f.connect(1);await f.start(a);const joined=await f.intent(a,"join");await f.roster(a,[f.people[0]!.id]);
  const raw=io(f.base,{auth:{worldVersion:HOUSE_WORLD_VERSION},transports:["websocket"],reconnection:false,extraHeaders:{Origin:f.base,Cookie:"house_session="+f.people[0]!.token}});
  cleanup.push(()=>raw.disconnect());await new Promise<void>((r,j)=>{raw.once("connect",r);raw.once("connect_error",j);});
  expect((await ask(raw,"house.takeover",{controllerToken:randomUUID()})).code).toBe("NOT_SUBSCRIBED");
  expect((await f.submit(a,f.place(a,joined.participationId,0))).ok).toBe(true);await vi.waitFor(()=>expect(b.state.durable.puzzle!.current!.placements).toHaveLength(1));
  const token=randomUUID(),published=new Promise<void>(resolve=>b.socket.once("house.snapshot",()=>resolve()));expect((await ask(raw,"house.subscribe",{zoneId:"lounge",controllerToken:token})).snapshot.controller).toBe(false);await published;
  const fault=vi.spyOn(f.store,"maintainGames").mockImplementation(()=>{throw new Error("housekeeping failed before takeover acquisition");});
  expect((await ask(raw,"house.takeover",{controllerToken:token})).code).toBe("STORAGE_UNAVAILABLE");fault.mockRestore();await f.roster(b,[]);
  expect((await f.submit(a,f.place(a,joined.participationId,1))).code).toBe("PUZZLE_NOT_JOINED");
 });
 test("observer takeover denied by revoked bedroom access preserves the lounge controller's participation",async()=>{
  const f=await fixture(),a=await f.connect(),b=await f.connect(1);await f.start(a);const joined=await f.intent(a,"join");
  const bedroom=f.store.snapshot(f.people[1]!.id).residents.find(r=>r.id===f.people[1]!.id)!.bedroomId;
  const room=()=>f.store.snapshot(f.people[1]!.id,bedroom).room!;
  f.store.execute(f.people[1]!.id,f.command("room.configure",{roomId:bedroom,open:true,palette:"sage"},room().revision));
  const observer=await f.connect();observer.state=(await ask(observer.socket,"house.subscribe",{zoneId:bedroom,controllerToken:observer.token})).snapshot;
  expect(observer.state.controller).toBe(false);expect(observer.state.durable.zoneId).toBe(bedroom);
  f.store.execute(f.people[1]!.id,f.command("room.configure",{roomId:bedroom,open:false,palette:"sage"},room().revision));
  expect((await ask(observer.socket,"house.takeover",{controllerToken:observer.token})).code).toBe("FORBIDDEN");
  expect((await f.submit(a,f.place(a,joined.participationId,0))).ok).toBe(true);
  await f.roster(a,[f.people[0]!.id]);expect(a.state.puzzleRoster!.selfParticipationId).toBe(joined.participationId);
 });
 test("invalid takeover shapes and denied resubscription preserve current picture consent",async()=>{
  const f=await fixture(),a=await f.connect();await f.start(a);const joined=await f.intent(a,"join"),observer=await f.connect();
  expect((await ask(observer.socket,"house.takeover",{controllerToken:123})).code).toBe("INVALID_INPUT");
  expect((await ask(observer.socket,"house.takeover",{controllerToken:observer.token,unsupported:true})).code).toBe("INVALID_INPUT");
  expect((await ask(a.socket,"house.subscribe",{zoneId:"lounge",controllerToken:a.token+"\n"})).code).toBe("INVALID_INPUT");
  expect((await ask(a.socket,"house.subscribe",{zoneId:"lounge",controllerToken:a.token,unsupported:true})).code).toBe("INVALID_INPUT");
  const closed=f.store.snapshot(f.people[1]!.id).residents.find(r=>r.id===f.people[1]!.id)!.bedroomId;
  expect((await ask(a.socket,"house.subscribe",{zoneId:closed,controllerToken:a.token})).code).toBe("FORBIDDEN");
  expect((await f.submit(a,f.place(a,joined.participationId,0))).ok).toBe(true);
 }); test("committed receipt and memory reconciliation do not query SQLite after the transaction",async()=>{
  const f=await fixture(),a=await f.connect(),cmd=f.startCommand(a),original=f.store.executeWithEffects.bind(f.store);const faults: ReturnType<typeof vi.spyOn>[]=[];
  const hook=vi.spyOn(f.store,"executeWithEffects").mockImplementation((...args)=>{
   const outcome=original(...args);
   for(const method of ["snapshot","session","me"] as const)faults.push(vi.spyOn(f.store,method).mockImplementation(()=>{throw new Error("forbidden postcommit database read");}));
   return outcome;
  });
  const receipt=await f.submit(a,cmd);for(const fault of faults)fault.mockRestore();hook.mockRestore();
  expect(receipt.ok).toBe(true);expect(f.table().current!.id).toBe(receipt.result.roundId);expect(f.store.executeWithEffects(f.people[0]!.id,cmd,{isController:true,zoneId:"lounge",controlledInLounge:[]})).toEqual({receipt,effect:null});
 });
 test("session revocation and member removal clear consent with no transient database rows",async()=>{
  const f=await fixture(),a=await f.connect(),b=await f.connect(1);await f.start(a);await f.intent(a,"join");await f.intent(b,"join");await f.roster(a,[f.people[0]!.id,f.people[1]!.id]);
  const before=f.store.db.prepare("SELECT COUNT(*) AS n FROM receipts").get();
  vi.spyOn(f.store,"gameLifecycle").mockImplementation(()=>{throw new Error("game cleanup unavailable");});
  f.store.db.prepare("UPDATE sessions SET expires_at=? WHERE identity_id=?").run(Date.now()-1,f.people[1]!.id);
  await vi.waitFor(()=>expect(b.socket.connected).toBe(false),{timeout:2200});vi.restoreAllMocks();
  await f.roster(a,[f.people[0]!.id]);expect(f.store.db.prepare("SELECT COUNT(*) AS n FROM receipts").get()).toEqual(before);
  f.store.db.prepare("UPDATE sessions SET expires_at=? WHERE identity_id=?").run(Date.now()+60000,f.people[1]!.id);
  const returned=await f.connect(1);expect(returned.state.puzzleRoster!.selfParticipationId).toBeNull();await f.intent(returned,"join");
  expect((await f.submit(a,f.command("house.remove",{memberId:f.people[1]!.id}))).ok).toBe(true);await f.roster(a,[f.people[0]!.id]);
 }); test("HTTP and Socket share receipts; current zone/token/member authority precedes replay; static content is reachable",async()=>{
  const f=await fixture(),a=await f.connect(),b=await f.connect(1);const started=await f.start(a);expect(await f.http(a,started.cmd)).toEqual({status:200,body:started.receipt});
  const joined=await f.intent(a,"join"),cmd=f.place(a,joined.participationId,0),saved=await f.http(a,cmd);expect(saved.status).toBe(200);expect(await f.submit(a,cmd)).toEqual(saved.body);
  expect((await f.http(a,cmd,{"X-House-Controller-Token":randomUUID()})).body.code).toBe("NOT_CONTROLLER");
  const wrong=await f.http(a,f.place(a,joined.participationId,1,2));expect(wrong.status).toBe(409);expect(wrong.body.code).toBe("PUZZLE_WRONG_PLACE");
  const bedroom=f.store.snapshot(f.people[0]!.id).residents[0]!.bedroomId;a.state=(await ask(a.socket,"house.subscribe",{zoneId:bedroom,controllerToken:a.token})).snapshot;expect(a.state.puzzleRoster).toBeNull();expect(a.state.durable.puzzle).toBeNull();
  expect((await f.http(a,cmd)).body.code).toBe("STALE_ZONE");
  for(const path of ["/house-puzzle-content.js","/house-puzzle-rules.js","/assets/pictures/rainy-nook-v1.svg"])expect((await fetch(f.base+path)).status,path).toBe(200);
  const removed=f.command("house.remove",{memberId:f.people[1]!.id});a.state=(await ask(a.socket,"house.subscribe",{zoneId:"lounge",controllerToken:a.token})).snapshot;expect((await f.submit(a,removed)).ok).toBe(true);
  const beforeDenied=f.table(),denied=await f.http(b,started.cmd);expect(denied.body.ok).toBe(false);expect(["FORBIDDEN","NOT_CONTROLLER"]).toContain(denied.body.code);expect(f.table()).toEqual(beforeDenied);const outsider=await f.connect(6);expect(outsider.response.code).toBe("FORBIDDEN");
 });
});