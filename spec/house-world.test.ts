import { JSDOM } from "jsdom";
import { afterEach, expect, it, vi } from "vitest";
import { Box3, Raycaster, Vector3 } from "three";
const rendered = vi.hoisted(()=>({ scene: null as any, camera: null as any, count: 0 }));
vi.mock("three",async importOriginal=>{
 const actual=await importOriginal<any>();
 class Renderer { shadowMap:any={}; outputColorSpace:any; toneMapping:any; toneMappingExposure:any; setPixelRatio(){} setSize(){} render(scene:any,camera:any){rendered.scene=scene;rendered.camera=camera;rendered.count++;} dispose(){} }
 return {...actual,WebGLRenderer:Renderer};
});
import { createLayout, bedroomLayout, slide, footprint, CAMERA_ORIENTATION, AVATAR_RADIUS, SEATED_LIFT } from '../public/house-geometry.js';
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
  f.world.setLabelSafeArea(base);f.step(50);const beforeHeight=Number(canvas.dataset.selfAvatarHeight);f.world.setCameraMode(mode);f.step(100);
  f.world.setEditing(true);f.world.setLabelSafeArea({...base,safeRects:[{x:0,y:180,w:width,h:height-180}]});f.step(200);
  f.world.setEditing(false);f.world.setLabelSafeArea(base);f.step(300);
  expect(f.world.getCameraMode()).toBe('play');
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
 f.step(30);expect(f.renders()).toBe(4);expect(f.world.getCameraMode()).toBe('overview');
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


it('bounds unacknowledged prediction, rolls back rejected motion and keeps held manual intent', async()=>{
 let settle:(reply:any)=>void=()=>{};
 const move=vi.fn(()=>new Promise(resolve=>{settle=resolve;}));
 const f=speechFixture(390,844,{onMove:move});f.world.update(f.snapshot);f.step(0);
 const start=f.world.getPosition();f.world.setDirection(-1,0);f.step(100);
 for(const time of [250,500,750,1000])f.step(time);
 expect(move).toHaveBeenCalledTimes(1);
 expect(Math.hypot(f.world.getPosition().x-start.x,f.world.getPosition().z-start.z)).toBeLessThanOrEqual(.65001);
 settle({ok:false,position:start});await Promise.resolve();await Promise.resolve();
 expect(f.world.getPosition()).toEqual(start);
 f.step(1100);expect(Math.hypot(f.world.getPosition().x-start.x,f.world.getPosition().z-start.z)).toBeCloseTo(.26,3);
 expect(move).toHaveBeenCalledTimes(2);
});

it('keeps normal acknowledged walking at2.6units per second and ignores a former room receipt',async()=>{
 const move=vi.fn(async(position:any)=>({ok:true,position}));
 const f=speechFixture(390,844,{onMove:move});f.world.update(f.snapshot);f.step(0);
 const start=f.world.getPosition();f.world.setDirection(-1,0);
 for(let t=100;t<=1000;t+=100){f.step(t);await Promise.resolve();await Promise.resolve();}
 expect(Math.hypot(f.world.getPosition().x-start.x,f.world.getPosition().z-start.z)).toBeCloseTo(2.6,3);
 let settle:(reply:any)=>void=()=>{};move.mockImplementationOnce(()=>new Promise(resolve=>{settle=resolve;}));f.step(1100);
 const next=structuredClone(f.snapshot);next.durable.zoneId='room0';next.durable.streamId='bedroom:room0';next.generation=2;
 next.durable.room={id:'room0',ownerId:'p0',revision:1,open:true,palette:'sage',placements:[]};for(const p of next.players){p.zoneId='room0';p.x=0;p.z=3.3;}
 f.world.update(next);const arrived=f.world.getPosition();settle({ok:false,position:{x:9,z:9}});await Promise.resolve();await Promise.resolve();
 expect(f.world.getPosition()).toEqual(arrived);
});


it('waits80ms after a delayed receipt and keeps at most ten dispatches per second',async()=>{
 let settle:(reply:any)=>void=()=>{};const moves:any[]=[];
 const f=speechFixture(390,844,{onMove:(motion:any)=>{moves.push({...motion});return new Promise(resolve=>{settle=resolve;});}});
 f.world.update(f.snapshot);f.step(0);f.world.setDirection(-1,0);f.step(100);f.step(250);
 settle({ok:true});await Promise.resolve();await Promise.resolve();f.step(300);expect(moves).toHaveLength(1);
 f.step(330);expect(moves).toHaveLength(2);expect(Math.hypot(moves[1].x-moves[0].x,moves[1].z-moves[0].z)).toBeLessThanOrEqual(.65001);
});

it('keeps coalesced curved manual motion reachable by a single server sweep from its acknowledged anchor',async()=>{
 let settle:(reply:any)=>void=()=>{};const moves:any[]=[];
 const f=speechFixture(390,844,{onMove:(motion:any)=>{moves.push({...motion});return new Promise(resolve=>{settle=resolve;});}});
 const state=structuredClone(f.snapshot);state.durable.zoneId='room0';state.durable.streamId='bedroom:room0';state.durable.room={id:'room0',ownerId:'p0',revision:1,open:true,palette:'sage',placements:[{id:'plant',kind:'plant',x:0,z:0,rotation:0,colour:'sage'}]};
 const layout=bedroomLayout(state.durable.room.placements);for(const player of state.players)Object.assign(player,{zoneId:'room0',x:-.7,z:.7});
 f.world.update(state);f.step(0);f.world.setDirection(1,0);f.step(100);settle({ok:true});await Promise.resolve();await Promise.resolve();
 const anchor={x:moves[0].x,z:moves[0].z};
 f.step(200);f.world.setDirection(0,-1);f.step(300);f.step(400);f.world.setDirection(-1,0);f.step(500);f.step(600);
 const predicted=f.world.getPosition(),swept=slide(layout,anchor,predicted.x-anchor.x,predicted.z-anchor.z);
 expect(Math.hypot(swept.x-predicted.x,swept.z-predicted.z)).toBeLessThanOrEqual(.010001);
 settle({ok:true});await Promise.resolve();await Promise.resolve();f.step(700);
 const sent=moves.at(-1),from={x:moves[1].x,z:moves[1].z},packet=slide(layout,from,sent.x-from.x,sent.z-from.z);
 expect(Math.hypot(packet.x-sent.x,packet.z-sent.z)).toBeLessThanOrEqual(.010001);
});

it.each(['seat','epoch','control','closed'])('ignores pending world correction after a %s lifecycle boundary',async(change)=>{
 let settle:(reply:any)=>void=()=>{};const f=speechFixture(390,844,{onMove:()=>new Promise(resolve=>{settle=resolve;})});
 f.world.update(f.snapshot);f.step(0);f.world.setDirection(-1,0);f.step(100);
 const next=structuredClone(f.snapshot);if(change==='epoch')next.serverEpoch='epoch-b';if(change==='control'){next.generation++;next.controller=false;}if(change==='seat'){next.players[0].seatId='seat:0';next.players[0].animation='sit';}
 if(change==='closed')f.world.update(null);else f.world.update(next);const before=f.world.getPosition();settle({ok:false,position:{x:9,z:9}});await Promise.resolve();await Promise.resolve();
 expect(f.world.getPosition()).toEqual(before);
});


it('replans a rejected automatic approach and sends swept chords around furniture after delayed receipts',async()=>{
 const layout=createLayout(6),actions=vi.fn();let anchor={x:0,z:3.3},pending:any=null,clock=0,rejections=0,packets=0;
 const f=speechFixture(390,844,{onInteract:actions,onMove:(motion:any)=>{
  const swept=slide(layout,anchor,motion.x-anchor.x,motion.z-anchor.z);
  expect(Math.hypot(swept.x-motion.x,swept.z-motion.z)).toBeLessThanOrEqual(.010001);
  expect(Math.hypot(motion.x-anchor.x,motion.z-anchor.z)).toBeLessThanOrEqual(.65001);packets++;
  return new Promise(resolve=>{pending={motion,resolve,due:clock+150};});
 }});
 f.world.update(f.snapshot);f.step(0);expect(f.world.approach({type:'door',slot:5})).toBe(true);
 for(clock=50;clock<=15000&&!actions.mock.calls.length;clock+=50){
  f.step(clock);
  if(pending&&pending.due<=clock){const receipt=pending;pending=null;if(!rejections){rejections++;receipt.resolve({ok:false,position:anchor});}else{anchor={x:receipt.motion.x,z:receipt.motion.z};receipt.resolve({ok:true,position:anchor});}await Promise.resolve();await Promise.resolve();}
 }
 expect(rejections).toBe(1);expect(packets).toBeGreaterThan(3);expect(actions).toHaveBeenCalledWith(expect.objectContaining({type:'door',slot:5,roomId:'room5'}));
});


it('emits a server-sweepable endpoint when collision sliding is non-idempotent at a plant corner',async()=>{
 const angle=1.0241974673298322,length=.6158136343932711,dx=Math.cos(angle),dz=Math.sin(angle),yaw=Math.atan2(CAMERA_ORIENTATION.x,CAMERA_ORIENTATION.z);
 const accepted={x:-.5252986615523696,z:.3930936870165169};let anchor={x:accepted.x-.0026*dx,z:accepted.z-.0026*dz};const packets:any[]=[];
 const state:any={};const f=speechFixture(390,844,{onMove:async(motion:any)=>{packets.push({...motion});return {ok:true,position:motion};}});
 Object.assign(state,structuredClone(f.snapshot));state.durable.zoneId='room0';state.durable.streamId='bedroom:room0';state.durable.room={id:'room0',ownerId:'p0',revision:1,open:true,palette:'sage',placements:[{id:'plant',kind:'plant',x:0,z:0,rotation:0,colour:'sage'}]};
 const layout=bedroomLayout(state.durable.room.placements);for(const player of state.players)Object.assign(player,{zoneId:'room0',...anchor});
 f.world.update(state);f.step(0);f.world.setDirection(dx*Math.cos(yaw)-dz*Math.sin(yaw),dx*Math.sin(yaw)+dz*Math.cos(yaw));f.step(1);await Promise.resolve();await Promise.resolve();anchor={x:packets[0].x,z:packets[0].z};
 expect(anchor.x).toBeCloseTo(accepted.x,6);f.step(1+length/2.6*1000);
 const motion=packets.at(-1),swept=slide(layout,anchor,motion.x-anchor.x,motion.z-anchor.z);
 expect(Math.hypot(swept.x-motion.x,swept.z-motion.z)).toBeLessThanOrEqual(.010001);
 expect(Math.hypot(motion.x-anchor.x,motion.z-anchor.z)).toBeGreaterThan(.1);
});

it('bounds prediction when transport is busy after a same-room authority correction and retains held intent',async()=>{
 let busy=false;const moves:any[]=[];const f=speechFixture(390,844,{onMove:(motion:any)=>{if(busy)return false;moves.push(motion);busy=true;return new Promise(()=>{});}});
 f.world.update(f.snapshot);f.step(0);f.world.setDirection(-1,0);f.step(100);
 const corrected=structuredClone(f.snapshot);Object.assign(corrected.players[0],{x:4,z:3.3});f.world.update(corrected);const authority=f.world.getPosition();
 for(let time=200;time<=1200;time+=100)f.step(time);
 expect(Math.hypot(f.world.getPosition().x-authority.x,f.world.getPosition().z-authority.z)).toBeLessThanOrEqual(.65001);
 busy=false;f.step(1300);expect(moves).toHaveLength(2);expect(Math.hypot(f.world.getPosition().x-authority.x,f.world.getPosition().z-authority.z)).toBeGreaterThan(.1);
});

it('resumes follow on intentional walking after a temporary primary drag',()=>{
 const f=speechFixture();f.world.update(f.snapshot);f.step(0);
 const canvas=f.container.querySelector('canvas')!;
 canvas.dispatchEvent(new window.MouseEvent('pointerdown',{clientX:120,clientY:300,button:0,bubbles:true}));
 canvas.dispatchEvent(new window.MouseEvent('pointermove',{clientX:127,clientY:300,button:0,bubbles:true}));
 canvas.dispatchEvent(new window.MouseEvent('pointerup',{clientX:127,clientY:300,button:0,bubbles:true}));
 expect(f.world.getCameraMode()).toBe('inspection');
 f.world.setDirection(-1,0);f.step(100);
 expect(f.world.getCameraMode()).toBe('play');
});

function temporaryPan(f:ReturnType<typeof speechFixture>, pixels=7){
 const canvas=f.container.querySelector('canvas')!;
 for(const [name,x] of [['pointerdown',120],['pointermove',120+pixels],['pointerup',120+pixels]] as const)canvas.dispatchEvent(new window.MouseEvent(name,{clientX:x,clientY:300,button:0,bubbles:true}));
 return canvas;
}
it.each(['keyboard','touch','route'])('resumes temporary inspection on %s intent before any actual displacement',kind=>{
 const f=speechFixture();f.world.update(f.snapshot);f.step(0);temporaryPan(f);expect(f.world.getCameraMode()).toBe('inspection');
 if(kind==='keyboard')window.dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));
 if(kind==='touch')f.world.setDirection(-1,0);
 if(kind==='route')expect(f.world.approach({type:'door',slot:0})).toBe(true);
 expect(f.world.getCameraMode()).toBe('play');
});
it.each(['inspection','overview'])('retains explicit %s during walking and restores Follow after editing',mode=>{
 const f=speechFixture();f.world.update(f.snapshot);f.step(0);f.world.setCameraMode(mode);f.world.setDirection(-1,0);f.step(100);
 expect(f.world.getCameraMode()).toBe(mode);f.world.setEditing(true);f.step(200);const before=f.container.querySelector('canvas')!.dataset.worldLeft;
 f.world.setDirection(1,0);f.step(400);expect(f.container.querySelector('canvas')!.dataset.worldLeft).toBe(before);
 f.world.setEditing(false);expect(f.world.getCameraMode()).toBe('play');
});
it.each(['correction','seat','takeover'])('does not treat a %s snapshot as walking intent',kind=>{
 const f=speechFixture();f.world.update(f.snapshot);f.step(0);temporaryPan(f);
 const next=structuredClone(f.snapshot);if(kind==='correction')next.players[0].x=4;if(kind==='seat')Object.assign(next.players[0],{seatId:'seat-1',animation:'sit'});if(kind==='takeover')next.generation++;
 f.world.update(next);f.step(100);expect(f.world.getCameraMode()).toBe('inspection');
});
it('releases cancelled pointer capture and ignores subsequent stale move/up events',()=>{
 const f=speechFixture();f.world.update(f.snapshot);f.step(0);const canvas=temporaryPan(f);
 Object.defineProperty(canvas,'hasPointerCapture',{value:vi.fn(()=>true)});const release=vi.fn();Object.defineProperty(canvas,'releasePointerCapture',{value:release});
 canvas.dispatchEvent(new window.MouseEvent('pointerdown',{clientX:120,clientY:300,bubbles:true}));canvas.dispatchEvent(new window.MouseEvent('pointercancel',{bubbles:true}));
 expect(release).toHaveBeenCalled();f.world.recenterCamera();canvas.dispatchEvent(new window.MouseEvent('pointermove',{clientX:240,clientY:300,bubbles:true}));expect(f.world.getCameraMode()).toBe('play');
});
it('chair placement clicks use the existing routed authoritative seat interaction',()=>{
 const actions=vi.fn(),f=speechFixture(390,844,{onInteract:actions}),state=structuredClone(f.snapshot);
 state.durable.zoneId='room0';state.durable.streamId='bedroom:room0';state.durable.room={id:'room0',ownerId:'p0',revision:1,open:true,palette:'sage',placements:[{id:'chair-id',kind:'chair',x:0,z:0,rotation:0,colour:'sage'}]};
 for(const p of state.players)Object.assign(p,{zoneId:'room0',x:0,z:3});f.world.update(state);f.step(0);
 let picked:any;rendered.scene.traverse((o:any)=>{if(o.userData.target?.id==='chair-id')picked=o;});expect(picked).toBeTruthy();
 const ray=vi.spyOn(Raycaster.prototype,'intersectObjects').mockReturnValue([{object:picked}] as any);
 try{temporaryPan(f,0);for(let t=100;t<=3000;t+=100)f.step(t);expect(actions).toHaveBeenCalledWith({type:'seat',seatId:'chair-id'});}finally{ray.mockRestore();}
});

it('does not resume inspection or walk from typing, chat handle arrows or a disabled tool',()=>{
 const f=speechFixture();f.world.update(f.snapshot);f.step(0);temporaryPan(f);const before=f.world.getPosition();
 const input=document.createElement('input');document.body.append(input);input.focus();input.dispatchEvent(new window.KeyboardEvent('keydown',{key:'a',bubbles:true}));f.world.setDirection(-1,0);f.step(100);
 expect(f.world.getCameraMode()).toBe('inspection');expect(f.world.getPosition()).toEqual(before);
 const handle=document.createElement('div');handle.id='chat-window';handle.tabIndex=0;document.body.append(handle);handle.focus();handle.dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));f.step(200);
 expect(f.world.getPosition()).toEqual(before);expect(f.world.getCameraMode()).toBe('inspection');f.world.setInputEnabled(false);f.world.setDirection(-1,0);f.step(300);expect(f.world.getCameraMode()).toBe('inspection');
});
it.each([0,5])('keeps a %spx primary gesture as a click without entering inspection',pixels=>{
 const f=speechFixture();f.world.update(f.snapshot);f.step(0);temporaryPan(f,pixels);expect(f.world.getCameraMode()).toBe('play');
});

it.each([0,1,2,3])('projects a solid clickable chair surface for actual ray picking at rotation %s',rotation=>{
 const actions=vi.fn(),f=speechFixture(390,844,{onInteract:actions}),state=structuredClone(f.snapshot);
 state.durable.zoneId='room0';state.durable.streamId='bedroom:room0';state.durable.room={id:'room0',ownerId:'p0',revision:1,open:true,palette:'sage',placements:[{id:'chair-id',kind:'chair',x:-5,z:-3,rotation,colour:'sage'}]};
 for(const p of state.players)Object.assign(p,{zoneId:'room0',x:0,z:3});f.world.update(state);f.world.setCameraMode('overview');f.step(0);
 const canvas=f.container.querySelector('canvas')!;Object.defineProperty(canvas,'getBoundingClientRect',{value:()=>({left:0,top:0,width:390,height:844})});
 const point=JSON.parse(canvas.dataset.pickTargets!).find((p:any)=>p.target.id==='chair-id');expect(point?.visible).toBe(true);
 for(const name of ['pointerdown','pointerup'])canvas.dispatchEvent(new window.MouseEvent(name,{clientX:point.x,clientY:point.y,button:0,bubbles:true}));
 for(let t=100;t<=10000;t+=100)f.step(t);expect(actions).toHaveBeenCalledWith({type:'seat',seatId:'chair-id'});
});

it.each(['camera-hud-follow','pause-button'])('accepts intentional walking from the ordinary %s HUD focus without stealing it',id=>{
 const f=speechFixture();f.world.update(f.snapshot);f.step(0);temporaryPan(f);
 const button=document.createElement('button');button.id=id;document.body.append(button);button.focus();const before=f.world.getPosition();
 button.dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true,cancelable:true}));f.step(100);
 expect(f.world.getCameraMode()).toBe('play');expect(f.world.getPosition()).not.toEqual(before);expect(document.activeElement).toBe(button);
});

it('resumes temporary Follow on a walking attempt blocked by both room boundaries',()=>{
 const f=speechFixture(),layout=createLayout(6);Object.assign(f.snapshot.players[0],{x:layout.width/2-AVATAR_RADIUS,z:-layout.depth/2+AVATAR_RADIUS});
 f.world.update(f.snapshot);f.step(0);temporaryPan(f);const before=f.world.getPosition();f.world.setDirection(1,0);f.step(100);
 expect(f.world.getPosition()).toEqual(before);expect(f.world.getCameraMode()).toBe('play');
});

it('keeps one real pointer identity through secondary pointers, cancellation and stale releases',()=>{
 const f=speechFixture();f.world.update(f.snapshot);f.step(0);const canvas=f.container.querySelector('canvas')!;
 const captured=new Set<number>(),release=vi.fn((id:number)=>captured.delete(id));Object.defineProperty(canvas,'setPointerCapture',{value:(id:number)=>captured.add(id)});Object.defineProperty(canvas,'hasPointerCapture',{value:(id:number)=>captured.has(id)});Object.defineProperty(canvas,'releasePointerCapture',{value:release});
 const dispatch=(type:string,id:number,x=120)=>{const event=new window.MouseEvent(type,{clientX:x,clientY:300,button:0,bubbles:true});Object.defineProperty(event,'pointerId',{value:id});canvas.dispatchEvent(event);};
 dispatch('pointerdown',41);dispatch('pointerdown',42);dispatch('pointermove',42,180);dispatch('pointerup',42);dispatch('pointercancel',42);
 expect(f.world.getCameraMode()).toBe('play');expect(captured).toEqual(new Set([41]));dispatch('pointermove',41,127);expect(f.world.getCameraMode()).toBe('inspection');
 dispatch('pointercancel',41);expect(release).toHaveBeenCalledWith(41);expect(captured.size).toBe(0);f.world.recenterCamera();dispatch('pointermove',41,200);dispatch('pointerup',41);expect(f.world.getCameraMode()).toBe('play');
});

function readableLabels(f:ReturnType<typeof speechFixture>){
 const dimensions=new Map<HTMLElement,{w:number,h:number}>();
 for(const el of f.container.querySelectorAll<HTMLElement>('.house-world-label')){
  const size=el.classList.contains('chat-bubble')?{w:184,h:46}:el.classList.contains('house-avatar-name')?{w:108,h:34}:{w:130,h:28};dimensions.set(el,size);
  Object.defineProperty(el,'getBoundingClientRect',{configurable:true,value:()=>({width:size.w,height:size.h})});
 }
 const bodies=()=>avatarRoots().map((root:any)=>{
  root.updateMatrixWorld(true);const rect={x:Infinity,y:Infinity,w:0,h:0},v=new Vector3();let right=-Infinity,bottom=-Infinity;
  root.traverse((mesh:any)=>{if(!mesh.isMesh||!mesh.visible)return;const positions=mesh.geometry.getAttribute('position');for(let i=0;i<positions.count;i++){
   v.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld).project(rendered.camera);const x=(v.x*.5+.5)*f.container.clientWidth,y=(-v.y*.5+.5)*f.container.clientHeight;
   rect.x=Math.min(rect.x,x);rect.y=Math.min(rect.y,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
  }});rect.w=right-rect.x;rect.h=bottom-rect.y;return rect;
 });
 const assertClear=()=>{
  const rectangles=bodies();expect(rectangles.length).toBeGreaterThan(0);let shown=0;
  const published=JSON.parse(f.container.querySelector('canvas')!.dataset.avatarMeshBounds||'[]');expect(published).toHaveLength(rectangles.length);
  rectangles.forEach((rect:{x:number,y:number,w:number,h:number},index:number)=>{expect(published[index].left).toBeCloseTo(rect.x,6);expect(published[index].top).toBeCloseTo(rect.y,6);expect(published[index].right).toBeCloseTo(rect.x+rect.w,6);expect(published[index].bottom).toBeCloseTo(rect.y+rect.h,6);});
  for(const [el,size] of dimensions)if(!el.hidden&&el.style.visibility==='visible'){
   shown++;const r={x:parseFloat(el.style.left)-size.w/2,y:parseFloat(el.style.top)-size.h,...size};
   for(const body of rectangles)expect(r.x<body.x+body.w&&r.x+r.w>body.x&&r.y<body.y+body.h&&r.y+r.h>body.y,el.className+' covers posed actor').toBe(false);
  }
  expect(shown).toBeGreaterThan(0);
  for(const label of f.container.querySelectorAll<HTMLElement>('.house-avatar-name'))expect(label.title).toContain(label.dataset.name);
 };
 return{assertClear};
}
it.each([2,6])('keeps visible names, bubbles and context clear of %s actual moving/seated bodies at every frame',count=>{
 const f=speechFixture(),state=structuredClone(f.snapshot);state.players=state.players.slice(0,count);state.durable.residents=state.durable.residents.slice(0,count);
 const seats=createLayout(6).seats;for(let i=0;i<count;i++)Object.assign(state.players[i],{x:(i%3-1)*.55,z:3+(i>=3?.5:0),availability:'chat'});
 f.world.update(state);const labels=readableLabels(f);f.step(0);labels.assertClear();
 const fresh=structuredClone(state);fresh.durable.sequence=count;fresh.durable.chat=Array.from({length:count},(_,i)=>({id:'body-message'+i,authorId:'p'+i,name:'Friend '+i,text:'A real attributed preview '+i,at:1,sequence:i+1}));
 f.world.update(fresh);f.step(16);labels.assertClear();
 for(let tick=2;tick<=12;tick++){
  const moving=structuredClone(fresh);Object.assign(moving.players[1],{x:.55-tick*.06,z:3.2,heading:tick*.1,animation:'walk'});f.world.update(moving);f.step(tick*16);labels.assertClear();
 }
 const seated=structuredClone(fresh);for(let i=0;i<count;i++)Object.assign(seated.players[i],{x:seats[i].x,z:seats[i].z,heading:seats[i].heading,animation:'sit',seatId:seats[i].id});
 f.world.update(seated);f.step(224);labels.assertClear();
 for(const p of seated.players){delete (p as any).seatId;p.animation='idle';p.heading+=Math.PI/2;}f.world.update(seated);f.step(240);labels.assertClear();
});

it('protects all visible peer bodies in an observer room view whose controller is elsewhere',()=>{
 const f=speechFixture(),state=structuredClone(f.snapshot);state.controller=false;state.durable.zoneId='room1';state.durable.streamId='bedroom:room1';state.durable.room={id:'room1',ownerId:'p1',revision:1,open:true,palette:'sage',placements:[]};state.durable.residents[1].open=true;
 state.players=state.players.slice(0,3);for(const p of state.players.slice(1))Object.assign(p,{zoneId:'room1',x:0,z:3.3});
 f.world.update(state);const labels=readableLabels(f);f.step(0);labels.assertClear();
 const next=structuredClone(state);Object.assign(next.players[1],{x:.4,z:3.2,animation:'walk'});f.world.update(next);f.step(16);labels.assertClear();
 expect(f.container.querySelectorAll('.house-avatar-name')).toHaveLength(2);expect(f.container.querySelector('canvas')!.dataset.selfMeshBounds).toBeUndefined();
});

it('P2 aligns the visible bedroom chair back opposite its authoritative seated facing',()=>{
 const f=speechFixture(),room=structuredClone(f.snapshot);room.durable.zoneId='room0';room.durable.streamId='bedroom:room0';room.durable.room={id:'room0',ownerId:'p0',revision:1,open:true,palette:'sage',light:'standard',placements:[{id:'chair-p2',kind:'chair',x:3,z:-2,rotation:1,colour:'sage'}]};for(const p of room.players)p.zoneId='room0';f.world.update(room);f.step(0);const root=rendered.scene.children.find((o:any)=>o.userData.target?.id==='chair-p2');expect(root.rotation.y).toBeCloseTo(Math.PI*1.5);
});
it('P2 routes to the selected desk and lamp identity rather than the first object of that kind',()=>{
 const onInteract=vi.fn(),f=speechFixture(1920,1080,{onInteract}),room=structuredClone(f.snapshot);room.durable.zoneId='room0';room.durable.streamId='bedroom:room0';room.durable.room={id:'room0',ownerId:'p0',revision:1,open:true,palette:'sage',light:'standard',placements:[{id:'desk-first',kind:'desk',x:-3.5,z:-3.5,rotation:0,colour:'sage'},{id:'desk-second',kind:'desk',x:3.5,z:-3.5,rotation:0,colour:'sage'},{id:'lamp-first',kind:'lamp',x:-5.5,z:-3.5,rotation:0,colour:'sage'},{id:'lamp-second',kind:'lamp',x:5.5,z:-3.5,rotation:0,colour:'sage'}]};for(const p of room.players){p.zoneId='room0';p.x=0;p.z=3;}f.world.update(room);f.step(0);expect(f.world.approach({type:'desk',id:'desk-second'})).toBe(true);for(let time=16;time<6000;time+=16)f.step(time);expect(onInteract).toHaveBeenCalledWith({type:'desk',id:'desk-second'});expect(f.world.approach({type:'lamp',id:'lamp-second'})).toBe(true);for(let time=6000;time<10000;time+=16)f.step(time);expect(onInteract).toHaveBeenLastCalledWith({type:'lamp',id:'lamp-second'});
});
it('P2 preserves legacy standard lighting and renders distinguishable cosy and dim settings',()=>{
 const f=speechFixture(),room=structuredClone(f.snapshot);room.durable.zoneId='room0';room.durable.streamId='bedroom:room0';room.durable.room={id:'room0',ownerId:'p0',revision:1,open:true,palette:'sage',placements:[]};for(const p of room.players)p.zoneId='room0';const lights=()=>rendered.scene.children.filter((o:any)=>o.isLight).map((o:any)=>[o.type,o.intensity,o.color.getHexString()]);f.world.update(room);f.step(0);const legacy=lights();room.durable.room.light='standard';f.world.update(structuredClone(room));f.step(16);expect(lights()).toEqual(legacy);room.durable.room.light='cosy';f.world.update(structuredClone(room));f.step(32);const cosy=lights();expect(cosy).not.toEqual(legacy);room.durable.room.light='dim';f.world.update(structuredClone(room));f.step(48);expect(lights()).not.toEqual(cosy);
});

it.each(['desk','lamp'].flatMap(kind=>[0,1,2,3].map(rotation=>({kind,rotation}))))('P2 projects a solid $kind surface and uses its native raycast at rotation $rotation',({kind,rotation})=>{
 const actions=vi.fn(),f=speechFixture(390,844,{onInteract:actions}),state=structuredClone(f.snapshot);state.durable.zoneId='room0';state.durable.streamId='bedroom:room0';state.durable.room={id:'room0',ownerId:'p0',revision:1,open:true,palette:'sage',placements:[{id:'object-id',kind,x:3.5,z:-3,rotation,colour:'sage'}]};for(const p of state.players)Object.assign(p,{zoneId:'room0',x:0,z:3});f.world.update(state);f.world.setCameraMode('overview');f.step(0);const canvas=f.container.querySelector('canvas')!;Object.defineProperty(canvas,'getBoundingClientRect',{value:()=>({left:0,top:0,width:390,height:844})});const point=JSON.parse(canvas.dataset.pickTargets!).find((p:any)=>p.target.id==='object-id');expect(point?.visible).toBe(true);for(const name of ['pointerdown','pointerup'])canvas.dispatchEvent(new window.MouseEvent(name,{clientX:point.x,clientY:point.y,button:0,bubbles:true}));for(let t=100;t<=10000;t+=100)f.step(t);expect(actions).toHaveBeenCalledWith({type:kind,id:'object-id'});
});


it('renders two collision-aligned sofas with six individually pickable 0.4m cushions',()=>{
 const f=speechFixture();f.world.update(f.snapshot);f.step(0);
 const layout=createLayout(6),sofas:any[]=[];
 rendered.scene.traverse((o:any)=>{if(o.userData.fixtureId?.startsWith('rest-sofa-'))sofas.push(o);});
 expect(sofas).toHaveLength(2);
 for(const sofa of sofas){const bounds=new Box3().setFromObject(sofa),fixture=layout.obstacles.find(o=>o.id===sofa.userData.fixtureId)!;
  expect(bounds.min.x).toBeCloseTo(fixture.x-fixture.w/2,5);expect(bounds.max.x).toBeCloseTo(fixture.x+fixture.w/2,5);
  expect(bounds.min.z).toBeCloseTo(fixture.z-fixture.d/2,5);expect(bounds.max.z).toBeCloseTo(fixture.z+fixture.d/2,5);}
 const pickTargets=JSON.parse(f.container.querySelector('canvas')!.dataset.pickTargets!);
 for(const seat of layout.seats.filter(s=>s.purpose==='rest')){
  expect(pickTargets.filter((p:any)=>p.target.type==='seat'&&p.target.seatId===seat.id)).toHaveLength(1);
  const objects:any[]=[];rendered.scene.traverse((o:any)=>{if(o.isMesh&&o.userData.target?.seatId===seat.id)objects.push(o);});
  expect(objects).toHaveLength(1);expect(new Box3().setFromObject(objects[0]).max.y).toBeCloseTo(.4,5);
 }
 expect(f.container.querySelectorAll('.corner')).toHaveLength(1);expect(f.container.querySelector('.corner')!.textContent).toBe('Rest corner');
});
it('uses bounded colours and translates the study table, props and rug together',()=>{
 const f=speechFixture();f.world.update(f.snapshot);f.step(0);const layout=createLayout(6),table=layout.obstacles.find(o=>o.id==='table')!;
 const fixtures:any[]=[];rendered.scene.traverse((o:any)=>{if(o.userData.fixtureId==='table'||o.userData.fixtureId==='study-rug')fixtures.push(o);if(o.isMesh)expect(o.material.color).toBeDefined();});
 expect(fixtures).toHaveLength(2);for(const fixture of fixtures){expect(fixture.position.x).toBe(table.x);expect(fixture.position.z).toBe(table.z);}
 const light=rendered.scene.children.find((o:any)=>o.isDirectionalLight);expect(light.shadow.mapSize.x).toBe(512);expect(light.shadow.mapSize.y).toBe(512);
 light.shadow.updateMatrices(light);
 for(const x of [-layout.width/2,layout.width/2])for(const y of [0,2.6])for(const z of [-layout.depth/2,layout.depth/2]){
  const q=new Vector3(x,y,z).applyMatrix4(light.shadow.camera.matrixWorldInverse);
  expect(q.x).toBeGreaterThanOrEqual(light.shadow.camera.left);expect(q.x).toBeLessThanOrEqual(light.shadow.camera.right);
  expect(q.y).toBeGreaterThanOrEqual(light.shadow.camera.bottom);expect(q.y).toBeLessThanOrEqual(light.shadow.camera.top);
 }
});
it('routes Places by purpose and keeps game interaction separate from sitting',()=>{
 const interactions:any[]=[];const f=speechFixture(390,844,{onInteract:(v:any)=>interactions.push(v)}),layout=createLayout(6);
 const game=layout.gameTarget!;f.snapshot.players[0].x=game.x;f.snapshot.players[0].z=game.z;
 f.world.update(f.snapshot);f.step(0);expect(f.world.routeTo('game')).toBe(true);for(let t=100;t<=1000;t+=100)f.step(t);
 expect(interactions).toContainEqual({kind:'game'});expect(interactions.some(v=>v.type==='seat')).toBe(false);
 expect(f.world.routeTo('rest')).toBe(true);expect(f.world.routeTo('study')).toBe(true);
 f.snapshot.players[0].seatId='game-seat-1';f.snapshot.players[0].animation='sit';f.world.update(f.snapshot);f.world.interact();
 expect(interactions.at(-1)).toEqual({type:'seat',seatId:'game-seat-1'});
});
it('uses current-layout permanent-slot arrivals when optional poses are absent',()=>{
 const f=speechFixture();delete f.snapshot.players[0].x;delete f.snapshot.players[0].z;
 f.snapshot.durable.residents[0].slot=5;f.snapshot.durable.residents=f.snapshot.durable.residents.slice(0,1);
 f.world.update(f.snapshot);f.step(0);expect(f.world.getPosition()).toEqual(createLayout(6).arrivals![5]);
 const room=structuredClone(f.snapshot);room.durable.zoneId='room0';room.durable.streamId='bedroom:room0';room.durable.room={id:'room0',ownerId:'p0',revision:1,open:true,palette:'sage',placements:[]};
 room.players[0].zoneId='room0';f.world.update(room);f.step(100);expect(f.world.getPosition()).toEqual({x:0,z:3});
});

it('keeps observer and peer optional poses at their own permanent-slot arrivals',()=>{
 const f=speechFixture();f.snapshot.controller=false;
 for(let i=0;i<f.snapshot.players.length;i++){if(i%2){f.snapshot.players[i].x=null;f.snapshot.players[i].z=null;}else{delete f.snapshot.players[i].x;delete f.snapshot.players[i].z;}}
 f.world.update(f.snapshot);f.step(0);const layout=createLayout(6);
 for(let i=0;i<6;i++){const label=f.container.querySelector<HTMLElement>(`.house-avatar-name[data-player-id="p${i}"]`)!;expect(+label.dataset.x!).toBeCloseTo(layout.arrivals![i].x,2);expect(+label.dataset.z!).toBeCloseTo(layout.arrivals![i].z,2);}
 expect(f.world.getPosition()).toEqual(layout.arrivals![0]);
 const room=structuredClone(f.snapshot);room.durable.zoneId='room0';room.durable.streamId='bedroom:room0';room.durable.room={id:'room0',ownerId:'p0',revision:1,open:true,palette:'sage',placements:[]};room.players.forEach((p:any)=>p.zoneId='room0');
 f.world.update(room);f.step(100);for(const label of f.container.querySelectorAll<HTMLElement>('.house-avatar-name')){expect(+label.dataset.x!).toBe(0);expect(+label.dataset.z!).toBe(3);}
});
it('matches actual rendered study and game chair footprints at every supported capacity',()=>{
 const f=speechFixture();
 for(let capacity=2;capacity<=6;capacity++){const snapshot=structuredClone(f.snapshot);snapshot.durable.house.capacity=capacity;snapshot.players=snapshot.players.slice(0,capacity);snapshot.durable.residents=snapshot.durable.residents.slice(0,capacity);f.world.update(snapshot);f.step(capacity*100);
 const layout=createLayout(capacity);
 for(const seat of layout.seats.filter(s=>s.purpose!=='rest')){const chair=rendered.scene.children.find((o:any)=>o.userData.target?.seatId===seat.id),bounds=new Box3().setFromObject(chair),obstacle=layout.obstacles.find(o=>o.id===seat.id)!;
 for(const [actual,limit,direction] of [[bounds.min.x,obstacle.x-obstacle.w/2,1],[bounds.max.x,obstacle.x+obstacle.w/2,-1],[bounds.min.z,obstacle.z-obstacle.d/2,1],[bounds.max.z,obstacle.z+obstacle.d/2,-1]]){expect((actual-limit)*direction).toBeGreaterThanOrEqual(-1e-6);expect(Math.abs(actual-limit)).toBeLessThan(.16);}}}
});

it('raycasts every sofa cushion at its published projected native pick point',()=>{
 const f=speechFixture(1920,1080);f.world.update(f.snapshot);f.step(0);f.world.setCameraMode('overview');f.step(1000);
 const canvas=f.container.querySelector('canvas')!,targets=JSON.parse(canvas.dataset.pickTargets!);
 for(const seat of createLayout(6).seats.filter(s=>s.purpose==='rest')){const target=targets.find((t:any)=>t.target.seatId===seat.id),ray=new Raycaster();
 ray.setFromCamera({x:target.x/1920*2-1,y:1-target.y/1080*2} as any,rendered.camera);
 const hit=ray.intersectObjects(rendered.scene.children,true).find((h:any)=>h.object.userData.target)?.object.userData.target;
 expect(hit,seat.id).toEqual({type:'seat',seatId:seat.id});}
});

it('reports manual movement intent while picture controls and routes remain isolated',()=>{const movement=vi.fn(),f=speechFixture(390,844,{onMovementIntent:movement});f.world.update(f.snapshot);f.step(0);expect(f.world.routeTo('room')).toBe(true);f.step(100);expect(movement).not.toHaveBeenCalled();const panel=document.createElement('section');panel.id='panel';const piece=document.createElement('button');piece.dataset.puzzlePiece='notebook';panel.append(piece);document.body.append(panel);piece.focus();piece.dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));f.step(200);expect(movement).not.toHaveBeenCalled();const canvas=f.container.querySelector('canvas')!;canvas.focus();canvas.dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));expect(movement).toHaveBeenCalledOnce();canvas.dispatchEvent(new window.KeyboardEvent('keyup',{key:'ArrowRight',bubbles:true}));f.world.setDirection(1,0);expect(movement).toHaveBeenCalledTimes(2);});
