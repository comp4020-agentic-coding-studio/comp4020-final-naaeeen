import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, test } from "vitest";
import { gradeSpatialLifecycle, SPATIAL_CHECKS, spatialPng, gradeMixedMotion } from "../tools/spatial-resource.mjs";
import { normalizeStudioPng } from "../src/house-studio-codec.ts";
const read=(path:string)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const protocol=JSON.parse(read("docs/spatial-redesign/evidence/resource-mixed.protocol.json"));
const digest=(bytes:Buffer)=>createHash("sha256").update(bytes).digest("hex");
function validEvidence() {
  return {status:"COMPLETE",rootViews:12,boardViews:12,reconnects:1,allGameSeatsBy255:true,seatClaims:Array.from({length:12},(_,index)=>({viewIndex:Math.floor(index/6)*12+(index%6)*2,purpose:"game",seatId:"game-seat-"+(index%6+1),seatGeneration:index+1,atSeconds:250})),media:{checks:Object.fromEntries(SPATIAL_CHECKS.map(key=>[key,true])),uploads:[1927,1928].map(seed=>{const bytes=spatialPng(seed);return {inputBytes:bytes.length,inputSHA256:digest(bytes),readBytes:bytes.length,readSHA256:digest(bytes),chunks:Math.ceil(bytes.length/8192)};}),markerActions:96,httpBudget:[12,18,20].map(viewIndex=>({viewIndex,totalReads:50,totalPosts:50,rollingReadMax60s:20,rollingPostMax60s:20}))}};
}
function validMotion() {return {motion:Array.from({length:12},(_,index)=>{const memberIndex=index%6,game=[1,2].includes(memberIndex),standingSeconds=game?0:200;return {viewIndex:Math.floor(index/6)*12+memberIndex*2,houseIndex:Math.floor(index/6),memberIndex,standingSeconds,seatedSeconds:game?300:100,normalMotionSent:standingSeconds*10,standingHz:standingSeconds?10:null};})};}
describe("spatial resource protocol and evaluator calibration",()=>{
  test("preserves every original background duration, work, fault and capacity criterion",()=>{
    const original=JSON.parse(read("docs/post-crit/evidence/resource-pre-adaptation-protocol.json"));
    for(const key of ["durationSeconds","automaticRetry","configuration","fixture","workload","slowReader","negativeControls","bounds","measurement","classification","limitations"])expect(protocol[key],key).toEqual(original[key]);
    const gate=(source:string)=>source.split("\n").find(line=>line.includes("const gates = {"));
    expect(gate(read("tools/board-resource.mjs"))).toBe(gate(read("docs/post-crit/evidence/resource-pre-adaptation-instrument.mjs")));
    expect(protocol.gameScenario.playerMemberIndices).toEqual([1,2]);
    expect(protocol.spatialScenario).toMatchObject({profile:"REUSED12_ROOT_MIXED",rootViews:12,boardViews:12,steadyConnections:24,newIdentities:0,extraContexts:0});
    expect(protocol.gameScenario).toMatchObject({expectedActions:124,expectedReadableProjectionTargets:733,roundStartsSeconds:[5,45,105,145,185,225]});
    expect(protocol.pictureScenario).toMatchObject({expectedActions:62,expectedTargets:372,startSeconds:260,placementStartSeconds:269,placementIntervalSeconds:0.5});
    expect(protocol.p7Preparation.expectedGateCount).toBe(30);
    for(const profile of ["resource-baseline","resource-mixed"]){
      const declared=JSON.parse(read("docs/spatial-redesign/evidence/"+profile+".protocol.json"));
      const target="docs/spatial-redesign/evidence/"+(profile==="resource-baseline"?"resource-elapsed-baseline":"resource-elapsed-mixed")+".protocol.json";
      expect(Object.keys(declared.commands).sort()).toEqual(["inspect","run"]);
      for(const command of ["inspect","run"])expect(declared.commands[command]).toContain("--protocol-file "+target);
      expect(declared.commands.run).toContain("--run --go ");expect(declared.commands.run).not.toContain("--bootstrap-calibration");
    }
    expect(read("docs/spatial-redesign/evidence/resource-elapsed-mixed.protocol.json")).toBe(read("docs/spatial-redesign/evidence/resource-mixed.protocol.json"));
    expect(read("docs/spatial-redesign/evidence/resource-baseline.protocol.json")).toBe(read("evaluation/board-resource.protocol.json"));
    expect(read("docs/spatial-redesign/evidence/resource-elapsed-baseline.protocol.json")).toBe(read("evaluation/board-resource.protocol.json"));
    const previousDefault=JSON.parse(read("docs/spatial-redesign/evidence/resource-registered-default-prebinding.protocol.json")),currentDefault=JSON.parse(read("evaluation/board-resource.protocol.json"));
    for(const key of ["schemaVersion","durationSeconds","automaticRetry","configuration","fixture","workload","slowReader","negativeControls","bounds","measurement","classification","limitations","storageAcceptance","baseWorkloadRegisteredAtUTC"])expect(currentDefault[key],"registered default "+key).toEqual(previousDefault[key]);
    for(const source of ["src/house-studio.ts","src/house-studio-codec.ts","src/house-gathering.ts","public/house-studio-preview.js","public/house-studio-ui.js","public/house-gathering-ui.js","public/house-ambience.js","tools/board-resource.mjs","tools/board-resource-p7.mjs","tools/spatial-resource.mjs"])expect(protocol.sourceFiles).toContain(source);
  });
  test("uses independently generated near-cap PNG bytes accepted unchanged by the real codec",()=>{
    const first=spatialPng(1927),second=spatialPng(1928);expect(first.length).toBeGreaterThan(240000);expect(first.length).toBeLessThanOrEqual(262144);expect(second.length).toBeGreaterThan(240000);expect(first.equals(second)).toBe(false);
    const decoded=normalizeStudioPng(first);expect(decoded).toMatchObject({width:290,height:290});expect(decoded.bytes).toEqual(first);expect(SPATIAL_CHECKS).toHaveLength(24);
  });
  test("accepts complete evidence and rejects missing/wrong lifecycle, transport, seat, byte and cadence facts",()=>{
    expect(gradeSpatialLifecycle(protocol.spatialScenario,validEvidence())).toBe(true);
    const changes:((e:any)=>void)[]=[e=>e.status="RUNNING",e=>e.rootViews=13,e=>e.boardViews=11,e=>e.reconnects=0,e=>e.allGameSeatsBy255=false,e=>delete e.media.checks.sofaReconnectNoConsent,e=>e.media.checks.studioGuestRevoked=false,e=>e.seatClaims.pop(),e=>e.seatClaims[0].purpose="study",e=>e.seatClaims[0].seatGeneration=0,e=>e.seatClaims[0].atSeconds=256,e=>e.media.uploads.pop(),e=>e.media.uploads[0].inputBytes=1,e=>e.media.uploads[0].readSHA256="changed",e=>e.media.uploads[0].readBytes--,e=>e.media.uploads[0].chunks--,e=>e.media.markerActions=95,e=>e.media.httpBudget[0].rollingReadMax60s=91,e=>e.media.httpBudget[0].rollingPostMax60s=NaN,e=>e.media.httpBudget.pop(),e=>e.media.httpBudget[0].viewIndex=18];
    for(const change of changes){const evidence=validEvidence();change(evidence);expect(gradeSpatialLifecycle(protocol.spatialScenario,evidence),change.toString()).toBe(false);}
  });
  test("grades actual standing frequency and role-duration minimums separately from baseline full motion",()=>{
    expect(gradeMixedMotion(validMotion())).toBe(true);
    for(const change of [(e:any)=>e.motion.pop(),(e:any)=>e.motion[1].seatedSeconds=289,(e:any)=>e.motion[0].standingSeconds=159,(e:any)=>e.motion[0].standingHz=9,(e:any)=>e.motion[0].normalMotionSent=1,(e:any)=>e.motion[0].standingSeconds=NaN]){const evidence=validMotion();change(evidence);expect(gradeMixedMotion(evidence)).toBe(false);}
  });
});
