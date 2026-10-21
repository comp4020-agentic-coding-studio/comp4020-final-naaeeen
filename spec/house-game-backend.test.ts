import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, test, vi } from "vitest";
import { HouseStore } from "../src/house-store.ts";
import type { HouseCommand, HouseGameControl } from "../src/house-contract.ts";
const cleanups: (()=>unknown)[]=[];
afterEach(()=>{vi.restoreAllMocks();for(const fn of cleanups.splice(0).reverse())fn();});
function fixture(){
 const root=mkdtempSync(join(tmpdir(),"house-game-")),path=join(root,"house.sqlite");cleanups.push(()=>rmSync(root,{recursive:true,force:true}));
 const store=new HouseStore(path);cleanups.push(()=>store.close());const people=[store.ensureSession(),store.ensureSession(),store.ensureSession()];
 store.execute(people[0]!.id,{commandId:randomUUID(),type:"house.create",payload:{capacity:3,name:"Ada",colour:"sage"}});
 const home=store.me(people[0]!.id).home!;for(const p of people.slice(1))store.execute(p.id,{commandId:randomUUID(),type:"house.join",payload:{code:home.code,name:"Friend",colour:"rose"}});
 const control:HouseGameControl={isController:true,zoneId:"lounge",controlledInLounge:people.map(p=>p.id)};
 const command=(type:string,payload:Record<string,unknown>,expectedRevision?:number):HouseCommand=>({commandId:randomUUID(),type,houseId:home.id,payload,...(expectedRevision===undefined?{}:{expectedRevision})});
 const game=()=>store.snapshot(people[0]!.id).game!;
 const act=(n:number,type:string,payload:Record<string,unknown>,rev?:number)=>store.execute(people[n]!.id,command(type,payload,rev),control);
 function start(){act(0,"game.join",{roundId:null},game().revision);const roundId=game().current!.roundId;act(1,"game.join",{roundId},game().revision);const rosterRevision=game().rosterRevision;act(0,"game.ready",{roundId,rosterRevision});act(1,"game.ready",{roundId,rosterRevision});return roundId;}
 return {store,path,people,home,control,command,game,act,start};
}
const error=(code:string)=>expect.objectContaining({code});
describe("durable Four-in-a-row adapter",()=>{
 test("migrates v2 additively and preserves old receipts",()=>{
  const f=fixture(),before=f.store.snapshot(f.people[0]!.id),old=f.command("chat.send",{zoneId:"lounge",text:"retained"}),receipt=f.store.execute(f.people[0]!.id,old);
  f.store.close();const db=new DatabaseSync(f.path);db.exec("DROP TABLE house_voice; DROP TABLE game_tables; PRAGMA user_version=2");db.close();
  const next=new HouseStore(f.path);cleanups.push(()=>next.close());expect(next.db.prepare("PRAGMA user_version").get()).toEqual({user_version:4});
  expect(next.snapshot(f.people[0]!.id).residents).toEqual(before.residents);expect(next.execute(f.people[0]!.id,old)).toEqual(receipt);
  expect(next.snapshot(f.people[0]!.id).game).toEqual({revision:0,rosterRevision:0,current:null,latestResult:null});
 });
 test("serializes Join, composes same-roster Ready, rejects watcher/turn/revision and absent authority",()=>{
  const f=fixture();f.act(0,"game.join",{roundId:null},0);const roundId=f.game().current!.roundId;
  expect(()=>f.act(1,"game.join",{roundId},0)).toThrowError(error("GAME_STALE_REVISION"));f.act(1,"game.join",{roundId},1);
  expect(()=>f.act(2,"game.join",{roundId},2)).toThrowError(error("GAME_TABLE_FULL"));const rosterRevision=f.game().rosterRevision;
  f.act(0,"game.ready",{roundId,rosterRevision});f.act(1,"game.ready",{roundId,rosterRevision});expect(f.game().current!.status).toBe("active");
  expect(()=>f.act(2,"game.move",{roundId,column:0},4)).toThrowError(error("GAME_NOT_SEATED"));
  expect(()=>f.act(1,"game.move",{roundId,column:0},4)).toThrowError(error("GAME_NOT_YOUR_TURN"));f.act(0,"game.move",{roundId,column:0},4);
  expect(()=>f.act(1,"game.move",{roundId,column:1},4)).toThrowError(error("GAME_STALE_REVISION"));
  expect(()=>f.store.execute(f.people[1]!.id,f.command("game.move",{roundId,column:1},5))).toThrowError(error("NOT_CONTROLLER"));
  expect(f.store.snapshot(f.people[0]!.id,f.store.snapshot(f.people[0]!.id).residents[0]!.bedroomId).game).toBeNull();
 });
 test("commits due maintenance before rejected action rollback; idle sweeps do no writes",()=>{
  const f=fixture(),base=Date.now(),clock=vi.spyOn(Date,"now").mockReturnValue(base),roundId=f.start();clock.mockReturnValue(base+300000);
  expect(()=>f.act(0,"game.move",{roundId,column:0},4)).toThrowError(error("GAME_WRONG_ROUND"));expect(f.game().latestResult!.reason).toBe("inactive");
  const before=f.store.db.prepare("SELECT total_changes() AS n").get();for(let n=0;n<5;n++)expect(f.store.maintainGames()).toBe(false);expect(f.store.db.prepare("SELECT total_changes() AS n").get()).toEqual(before);
 });
 test("state and receipt roll back together, old UUID returns original after newer round and restart",()=>{
  const f=fixture(),roundId=f.start(),move=f.command("game.move",{roundId,column:0},f.game().revision);
  f.store.db.exec("CREATE TRIGGER fail_game_receipt BEFORE INSERT ON receipts BEGIN SELECT RAISE(ABORT,'fixture'); END");
  expect(()=>f.store.execute(f.people[0]!.id,move,f.control)).toThrowError(error("STORAGE_UNAVAILABLE"));expect(f.game().current!.cells.every(x=>x===null)).toBe(true);
  f.store.db.exec("DROP TRIGGER fail_game_receipt");const receipt=f.store.execute(f.people[0]!.id,move,f.control);f.act(1,"game.leave",{roundId});f.act(0,"game.join",{roundId:null},f.game().revision);
  expect(f.store.execute(f.people[0]!.id,move,f.control)).toEqual(receipt);expect(()=>f.store.execute(f.people[0]!.id,{...move,payload:{roundId,column:1}},f.control)).toThrowError(error("COMMAND_ID_REUSED"));
  f.store.close();const next=new HouseStore(f.path);cleanups.push(()=>next.close());expect(next.execute(f.people[0]!.id,move,f.control)).toEqual(receipt);
 });
 test("restart retains earliest recovery deadline and invalidates partial resume consent",()=>{
  const f=fixture(),base=Date.now(),clock=vi.spyOn(Date,"now").mockReturnValue(base),roundId=f.start();f.store.gameLifecycle(f.people[0]!.id,"disconnect");
  const paused=f.game();expect(paused.current!.recoveryDeadlineAt).toBe(base+90000);f.act(0,"game.resume",{roundId,resumeRevision:paused.current!.resumeRevision});
  clock.mockReturnValue(base+1000);f.store.close();const next=new HouseStore(f.path);cleanups.push(()=>next.close());const restored=next.snapshot(f.people[0]!.id).game!;
  expect(restored.current).toMatchObject({status:"paused",recoveryDeadlineAt:base+90000,resume:[false,false]});
  expect(()=>next.execute(f.people[0]!.id,f.command("game.resume",{roundId,resumeRevision:paused.current!.resumeRevision}),f.control)).toThrowError(error("GAME_STALE_RESUME"));
  for(const p of f.people.slice(0,2))next.execute(p.id,f.command("game.resume",{roundId,resumeRevision:restored.current!.resumeRevision}),f.control);
  expect(next.snapshot(f.people[0]!.id).game!.current!.status).toBe("active");next.gameLifecycle(f.people[1]!.id,"disconnect");clock.mockReturnValue(base+92000);next.maintainGames();expect(next.snapshot(f.people[0]!.id).game!.latestResult!.reason).toBe("recovery_expired");
 });
 test("membership removal ends game transactionally; Leave survives racing Move",()=>{
  const f=fixture(),roundId=f.start();f.act(0,"game.move",{roundId,column:2},f.game().revision);f.act(1,"game.leave",{roundId});expect(f.game().latestResult!.reason).toBe("player_left");
  f.start();f.store.execute(f.people[0]!.id,f.command("house.remove",{memberId:f.people[1]!.id}));expect(f.game().latestResult!.reason).toBe("member_removed");expect(f.store.me(f.people[1]!.id).home).toBeNull();
 });
 test("empty tables reject every client-created round ID, including older-than-latest replay",()=>{
  const f=fixture(),old=f.start();f.act(0,"game.leave",{roundId:old});const newer=f.start();f.act(0,"game.leave",{roundId:newer});
  expect(()=>f.act(0,"game.join",{roundId:old},f.game().revision)).toThrowError(error("GAME_WRONG_ROUND"));
  expect(f.game().current).toBeNull();
 });
 test("captures one server time for maintenance and the command at the idle boundary",()=>{
  const f=fixture(),base=Date.now();vi.spyOn(Date,"now").mockReturnValue(base);const roundId=f.start();
  vi.mocked(Date.now).mockReturnValueOnce(base+299999).mockReturnValue(base+300000);
  const receipt=f.act(0,"game.move",{roundId,column:0},4);expect(receipt.result!.code).toBe("moved");
  expect(f.game().current!.lastMoveAt).toBe(base+299999);
 });
 test("one bounded table across repeated rounds; rejects corrupt restored state",()=>{
  const f=fixture();for(let n=0;n<12;n++){const roundId=f.start();f.act(0,"game.leave",{roundId});}
  expect(f.store.db.prepare("SELECT COUNT(*) AS n FROM game_tables").get()).toEqual({n:1});expect(Buffer.byteLength(JSON.stringify(f.game()))).toBeLessThan(4096);expect((f.store as any).statements.size).toBeLessThanOrEqual(96);
  f.store.db.exec("UPDATE game_tables SET state='{}'");expect(()=>f.game()).toThrowError(error("STORAGE_UNAVAILABLE"));
 });
});

