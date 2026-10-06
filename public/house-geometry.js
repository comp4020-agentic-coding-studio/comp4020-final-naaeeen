/** Browser/server shared geometry. Coordinates are metres in the 12 × 8 floor. */
/** @typedef {{x:number,z:number}} Point */
/** @typedef {{id?:string,x:number,z:number,w:number,d:number}} Obstacle */
/** @typedef {{id:string,x:number,z:number,heading:number,target:Point}} Seat */
/** @typedef {{id:string,slot:number,x:number,z:number,wall:'rear'|'side',target:Point}} Door */
/** @typedef {{width:number,depth:number,obstacles:Obstacle[],seats:Seat[],doors:Door[],spawn:Point,boardTarget:Point,exitTarget:Point}} Layout */
export const AVATAR_RADIUS = 0.24;
export const COLOURS = Object.freeze(['amber', 'sage', 'rose', 'blue', 'lavender', 'peach']);
export const FURNITURE = Object.freeze({
  desk: Object.freeze({ w: 2, d: 1 }), chair: Object.freeze({ w: 0.8, d: 0.8 }),
  bed: Object.freeze({ w: 2, d: 3 }), shelf: Object.freeze({ w: 1.5, d: 0.5 }),
  plant: Object.freeze({ w: 0.6, d: 0.6 }), lamp: Object.freeze({ w: 0.5, d: 0.5 }),
});

/** @param {number} capacity @returns {Layout} */
export function createLayout(capacity = 4) {
  if (!Number.isInteger(capacity) || capacity < 2 || capacity > 6) throw new RangeError('Capacity must be 2 to 6.');
  const rear = capacity <= 4 ? capacity : Math.ceil(capacity / 2);
  const spacing = rear <= 3 ? 2.6 : 1.72;
  const doors = Array.from({ length: capacity }, (_, slot) => slot < rear
    ? { id: 'door-' + slot, slot, wall: /** @type {'rear'} */ ('rear'), x: (slot - (rear - 1) / 2) * spacing, z: -3.96, target: { x: (slot - (rear - 1) / 2) * spacing, z: -3.06 } }
    : { id: 'door-' + slot, slot, wall: /** @type {'side'} */ ('side'), x: -5.96, z: (slot - rear - (capacity - rear - 1) / 2) * 2.2, target: { x: -5.04, z: (slot - rear - (capacity - rear - 1) / 2) * 2.2 } });
  const seats = Array.from({ length: capacity }, (_, i) => {
    const angle = Math.PI / 2 + i * Math.PI * 2 / capacity;
    const x = Math.cos(angle) * 2.15, z = Math.sin(angle) * 1.9;
    return { id: 'seat-' + (i + 1), x, z, heading: Math.atan2(-x, -z), target: { x: Math.cos(angle) * 3.2, z: Math.sin(angle) * 3 } };
  });
  const obstacles = [
    { id: 'table', x: 0, z: 0, w: 2.5, d: 1.8 },
    { id: 'tea-cabinet', x: -4.55, z: 3.42, w: 1.7, d: 0.6 },
    { id: 'bookcase', x: 4.65, z: -2.15, w: 1.5, d: 0.62 },
    { id: 'couch', x: 3.95, z: 2.55, w: 1.9, d: 0.9 },
    { id: 'rear-lamp', x: -3.1, z: -2.55, w: 0.4, d: 0.4 },
    { id: 'rear-pot', x: -5.4, z: -3.4, w: 0.52, d: 0.52 },
    { id: 'board', x: 5.8, z: 0.25, w: 0.15, d: 2 },
    ...seats.map(seat => {
      const yaw = Math.atan2(seat.x, seat.z), s = Math.sin(yaw), c = Math.cos(yaw);
      return { id: seat.id, x: seat.x + s * 0.035, z: seat.z + c * 0.035, w: Math.abs(c) * 0.78 + Math.abs(s) * 0.8, d: Math.abs(s) * 0.78 + Math.abs(c) * 0.8 };
    }),
  ];
  return { width: 12, depth: 8, doors, seats, obstacles, spawn: { x: 0, z: 2.85 }, boardTarget: { x: 4.85, z: 0.25 }, exitTarget: { x: 0, z: 3.2 } };
}

/** @param {{kind:string,x:number,z:number,rotation:number,id:string}} placement @returns {Obstacle} */
export function footprint(placement) {
  const base = FURNITURE[placement.kind];
  if (!base) throw new RangeError('Unknown furniture kind.');
  return { id: placement.id, x: placement.x, z: placement.z, w: placement.rotation % 2 ? base.d : base.w, d: placement.rotation % 2 ? base.w : base.d };
}

/** Furniture cannot occupy the arrival band or central exit corridor. @param {unknown} value */
export function validatePlacements(value) {
  if (!Array.isArray(value) || value.length > 10) return false;
  const ids = new Set(), rectangles = [];
  for (const p of value) {
    if (!p || typeof p !== 'object' || typeof p.id !== 'string' || !p.id || p.id.length > 80 || ids.has(p.id)) return false;
    if (!Object.hasOwn(FURNITURE, p.kind) || !COLOURS.includes(p.colour)) return false;
    if (!Number.isFinite(p.x) || !Number.isFinite(p.z) || !Number.isInteger(p.x * 2) || !Number.isInteger(p.z * 2)) return false;
    if (!Number.isInteger(p.rotation) || p.rotation < 0 || p.rotation > 3) return false;
    const r = footprint(p);
    if (Math.abs(r.x) + r.w / 2 > 5.75 || Math.abs(r.z) + r.d / 2 > 3.75) return false;
    if (r.z + r.d / 2 > 2.5 || Math.abs(r.x) - r.w / 2 < 0.65) return false;
    if (rectangles.some(other => Math.abs(r.x - other.x) < (r.w + other.w) / 2 + 0.08 && Math.abs(r.z - other.z) < (r.d + other.d) / 2 + 0.08)) return false;
    ids.add(p.id); rectangles.push(r);
  }
  const layout = bedroomLayout(value);
  return layout.seats.every(seat => validPosition(layout, seat.target) && findRoute(layout, layout.spawn, seat.target) !== null);
}

/** @param {{kind:string,x:number,z:number,rotation:number,id:string}[]} placements @returns {Layout} */
export function bedroomLayout(placements = []) {
  const obstacles = placements.map(footprint);
  const room = { width: 12, depth: 8, obstacles, seats: [], doors: [], spawn: { x: 0, z: 3 }, exitTarget: { x: 0, z: 3.3 }, boardTarget: { x: 0, z: 3.3 } };
  room.seats = placements.filter(p => p.kind === 'chair').map(p => {
    const heading = p.rotation * Math.PI / 2;
    const candidates = [1.05, 0.85, 1.25].flatMap(radius => [0, 1, -1, 2, 0.5, -0.5, 1.5, -1.5].map(turn => {
      const angle = heading + turn * Math.PI / 2;
      return { x: p.x - Math.sin(angle) * radius, z: p.z - Math.cos(angle) * radius };
    }));
    const target = candidates.find(point => validPosition(room, point)) ?? candidates[0];
    return { id: p.id, x: p.x, z: p.z, heading, target };
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
