/** Shared, versioned starter content; placement UUIDs belong to allocations, never templates. */
import { bedroomLayout, footprint, findRoute, validPosition } from './house-geometry.js';

export const ROOM_LIGHTS = Object.freeze(['standard', 'cosy', 'dim']);
const item = (key, kind, x, z, rotation, colour) => Object.freeze({ key, kind, x, z, rotation, colour });
const preset = (id, name, palette, light, items) => Object.freeze({ id, version: 1, name, palette, light, items: Object.freeze(items) });
export const ROOM_PRESETS = Object.freeze([
  preset('amber-corner', 'Amber corner', 'amber', 'standard', [
    item('bed', 'bed', -4.5, -1, 0, 'amber'), item('desk', 'desk', 3.5, -3.5, 0, 'amber'),
    item('chair', 'chair', 3.5, -2, 2, 'amber'), item('lamp', 'lamp', 5.5, -3.5, 0, 'amber'),
    item('shelf', 'shelf', -3.5, -4, 0, 'amber'), item('plant', 'plant', 5.5, 2.5, 0, 'sage'),
  ]),
  preset('sage-corner', 'Sage corner', 'sage', 'cosy', [
    item('bed', 'bed', 4.5, -1, 0, 'sage'), item('desk', 'desk', -3.5, -3.5, 0, 'sage'),
    item('chair', 'chair', -3.5, -2, 2, 'sage'), item('lamp', 'lamp', -5.5, -3.5, 0, 'amber'),
    item('shelf', 'shelf', 3.5, -4, 0, 'sage'), item('plant', 'plant', -5.5, 2.5, 0, 'sage'),
  ]),
  preset('rose-alcove', 'Rose alcove', 'rose', 'cosy', [
    item('bed', 'bed', -4, -2, 1, 'rose'), item('desk', 'desk', 3.5, -2.5, 3, 'rose'),
    item('chair', 'chair', 2, -2.5, 1, 'rose'), item('lamp', 'lamp', 5.5, 0, 0, 'amber'),
    item('shelf', 'shelf', -5, 2, 1, 'rose'), item('plant-rear', 'plant', -2.5, -4, 0, 'sage'),
    item('plant-front', 'plant', 4.5, 3, 0, 'sage'),
  ]),
  preset('blue-window', 'Blue window', 'blue', 'standard', [
    item('bed', 'bed', 4.5, -1, 0, 'blue'), item('desk', 'desk', -3.5, -3.5, 0, 'blue'),
    item('chair', 'chair', -3.5, -2, 2, 'blue'), item('lamp', 'lamp', -5.5, -3.5, 0, 'amber'),
    item('shelf-rear', 'shelf', 3.5, -4, 0, 'blue'), item('plant', 'plant', -5, 2.5, 0, 'sage'),
    item('shelf-front', 'shelf', 5.5, 2.5, 0, 'blue'),
  ]),
  preset('lavender-gallery', 'Lavender gallery', 'lavender', 'dim', [
    item('bed', 'bed', -4.5, -0.5, 0, 'lavender'), item('desk', 'desk', 3.5, -3.5, 0, 'lavender'),
    item('chair', 'chair', 3.5, -2, 2, 'lavender'), item('lamp', 'lamp', 5.5, -3.5, 0, 'amber'),
    item('shelf-rear', 'shelf', -3.5, -4, 0, 'lavender'), item('shelf-front', 'shelf', -5, 3, 0, 'lavender'),
    item('plant-rear', 'plant', -1.5, -4, 0, 'sage'), item('plant-front', 'plant', 5, 3, 0, 'sage'),
  ]),
  preset('peach-nook', 'Peach nook', 'peach', 'cosy', [
    item('bed', 'bed', 4, -2, 1, 'peach'), item('desk', 'desk', -3.5, -2.5, 1, 'peach'),
    item('chair', 'chair', -2, -2.5, 3, 'peach'), item('lamp', 'lamp', -5.5, 0, 0, 'amber'),
    item('plant', 'plant', 5, 2.5, 0, 'sage'),
  ]),
]);

export function getRoomPreset(id) { return ROOM_PRESETS.find(value => value.id === id) ?? null; }
export function roomPresetForSlot(slot) {
  if (!Number.isInteger(slot) || slot < 0 || slot >= ROOM_PRESETS.length) throw new RangeError('Choose a permanent room slot from zero to five.');
  return ROOM_PRESETS[slot];
}
export function instantiateRoomPreset(presetId, makeId) {
  const value = getRoomPreset(presetId);
  if (!value) throw new RangeError('Choose a supported starter room.');
  return { palette: value.palette, light: value.light, originPresetId: value.id, originPresetVersion: value.version,
    placements: value.items.map(({ key, ...piece }) => ({ id: makeId(key), ...piece })) };
}

/** An optional approach target for useful objects; chairs retain authoritative seat geometry. */
export function roomInteractionTarget(placements, itemId) {
  const piece = placements.find(value => value.id === itemId);
  if (!piece || !['desk', 'lamp'].includes(piece.kind)) return null;
  const layout = bedroomLayout(placements), bounds = footprint(piece), heading = piece.rotation * Math.PI / 2;
  for (const turn of [0, 1, -1, 2, 0.5, -0.5, 1.5, -1.5]) {
    const angle = heading + turn * Math.PI / 2;
    const point = { x: piece.x - Math.sin(angle) * (bounds.w / 2 + 0.55), z: piece.z - Math.cos(angle) * (bounds.d / 2 + 0.55) };
    if (validPosition(layout, point) && findRoute(layout, layout.spawn, point)) return point;
  }
  return null;
}
