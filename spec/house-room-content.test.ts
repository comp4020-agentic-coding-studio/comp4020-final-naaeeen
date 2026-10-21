import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ROOM_PRESETS, ROOM_LIGHTS, getRoomPreset, instantiateRoomPreset, roomPresetForSlot, roomInteractionTarget } from "../public/house-room-content.js";
import { bedroomLayout, findRoute, validPosition, validatePlacements } from "../public/house-geometry.js";

describe("versioned room content",()=>{
  it("has six bounded stable catalogues, stable item keys and independent allocation UUIDs",()=>{
    expect(ROOM_PRESETS.map(p=>p.id)).toEqual(["amber-corner","sage-corner","rose-alcove","blue-window","lavender-gallery","peach-nook"]);
    expect(ROOM_LIGHTS).toEqual(["standard","cosy","dim"]);
    for(const [slot,preset] of ROOM_PRESETS.entries()){
      expect(roomPresetForSlot(slot)).toBe(preset);expect(getRoomPreset(preset.id)).toBe(preset);
      expect(preset.version).toBe(1);expect(preset.items.length).toBeGreaterThanOrEqual(5);expect(preset.items.length).toBeLessThanOrEqual(8);
      expect(new Set(preset.items.map(p=>p.key)).size).toBe(preset.items.length);
      expect(["bed","desk","chair","lamp"].every(kind=>preset.items.some(p=>p.kind===kind))).toBe(true);
      const one=instantiateRoomPreset(preset.id,()=>randomUUID()),two=instantiateRoomPreset(preset.id,()=>randomUUID());
      expect(one.placements.map(p=>p.id)).not.toEqual(two.placements.map(p=>p.id));
      expect(one.placements.map(({id,...p})=>p)).toEqual(two.placements.map(({id,...p})=>p));
      expect(Object.isFrozen(preset.items[0])).toBe(true);
    }
    expect(getRoomPreset("missing")).toBeNull();
    for(const slot of [-1,6,.5,NaN])expect(()=>roomPresetForSlot(slot)).toThrow(RangeError);
    expect(()=>instantiateRoomPreset("missing",()=>randomUUID())).toThrow(RangeError);
  });

  it.each(ROOM_PRESETS)("$id desk faces its paired chair and the seated heading faces the desk",preset=>{
    const desks=preset.items.filter(piece=>piece.kind==="desk"),chairs=preset.items.filter(piece=>piece.kind==="chair");
    for(const desk of desks){
      const chair=[...chairs].sort((a,b)=>Math.hypot(a.x-desk.x,a.z-desk.z)-Math.hypot(b.x-desk.x,b.z-desk.z))[0]!;
      const dx=chair.x-desk.x,dz=chair.z-desk.z,deskHeading=desk.rotation*Math.PI/2,chairHeading=chair.rotation*Math.PI/2;
      // house-world's monitor accent faces local +Z, transformed by the desk's world Y rotation.
      expect(dx*Math.sin(deskHeading)+dz*Math.cos(deskHeading),"The chair must be on the monitor's front side").toBeGreaterThan(0);
      expect(-dx*Math.sin(chairHeading)-dz*Math.cos(chairHeading),"The authoritative seated heading must face toward the desk").toBeGreaterThan(0);
    }
  });

  it.each(ROOM_PRESETS.flatMap(preset=>[2,3,4,5,6].map(capacity=>({preset,capacity}))))("$preset.id routes every actual arrival to exit, chair, desk and lamp at capacity $capacity",({preset,capacity})=>{
    const {placements}=instantiateRoomPreset(preset.id,()=>randomUUID()),layout=bedroomLayout(placements);
    expect(validatePlacements(placements)).toBe(true);
    const actions=placements.filter(p=>["desk","lamp"].includes(p.kind)).map(p=>roomInteractionTarget(placements,p.id));
    expect(actions.every(Boolean)).toBe(true);
    const targets=[layout.exitTarget,...layout.seats.map(seat=>seat.target),...actions] as {x:number;z:number}[];
    for(let slot=0;slot<capacity;slot++){
      // Exactly the arrival band used by house-realtime.resetZone, rather than geometry.spawn alone.
      const arrival={x:.65*(slot-(capacity-1)/2),z:3.3};
      expect(validPosition(layout,arrival)).toBe(true);
      for(const target of targets)expect(findRoute(layout,arrival,target)).not.toBeNull();
    }
    expect(roomInteractionTarget(placements,"missing")).toBeNull();
    expect(roomInteractionTarget(placements,placements.find(p=>p.kind==="bed")!.id)).toBeNull();
  });
});
