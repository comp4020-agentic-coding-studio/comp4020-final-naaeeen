import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import ts from "typescript";
import { expect, test } from "vitest";
import { createSpatialWorkload, resourceActorMap } from "../tools/spatial-resource.mjs";

function executableFunction(source: string, name: string) {
  const ast=ts.createSourceFile("instrument.mjs",source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);let found="";
  function visit(node:ts.Node){if(ts.isFunctionDeclaration(node)&&node.name?.text===name)found=node.getText(ast);ts.forEachChild(node,visit);}visit(ast);
  if(!found)throw new Error("Missing actual instrument function "+name);return found;
}
async function constructWithdrawnActors() {
  const raw=readFileSync(new URL("../docs/spatial-redesign/evidence/resource-withdrawn-39-spatial-instrument.mjs",import.meta.url),"utf8");
  const all:any[]=[];
  const fetchMock=async()=>({json:async()=>({identity:{id:randomUUID()}}),headers:{get:()=>"house_session=synthetic; HttpOnly"}});
  const request=async()=>({home:{id:"fixture-house",code:"fixture-code"},residents:[]});
  const makeHouse=new Function("fetch","origin","request","all","randomUUID","return ("+executableFunction(raw,"makeHouse")+");")(fetchMock,"http://fixture.invalid",request,all,randomUUID);
  const house=await makeHouse(6,0);
  const round=ts.createSourceFile("round.mjs",executableFunction(raw,"playGameRound"),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);let selection="";
  function visit(node:ts.Node){if(ts.isVariableDeclaration(node)&&node.name.getText(round)==="actors")selection=node.initializer!.getText(round);ts.forEachChild(node,visit);}visit(round);
  const select=new Function("scenario","views","houseIndex","return "+selection);
  return {actors:house.members,selected:select({playerMemberIndices:[1,2]},house.members,0)};
}

test("the withdrawn executable constructor reproduces the missing-role scheduler defect",async()=>{
  const fixture=await constructWithdrawnActors();
  expect(fixture.selected).toEqual([undefined,undefined]);
});

const actualSource=readFileSync(new URL("../tools/board-resource.mjs",import.meta.url),"utf8");
function admittedFixture(seated=false) {
  const views:any[]=[],houses=Array.from({length:2},(_,index)=>({index,id:randomUUID(),members:Array.from({length:6},(_,memberIndex)=>({identity:randomUUID(),memberIndex}))}));
  const construct=new Function("views","randomUUID","return ("+executableFunction(actualSource,"newView")+");")(views,randomUUID);
  const emitted:any[]=[];
  for(const house of houses)for(const member of house.members)for(const role of ["house","board"]){
    const view=construct(member,house.index,role);view.ready=true;view.nextMotion=100;view.generation=1;view.motionSequence=0;view.x=0;view.z=0;
    view.snapshot={players:[{id:view.identity,x:0,z:0,seatId:seated&&[1,2].includes(member.memberIndex)?"game-seat-"+(member.memberIndex+1):null,seatGeneration:1}]};
    view.socket={connected:true,timeout(){return this;},async emitWithAck(event:string,body:any){emitted.push({viewIndex:view.index,event,body});return {ok:true};}};
  }
  return {houses,views,emitted};
}
test("actual newView construction binds game slots to members1/2 and rejects malformed admission",()=>{
  const fixture=admittedFixture(),selected=resourceActorMap(fixture.houses,fixture.views);
  expect(selected.games.map((actors:any[])=>actors.map(actor=>actor.memberIndex))).toEqual([[1,2],[1,2]]);
  expect(selected.media.map((actor:any)=>[actor.house,actor.memberIndex])).toEqual([[1,0],[1,3],[1,4]]);
  const wrongRole=admittedFixture();delete wrongRole.views[2].role;expect(()=>resourceActorMap(wrongRole.houses,wrongRole.views)).toThrow("SPATIAL_ACTOR_ADMISSION");
  const wrongMember=admittedFixture();wrongMember.views[2].memberIndex=2;expect(()=>resourceActorMap(wrongMember.houses,wrongMember.views)).toThrow("SPATIAL_ACTOR_WIRING");
  expect(()=>resourceActorMap(fixture.houses,[...fixture.views,fixture.views[0]])).toThrow("SPATIAL_ACTOR_ADMISSION");
});
test("actual existing-socket resubscribe emits only the server's exact two fields and rebinds after ACK",async()=>{
  const raw=readFileSync(new URL("../tools/spatial-resource.mjs",import.meta.url),"utf8"),sent:any[]=[],actor:any={token:randomUUID(),motionSequence:8,generation:1};
  const snapshot={generation:2,players:[{seatId:null,x:3,z:4}]};
  actor.socket={timeout(){return this;},async emitWithAck(event:string,body:any){expect(actor.spatialSubscribing).toBe(true);sent.push({event,body});return {ok:true,snapshot};}};
  const subscribe=new Function("control","ok","onSubscribe","self","updatePosition","return ("+executableFunction(raw,"subscribe")+");")(async(_actor:any,operation:any)=>operation(),(reply:any)=>reply,(target:any,reply:any)=>{target.snapshot=reply;target.generation=reply.generation;},(target:any)=>target.snapshot.players[0],(target:any)=>{target.x=target.snapshot.players[0].x;});
  await subscribe(actor,"lounge");expect(sent).toEqual([{event:"house.subscribe",body:{zoneId:"lounge",controllerToken:actor.token}}]);expect(actor).toMatchObject({generation:2,motionSequence:0,spatialSeat:null,spatialSubscribing:false,x:3});
});
test("actual finish serializes a consistent standing denominator and rate at a rounding boundary",()=>{
  const fixture=admittedFixture(),driver=createSpatialWorkload({origin:"http://fixture.invalid",scenario:{},signal:new AbortController().signal,rpc:async()=>({}),houses:fixture.houses,views:fixture.views,onSubscribe:()=>{},reconnect:async()=>{}});
  driver.begin(0);driver.sampleMotion(0);for(const actor of fixture.views.filter(view=>view.role==="house"))actor.normalMotionSent=2000;
  driver.sampleMotion(199990.2);driver.finish();
  expect(driver.evidence.motion[0]).toMatchObject({standingSeconds:199.99,normalMotionSent:2000,standingHz:10.001});
});
test("actual movement timer executes constructed actor -> routed target -> ACK callback and suppresses only seated actors",async()=>{
  const ast=ts.createSourceFile("actual.mjs",actualSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);let callback="";
  function visit(node:ts.Node){if(ts.isCallExpression(node)&&node.expression.getText(ast)==="setInterval"&&node.arguments[0]?.getText(ast).includes("v.nextMotion"))callback=node.arguments[0].getText(ast);ts.forEachChild(node,visit);}visit(ast);
  expect(callback).not.toBe("");
  for(const mixed of [false,true]){
    const fixture=admittedFixture(mixed),jobs:Promise<any>[]=[],stats:any={motionSent:0,motionOk:0,motionRejected:0,motionTimeouts:0};
    const spatial=mixed?createSpatialWorkload({origin:"http://fixture.invalid",scenario:{},signal:new AbortController().signal,rpc:async()=>({}),houses:fixture.houses,views:fixture.views,onSubscribe:()=>{},reconnect:async()=>{}}):null;
    const routed=fixture.views.find(view=>view.role==="house"&&view.house===0&&view.memberIndex===3),point={x:0.25,z:0};routed.spatialRoute=[point];
    spatial?.begin(0);
    const tick=new Function("performance","spatial","views","stats","launch","error","return ("+callback+");")({now:()=>100},spatial,fixture.views,stats,(operation:any)=>jobs.push(Promise.resolve().then(operation)),(code:string)=>{throw new Error(code);});
    tick();await Promise.all(jobs);
    expect(fixture.emitted).toHaveLength(mixed?8:12);expect(stats.motionRejected).toBe(0);
    if(mixed){expect(fixture.emitted.find(row=>row.viewIndex===routed.index).body).toMatchObject({x:0.25,z:0,generation:1,sequence:1});expect(routed.spatialRoute).toEqual([]);expect(routed.x).toBe(0.25);expect(fixture.emitted.some(row=>[2,4,14,16].includes(row.viewIndex))).toBe(false);}
  }
});
