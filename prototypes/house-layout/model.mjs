export const ROOM = Object.freeze({ halfWidth: 6, halfDepth: 4, avatarRadius: 0.24 });
export const MEMBERS = Object.freeze([
  { id: 'you', name: 'You', colour: '#d99875' }, { id: 'fern', name: 'Fern', colour: '#8aa68b' },
  { id: 'milo', name: 'Milo', colour: '#cbad76' }, { id: 'june', name: 'June', colour: '#8eacc1' },
  { id: 'ren', name: 'Ren', colour: '#b395b1' }, { id: 'sol', name: 'Sol', colour: '#c58687' },
]);
const fixturePositions = [{ x: 0, z: 2.75 }, { x: -4.4, z: 1.7 }, { x: -3.4, z: 2.7 }, { x: 3.4, z: 2.7 }, { x: 4.4, z: 1.7 }, { x: 2.8, z: -2.7 }];
export function createLayout(capacity = 4, variant = 'A') {
  if (!Number.isInteger(capacity) || capacity < 2 || capacity > 6) throw new RangeError('Capacity must be 2 to 6.');
  if (!['A', 'B'].includes(variant)) throw new RangeError('Layout must be A or B.');
  const members = MEMBERS.slice(0, capacity).map((m, i) => ({ ...m, ...fixturePositions[i] }));
  const rearCount = variant === 'A' ? capacity : Math.ceil(capacity / 2), sideCount = capacity - rearCount;
  const spacing = rearCount <= 3 ? 2.6 : 1.72;
  const doors = members.map((m, i) => i < rearCount
    ? { id: m.id, name: m.name, wall: 'rear', x: (i - (rearCount - 1) / 2) * spacing, z: -3.96, target: { x: (i - (rearCount - 1) / 2) * spacing, z: -3.06 } }
    : { id: m.id, name: m.name, wall: 'side', x: -5.96, z: (i - rearCount - (sideCount - 1) / 2) * 2.2, target: { x: -5.04, z: (i - rearCount - (sideCount - 1) / 2) * 2.2 } });
  const seats = members.map((m, i) => {
    const angle = Math.PI / 2 + i * Math.PI * 2 / capacity, x = Math.cos(angle) * 2.15, z = Math.sin(angle) * 1.9;
    return { id: 'seat-' + (i + 1), number: i + 1, x, z, angle, target: { x: Math.cos(angle) * 3.2, z: Math.sin(angle) * 3.0 } };
  });
  const obstacles = [
    { id: 'table', x: 0, z: 0, width: 2.5, depth: 1.8 },
    { id: 'tea-cabinet', x: -4.55, z: 3.42, width: 1.7, depth: 0.6 },
    { id: 'bookcase', x: 4.65, z: -2.15, width: 1.5, depth: 0.62 },
    { id: 'rear-lamp', x: -3.1, z: -2.55, width: 0.40, depth: 0.40 },
    { id: 'front-lamp', x: 3.55, z: 3.15, width: 0.40, depth: 0.40 },
    { id: 'rear-pot', x: -5.4, z: -3.4, width: 0.52, depth: 0.52 },
    { id: 'front-pot', x: 5.25, z: 3.1, width: 0.60, depth: 0.60 },
    { id: 'board', x: 5.8, z: 0.25, width: 0.15, depth: 2.0 },
    ...seats.map(s => {
      const yaw = Math.atan2(s.x, s.z), sin = Math.sin(yaw), cos = Math.cos(yaw);
      // Includes the rotated backrest, whose local footprint extends to z=0.435.
      return { id: s.id, x: s.x + sin * 0.035, z: s.z + cos * 0.035, width: Math.abs(cos) * 0.78 + Math.abs(sin) * 0.80, depth: Math.abs(sin) * 0.78 + Math.abs(cos) * 0.80 };
    }),
  ];
  return { capacity, variant, members, doors, seats, obstacles, boardTarget: { x: 4.85, z: 0.25 } };
}
export function canOccupy(point, obstacles, radius = ROOM.avatarRadius) {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.z)) return false;
  if (Math.abs(point.x) > ROOM.halfWidth - radius || Math.abs(point.z) > ROOM.halfDepth - radius) return false;
  return !obstacles.some(rect => {
    const dx = Math.max(Math.abs(point.x - rect.x) - rect.width / 2, 0), dz = Math.max(Math.abs(point.z - rect.z) - rect.depth / 2, 0);
    return dx * dx + dz * dz < radius * radius;
  });
}
export function moveWithCollision(point, delta, obstacles) {
  let result = { ...point };
  const steps = Math.max(1, Math.ceil(Math.hypot(delta.x, delta.z) / 0.1));
  for (let i = 0; i < steps; i++) {
    const nextX = { x: result.x + delta.x / steps, z: result.z }; if (canOccupy(nextX, obstacles)) result.x = nextX.x;
    const nextZ = { x: result.x, z: result.z + delta.z / steps }; if (canOccupy(nextZ, obstacles)) result.z = nextZ.z;
  }
  return result;
}
export function findRoute(start, destination, obstacles, step = 0.25) {
  const width = Math.floor(ROOM.halfWidth * 2 / step) + 1, depth = Math.floor(ROOM.halfDepth * 2 / step) + 1;
  const point = index => ({ x: index % width * step - ROOM.halfWidth, z: Math.floor(index / width) * step - ROOM.halfDepth });
  const clearSegment = (a, b) => {
    const samples = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.025));
    for (let i = 0; i <= samples; i++) { const t = i / samples; if (!canOccupy({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }, obstacles)) return false; }
    return true;
  };
  const nearest = p => {
    let best = -1, distance = Infinity;
    for (let n = 0; n < width * depth; n++) {
      const q = point(n); if (!canOccupy(q, obstacles)) continue;
      const d = (q.x - p.x) ** 2 + (q.z - p.z) ** 2; if (d < distance && clearSegment(p, q)) { best = n; distance = d; }
    }
    return best;
  };
  if (!canOccupy(start, obstacles) || !canOccupy(destination, obstacles)) return null;
  const first = nearest(start), last = nearest(destination);
  if (first < 0 || last < 0) return null;
  const queue = [first], visited = new Map([[first, null]]);
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head]; if (current === last) break;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = current % width + dx, z = Math.floor(current / width) + dz;
      if (x < 0 || x >= width || z < 0 || z >= depth) continue;
      const next = z * width + x; if (visited.has(next) || !canOccupy(point(next), obstacles)) continue;
      const a = point(current), b = point(next);
      if (!clearSegment(a, b)) continue;
      visited.set(next, current); queue.push(next);
    }
  }
  if (!visited.has(last)) return null;
  const route = []; for (let n = last; n !== null; n = visited.get(n)) route.unshift(point(n));
  route.unshift({ ...start }); route.push({ ...destination }); return route;
}
