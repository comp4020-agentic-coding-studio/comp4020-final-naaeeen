import assert from 'node:assert/strict';
export function assertRosterRows(rows,memberIds,residents,selfId){
  assert.equal(rows.length,memberIds.length,'Hidden or visible roster must have the exact current member count');
  assert.deepEqual(rows.map(row=>row.id).sort(),[...memberIds].sort(),'Hidden or visible rows must match current authenticated member IDs');
  for(const row of rows){const resident=residents.find(person=>person.id===row.id);assert.ok(resident,'Every roster row must map to the authenticated resident list');assert.equal(row.text,resident.name+(row.id===selfId?' · you':''),'Exact authenticated display name and self marker required');}
}
export function assertOwnedReturn(proof){
  assert.equal(proof.identityAfter,proof.identityBefore);assert.equal(proof.houseAfter,proof.houseBefore);
  assert.equal(proof.zoneId,proof.expectedRoomId);assert.equal(proof.roomId,proof.expectedRoomId);assert.equal(proof.roomOwnerId,proof.identityBefore);
  assert.equal(proof.controller,true);assert.equal(proof.studioVisible,true);assert.equal(proof.placementsUnchanged,true);assert.equal(proof.placementCount,24);
}
