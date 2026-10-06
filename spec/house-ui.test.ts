import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const transport = vi.hoisted(()=>({options:null as any, live:null as any, command:vi.fn(), connect:vi.fn(), close:vi.fn(), inspectorCommand:vi.fn(), inspectorFactory:vi.fn(), inspectorClose:vi.fn(), discardOtherIdentities:vi.fn(), getPending:vi.fn(), retryPending:vi.fn(), discardPending:vi.fn(), exportPending:vi.fn()}));
vi.mock("../public/house-client.js",()=>({createPendingInspector:(options:any)=>transport.inspectorFactory(options),createHouseClient:(options:any)=>{transport.options=options;return {...transport,subscribe:vi.fn(),move:vi.fn(),setAvailability:vi.fn(),claimSeat:vi.fn(),stand:vi.fn(),takeover:vi.fn()};}}));
vi.mock("../public/house-world.js",()=>({createHouseWorld:(_element:any,options:any)=>{camera.options=options;return {setCameraMode:camera.setCameraMode,getCameraMode:camera.getCameraMode,update:vi.fn(),setInputEnabled:vi.fn(),setEditing:vi.fn(),setRoomPreview:vi.fn(),dispose:vi.fn()};}}));
const camera=vi.hoisted(()=>({options:null as any,setCameraMode:vi.fn(),getCameraMode:vi.fn()}));
let dom:JSDOM, me:any;
const houseId="00000000-0000-4000-8000-000000000001", selfId="00000000-0000-4000-8000-000000000002";
function snapshot(sequence=0, cards:any[]=[], chat:any[]=[]) {return {serverEpoch:"epoch",accessGeneration:1,generation:1,controller:true,durable:{schemaVersion:2,selfId,house:{id:houseId,capacity:2,ownerId:selfId,code:"12345678"},residents:[{id:selfId,name:"Robin",colour:"sage",revision:1,slot:0,bedroomId:"own",open:false}],streamId:"lounge:"+houseId,sequence,zoneId:"lounge",room:null,cards,chat},players:[{id:selfId,name:"Robin",colour:"sage",connected:true,zoneId:"lounge",x:0,z:2.85,availability:"quiet",generation:1}]};}
async function setup(initial=snapshot(),connectFailure:any=null){
 vi.resetModules();camera.getCameraMode.mockReturnValue("play");camera.setCameraMode.mockReset();camera.setCameraMode.mockImplementation((mode:string)=>{camera.getCameraMode.mockReturnValue(mode);camera.options.onCameraModeChange(mode);});transport.live=initial;transport.getPending.mockResolvedValue({entries:[],otherIdentityCount:0,total:0});me={identity:{id:selfId,name:"Robin",colour:"sage",revision:1},home:transport.live.durable.house,archiveCount:0};
 dom=new JSDOM(readFileSync(new URL("../public/house.html",import.meta.url),"utf8"),{url:"http://localhost"});
 vi.stubGlobal("document",dom.window.document);vi.stubGlobal("window",dom.window);vi.stubGlobal("navigator",dom.window.navigator);
 vi.stubGlobal("fetch",vi.fn(async(path:string)=>({ok:true,json:async()=>path.startsWith("/api/house/removed-members")?{members:[],nextCursor:null}:me})));
 transport.command.mockReset();transport.inspectorClose.mockReset();transport.inspectorFactory.mockReset();transport.inspectorFactory.mockImplementation(()=>({...transport,command:transport.inspectorCommand,close:transport.inspectorClose}));transport.inspectorCommand.mockReset();transport.inspectorCommand.mockResolvedValue({ok:true});transport.connect.mockImplementation(async()=>{if(connectFailure)throw connectFailure;transport.options.onSnapshot(transport.live);});
 await import("../public/house-ui.js");await vi.waitFor(()=>expect(transport.options).toBeTruthy());await vi.waitFor(()=>expect(dom.window.document.getElementById("lobby")!.hidden).toBe(true));
}
const el=(id:string)=>dom.window.document.getElementById(id)!;
function type(id:string,value:string){(el(id) as HTMLInputElement).value=value;el(id).dispatchEvent(new dom.window.Event("input",{bubbles:true}));}
beforeEach(()=>{transport.options=null;});
afterEach(()=>{vi.useRealTimers();dom?.window.close();vi.unstubAllGlobals();vi.clearAllMocks();});
it("keeps newer card typing when an earlier submitted version is acknowledged",async()=>{
 await setup();dom.window.document.querySelector<HTMLButtonElement>('[data-panel="board"]')!.click();
 let finish:(value:any)=>void=()=>{};transport.command.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
 type("small-goal","Submitted version");el("card-form").dispatchEvent(new dom.window.Event("submit",{bubbles:true,cancelable:true}));
 await vi.waitFor(()=>expect(transport.command).toHaveBeenCalledTimes(1));
 type("small-goal","New thought while saving");
 const saved={id:"card-one",authorId:selfId,smallGoal:"Submitted version",question:"",resourceUrl:"",nextStep:"",helpRequested:false,state:"active",revision:1};
 transport.options.onSnapshot(snapshot(1,[saved]));finish({ok:true,streamId:"lounge:"+houseId,sequence:1,entityRevision:1});
 await vi.waitFor(()=>expect(el("card-status").textContent).toContain("newer edits"));
 expect((el("small-goal") as HTMLInputElement).value).toBe("New thought while saving");
});
it("keeps the next chat draft while the preceding message acknowledgement arrives",async()=>{
 await setup();let finish:(value:any)=>void=()=>{};transport.command.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
 type("chat-input","First message");el("quick-chat").dispatchEvent(new dom.window.Event("submit",{bubbles:true,cancelable:true}));
 await vi.waitFor(()=>expect(transport.command).toHaveBeenCalledTimes(1));type("chat-input","Next message draft");
 transport.options.onSnapshot(snapshot(1,[],[{id:"message",authorId:selfId,name:"Robin",text:"First message",at:1,sequence:1}]));
 finish({ok:true,streamId:"lounge:"+houseId,sequence:1,entityRevision:0});
 await new Promise(resolve=>setTimeout(resolve,20));
 expect((el("chat-input") as HTMLInputElement).value).toBe("Next message draft");
});
it("returns a removed resident to the lobby with their private export reachable",async()=>{
 await setup();me={...me,home:null,archiveCount:1};transport.options.onDisconnect("removed");
 await vi.waitFor(()=>expect(el("lobby").hidden).toBe(false));
 expect(el("lobby-export").hidden).toBe(false);expect(el("archive-count").textContent).toContain("1 private room archive");
 expect(el("game-controls").hidden).toBe(true);
});

it("does not expose a private tool or crash when room controls are used during reconnection",async()=>{
 await setup();const errors:string[]=[];dom.window.addEventListener("error",event=>{errors.push(event.message);event.preventDefault();});
 transport.options.onSnapshot(null);
 dom.window.document.querySelector<HTMLButtonElement>('[data-panel="room"]')!.click();
 expect(errors).toEqual([]);expect(el("panel").hidden).toBe(true);
});

function roomSnapshot(revision=1, placements:any[]=[{id:"lamp-one",kind:"lamp",x:-4,z:-2,rotation:0,colour:"sage"}]) {
 const s=snapshot(revision);s.durable.zoneId="own";s.durable.streamId="bedroom:own";(s.durable as any).room={id:"own",ownerId:selfId,revision,open:false,palette:"sage",placements} as any;s.players[0].zoneId="own";return s;
}
function panel(name:string){dom.window.document.querySelector<HTMLButtonElement>('[data-panel="'+name+'"]')!.click();}
function submit(id:string){el(id).dispatchEvent(new dom.window.Event("submit",{bubbles:true,cancelable:true}));}
const flush=()=>new Promise(resolve=>setTimeout(resolve,20));
it("keeps newer furniture edits after its own layout ACK and sends the receipt revision",async()=>{
 await setup(roomSnapshot());panel("room");el("piece-right").click();
 let finish:(value:any)=>void=()=>{};transport.command.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
 el("layout-save").click();await vi.waitFor(()=>expect(transport.command).toHaveBeenCalledTimes(1));
 el("piece-right").click();transport.options.onSnapshot(roomSnapshot(3,[{id:"lamp-one",kind:"lamp",x:-2,z:-2,rotation:0,colour:"sage"}]));
 finish({ok:true,streamId:"bedroom:own",sequence:2,entityRevision:2});await flush();
 transport.command.mockResolvedValue({ok:true,streamId:"bedroom:own",sequence:3,entityRevision:4});el("layout-save").click();
 await vi.waitFor(()=>expect(transport.command).toHaveBeenCalledTimes(2));
 expect(transport.command.mock.calls[1][0].payload.placements[0].x).toBe(-3);expect(transport.command.mock.calls[1][0].expectedRevision).toBe(2);
});
it("preserves same-owner room draft through reconnect while clearing private DOM",async()=>{
 await setup(roomSnapshot());panel("room");el("piece-right").click();transport.options.onSnapshot(null);
 expect(el("placement").childElementCount).toBe(0);expect((el("palette") as HTMLSelectElement).value).toBe("");
 transport.options.onSnapshot(roomSnapshot());panel("room");expect(el("placement").textContent).toContain("-3.5");
});
it("never restores a room draft for a different owner or house",async()=>{
 await setup(roomSnapshot());panel("room");el("piece-right").click();transport.options.onSnapshot(null);
 const other=roomSnapshot();other.durable.selfId="another-owner";(other.durable.room as any).ownerId="another-owner";transport.options.onSnapshot(other);panel("room");
 expect(el("placement").textContent).toContain("-4");expect(el("placement").textContent).not.toContain("-3.5");
});
it("does not rebase an old furniture draft when current metadata is saved",async()=>{
 await setup(roomSnapshot());panel("room");el("piece-right").click();transport.options.onSnapshot(roomSnapshot(2,[{id:"lamp-one",kind:"lamp",x:-2,z:-2,rotation:0,colour:"sage"}]));
 el("panel-close").click();panel("room");(el("room-open") as HTMLInputElement).checked=true;el("room-open").dispatchEvent(new dom.window.Event("input",{bubbles:true}));
 transport.command.mockImplementation(async(intent:any)=>{transport.options.onSnapshot(roomSnapshot(3,[{id:"lamp-one",kind:"lamp",x:-2,z:-2,rotation:0,colour:"sage"}]));return {ok:true,streamId:"bedroom:own",sequence:3,entityRevision:3};});
 submit("room-form");await vi.waitFor(()=>expect(transport.command).toHaveBeenCalledTimes(1));await flush();el("layout-save").click();await vi.waitFor(()=>expect(transport.command).toHaveBeenCalledTimes(2));
 expect(transport.command.mock.calls[0][0].expectedRevision).toBe(2);expect(transport.command.mock.calls[1][0].expectedRevision).toBe(1);
});
it("keeps newer room metadata edits while an earlier save is acknowledged",async()=>{
 await setup(roomSnapshot());panel("room");(el("room-open") as HTMLInputElement).checked=true;el("room-open").dispatchEvent(new dom.window.Event("input",{bubbles:true}));
 let finish:(value:any)=>void=()=>{};transport.command.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));submit("room-form");await vi.waitFor(()=>expect(transport.command).toHaveBeenCalledTimes(1));
 type("palette","rose");transport.options.onSnapshot(roomSnapshot(2));finish({ok:true,streamId:"bedroom:own",sequence:2,entityRevision:2});await flush();el("panel-close").click();panel("room");
 expect((el("palette") as HTMLSelectElement).value).toBe("rose");expect(el("room-status").textContent).toContain("newer");
});
it("rerenders house code and owner authority while the private stream cursor is unchanged",async()=>{
 await setup(roomSnapshot());panel("house");const next=roomSnapshot();next.durable.house.code="NEWCODE1";next.durable.house.ownerId="friend";next.durable.residents.push({id:"friend",name:"Finch",colour:"rose",revision:1,slot:1,bedroomId:"other",open:false} as any);transport.options.onSnapshot(next);
 expect(el("join-code-display").textContent).toBe("NEWCODE1");expect(el("capacity-status").textContent).toContain("2 of 2");expect(el("membership-actions").textContent).not.toContain("Remove member");
});
it("counts only delivered new non-self chat once, including Quiet, and clears on transcript open",async()=>{
 const old={id:"old",authorId:"friend",name:"Finch",text:"Earlier",at:1,sequence:1};await setup(snapshot(1,[],[old]));expect(el("chat-count").textContent).toBe("");
 const message={...old,id:"new",text:"Hello",sequence:2};transport.options.onSnapshot(snapshot(2,[],[old,message]));transport.options.onSnapshot(snapshot(2,[],[old,message]));
 expect(el("chat-count").textContent).toBe("1");panel("chat");expect(el("chat-count").textContent).toBe("");
});
it("shows explicit server willingness freshness and actionable retention copy",async()=>{
 const state=snapshot();(state.players[0] as any).availabilitySetAt=Date.parse("2026-10-07T01:02:00Z");await setup(state);
 expect(el("availability-freshness").textContent).toContain("Last set");expect(el("availability-freshness").querySelector("time")?.dateTime).toBe("2026-10-07T01:02:00.000Z");
 expect(el("join-privacy").textContent).toMatch(/history/);expect(el("chat-privacy").textContent).toMatch(/7 days/);panel("room");expect(el("room-privacy").textContent).toMatch(/history/);
});
it("shows pending drafts in the lobby without exposing other-identity payloads",async()=>{
 await setup();transport.getPending.mockResolvedValue({entries:[{commandId:"pending-one",type:"chat.send",createdAt:1,houseId,zoneId:"own",state:"expired",canRetry:false,command:{commandId:"pending-one",type:"chat.send",houseId,payload:{zoneId:"own",text:"My private draft"}}}],otherIdentityCount:2,total:3});
 me={...me,home:null,archiveCount:1};transport.options.onDisconnect("removed");await vi.waitFor(()=>expect(el("lobby").hidden).toBe(false));el("lobby-pending").click();await vi.waitFor(()=>expect(el("pending-entries").textContent).toContain("My private draft"));
 expect(el("pending-entries").textContent).toContain("Expired");expect(el("pending-foreign").textContent).toContain("2");expect(el("pending-entries").querySelector<HTMLButtonElement>('[data-action="retry"]')!.disabled).toBe(true);
});

it("rebases newer card typing only to its own receipt, never a later external snapshot",async()=>{
 const original={id:"card-one",authorId:selfId,smallGoal:"Original",question:"",resourceUrl:"",nextStep:"",helpRequested:false,state:"active",revision:1};await setup(snapshot(1,[original]));panel("board");
 let finish:(value:any)=>void=()=>{};transport.command.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));type("small-goal","Submitted");submit("card-form");await vi.waitFor(()=>expect(transport.command).toHaveBeenCalledTimes(1));type("small-goal","New draft");
 transport.options.onSnapshot(snapshot(3,[{...original,smallGoal:"Other tab",revision:3}]));finish({ok:true,streamId:"lounge:"+houseId,sequence:2,entityRevision:2,result:{cardId:"card-one"}});await flush();
 transport.command.mockResolvedValue({ok:true,streamId:"lounge:"+houseId,sequence:3,entityRevision:4,result:{cardId:"card-one"}});submit("card-form");await vi.waitFor(()=>expect(transport.command).toHaveBeenCalledTimes(2));expect(transport.command.mock.calls[1][0].expectedRevision).toBe(2);
});
it("bounds a hanging identity request without claiming the action was saved",async()=>{
 await setup();vi.stubGlobal("fetch",vi.fn(()=>new Promise(()=>{})));vi.useFakeTimers();el("recovery-key").click();await Promise.resolve();await vi.advanceTimersByTimeAsync(8100);expect(el("notice").textContent).toMatch(/pending.*not confirmed saved/);vi.useRealTimers();
});
it("keeps the original uncertain admission UUID when the lobby action is retried",async()=>{
 await setup();me={...me,home:null,archiveCount:0};transport.options.onDisconnect("removed");await vi.waitFor(()=>expect(el("lobby").hidden).toBe(false));
 const uncertain=Object.assign(new Error("Pending reply"),{code:"TIMEOUT"});transport.inspectorCommand.mockRejectedValue(uncertain);submit("create-form");await vi.waitFor(()=>expect(transport.inspectorCommand).toHaveBeenCalledTimes(1));await flush();submit("create-form");await vi.waitFor(()=>expect(transport.inspectorCommand).toHaveBeenCalledTimes(2));expect(transport.inspectorCommand.mock.calls[1][0].commandId).toBe(transport.inspectorCommand.mock.calls[0][0].commandId);
});

it("drops an old owner pagination reply after house ownership changes",async()=>{
 await setup(roomSnapshot());let finish:(value:any)=>void=()=>{};vi.stubGlobal("fetch",vi.fn(()=>new Promise(resolve=>{finish=resolve;})));panel("house");await flush();
 const next=roomSnapshot();next.durable.house.ownerId="friend";transport.options.onSnapshot(next);finish({ok:true,json:async()=>({members:[{id:"removed",name:"Old private member"}],nextCursor:null})});await flush();expect(el("removed-members").textContent).not.toContain("Old private member");
});
it("keeps a conflicted furniture preview through saved review until an explicit reset",async()=>{
 await setup(roomSnapshot());panel("room");el("piece-right").click();transport.command.mockRejectedValue(Object.assign(new Error("Saved room changed"),{code:"REVISION_CONFLICT"}));el("layout-save").click();await vi.waitFor(()=>expect(el("layout-status").textContent).toContain("Preview kept"));
 el("layout-review").click();expect(el("placement").textContent).toContain("-3.5");expect(el("layout-review").textContent).toContain("Return to my preview");
 vi.stubGlobal("confirm",vi.fn(()=>true));el("layout-reset").click();expect(el("placement").textContent).toContain("-4");
});
it("provides an explicit saved-settings reset without discarding the furniture draft",async()=>{
 await setup(roomSnapshot());panel("room");el("piece-right").click();type("palette","rose");transport.command.mockRejectedValue(Object.assign(new Error("Saved room changed"),{code:"REVISION_CONFLICT"}));submit("room-form");await vi.waitFor(()=>expect(el("room-status").textContent).toContain("Draft kept"));
 vi.stubGlobal("confirm",vi.fn(()=>true));el("room-reset").click();expect((el("palette") as HTMLSelectElement).value).toBe("sage");expect(el("placement").textContent).toContain("-3.5");
});

it("keeps an unsaved shared card when visiting a room and returning to the same house",async()=>{
 await setup();panel("board");type("small-goal","Keep my thought");transport.options.onSnapshot(roomSnapshot());transport.options.onSnapshot(snapshot(1));panel("board");expect((el("small-goal") as HTMLInputElement).value).toBe("Keep my thought");
});

it("keeps an acknowledged arrangement while its durable snapshot is delayed",async()=>{
 await setup(roomSnapshot());panel("room");el("piece-right").click();transport.command.mockResolvedValue({ok:true,streamId:"bedroom:own",sequence:2,entityRevision:2});vi.useFakeTimers();el("layout-save").click();await vi.advanceTimersByTimeAsync(1600);expect(el("placement").textContent).toContain("-3.5");el("layout-save").click();await Promise.resolve();expect(transport.command.mock.calls[1][0].expectedRevision).toBe(2);vi.useRealTimers();
});
it("keeps acknowledged room metadata while its durable snapshot is delayed",async()=>{
 await setup(roomSnapshot());panel("room");type("palette","rose");(el("room-open") as HTMLInputElement).checked=true;el("room-open").dispatchEvent(new dom.window.Event("input",{bubbles:true}));transport.command.mockResolvedValue({ok:true,streamId:"bedroom:own",sequence:2,entityRevision:2});vi.useFakeTimers();submit("room-form");await vi.advanceTimersByTimeAsync(1600);expect((el("palette") as HTMLSelectElement).value).toBe("rose");expect((el("room-open") as HTMLInputElement).checked).toBe(true);vi.useRealTimers();
});
it("keeps an acknowledged card while its durable snapshot is delayed",async()=>{
 await setup();panel("board");type("small-goal","Acknowledged goal");transport.command.mockResolvedValue({ok:true,streamId:"lounge:"+houseId,sequence:1,entityRevision:1,result:{cardId:"new-card"}});vi.useFakeTimers();submit("card-form");await vi.advanceTimersByTimeAsync(1600);expect((el("small-goal") as HTMLInputElement).value).toBe("Acknowledged goal");vi.useRealTimers();
});

it("does not display an old identity recovery key after the current identity changes",async()=>{
 await setup();panel("house");let finish:(value:any)=>void=()=>{};vi.stubGlobal("fetch",vi.fn((path:string)=>path==="/api/house/recovery-key"?new Promise(resolve=>{finish=resolve;}):Promise.resolve({ok:true,json:async()=>({members:[],nextCursor:null})})));el("recovery-key").click();await Promise.resolve();const other=snapshot();other.durable.selfId="another-owner";other.durable.house.ownerId="another-owner";transport.options.onSnapshot(other);finish({ok:true,json:async()=>({proof:"old-identity-proof"})});await flush();expect(el("recovery-output").textContent).toBe("");
});
it("does not download an old identity export after the current identity changes",async()=>{
 await setup();panel("house");let finish:(value:any)=>void=()=>{};vi.stubGlobal("fetch",vi.fn((path:string)=>path==="/api/house/export"?new Promise(resolve=>{finish=resolve;}):Promise.resolve({ok:true,json:async()=>({members:[],nextCursor:null})})));const download=vi.spyOn(URL,"createObjectURL");el("export-own").click();await Promise.resolve();const other=snapshot();other.durable.selfId="another-owner";other.durable.house.ownerId="another-owner";transport.options.onSnapshot(other);finish({ok:true,json:async()=>({owner:"old identity private work"})});await flush();expect(download).not.toHaveBeenCalled();download.mockRestore();
});

it("keeps newer card typing when its own save is acknowledged during reconnection",async()=>{
 const original={id:"card-one",authorId:selfId,smallGoal:"Original",question:"",resourceUrl:"",nextStep:"",helpRequested:false,state:"active",revision:1};await setup(snapshot(1,[original]));panel("board");let finish:(value:any)=>void=()=>{};transport.command.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));type("small-goal","Submitted");submit("card-form");await vi.waitFor(()=>expect(transport.command).toHaveBeenCalledTimes(1));type("small-goal","New draft");transport.options.onSnapshot(null);finish({ok:true,streamId:"lounge:"+houseId,sequence:2,entityRevision:2,result:{cardId:"card-one"}});vi.useFakeTimers();await vi.advanceTimersByTimeAsync(1600);vi.useRealTimers();transport.options.onSnapshot(snapshot(3,[{...original,revision:3,smallGoal:"Other tab"}]));panel("board");transport.command.mockResolvedValue({ok:true,streamId:"lounge:"+houseId,sequence:3,entityRevision:4});submit("card-form");await vi.waitFor(()=>expect(transport.command).toHaveBeenCalledTimes(2));expect(transport.command.mock.calls[1][0].expectedRevision).toBe(2);expect((el("small-goal") as HTMLInputElement).value).toBe("New draft");
});
it("keeps newer author typing as a new draft when an earlier close is acknowledged",async()=>{
 const original={id:"card-one",authorId:selfId,smallGoal:"Original",question:"",resourceUrl:"",nextStep:"",helpRequested:false,state:"active",revision:1};await setup(snapshot(1,[original]));panel("board");let finish:(value:any)=>void=()=>{};transport.command.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));el("close-card").click();await vi.waitFor(()=>expect(transport.command).toHaveBeenCalledTimes(1));type("small-goal","New idea while closing");transport.options.onSnapshot(snapshot(2,[{...original,state:"closed",revision:2}]));finish({ok:true,streamId:"lounge:"+houseId,sequence:2,entityRevision:2});await flush();expect((el("small-goal") as HTMLInputElement).value).toBe("New idea while closing");transport.command.mockResolvedValue({ok:true,streamId:"lounge:"+houseId,sequence:2,entityRevision:1,result:{cardId:"new-card"}});submit("card-form");await vi.waitFor(()=>expect(transport.command).toHaveBeenCalledTimes(2));expect(transport.command.mock.calls[1][0].expectedRevision).toBe(0);expect(transport.command.mock.calls[1][0].payload.cardId).toBeUndefined();
});

async function toLobby(){me={...me,home:null,archiveCount:1};transport.options.onDisconnect("removed");await vi.waitFor(()=>expect(el("lobby").hidden).toBe(false));}
function identityApi(){vi.stubGlobal("fetch",vi.fn(async(path:string)=>({ok:true,json:async()=>path==="/api/house/me"?me:path==="/api/house/recovery-key"?{proof:"identity-a-proof"}:{ok:true}})));}
it("purges an already displayed lobby proof when recovery changes to another lobby identity",async()=>{
 await setup();await toLobby();identityApi();el("lobby-recovery-key").click();await vi.waitFor(()=>expect(el("lobby-recovery-output").textContent).toBe("identity-a-proof"));
 el("recover-open").click();type("recovery-proof","recover-b");me={...me,identity:{...me.identity,id:"identity-b",name:"Identity B"},home:null};submit("recovery-form");await vi.waitFor(()=>expect((el("name") as HTMLInputElement).value).toBe("Identity B"));expect(el("lobby-recovery-output").textContent).toBe("");expect(el("recovery-output").textContent).toBe("");
});
it("serializes recovery key issuance across the house and lobby buttons",async()=>{
 await setup();await toLobby();const finish:Array<(value:any)=>void>=[];vi.stubGlobal("fetch",vi.fn((path:string)=>path==="/api/house/recovery-key"?new Promise(resolve=>{finish.push(resolve);}):Promise.resolve({ok:true,json:async()=>me})));
 el("lobby-recovery-key").click();el("recovery-key").click();expect(finish).toHaveLength(1);expect((el("lobby-recovery-key") as HTMLButtonElement).disabled).toBe(true);expect((el("recovery-key") as HTMLButtonElement).disabled).toBe(true);
 finish[0]({ok:true,json:async()=>({proof:"first-valid-proof"})});await vi.waitFor(()=>expect((el("lobby-recovery-key") as HTMLButtonElement).disabled).toBe(false));el("lobby-recovery-key").click();expect(finish).toHaveLength(2);finish[1]({ok:true,json:async()=>({proof:"newest-valid-proof"})});await vi.waitFor(()=>expect(el("lobby-recovery-output").textContent).toBe("newest-valid-proof"));
});
it("clears only the acknowledged suspended chat draft before reconnect can resend it",async()=>{
 await setup();let finish:(value:any)=>void=()=>{};transport.command.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));type("chat-input","Already acknowledged message");submit("quick-chat");await vi.waitFor(()=>expect(transport.command).toHaveBeenCalledTimes(1));transport.options.onSnapshot(null);finish({ok:true,streamId:"lounge:"+houseId,sequence:1,entityRevision:0});vi.useFakeTimers();await vi.advanceTimersByTimeAsync(1600);vi.useRealTimers();transport.options.onSnapshot(snapshot(1,[],[{id:"message-one",authorId:selfId,name:"Robin",text:"Already acknowledged message",at:1,sequence:1}]));expect((el("chat-input") as HTMLInputElement).value).toBe("");submit("quick-chat");await flush();expect(transport.command).toHaveBeenCalledTimes(1);
});
it("preserves newer suspended chat typing when the preceding send is acknowledged",async()=>{
 await setup();let finish:(value:any)=>void=()=>{};transport.command.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));type("chat-input","First message");submit("quick-chat");await vi.waitFor(()=>expect(transport.command).toHaveBeenCalledTimes(1));type("chat-input","Newer unsent message");transport.options.onSnapshot(null);finish({ok:true,streamId:"lounge:"+houseId,sequence:1,entityRevision:0});vi.useFakeTimers();await vi.advanceTimersByTimeAsync(1600);vi.useRealTimers();transport.options.onSnapshot(snapshot(1));expect((el("chat-input") as HTMLInputElement).value).toBe("Newer unsent message");
});
it("closes and recreates the pending inspector across a lobby-to-lobby recovery epoch",async()=>{
 await setup();await toLobby();identityApi();expect(transport.inspectorFactory).toHaveBeenCalledTimes(1);el("recover-open").click();type("recovery-proof","recover-b");me={...me,identity:{...me.identity,id:"identity-b",name:"Identity B"},home:null};submit("recovery-form");await vi.waitFor(()=>expect((el("name") as HTMLInputElement).value).toBe("Identity B"));expect(transport.inspectorClose).toHaveBeenCalled();expect(transport.inspectorFactory).toHaveBeenCalledTimes(2);expect(transport.inspectorFactory.mock.calls[0][0].expectedIdentityId).toBe(selfId);expect(transport.inspectorFactory.mock.calls[1][0].expectedIdentityId).toBe("identity-b");el("lobby-pending").click();await vi.waitFor(()=>expect(el("pending-entries").textContent).toContain("No pending drafts"));
});

it("offers native Overview and Recenter controls and hides them while a contextual tool is open",async()=>{
 await setup();expect((el("camera-overview") as HTMLButtonElement).getAttribute("aria-pressed")).toBe("false");el("camera-overview").click();expect(camera.setCameraMode).toHaveBeenCalledWith("overview");expect(el("camera-overview").getAttribute("aria-pressed")).toBe("true");el("camera-recenter").click();expect(camera.setCameraMode).toHaveBeenLastCalledWith("play");expect(el("camera-overview").getAttribute("aria-pressed")).toBe("false");panel("board");expect(el("camera-controls").hidden).toBe(true);el("panel-close").click();expect(el("camera-controls").hidden).toBe(false);
});

it("retains the original chat UUID through the actual client stale-ACK and automatic outbox retry",async()=>{
 const actual:any=await vi.importActual("../public/house-client.js"),geometry:any=await vi.importActual("../public/house-geometry.js");
 dom=new JSDOM(readFileSync(new URL("../public/house.html",import.meta.url),"utf8"),{url:"http://localhost"});vi.stubGlobal("document",dom.window.document);vi.stubGlobal("window",dom.window);vi.stubGlobal("navigator",dom.window.navigator);
 const stored=new Map<string,string>(),listeners=new Map<string,any>(),receipts=new Map<string,any>(),payloads=new Map<string,any>(),calls:string[]=[],errors:string[]=[];let effects=0,firstAck:()=>void=()=>{};
 const state=()=>snapshot(effects,[],Array.from(payloads.values()).map((command:any,index:number)=>({id:"message-"+index,authorId:selfId,name:"Robin",text:command.payload.text,at:1,sequence:index+1})));
 const storage={getItem:(key:string)=>stored.get(key)??null,setItem:(key:string,value:string)=>stored.set(key,value)};vi.stubGlobal("sessionStorage",storage);
 const socket:any={connected:false,on:(event:string,fn:any)=>{listeners.set(event,fn);return socket;},connect:()=>{socket.connected=true;listeners.get("connect")?.();},disconnect:()=>{socket.connected=false;},timeout:()=>socket,volatile:{emit:()=>{}},emitWithAck:(event:string,body:any)=>{
  if(event==="house.subscribe")return Promise.resolve({ok:true,snapshot:state()});
  if(event!=="house.command")return Promise.resolve({ok:true});const command=body.command,id=command.commandId;calls.push(id);
  if(!receipts.has(id)){effects++;payloads.set(id,structuredClone(command));receipts.set(id,{ok:true,commandId:id,streamId:"lounge:"+houseId,sequence:effects,entityRevision:0});}
  else expect(command).toEqual(payloads.get(id));
  if(calls.length===1)return new Promise(resolve=>{firstAck=()=>resolve(receipts.get(id));});
  listeners.get("house.snapshot")?.(state());return Promise.resolve(receipts.get(id));
 }};
 vi.stubGlobal("io",()=>socket);me={identity:{id:selfId,name:"Robin",colour:"sage",revision:1},home:state().durable.house,archiveCount:0};vi.stubGlobal("fetch",vi.fn(async()=>({ok:true,json:async()=>me})));
 const source=readFileSync(new URL("../public/house-ui.js",import.meta.url),"utf8").replace(/^import .*;\r?\n/gm,"");
 const realFactory=(options:any)=>actual.createHouseClient({...options,onError:(error:any)=>{errors.push(error.code);options.onError?.(error);}});
 new Function("createHouseClient","createPendingInspector","createHouseWorld","validatePlacements",source)(realFactory,actual.createPendingInspector,()=>({update:()=>{},setInputEnabled:()=>{},setEditing:()=>{},setRoomPreview:()=>{},dispose:()=>{},getCameraMode:()=>"play",setCameraMode:()=>{}}),geometry.validatePlacements);
 await vi.waitFor(()=>expect(el("connection-status").textContent).toBe("Together, live"));type("chat-input","Original text");submit("quick-chat");await vi.waitFor(()=>expect(calls).toHaveLength(1));socket.connected=false;listeners.get("disconnect")("transport close");firstAck();await vi.waitFor(()=>expect(errors).toContain("STALE_ZONE"));await Promise.resolve();socket.connected=true;listeners.get("connect")();await vi.waitFor(()=>expect(calls).toHaveLength(2));await vi.waitFor(()=>expect(JSON.parse(stored.get("house.commandOutbox.v2")||"[]")).toHaveLength(0));expect(effects).toBe(1);
 submit("quick-chat");await vi.waitFor(()=>expect((el("chat-input") as HTMLInputElement).value).toBe(""));expect(effects).toBe(1);expect(new Set(calls).size).toBe(1);dom.window.dispatchEvent(new dom.window.Event("pagehide"));
});
it("does not clear another identity's newer draft when an old action reports identity changed",async()=>{
 await setup();let fail:(value:any)=>void=()=>{};transport.command.mockImplementationOnce(()=>new Promise((_resolve,reject)=>{fail=reject;}));type("chat-input","A pending message");submit("quick-chat");await vi.waitFor(()=>expect(transport.command).toHaveBeenCalledTimes(1));const other=snapshot();other.durable.selfId="identity-b";other.durable.house.ownerId="identity-b";transport.live=other;me={...me,identity:{...me.identity,id:"identity-b"}};transport.options.onSnapshot(other);type("chat-input","B newer private draft");fail(Object.assign(new Error("Identity changed"),{code:"IDENTITY_CHANGED"}));await flush();expect((el("chat-input") as HTMLInputElement).value).toBe("B newer private draft");
});

it.each(["LOAD_LIMIT","TAB_LIMIT"])("shows an explicit blocked connection and pending recovery for %s without an automatic loop",async(code)=>{
 await setup(snapshot(),Object.assign(new Error("Original server connection limit message"),{code}));await vi.waitFor(()=>expect(el("connection-status").textContent).toMatch(/connection limit|Too many house windows/));expect(el("notice").textContent).toContain("Original server connection limit message");expect(el("notice").textContent).toMatch(/Close.*reload/);expect(transport.connect).toHaveBeenCalledTimes(1);expect(el("connection-limit-pending").hidden).toBe(false);el("connection-limit-pending").click();await vi.waitFor(()=>expect(el("pending-entries").textContent).toContain("No pending drafts"));
});
