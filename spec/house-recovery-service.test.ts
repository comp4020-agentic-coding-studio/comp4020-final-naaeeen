import { JSDOM } from 'jsdom';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { io } from 'socket.io-client';
import { afterEach, expect, it, vi } from 'vitest';
import { HOUSE_WORLD_VERSION } from '../public/house-version.js';
import { createService } from '../src/server.ts';
import { createHouseClient, createPendingInspector, createCommandOutbox } from '../public/house-client.js';
import { createHouseGameUI } from '../public/house-game-ui.js';
import { createHousePuzzleUI } from '../public/house-puzzle-ui.js';
import { createHouseStudioUI } from '../public/house-studio-ui.js';
import { createHouseStudioPreview } from '../public/house-studio-preview.js';
import { createHouseGatheringUI } from '../public/house-gathering-ui.js';
import { createMovableWindow, createModalFocus } from '../public/house-shell.js';
import { ROOM_PRESETS, getRoomPreset } from '../public/house-room-content.js';
import { createLayout, validatePlacements, footprint, findRoute } from '../public/house-geometry.js';
import type { LiveSnapshot, HouseCommand } from '../src/house-contract.ts';
const cleanup:(()=>unknown|Promise<unknown>)[]=[];
afterEach(async()=>{for(const fn of cleanup.splice(0).reverse())await fn();vi.restoreAllMocks();vi.unstubAllGlobals();});
async function fixture(){
 const folder=mkdtempSync(join(tmpdir(),'recovery-service-'));cleanup.push(()=>rmSync(folder,{recursive:true,force:true}));const app=createService({dataDir:folder,secureCookies:false,activityLog:()=>{}});cleanup.push(()=>app.close());const owner=app.houseStore.ensureSession();app.houseStore.execute(owner.id,{commandId:randomUUID(),type:'house.create',payload:{capacity:2,name:'Robin',colour:'sage'}});const house=app.houseStore.me(owner.id).home!,room=app.houseStore.snapshot(owner.id).residents[0]!.bedroomId;
 await new Promise<void>(resolve=>app.server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+(app.server.address() as {port:number}).port;
 const dom=new JSDOM(readFileSync(new URL('../public/house.html',import.meta.url),'utf8'),{url:base});cleanup.push(()=>{dom.window.dispatchEvent(new dom.window.Event('pagehide'));dom.window.close();});vi.stubGlobal('window',dom.window);vi.stubGlobal('document',dom.window.document);vi.stubGlobal('navigator',dom.window.navigator);
 const values=new Map<string,string>(),storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}};vi.stubGlobal('sessionStorage',storage);const nativeFetch=globalThis.fetch;vi.stubGlobal('fetch',(path:string,options:any={})=>nativeFetch(new URL(path,base),{...options,headers:{Cookie:'house_session='+owner.token,Origin:base,...options.headers}}));
 let latest:LiveSnapshot|null=null,worldOptions:any,client:any;const gate:{zone:string|null,response:any,release:(()=>void)|null}={zone:null,response:null,release:null};const commands:any[]=[],routeTo=vi.fn(()=>true),approach=vi.fn(()=>true),states:LiveSnapshot[]=[];
 vi.stubGlobal('io',(options:any)=>{const socket=io(base,{...options,reconnection:false,extraHeaders:{Origin:base,Cookie:'house_session='+owner.token}});const emit=socket.emitWithAck.bind(socket);socket.emitWithAck=(async(event:string,...args:any[])=>{if(event==='house.command')commands.push(structuredClone(args[0].command));const response=await emit(event,...args);if(event==='house.subscribe'&&args[0].zoneId===gate.zone){gate.response=response;await new Promise<void>(resolve=>{gate.release=resolve;});gate.zone=null;}return response;}) as any;return socket;});
 const factory=(options:any)=>{client=createHouseClient({...options,storage,fetchMe:async()=>app.houseStore.me(owner.id),onSnapshot:(state:any)=>{latest=state;if(state)states.push(state);options.onSnapshot(state);}});return client;};
 const world=(_element:any,options:any)=>{worldOptions=options;return {update(){},setInputEnabled(){},setSuspended(){},setEditing(){},setRoomPreview(){},setStudioPreview(){},setLabelSafeArea(){},getCameraMode:()=> 'play',getCameraZoom:()=>1,dispose(){},routeTo,approach};};

 const source=readFileSync(new URL('../public/house-ui.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'');
 new Function('createHouseClient','createPendingInspector','createHouseWorld','createHouseGameUI','createHousePuzzleUI','createHouseStudioUI','createHouseStudioPreview','createHouseGatheringUI','createMovableWindow','createModalFocus','ROOM_PRESETS','getRoomPreset','createLayout','validatePlacements','footprint',source)(factory,createPendingInspector,world,createHouseGameUI,createHousePuzzleUI,createHouseStudioUI,createHouseStudioPreview,createHouseGatheringUI,createMovableWindow,createModalFocus,ROOM_PRESETS,getRoomPreset,createLayout,validatePlacements,footprint);
 const el=(id:string)=>dom.window.document.getElementById(id)!;await vi.waitFor(()=>expect(el('title-continue').hidden).toBe(false));el('title-continue').click();await vi.waitFor(()=>expect(latest?.controller).toBe(true));
 async function pending(command:HouseCommand,zone:string){createCommandOutbox(storage).add(command,owner.id,zone);el('pause-button').click();dom.window.document.querySelector<HTMLButtonElement>('#game-settings [data-panel="pending"]')!.click();await vi.waitFor(()=>expect(el('pending-entries').querySelector('[data-action="return-original"]')).toBeTruthy());el('pending-entries').querySelector<HTMLButtonElement>('[data-action="return-original"]')!.click();await vi.waitFor(()=>expect(createCommandOutbox(storage).all()[0].recoveryHeld).toBe(true));}
 async function takeover(zone:string){const socket=io(base,{auth:{worldVersion:HOUSE_WORLD_VERSION},transports:['websocket'],reconnection:false,extraHeaders:{Origin:base,Cookie:'house_session='+owner.token}});cleanup.push(()=>socket.disconnect());await new Promise<void>((resolve,reject)=>{socket.once('connect',resolve);socket.once('connect_error',reject);});const token=randomUUID();expect(await socket.timeout(2000).emitWithAck('house.subscribe',{zoneId:zone,controllerToken:token})).toMatchObject({ok:true});expect(await socket.timeout(2000).emitWithAck('house.takeover',{controllerToken:token})).toMatchObject({ok:true});}
 return {app,owner,house,room,dom,el,storage,gate,takeover,client:()=>client,state:()=>latest!,states,commands,routeTo,approach,interact:(target:any)=>worldOptions.onInteract(target),pending};
}
it('real service adopts only the intended bedroom subscription ACK generation and reopens the held original',async()=>{
 const f=await fixture(),departure=f.state();const original:HouseCommand={commandId:randomUUID(),houseId:f.house.id,type:'chat.send',payload:{zoneId:f.room,text:'Original bedroom draft'}};await f.pending(original,f.room);expect(f.approach).toHaveBeenCalledWith({type:'door',slot:0,roomId:f.room});await f.interact({type:'door',slot:0,roomId:f.room});expect(f.state().generation).toBeGreaterThan(departure.generation);await vi.waitFor(()=>expect(f.el('panel').hidden).toBe(false));expect(f.el('panel').dataset.tool).toBe('pending');expect(f.commands).toEqual([]);expect(createCommandOutbox(f.storage).all()[0].command).toEqual(original);
});
it('real service returns bedroom to lounge, confirms a physical chair ACK, then retries the same held UUID once',async()=>{
 const f=await fixture();await f.interact({type:'door',slot:0,roomId:f.room});const bedroom=f.state(),original:HouseCommand={commandId:randomUUID(),houseId:f.house.id,type:'game.join',expectedRevision:0,payload:{roundId:null}};await f.pending(original,'lounge');expect(f.approach).toHaveBeenCalledWith({type:'exit'});await f.interact({type:'exit'});expect(f.state().generation).toBeGreaterThan(bedroom.generation);await vi.waitFor(()=>expect(f.routeTo).toHaveBeenCalledWith('game'));expect(f.commands).toEqual([]);
 let now=Date.now();vi.spyOn(Date,'now').mockImplementation(()=>now);const layout=createLayout(2),seat=layout.seats.find(value=>value.id==='game-seat-1')!,self=f.state().players.find(value=>value.id===f.owner.id)!,route=findRoute(layout,{x:self.x!,z:self.z!},seat.target);expect(route).not.toBeNull();for(const point of route!.slice(1)){now+=100;expect(await f.client().move({...point,heading:0})).toMatchObject({ok:true});}
 await f.interact({type:'seat',seatId:seat.id});await vi.waitFor(()=>expect(f.state().players.find(value=>value.id===f.owner.id)?.seatId).toBe(seat.id));await vi.waitFor(()=>expect(f.el('panel').hidden).toBe(false));expect(f.el('panel').dataset.tool).toBe('pending');expect(f.commands).toEqual([]);f.el('pending-entries').querySelector<HTMLButtonElement>('[data-action="retry"]')!.click();await vi.waitFor(()=>expect(f.commands).toEqual([original]));await vi.waitFor(()=>expect(createCommandOutbox(f.storage).all()).toHaveLength(0));
});

it('real service rejects a delayed intended arrival ACK after an unrelated control takeover',async()=>{
 const f=await fixture(),original:HouseCommand={commandId:randomUUID(),houseId:f.house.id,type:'chat.send',payload:{zoneId:f.room,text:'Held before takeover'}};await f.pending(original,f.room);f.gate.zone=f.room;const arriving=f.interact({type:'door',slot:0,roomId:f.room});await vi.waitFor(()=>expect(f.gate.response?.snapshot.durable.zoneId).toBe(f.room));expect(f.el('panel').hidden).toBe(true);await f.takeover(f.room);await vi.waitFor(()=>expect(f.state()?.controller).toBe(false));f.gate.release!();await arriving;expect(f.el('panel').hidden).toBe(true);expect(f.commands).toEqual([]);expect(createCommandOutbox(f.storage).all()[0]).toMatchObject({command:original,recoveryHeld:true});
});
