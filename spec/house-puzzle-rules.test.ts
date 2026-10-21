import { randomUUID } from "node:crypto";
import { describe, expect, test } from "vitest";
import { emptyPuzzleTable, startPuzzle, placePuzzlePiece, validPuzzleTable } from "../public/house-puzzle-rules.js";
import { PuzzlePresence } from "../src/house-puzzle-presence.ts";
import { PUZZLE_PIECES } from "../public/house-puzzle-content.js";
const started = () => startPuzzle(emptyPuzzleTable(), randomUUID(), "rainy-nook", 1).state;
describe("pure picture rules and transient presence", () => {
 test("same input stays immutable, independent pieces compose and completion is exactly twenty-four", () => {
  let state = started(); const original = structuredClone(state), actor = randomUUID(), roundId = state.current!.id;
  for (const piece of [...PUZZLE_PIECES].reverse()) {
   const before = structuredClone(state), next = placePuzzlePiece(state, {roundId,pieceId:piece.id,destination:piece.destination}, actor);
   expect(next.ok).toBe(true); expect(state).toEqual(before); state = next.state; expect(validPuzzleTable(state)).toBe(true);
  }
  expect(original.current!.placements).toEqual([]); expect(state.current!.completed).toBe(true); expect(state.revision).toBe(25);
  expect(state.current!.placements.map(p=>p.destination)).toEqual(Array.from({length:24},(_,n)=>n));
  expect(placePuzzlePiece(state,{roundId,pieceId:"ivy-bell",destination:0},actor).code).toBe("PUZZLE_COMPLETE");
 });
 test("wrong round, unknown piece, invalid destination and wrong place reject with original object", () => {
  const state=started(), actor=randomUUID(), roundId=state.current!.id;
  for (const [action,code] of [
   [{roundId:randomUUID(),pieceId:"ivy-bell",destination:0},"PUZZLE_STALE_ROUND"],
   [{roundId,pieceId:"invented",destination:0},"INVALID_INPUT"],
   [{roundId,pieceId:"ivy-bell",destination:24},"INVALID_INPUT"],
   [{roundId,pieceId:"ivy-bell",destination:1.5},"INVALID_INPUT"],
   [{roundId,pieceId:"ivy-bell",destination:1},"PUZZLE_WRONG_PLACE"],
  ] as const) { const next=placePuzzlePiece(state,action,actor); expect(next).toMatchObject({ok:false,changed:false,code}); expect(next.state).toBe(state); }
  const taken=placePuzzlePiece(state,{roundId,pieceId:"ivy-bell",destination:0},actor).state;
  expect(placePuzzlePiece(taken,{roundId,pieceId:"ivy-bell",destination:0},actor).code).toBe("PUZZLE_PIECE_TAKEN");
  expect(startPuzzle(state,randomUUID(),"rainy-nook",2).ok).toBe(false);
 });
 test("strict restored validation rejects all malformed bounded-state alternatives", () => {
  const state=started(); expect(validPuzzleTable(emptyPuzzleTable())).toBe(true); expect(validPuzzleTable(state)).toBe(true);
  const cases: unknown[]=[null,[],{}, {revision:1,current:null}, {...state,revision:-1}, {...state,revision:Number.MAX_SAFE_INTEGER+1}, {...state,extra:1}];
  for (const change of [{ruleset:2},{id:"bad"},{illustrationId:"other"},{illustrationVersion:2},{completed:"false"},{placements:Array(25).fill({})},{placements:[{pieceId:"ivy-bell",destination:0,actorId:randomUUID(),extra:1}]}]) cases.push({...state,current:{...state.current,...change}});
  for (const value of cases) expect(validPuzzleTable(value),JSON.stringify(value)).toBe(false);
 });
 test("safe revision exhaustion rejects without mutation; actor cleanup and roster pruning are scoped",()=>{
  const state={...started(),revision:Number.MAX_SAFE_INTEGER},actor=randomUUID();
  expect(startPuzzle(state,randomUUID(),"rainy-nook",1)).toMatchObject({ok:false,code:"STORAGE_UNAVAILABLE",state});
  expect(placePuzzlePiece(state,{roundId:state.current!.id,pieceId:"ivy-bell",destination:0},actor)).toMatchObject({ok:false,code:"STORAGE_UNAVAILABLE",state});
  const presence=new PuzzlePresence(),houseId=randomUUID(),roundId=randomUUID(),epoch=randomUUID(),socketId=randomUUID();
  presence.join(houseId,roundId,{actorId:actor,socketId,generation:1,accessGeneration:1});presence.clearActor(randomUUID());
  expect(presence.project(epoch,houseId,roundId,socketId).memberIds).toEqual([actor]);presence.clearActor(actor);expect(presence.project(epoch,houseId,roundId,socketId).memberIds).toEqual([]);
  presence.join(houseId,roundId,{actorId:actor,socketId,generation:1,accessGeneration:1});presence.prune(houseId,roundId,()=>false);expect(presence.project(epoch,houseId,roundId,socketId).memberIds).toEqual([]);presence.clear();
 }); test("memory effects use committed facts only, clear once, preserve replay and never reuse pruned roster revisions", () => {
  const presence=new PuzzlePresence(), houseId=randomUUID(), roundId=randomUUID(), socketId=randomUUID(), actorId=randomUUID(), epoch=randomUUID();
  const before=presence.project(epoch,houseId,roundId,socketId);
  const joined=presence.join(houseId,roundId,{actorId,socketId,generation:1,accessGeneration:1});
  expect(presence.project(epoch,houseId,roundId,socketId).selfParticipationId).toBe(joined.participationId);
  presence.clearConnection(randomUUID()); expect(presence.project(epoch,houseId,roundId,socketId).memberIds).toEqual([actorId]);
  presence.committed({houseId,roundId,completed:true}); const complete=presence.project(epoch,houseId,roundId,socketId);
  expect(complete.memberIds).toEqual([]); presence.committed(null); presence.committed({houseId,roundId,completed:true}); expect(presence.project(epoch,houseId,roundId,socketId)).toEqual(complete);
  presence.retainHouses(new Set()); expect(presence.project(epoch,houseId,roundId,socketId).revision).toBeGreaterThan(complete.revision); expect(complete.revision).toBeGreaterThan(before.revision);
 });
});