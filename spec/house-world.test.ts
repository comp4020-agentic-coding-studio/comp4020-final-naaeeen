import { JSDOM } from "jsdom";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("three",async importOriginal=>{
 const actual=await importOriginal<any>();
 class Renderer { shadowMap:any={}; outputColorSpace:any; toneMapping:any; toneMappingExposure:any; setPixelRatio(){} setSize(){} render(){} dispose(){} }
 return {...actual,WebGLRenderer:Renderer};
});
import { createLayout } from '../public/house-geometry.js';
import { createHouseWorld } from "../public/house-world.js";
const cleanups: (()=>void)[]=[];
afterEach(()=>{for(const f of cleanups.splice(0))f();vi.unstubAllGlobals();});
function distance(frameMs:number){
 const dom=new JSDOM("<div id='world'></div>",{url:"http://localhost"});
 Object.defineProperty(dom.window,"matchMedia",{value:()=>({matches:false})});
 vi.stubGlobal("window",dom.window);vi.stubGlobal("document",dom.window.document);vi.stubGlobal("HTMLElement",dom.window.HTMLElement);
 vi.stubGlobal("ResizeObserver",class{observe(){}disconnect(){}});
 let next:FrameRequestCallback=()=>{};
 vi.stubGlobal("requestAnimationFrame",(callback:FrameRequestCallback)=>{next=callback;return 1;});
 vi.stubGlobal("cancelAnimationFrame",()=>{});
 const container=dom.window.document.getElementById("world")!;
 const world=createHouseWorld(container);
 cleanups.push(()=>{world.dispose();dom.window.close();});
 world.update({serverEpoch:"epoch",accessGeneration:1,generation:1,controller:true,durable:{schemaVersion:2,selfId:"self",house:{id:"house",capacity:2,ownerId:"self",code:"12345678"},residents:[{id:"self",name:"Robin",colour:"sage",slot:0,bedroomId:"room",open:false}],streamId:"lounge:house",sequence:0,zoneId:"lounge",room:null,cards:[],chat:[]},players:[{id:"self",name:"Robin",colour:"sage",connected:true,zoneId:"lounge",x:0,z:2.85,heading:0,animation:"idle",availability:"quiet",generation:1}]} as any);
 world.setDirection(-1,0);next(0);
 for(let t=frameMs;t<=1000+.001;t+=frameMs)next(t);
 return Math.abs(world.getPosition().x);
}
it("uses elapsed time for the same walking speed at fast and slow render rates",()=>{
 const fast=distance(1000/30),slow=distance(250);
 expect(fast).toBeCloseTo(2.6,1);
 expect(slow).toBeCloseTo(fast,1);
});

function speechFixture(){
 const dom=new JSDOM("<div id='world'></div>",{url:"http://localhost"});
 Object.defineProperty(dom.window,'matchMedia',{value:()=>({matches:false})});
 vi.stubGlobal('window',dom.window);vi.stubGlobal('document',dom.window.document);vi.stubGlobal('HTMLElement',dom.window.HTMLElement);
 vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});
 let next:FrameRequestCallback=()=>{},clock=0;vi.spyOn(dom.window.performance,'now').mockImplementation(()=>clock);
 vi.stubGlobal('requestAnimationFrame',(cb:FrameRequestCallback)=>{next=cb;return 1;});vi.stubGlobal('cancelAnimationFrame',()=>{});
 const container=dom.window.document.getElementById('world')!;Object.defineProperty(container,'clientWidth',{value:390});Object.defineProperty(container,'clientHeight',{value:844});
 const world=createHouseWorld(container);cleanups.push(()=>{world.dispose();dom.window.close();});
 const players=Array.from({length:6},(_,i)=>({id:'p'+i,name:'Friend '+i,colour:'sage',connected:true,zoneId:'lounge',x:0,z:3.3,heading:0,animation:'idle',availability:'chat',availabilitySetAt:0,generation:1}));
 const snapshot:any={serverEpoch:'epoch',accessGeneration:1,generation:1,controller:true,durable:{schemaVersion:2,selfId:'p0',house:{id:'house',capacity:6,ownerId:'p0',code:'12345678'},residents:players.map((p,i)=>({...p,slot:i,bedroomId:'room'+i,open:false})),streamId:'lounge:house',sequence:0,zoneId:'lounge',room:null,cards:[],chat:[]},players};
 const step=(time:number)=>{clock=time;next(time);};
 const visible=()=>[...container.querySelectorAll<HTMLElement>('.chat-bubble')].filter(n=>!n.hidden);
 return {world,snapshot,container,step,visible};
}
it('does not replay retained history as speech even when the wall clock is skewed',()=>{
 const f=speechFixture();f.snapshot.durable.chat=[{id:'old',authorId:'p1',name:'Friend 1',text:'Retained history',at:9999999999999,sequence:1}];
 f.world.update(f.snapshot);f.step(0);expect(f.visible()).toHaveLength(0);
});
it('bounds six fresh speakers, keeps a two-line safe Unicode preview and clears revocation',()=>{
 const f=speechFixture();f.world.update(f.snapshot);f.step(0);
 const next=structuredClone(f.snapshot);next.durable.sequence=6;next.durable.chat=Array.from({length:6},(_,i)=>({id:'new'+i,authorId:'p'+i,name:'Friend '+i,text:'😀中文'.repeat(50),at:9999999999999,sequence:i+1}));
 f.world.update(next);f.step(100);expect(f.visible()).toHaveLength(3);
 for(const el of f.visible()){
  expect(el.querySelector('.house-bubble-hint')?.textContent).toContain('Chat');
  expect(Array.from(el.querySelector('.house-bubble-text')?.textContent??'').length).toBeLessThanOrEqual(80);
  expect(el.querySelector('img,script')).toBeNull();
 }
 f.step(4100);expect(f.visible()).toHaveLength(0);
 f.world.update(null);expect(f.container.querySelectorAll('.house-avatar-name')).toHaveLength(0);
 f.world.update(next);f.step(4200);expect(f.visible()).toHaveLength(0);
});

it('preserves actual authorised players through DIY rebuilds and keeps observer/IME input isolated',()=>{
 const f=speechFixture(), room=structuredClone(f.snapshot);
 room.durable.zoneId='room0';room.durable.streamId='bedroom:room0';room.durable.room={id:'room0',ownerId:'p0',revision:1,open:true,palette:'sage',placements:[
  {id:'bed',kind:'bed',x:-3,z:-1.5,rotation:0,colour:'sage'}, {id:'desk',kind:'desk',x:3,z:-2,rotation:0,colour:'blue'},
  {id:'chair',kind:'chair',x:3,z:0,rotation:0,colour:'rose'}, {id:'shelf',kind:'shelf',x:-4.5,z:1,rotation:0,colour:'amber'},
  {id:'plant',kind:'plant',x:4.5,z:1.5,rotation:0,colour:'sage'}, {id:'lamp',kind:'lamp',x:1.5,z:1.5,rotation:0,colour:'peach'}]};
 for(const p of room.players)p.zoneId='room0';
 f.world.update(room);f.step(0);expect(f.container.querySelectorAll('.house-avatar-name')).toHaveLength(6);
 f.world.setInputEnabled(false);f.world.setEditing(true);f.world.setRoomPreview(room.durable.room.placements.slice(0,2));
 expect(f.container.querySelectorAll('.house-avatar-name')).toHaveLength(6);
 f.world.setRoomPreview(null);expect(f.container.querySelectorAll('.house-avatar-name')).toHaveLength(6);
 f.world.setEditing(false);f.world.setInputEnabled(true);
 const before=f.world.getPosition();document.dispatchEvent(new window.CompositionEvent('compositionstart',{bubbles:true}));
 window.dispatchEvent(new window.KeyboardEvent('keydown',{key:'a',bubbles:true}));f.step(250);expect(f.world.getPosition()).toEqual(before);
 document.dispatchEvent(new window.CompositionEvent('compositionend',{bubbles:true}));
 room.controller=false;room.generation=2;f.world.update(room);f.world.setDirection(-1,0);f.step(500);expect(f.world.getPosition()).toEqual(before);
 f.world.update(null);expect(f.container.querySelectorAll('.house-avatar-name,.chat-bubble')).toHaveLength(0);
});

it('suppresses static destination text behind active controls in a clipped visual viewport',()=>{
 const f=speechFixture();f.world.update(f.snapshot);f.step(0);
 const doors=[...f.container.querySelectorAll<HTMLElement>('.door,.own-door')];expect(doors).toHaveLength(6);
 f.world.setLabelSafeArea({viewport:{left:0,top:0,right:390,bottom:844},safeRects:[{x:0,y:0,w:390,h:400}]});f.step(100);
 expect(doors.every(el=>el.style.visibility==='hidden')).toBe(true);
});

it('keeps six actual seat poses attributed while packing nearby person labels',()=>{
 const f=speechFixture(), layout=createLayout(6);
 for(let i=0;i<6;i++)Object.assign(f.snapshot.players[i],{x:layout.seats[i].x,z:layout.seats[i].z,heading:layout.seats[i].heading,animation:'sit',seatId:layout.seats[i].id});
 f.world.update(f.snapshot);f.step(0);
 const labels=[...f.container.querySelectorAll<HTMLElement>('.house-avatar-name')];expect(labels).toHaveLength(6);
 for(const label of labels){const player=f.snapshot.players.find((p:any)=>p.id===label.dataset.playerId);expect(Number(label.dataset.x)).toBeCloseTo(player.x,2);expect(Number(label.dataset.z)).toBeCloseTo(player.z,2);expect(label.style.visibility).toBe('visible');}
 expect(f.world.getPosition()).toEqual({x:layout.seats[0].x,z:layout.seats[0].z});
});

it('retains the full forty-character name on wrapped bounded labels and avoids observer takeover rectangles',()=>{
 const f=speechFixture(), fullName='W'.repeat(40);f.snapshot.players[0].name=fullName;f.snapshot.durable.residents[0].name=fullName;
 f.world.update(f.snapshot);f.step(0);
 const label=f.container.querySelector<HTMLElement>('.house-avatar-name[data-player-id="p0"]')!;
 expect(label.title).toContain(fullName);expect(label.getAttribute('aria-label')).toContain(fullName);
 expect(label.style.overflowWrap).toBe('anywhere');expect(label.style.overflow).toBe('hidden');
 const door=f.container.querySelector<HTMLElement>('.own-door')!;expect(door.title).toContain(fullName);expect(door.getAttribute('aria-label')).toContain(fullName);
 const takeover={x:200,y:260,w:182,h:80};f.world.setLabelSafeArea({viewport:{left:8,top:8,right:382,bottom:836},safeRects:[takeover]});f.step(100);
 for(const el of f.container.querySelectorAll<HTMLElement>('.house-avatar-name'))if(el.style.visibility==='visible'){
  const x=Number(el.dataset.labelX),y=Number(el.dataset.labelY);
  expect(x<takeover.x+takeover.w&&x+108>takeover.x&&y<takeover.y+takeover.h&&y+34>takeover.y).toBe(false);
 }
});

it('keeps the controlled avatar prominent in portrait play while preserving world coordinates',()=>{
 const f=speechFixture();f.world.update(f.snapshot);f.step(0);
 const canvas=f.container.querySelector<HTMLCanvasElement>('canvas')!;
 expect(Number(canvas.dataset.selfAvatarHeight)).toBeGreaterThanOrEqual(56);
 expect(Number(canvas.dataset.selfAvatarHeight)).toBeLessThanOrEqual(88);
 expect(f.world.getPosition()).toEqual({x:0,z:3.3});
});

it('returns overview to close play on movement and keeps DIY camera stable',()=>{
 const f=speechFixture();f.world.update(f.snapshot);f.step(0);
 f.world.setCameraMode('overview');expect(f.world.getCameraMode()).toBe('overview');f.step(100);
 const canvas=f.container.querySelector<HTMLCanvasElement>('canvas')!;const overviewHeight=Number(canvas.dataset.selfAvatarHeight);
 f.world.setDirection(-1,0);f.step(200);expect(f.world.getCameraMode()).toBe('play');expect(Number(canvas.dataset.selfAvatarHeight)).toBeGreaterThan(overviewHeight);
 f.world.setDirection(0,0);f.world.setEditing(true);f.step(300);expect(f.world.getCameraMode()).toBe('overview');
 const stable=canvas.dataset.worldLeft;f.step(500);expect(canvas.dataset.worldLeft).toBe(stable);
 f.world.setEditing(false);f.world.setCameraMode('play');f.step(600);expect(f.world.getCameraMode()).toBe('play');
});

it('applies phone foreground sizing to newly joined and rebuilt authorised actors without a resize',()=>{
 const f=speechFixture(), snapshot=structuredClone(f.snapshot);snapshot.players=snapshot.players.slice(0,2);
 f.world.update(snapshot);f.step(0);
 const check=(id:string)=>{const name=f.container.querySelector<HTMLElement>('.house-avatar-name[data-player-id="'+id+'"]')!;const bubble=f.container.querySelector<HTMLElement>('.chat-bubble[data-player-id="'+id+'"]')!;
  expect(name.style.fontSize).toBe('12px');expect(bubble.style.fontSize).toBe('13px');expect(bubble.style.width).toBe('184px');};
 check('p0');snapshot.players.push(f.snapshot.players[2]);f.world.update(snapshot);check('p2');
 snapshot.durable.zoneId='room0';snapshot.durable.streamId='bedroom:room0';snapshot.durable.room={id:'room0',ownerId:'p0',revision:1,open:true,palette:'sage',placements:[]};
 for(const player of snapshot.players)player.zoneId='room0';f.world.update(snapshot);check('p0');check('p2');
 f.world.update(null);expect(f.container.querySelector('canvas')?.hasAttribute('data-pick-targets')).toBe(false);expect(f.container.querySelector('canvas')?.hasAttribute('data-self-mesh-bounds')).toBe(false);
});
