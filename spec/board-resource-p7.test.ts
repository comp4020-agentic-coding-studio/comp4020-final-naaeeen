import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { spawnSync } from "node:child_process";
import { describe, expect, test } from "vitest";
import ts from "typescript";
import { readFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { encodeBoardReceipt } from "../src/board-receipt-codec.ts";
import { PUZZLE_ILLUSTRATIONS } from "../public/house-puzzle-content.js";
import * as helpers from "../tools/board-resource-p7.mjs";
const p7:any=helpers;
const id=(n:number)=>"00000000-0000-4000-8000-"+n.toString(16).padStart(12,"0");
const hash=(s:string)=>createHash("sha256").update(s).digest("hex");
const receipt=(n=1)=>({ok:true,id:id(n),houseId:id(50),sequence:n,elements:[{id:"note",version:n,text:"x".repeat(11000)}]});
function fixtureDB(encoding="UTF-8") {
 const db=new DatabaseSync(":memory:");db.exec("PRAGMA encoding='"+encoding+"'; CREATE TABLE receipts(actor_id TEXT,id TEXT,response TEXT)");return db;
}
describe("P7 exact encoded receipt observations",()=>{
 test("deduplicates equal ACKs without retaining response copies; rejects a different ACK for the same actor/command",()=>{
  const ledger=p7.newBoardACKLedger(),r=receipt(),request={id:r.id,houseId:r.houseId};
  expect(p7.recordBoardACK(ledger,id(10),"patch",request,r)).toBe(true);
  expect(p7.recordBoardACK(ledger,id(10),"patch",request,r)).toBe(false);
  const before=structuredClone([...ledger.entries.values()]);
  expect(()=>p7.recordBoardACK(ledger,id(10),"patch",request,{...r,sequence:2})).toThrowError("BOARD_ACK_CHANGED_FOR_COMMAND");
  expect([...ledger.entries.values()]).toEqual(before);expect(ledger.conflicts).toBe(1);
  expect(Object.keys(before[0]).sort()).toEqual(["actorId","digest","houseId","id","kind"]);
 });
 test("compares actor-bound decoded persisted responses, including changed payload with a valid envelope",()=>{
  const db=fixtureDB();try{
   const ledger=p7.newBoardACKLedger(),r=receipt();p7.recordBoardACK(ledger,id(10),"patch",r,r);
   db.prepare("INSERT INTO receipts VALUES(?,?,?)").run(id(10),r.id,encodeBoardReceipt(r as any,"UTF-8"));
   const entry=[...ledger.entries.values()][0];expect(p7.verifyReceiptBatch(db,"UTF-8",[entry]).verified).toBe(1);
   expect(p7.verifyReceiptBatch(db,"UTF-8",[{...entry,actorId:id(11)}]).missing).toBe(1);
   db.prepare("UPDATE receipts SET response=?").run(encodeBoardReceipt({...r,elements:[{id:"note",version:99,text:"later"}]} as any,"UTF-8"));
   expect(p7.verifyReceiptBatch(db,"UTF-8",[entry]).digestMismatches).toBe(1);
   expect(p7.verifyReceiptBatch(db,"UTF-8",[entry,entry]).duplicates).toBe(1);
  }finally{db.close();}
 });
 test("the complete post-close verifier opens readonly, checks every stored row and rejects an omitted ledger row",()=>{
  const dir=mkdtempSync(join(tmpdir(),"p7-receipt-calibration-")),path=join(dir,"board.sqlite"),db=new DatabaseSync(path),ledger=p7.newBoardACKLedger();
  try{
   db.exec("CREATE TABLE receipts(actor_id TEXT,id TEXT,response TEXT)");
   for(const n of [1,2]){const r=receipt(n);p7.recordBoardACK(ledger,id(10),"patch",r,r);db.prepare("INSERT INTO receipts VALUES(?,?,?)").run(id(10),r.id,encodeBoardReceipt(r as any,"UTF-8"));}
   db.close();expect(p7.gradeReceiptReplay(p7.verifyClosedBoardLedger(path,ledger))).toBe(true);
   const partial={...ledger,entries:new Map([...ledger.entries].slice(0,1))};expect(p7.gradeReceiptReplay(p7.verifyClosedBoardLedger(path,partial))).toBe(false);
  }finally{try{db.close();}catch{}rmSync(dir,{recursive:true,force:true});}
 });
 test("counts actual TEXT encoding and tagged BLOB bytes rather than decoded JSON or characters",()=>{
  const db=fixtureDB("UTF-16le");try{
   const text=JSON.stringify(receipt()),blob=encodeBoardReceipt(receipt(2) as any,"UTF-16le");expect(Buffer.isBuffer(blob)).toBe(true);
   db.prepare("INSERT INTO receipts VALUES(?,?,?)").run(id(10),id(1),text);db.prepare("INSERT INTO receipts VALUES(?,?,?)").run(id(10),id(2),blob);
   const observed=p7.receiptStorage(db);expect(observed.encoding).toBe("UTF-16le");expect(observed.storedBytes).toBe(text.length*2+(blob as Buffer).byteLength);
   expect(observed.storageTypes.map((x:any)=>x.type).sort()).toEqual(["blob","text"]);
  }finally{db.close();}
 });
 test("requires full unique-row/digest coverage and the independently observed16MiB growth ceiling",()=>{
  const verification={actualRows:2,uniqueLedgerEntries:2,verified:2,compared:2,seenEntries:2,acknowledgements:2,conflicts:0,missing:0,metadataInvalid:0,decodeErrors:0,digestMismatches:0,duplicates:0,ledgerDigest:"a".repeat(64),batchMaximum:64};
  expect(p7.gradeReceiptReplay(verification)).toBe(true);
  for(const change of [({verified:1}),({actualRows:3}),({uniqueLedgerEntries:1}),({digestMismatches:1}),({duplicates:1}),({ledgerDigest:null}),({acknowledgements:Infinity}),({batchMaximum:0})])expect(p7.gradeReceiptReplay({...verification,...change})).toBe(false);
  const storage=(bytes:number)=>({count:2,storedBytes:bytes,encoding:"UTF-8",storageTypes:[{type:"blob",count:2,storedBytes:bytes}]});
  const e={baseline:{boardReceipts:storage(100),receipts:storage(100)},final:{boardReceipts:storage(1024*1024),receipts:storage(200)}};
  expect(p7.gradeReceiptGrowth(e,16*1024*1024)).toBe(true);
  e.final.boardReceipts=storage(17*1024*1024);expect(p7.gradeReceiptGrowth(e,16*1024*1024)).toBe(false);
 });
});
const art=PUZZLE_ILLUSTRATIONS[0]!;
const scenario={startSeconds:260,joinStartSeconds:262,joinIntervalSeconds:1,placementStartSeconds:269,placementIntervalSeconds:.5,maximumScheduleLagMs:1000,visibleP95Ms:1000,illustrationId:art.id,illustrationVersion:art.version,illustrationDigest:art.digest,pieces:art.pieces.map(p=>({pieceId:p.id,destination:p.destination}))};
function pictureFixture(){
 const evidence:any={status:"COMPLETE",actions:[],admissions:[],invalidFrames:0,conflictingFrames:0},rawSnapshots:any[]=[];
 for(let houseIndex=0;houseIndex<2;houseIndex++){
  const memberIds=Array.from({length:6},(_,i)=>id(100+houseIndex*10+i)),roundId=id(60+houseIndex),epoch=id(2),houseId=id(50+houseIndex),roundHash=hash(roundId);let head=10+houseIndex*100,placements:any[]=[],participants:(string|null)[]=Array(6).fill(null),members:string[]=[];
  for(const [stepIndex,step] of p7.picturePlan(scenario).entries()){
   const a:any={houseIndex,stepIndex,type:step.type,memberIndex:step.memberIndex,scheduledOffsetSeconds:step.atSeconds,sendLagMs:1,status:"VISIBLE",roundHash,observed:[]};let revision=1;
   if(step.type==="start"){a.beforeRosterRevision=head;head++;a.ack={ok:true,roundHash,entityRevision:1,puzzleRevision:1};}
   else if(step.type==="join"){
    head++;participants[step.memberIndex]=id(300+houseIndex*10+step.memberIndex);members=memberIds.slice(0,step.memberIndex+1);
    const request={requestId:id(400+houseIndex*10+step.memberIndex),intentSequence:1,roundId};
    a.requestHash=hash(request.requestId);a.ack=p7.puzzleIntentACK({ok:true,...request,mode:"join",participationId:participants[step.memberIndex],rosterRevision:head},request);
   }else{
    const i=stepIndex-7;revision=i+2;placements.push({pieceId:step.pieceId,destination:step.destination,actorId:memberIds[step.memberIndex]});a.pieceId=step.pieceId;a.destination=step.destination;
    a.ack={ok:true,roundHash,entityRevision:revision,puzzleRevision:revision,pieceId:step.pieceId,destination:step.destination,completed:i===23};
    if(i===23){head++;members=[];participants=Array(6).fill(null);}
   }
   a.rosterRevision=head;
   for(let m=0;m<6;m++){
    const authority={serverEpoch:epoch,generation:7+houseIndex*10+m,accessGeneration:12+houseIndex*10+m,controller:true};
    const scope={houseIndex,houseId,selfId:memberIds[m],memberIds,...authority};
    if(stepIndex===0)evidence.admissions.push({houseIndex,memberIndex:m,viewIndex:houseIndex*12+m*2,connectionOrdinal:1,serverEpochHash:hash(epoch),generation:authority.generation,accessGeneration:authority.accessGeneration,controller:true});
    const raw={...authority,durable:{house:{id:houseId},selfId:memberIds[m],zoneId:"lounge",puzzle:{revision,current:{id:roundId,ruleset:1,illustrationId:art.id,illustrationVersion:art.version,illustrationDigest:art.digest,placements:structuredClone(placements),completed:stepIndex===30}}},puzzleRoster:{serverEpoch:epoch,houseId,roundId,revision:head,memberIds:[...members],selfParticipationId:participants[m]}};
    a.observed.push({viewIndex:houseIndex*12+m*2,latencyMs:100,frame:p7.normalizePictureFrame(raw,scope)});rawSnapshots.push({raw,scope});
   }
   evidence.actions.push(a);
  }
 }
 return {evidence,rawSnapshots};
}
describe("P7 raw picture observations",()=>{
 test("freezes the after-game schedule and372actual targets from all6contributors",()=>{
  const plan=p7.picturePlan(scenario);expect(plan).toHaveLength(31);expect(plan[0].atSeconds).toBe(260);expect(plan[6].atSeconds).toBe(267);expect(plan[30].atSeconds).toBe(280.5);
  const {evidence}=pictureFixture();expect(evidence.actions.reduce((n:number,a:any)=>n+a.observed.length,0)).toBe(372);expect(p7.gradePictureEvidence(scenario,evidence)).toBe(true);
 });
 test("rejects missing activity, wrong actor/state, coalesced future heads, duplicate targets and uncleared completion",()=>{
  const {evidence}=pictureFixture();
  for(const mutate of [
   (e:any)=>e.actions=[],
   (e:any)=>e.invalidFrames=1,
   (e:any)=>e.conflictingFrames=1,
   (e:any)=>e.actions[7].sendLagMs=501,
   (e:any)=>e.actions[7].observed[0].frame.placements[0].memberIndex=5,
   (e:any)=>e.actions[7].observed[0].frame.completed=true,
   (e:any)=>e.actions[7].observed[0].frame.puzzleRevision++,
   (e:any)=>e.actions[1].observed[0].frame.rosterRevision++,
   (e:any)=>e.actions[1].observed[0].frame.selfParticipationHash=null,
   (e:any)=>e.actions[0].observed[1]=e.actions[0].observed[0],
   (e:any)=>e.actions[30].observed[0].frame.rosterMembers=[0,1,2,3,4,5],
   (e:any)=>e.actions[30].ack.completed=false,
   (e:any)=>e.actions[1].ack.requestHash="b".repeat(64),
   (e:any)=>e.actions[7].memberIndex=5,
  ]){const changed=structuredClone(evidence);mutate(changed);expect(p7.gradePictureEvidence(scenario,changed)).toBe(false);}
 });
 test("normalizes actual raw identity/roster fields and denies wrong actor, private/wrong-house scope and stale consent",()=>{
  const {evidence,rawSnapshots}=pictureFixture(),source=rawSnapshots[7*6];
  const expected={houseIndex:0,puzzleRevision:2,roundHash:evidence.actions[7].roundHash,illustrationId:art.id,illustrationVersion:art.version,illustrationDigest:art.digest,completed:false,placements:[{pieceId:art.pieces[0].id,destination:0,memberIndex:0}],rosterRevision:evidence.actions[7].rosterRevision,rosterMembers:[0,1,2,3,4,5],selfHashes:evidence.actions.slice(1,7).map((a:any)=>a.ack.participationHash),authorities:evidence.admissions.filter((a:any)=>a.houseIndex===0)};
  expect(p7.pictureFrameMatches(p7.normalizePictureFrame(source.raw,source.scope),expected)).toBe(true);
  for(const mutate of [
   (r:any)=>r.durable.puzzle.current.placements[0].actorId=id(999),
   (r:any)=>r.durable.zoneId="bedroom",
   (r:any)=>r.puzzleRoster.houseId=id(999),
   (r:any)=>r.puzzleRoster.selfParticipationId=id(999),
   (r:any)=>r.puzzleRoster.memberIds.pop(),
  ]){const wrong=structuredClone(source.raw);mutate(wrong);expect(p7.pictureFrameMatches(p7.normalizePictureFrame(wrong,source.scope),expected)).toBe(false);}
 });
 test("checks original ACK request/round/sequence binding before recording direct consent",()=>{
  const request={requestId:id(400),intentSequence:1,roundId:id(60)},ack={ok:true,...request,mode:"join",participationId:id(300),rosterRevision:11};
  expect(p7.puzzleIntentACK(ack,request).mode).toBe("join");
  for(const wrong of [{...ack,requestId:id(401)},{...ack,roundId:id(61)},{...ack,intentSequence:2},{...ack,participationId:null}])expect(()=>p7.puzzleIntentACK(wrong,request)).toThrowError("PICTURE_INTENT_ACK");
 });
 test("prospective protocols cannot claim a frozen runtime or replace old accepted evidence",()=>{
  const current=JSON.parse(readFileSync(new URL("../evaluation/board-resource.protocol.json",import.meta.url),"utf8"));
  const combined=JSON.parse(readFileSync(new URL("../docs/post-crit/evidence/p7-combined-resource.protocol.json",import.meta.url),"utf8"));
  const oldCombined=JSON.parse(readFileSync(new URL("../docs/post-crit/evidence/p7-combined-preimage.protocol.json",import.meta.url),"utf8"));
  if(current.sourceHashes===null)expect(current.sourceManifestSHA256).toBeNull();
  else {expect(Object.keys(current.sourceHashes).sort()).toEqual([...current.sourceFiles].sort());expect(current.sourceManifestSHA256).toMatch(/^[a-f0-9]{64}$/);}
  expect(combined.gameScenario).toEqual(oldCombined.gameScenario);
  expect(current.storageAcceptance.maximumGrowthBytes).toBe(16*1024*1024);expect(combined.pictureScenario.expectedActions).toBe(62);expect(combined.pictureScenario.expectedTargets).toBe(372);
 });
 test("retains all original criterion fields and the exact124/733game registration",()=>{
  const base=JSON.parse(readFileSync(new URL("../docs/post-crit/evidence/p7-resource-preimage.protocol.json",import.meta.url),"utf8"));
  const current=JSON.parse(readFileSync(new URL("../evaluation/board-resource.protocol.json",import.meta.url),"utf8"));
  for(const key of ["durationSeconds","automaticRetry","configuration","fixture","workload","slowReader","negativeControls","bounds","measurement","classification","limitations"])expect(current[key]).toEqual(base[key]);
 });
});


describe("P7 actual picture packet construction",()=>{
 const source=readFileSync(new URL("../tools/board-resource.mjs",import.meta.url),"utf8");
 const ast=ts.createSourceFile("instrument.mjs",source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),commands:string[]=[],requests:string[]=[];
 function find(node:ts.Node){if(ts.isFunctionDeclaration(node)&&node.name?.text==="playPicture"){
  function scan(n:ts.Node){if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==="command")commands.push(n.initializer!.getText(ast));if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==="request")requests.push(n.initializer!.getText(ast));ts.forEachChild(n,scan);}scan(node);
 }else ts.forEachChild(node,find);}find(ast);
 const snapshot={serverEpoch:id(2),accessGeneration:12,generation:7,puzzleRoster:{serverEpoch:id(2),revision:10},durable:{puzzle:{revision:0,current:null}}};
 test("Start uses actual house/controller/epoch/roster fields and cannot silently join",()=>{
  expect(commands).toHaveLength(2);
  const command=new Function("randomUUID","h","snapshot","scenario","return ("+commands[0]+");")(()=>id(600),{id:id(50)},snapshot,scenario);
  expect(command).toEqual({commandId:id(600),houseId:id(50),type:"puzzle.start",expectedRevision:0,payload:{expectedRoundId:null,illustrationId:art.id,illustrationVersion:1,confirmUnfinished:false,authority:{serverEpoch:id(2),accessGeneration:12,generation:7},expectedRoster:{serverEpoch:id(2),revision:10}}});
 });
 test("Place uses its actor's original participation and omits expectedRevision",()=>{
  const command=new Function("randomUUID","h","roundId","participants","step","return ("+commands[1]+");")(()=>id(601),{id:id(50)},id(60),new Map([[2,id(302)]]),{memberIndex:2,pieceId:art.pieces[2].id,destination:2});
  expect(command).toEqual({commandId:id(601),houseId:id(50),type:"puzzle.place",payload:{roundId:id(60),participationId:id(302),pieceId:art.pieces[2].id,destination:2}});expect(command).not.toHaveProperty("expectedRevision");
 });
 test("Direct Join preserves exact authority and increasing connection intent",()=>{
  const actor={generation:7,pictureIntentSequence:0};
  const build=new Function("actor","snapshot","randomUUID","roundId","return ("+requests[0]+");");
  expect(build(actor,snapshot,()=>id(602),id(60))).toEqual({generation:7,zoneId:"lounge",serverEpoch:id(2),accessGeneration:12,intentSequence:1,requestId:id(602),roundId:id(60),mode:"join"});
  expect(build(actor,snapshot,()=>id(603),id(60)).intentSequence).toBe(2);
 });
});


describe("P7 reviewer regression: complete source bindings",()=>{
 const source=readFileSync(new URL("../tools/board-resource.mjs",import.meta.url),"utf8"),ast=ts.createSourceFile("instrument.mjs",source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 let freezeSource="";function find(n:ts.Node){if(ts.isFunctionDeclaration(n)&&n.name?.text==="freeze")freezeSource=n.getText(ast);ts.forEachChild(n,find);}find(ast);
 function check(mutator:(p:any)=>void=()=>{}) {
  const contents:any={"/fixture/one.ts":Buffer.from("one"),"/fixture/two.ts":Buffer.from("two"),instrument:Buffer.from("instrument")};
  const p:any={sourceFiles:["one.ts"],sourceHashes:{"one.ts":hash("one")},instrumentSHA256:hash("instrument")};mutator(p);
  p.sourceManifestSHA256=hash(JSON.stringify(Object.fromEntries(Object.entries(p.sourceHashes??{}).sort())));contents.protocol=Buffer.from(JSON.stringify(p));
  const f=new Function("hash","readFileSync","join","root","protocolPath","fail","validateSourceBindings","return ("+freezeSource.replaceAll("fileURLToPath(import.meta.url)",JSON.stringify("instrument"))+");")( (b:any)=>createHash("sha256").update(b).digest("hex"),(path:string)=>contents[path],join,"/fixture","protocol",(code:string)=>{throw Object.assign(new Error(code),{code});},p7.validateSourceBindings);
  return ()=>f(p,createHash("sha256").update(contents.protocol).digest("hex"));
 }
 test("accepts a complete valid identity map and rejects empty, missing, extra, duplicate and malformed declarations",()=>{
  expect(check()).not.toThrow();
  for(const mutate of [
   (p:any)=>{p.sourceFiles=[];p.sourceHashes={};},
   (p:any)=>p.sourceHashes={},
   (p:any)=>p.sourceFiles=["one.ts","two.ts"],
   (p:any)=>p.sourceHashes["two.ts"]=hash("two"),
   (p:any)=>p.sourceFiles=["one.ts","one.ts"],
   (p:any)=>p.sourceFiles=["../one.ts"],
   (p:any)=>p.sourceHashes["one.ts"]="not-a-sha256",
   (p:any)=>p.sourceHashes=[],
  ])expect(check(mutate)).toThrowError(/SOURCE_(FILES|BINDING)_/);
 });
 test("actual inspect never reports READY for25declared files and zero bound files",()=>{
  const dir=mkdtempSync(join(tmpdir(),"p7-binding-inspect-")),path=join(dir,"probe.protocol.json");
  try{
   const p=JSON.parse(readFileSync(new URL("../evaluation/board-resource.protocol.json",import.meta.url),"utf8"));p.sourceHashes={};p.sourceManifestSHA256=hash("{}");p.instrumentSHA256=hash(source);writeFileSync(path,JSON.stringify(p));
   const child=spawnSync(process.execPath,["tools/board-resource.mjs","--protocol-file",path,"--inspect"],{cwd:new URL("../",import.meta.url),encoding:"utf8",timeout:10000,env:{...process.env,NODE_OPTIONS:undefined}});
   expect(child.status).not.toBe(0);expect(child.stdout).not.toContain('"status":"READY"');expect(child.stderr).toContain("SOURCE_BINDING_INVALID");
  }finally{rmSync(dir,{recursive:true,force:true});}
 });
});

describe("P7 reviewer regression: admitted authority and strict puzzle state",()=>{
 test("the actual capture path cannot rebase admitted authority from a later raw frame",()=>{
  const source=readFileSync(new URL("../tools/board-resource.mjs",import.meta.url),"utf8"),ast=ts.createSourceFile("instrument.mjs",source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);let capture="";
  function find(n:ts.Node){if(ts.isFunctionDeclaration(n)&&n.name?.text==="capturePicture")capture=n.getText(ast);ts.forEachChild(n,find);}find(ast);
  const {rawSnapshots}=pictureFixture(),base=rawSnapshots[0],h={id:base.scope.houseId,members:base.scope.memberIds.map((identity:string)=>({identity}))};
  function run(raw:any,admitted=true){const evidence={invalidFrames:0,conflictingFrames:0},v:any={house:0,identity:base.scope.selfId,serverEpoch:raw.serverEpoch,generation:raw.generation,pictureAuthority:admitted?Object.freeze({serverEpoch:base.scope.serverEpoch,generation:base.scope.generation,accessGeneration:base.scope.accessGeneration,controller:true}):null};
   const f=new Function("houses","pictureEvidence","normalizePictureFrame","pictureAuthorityEvidence","performance","return ("+capture+");")([h],evidence,p7.normalizePictureFrame,p7.pictureAuthorityEvidence,{now:()=>100});f(v,raw);return {evidence,v};}
  expect(run(base.raw).evidence.invalidFrames).toBe(0);
  for(const change of [(r:any)=>r.generation=999,(r:any)=>r.accessGeneration=999,(r:any)=>r.controller=false,(r:any)=>r.durable.puzzle.current.ruleset=999]){const bad=structuredClone(base.raw);change(bad);expect(run(bad).evidence.invalidFrames).toBeGreaterThan(0);}
  expect(run(base.raw,false).v.pictureFrames).toBeUndefined();
 });
 test("successful-subscription wiring captures immutable scalar authority",()=>{
  const source=readFileSync(new URL("../tools/board-resource.mjs",import.meta.url),"utf8"),ast=ts.createSourceFile("instrument.mjs",source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);let assignment="";
  function find(n:ts.Node){if(ts.isBinaryExpression(n)&&n.left.getText(ast)==="v.pictureAuthority"&&n.right.getText(ast)==="capturePictureAuthority(r.snapshot)")assignment=n.getText(ast);ts.forEachChild(n,find);}find(ast);expect(assignment).not.toBe("");
  const {rawSnapshots}=pictureFixture(),snapshot=structuredClone(rawSnapshots[0].raw),v:any={};
  new Function("v","r","capturePictureAuthority",assignment+";")(v,{snapshot},p7.capturePictureAuthority);
  expect(Object.isFrozen(v.pictureAuthority)).toBe(true);const original={...v.pictureAuthority};snapshot.generation=999;snapshot.accessGeneration=999;snapshot.controller=false;
  expect(v.pictureAuthority).toEqual(original);expect(()=>p7.capturePictureAuthority(snapshot)).toThrowError("PICTURE_ADMISSION_AUTHORITY");
 });
 test("a reconnect clears old picture frames before accepting its new subscription",()=>{
  const source=readFileSync(new URL("../tools/board-resource.mjs",import.meta.url),"utf8"),ast=ts.createSourceFile("instrument.mjs",source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);let connect="";
  function find(n:ts.Node){if(ts.isFunctionDeclaration(n)&&n.name?.text==="connect")connect=n.getText(ast);ts.forEachChild(n,find);}find(ast);
  const prefix=connect.slice(connect.indexOf("{")+1,connect.indexOf("const socket = io")),v:any={role:"house",pictureAuthority:{generation:1},pictureFrames:new Map([["old",{}]])};
  new Function("v","p","performance",prefix)(v,{pictureScenario:{}},{now:()=>0});expect(v.pictureAuthority).toBeNull();expect(v.pictureFrames.size).toBe(0);
 });
 test("raw ruleset and authority changes cannot be hidden by normalized evidence",()=>{
  const {evidence}=pictureFixture();
  for(const mutate of [(e:any)=>e.actions[0].observed[0].frame.ruleset=999,(e:any)=>e.actions[0].observed[0].frame.generation=999,(e:any)=>e.actions[0].observed[0].frame.accessGeneration=999,(e:any)=>e.actions[0].observed[0].frame.controller=false,(e:any)=>e.admissions=[]]){const bad=structuredClone(evidence);mutate(bad);expect(p7.gradePictureEvidence(scenario,bad)).toBe(false);}
 });
 test("post-close state checks reject invalid column and embedded rulesets accepted by the old grader",()=>{
  const dir=mkdtempSync(join(tmpdir(),"p7-puzzle-ruleset-")),path=join(dir,"house.sqlite"),{evidence}=pictureFixture();
  const houses=Array.from({length:2},(_,index)=>({index,id:id(50+index),members:Array.from({length:6},(_,m)=>({identity:id(100+index*10+m)}))}));
  function write(kind:"valid"|"column"|"embedded") {const db=new DatabaseSync(path);try{db.exec("CREATE TABLE IF NOT EXISTS puzzle_tables(house_id TEXT,ruleset INTEGER,state TEXT);DELETE FROM puzzle_tables");
   for(const house of houses){const table={revision:25,current:{id:id(60+house.index),ruleset:kind==="embedded"&&house.index===0?999:1,illustrationId:art.id,illustrationVersion:art.version,illustrationDigest:art.digest,placements:scenario.pieces.map((piece:any,i:number)=>({...piece,actorId:house.members[i%6].identity})),completed:true}};db.prepare("INSERT INTO puzzle_tables VALUES(?,?,?)").run(house.id,kind==="column"&&house.index===0?999:1,JSON.stringify(table));}
  }finally{db.close();}}
  try{write("valid");expect(p7.verifyClosedPictureTables(path,houses,scenario,evidence).allMatch).toBe(true);for(const kind of ["column","embedded"] as const){write(kind);expect(p7.verifyClosedPictureTables(path,houses,scenario,evidence).allMatch).toBe(false);}}finally{rmSync(dir,{recursive:true,force:true});}
 });
});
