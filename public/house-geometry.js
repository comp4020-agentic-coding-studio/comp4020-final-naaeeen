export { HOUSE_WORLD_VERSION } from './house-version.js';
/** Browser/server shared geometry. Coordinates are metres; room dimensions and destination anchors are authoritative. */
/** @typedef {{x:number,z:number}} Point */
/** @typedef {{id?:string,x:number,z:number,w:number,d:number}} Obstacle */
/** @typedef {{id:string,x:number,z:number,heading:number,target:Point,purpose:'study'|'rest'|'game'|'bedroom',fixtureId?:string}} Seat */
/** @typedef {{id:string,slot:number,x:number,z:number,wall:'rear'|'side',target:Point}} Door */
/** @typedef {{width:number,depth:number,obstacles:Obstacle[],seats:Seat[],doors:Door[],spawn:Point,boardTarget:Point,exitTarget:Point,arrivals?:Point[],gameTarget?:Point}} Layout */
export const AVATAR_RADIUS = 0.24;
export const ROOM_DIMENSIONS = Object.freeze({
  lounge: Object.freeze({ width: 20, depth: 14 }),
  bedroom: Object.freeze({ width: 14, depth: 10 }),
});
export const BEDROOM_ARRIVAL = Object.freeze({ x: 0, z: 3 });
export const BEDROOM_EXIT = Object.freeze({ x: 0, z: 4.3 });
export const CAMERA_ORIENTATION = Object.freeze({ x: 11, y: 13, z: 14, lookY: 0.4 });
export const AVATAR_HEIGHT = 1.46;
export const SEATED_LIFT = -0.05;
export const FURNITURE_HEIGHTS = Object.freeze({ chairSeat: 0.4, deskTop: 0.75, tableTop: 0.735 });
export const COLOURS = Object.freeze(['amber', 'sage', 'rose', 'blue', 'lavender', 'peach']);
export const FURNITURE = Object.freeze({
  desk: Object.freeze({ w: 2, d: 1 }), chair: Object.freeze({ w: 0.8, d: 0.8 }),
  bed: Object.freeze({ w: 2, d: 3 }), shelf: Object.freeze({ w: 1.5, d: 0.5 }),
  plant: Object.freeze({ w: 0.6, d: 0.6 }), lamp: Object.freeze({ w: 0.5, d: 0.5 }),
});

/** Matched spatial candidates. Only the expanded layout is used by the production world. */
export const LOUNGE_VARIANTS = Object.freeze({
  compact: Object.freeze({ width: 16, depth: 11, doorSpacing: 2.3, spawnZ: 3.3,
    table: [-0.6, -1.3], game: [-5.1, 2.35], restOffset: [0, 0],
    tea: [-7, 4.85], books: [6.7, -3.55], pot: [-7.25, -4.7], lamp: [2.65, 4.8], board: [7.8, -1.1], boardApproach: [6.85, -1.1], exitZ: 4.7 }),
  expanded: Object.freeze({ width: 20, depth: 14, doorSpacing: 2.8, spawnZ: 4.65,
    table: [-1, -2], game: [-6.2, 3.3], restOffset: [1, 0.9],
    tea: [-8.6, 5.8], books: [8.6, -4.7], pot: [-9.2, -6.2], lamp: [3.65, 5.7], board: [9.8, -1.7], boardApproach: [8.85, -1.7], exitZ: 6.2 }),
});

/** @param {number} capacity @param {'compact'|'expanded'} variant @returns {Layout} */
export function createLayout(capacity = 4, variant = 'expanded') {
  if (!Number.isInteger(capacity) || capacity < 2 || capacity > 6) throw new RangeError('Capacity must be 2 to 6.');
  if (!Object.hasOwn(LOUNGE_VARIANTS, variant)) throw new RangeError('Unknown lounge layout.');
  const spec = LOUNGE_VARIANTS[variant], { width, depth } = spec;
  const doors = Array.from({ length: capacity }, (_, slot) => {
    const x = (slot - (capacity - 1) / 2) * spec.doorSpacing;
    return { id: 'door-' + slot, slot, wall: /** @type {'rear'} */ ('rear'), x, z: -depth / 2 + 0.04, target: { x, z: -depth / 2 + 1.05 } };
  });
  const studySeats = Array.from({ length: capacity }, (_, i) => {
    const angle = Math.PI / 2 + i * Math.PI * 2 / capacity;
    const x = Math.cos(angle) * 2.15, z = Math.sin(angle) * 1.9;
    return { id: 'seat-' + (i + 1), purpose: /** @type {'study'} */ ('study'), x: spec.table[0] + x, z: spec.table[1] + z, heading: Math.atan2(-x, -z), target: { x: spec.table[0] + Math.cos(angle) * 3.2, z: spec.table[1] + Math.sin(angle) * 3 } };
  });
  const restSeats = [
    [3.8, 4, Math.PI, 3.4, 3.05], [4.8, 4, Math.PI, 4.5, 3.05], [5.8, 4, Math.PI, 5.6, 3.2],
    [6.8, .5, -Math.PI / 2, 5.65, .5], [6.8, 1.5, -Math.PI / 2, 5.65, 1.5], [6.8, 2.5, -Math.PI / 2, 5.65, 2.5],
  ].map(([x, z, heading, targetX, targetZ], i) => ({ id: 'rest-seat-' + (i + 1), purpose: /** @type {'rest'} */ ('rest'), fixtureId: i < 3 ? 'rest-sofa-a' : 'rest-sofa-b', x: x + spec.restOffset[0], z: z + spec.restOffset[1], heading, target: { x: targetX + spec.restOffset[0], z: targetZ + spec.restOffset[1] } }));
  const gameSeats = [-1, 1].map((side, i) => ({ id: 'game-seat-' + (i + 1), purpose: /** @type {'game'} */ ('game'), x: spec.game[0], z: spec.game[1] + side * 1.55, heading: side === 1 ? Math.PI : 0, target: { x: spec.game[0], z: spec.game[1] + side * 2.6 } }));
  const seats = [...studySeats, ...restSeats, ...gameSeats];
  const fixture = (id, position, w, d) => ({ id, x: position[0], z: position[1], w, d });
  const obstacles = [
    fixture('table', spec.table, 2.5, 1.8), fixture('game-table', spec.game, 1.8, 1.4),
    fixture('rest-sofa-a', [4.8 + spec.restOffset[0], 4.1 + spec.restOffset[1]], 3.3, 1),
    fixture('rest-sofa-b', [6.95 + spec.restOffset[0], 1.5 + spec.restOffset[1]], 1, 3.3),
    fixture('rest-table', [4.55 + spec.restOffset[0], 1.5 + spec.restOffset[1]], 1.3, .8),
    fixture('tea-cabinet', spec.tea, 1.78, .65), fixture('bookcase', spec.books, 1.5, .62),
    fixture('rest-lamp', spec.lamp, .5, .5), fixture('rear-pot', spec.pot, .6, .6), fixture('board', spec.board, .3, 2),
    ...seats.filter(seat => !seat.fixtureId).map(seat => {
      const yaw = seat.heading + Math.PI, s = Math.sin(yaw), c = Math.cos(yaw);
      return { id: seat.id, x: seat.x + s * .035, z: seat.z + c * .035, w: Math.abs(c) * .78 + Math.abs(s) * .8, d: Math.abs(s) * .78 + Math.abs(c) * .8 };
    }),
  ];
  return { width, depth, doors, seats, obstacles, spawn: { x: 0, z: spec.spawnZ },
    arrivals: Array.from({ length: capacity }, (_, slot) => ({ x: .65 * (slot - (capacity - 1) / 2), z: spec.spawnZ })),
    boardTarget: { x: spec.boardApproach[0], z: spec.boardApproach[1] }, gameTarget: { x: spec.game[0] + 1.45, z: spec.game[1] }, exitTarget: { x: 0, z: spec.exitZ } };
}

/** @param {{kind:string,x:number,z:number,rotation:number,id:string}} placement @returns {Obstacle} */
export function footprint(placement) {
  const base = FURNITURE[placement.kind];
  if (!base) throw new RangeError('Unknown furniture kind.');
  return { id: placement.id, x: placement.x, z: placement.z, w: placement.rotation % 2 ? base.d : base.w, d: placement.rotation % 2 ? base.w : base.d };
}

/** Furniture protects the arrival/exit aperture and must keep actual routes open. @param {unknown} value */
export function validatePlacements(value) {
  if (!Array.isArray(value) || value.length > 10) return false;
  const ids = new Set(), rectangles = [];
  for (const p of value) {
    if (!p || typeof p !== 'object' || typeof p.id !== 'string' || !p.id || p.id.length > 80 || ids.has(p.id)) return false;
    if (!Object.hasOwn(FURNITURE, p.kind) || !COLOURS.includes(p.colour)) return false;
    if (!Number.isFinite(p.x) || !Number.isFinite(p.z) || !Number.isInteger(p.x * 2) || !Number.isInteger(p.z * 2)) return false;
    if (!Number.isInteger(p.rotation) || p.rotation < 0 || p.rotation > 3) return false;
    const r = footprint(p);
    const { width, depth } = ROOM_DIMENSIONS.bedroom;
    if (Math.abs(r.x) + r.w / 2 > width / 2 - 0.25 || Math.abs(r.z) + r.d / 2 > depth / 2 - 0.25) return false;
    // Protect a compact one-person arrival/exit aperture, not a full-room strip.
    if (Math.abs(r.x) < r.w / 2 + 0.65 && r.z + r.d / 2 > BEDROOM_ARRIVAL.z - 0.5 && r.z - r.d / 2 < BEDROOM_EXIT.z + 0.45) return false;
    if (rectangles.some(other => Math.abs(r.x - other.x) < (r.w + other.w) / 2 + 0.08 && Math.abs(r.z - other.z) < (r.d + other.d) / 2 + 0.08)) return false;
    ids.add(p.id); rectangles.push(r);
  }
  const layout = bedroomLayout(value);
  return findRoute(layout, layout.spawn, layout.exitTarget) !== null && layout.seats.every(seat => validPosition(layout, seat.target) && findRoute(layout, layout.spawn, seat.target) !== null);
}

/** @param {{kind:string,x:number,z:number,rotation:number,id:string}[]} placements @returns {Layout} */
export function bedroomLayout(placements = []) {
  const obstacles = placements.map(footprint);
  const room = { ...ROOM_DIMENSIONS.bedroom, obstacles, seats: [], doors: [], spawn: { ...BEDROOM_ARRIVAL }, exitTarget: { ...BEDROOM_EXIT }, boardTarget: { ...BEDROOM_EXIT } };
  room.seats = placements.filter(p => p.kind === 'chair').map(p => {
    const heading = p.rotation * Math.PI / 2;
    const candidates = [1.05, 0.85, 1.25].flatMap(radius => [0, 1, -1, 2, 0.5, -0.5, 1.5, -1.5].map(turn => {
      const angle = heading + turn * Math.PI / 2;
      return { x: p.x - Math.sin(angle) * radius, z: p.z - Math.cos(angle) * radius };
    }));
    const target = candidates.find(point => validPosition(room, point)) ?? candidates[0];
    return { id: p.id, purpose: /** @type {'bedroom'} */ ('bedroom'), x: p.x, z: p.z, heading, target };
  });
  return room;
}

/** Circle against the exact axis-aligned furniture footprints. @param {Layout} layout @param {Point} point */
export function validPosition(layout, point) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.z)) return false;
  if (Math.abs(point.x) > layout.width / 2 - AVATAR_RADIUS || Math.abs(point.z) > layout.depth / 2 - AVATAR_RADIUS) return false;
  return !layout.obstacles.some(r => {
    const dx = Math.max(Math.abs(point.x - r.x) - r.w / 2, 0), dz = Math.max(Math.abs(point.z - r.z) - r.d / 2, 0);
    return dx * dx + dz * dz < AVATAR_RADIUS * AVATAR_RADIUS;
  });
}

/** Substeps prevent tunnelling; blocked movement slides on the other axis. @param {Layout} layout @param {Point} pos @param {number} dx @param {number} dz @returns {Point} */
export function slide(layout, pos, dx, dz) {
  if (!Number.isFinite(dx) || !Number.isFinite(dz)) return { ...pos };
  const result = { ...pos }, steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.08));
  for (let i = 0; i < steps; i++) {
    const x = { x: result.x + dx / steps, z: result.z }; if (validPosition(layout, x)) result.x = x.x;
    const z = { x: result.x, z: result.z + dz / steps }; if (validPosition(layout, z)) result.z = z.z;
  }
  return result;
}

/** Quarter-metre BFS with verified off-grid connectors. @param {Layout} layout @param {Point} start @param {Point} destination @returns {Point[]|null} */
export function findRoute(layout, start, destination) {
  if (!validPosition(layout, start) || !validPosition(layout, destination)) return null;
  const step = 0.25, width = Math.floor(layout.width / step) + 1, depth = Math.floor(layout.depth / step) + 1;
  const point = index => ({ x: index % width * step - layout.width / 2, z: Math.floor(index / width) * step - layout.depth / 2 });
  const clear = (a, b) => {
    const count = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.025));
    for (let i = 0; i <= count; i++) if (!validPosition(layout, { x: a.x + (b.x - a.x) * i / count, z: a.z + (b.z - a.z) * i / count })) return false;
    return true;
  };
  const nearest = p => {
    let best = -1, distance = Infinity;
    for (let n = 0; n < width * depth; n++) {
      const q = point(n); if (!validPosition(layout, q)) continue;
      const d = (q.x - p.x) ** 2 + (q.z - p.z) ** 2;
      if (d < distance && clear(p, q)) { best = n; distance = d; }
    }
    return best;
  };
  const first = nearest(start), last = nearest(destination);
  if (first < 0 || last < 0) return null;
  const queue = [first], visited = new Map([[first, null]]);
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head]; if (current === last) break;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = current % width + dx, z = Math.floor(current / width) + dz;
      if (x < 0 || x >= width || z < 0 || z >= depth) continue;
      const next = z * width + x;
      if (visited.has(next) || !validPosition(layout, point(next)) || !clear(point(current), point(next))) continue;
      visited.set(next, current); queue.push(next);
    }
  }
  if (!visited.has(last)) return null;
  const route = []; for (let n = last; n !== null; n = visited.get(n)) route.unshift(point(n));
  route.unshift({ ...start }); route.push({ ...destination }); return route;
}
