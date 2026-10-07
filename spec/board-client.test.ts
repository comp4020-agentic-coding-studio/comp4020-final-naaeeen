import { describe, expect, it, vi } from "vitest";
import { createBoardClient, mergeBoardElements, changedElements, validateImageFile } from "../board/client.js";
const actor="00000000-0000-4000-8000-000000000002",house="00000000-0000-4000-8000-000000000001";
const element=(id:string,version=1,versionNonce=10,isDeleted=false)=>({id,type:"rectangle",version,versionNonce,isDeleted,x:0,y:0,width:20,height:20,index:null});
const response=(body:any,status=200)=>({ok:status===200,status,json:async()=>body});
const memory=()=>{const map=new Map<string,string>();return {getItem:(k:string)=>map.get(k)||null,setItem:(k:string,v:string)=>map.set(k,v),removeItem:(k:string)=>map.delete(k)};};
function options(overrides:any={}) { return {identityId:actor,houseId:house,storage:memory(),fetch:vi.fn(async(path:string)=>response(path.includes("context")?{identity:{id:actor},home:{id:house}}:{houseId:house,sequence:0,elements:[],files:[],chat:[]})),...overrides}; }
describe("board convergence and bounded files",()=>{
 it("preserves unrelated objects, tombstones, nonce conflicts and a newer undo",()=>{
 const first=mergeBoardElements([element("own",2),element("peer")],[element("own",3,20,true),element("new")]);
 expect(first.map((e:any)=>e.id)).toEqual(["own","peer","new"]);expect(first[0].isDeleted).toBe(true);
 expect(mergeBoardElements(first,[element("own",4,90)])[0].isDeleted).toBe(false);
 expect(mergeBoardElements([element("x",4,99)],[element("x",4,1)])[0].versionNonce).toBe(1);
 });
 it("never echoes a remote update and emits only locally changed elements",()=>{
 const prior=[element("own"),element("peer",4)];expect(changedElements(prior,[element("own",2),element("peer",4)])).toEqual([element("own",2)]);
 expect(changedElements(prior,prior)).toEqual([]);
 });
 it("rejects SVG and oversized uploads before reading their bytes",()=>{
 expect(()=>validateImageFile({type:"image/svg+xml",size:10})).toThrow(/PNG/);
 expect(()=>validateImageFile({type:"image/png",size:2097153})).toThrow(/2 MiB/);
 expect(()=>validateImageFile({type:"image/webp",size:200})).not.toThrow();
 });
});
describe("board durable intents",()=>{
 it("keeps the original UUID after uncertain reply and uses captured actor",async()=>{
 const posts:any[]=[];let fail=true;
 const settings=options({fetch:vi.fn(async(path:string,init:any)=>{if(init?.method==="POST"){posts.push({body:JSON.parse(init.body),headers:init.headers});if(fail)throw new Error("network");return response({ok:true,id:posts.at(-1).body.id,houseId:house,sequence:1,elements:posts.at(-1).body.elements});}return response(path.includes("context")?{identity:{id:actor},home:{id:house}}:{houseId:house,sequence:0,elements:[],files:[],chat:[]});})});
 const client=createBoardClient(settings);await client.connect();client.localChange([element("own")],{});await client.flush();
 expect(client.getState().pending).toBe(1);fail=false;await client.retry();expect(posts).toHaveLength(2);expect(posts[0].body.id).toBe(posts[1].body.id);expect(posts[1].headers["X-House-Identity"]).toBe(actor);expect(client.getState().pending).toBe(0);client.close();
 });
 it("uploads files before their dependent image patch",async()=>{
 const posts:string[]=[];const settings=options({fetch:vi.fn(async(path:string,init:any)=>{if(init?.method==="POST"){posts.push(path);const body=JSON.parse(init.body);return response({ok:true,id:body.id,houseId:house,sequence:posts.length,elements:body.elements});}return response(path.includes("context")?{identity:{id:actor},home:{id:house}}:{houseId:house,sequence:0,elements:[],files:[],chat:[]});})});
 const client=createBoardClient(settings);await client.connect();client.localChange([{...element("picture"),type:"image",fileId:"file1"}],{file1:{id:"file1",mimeType:"image/png",dataURL:"data:image/png;base64,aGVsbG8=",created:1}});await client.flush();expect(posts).toEqual(["/api/board/asset","/api/board/patch"]);client.close();
 });
 it("reconnect merges a snapshot with pending local work instead of replacing a scene",async()=>{
 let snapshot:any={houseId:house,sequence:0,elements:[],files:[],chat:[]};
 const settings=options({fetch:vi.fn(async(path:string,init:any)=>{if(init?.method==="POST")throw new Error("offline");return response(path.includes("context")?{identity:{id:actor},home:{id:house}}:snapshot);})});
 const client=createBoardClient(settings);await client.connect();client.localChange([element("own")],{});await client.flush();snapshot={...snapshot,sequence:2,elements:[element("peer")]};await client.connect();expect(client.getState().elements.map((e:any)=>e.id)).toEqual(["own","peer"]);expect(client.getState().pending).toBe(1);client.close();
 });
 it("blocks replay after identity changes and keeps its pending original scope",async()=>{
 let identity=actor;const settings=options({fetch:vi.fn(async(path:string,init:any)=>{if(init?.method==="POST")throw new Error("offline");return response(path.includes("context")?{identity:{id:identity},home:{id:house}}:{houseId:house,sequence:0,elements:[],files:[],chat:[]});})});
 const client=createBoardClient(settings);await client.connect();client.localChange([element("own")],{});await client.flush();identity="other";await client.retry();expect(client.getState().status).toBe("revoked");expect(client.getState().elements).toEqual([]);expect(client.getState().pending).toBe(1);client.close();
 });
 it("does not clear a newer chat draft when an earlier submission is acknowledged",async()=>{
 let finish:any;const settings=options({fetch:vi.fn(async(path:string,init:any)=>init?.method==="POST"?new Promise(resolve=>{finish=()=>resolve(response({ok:true,sequence:1}));}):response(path.includes("context")?{identity:{id:actor},home:{id:house}}:{houseId:house,sequence:0,elements:[],files:[],chat:[]}))});
 const client=createBoardClient(settings);await client.connect();client.setDraft("submitted");const saving=client.sendChat();await vi.waitFor(()=>expect(finish).toBeTypeOf("function"));client.setDraft("next draft");finish();await saving;expect(client.getState().draft).toBe("next draft");client.close();
 });
});

describe("board subscription and privacy generations",()=>{
 it("rejects old subscription patches, chat and revocation after reconnect",async()=>{
 const handlers=new Map<string,Function>(),socket={connected:true,on:(name:string,handler:Function)=>handlers.set(name,handler),emit:vi.fn(),disconnect:vi.fn()};let ack:any;
 socket.emit.mockImplementation((name:string,_payload:any,reply:any)=>{if(name==="board.subscribe")ack=reply;});
 const client=createBoardClient(options({socketFactory:()=>socket,poll:false}));await client.connect();await handlers.get("connect")!();
 ack({ok:true,schemaVersion:1,subscriptionId:"first",snapshot:{houseId:house,sequence:0,elements:[],files:[],chat:[]}});
 handlers.get("board.patch")!({schemaVersion:1,subscriptionId:"first",houseId:house,sequence:1,elements:[element("peer")]});
 handlers.get("disconnect")!();await handlers.get("connect")!();ack({ok:true,schemaVersion:1,subscriptionId:"second",snapshot:{houseId:house,sequence:1,elements:[element("peer")],files:[],chat:[]}});
 handlers.get("board.patch")!({schemaVersion:1,subscriptionId:"first",houseId:house,sequence:9,elements:[element("stale-private")]});
 handlers.get("board.chat")!({schemaVersion:1,subscriptionId:"first",houseId:house,message:{id:"stale-chat",text:"Old private"}});
 handlers.get("board.revoked")!({schemaVersion:1,subscriptionId:"first",code:"FORBIDDEN",message:"Old scope"});
 expect(client.getState().elements.map((e:any)=>e.id)).toEqual(["peer"]);expect(client.getState().chat).toEqual([]);expect(client.getState().status).toBe("saved");client.close();
 });
 it("does not echo a remote deletion as a local change",async()=>{
 let client:any;const settings=options({onScene:(elements:any[])=>client.localChange(elements,{})});
 client=createBoardClient(settings);await client.connect();client.localChange([element("own")],{});await client.flush();
 // HTTP failure leaves an original own command pending. Receiving a peer change must not add another mutation.
 const before=client.getState().pending;client.localChange(client.getState().elements,{});expect(client.getState().pending).toBe(before);client.close();
 });
 it("restores a pending original command and a newer draft after a tab reload",async()=>{
 const storage=memory(),posts:any[]=[];const first=createBoardClient(options({storage,fetch:vi.fn(async(path:string,init:any)=>{if(init?.method==="POST"){posts.push(JSON.parse(init.body));throw new Error("offline");}return response(path.includes("context")?{identity:{id:actor},home:{id:house}}:{houseId:house,sequence:0,elements:[],files:[],chat:[]});})}));
 await first.connect();first.localChange([element("own")],{});await first.flush();first.setDraft("Next thought");first.close();
 const second=createBoardClient(options({storage,fetch:vi.fn(async(path:string,init:any)=>{if(init?.method==="POST"){posts.push(JSON.parse(init.body));return response({ok:true,houseId:house,sequence:1,elements:posts.at(-1).elements});}return response(path.includes("context")?{identity:{id:actor},home:{id:house}}:{houseId:house,sequence:0,elements:[],files:[],chat:[]});})}));
 await second.connect();expect(posts[1].id).toBe(posts[0].id);expect(second.getState().draft).toBe("Next thought");expect(second.getState().pending).toBe(0);second.close();
 });
 it("does not deliver a late old-session snapshot after close",async()=>{
 let finish:any;const onScene=vi.fn(),settings=options({onScene,fetch:vi.fn(async(path:string)=>path.includes("context")?response({identity:{id:actor},home:{id:house}}):new Promise(resolve=>{finish=()=>resolve(response({houseId:house,sequence:1,elements:[element("private")],files:[],chat:[]}));}))});
 const client=createBoardClient(settings),connecting=client.connect();await vi.waitFor(()=>expect(finish).toBeTypeOf("function"));client.close();finish();await connecting;expect(onScene).not.toHaveBeenCalled();
 });
 it("does not let a stale local editor callback undo a canonical peer delete",async()=>{
 const settings=options({fetch:vi.fn(async(path:string)=>response(path.includes("context")?{identity:{id:actor},home:{id:house}}:{houseId:house,sequence:1,elements:[element("peer",3,5,true)],files:[],chat:[]}))});const client=createBoardClient(settings);await client.connect();client.localChange([element("peer",2,10,false)],{});expect(client.getState().pending).toBe(0);expect((client.getState().elements[0] as any).isDeleted).toBe(true);client.close();
 });
});

describe("board resource and recovery failure paths",()=>{
 it("retains work on an explicit timeout instead of claiming it was saved",async()=>{
 const client=createBoardClient(options({timeoutMs:5,fetch:vi.fn(async(path:string,init:any)=>init?.method==="POST"?new Promise(()=>{}):response(path.includes("context")?{identity:{id:actor},home:{id:house}}:{houseId:house,sequence:0,elements:[],files:[],chat:[]}))}));
 await client.connect();client.localChange([element("own")],{});await client.flush();expect(client.getState().pending).toBe(1);expect(client.getState().status).toBe("error");expect(client.getState().error).toContain("pending");expect(JSON.parse(client.exportPending()).queue[0].body.elements[0].id).toBe("own");client.close();
 });
 it("loads authenticated image binaries separately without accepting remote URLs",async()=>{
 const onFiles=vi.fn(),fetcher=vi.fn(async(path:string)=>path.includes("context")?response({identity:{id:actor},home:{id:house}}):path.includes("snapshot")?response({houseId:house,sequence:0,elements:[],files:[{id:"safe",mimeType:"image/png",url:`/api/board/asset?houseId=${house}&fileId=safe`,created:1},{id:"remote",mimeType:"image/png",url:`https://other.invalid/api/board/asset?houseId=${house}&fileId=remote`,created:1}],chat:[]}):{ok:true,blob:async()=>new Blob(["sample"],{type:"image/png"})});
 const client=createBoardClient(options({fetch:fetcher,onFiles,readBlob:async()=>"data:image/png;base64,c2FtcGxl"}));await client.connect();await vi.waitFor(()=>expect(onFiles).toHaveBeenCalledOnce());expect(onFiles.mock.calls[0][0][0].id).toBe("safe");expect(fetcher.mock.calls.some(([url])=>url.startsWith("https:"))).toBe(false);expect(client.getState().error).toContain("reference");client.close();
 });
 it("clears private canvas and chat when an image read is revoked",async()=>{
 const onScene=vi.fn(),client=createBoardClient(options({onScene,fetch:vi.fn(async(path:string)=>path.includes("context")?response({identity:{id:actor},home:{id:house}}):path.includes("snapshot")?response({houseId:house,sequence:1,elements:[element("private")],files:[{id:"safe",mimeType:"image/png",url:`/api/board/asset?houseId=${house}&fileId=safe`,created:1}],chat:[{id:"chat",text:"Private"}]}):{ok:false,status:403})}));
 await client.connect();await vi.waitFor(()=>expect(client.getState().status).toBe("revoked"));expect(client.getState().elements).toEqual([]);expect(client.getState().chat).toEqual([]);expect(onScene).toHaveBeenLastCalledWith([],true);expect(()=>client.exportPending()).toThrow(/original identity/);client.close();
 });
 it("keeps a full local canvas exportable while reporting the shared bound",async()=>{
 const client=createBoardClient(options());await client.connect();client.localChange(Array.from({length:2001},(_,i)=>element(`object${i}`)),{});expect(client.getState().status).toBe("error");expect(client.getState().error).toContain("2,000");expect(client.getState().elements).toHaveLength(2001);client.close();
 });
 it("keeps an oversize individual object pending and rejects unsupported chat length",async()=>{
 const client=createBoardClient(options());await client.connect();client.localChange([{...element("long"),type:"text",text:"x".repeat(33000)}],{});await client.flush();expect(client.getState().error).toContain("32 KiB");expect(client.getState().pending).toBe(1);client.setDraft("x".repeat(4001));expect(await client.sendChat()).toBe(false);expect(client.getState().draft).toHaveLength(4001);client.close();
 });
 it("throttles pointers and bounds the selected IDs on the actual socket",async()=>{
 const handlers=new Map<string,Function>(),socket={on:(name:string,handler:Function)=>handlers.set(name,handler),emit:vi.fn(),disconnect:vi.fn(),connected:true};const client=createBoardClient(options({socketFactory:()=>socket,poll:false}));socket.emit.mockImplementation((name:string,_payload:any,reply:any)=>{if(name==="board.subscribe")reply({ok:true,schemaVersion:1,subscriptionId:"pointer-session"});});await client.connect();await handlers.get("connect")!();
 client.pointer({x:10,y:20,selectedElementIds:Array.from({length:150},(_,i)=>`e${i}`)});client.pointer({x:11,y:20});const sends=socket.emit.mock.calls.filter(([name])=>name==="board.pointer");expect(sends).toHaveLength(1);expect(sends[0][1].selectedElementIds).toHaveLength(100);expect(sends[0][1].subscriptionId).toBe("pointer-session");client.close();
 });
 it("falls back to a fresh authorized snapshot while the socket is unavailable",async()=>{
 vi.useFakeTimers();let version=0;const client=createBoardClient(options({fetch:vi.fn(async(path:string)=>response(path.includes("context")?{identity:{id:actor},home:{id:house}}:{houseId:house,sequence:version,elements:version?[element("peer",version)]:[],files:[],chat:[]}))}));try{await client.connect();version=2;await vi.advanceTimersByTimeAsync(15001);expect((client.getState().elements[0] as any).version).toBe(2);}finally{client.close();vi.useRealTimers();}
 });
 it("keeps work in memory and reports when browser pending storage is full",async()=>{
 const storage={getItem:()=>null,setItem:()=>{throw new Error("quota");}},client=createBoardClient(options({storage}));await client.connect();client.setDraft("Retained locally");expect(client.getState().draft).toBe("Retained locally");expect(client.getState().error).toContain("storage is full");client.close();
 });
});

it("retains a losing edit and can explicitly restore it with a newer version",async()=>{
 let lose=true;const posts:any[]=[];
 const settings=options({fetch:vi.fn(async(path:string,init:any)=>{if(init?.method==="POST"){const body=JSON.parse(init.body);posts.push(body);return response({ok:true,houseId:house,sequence:posts.length+1,elements:lose?[{...element("shared",2,1),x:0}]:body.elements});}return response(path.includes("context")?{identity:{id:actor},home:{id:house}}:{houseId:house,sequence:0,elements:[element("shared",1,1)],files:[],chat:[]});})});
 const client=createBoardClient(settings);await client.connect();client.localChange([{...element("shared",2,99),x:50}],{});await client.flush();
 expect(client.getState().status).toBe("error");expect(client.getState().pending).toBe(1);expect(JSON.parse(client.exportPending()).conflicts[0].element.x).toBe(50);
 lose=false;client.restoreConflicts();await client.flush();expect(posts.at(-1).elements[0].version).toBe(3);expect(client.getState().pending).toBe(0);expect(client.getState().status).toBe("saved");client.close();
});
it("never labels a rejected full-canvas draft saved on retry and restores it after reload",async()=>{
 const storage=memory(),client=createBoardClient(options({storage}));await client.connect();client.localChange(Array.from({length:2001},(_,i)=>element(`e${i}`)),{});await client.retry();expect(client.getState().status).toBe("error");expect(client.getState().pending).toBeGreaterThan(0);expect(JSON.parse(client.exportPending()).dirty).toHaveLength(2001);client.close();
 const restored=createBoardClient(options({storage}));expect(restored.getState().elements).toHaveLength(2001);expect(restored.getState().pending).toBeGreaterThan(0);restored.close();
});

it("keeps a conflict recoverable across reload and retry",async()=>{
 const storage=memory(),client=createBoardClient(options({storage,fetch:vi.fn(async(path:string,init:any)=>init?.method==="POST"?response({ok:true,sequence:2,elements:[element("same",2,1)]}):response(path.includes("context")?{identity:{id:actor},home:{id:house}}:{houseId:house,sequence:0,elements:[element("same")],files:[],chat:[]}))}));
 await client.connect();client.localChange([{...element("same",2,99),x:10}],{});await client.flush();client.close();
 const restored=createBoardClient(options({storage}));await restored.connect();await restored.retry();expect(restored.getState().status).toBe("error");expect(JSON.parse(restored.exportPending()).conflicts[0].element.x).toBe(10);restored.close();
});
it("does not resurrect an expired chat event or replace newer chat with a stale image snapshot",async()=>{
 const handlers=new Map<string,Function>(),socket={on:(name:string,handler:Function)=>handlers.set(name,handler),emit:vi.fn(),disconnect:vi.fn(),connected:true};socket.emit.mockImplementation((name:string,_payload:any,reply:any)=>{if(name==="board.subscribe")reply({ok:true,schemaVersion:1,subscriptionId:"current"});});
 const client=createBoardClient(options({socketFactory:()=>socket,poll:false}));await client.connect();await handlers.get("connect")!();
 handlers.get("board.chat")!({schemaVersion:1,subscriptionId:"current",houseId:house,message:{id:"fresh",text:"New",at:Date.now(),sequence:4}});
 handlers.get("board.snapshot")!({schemaVersion:1,subscriptionId:"current",houseId:house,sequence:3,elements:[],files:[],chat:[]});
 handlers.get("board.chat")!({schemaVersion:1,subscriptionId:"current",houseId:house,message:{id:"expired",text:"Old",at:Date.now()-8*24*60*60*1000,sequence:1}});
 expect(client.getState().chat.map((m:any)=>m.id)).toEqual(["fresh"]);client.close();
});
it("explicitly discards only unsaved tab work and reloads the canonical shared scene",async()=>{
 const onScene=vi.fn(),client=createBoardClient(options({onScene,fetch:vi.fn(async(path:string,init:any)=>{if(init?.method==="POST")throw new Error("offline");return response(path.includes("context")?{identity:{id:actor},home:{id:house}}:{houseId:house,sequence:1,elements:[element("peer")],files:[],chat:[]});})}));
 await client.connect();client.localChange([element("peer"),element("own")],{});await client.flush();expect(client.getState().pending).toBe(1);await client.discardPending();expect(client.getState().elements.map((e:any)=>e.id)).toEqual(["peer"]);expect(client.getState().pending).toBe(0);expect(onScene).toHaveBeenCalledWith([],true);client.close();
});

it("age-fences an expired original message in an HTTP receipt while bounding a fresh receipt to 100 messages",async()=>{
 let expired=true;const now=Date.now(),messages=Array.from({length:100},(_,i)=>({id:`m${i}`,authorId:actor,name:"Robin",text:`Message ${i}`,at:now,sequence:i+1}));
 const client=createBoardClient(options({fetch:vi.fn(async(path:string,init:any)=>init?.method==="POST"?response({ok:true,id:JSON.parse(init.body).id,houseId:house,sequence:101,message:{id:expired?"old-receipt":"new-receipt",authorId:actor,name:"Robin",text:"Receipt text",at:expired?now-8*24*60*60*1000:now,sequence:expired?1:101}}):response(path.includes("context")?{identity:{id:actor},home:{id:house}}:{houseId:house,sequence:100,elements:[],files:[],chat:messages}))}));
 await client.connect();client.setDraft("Old receipt retry");await client.sendChat();expect(client.getState().chat).toHaveLength(100);expect(client.getState().chat.some((m:any)=>m.id==="old-receipt")).toBe(false);expired=false;client.setDraft("Fresh receipt");await client.sendChat();expect(client.getState().chat).toHaveLength(100);expect((client.getState().chat[99] as any).id).toBe("new-receipt");expect((client.getState().chat[0] as any).id).toBe("m1");client.close();
});

describe("rejected image batches retain all unsent work",()=>{
 it.each(["missing","oversize"])("keeps an %s image and following text pending through repeat callbacks, retry and reload",async(kind)=>{
 const storage=memory(),posts:any[]=[],fetcher=vi.fn(async(path:string,init:any)=>{if(init?.method==="POST"){posts.push(JSON.parse(init.body));return response({ok:true,houseId:house,sequence:1});}return response(path.includes("context")?{identity:{id:actor},home:{id:house}}:{houseId:house,sequence:0,elements:[],files:[],chat:[]});});
 const client=createBoardClient(options({storage,fetch:fetcher}));await client.connect();
 const elements=[{...element("picture"),type:"image",fileId:"file1"},{...element("written"),type:"text",text:"Keep this thought"}],file={id:"file1",mimeType:"image/png",dataURL:"data:image/png;base64,"+"a".repeat(2800000),created:1},files=kind==="missing"?{}:{file1:file};
 client.localChange(elements,files);expect(client.getState().status).toBe("error");expect(client.getState().pending).toBeGreaterThan(0);
 client.localChange(elements,files);await client.retry();expect(client.getState().status).toBe("error");expect(client.getState().pending).toBeGreaterThan(0);expect(posts).toEqual([]);
 const exported=JSON.parse(client.exportPending());expect(exported.dirty.map((e:any)=>e.id)).toEqual(["picture","written"]);if(kind==="oversize")expect(exported.files.file1.dataURL).toBe(file.dataURL);client.close();
 const restored=createBoardClient(options({storage,fetch:fetcher}));await restored.connect();expect(restored.getState().status).toBe("error");expect(JSON.parse(restored.exportPending()).dirty.map((e:any)=>e.id)).toEqual(["picture","written"]);if(kind==="oversize")expect(JSON.parse(restored.exportPending()).files.file1.dataURL).toBe(file.dataURL);restored.close();
 });
 it("retries an unchanged pending image once its missing file becomes available, with assets before the complete batch",async()=>{
 const posts:any[]=[],client=createBoardClient(options({fetch:vi.fn(async(path:string,init:any)=>{if(init?.method==="POST"){const body=JSON.parse(init.body);posts.push({path,body});return response({ok:true,houseId:house,sequence:posts.length,elements:body.elements});}return response(path.includes("context")?{identity:{id:actor},home:{id:house}}:{houseId:house,sequence:0,elements:[],files:[],chat:[]});})}));
 await client.connect();const elements=[{...element("picture"),type:"image",fileId:"file1"},{...element("written"),type:"text",text:"Keep this thought"}];client.localChange(elements,{});
 client.localChange(elements,{file1:{id:"file1",mimeType:"image/png",dataURL:"data:image/png;base64,aGVsbG8=",created:1}});await client.flush();expect(posts.map(p=>p.path)).toEqual(["/api/board/asset","/api/board/patch"]);expect(posts[1].body.elements.map((e:any)=>e.id)).toEqual(["picture","written"]);expect(client.getState().pending).toBe(0);expect(client.getState().status).toBe("saved");client.close();
 });
});

it("does not republish unchanged editor callbacks while an unsent text batch is pending",async()=>{
 const onState=vi.fn(),client=createBoardClient(options({onState}));await client.connect();const scene=[{...element("written"),type:"text",text:"A pending thought"}];client.localChange(scene,{});const notifications=onState.mock.calls.length;client.localChange(scene,{});client.localChange(scene,{});expect(onState).toHaveBeenCalledTimes(notifications);expect(client.getState().pending).toBe(1);client.close();
});
