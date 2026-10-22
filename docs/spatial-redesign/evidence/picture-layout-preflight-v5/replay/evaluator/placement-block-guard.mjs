import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
export function assertBlockedPlacement(before,after){
  assert.equal(after.placeSends,before.placeSends,'A durable-pending attempt must not send another puzzle.place');
  assert.ok(isDeepStrictEqual(after.placements,before.placements),'A durable-pending attempt must keep exact fixture placements unchanged');
  assert.equal(after.domPlacements,before.domPlacements,'A durable-pending attempt must not add a placed DOM cell');
}
// Self-contained for the same Playwright evaluation and browser-free fixture control.
export function readPlacementObservation(){
  return {placeSends:window.fixture.events.filter(item=>item.event==='send'&&item.type==='puzzle.place').length,
    placements:window.fixture.inspectPlacements(),domPlacements:document.querySelectorAll('[data-puzzle-destination].placed').length};
}
