import { describe, expect, test } from 'vitest';
import { createLayout, bedroomLayout, validPosition, slide, validatePlacements, findRoute } from '../public/house-geometry.js';

const piece = (id: string, kind: string, x: number, z: number, rotation = 0) => ({ id, kind, x, z, rotation, colour: 'sage' });

describe('shared house collision geometry', () => {
  test('all 90 door, seat and board route queries stay clear across capacities', () => {
    let queries = 0;
    for (let capacity = 2; capacity <= 6; capacity++) {
      const layout = createLayout(capacity);
      expect(layout.width).toBe(16); expect(layout.depth).toBe(11);
      expect(layout.doors).toHaveLength(capacity); expect(layout.seats).toHaveLength(capacity);
      expect(new Set(layout.doors.map((door: { slot: number }) => door.slot)).size).toBe(capacity);
      expect(validPosition(layout, layout.spawn)).toBe(true);
      const targets = [...layout.doors.map((door: { target: { x: number; z: number } }) => door.target), ...layout.seats.map((seat: { target: { x: number; z: number } }) => seat.target), layout.boardTarget];
      for (const target of targets) {
        for (const [start, end] of [[layout.spawn, target], [target, layout.spawn]]) {
          const route = findRoute(layout, start, end);
          expect(route, `capacity ${capacity}, ${JSON.stringify(target)}`).not.toBeNull();
          for (let i = 1; i < route!.length; i++) {
            const a = route![i - 1], b = route![i];
            for (let n = 0; n <= 20; n++) expect(validPosition(layout, { x: a.x + (b.x - a.x) * n / 20, z: a.z + (b.z - a.z) * n / 20 })).toBe(true);
          }
          queries++;
        }
      }
    }
    expect(queries).toBe(90);
  });

  test('invalid numbers, furniture, walls and unsupported capacities are rejected', () => {
    const layout = createLayout(4);
    for (const p of [{ x: NaN, z: 0 }, { x: 0, z: Infinity }, { x: 0, z: 0 }, { x: 8, z: 3 }]) expect(validPosition(layout, p)).toBe(false);
    for (const n of [1, 7, 3.5, NaN]) expect(() => createLayout(n)).toThrow(RangeError);
    for (const o of layout.obstacles) expect(validPosition(layout, { x: o.x, z: o.z })).toBe(false);
  });

  test('substeps cannot tunnel through a table and preserve sliding along walls', () => {
    const layout = createLayout(2);
    const result = slide(layout, { x: 0, z: -2.7 }, 0, 6);
    expect(result.z).toBeLessThan(-1.13);
    expect(validPosition(layout, result)).toBe(true);
    const empty = bedroomLayout([]);
    const wall = slide(empty, { x: 5.7, z: 0 }, 20, 2);
    expect(wall.x).toBeLessThanOrEqual(6.76); expect(wall.z).toBeGreaterThan(1.9);
    expect(slide(empty, { x: 0, z: 3 }, NaN, 1)).toEqual({ x: 0, z: 3 });
  });

  test('off-grid route connectors do not cross a cabinet corner', () => {
    const layout = createLayout(2), start = { x: -5.547, z: 2.429 };
    expect(validPosition(layout, start)).toBe(true);
    const route = findRoute(layout, start, layout.boardTarget);
    expect(route).not.toBeNull();
    for (let i = 1; i < route!.length; i++) {
      const a = route![i - 1], b = route![i];
      for (let n = 0; n <= 100; n++) expect(validPosition(layout, { x: a.x + (b.x - a.x) * n / 100, z: a.z + (b.z - a.z) * n / 100 })).toBe(true);
    }
  });
});

describe('DIY placement validation', () => {
  test('six kinds, colours and rotations share exact server and renderer footprints', () => {
    const placements = [piece('bed', 'bed', -3, -1.5), piece('desk', 'desk', 3, -2), piece('chair', 'chair', 3, 0), piece('shelf', 'shelf', -4.5, 1), piece('plant', 'plant', 4.5, 1.5), piece('lamp', 'lamp', 1.5, 1.5)];
    expect(validatePlacements(placements)).toBe(true);
    const room = bedroomLayout(placements);
    expect(room.obstacles).toHaveLength(6); expect(validPosition(room, room.spawn)).toBe(true);
    expect(validPosition(room, { x: 0, z: -3.5 })).toBe(true);
    const rotated = bedroomLayout([piece('desk', 'desk', 3, -2, 1)]).obstacles[0];
    expect(rotated.w).toBe(1); expect(rotated.d).toBe(2);
    for (const colour of ['amber', 'sage', 'rose', 'blue', 'lavender', 'peach']) expect(validatePlacements([{ ...piece('p', 'plant', 2, 0), colour }])).toBe(true);
  });

  test('overlap, room blocking, invalid transforms, kinds and duplicate IDs are rejected', () => {
    const valid = piece('a', 'bed', -3, -1.5);
    const bad = [
      [valid, piece('b', 'plant', -3, -1.5)], [piece('a', 'desk', 0, 3)], [piece('a', 'plant', 0, 4)],
      [piece('a', 'bed', 6.5, 0)], [piece('a', 'plant', 2.1, 0)], [piece('a', 'lamp', 2, 0, 4)],
      [piece('a', 'sofa', 2, 0)], [piece('a', 'plant', NaN, 0)], [{ ...valid, colour: 'neon' }],
      [valid, piece('a', 'plant', 3, 0)], Array.from({ length: 11 }, (_, i) => piece(String(i), 'plant', 3, 0)),
    ];
    for (const placements of bad) expect(validatePlacements(placements), JSON.stringify(placements)).toBe(false);
    expect(validatePlacements(null)).toBe(false); expect(validatePlacements([])).toBe(true);
  });

  test('a chair near the wall retains a clear approach after rotation', () => {
    const placements = [piece('chair', 'chair', 5, 0, 3)];
    expect(validatePlacements(placements)).toBe(true);
    const room = bedroomLayout(placements);
    expect(validPosition(room, room.seats[0].target)).toBe(true);
    expect(findRoute(room, room.spawn, room.seats[0].target)).not.toBeNull();
  });

  test('valid arrangements preserve the exit route and rotated chair approaches', () => {
    for (let rotation = 0; rotation <= 3; rotation++) {
      const room = bedroomLayout([piece('chair', 'chair', 3, -1, rotation), piece('desk', 'desk', -3, -2, rotation)]);
      expect(findRoute(room, room.spawn, room.exitTarget)).not.toBeNull();
      for (const seat of room.seats) expect(findRoute(room, room.spawn, seat.target)).not.toBeNull();
    }
  });
});


test('expands saved bedrooms additively and protects arrival while allowing central DIY', () => {
 const saved=[piece('bed','bed',-3,-1.5),piece('desk','desk',3,-2),piece('chair','chair',3,0),piece('shelf','shelf',-4.5,1),piece('plant','plant',4.5,1.5),piece('lamp','lamp',1.5,1.5)];
 const room=bedroomLayout(saved); expect(room.width).toBe(14); expect(room.depth).toBe(10);
 expect(room.spawn).toEqual({x:0,z:3}); expect(validatePlacements(saved)).toBe(true);
 expect(validatePlacements([piece('centre','desk',0,-2)])).toBe(true);
 expect(validatePlacements([piece('arrival','lamp',0,3)])).toBe(false);
 const ten=[...saved,piece('p2','plant',-5.5,-3.5),piece('s2','shelf',4,-4),piece('l2','lamp',-2,1.5),piece('p3','plant',5.5,3.5)];
 expect(validatePlacements(ten)).toBe(true);
 const expanded=bedroomLayout(ten); expect(findRoute(expanded,expanded.spawn,expanded.exitTarget)).not.toBeNull();
});
