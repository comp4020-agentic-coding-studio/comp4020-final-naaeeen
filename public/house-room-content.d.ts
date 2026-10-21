import type { Colour, Placement, RoomLight } from "../src/house-contract.ts";
export interface RoomPresetItem { readonly key: string; readonly kind: string; readonly x: number; readonly z: number; readonly rotation: number; readonly colour: Colour }
export interface RoomPreset { readonly id: string; readonly version: number; readonly name: string; readonly palette: Colour; readonly light: RoomLight; readonly items: readonly RoomPresetItem[] }
export const ROOM_LIGHTS: readonly RoomLight[];
export const ROOM_PRESETS: readonly RoomPreset[];
export function getRoomPreset(id: unknown): RoomPreset | null;
export function roomPresetForSlot(slot: number): RoomPreset;
export function instantiateRoomPreset(presetId: string, makeId: (key: string) => string): {palette: Colour; light: RoomLight; originPresetId: string; originPresetVersion: number; placements: Placement[]};
export function roomInteractionTarget(placements: Placement[], itemId: string): {x: number; z: number} | null;
