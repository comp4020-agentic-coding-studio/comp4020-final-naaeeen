import { describe, expect, it } from 'vitest';
import { cameraPlayArea, createHouseCamera } from '../public/house-camera.js';
const bounds = { minX: -7, maxX: 7, minY: -5, maxY: 5 };
const portrait = { width: 390, height: 844, bounds, uprightHeight: 1.15, viewport: { left: 0, top: 0, right: 390, bottom: 844 }, safeRects: [{ x: 0, y: 0, w: 390, h: 210 }, { x: 0, y: 560, w: 390, h: 284 }] };
const screen = (value: any, point: any, size = portrait) => ({ x: (point.x - value.left) * value.pxPerUnit, y: (value.top - point.y) * value.pxPerUnit });
const overlap = (a: any, b: any) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

describe('transient fixed-angle camera', () => {
 it('keeps desktop scale continuous across the 600px resize threshold', () => {
  const rig=createHouseCamera();
  rig.configure({width:1366,height:600,bounds,uprightHeight:1.15,safeRects:[]});const before=rig.frame({x:0,y:0},0)!;
  rig.configure({width:1366,height:599,bounds,uprightHeight:1.15,safeRects:[]});const after=rig.frame({x:0,y:0},0)!;
  expect(after.pxPerUnit*1.15).toBeGreaterThanOrEqual(96);
  expect(Math.abs(before.pxPerUnit-after.pxPerUnit)*1.15).toBeLessThan(1);
 });
 it('selects a genuine unobstructed play rectangle including observer takeover controls', () => {
  const takeover = { x: 195, y: 440, w: 185, h: 80 };
  const rect = cameraPlayArea(390, 844, portrait.viewport, [...portrait.safeRects, takeover]);
  expect(rect.w).toBeGreaterThanOrEqual(120); expect(rect.h).toBeGreaterThanOrEqual(110);
  for (const blocker of [...portrait.safeRects, takeover]) expect(overlap(rect, blocker)).toBe(false);
  expect(cameraPlayArea(390, 844, null, [{ x: 0, y: 0, w: 390, h: 844 }]).available).toBe(false);
 });
 it('makes avatar prominence independent of room extent and keeps play scale stable', () => {
  const rig = createHouseCamera(); rig.configure(portrait);
  const initial = rig.frame({ x: 0, y: 0 }, 0)!;
  expect(initial.pxPerUnit * portrait.uprightHeight).toBeCloseTo(72, 8);
  rig.configure({ ...portrait, bounds: { minX: -70, maxX: 70, minY: -50, maxY: 50 } });
  const larger = rig.frame({ x: 0, y: 0 }, 0)!;
  expect(larger.pxPerUnit).toBe(initial.pxPerUnit);
 });
 it('follows only outside the dead zone and settles without idle drift', () => {
  const rig = createHouseCamera(); rig.configure(portrait);
  const first = rig.frame({ x: 0, y: 0 }, 0)!;
  expect(rig.frame({ x: 0.3, y: 0 }, 1 / 60)!.changed).toBe(false);
  const moved = { x: 5.5, y: 3.5 };
  let value = rig.frame(moved, 1 / 60)!; expect(value.changed).toBe(true);
  for (let i = 0; i < 300; i++) value = rig.frame(moved, 1 / 60)!;
  const settled = { ...value };
  for (let i = 0; i < 300; i++) value = rig.frame(moved, 1 / 60)!;
  expect(value.left).toBe(settled.left); expect(value.top).toBe(settled.top); expect(value.changed).toBe(false);
  const projected = screen(value, moved), half = 72 / 2;
  expect(projected.x).toBeGreaterThanOrEqual(value.area.x); expect(projected.x).toBeLessThanOrEqual(value.area.x + value.area.w);
  expect(projected.y - half).toBeGreaterThanOrEqual(value.area.y); expect(projected.y + half).toBeLessThanOrEqual(value.area.y + value.area.h);
  expect(first.left).not.toBe(value.left);
 });
 it('makes recenter explicit even in play and never mutates the authoritative point', () => {
  const rig = createHouseCamera(); rig.configure(portrait); const point = { x: 3, y: 2 };
  rig.frame({ x: 0, y: 0 }, 0); rig.frame(point, 0.1);
  expect(rig.setMode('play')).toBe(true); const centered = rig.frame(point, 0)!;
  const projected = screen(centered, point);
  expect(projected.x).toBeCloseTo(centered.area.x + centered.area.w / 2);
  expect(projected.y).toBeCloseTo(centered.area.y + centered.area.h / 2);
  expect(point).toEqual({ x: 3, y: 2 }); expect(rig.setMode('orbit')).toBe(false);
 });
 it('fits every room point in overview and holds that view during editing', () => {
  const rig = createHouseCamera(); rig.configure(portrait); rig.setMode('overview');
  const initial = rig.frame({ x: 0, y: 0 }, 0)!;
  for (const x of [bounds.minX, bounds.maxX]) for (const y of [bounds.minY, bounds.maxY]) {
   const point = screen(initial, { x, y }); expect(point.x).toBeGreaterThanOrEqual(initial.area.x); expect(point.x).toBeLessThanOrEqual(initial.area.x + initial.area.w);
   expect(point.y).toBeGreaterThanOrEqual(initial.area.y); expect(point.y).toBeLessThanOrEqual(initial.area.y + initial.area.h);
  }
  expect(rig.frame({ x: 5, y: -4 }, 0.25)!.left).toBe(initial.left);
  rig.setMode('play'); const editing = rig.frame({ x: 4, y: 4 }, 0.1, true)!;
  expect(editing.mode).toBe('overview'); expect(editing.left).toBe(initial.left);
 });
 it('removes easing for reduced motion and reframes actual visual-viewport changes', () => {
  const rig = createHouseCamera({ reducedMotion: true }); rig.configure(portrait); rig.frame({ x: 0, y: 0 }, 0);
  const moved = { x: 5, y: 3 }, now = rig.frame(moved, 0.001)!;
  expect(rig.frame(moved, 0.001)!.changed).toBe(false);
  rig.configure({ ...portrait, height: 520, viewport: { left: 0, top: 0, right: 390, bottom: 520 }, safeRects: [{ x: 0, y: 0, w: 390, h: 180 }, { x: 0, y: 380, w: 390, h: 140 }] });
  const resized = rig.frame(moved, 0)!; expect(resized.mode).toBe('play'); expect(resized.area.y + resized.area.h).toBeLessThanOrEqual(380);
  expect(resized.pxPerUnit).toBe(now.pxPerUnit);
 });
});
