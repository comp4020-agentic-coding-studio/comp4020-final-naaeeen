import { JSDOM } from "jsdom";
import { describe, expect, it, vi } from "vitest";
import { attachFloatingWindow, clampWindow, isolateToolEvents, returnFromBoard, createIdentityActions } from "../board/interaction.js";
describe("board companion input ownership",()=>{
 it("keeps multiline typing, wheel and paste out of canvas document shortcuts",()=>{
 const dom=new JSDOM('<main><aside><textarea></textarea></aside></main>'),root=dom.window.document.querySelector("aside")!,text=root.querySelector("textarea")!,canvas=vi.fn(),typing=vi.fn();
 for(const type of ["keydown","keyup","wheel","paste"])dom.window.document.addEventListener(type,canvas);
 const release=isolateToolEvents(root);text.addEventListener("keydown",typing);text.value="Line one\\nLine two";
 for(const type of ["keydown","keyup","wheel","paste"])text.dispatchEvent(new dom.window.Event(type,{bubbles:true,cancelable:true}));
 expect(canvas).not.toHaveBeenCalled();expect(typing).toHaveBeenCalledOnce();expect(text.value).toBe("Line one\\nLine two");release();text.dispatchEvent(new dom.window.Event("keydown",{bubbles:true}));expect(canvas).toHaveBeenCalledOnce();dom.window.close();
 });
 it("clamps a dragged companion window to the visible viewport",()=>{
 expect(clampWindow({x:2000,y:-50},{width:350,height:425},{width:1920,height:1080})).toEqual({x:1562,y:64});
 expect(clampWindow({x:0,y:900},{width:350,height:260},{width:390,height:844})).toEqual({x:8,y:576});
 });
 it("moves and resizes the actual panel while mobile retains its dock",()=>{
 const dom=new JSDOM('<aside><header><span>Chat</span><button>Collapse</button></header><div class="resize"></div></aside>'),host=dom.window,node=host.document.querySelector("aside")!,handle=node.querySelector("header")!,resize=node.querySelector(".resize")!;
 Object.defineProperty(host,"innerWidth",{value:1920,writable:true});Object.defineProperty(host,"innerHeight",{value:1080,writable:true});node.getBoundingClientRect=()=>({left:100,top:100,width:350,height:425} as any);
 const release=attachFloatingWindow(node,handle,resize,{window:host as any});
 const pointer=(target:any,type:string,x:number,y:number)=>{const event=new host.MouseEvent(type,{bubbles:true,button:0,clientX:x,clientY:y});target.dispatchEvent(event);};
 pointer(handle,"pointerdown",120,120);pointer(host,"pointermove",220,220);pointer(host,"pointerup",220,220);expect(node.style.left).toBe("200px");expect(node.style.top).toBe("200px");
 pointer(resize,"pointerdown",440,510);pointer(host,"pointermove",540,610);pointer(host,"pointerup",540,610);expect(node.style.width).toBe("450px");expect(node.style.height).toBe("525px");
 Object.defineProperty(host,"innerWidth",{value:390,writable:true});host.dispatchEvent(new host.Event("resize"));expect(node.style.cssText).toBe("");release();dom.window.close();
 });
 it("posts embedded return only to the current same origin and uses the ordinary route directly",()=>{
 const postMessage=vi.fn(),assign=vi.fn();returnFromBoard({location:{href:"http://localhost:8080/board/?embedded=1",origin:"http://localhost:8080",assign},parent:{postMessage}} as any);expect(postMessage).toHaveBeenCalledWith({type:"night-board-close"},"http://localhost:8080");expect(assign).not.toHaveBeenCalled();
 returnFromBoard({location:{href:"http://localhost:8080/board/",origin:"http://localhost:8080",assign},parent:{postMessage}} as any);expect(assign).toHaveBeenCalledWith("/");
 });
});

describe("standalone board identity request boundaries",()=>{
 const actor="00000000-0000-4000-8000-000000000002",other="00000000-0000-4000-8000-000000000003";
 const response=(result:any,status=200)=>({ok:status===200,json:async()=>result});
 it("serializes private key issuance and captures actor intent",async()=>{
 let finish:any;const fetcher=vi.fn(async(path:string,_init:any)=>path.endsWith("recovery-key")?new Promise(resolve=>{finish=()=>resolve(response({proof:"test-private-proof"}));}):response({identity:{id:actor}}));
 const actions=createIdentityActions({getIdentityId:()=>actor,fetch:fetcher});const first=actions.issue();await vi.waitFor(()=>expect(finish).toBeTypeOf("function"));expect(actions.getState().busy).toBe(true);expect(await actions.issue()).toBe(false);expect(fetcher).toHaveBeenCalledTimes(1);expect(fetcher.mock.calls[0][1].headers["X-House-Identity"]).toBe(actor);finish();await first;expect(actions.getState().proof).toBe("test-private-proof");expect(actions.getState().busy).toBe(false);actions.close();expect(actions.getState().proof).toBe("");
 });
 it.each(["close","identity"])("discards a late proof after %s invalidates its original scope",async(mode)=>{
 let identity=actor,finish:any;const changed=vi.fn(),actions=createIdentityActions({getIdentityId:()=>identity,onChange:changed,fetch:vi.fn(async(path:string)=>path.endsWith("recovery-key")?new Promise(resolve=>{finish=()=>resolve(response({proof:"test-private-proof"}));}):response({identity:{id:identity}}))});
 const saving=actions.issue();await vi.waitFor(()=>expect(finish).toBeTypeOf("function"));if(mode==="close")actions.close();else{identity=other;actions.invalidate();}finish();await saving;expect(actions.getState().proof).toBe("");expect(changed.mock.calls.some(([state])=>state.proof==="test-private-proof")).toBe(false);actions.close();
 });
 it("rejects an old-identity proof if the current cookie identity changed before delivery",async()=>{
 const actions=createIdentityActions({getIdentityId:()=>actor,fetch:vi.fn(async(path:string)=>response(path.endsWith("recovery-key")?{proof:"test-private-proof"}:{identity:{id:other}}))});expect(await actions.issue()).toBe(false);expect(actions.getState().proof).toBe("");expect(actions.getState().error).toMatch(/identity/i);actions.close();
 });
 it("recovers through the existing authority, refreshes board context and clears proof state",async()=>{
 const recovered=vi.fn(),fetcher=vi.fn(async(path:string,_init:any)=>response(path.endsWith("recover")?{identity:{id:other},home:{id:"house"}}:{identity:{id:other},home:{id:"house"}}));
 const actions=createIdentityActions({getIdentityId:()=>actor,fetch:fetcher,onRecovered:recovered});expect(await actions.recover("test-private-proof")).toBe(true);expect(fetcher.mock.calls.map(([path])=>path)).toEqual(["/api/house/recover","/api/board/context"]);expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({proof:"test-private-proof"});expect(recovered).toHaveBeenCalledWith({identity:{id:other},home:{id:"house"}});expect(actions.getState().proof).toBe("");actions.close();
 });
 it("does not replace a newer identity with a delayed recovery reply",async()=>{
 let identity=actor,finish:any;const recovered=vi.fn(),actions=createIdentityActions({getIdentityId:()=>identity,onRecovered:recovered,fetch:vi.fn(async(path:string)=>path.endsWith("recover")?new Promise(resolve=>{finish=()=>resolve(response({identity:{id:other},home:{id:"house"}}));}):response({identity:{id:other},home:{id:"house"}}))});
 const saving=actions.recover("test-private-proof");await vi.waitFor(()=>expect(finish).toBeTypeOf("function"));identity="newer-identity";actions.invalidate();finish();await saving;expect(recovered).not.toHaveBeenCalled();expect(actions.getState().proof).toBe("");actions.close();
 });
});

it("does not expose a private proof arriving after the identity request timed out",async()=>{
 let finish:any;const changed=vi.fn(),actor="00000000-0000-4000-8000-000000000002",fetcher=vi.fn(async(path:string)=>path.endsWith("recovery-key")?new Promise(resolve=>{finish=()=>resolve({ok:true,json:async()=>({proof:"test-private-proof"})});}):({ok:true,json:async()=>({identity:{id:actor}})}));
 const actions=createIdentityActions({getIdentityId:()=>actor,fetch:fetcher,onChange:changed,timeoutMs:5});expect(await actions.issue()).toBe(false);expect(actions.getState().error).toContain("did not arrive");finish();await new Promise(resolve=>setTimeout(resolve,10));expect(actions.getState().proof).toBe("");expect(changed.mock.calls.some(([state])=>state.proof==="test-private-proof")).toBe(false);expect(fetcher).toHaveBeenCalledTimes(1);actions.close();
});
