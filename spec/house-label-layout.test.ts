import { describe, expect, it } from 'vitest';
import { layoutLabels, formatBubble, createBubbleFeed } from '../public/house-label-layout.js';
const overlap = (a:any,b:any) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
const message = (n:number,authorId='p'+n,text='Message '+n) => ({id:'m'+n,authorId,name:'Friend '+authorId,text,at:9999999999999,sequence:n});
const options = {quiet:false,visibleAuthors:new Set(['p1','p2','p3','p4','p5','p6'])};
describe('label collision layout',()=>{
 for(const width of [1920,390])it('packs six actual names and three speech previews at width '+width,()=>{
  const viewport={left:8,top:185,right:width-8,bottom:560};
  const names=Array.from({length:6},(_,i)=>({id:'name-'+i,anchor:{x:width/2,y:450},w:108,h:34,priority:100}));
  const bubbles=Array.from({length:3},(_,i)=>({id:'bubble-'+i,anchor:{x:width/2,y:395},w:160,h:38,priority:50-i}));
  const blocked=[{x:width/2-45,y:510,w:90,h:40}];
  const placed=layoutLabels([...names,...bubbles],viewport,blocked);
  expect(placed.filter((p:any)=>!p.hidden)).toHaveLength(9);
  for(let i=0;i<placed.length;i++){
   const p=placed[i]; expect(p.rect.x).toBeGreaterThanOrEqual(viewport.left);expect(p.rect.x+p.rect.w).toBeLessThanOrEqual(viewport.right);
   expect(p.rect.y).toBeGreaterThanOrEqual(viewport.top);expect(p.rect.y+p.rect.h).toBeLessThanOrEqual(viewport.bottom);
   expect(overlap(p.rect,blocked[0])).toBe(false);
   for(let j=i+1;j<placed.length;j++)expect(overlap(p.rect,placed[j].rect)).toBe(false);
  }
  expect(layoutLabels([...names,...bubbles],viewport,blocked)).toEqual(placed);
 });
 it('refreshes prior rectangle dimensions when text or viewport changes',()=>{
  const placed=layoutLabels([{id:'name',anchor:{x:100,y:90},w:100,h:40,priority:100,previous:{x:50,y:50,w:40,h:20}}],{left:8,top:8,right:382,bottom:250});
  expect(placed[0].rect.w).toBe(100);expect(placed[0].rect.h).toBe(40);
 });
 it('clamps frustum borders, keeps valid prior placements stable and hides impossible previews',()=>{
  const viewport={left:8,top:20,right:382,bottom:250};
  const items=[{id:'name',anchor:{x:-100,y:-50},w:130,h:34,priority:100},{id:'speech',anchor:{x:390,y:290},w:160,h:38,priority:50}];
  const placed=layoutLabels(items,viewport);expect(placed.every((p:any)=>!p.hidden)).toBe(true);
  const again=layoutLabels(items.map((p:any,i:number)=>({...p,previous:placed[i].rect})),viewport);
  expect(again).toEqual(placed);
  expect(layoutLabels(items,viewport,[{x:8,y:20,w:374,h:230}]).every((p:any)=>p.hidden)).toBe(true);
 });
});
describe('bounded delivered speech',()=>{
 it('truncates by Unicode codepoint without splitting emoji and keeps plain text',()=>{
  for(const text of ['中文'.repeat(60),'😀'.repeat(120),'<img src=x onerror=alert(1)> '+ 'word '.repeat(50)]){
   const result=formatBubble(text); expect(Array.from(result.preview).length).toBeLessThanOrEqual(80);expect(result.truncated).toBe(true);
   expect(Array.from(result.preview).some((c:any)=>c.length===1&&/[\uD800-\uDFFF]/.test(c))).toBe(false);
  }
  expect(formatBubble('Hello').preview).toBe('Hello');
 });
 it('baselines history, limits six fresh senders to most recent three and expires at four seconds',()=>{
  const feed=createBubbleFeed();feed.ingest('scope',[message(1)],options,0);expect(feed.visible(0)).toEqual([]);
  feed.ingest('scope',Array.from({length:6},(_,i)=>message(i+2,'p'+(i+1))),options,100);
  expect(feed.visible(100).map((p:any)=>p.authorId)).toEqual(['p6','p5','p4']);
  expect(feed.visible(4099)).toHaveLength(3);expect(feed.visible(4100)).toHaveLength(0);
 });
 it('replaces a member preview, respects quiet for own and others and never replays after mode changes',()=>{
  const feed=createBubbleFeed();feed.ingest('s',[],options,0);feed.ingest('s',[message(1,'p1'),message(2,'p1')],options,10);
  expect(feed.visible(10)).toHaveLength(1);expect(feed.visible(10)[0].id).toBe('m2');
  feed.ingest('s',[message(3,'p1')],{...options,quiet:true},20);expect(feed.visible(20)).toEqual([]);
  feed.ingest('s',[message(3,'p1')],options,30);expect(feed.visible(30)).toEqual([]);
 });
 it('clears private state on scope/revocation and bounds dedupe memory against old replay',()=>{
  const feed=createBubbleFeed();feed.ingest('private',[],options,0);
  feed.ingest('private',Array.from({length:1400},(_,i)=>message(i+1,'p1')),options,20);
  expect(feed.stats().seen).toBeLessThanOrEqual(400);expect(feed.stats().active).toBeLessThanOrEqual(6);
  feed.ingest('private',[message(1,'p1')],options,30);expect(feed.visible(30)[0].id).toBe('m1400');
  feed.ingest('lounge',[message(1500,'p1')],options,40);expect(feed.visible(40)).toEqual([]);
  feed.clear();expect(feed.stats()).toMatchObject({seen:0,active:0});
  feed.ingest('private',[message(1400,'p1')],options,50);expect(feed.visible(50)).toEqual([]);
 });
});
