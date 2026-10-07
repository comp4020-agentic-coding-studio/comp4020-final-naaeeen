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
  expect(editing.mode).toBe('inspection'); expect(editing.left).toBe(initial.left);
 });
 it('removes easing for reduced motion and reframes actual visual-viewport changes', () => {
  const rig = createHouseCamera({ reducedMotion: true }); rig.configure(portrait); rig.frame({ x: 0, y: 0 }, 0);
  const moved = { x: 5, y: 3 }, now = rig.frame(moved, 0.001)!;
  expect(rig.frame(moved, 0.001)!.changed).toBe(false);
  rig.configure({ ...portrait, height: 520, viewport: { left: 0, top: 0, right: 390, bottom: 520 }, safeRects: [{ x: 0, y: 0, w: 390, h: 180 }, { x: 0, y: 380, w: 390, h: 140 }] });
  const resized = rig.frame(moved, 0)!; expect(resized.mode).toBe('play'); expect(resized.area.y + resized.area.h).toBeLessThanOrEqual(380);
  expect(resized.pxPerUnit).toBeCloseTo(now.pxPerUnit, 10);
 });
});

describe('explicit camera ownership', () => {
 it('does not recenter or rescale when a chat window changes HUD geometry', () => {
  const rig = createHouseCamera(); rig.configure(portrait);
  rig.frame({x:0,y:0},0); const before = rig.frame({x:3,y:0},0.1)!;
  rig.configure({...portrait, safeRects:[...portrait.safeRects,{x:0,y:220,w:180,h:240}]});
  const after = rig.frame({x:3,y:0},0)!;
  expect(after.left).toBe(before.left); expect(after.top).toBe(before.top); expect(after.pxPerUnit).toBe(before.pxPerUnit);
 });
 it('preserves manual inspection pan and zoom until explicit recenter', () => {
  const rig = createHouseCamera(); rig.configure(portrait); rig.frame({x:0,y:0},0);
  expect(rig.setZoom(1.4)).toBe(true); expect(rig.getZoom()).toBe(1.4);
  expect(rig.pan(60,-30)).toBe(true); const before=rig.frame({x:0,y:0},0)!;
  expect(before.mode).toBe('inspection');
  const walking=rig.frame({x:4,y:2},0.25)!; expect(walking.left).toBe(before.left); expect(walking.top).toBe(before.top);
  rig.configure({...portrait,width:699}); const resized=rig.frame({x:4,y:2},0)!;
  expect(rig.getZoom()).toBe(1.4); expect((resized.left+resized.right)/2).toBeCloseTo((before.left+before.right)/2,10);
  rig.recenter(); expect(rig.frame({x:4,y:2},0)!.mode).toBe('play');
  expect(rig.setZoom(NaN)).toBe(false); rig.setZoom(99); expect(rig.getZoom()).toBe(1.8);
 });
});

it('keeps a stationary actor visible after actual visual viewport shrink',()=>{
 const rig=createHouseCamera({reducedMotion:true});rig.configure(portrait);rig.frame({x:0,y:0},0);
 const self={x:5,y:3};rig.frame(self,0.001);
 const smaller={...portrait,height:520,viewport:{left:0,top:0,right:390,bottom:520},safeRects:[{x:0,y:0,w:390,h:180},{x:0,y:380,w:390,h:140}]};
 rig.configure(smaller);const resized=rig.frame(self,0)!;
 const projected=screen(resized,self,smaller),half=72/2;
 expect(projected.y-half).toBeGreaterThanOrEqual(resized.area.y);
 expect(projected.y+half).toBeLessThanOrEqual(resized.area.y+resized.area.h);
});

it('keeps a stationary actor visible when zooming in during play',()=>{
 const rig=createHouseCamera({reducedMotion:true});rig.configure(portrait);rig.frame({x:0,y:0},0);
 const self={x:5,y:3};rig.frame(self,0.01);rig.setZoom(1.8);const zoomed=rig.frame(self,0)!;
 const p=screen(zoomed,self),half=72*1.8/2;
 expect(p.y-half).toBeGreaterThanOrEqual(zoomed.area.y);
 expect(p.y+half).toBeLessThanOrEqual(zoomed.area.y+zoomed.area.h);
});

it('fits the whole room when explicitly choosing overview after close zoom',()=>{
 const rig=createHouseCamera();rig.configure(portrait);rig.frame({x:0,y:0},0);rig.setZoom(1.8);rig.setMode('overview');
 const value=rig.frame({x:0,y:0},0)!;
 for(const x of [bounds.minX,bounds.maxX])for(const y of [bounds.minY,bounds.maxY]){
  const p=screen(value,{x,y});expect(p.x).toBeGreaterThanOrEqual(value.area.x);expect(p.x).toBeLessThanOrEqual(value.area.x+value.area.w);
  expect(p.y).toBeGreaterThanOrEqual(value.area.y);expect(p.y).toBeLessThanOrEqual(value.area.y+value.area.h);
 }
});

it('contains the supplied asymmetric rendered mesh envelope while following and settling',()=>{
 const rig=createHouseCamera();
 const config={width:390,height:520,bounds,uprightHeight:1.15,viewport:{left:275,top:128,right:383,bottom:250},safeRects:[]};
 const extents={minX:-.48,maxX:.62,minY:-.9,maxY:.63};
 rig.configure(config);rig.frame({x:0,y:0},0,false,extents);
 for(let i=1;i<=100;i++){
  const self={x:i*.035,y:-i*.035},value=rig.frame(self,1/60,false,extents)!;
  const p=screen(value,self);
  expect(p.x+extents.minX*value.pxPerUnit).toBeGreaterThanOrEqual(value.area.x-0.001);
  expect(p.x+extents.maxX*value.pxPerUnit).toBeLessThanOrEqual(value.area.x+value.area.w+0.001);
  expect(p.y-extents.maxY*value.pxPerUnit).toBeGreaterThanOrEqual(value.area.y-0.001);
  expect(p.y-extents.minY*value.pxPerUnit).toBeLessThanOrEqual(value.area.y+value.area.h+0.001);
 }
});

it('recenter contains a fitted asymmetric mesh before any movement frame',()=>{
 const rig=createHouseCamera();
 rig.configure({width:844,height:390,bounds,uprightHeight:1.15,viewport:{left:8,top:128,right:836,bottom:238},safeRects:[]});
 const extents={minX:-.4,maxX:.4,minY:-.98,maxY:.62},self={x:0,y:0};
 const first=rig.frame(self,0,false,extents)!,p=screen(first,self);
 expect(p.y-extents.minY*first.pxPerUnit).toBeLessThanOrEqual(first.area.y+first.area.h+.001);
 expect(p.y-extents.maxY*first.pxPerUnit).toBeGreaterThanOrEqual(first.area.y-.001);
});

it('refits overview when only the visual viewport changes while retaining HUD-only framing',()=>{
 const rig=createHouseCamera();
 const config={width:390,height:844,bounds,uprightHeight:1.15,viewport:{left:0,top:0,right:390,bottom:844},safeRects:[]};
 rig.configure(config);rig.setMode('overview');const before=rig.frame({x:0,y:0},0)!;
 rig.configure({...config,safeRects:[{x:0,y:100,w:100,h:200}]});
 const hud=rig.frame({x:0,y:0},0)!;expect(hud.left).toBe(before.left);expect(hud.top).toBe(before.top);
 rig.configure({...config,viewport:{left:0,top:0,right:390,bottom:420}});
 const resized=rig.frame({x:0,y:0},0)!;
 for(const x of [bounds.minX,bounds.maxX])for(const y of [bounds.minY,bounds.maxY]){
  const p=screen(resized,{x,y});expect(p.x).toBeGreaterThanOrEqual(resized.area.x);expect(p.x).toBeLessThanOrEqual(resized.area.x+resized.area.w);
  expect(p.y).toBeGreaterThanOrEqual(resized.area.y);expect(p.y).toBeLessThanOrEqual(resized.area.y+resized.area.h);
 }
});
