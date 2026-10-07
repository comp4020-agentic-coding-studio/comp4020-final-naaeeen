import { JSDOM } from "jsdom";
import { afterEach, expect, it, vi } from "vitest";
import { Box3 } from "three";
const rendered = vi.hoisted(()=>({ scene: null as any, camera: null as any, count: 0 }));
vi.mock("three",async importOriginal=>{
 const actual=await importOriginal<any>();
 class Renderer { shadowMap:any={}; outputColorSpace:any; toneMapping:any; toneMappingExposure:any; setPixelRatio(){} setSize(){} render(scene:any,camera:any){rendered.scene=scene;rendered.camera=camera;rendered.count++;} dispose(){} }
 return {...actual,WebGLRenderer:Renderer};
});
import { createLayout, footprint, SEATED_LIFT } from '../public/house-geometry.js';
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
 return Math.hypot(world.getPosition().x, world.getPosition().z - 2.85);
}
it("uses elapsed time for the same walking speed at fast and slow render rates",()=>{
 const fast=distance(1000/30),slow=distance(250);
 expect(fast).toBeCloseTo(2.6,1);
 expect(slow).toBeCloseTo(fast,1);
});

function speechFixture(width=390,height=844,callbacks:any={}){
 const dom=new JSDOM("<div id='world'></div>",{url:"http://localhost"});
 Object.defineProperty(dom.window,'matchMedia',{value:()=>({matches:false})});
 vi.stubGlobal('window',dom.window);vi.stubGlobal('document',dom.window.document);vi.stubGlobal('HTMLElement',dom.window.HTMLElement);
 vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});
 let next:FrameRequestCallback=()=>{},clock=0;vi.spyOn(dom.window.performance,'now').mockImplementation(()=>clock);
 vi.stubGlobal('requestAnimationFrame',(cb:FrameRequestCallback)=>{next=cb;return 1;});vi.stubGlobal('cancelAnimationFrame',()=>{});
 const container=dom.window.document.getElementById('world')!;Object.defineProperty(container,'clientWidth',{value:width,configurable:true});Object.defineProperty(container,'clientHeight',{value:height,configurable:true});
 const initialRenderCount=rendered.count;
 const world=createHouseWorld(container,callbacks);cleanups.push(()=>{world.dispose();dom.window.close();});
 const players=Array.from({length:6},(_,i)=>({id:'p'+i,name:'Friend '+i,colour:'sage',connected:true,zoneId:'lounge',x:0,z:3.3,heading:0,animation:'idle',availability:'chat',availabilitySetAt:0,generation:1}));
 const snapshot:any={serverEpoch:'epoch',accessGeneration:1,generation:1,controller:true,durable:{schemaVersion:2,selfId:'p0',house:{id:'house',capacity:6,ownerId:'p0',code:'12345678'},residents:players.map((p,i)=>({...p,slot:i,bedroomId:'room'+i,open:false})),streamId:'lounge:house',sequence:0,zoneId:'lounge',room:null,cards:[],chat:[]},players};
 const step=(time:number)=>{clock=time;next(time);};
 const visible=()=>[...container.querySelectorAll<HTMLElement>('.chat-bubble')].filter(n=>!n.hidden);
 return {world,snapshot,container,step,visible,renders:()=>rendered.count-initialRenderCount};
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

it('keeps chosen overview during movement and keeps DIY inspection camera stable',()=>{
 const f=speechFixture();f.world.update(f.snapshot);f.step(0);
 f.world.setCameraMode('overview');expect(f.world.getCameraMode()).toBe('overview');f.step(100);
 const canvas=f.container.querySelector<HTMLCanvasElement>('canvas')!;const overviewHeight=Number(canvas.dataset.selfAvatarHeight);
 f.world.setDirection(-1,0);f.step(200);expect(f.world.getCameraMode()).toBe('overview');expect(Number(canvas.dataset.selfAvatarHeight)).toBe(overviewHeight);
 f.world.setDirection(0,0);f.world.setEditing(true);f.step(300);expect(f.world.getCameraMode()).toBe('inspection');
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

it('suspends world movement and resumes the same camera position and zoom',()=>{
 const f=speechFixture();f.world.update(f.snapshot);f.step(0);f.world.setCameraZoom(1.3);
 const canvas=f.container.querySelector<HTMLCanvasElement>('canvas')!;f.step(100);const left=canvas.dataset.worldLeft,before=f.world.getPosition();
 f.world.setSuspended(true);f.world.setDirection(-1,0);f.step(1000);
 expect(f.world.getPosition()).toEqual(before); expect(canvas.dataset.worldLeft).toBe(left);
 f.world.setSuspended(false);f.step(2000);expect(f.world.getPosition()).toEqual(before);expect(f.world.getCameraZoom()).toBe(1.3);
});
it('keeps one camera orientation across the responsive threshold',()=>{
 const f=speechFixture();f.world.update(f.snapshot);f.step(0);
 const canvas=f.container.querySelector<HTMLCanvasElement>('canvas')!;
 const pose=canvas.dataset.cameraOrientation;
 Object.defineProperty(f.container,'clientWidth',{value:701,configurable:true});
 f.world.resize();f.step(100);expect(canvas.dataset.cameraOrientation).toBe(pose);
});

it('lets a deliberate canvas drag take focus after chat typing without moving the actor',()=>{
 const f=speechFixture();f.world.update(f.snapshot);f.step(0);
 const input=document.createElement('textarea');document.body.append(input);input.focus();
 const canvas=f.container.querySelector<HTMLCanvasElement>('canvas')!,before=f.world.getPosition();
 canvas.dispatchEvent(new window.MouseEvent('pointerdown',{clientX:120,clientY:300,button:0,bubbles:true}));
 canvas.dispatchEvent(new window.MouseEvent('pointermove',{clientX:170,clientY:300,button:0,bubbles:true}));
 canvas.dispatchEvent(new window.MouseEvent('pointerup',{clientX:170,clientY:300,button:0,bubbles:true}));
 expect(f.world.getCameraMode()).toBe('inspection');expect(document.activeElement).toBe(canvas);
 expect(f.world.getPosition()).toEqual(before);
});

it('keeps each rotated DIY mesh inside its authoritative footprint',()=>{
 const f=speechFixture(),room=structuredClone(f.snapshot);
 room.durable.zoneId='room0';room.durable.streamId='bedroom:room0';
 for(const player of room.players)player.zoneId='room0';
 for(const kind of ['bed','desk','chair','shelf','plant','lamp'])for(let rotation=0;rotation<4;rotation++){
  const p={id:'piece',kind,x:2,z:0,rotation,colour:'sage'};
  room.durable.room={id:'room0',ownerId:'p0',revision:1,open:true,palette:'sage',placements:[p]};
  f.world.update(room);f.step(rotation*100);
  const group=rendered.scene.children.find((o:any)=>o.userData.target?.type==='placement');
  const actual=new Box3().setFromObject(group,true),logical=footprint(p);
  expect(actual.min.x,kind+' x min r'+rotation).toBeGreaterThanOrEqual(logical.x-logical.w/2-.001);
  expect(actual.max.x,kind+' x max r'+rotation).toBeLessThanOrEqual(logical.x+logical.w/2+.001);
  expect(actual.min.z,kind+' z min r'+rotation).toBeGreaterThanOrEqual(logical.z-logical.d/2-.001);
  expect(actual.max.z,kind+' z max r'+rotation).toBeLessThanOrEqual(logical.z+logical.d/2+.001);
 }
});

it('keeps the actual animated self mesh and ring inside short HUD-free play space',()=>{
 for(const [width,height] of [[844,390],[390,520]]){
  const f=speechFixture(width,height);f.world.update(f.snapshot);f.step(0);
  const canvas=f.container.querySelector<HTMLCanvasElement>('canvas')!;
  f.world.setLabelSafeArea({viewport:{left:8,top:128,right:width-8,bottom:250},safeRects:[]});
  f.world.recenterCamera();
  let clock=0;
  for(const [dx,dz] of [[1,1],[-1,-1],[1,0],[0,1]]){
   f.world.setDirection(dx,dz);
   for(let i=1;i<=120;i++){
    clock+=1000/60;f.step(clock);
    const mesh=JSON.parse(canvas.dataset.selfMeshBounds!),area=JSON.parse(canvas.dataset.cameraPlayArea!);
    expect(mesh.left,width+'x'+height+' left').toBeGreaterThanOrEqual(area.x-.001);
    expect(mesh.right,width+'x'+height+' right').toBeLessThanOrEqual(area.x+area.w+.001);
    expect(mesh.top,width+'x'+height+' top').toBeGreaterThanOrEqual(area.y-.001);
    expect(mesh.bottom,width+'x'+height+' bottom').toBeLessThanOrEqual(area.y+area.h+.001);
   }
  }
 }
});

it('restores framing after the room editor closes before its next HUD report',()=>{
 for(const [width,height] of [[390,844],[390,520]])for(const mode of ['play','overview']){
  const f=speechFixture(width,height);f.world.update(f.snapshot);f.step(0);
  const canvas=f.container.querySelector<HTMLCanvasElement>('canvas')!;
  const base={viewport:{left:8,top:128,right:width-8,bottom:height===844?740:403},safeRects:[]};
  f.world.setLabelSafeArea(base);f.world.setCameraMode(mode);f.step(100);
  const beforeHeight=Number(canvas.dataset.selfAvatarHeight);
  f.world.setEditing(true);f.world.setLabelSafeArea({...base,safeRects:[{x:0,y:180,w:width,h:height-180}]});f.step(200);
  f.world.setEditing(false);f.world.setLabelSafeArea(base);f.step(300);
  expect(f.world.getCameraMode()).toBe(mode);
  const mesh=JSON.parse(canvas.dataset.selfMeshBounds!),area=JSON.parse(canvas.dataset.cameraPlayArea!);
  expect(mesh.top,width+'x'+height+' '+mode+' top').toBeGreaterThanOrEqual(area.y-.001);
  expect(mesh.bottom,width+'x'+height+' '+mode+' bottom').toBeLessThanOrEqual(area.y+area.h+.001);
  expect(Number(canvas.dataset.selfAvatarHeight)).toBeCloseTo(beforeHeight,1);
 }
});

function sceneMeshes() {
 const meshes:any[]=[];rendered.scene.traverse((object:any)=>{if(object.geometry)meshes.push(object);});return meshes;
}
function avatarRoots() {
 return rendered.scene.children.filter((object:any)=>object.children.some((child:any)=>child.geometry?.type==='RingGeometry'));
}
function doorGroup(slot:number) {
 return rendered.scene.children.find((object:any)=>object.userData.target?.type==='door'&&object.userData.target.slot===slot);
}
function doorPlaque(group:any) {
 return group.children.find((mesh:any)=>mesh.geometry?.parameters.width===.44);
}
function garmentMeshes(root:any) {
 const meshes:any[]=[];root.traverse((mesh:any)=>{
  const p=mesh.geometry?.parameters;
  if(p&&(p.radiusTop===.205&&p.height===.43||p.width===.12&&p.height===.31&&p.depth===.14))meshes.push(mesh);
 });return meshes;
}
function projectedDoor(container:HTMLElement,slot:number) {
 const canvas=container.querySelector<HTMLCanvasElement>('canvas')!;
 return JSON.parse(canvas.dataset.pickTargets!).find((entry:any)=>entry.target.type==='door'&&entry.target.slot===slot).target;
}

it('retains existing lounge geometry and shadows when a peer joins a vacant bedroom slot',()=>{
 const f=speechFixture();f.snapshot.players=f.snapshot.players.slice(0,1);f.snapshot.durable.residents=f.snapshot.durable.residents.slice(0,1);
 f.world.update(f.snapshot);f.step(0);
 const scene=rendered.scene,meshes=sceneMeshes(),disposals=meshes.map(mesh=>vi.spyOn(mesh.geometry,'dispose'));
 const light=scene.children.find((object:any)=>object.isDirectionalLight),shadowDispose=vi.spyOn(light.shadow,'dispose');
 const door=doorGroup(1),plaque=doorPlaque(door),label=[...f.container.querySelectorAll<HTMLElement>('.door')].find(el=>el.textContent==='Room 2\nVacant')!;
 const joined=structuredClone(f.snapshot),peer={...joined.players[0],id:'peer',name:'Morgan',colour:'rose',x:1};
 joined.players.push(peer);joined.durable.residents.push({...peer,slot:1,bedroomId:'peer-room',open:true});
 f.world.update(joined);f.step(100);
 expect(disposals.every(dispose=>dispose.mock.calls.length===0)).toBe(true);
 expect(shadowDispose).not.toHaveBeenCalled();expect(rendered.scene===scene).toBe(true);
 expect(meshes.every(mesh=>sceneMeshes().includes(mesh))).toBe(true);
 expect(doorGroup(1)===door).toBe(true);expect(doorPlaque(door)===plaque).toBe(true);
 expect(label.textContent).toBe('Morgan\nDoor open');expect(label.getAttribute('aria-label')).toBe(label.textContent);
 expect(plaque.material.color.getHexString()).toBe('c6999b');
 expect(door.children.every((mesh:any)=>mesh.userData.target.roomId==='peer-room')).toBe(true);
 expect(projectedDoor(f.container,1).roomId).toBe('peer-room');
 expect(f.container.querySelectorAll('.house-avatar-name')).toHaveLength(2);
});

it('refreshes resident labels, door targets and avatar colours in place, then removes only the departed avatar',()=>{
 const f=speechFixture();f.world.update(f.snapshot);f.step(0);
 const scene=rendered.scene,door=doorGroup(1),plaque=doorPlaque(door),target=door.userData.target;
 const floor=sceneMeshes()[0],floorDispose=vi.spyOn(floor.geometry,'dispose');
 const roots=avatarRoots(),selfGarments=garmentMeshes(roots[0]),peerGarments=garmentMeshes(roots[1]);
 expect(selfGarments).toHaveLength(3);expect(peerGarments).toHaveLength(3);
 const changed=structuredClone(f.snapshot),fullName='<img src=x> Morgan';
 Object.assign(changed.durable.residents[1],{name:fullName,colour:'rose',open:true,bedroomId:'replacement-room'});
 Object.assign(changed.players[1],{name:fullName,colour:'rose'});
 Object.assign(changed.durable.residents[0],{name:'Alex',colour:'blue'});Object.assign(changed.players[0],{name:'Alex',colour:'blue'});
 f.world.update(changed);f.step(100);
 expect(rendered.scene===scene).toBe(true);expect(avatarRoots()[1]===roots[1]).toBe(true);expect(floorDispose).not.toHaveBeenCalled();
 expect(door.userData.target===target).toBe(true);expect(target.roomId).toBe('replacement-room');
 expect(projectedDoor(f.container,1).roomId).toBe('replacement-room');
 expect(plaque.material.color.getHexString()).toBe('c6999b');
 expect(peerGarments.every(mesh=>mesh.material.color.getHexString()==='c6999b')).toBe(true);
 expect(selfGarments.every(mesh=>mesh.material.color.getHexString()==='92aebb')).toBe(true);
 expect(garmentMeshes(roots[2]).every(mesh=>mesh.material.color.getHexString()==='a5b49c')).toBe(true);
 const doorLabel=[...f.container.querySelectorAll<HTMLElement>('.door')].find(el=>el.textContent===fullName+'\nDoor open')!;
 expect(doorLabel.title).toBe(fullName+'\nDoor open');expect(doorLabel.getAttribute('aria-label')).toBe(doorLabel.title);expect(doorLabel.querySelector('img')).toBeNull();
 expect(f.container.querySelector('.own-door')?.textContent).toBe('Alex\nYour room');
 expect(f.container.querySelector<HTMLElement>('.house-avatar-name[data-player-id="p1"]')?.title).toBe(fullName+'\nCan chat');
 const peerDisposals:any[]=[];roots[1].traverse((mesh:any)=>{if(mesh.geometry)peerDisposals.push(vi.spyOn(mesh.geometry,'dispose'));});
 const departed=structuredClone(changed);departed.players=departed.players.filter((p:any)=>p.id!=='p1');departed.durable.residents=departed.durable.residents.filter((r:any)=>r.id!=='p1');
 f.world.update(departed);f.step(200);
 expect(rendered.scene===scene).toBe(true);expect(floorDispose).not.toHaveBeenCalled();expect(peerDisposals.every(dispose=>dispose.mock.calls.length===1)).toBe(true);
 expect(avatarRoots()).not.toContain(roots[1]);expect(f.container.querySelector('[data-player-id="p1"]')).toBeNull();
 expect(doorGroup(1)===door).toBe(true);expect(doorLabel.textContent).toBe('Room 2\nVacant');expect(plaque.material.color.getHexString()).toBe('d6cbb7');
 expect(door.children.every((mesh:any)=>mesh.userData.target.roomId===undefined)).toBe(true);expect(projectedDoor(f.container,1).roomId).toBeUndefined();
 const moved=structuredClone(departed);moved.durable.residents.find((r:any)=>r.id==='p0').slot=1;
 f.world.update(moved);f.step(300);
 expect(doorLabel.classList.contains('own-door')).toBe(true);expect(doorLabel.textContent).toBe('Alex\nYour room');
 expect(f.container.querySelectorAll('.own-door')).toHaveLength(1);expect(projectedDoor(f.container,0).roomId).toBeUndefined();
});

it('rebuilds geometry for room, capacity and privacy changes and clears prior zone content',()=>{
 const f=speechFixture();f.world.update(f.snapshot);f.step(0);
 const loungeScene=rendered.scene,loungeDispose=vi.spyOn(sceneMeshes()[0].geometry,'dispose');
 const room=structuredClone(f.snapshot);room.durable.zoneId='room0';room.durable.streamId='bedroom:room0';
 room.durable.room={id:'room0',ownerId:'p0',revision:1,open:true,palette:'sage',placements:[]};
 room.players[0].zoneId='room0';room.players[1].zoneId='room0';
 f.world.update(room);f.step(100);
 expect(rendered.scene===loungeScene).toBe(false);expect(loungeDispose).toHaveBeenCalledTimes(1);
 expect(f.container.querySelectorAll('.door,.own-door')).toHaveLength(0);expect(f.container.querySelectorAll('.house-avatar-name')).toHaveLength(2);
 expect(JSON.parse(f.container.querySelector<HTMLCanvasElement>('canvas')!.dataset.pickTargets!)).toHaveLength(0);
 const roomScene=rendered.scene,roomDispose=vi.spyOn(sceneMeshes()[0].geometry,'dispose');
 const renamed=structuredClone(room);renamed.durable.residents[0].name='Updated owner';renamed.players[0].name='Updated owner';
 f.world.update(renamed);f.step(200);
 expect(rendered.scene===roomScene).toBe(true);expect(roomDispose).not.toHaveBeenCalled();expect(f.container.querySelector('.room')?.textContent).toBe("Updated owner's room");
 const closed=structuredClone(renamed);closed.durable.room.open=false;closed.durable.room.revision=2;
 f.world.update(closed);f.step(300);expect(rendered.scene===roomScene).toBe(false);expect(roomDispose).toHaveBeenCalledTimes(1);
 const changed=structuredClone(f.snapshot);changed.durable.house.capacity=2;changed.durable.residents=changed.durable.residents.slice(0,2);changed.players=changed.players.slice(0,2);
 f.world.update(changed);f.step(400);expect(f.container.querySelectorAll('.door,.own-door')).toHaveLength(2);expect(f.container.querySelector('.room')).toBeNull();
 const capacityScene=rendered.scene,capacityDispose=vi.spyOn(sceneMeshes()[0].geometry,'dispose');
 f.world.update(null);expect(capacityDispose).toHaveBeenCalledTimes(1);expect(f.container.querySelectorAll('.house-avatar-name,.door,.own-door,.room')).toHaveLength(0);
 expect(f.container.querySelector('canvas')?.hasAttribute('data-pick-targets')).toBe(false);
 f.world.update(changed);f.step(500);expect(rendered.scene===capacityScene).toBe(false);expect(f.container.querySelectorAll('.house-avatar-name')).toHaveLength(2);
});

it.each(['serverEpoch','house','self','access','generation','stream'] as const)('rebuilds the scene across a direct %s lifecycle change in the same zone',kind=>{
 const f=speechFixture();f.world.update(f.snapshot);f.step(0);
 const scene=rendered.scene,dispose=vi.spyOn(sceneMeshes()[0].geometry,'dispose'),changed=structuredClone(f.snapshot);
 if(kind==='serverEpoch')changed.serverEpoch='next-epoch';
 if(kind==='house')changed.durable.house.id='next-house';
 if(kind==='self')changed.durable.selfId='p1';
 if(kind==='access')changed.accessGeneration=2;
 if(kind==='generation')changed.generation=2;
 if(kind==='stream')changed.durable.streamId='replacement-stream';
 f.world.update(changed);f.step(100);expect(rendered.scene===scene).toBe(false);expect(dispose).toHaveBeenCalledTimes(1);
 if(kind==='self')expect(f.container.querySelector('.own-door')?.textContent).toBe('Friend 1\nYour room');
});

it('keeps static resources across player motion, availability and disconnect while retaining the permanent room owner',()=>{
 const f=speechFixture();f.world.update(f.snapshot);f.step(0);
 const scene=rendered.scene,door=doorGroup(1),roots=avatarRoots();
 const floorDispose=vi.spyOn(sceneMeshes()[0].geometry,'dispose');
 const shadowDispose=vi.spyOn(scene.children.find((object:any)=>object.isDirectionalLight).shadow,'dispose');
 const moved=structuredClone(f.snapshot);Object.assign(moved.players[1],{x:1,z:3,heading:1,animation:'walk',availability:'quiet'});
 f.world.update(moved);f.step(100);
 expect(rendered.scene===scene).toBe(true);expect(avatarRoots()[1]===roots[1]).toBe(true);
 expect(f.container.querySelector<HTMLElement>('.house-avatar-name[data-player-id="p1"]')?.title).toBe('Friend 1\nQuiet');
 const offline=structuredClone(moved);offline.players[1].connected=false;
 f.world.update(offline);f.step(200);
 expect(avatarRoots()).not.toContain(roots[1]);expect(f.container.querySelectorAll('.house-avatar-name')).toHaveLength(5);
 expect(doorGroup(1)===door).toBe(true);expect(door.userData.target.roomId).toBe('room1');
 expect([...f.container.querySelectorAll('.door')].some(el=>el.textContent==='Friend 1\nDoor closed')).toBe(true);
 const online=structuredClone(offline);online.players[1].connected=true;
 f.world.update(online);f.step(300);
 expect(rendered.scene===scene).toBe(true);expect(floorDispose).not.toHaveBeenCalled();expect(shadowDispose).not.toHaveBeenCalled();
 expect(f.container.querySelectorAll('.house-avatar-name')).toHaveLength(6);expect(avatarRoots()).not.toContain(roots[1]);
});

it('updates an active speech speaker after a resident rename without replacing the bubble or replaying history',()=>{
 const f=speechFixture();f.world.update(f.snapshot);f.step(0);
 const chatting=structuredClone(f.snapshot);chatting.durable.sequence=1;
 chatting.durable.chat=[{id:'fresh',authorId:'p1',name:'Friend 1',text:'A next step',at:0,sequence:1}];
 f.world.update(chatting);f.step(100);
 const bubble=f.visible().find(el=>el.dataset.playerId==='p1')!,scene=rendered.scene;
 expect(bubble.getAttribute('aria-label')).toBe('Friend 1: A next step. Full message in Chat.');
 const renamed=structuredClone(chatting);renamed.durable.residents[1].name='<script>Morgan';renamed.players[1].name='<script>Morgan';
 f.world.update(renamed);f.step(200);
 expect(rendered.scene===scene).toBe(true);expect(f.visible()).toContain(bubble);expect(bubble.dataset.messageId).toBe('fresh');
 expect(bubble.getAttribute('aria-label')).toBe('<script>Morgan: A next step. Full message in Chat.');
 expect(bubble.firstElementChild?.firstElementChild?.textContent).toBe('<script>Morgan');expect(bubble.querySelector('script')).toBeNull();
 f.step(4100);expect(f.visible()).toHaveLength(0);
});

it.each(['id','ownerId','revision','open','palette','placements'] as const)('rebuilds actual bedroom geometry for a direct room %s change',field=>{
 const f=speechFixture(),room=structuredClone(f.snapshot);
 room.durable.zoneId='room0';room.durable.streamId='bedroom:room0';
 room.durable.room={id:'room0',ownerId:'p0',revision:1,open:true,palette:'sage',placements:[]};
 for(const player of room.players)player.zoneId='room0';
 f.world.update(room);f.step(0);
 const scene=rendered.scene,dispose=vi.spyOn(sceneMeshes()[0].geometry,'dispose'),changed=structuredClone(room);
 if(field==='id')changed.durable.room.id='replacement-room';
 if(field==='ownerId')changed.durable.room.ownerId='p1';
 if(field==='revision')changed.durable.room.revision=2;
 if(field==='open')changed.durable.room.open=false;
 if(field==='palette')changed.durable.room.palette='rose';
 if(field==='placements')changed.durable.room.placements=[{id:'plant',kind:'plant',x:2,z:1,rotation:0,colour:'sage'}];
 f.world.update(changed);f.step(100);
 expect(rendered.scene===scene).toBe(false);expect(dispose).toHaveBeenCalledTimes(1);
 expect(f.container.querySelectorAll('.door,.own-door')).toHaveLength(0);
 if(field==='ownerId')expect(f.container.querySelector('.room')?.textContent).toBe("Friend 1's room");
 if(field==='placements')expect(JSON.parse(f.container.querySelector<HTMLCanvasElement>('canvas')!.dataset.pickTargets!)).toEqual([expect.objectContaining({target:{type:'placement',id:'plant'}})]);
});


it.each(['replace','remove'] as const)('cancels only a queued door approach when its bedroom occupant changes: %s',change=>{
 const interact=vi.fn(),f=speechFixture(390,844,{onInteract:interact}),target=createLayout(6).doors[1].target;
 Object.assign(f.snapshot.players[0],target);f.world.update(f.snapshot);
 expect(f.world.approach({type:'door',slot:1})).toBe(true);
 const changed=structuredClone(f.snapshot);
 if(change==='replace')Object.assign(changed.durable.residents[1],{id:'replacement',name:'New peer',bedroomId:'new-room'});
 else changed.durable.residents=changed.durable.residents.filter((resident:any)=>resident.slot!==1);
 f.world.update(changed);
 for(let time=0;time<=1000;time+=100)f.step(time);
 expect(interact).not.toHaveBeenCalled();expect(f.world.getPosition()).toEqual(target);
});

it('keeps a queued door approach across changes to the same occupant name, colour and door state',()=>{
 const interact=vi.fn(),f=speechFixture(390,844,{onInteract:interact}),target=createLayout(6).doors[1].target;
 Object.assign(f.snapshot.players[0],target);f.world.update(f.snapshot);
 expect(f.world.approach({type:'door',slot:1})).toBe(true);
 const changed=structuredClone(f.snapshot);
 Object.assign(changed.durable.residents[1],{name:'Morgan',colour:'rose',open:true});
 Object.assign(changed.players[1],{name:'Morgan',colour:'rose'});
 f.world.update(changed);
 for(let time=0;time<=1000;time+=100)f.step(time);
 expect(interact).toHaveBeenCalledExactlyOnceWith({type:'door',slot:1,roomId:'room1'});
});


it('renders the first usable frame and bounds static GPU draws while RAF and speech keep running',()=>{
 const f=speechFixture();f.world.update(f.snapshot);f.step(0);expect(f.renders()).toBe(1);
 const chatting=structuredClone(f.snapshot);chatting.durable.sequence=1;
 chatting.durable.chat=[{id:'fresh-idle',authorId:'p1',name:'Friend 1',text:'Still responsive',at:0,sequence:1}];
 f.world.update(chatting);f.step(1000/60);expect(f.visible()).toHaveLength(1);expect(f.renders()).toBe(1);
 for(let frame=2;frame<=60;frame++){f.world.update(structuredClone(chatting));f.step(frame*1000/60);}
 expect(f.renders()-1).toBeLessThanOrEqual(10);
 expect(f.renders()).toBeGreaterThan(1);
 expect(f.container.querySelector('canvas')?.dataset.selfAnimation).toBe('idle');
 f.step(4001);expect(f.visible()).toHaveLength(0);
});

it('renders local walking at every RAF while preserving elapsed movement and realtime sends',()=>{
 const onMove=vi.fn(),f=speechFixture(390,844,{onMove});f.world.update(f.snapshot);f.step(0);
 f.world.setDirection(-1,0);const before=f.renders();
 for(let frame=1;frame<=12;frame++)f.step(frame*1000/60);
 expect(f.renders()-before).toBe(12);
 expect(Math.hypot(f.world.getPosition().x,f.world.getPosition().z-3.3)).toBeCloseTo(.52,2);
 expect(onMove).toHaveBeenCalledTimes(2);
 expect(onMove.mock.calls.every(([motion])=>motion.animation==='walk')).toBe(true);
});

it('renders remote walking and interpolation at every RAF then returns to the static budget',()=>{
 const f=speechFixture();f.world.update(f.snapshot);f.step(0);
 const moved=structuredClone(f.snapshot);Object.assign(moved.players[1],{x:1,z:3.3,animation:'walk'});
 f.world.update(moved);const before=f.renders();
 for(let frame=1;frame<=12;frame++)f.step(frame*1000/60);
 expect(f.renders()-before).toBe(12);
 const stopped=structuredClone(moved);stopped.players[1].animation='idle';f.world.update(stopped);
 const settling=f.renders();for(let frame=13;frame<=24;frame++)f.step(frame*1000/60);
 expect(f.renders()-settling).toBe(12);
 const peer=f.container.querySelector<HTMLElement>('.house-avatar-name[data-player-id="p1"]')!;
 expect(Number(peer.dataset.x)).toBeGreaterThan(.95);expect(Number(peer.dataset.x)).toBeLessThanOrEqual(1);
 for(let frame=25;frame<=180;frame++)f.step(frame*1000/60);
 const idle=f.renders();for(let frame=181;frame<=240;frame++)f.step(frame*1000/60);
 expect(f.renders()-idle).toBeLessThanOrEqual(10);
});

it('renders a settling follow camera every RAF after the avatar stops',()=>{
 const f=speechFixture();f.world.update(f.snapshot);f.step(0);
 f.world.setLabelSafeArea({viewport:{left:8,top:120,right:220,bottom:500},safeRects:[]});f.world.recenterCamera();f.step(10);
 const corrected=structuredClone(f.snapshot);corrected.players[0].x=3;f.world.update(corrected);
 const before=f.renders(),canvas=f.container.querySelector<HTMLCanvasElement>('canvas')!,left=canvas.dataset.worldLeft;
 for(let frame=1;frame<=8;frame++)f.step(10+frame*1000/60);
 expect(f.renders()-before).toBe(8);expect(canvas.dataset.worldLeft).not.toBe(left);
 expect(f.world.getPosition()).toEqual({x:3,z:3.3});
});

it('redraws scene membership and material changes before the next idle draw is due',()=>{
 const f=speechFixture();f.world.update(f.snapshot);f.step(0);
 const scene=rendered.scene,changed=structuredClone(f.snapshot);
 changed.durable.residents[1].colour='rose';changed.players[1].colour='rose';
 f.world.update(changed);f.step(10);expect(f.renders()).toBe(2);expect(rendered.scene).toBe(scene);
 expect(doorPlaque(doorGroup(1)).material.color.getHexString()).toBe('c6999b');
 const departed=structuredClone(changed);departed.players=departed.players.filter((p:any)=>p.id!=='p1');
 f.world.update(departed);f.step(20);expect(f.renders()).toBe(3);expect(avatarRoots()).toHaveLength(5);
 f.world.update(changed);f.step(30);expect(f.renders()).toBe(4);expect(avatarRoots()).toHaveLength(6);
 f.world.update(null);f.step(40);expect(f.renders()).toBe(5);expect(rendered.scene).not.toBe(scene);
});

it('redraws projection controls and resize before the next idle draw is due',()=>{
 const f=speechFixture();f.world.update(f.snapshot);f.step(0);
 f.world.setCameraZoom(1.3);f.step(10);expect(f.renders()).toBe(2);
 f.world.setCameraMode('overview');f.step(20);expect(f.renders()).toBe(3);
 const canvas=f.container.querySelector<HTMLCanvasElement>('canvas')!;
 canvas.dispatchEvent(new window.MouseEvent('pointerdown',{clientX:120,clientY:300,button:2,bubbles:true}));
 canvas.dispatchEvent(new window.MouseEvent('pointermove',{clientX:170,clientY:300,button:2,bubbles:true}));
 canvas.dispatchEvent(new window.MouseEvent('pointerup',{clientX:170,clientY:300,button:2,bubbles:true}));
 f.step(30);expect(f.renders()).toBe(4);expect(f.world.getCameraMode()).toBe('inspection');
 Object.defineProperty(f.container,'clientWidth',{value:701,configurable:true});f.world.resize();f.step(40);expect(f.renders()).toBe(5);
 f.world.recenterCamera();f.step(50);expect(f.renders()).toBe(6);
});

it('redraws DIY preview and actual selection changes before the next idle draw is due',()=>{
 const f=speechFixture(),room=structuredClone(f.snapshot);
 room.durable.zoneId='room0';room.durable.streamId='bedroom:room0';
 room.durable.room={id:'room0',ownerId:'p0',revision:1,open:true,palette:'sage',placements:[{id:'plant',kind:'plant',x:0,z:0,rotation:0,colour:'sage'}]};
 for(const p of room.players)p.zoneId='room0';f.world.update(room);f.world.setCameraMode('overview');f.world.setEditing(true);f.step(0);
 const canvas=f.container.querySelector<HTMLCanvasElement>('canvas')!;
 vi.spyOn(canvas,'getBoundingClientRect').mockReturnValue({left:0,top:0,right:390,bottom:844,width:390,height:844,x:0,y:0,toJSON(){}});
 rendered.scene.updateMatrixWorld(true);
 const point=JSON.parse(canvas.dataset.pickTargets!).find((item:any)=>item.target.type==='placement');
 canvas.dispatchEvent(new window.MouseEvent('pointerdown',{clientX:point.x,clientY:point.y,button:0,bubbles:true}));
 canvas.dispatchEvent(new window.MouseEvent('pointerup',{clientX:point.x,clientY:point.y,button:0,bubbles:true}));
 f.step(10);expect(f.renders()).toBe(2);expect(sceneMeshes().some(mesh=>mesh.material.wireframe===true)).toBe(true);
 f.world.setEditing(false);f.step(20);expect(f.renders()).toBe(3);expect(sceneMeshes().some(mesh=>mesh.material.wireframe===true)).toBe(false);
 f.world.setRoomPreview([{...room.durable.room.placements[0],x:1}]);f.step(30);expect(f.renders()).toBe(4);
 const selected=sceneMeshes().find(mesh=>mesh.userData.target?.type==='placement');expect(selected).toBeDefined();
});

it('does not draw while suspended and forces the updated scene on the first resumed RAF',()=>{
 const f=speechFixture();f.world.update(f.snapshot);f.step(0);const before=f.world.getPosition();
 f.world.setSuspended(true);const changed=structuredClone(f.snapshot);changed.players[1].colour='rose';f.world.update(changed);
 f.world.setDirection(-1,0);f.step(10);expect(f.renders()).toBe(1);expect(f.world.getPosition()).toEqual(before);
 f.world.setSuspended(false);f.step(20);expect(f.renders()).toBe(2);expect(f.world.getPosition()).toEqual(before);
 expect(garmentMeshes(avatarRoots()[1]).every(mesh=>mesh.material.color.getHexString()==='c6999b')).toBe(true);
});


it('redraws stationary remote heading and seating changes and the final idle limb pose',()=>{
 const f=speechFixture();f.world.update(f.snapshot);f.step(0);
 const turned=structuredClone(f.snapshot);turned.players[1].heading=1;f.world.update(turned);f.step(10);
 expect(f.renders()).toBe(2);expect(avatarRoots()[1].children[0].rotation.y).toBe(1);
 const seated=structuredClone(turned);Object.assign(seated.players[1],{animation:'sit',seatId:'seat:0'});f.world.update(seated);f.step(20);
 expect(f.renders()).toBe(3);expect(avatarRoots()[1].position.y).toBe(SEATED_LIFT);
 const walked=structuredClone(turned);walked.players[1].animation='walk';f.world.update(walked);f.step(30);expect(f.renders()).toBe(4);
 f.world.update(turned);f.step(40);expect(f.renders()).toBe(5);expect(avatarRoots()[1].position.y).toBe(0);
 const body=avatarRoots()[1].children[0],leg=body.children.find((child:any)=>child.isGroup&&child.position.y===.52);
 expect(leg.rotation.x).toBe(0);expect(body.position.y).toBe(0);
});

it('keeps stationary walking limbs at RAF cadence with reduced motion enabled',()=>{
 const f=speechFixture();f.world.setReducedMotion(true);f.world.update(f.snapshot);f.step(0);
 const walked=structuredClone(f.snapshot);walked.players[1].animation='walk';f.world.update(walked);
 const before=f.renders();for(let frame=1;frame<=12;frame++)f.step(frame*1000/60);
 expect(f.renders()-before).toBe(12);expect(avatarRoots()[1].children[0].position.y).toBe(0);
});

it('forces a resumed frame even without intervening scene changes',()=>{
 const f=speechFixture();f.world.update(f.snapshot);f.step(0);f.world.setSuspended(true);f.step(10);expect(f.renders()).toBe(1);
 f.world.setSuspended(false);f.step(20);expect(f.renders()).toBe(2);
});
