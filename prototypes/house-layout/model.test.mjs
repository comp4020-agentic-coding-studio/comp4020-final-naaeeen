import test from 'node:test';
import assert from 'node:assert/strict';
import { createLayout, canOccupy, findRoute, moveWithCollision } from './model.mjs';
for (const variant of ['A', 'B']) for (let capacity = 2; capacity <= 6; capacity++) {
  test(variant + ' capacity ' + capacity + ': exact fixtures and route to each target', () => {
    const l = createLayout(capacity, variant), start = l.members[0];
    assert.equal(l.doors.length, capacity); assert.equal(l.seats.length, capacity); assert.equal(l.members.length, capacity);
    assert.equal(new Set(l.doors.map(d => d.id)).size, capacity);
    assert.ok(l.doors.every(d => variant === 'B' || d.wall === 'rear'));
    for (const target of [...l.doors.map(d => d.target), ...l.seats.map(s => s.target), l.boardTarget]) {
      assert.ok(canOccupy(target, l.obstacles), JSON.stringify(target) + ' is blocked');
      const route = findRoute(start, target, l.obstacles); assert.ok(route, JSON.stringify(target) + ' is unreachable');
      for (const point of route) assert.ok(canOccupy(point, l.obstacles));
    }
  });
}
test('circle collision stops movement through the table and preserves wall bounds', () => {
  const l = createLayout(4, 'A'); assert.equal(canOccupy({ x: 0, z: 0 }, l.obstacles), false);
  const moved = moveWithCollision({ x: 0, z: -2.6 }, { x: 0, z: 6 }, l.obstacles); assert.ok(moved.z <= -1.13);
  const edge = moveWithCollision({ x: 5.7, z: 0 }, { x: 20, z: 0 }, []); assert.ok(edge.x <= 5.76);
});
test('layout rejects unsupported variants and capacities', () => {
  for (const n of [1, 7, 3.5, NaN]) assert.throws(() => createLayout(n, 'A'), RangeError);
  assert.throws(() => createLayout(4, 'C'), RangeError);
});
test('A and B share furniture, member fixtures and interaction targets apart from doors', () => {
  for (let n = 2; n <= 6; n++) { const a = createLayout(n, 'A'), b = createLayout(n, 'B'); assert.deepEqual(a.seats, b.seats); assert.deepEqual(a.obstacles, b.obstacles); assert.deepEqual(a.members, b.members); assert.deepEqual(a.boardTarget, b.boardTarget); }
});

test('off-grid route connectors do not cut a cabinet corner', () => {
  const l = createLayout(2, 'A'), start = { x: -5.547, z: 2.929 };
  assert.ok(canOccupy(start, l.obstacles));
  const route = findRoute(start, l.boardTarget, l.obstacles); assert.ok(route);
  for (let i = 1; i < route.length; i++) for (let sample = 0; sample <= 100; sample++) {
    const t = sample / 100, a = route[i - 1], b = route[i];
    assert.ok(canOccupy({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }, l.obstacles), 'connector intersects furniture');
  }
});

test('fixed solid plant pots and lamp bases block movement', () => {
  const l = createLayout(6, 'B');
  for (const point of [{ x: -3.1, z: -2.55 }, { x: 3.55, z: 3.15 }, { x: -5.4, z: -3.4 }, { x: 5.25, z: 3.1 }]) assert.equal(canOccupy(point, l.obstacles), false);
});
