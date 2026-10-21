import { expect, test } from 'vitest';
import { createLayout, bedroomLayout, validPosition, findRoute } from '../public/house-geometry.js';

for (const variant of ['compact', 'expanded'] as const) {
  test(`${variant} lounge preserves purposeful fixtures, oriented chair bounds and permanent-slot arrivals`, () => {
    for (let capacity = 2; capacity <= 6; capacity++) {
      const layout = createLayout(capacity, variant);
      expect([layout.width, layout.depth]).toEqual(variant === 'compact' ? [16, 11] : [20, 14]);
      expect(layout.seats).toHaveLength(capacity + 8);
      expect(layout.seats.filter(seat => seat.purpose === 'study').map(seat => seat.id)).toEqual(Array.from({ length: capacity }, (_, i) => `seat-${i + 1}`));
      expect(layout.seats.filter(seat => seat.purpose === 'rest')).toHaveLength(6);
      expect(layout.seats.filter(seat => seat.purpose === 'game')).toHaveLength(2);
      expect(layout.arrivals).toHaveLength(capacity);
      const ids = layout.obstacles.map(obstacle => obstacle.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids).not.toContain('couch'); expect(ids).not.toContain('rear-lamp');
      for (const seat of layout.seats) {
        expect(Math.hypot(seat.target.x - seat.x, seat.target.z - seat.z)).toBeLessThanOrEqual(1.5);
        if (seat.purpose === 'rest') {
          expect(seat.fixtureId).toMatch(/^rest-sofa-[ab]$/);
          expect(ids).not.toContain(seat.id);
          const fixture = layout.obstacles.find(obstacle => obstacle.id === seat.fixtureId)!;
          expect(Math.abs(seat.x - fixture.x)).toBeLessThan(fixture.w / 2);
          expect(Math.abs(seat.z - fixture.z)).toBeLessThan(fixture.d / 2);
        } else {
          const bounds = layout.obstacles.find(obstacle => obstacle.id === seat.id)!;
          const yaw = seat.heading + Math.PI, s = Math.sin(yaw), c = Math.cos(yaw);
          expect(bounds.x).toBeCloseTo(seat.x + s * .035);
          expect(bounds.z).toBeCloseTo(seat.z + c * .035);
          expect(bounds.w).toBeCloseTo(Math.abs(c) * .78 + Math.abs(s) * .8);
          expect(bounds.d).toBeCloseTo(Math.abs(s) * .78 + Math.abs(c) * .8);
        }
      }
      for (const door of layout.doors) {
        expect(door.wall).toBe('rear'); expect(door.slot).toBeGreaterThanOrEqual(0);
        expect(door.target.z).toBeCloseTo(-layout.depth / 2 + 1.05);
      }
      // Sparse residency uses the permanent slot rather than compacting online people.
      for (const slot of [0, capacity - 1]) expect(layout.arrivals![slot]).toEqual({ x: .65 * (slot - (capacity - 1) / 2), z: layout.spawn.z });
    }
  });
  test(`${variant} has collision-clear arrival-to-target and stand routes at all capacities`, () => {
    for (let capacity = 2; capacity <= 6; capacity++) {
      const layout = createLayout(capacity, variant);
      const targets = [...layout.doors.map(door => door.target), ...layout.seats.map(seat => seat.target), layout.boardTarget, layout.gameTarget!, layout.exitTarget];
      for (const arrival of layout.arrivals!) for (const target of targets) {
        expect(validPosition(layout, arrival), JSON.stringify({ capacity, arrival })).toBe(true);
        expect(validPosition(layout, target), JSON.stringify({ capacity, target })).toBe(true);
        const route = findRoute(layout, arrival, target);
        expect(route, JSON.stringify({ capacity, arrival, target })).not.toBeNull();
        for (let i = 1; i < route!.length; i++) {
          const a = route![i - 1], b = route![i];
          for (let n = 0; n <= 5; n++) expect(validPosition(layout, { x: a.x + (b.x - a.x) * n / 5, z: a.z + (b.z - a.z) * n / 5 })).toBe(true);
        }
      }
      for (const seat of layout.seats) {
        expect(findRoute(layout, seat.target, layout.spawn), seat.id).not.toBeNull();
        expect(validPosition(layout, { x: seat.x, z: seat.z }), seat.id).toBe(false);
      }
    }
  }, 120000);
}
test('lounge expansion does not change bedroom dimensions, arrival or chair purpose', () => {
  const room = bedroomLayout([{ id: 'chair', kind: 'chair', x: 3, z: 0, rotation: 0 }]);
  expect([room.width, room.depth]).toEqual([14, 10]);
  expect(room.spawn).toEqual({ x: 0, z: 3 }); expect(room.exitTarget).toEqual({ x: 0, z: 4.3 });
  expect(room.seats[0].purpose).toBe('bedroom');
});
