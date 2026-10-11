
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { HouseStore as SHouse } from "./frozen/S/src/house-store.ts";
import { HouseStore as PHouse } from "./frozen/P/src/house-store.ts";
import { BoardStore as SBoard } from "./frozen/S/src/board-store.ts";
import { BoardStore as OBoard } from "./frozen/O/src/board-store.ts";
const root = dirname(fileURLToPath(import.meta.url));
const repo = resolve(root, "../..");
const sha = path => createHash("sha256").update(readFileSync(path)).digest("hex");
const manifest = JSON.parse(readFileSync(join(root, "frozen-manifest.json"), "utf8"));
for (const [name, expected] of Object.entries(manifest.hashes)) assert.equal(sha(join(root, name)), expected, "Frozen artifact changed: " + name);
for (const [name, expected] of Object.entries(manifest.originalSourceHashes)) assert.equal(sha(join(repo, name)), expected, "Runtime source changed: " + name);
assert.equal(process.version, "v24.21.0");
const sqliteProbe = new DatabaseSync(":memory:");
const sqliteVersion = sqliteProbe.prepare("SELECT sqlite_version() AS version").get().version;
sqliteProbe.close();
const policies = { S: [SHouse,SBoard], P: [PHouse,SBoard], O: [SHouse,OBoard] };
const records = [];
const startedAtUTC = new Date().toISOString();
function cmd(type, payload, expectedRevision, houseId) {
  return { commandId: randomUUID(), type, payload,
    ...(houseId ? {houseId} : {}), ...(expectedRevision === undefined ? {} : {expectedRevision}) };
}
function cardPayload(smallGoal, nextStep = "") { return {smallGoal,question:"Why does this argument work?",resourceUrl:"",nextStep,helpRequested:true}; }
function shape(id, changes = {}) {
  return { id,type:"rectangle",x:0,y:0,width:100,height:80,angle:0,strokeColor:"#1e1e1e",backgroundColor:"transparent",fillStyle:"solid",strokeWidth:2,strokeStyle:"solid",roughness:1,opacity:100,seed:1,version:1,versionNonce:100,index:"a0",isDeleted:false,groupIds:[],frameId:null,boundElements:null,updated:1000,link:null,locked:false,roundness:null,...changes };
}
function logical(store) {
  const tables = store.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(r=>r.name);
  return JSON.stringify(tables.map(t=>[t,store.db.prepare('SELECT * FROM "'+t+'" ORDER BY rowid').all()]));
}
function fixture(policy, name) {
  const directory=join(root,"fixtures",policy+"-"+name);
  mkdirSync(directory,{recursive:true});
  const [House,Board]=policies[policy];
  const housePath=join(directory,"house.sqlite"),boardPath=join(directory,"board.sqlite");
  const f={policy,House,Board,housePath,boardPath,house:new House(housePath),board:new Board(boardPath)};
  f.a=f.house.ensureSession().id; f.b=f.house.ensureSession().id; f.c=f.house.ensureSession().id;
  f.house.execute(f.a,cmd("house.create",{capacity:2,name:"Alice",colour:"sage"}));
  f.home=f.house.me(f.a).home;
  f.house.execute(f.b,cmd("house.join",{code:f.home.code,name:"Bob",colour:"blue"}));
  f.house.execute(f.c,cmd("house.create",{capacity:2,name:"Outsider",colour:"rose"}));
  return f;
}
function boardPatch(f, actor, payload) {
  // Explicit common trusted-membership precondition, absent from BoardStore itself.
  if (f.house.me(actor).home?.id !== payload.houseId) {
    const e=new Error("Current membership in this house required by fixture wrapper."); e.code="FORBIDDEN"; throw e;
  }
  return f.board.patch(actor,payload);
}
function bp(f,actor,elements,id=randomUUID()) { return boardPatch(f,actor,{id,houseId:f.home.id,elements}); }
function denied(f,action,expectedCode) {
  const before={house:logical(f.house),board:logical(f.board)};
  let caught;
  try { action(); } catch(e) { caught=e; }
  assert.ok(caught,"Action unexpectedly accepted");
  assert.equal(caught.code,expectedCode);
  assert.equal(logical(f.house),before.house,"Denied action changed house state/receipts");
  assert.equal(logical(f.board),before.board,"Denied action changed board state/receipts");
  return {accepted:false,code:expectedCode,stateAndReceiptsPreserved:true};
}
function newCard(f,label) {
  const receipt=f.house.execute(f.a,cmd("card.save",cardPayload(label),0,f.home.id));
  return {id:receipt.result.cardId,revision:receipt.entityRevision};
}
function currentCard(f,id) { return f.house.snapshot(f.a).cards.find(c=>c.id===id); }
function peerCard(f, shared, close) {
  const initial=shared?"Our jointly owned presentation: prepare shared slides":"My individual essay commitment";
  const card=newCard(f,initial);
  const command=close?cmd("card.close",{cardId:card.id},card.revision,f.home.id):
    cmd("card.save",{cardId:card.id,...cardPayload(shared?"Our jointly owned presentation: slides ready":"Peer substituted personal goal","Peer-chosen next step")},card.revision,f.home.id);
  let action;
  if(f.policy==="P"){
    const receipt=f.house.execute(f.b,command);action={accepted:true,entityRevision:receipt.entityRevision};
    assert.equal(currentCard(f,card.id).state,close?"closed":"active");
    if(!close)assert.equal(currentCard(f,card.id).nextStep,"Peer-chosen next step");
    assert.equal(currentCard(f,card.id).authorId,f.a,"P must retain creator attribution");
  }else action=denied(f,()=>f.house.execute(f.b,command),"FORBIDDEN");
  return {taskMeaning:shared?"explicitly shared team task; prior agreement stipulated":"individual commitment; no consent stipulated",action,creatorLabelRetained:currentCard(f,card.id).authorId===f.a,state:currentCard(f,card.id).state};
}
const scenarios=[
["peer-diagram",f=>{
  bp(f,f.a,[shape("diagram")]);
  let action;
  if(f.policy==="O")action=denied(f,()=>bp(f,f.b,[shape("diagram",{version:2,x:99})]),"FORBIDDEN");
  else { const r=bp(f,f.b,[shape("diagram",{version:2,x:99})]); assert.equal(r.elements[0].x,99); action={accepted:true}; }
  assert.equal(f.board.snapshot(f.home.id).elements[0].x,f.policy==="O"?0:99);
  return {action,finalX:f.board.snapshot(f.home.id).elements[0].x};
}],
["peer-individual-rewrite",f=>peerCard(f,false,false)],
["peer-individual-close",f=>peerCard(f,false,true)],
["shared-team-task-edit",f=>peerCard(f,true,false)],
["shared-team-task-close",f=>peerCard(f,true,true)],
["owner-next-step-active",f=>{
  const c=newCard(f,"My essay");
  f.house.execute(f.a,cmd("card.save",{cardId:c.id,...cardPayload("My essay","Read the counterexample")},1,f.home.id));
  const saved=currentCard(f,c.id);
  assert.equal(saved.nextStep,"Read the counterexample");assert.equal(saved.state,"active");assert.equal(saved.revision,2);
  return {accepted:true,state:saved.state,revision:saved.revision};
}],
...["AB","BA"].map(order=>["stale-same-author-revision-"+order,f=>{
  const c=newCard(f,"My essay");
  const commands={A:cmd("card.save",{cardId:c.id,...cardPayload("Draft A","Step A")},1,f.home.id),B:cmd("card.save",{cardId:c.id,...cardPayload("Draft B","Step B")},1,f.home.id)};
  f.house.execute(f.a,commands[order[0]]);
  const denial=denied(f,()=>f.house.execute(f.a,commands[order[1]]),"REVISION_CONFLICT");
  assert.equal(currentCard(f,c.id).smallGoal,"Draft "+order[0]);
  return {deliveryOrder:order,firstDraftRetained:order[0],second:denial};
}]),
...["AB","BA"].map(order=>["distinct-object-race-"+order,f=>{
  bp(f,f.a,[shape("a")]);bp(f,f.b,[shape("b")]);
  const actions={A:()=>bp(f,f.a,[shape("a",{version:2,x:10})]),B:()=>bp(f,f.b,[shape("b",{version:2,x:20})])};
  for(const key of order)actions[key]();
  const elements=f.board.snapshot(f.home.id).elements;
  assert.equal(elements.length,2);assert.equal(elements.find(e=>e.id==="a").x,10);assert.equal(elements.find(e=>e.id==="b").x,20);
  return {deliveryOrder:order,bothChangesRetained:true,objects:elements.map(e=>({id:e.id,x:e.x}))};
}]),
...["AB","BA"].map(order=>["same-object-race-"+order,f=>{
  bp(f,f.a,[shape("shared")]);
  const actions={A:()=>bp(f,f.a,[shape("shared",{version:2,versionNonce:100,x:10})]),B:()=>bp(f,f.b,[shape("shared",{version:2,versionNonce:50,x:20})])};
  const deliveries=[];
  for(const key of order) {
    if(key==="B"&&f.policy==="O")deliveries.push({actor:key,...denied(f,actions[key],"FORBIDDEN")});
    else {const r=actions[key]();deliveries.push({actor:key,accepted:true,returnedCanonicalX:r.elements[0].x});}
  }
  const saved=f.board.snapshot(f.home.id).elements[0]; assert.equal(saved.x,f.policy==="O"?10:20);
  assert.equal(saved.versionNonce,f.policy==="O"?100:50);
  return {deliveryOrder:order,deliveries,finalX:saved.x,winner:f.policy==="O"?"A original author":"B lower nonce",semanticConsensus:false};
}]),
["outsider-cross-house",f=>{
  const c=newCard(f,"Private house commitment");bp(f,f.a,[shape("local")]);
  const cardRewrite=denied(f,()=>f.house.execute(f.c,cmd("card.save",{cardId:c.id,...cardPayload("Outsider rewrite")},1,f.home.id)),"FORBIDDEN");
  const cardClose=denied(f,()=>f.house.execute(f.c,cmd("card.close",{cardId:c.id},1,f.home.id)),"FORBIDDEN");
  const canvas=denied(f,()=>bp(f,f.c,[shape("local",{version:2,x:50})]),"FORBIDDEN");
  return {cardRewrite,cardClose,canvas,canvasDenialLayer:"common trusted-membership wrapper",serviceAuthTested:false};
}],
["restart-replay",f=>{
  const ccmd=cmd("card.save",cardPayload("Persisted next step","Return to this"),0,f.home.id);
  const cr=f.house.execute(f.a,ccmd);
  const p={id:randomUUID(),houseId:f.home.id,elements:[shape("persisted")]};
  const br=boardPatch(f,f.a,p);
  const houseBefore=f.house.snapshot(f.a),boardBefore=f.board.snapshot(f.home.id);
  f.house.close();f.board.close();
  f.house=new f.House(f.housePath);f.board=new f.Board(f.boardPath);
  assert.deepEqual(f.house.snapshot(f.a),houseBefore);assert.deepEqual(f.board.snapshot(f.home.id),boardBefore);
  const before={house:logical(f.house),board:logical(f.board)};
  assert.deepEqual(f.house.execute(f.a,ccmd),cr);assert.deepEqual(boardPatch(f,f.a,p),br);
  assert.equal(logical(f.house),before.house);assert.equal(logical(f.board),before.board);
  const houseReuse=denied(f,()=>f.house.execute(f.a,{...ccmd,payload:cardPayload("Different same ID")}),"COMMAND_ID_REUSED");
  const boardReuse=denied(f,()=>boardPatch(f,f.a,{...p,elements:[shape("different")]}),"ID_REUSED");
  return {persistedSnapshots:true,exactReplaySameReceiptAndNoMutation:true,houseReuse,boardReuse,scope:"native SQLite close/reopen only"};
}]
];
for(const policy of ["S","P","O"])for(const [name,run] of scenarios) {
  const f=fixture(policy,name);
  try {const observations=run(f);records.push({policy,scenario:name,status:"PASS",observations});}
  catch(error){records.push({policy,scenario:name,status:"FAIL",error:{name:error.name,code:error.code??null,message:error.message}});}
  finally {f.house.close();f.board.close();}
}
const control=fixture("S","negative-control");
try {
  bp(control,control.a,[shape("local")]);bp(control,control.b,[shape("peer")]);
  const retained=elements=>["local","peer"].every(id=>elements.some(e=>e.id===id));
  assert.ok(retained(control.board.snapshot(control.home.id).elements));
  assert.equal(retained([shape("peer")]),false);
  records.push({policy:"calibration",scenario:"known-bad-scene-replacement",status:"PASS",observations:{actualRetainsUnrelatedPeerObject:true,knownBadRejected:true,negativeControlKind:"synthetic last-patch replacement; no production/source variant"}});
}catch(error){records.push({policy:"calibration",scenario:"known-bad-scene-replacement",status:"FAIL",error:{message:error.message}});}
finally {control.house.close();control.board.close();}
const failures=records.filter(r=>r.status==="FAIL");
const results={schemaVersion:1,kind:"technical policy comparison",startedAtUTC,finishedAtUTC:new Date().toISOString(),node:process.version,sqliteVersion,sourceCommit:manifest.sourceCommit,protocolSHA256:manifest.hashes["protocol.json"],evaluatorSHA256:manifest.hashes["evaluate.mjs"],records,failures:failures.length,exitCode:failures.length?1:0,limits:JSON.parse(readFileSync(join(root,"protocol.json"),"utf8")).limits,interpretation:"PASS verifies predeclared behavior for that policy; it is not evidence of superior user value. No policy selection computed."};
writeFileSync(join(root,"results.json"),JSON.stringify(results,null,2)+"\n");
for(const r of records)console.log(JSON.stringify({policy:r.policy,scenario:r.scenario,status:r.status,...(r.error?{error:r.error}:{})}));
console.log(JSON.stringify({runtime:process.version,sqliteVersion,caseRecords:records.length,failures:failures.length,policySelection:"NOT COMPUTED",humanStudy:"NOT RUN"}));
process.exitCode=results.exitCode;

