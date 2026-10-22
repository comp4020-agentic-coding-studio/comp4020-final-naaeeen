import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, test } from "vitest";
import { gradeSpatialLifecycle, SPATIAL_CHECKS, spatialPng } from "../tools/spatial-resource.mjs";
import { normalizeStudioPng } from "../src/house-studio-codec.ts";
const read=(path:string)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const protocol=JSON.parse(read("docs/spatial-redesign/evidence/resource-spatial.protocol.json"));
const digest=(bytes:Buffer)=>createHash("sha256").update(bytes).digest("hex");
function validEvidence() {
  return {status:"COMPLETE",unexpectedDisconnects:0,scopeErrors:0,transport:{created:16,expectedReconnects:1,connectedAtEnd:15},seatClaims:Array.from({length:12},(_,index)=>({actualViewIndex:index+24,purpose:"game",seatId:"game-seat-"+(index%6+1),seatGeneration:index+1})),media:{checks:Object.fromEntries(SPATIAL_CHECKS.map(key=>[key,true])),uploads:[1927,1928].map(seed=>{const bytes=spatialPng(seed);return {inputBytes:bytes.length,inputSHA256:digest(bytes),readBytes:bytes.length,readSHA256:digest(bytes),chunks:Math.ceil(bytes.length/8192)};}),pointerViewActions:200,httpBudget:Array.from({length:15},(_,actorIndex)=>({actorIndex,totalReads:50,totalWrites:50,rollingReadMax60s:20,rollingWriteMax60s:20}))}};
}
describe("spatial resource protocol and evaluator calibration",()=>{
  test("preserves every original background duration, work, fault and capacity criterion",()=>{
    const original=JSON.parse(read("docs/post-crit/evidence/resource-pre-adaptation-protocol.json"));
    for(const key of ["durationSeconds","automaticRetry","configuration","fixture","workload","slowReader","negativeControls","bounds","measurement","classification","limitations"])expect(protocol[key],key).toEqual(original[key]);
    const gate=(source:string)=>source.split("\n").find(line=>line.includes("const gates = {"));
    expect(gate(read("tools/board-resource.mjs"))).toBe(gate(read("docs/post-crit/evidence/resource-pre-adaptation-instrument.mjs")));
    expect(protocol.gameScenario).toBeUndefined();expect(protocol.pictureScenario).toBeUndefined();
    expect(protocol.spatialScenario).toMatchObject({extraActivityHouses:2,extraActivityActors:12,extraMediaActors:3,steadyConnections:39,additionalTransportCreations:16});
    expect(protocol.spatialScenario.gameScenario).toMatchObject({expectedActions:124,expectedReadableProjectionTargets:744,roundStartsSeconds:[5,45,105,145,185,225]});
    expect(protocol.spatialScenario.pictureScenario).toMatchObject({expectedActions:62,expectedTargets:372,startSeconds:260,placementStartSeconds:269,placementIntervalSeconds:0.5});
    for(const source of ["src/house-studio.ts","src/house-studio-codec.ts","src/house-gathering.ts","public/house-studio-preview.js","public/house-studio-ui.js","public/house-gathering-ui.js","public/house-ambience.js","tools/board-resource.mjs","tools/board-resource-p7.mjs","tools/spatial-resource.mjs"])expect(protocol.sourceFiles).toContain(source);
  });
  test("uses independently generated near-cap PNG bytes accepted unchanged by the real codec",()=>{
    const first=spatialPng(1927),second=spatialPng(1928);expect(first.length).toBeGreaterThan(240000);expect(first.length).toBeLessThanOrEqual(262144);expect(second.length).toBeGreaterThan(240000);expect(first.equals(second)).toBe(false);
    const decoded=normalizeStudioPng(first);expect(decoded).toMatchObject({width:290,height:290});expect(decoded.bytes).toEqual(first);expect(SPATIAL_CHECKS).toHaveLength(24);
  });
  test("accepts complete evidence and rejects missing/wrong lifecycle, transport, seat, byte and cadence facts",()=>{
    expect(gradeSpatialLifecycle(protocol.spatialScenario,validEvidence())).toBe(true);
    const changes:((e:any)=>void)[]=[
      e=>e.status="RUNNING",e=>e.unexpectedDisconnects=1,e=>e.scopeErrors=1,
      e=>e.transport.created=15,e=>e.transport.expectedReconnects=0,e=>e.transport.connectedAtEnd=14,
      e=>delete e.media.checks.sofaReconnectNoConsent,e=>e.media.checks.studioGuestRevoked=false,
      e=>e.seatClaims.pop(),e=>e.seatClaims[0].purpose="study",e=>e.seatClaims[0].seatId="seat-1",e=>e.seatClaims[0].seatGeneration=0,
      e=>e.media.uploads.pop(),e=>e.media.uploads[0].inputBytes=1,e=>e.media.uploads[0].readSHA256="changed",e=>e.media.uploads[0].readBytes--,e=>e.media.uploads[0].chunks--,
      e=>e.media.pointerViewActions=199,e=>e.media.httpBudget[0].rollingReadMax60s=241,e=>e.media.httpBudget[0].rollingWriteMax60s=NaN,e=>e.media.httpBudget.pop(),e=>e.media.httpBudget[0].actorIndex=1
    ];
    for(const change of changes){const evidence=validEvidence();change(evidence);expect(gradeSpatialLifecycle(protocol.spatialScenario,evidence),change.toString()).toBe(false);}
  });
  test("reuses the calibrated historical exact game/picture algorithms unchanged",()=>{
    const old=read("tools/board-resource.mjs"),current=read("tools/spatial-resource.mjs");
    const pure=old.slice(old.indexOf("function gameStepPlan("),old.indexOf("function writeResult("));expect(current).toContain(pure);
    const behavior=old.slice(old.indexOf("    async function playGameRound("),old.indexOf("    const cancellation=new AbortController();"));expect(current).toContain(behavior);
    expect(current).toContain('verifyClosedPictureTables(path,houses,p.pictureScenario,pictureEvidence)');
    expect(current).toContain('receipts.count===186');
  });
});
