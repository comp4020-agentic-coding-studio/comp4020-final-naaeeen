import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createHousePuzzleUI } from "../public/house-puzzle-ui.js";
import { PUZZLE_ILLUSTRATIONS } from "../public/house-puzzle-content.js";
const art=PUZZLE_ILLUSTRATIONS[0],self="self",friend="friend";
let dom:JSDOM,host:HTMLElement,ui:any,send:any,intent:any,retry:any,onLeave:any,onReturn:any,pending:any;
function state(joined=false,roundId="round-one"):any{return {serverEpoch:"epoch",generation:3,accessGeneration:2,controller:true,players:[{id:self,connected:true,zoneId:"lounge",seatId:"game-seat-1"}],durable:{selfId:self,zoneId:"lounge",house:{id:"house",ownerId:self},residents:[{id:self,name:"Robin"},{id:friend,name:"Finch"}],puzzle:{revision:1,current:{id:roundId,ruleset:1,illustrationId:art.id,illustrationVersion:art.version,illustrationDigest:art.digest,placements:[],completed:false}},game:{revision:0,current:null}},puzzleRoster:{serverEpoch:"epoch",houseId:"house",roundId,revision:5,memberIds:joined?[self,friend]:[friend],selfParticipationId:joined?"consent-one":null}};}
const get=(selector:string)=>host.querySelector<HTMLElement>(selector)!;
const click=(selector:string)=>get(selector).click();
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
beforeEach(()=>{dom=new JSDOM('<section></section>',{url:"http://localhost"});host=dom.window.document.querySelector("section")!;send=vi.fn().mockResolvedValue({ok:true});intent=vi.fn().mockResolvedValue({ok:true});retry=vi.fn().mockResolvedValue({ok:true});onLeave=vi.fn();onReturn=vi.fn();pending=null;ui=createHousePuzzleUI(host,{send,intent,retryIntent:retry,pendingIntent:()=>pending,onLeave,onReturn});});
afterEach(()=>{ui.dispose();dom.window.close();});
it("opens as Watch, gives an honest active count and never joins from a Join ACK",async()=>{ui.update(state());expect(get('[data-puzzle-roster]').textContent).toContain('1 / 6');expect(intent).not.toHaveBeenCalled();click('[data-puzzle-action="join"]');await tick();expect(intent).toHaveBeenCalledWith('join','round-one');expect(get('[data-puzzle-roster]').textContent).toContain('watching');expect(get('[data-puzzle-piece="notebook"]').getAttribute('aria-pressed')).toBe('false');click('[data-puzzle-piece="notebook"]');expect(get('[data-puzzle-feedback]').textContent).toMatch(/Join/);});
it("starts a round separately from explicit Join",async()=>{const s=state();s.durable.puzzle.current=null;s.puzzleRoster.roundId=null;ui.update(s);click('[data-puzzle-action="start"]');await tick();expect(send).toHaveBeenCalledWith('puzzle.start',expect.objectContaining({expectedRoundId:null,confirmUnfinished:false,authority:{serverEpoch:'epoch',generation:3,accessGeneration:2},expectedRoster:{serverEpoch:'epoch',revision:5}}),1);expect(intent).not.toHaveBeenCalled();});
it("preserves stable slots, pages twelve pieces and supports roving keyboard navigation",()=>{ui.update(state(true));const piece=get('[data-puzzle-piece="notebook"]'),cell=get('[data-puzzle-destination="0"]');expect([...host.querySelectorAll('[data-puzzle-piece]')].filter(e=>!(e as HTMLElement).hidden)).toHaveLength(12);piece.focus();piece.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));expect(dom.window.document.activeElement).not.toBe(piece);click('[data-puzzle-action="next"]');expect(get('[data-puzzle-page]').textContent).toContain('2 of 2');ui.update(state(true));expect(get('[data-puzzle-destination="0"]')).toBe(cell);expect(get('[data-puzzle-piece="notebook"]')).toBe(piece);});
it("keeps a wrong-place selection and captures participation with each placement",async()=>{ui.update(state(true));send.mockRejectedValue(Object.assign(new Error('That place does not match.'),{code:'PUZZLE_WRONG_PLACE'}));click('[data-puzzle-piece="notebook"]');click('[data-puzzle-destination="0"]');await tick();expect(send).toHaveBeenCalledWith('puzzle.place',{roundId:'round-one',participationId:'consent-one',pieceId:'notebook',destination:0},undefined);expect(get('[data-puzzle-piece="notebook"]').getAttribute('aria-pressed')).toBe('true');expect(get('[data-puzzle-feedback]').textContent).toMatch(/still selected/);});
it("clears a peer-solved selected piece without removing focus or stable DOM",()=>{const s=state(true);ui.update(s);const piece=get('[data-puzzle-piece="notebook"]');piece.focus();piece.click();s.durable.puzzle.current.placements=[{pieceId:'notebook',destination:15,actorId:friend}];s.durable.puzzle.revision=2;ui.update(s);expect(dom.window.document.activeElement).toBe(piece);expect(piece.getAttribute('aria-pressed')).toBe('false');expect(piece.getAttribute('aria-label')).toContain('already placed');expect(get('[data-puzzle-feedback]').textContent).toMatch(/Finch.*selected/);});
it("ignores late placement replies after a new round and new selection",async()=>{let finish:any;send.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));ui.update(state(true));click('[data-puzzle-piece="notebook"]');click('[data-puzzle-destination="15"]');const next=state(true,'round-two');next.puzzleRoster.selfParticipationId='consent-two';ui.update(next);click('[data-puzzle-piece="paper-star"]');finish({ok:true,result:{roundId:'round-one'}});await tick();expect(get('[data-puzzle-piece="paper-star"]').getAttribute('aria-pressed')).toBe('true');expect(get('[data-puzzle-feedback]').textContent).toContain('Selected:');});
it("begins newer Leave before immediate Return even while Join is unresolved",()=>{intent.mockImplementation(()=>new Promise(()=>{}));ui.update(state());click('[data-puzzle-action="join"]');click('[data-puzzle-action="return"]');expect(intent.mock.calls.map((args:any)=>args[0])).toEqual(['join','leave']);expect(onReturn).toHaveBeenCalledOnce();});
it("shows uncertain original retry and does not allow an ACK to enroll",async()=>{ui.update(state());pending={mode:'join',roundId:'round-one',state:'pending',canRetry:true};ui.update(state());expect(get('[data-puzzle-action="retry"]').hidden).toBe(false);click('[data-puzzle-action="retry"]');await tick();expect(retry).toHaveBeenCalledOnce();expect(get('[data-puzzle-roster]').textContent).toContain('watching');});
it("requires leaving Four-in-a-row before joining the picture table",()=>{const s=state();s.durable.game.current={players:[self,friend]};ui.update(s);expect((get('[data-puzzle-action="join"]') as HTMLButtonElement).disabled).toBe(true);expect(get('[data-puzzle-feedback]').textContent).toMatch(/Leave Four-in-a-row/);});
it("captures unfinished-reset authority and roster when confirmation opens",async()=>{const s=state(true);s.puzzleRoster.memberIds=[self];ui.update(s);click('[data-puzzle-action="start"]');expect(send).not.toHaveBeenCalled();expect(get('[data-puzzle-reset]').hidden).toBe(false);const newer=structuredClone(s);newer.puzzleRoster.revision=7;ui.update(newer);click('[data-puzzle-action="confirm"]');await tick();expect(send).toHaveBeenCalledWith('puzzle.start',expect.objectContaining({confirmUnfinished:true,authority:{serverEpoch:'epoch',generation:3,accessGeneration:2},expectedRoster:{serverEpoch:'epoch',revision:5}}),1);});
it("does not offer unfinished replacement to a nonowner or with another participant",()=>{const s=state(true);ui.update(s);expect((get('[data-puzzle-action="start"]') as HTMLButtonElement).disabled).toBe(true);s.puzzleRoster.memberIds=[self];s.durable.house.ownerId=friend;ui.update(s);expect((get('[data-puzzle-action="start"]') as HTMLButtonElement).disabled).toBe(true);});
it("keeps the complete image viewable after consent clears and gives a descriptive reference",()=>{const s=state();s.durable.puzzle.current.completed=true;s.durable.puzzle.current.placements=art.pieces.map(piece=>({pieceId:piece.id,destination:piece.destination,actorId:friend}));s.puzzleRoster.memberIds=[];ui.update(s);expect(get('[data-puzzle-complete]').hidden).toBe(false);expect(get('[data-puzzle-board]').style.backgroundImage).toContain(art.url);expect(get('[data-puzzle-action="join"]').hidden).toBe(true);click('[data-puzzle-action="reference"]');expect(get('[data-puzzle-reference]').hidden).toBe(false);expect(get('[data-puzzle-reference]').textContent).toContain(art.reference);});
it("isolates puzzle keys from world movement",()=>{ui.update(state(true));const worldKey=vi.fn();dom.window.document.addEventListener('keydown',worldKey);const cell=get('[data-puzzle-destination="0"]');cell.focus();cell.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));expect(worldKey).not.toHaveBeenCalled();expect(dom.window.document.activeElement).toBe(get('[data-puzzle-destination="1"]'));});

it("cancels a destructive confirmation when controller authority changes",()=>{const s=state(true);s.puzzleRoster.memberIds=[self];ui.update(s);click('[data-puzzle-action="start"]');const next=structuredClone(s);next.generation++;ui.update(next);expect(get('[data-puzzle-reset]').hidden).toBe(true);click('[data-puzzle-action="confirm"]');expect(send).not.toHaveBeenCalled();});

it("stops local placement immediately after Leave while the old roster is still visible",()=>{ui.update(state(true));click('[data-puzzle-piece="notebook"]');intent.mockImplementation(()=>new Promise(()=>{}));click('[data-puzzle-action="leave"]');click('[data-puzzle-piece="paper-star"]');click('[data-puzzle-destination="2"]');expect(send).not.toHaveBeenCalled();expect(get('[data-puzzle-piece="paper-star"]').getAttribute('aria-pressed')).toBe('false');});

it("settles a placement flight after Leave without freezing a later explicit participation",async()=>{let finish:any;send.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));ui.update(state(true));click('[data-puzzle-piece="notebook"]');click('[data-puzzle-destination="15"]');click('[data-puzzle-action="leave"]');await tick();const left=state();left.puzzleRoster.memberIds=[];ui.update(left);finish({ok:true});await tick();click('[data-puzzle-action="join"]');await tick();const joined=state(true);joined.puzzleRoster.selfParticipationId='consent-two';ui.update(joined);click('[data-puzzle-piece="paper-star"]');click('[data-puzzle-destination="2"]');expect(send).toHaveBeenCalledTimes(2);});
it("exposes pending durable inspection and preserves uncertain participation copy",async()=>{ui.update(state());intent.mockRejectedValueOnce(Object.assign(new Error('No reply'),{code:'PENDING'}));click('[data-puzzle-action="join"]');await tick();expect(get('[data-puzzle-feedback]').textContent).toContain('uncertain');ui.update(state(),{pendingCount:1});expect(get('[data-puzzle-action="pending"]').hidden).toBe(false);expect((get('[data-puzzle-action="start"]') as HTMLButtonElement).disabled).toBe(true);});
it("keeps saved progress safe when content identity is unavailable",()=>{const s=state(true);s.durable.puzzle.current.illustrationDigest='wrong';ui.update(s);expect(get('[data-puzzle-feedback]').textContent).toContain('version is unavailable');expect(get('[data-puzzle-board]').style.backgroundImage).toBe('none');expect((get('[data-puzzle-action="join"]') as HTMLButtonElement).disabled).toBe(true);});
it("offers cancellation and restores reference focus without propagating Escape",()=>{const s=state(true);s.puzzleRoster.memberIds=[self];ui.update(s);click('[data-puzzle-action="start"]');click('[data-puzzle-action="cancel"]');expect(send).not.toHaveBeenCalled();expect(get('[data-puzzle-reset]').hidden).toBe(true);click('[data-puzzle-action="reference"]');const escape=new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true});get('[data-puzzle-action="close-reference"]').dispatchEvent(escape);expect(get('[data-puzzle-reference]').hidden).toBe(true);expect(dom.window.document.activeElement).toBe(get('[data-puzzle-action="reference"]'));});

it("retains a newer withdrawal through an unjoined snapshot followed by a delayed joined roster",()=>{intent.mockImplementation(()=>new Promise(()=>{}));ui.update(state());click('[data-puzzle-action="join"]');click('[data-puzzle-action="leave"]');pending={mode:'leave',roundId:'round-one',state:'sending',canRetry:false};ui.update(state());ui.update(state(true));click('[data-puzzle-piece="notebook"]');click('[data-puzzle-destination="15"]');expect(send).not.toHaveBeenCalled();expect(get('[data-puzzle-piece="notebook"]').getAttribute('aria-pressed')).toBe('false');});

function finishedState():any{const s=state();s.durable.puzzle.revision=25;s.durable.puzzle.current.completed=true;s.durable.puzzle.current.placements=art.pieces.map(piece=>({pieceId:piece.id,destination:piece.destination,actorId:friend}));s.puzzleRoster.memberIds=[];s.puzzleRoster.selfParticipationId=null;s.puzzleRoster.revision=8;return s;}
it("hides Leave after normal Join, accepted participation and same-round completion",async()=>{ui.update(state());click('[data-puzzle-action="join"]');await tick();ui.update(state(true));expect(get('[data-puzzle-action="leave"]').hidden).toBe(false);ui.update(finishedState());expect(get('[data-puzzle-roster]').textContent).toContain('watching');expect(get('[data-puzzle-roster]').textContent).toContain('0 / 6 active');expect(get('[data-puzzle-action="leave"]').hidden).toBe(true);expect(get('[data-puzzle-action="join"]').hidden).toBe(true);expect((get('[data-puzzle-action="return"]') as HTMLButtonElement).disabled).toBe(false);expect(get('[data-puzzle-complete]').hidden).toBe(false);});
it("a delayed Join ACK after peer completion does not claim participation is still arriving",async()=>{let finish:any;intent.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));ui.update(state());click('[data-puzzle-action="join"]');ui.update(state(true));ui.update(finishedState());finish({ok:true});await tick();expect(get('[data-puzzle-feedback]').textContent).toMatch(/complete/i);expect(get('[data-puzzle-feedback]').textContent).not.toContain('Waiting for current participation');expect(get('[data-puzzle-roster]').textContent).toContain('0 / 6 active');expect(send).not.toHaveBeenCalled();});
it("completed rounds keep original pending retry and immediate Return without an active Leave control",async()=>{ui.update(state());pending={mode:'join',roundId:'round-one',state:'pending',canRetry:true};ui.update(finishedState());expect(get('[data-puzzle-action="leave"]').hidden).toBe(true);expect(get('[data-puzzle-action="retry"]').hidden).toBe(false);expect((get('[data-puzzle-action="retry"]') as HTMLButtonElement).disabled).toBe(false);click('[data-puzzle-action="retry"]');await tick();expect(retry).toHaveBeenCalledOnce();intent.mockImplementationOnce(()=>new Promise(()=>{}));click('[data-puzzle-action="return"]');expect(onReturn).toHaveBeenCalledOnce();expect(intent).toHaveBeenCalledWith('leave','round-one');});

it.each([undefined,'study-seat-1','rest-seat-1'])('spatial requires a real game chair for Start and Join from %s',seatId=>{const s=state();s.players=[{id:self,connected:true,zoneId:'lounge',seatId}];ui.update(s);expect((get('[data-puzzle-action="join"]') as HTMLButtonElement).disabled).toBe(true);click('[data-puzzle-action="join"]');expect(intent).not.toHaveBeenCalled();const fresh=structuredClone(s);fresh.durable.puzzle.current=null;ui.update(fresh);expect((get('[data-puzzle-action="start"]') as HTMLButtonElement).disabled).toBe(true);});

const sixNames=["Alexandria Montgomery","Christopher Williamson","Genevieve Featherstone","Maximilian Worthington","Theodora Nightingale","Sebastian Winterbourne"];
function sixPicture(){
 const s=state(true),ids=sixNames.map((_,index)=>"00000000-0000-4000-8000-"+String(index+1).padStart(12,"0"));
 s.durable.selfId=ids[5];s.durable.house={id:"00000000-0000-4000-8000-000000000090",ownerId:ids[0],capacity:6};
 s.durable.residents=ids.map((id,index)=>({id,name:sixNames[index],slot:index,bedroomId:"room-"+index,open:false,colour:"sage",revision:1}));
 s.players=ids.map((id,index)=>({id,connected:true,zoneId:"lounge",seatId:"game-seat-"+(index+1),seatGeneration:index+1}));
 s.puzzleRoster.memberIds=ids;s.puzzleRoster.selfParticipationId="00000000-0000-4000-8000-000000000091";s.puzzleRoster.revision=7;
 s.durable.puzzle.revision=7;s.durable.puzzle.current.id="00000000-0000-4000-8000-000000000092";s.puzzleRoster.roundId=s.durable.puzzle.current.id;s.durable.puzzle.current.placements=art.pieces.slice(0,6).map((piece,index)=>({pieceId:piece.id,destination:piece.destination,actorId:ids[index]}));return s;
}
function capacityPicture(capacity:number){
 const s=sixPicture(),residents=[...s.durable.residents.slice(0,capacity-1),s.durable.residents.at(-1)];
 s.durable.house.capacity=capacity;s.durable.residents=residents.map((resident,index)=>({...resident,slot:index}));s.players=residents.map((resident,index)=>({...s.players.find((player:{id:string})=>player.id===resident.id),seatId:"game-seat-"+(index+1)}));s.puzzleRoster.memberIds=residents.map(resident=>resident.id);
 s.durable.puzzle.current.placements=art.pieces.slice(0,capacity).map((piece,index)=>({pieceId:piece.id,destination:piece.destination,actorId:residents[index].id}));return s;
}
it.each([2,3,4,5,6])("picture capacity %i counts only the permanent house's matching game chairs",capacity=>{
 const s=capacityPicture(capacity);ui.update(s);expect(s.players).toHaveLength(capacity);expect(s.puzzleRoster.memberIds).toHaveLength(capacity);expect(s.players.every((player:{seatId:string})=>Number(player.seatId.split("-").at(-1))<=capacity)).toBe(true);
 expect(get("[data-puzzle-roster]").textContent).toContain(capacity+" / "+capacity+" active");expect(host.querySelectorAll("[data-puzzle-player-id]")).toHaveLength(capacity);expect(intent).not.toHaveBeenCalled();
});
it.each([undefined,1,7,2.5,"2"])("picture capacity unavailable or invalid %s falls back to six",capacity=>{
 const s=capacityPicture(2);s.durable.house.capacity=capacity;ui.update(s);expect(get("[data-puzzle-roster]").textContent).toContain("2 / 6 active");
});
it("picture phone six keeps status/count upfront and all names in a closed labelled disclosure",()=>{
 const s=sixPicture();ui.update(s);const menu=get("[data-puzzle-menu]") as HTMLDetailsElement,summary=get("[data-puzzle-menu-summary]");
 expect(menu).toBeTruthy();expect(menu.open).toBe(false);expect(summary.tagName).toBe("SUMMARY");expect(summary.textContent).toContain("Players");
 expect(get("[data-puzzle-roster]").textContent).toContain("You joined");expect(get("[data-puzzle-roster]").textContent).toContain("6 / 6 active");
 for(const name of sixNames){expect(get("[data-puzzle-roster]").textContent).not.toContain(name);expect(get("[data-puzzle-players]").textContent).toContain(name);}
 expect(host.querySelectorAll("[data-puzzle-player-id]")).toHaveLength(6);expect(get("[data-puzzle-progress]").textContent).toBe("6 / 24 placed");
 expect(host.querySelectorAll("[data-puzzle-destination]")).toHaveLength(24);expect([...host.querySelectorAll<HTMLElement>("[data-puzzle-piece]")].filter(item=>!item.hidden)).toHaveLength(12);
 expect(intent).not.toHaveBeenCalled();expect(send).not.toHaveBeenCalled();
});
it("picture phone six promotes Leave and keeps disabled unfinished replacement and Return inside options",()=>{
 ui.update(sixPicture());const menu=get("[data-puzzle-menu]");
 expect(get('[data-puzzle-action="leave"]').closest("[data-puzzle-menu]")).toBeNull();expect(get('[data-puzzle-action="leave"]').hidden).toBe(false);
 expect(menu.contains(get('[data-puzzle-action="start"]'))).toBe(true);expect((get('[data-puzzle-action="start"]') as HTMLButtonElement).disabled).toBe(true);
 expect(menu.contains(get('[data-puzzle-action="return"]'))).toBe(true);expect((get('[data-puzzle-action="return"]') as HTMLButtonElement).disabled).toBe(false);
});
it("picture phone six keeps primary Start/Join/Leave node identity and explicit consent across phases",()=>{
 const s=sixPicture(),startButton=get('[data-puzzle-action="start"]');s.durable.puzzle.current=null;s.puzzleRoster.roundId=null;s.puzzleRoster.memberIds=[];s.puzzleRoster.selfParticipationId=null;ui.update(s);
 expect(get("[data-puzzle-primary]").contains(startButton)).toBe(true);expect(startButton.hidden).toBe(false);
 const watch=sixPicture();watch.puzzleRoster.memberIds=watch.puzzleRoster.memberIds.slice(0,5);watch.puzzleRoster.selfParticipationId=null;ui.update(watch);
 expect(get("[data-puzzle-primary]").contains(get('[data-puzzle-action="join"]'))).toBe(true);expect(get('[data-puzzle-action="join"]').hidden).toBe(false);
 ui.update(sixPicture());expect(get("[data-puzzle-primary]").contains(get('[data-puzzle-action="leave"]'))).toBe(true);expect(get('[data-puzzle-action="start"]')).toBe(startButton);
 click('[data-puzzle-action="next"]');expect(get("[data-puzzle-page]").textContent).toContain("2 of 2");expect([...host.querySelectorAll<HTMLElement>("[data-puzzle-piece]")].filter(item=>!item.hidden)).toHaveLength(12);
 expect(intent).not.toHaveBeenCalled();expect(send).not.toHaveBeenCalled();
});
it("picture phone six preserves disclosure and focus through ordinary roster/name updates without parsing names as HTML",()=>{
 const s=sixPicture();ui.update(s);const menu=get("[data-puzzle-menu]") as HTMLDetailsElement,summary=get("[data-puzzle-menu-summary]");menu.open=true;summary.focus();
 const next=structuredClone(s);next.durable.residents[0].name="<img src=x onerror=alert(1)>";next.puzzleRoster.memberIds=next.puzzleRoster.memberIds.slice(0,5);next.puzzleRoster.revision++;ui.update(next);
 expect(get("[data-puzzle-menu]")).toBe(menu);expect(menu.open).toBe(true);expect(dom.window.document.activeElement).toBe(summary);expect(host.querySelectorAll("[data-puzzle-player-id]")).toHaveLength(5);
 expect(get("[data-puzzle-players]").textContent).toContain("<img src=x onerror=alert(1)>");expect(get("[data-puzzle-players]").querySelector("img")).toBeNull();
});
it("picture phone six Escape closes options and returns focus before outer game handling",()=>{
 ui.update(sixPicture());const menu=get("[data-puzzle-menu]") as HTMLDetailsElement;menu.open=true;const outer=vi.fn();dom.window.document.addEventListener("keydown",outer);
 const close=get('[data-puzzle-action="close-menu"]');close.focus();close.dispatchEvent(new dom.window.KeyboardEvent("keydown",{key:"Escape",bubbles:true,cancelable:true}));
 expect(menu.open).toBe(false);expect(dom.window.document.activeElement).toBe(get("[data-puzzle-menu-summary]"));expect(outer).not.toHaveBeenCalled();
 get("[data-puzzle-menu-summary]").dispatchEvent(new dom.window.KeyboardEvent("keydown",{key:"Escape",bubbles:true,cancelable:true}));expect(outer).toHaveBeenCalledOnce();
});
it.each(["round","context","cleared"])("picture phone six closes disclosure on %s boundaries",boundary=>{
 const s=sixPicture();ui.update(s);const menu=get("[data-puzzle-menu]") as HTMLDetailsElement;menu.open=true;
 const next=structuredClone(s);if(boundary==="round"){next.durable.puzzle.current.id="new-round";next.puzzleRoster.roundId="new-round";}else next.generation++;
 ui.update(boundary==="cleared"?null:next);expect(menu.open).toBe(false);if(boundary==="cleared")expect(host.querySelectorAll("[data-puzzle-player-id]")).toHaveLength(0);
});
it("picture phone six keeps original participation recovery discoverable and Return immediately withdraws",()=>{
 const s=sixPicture();ui.update(s);pending={mode:"join",roundId:s.durable.puzzle.current.id,state:"pending",canRetry:true};ui.update(sixPicture(),{pendingCount:1});
 expect(get("[data-puzzle-menu-summary]").getAttribute("aria-label")).toMatch(/pending/i);expect(get("[data-puzzle-menu-alert]").hidden).toBe(false);
 (get("[data-puzzle-menu]") as HTMLDetailsElement).open=true;click('[data-puzzle-action="retry"]');expect(retry).toHaveBeenCalledOnce();click('[data-puzzle-action="return"]');
 expect(onReturn).toHaveBeenCalledOnce();expect(intent).toHaveBeenCalledWith("leave",s.durable.puzzle.current.id);expect(send).not.toHaveBeenCalled();
});
it("picture phone six CSS preserves44px targets and places bounded options outside normal gameplay flow",()=>{
 const style=dom.window.document.createElement("style");style.textContent=readFileSync(new URL("../public/house.css",import.meta.url),"utf8");dom.window.document.head.append(style);
 const panel=dom.window.document.createElement("aside");panel.className="panel";panel.dataset.tool="game";panel.dataset.breakActivity="picture";host.replaceWith(panel);panel.append(host);ui.update(sixPicture());
 for(const item of [get("[data-puzzle-menu-summary]"),get('[data-puzzle-action="reference"]'),get('[data-puzzle-action="chat"]'),get('[data-puzzle-action="leave"]'),get('[data-puzzle-action="previous"]'),get('[data-puzzle-action="next"]'),get('[data-puzzle-destination="0"]'),get('[data-puzzle-piece="notebook"]')]){
  const css=dom.window.getComputedStyle(item);expect(Number.parseFloat(css.minHeight)).toBeGreaterThanOrEqual(44);expect(Number.parseFloat(css.minWidth)).toBeGreaterThanOrEqual(44);
 }
 expect(dom.window.getComputedStyle(get("[data-puzzle-menu-body]")).position).toBe("absolute");expect(dom.window.getComputedStyle(get("[data-puzzle-menu-scroll]")).overflowY).toBe("auto");
});
it("picture phone six menu anchors its first toolbar column to the left at all widths",()=>{
 const style=dom.window.document.createElement("style");style.textContent=readFileSync(new URL("../public/house.css",import.meta.url),"utf8");dom.window.document.head.append(style);ui.update(sixPicture());
 const menu=get("[data-puzzle-menu]");expect(get(".puzzle-toolbar").firstElementChild).toBe(menu);expect(dom.window.getComputedStyle(menu).position).toBe("relative");
 const css=dom.window.getComputedStyle(get("[data-puzzle-menu-body]"));expect(css.left).toBe("0px");expect(css.right).toBe("auto");expect(Number.parseFloat(css.width)).toBeLessThanOrEqual(Math.min(340,dom.window.innerWidth-52));expect(css.overflow).toBe("hidden");expect(css.maxHeight).toContain("60dvh");
});
it("picture phone six keeps Close outside the independently scrolling player and action region",()=>{
 const style=dom.window.document.createElement("style");style.textContent=readFileSync(new URL("../public/house.css",import.meta.url),"utf8");dom.window.document.head.append(style);ui.update(sixPicture());
 const body=get("[data-puzzle-menu-body]"),scroll=get("[data-puzzle-menu-scroll]"),heading=get(".puzzle-menu-heading"),close=get('[data-puzzle-action="close-menu"]');expect(scroll).toBeTruthy();expect(heading.parentElement).toBe(body);expect(scroll.parentElement).toBe(body);expect(scroll.contains(close)).toBe(false);expect(heading.contains(close)).toBe(true);
 for(const selector of ["[data-puzzle-players]",'[data-puzzle-action="start"]','[data-puzzle-action="return"]','[data-puzzle-action="retry"]','[data-puzzle-action="pending"]'])expect(scroll.contains(get(selector))).toBe(true);
 const bodyCSS=dom.window.getComputedStyle(body),scrollCSS=dom.window.getComputedStyle(scroll),headerCSS=dom.window.getComputedStyle(heading);expect(bodyCSS.display).toBe("flex");expect(bodyCSS.flexDirection).toBe("column");expect(bodyCSS.overflow).toBe("hidden");expect(scrollCSS.overflowY).toBe("auto");expect(scrollCSS.minHeight).toBe("0px");expect(headerCSS.position).toBe("static");expect(headerCSS.flexShrink).toBe("0");expect(Number.parseFloat(dom.window.getComputedStyle(close).minHeight)).toBeGreaterThanOrEqual(44);
});
it("picture phone six opens native Players and options and Close restores its summary focus",()=>{
 ui.update(sixPicture());const menu=get("[data-puzzle-menu]") as HTMLDetailsElement,summary=get("[data-puzzle-menu-summary]");summary.click();expect(menu.open).toBe(true);
 click('[data-puzzle-action="close-menu"]');expect(menu.open).toBe(false);expect(dom.window.document.activeElement).toBe(summary);expect(intent).not.toHaveBeenCalled();expect(send).not.toHaveBeenCalled();
});
it("picture phone six cancelling replacement restores its original options control and focus",()=>{
 const s=sixPicture();s.durable.selfId=s.durable.house.ownerId;s.puzzleRoster.memberIds=[s.durable.selfId];ui.update(s);const menu=get("[data-puzzle-menu]") as HTMLDetailsElement;menu.open=true;
 click('[data-puzzle-action="start"]');expect(menu.open).toBe(false);expect(get("[data-puzzle-reset]").hidden).toBe(false);click('[data-puzzle-action="cancel"]');
 expect(menu.open).toBe(true);expect(dom.window.document.activeElement).toBe(get('[data-puzzle-action="start"]'));expect(send).not.toHaveBeenCalled();expect(intent).not.toHaveBeenCalled();
});
it("picture phone six context reset moves focus out of the now-closed disclosure",()=>{
 const s=sixPicture();ui.update(s);const menu=get("[data-puzzle-menu]") as HTMLDetailsElement;menu.open=true;get('[data-puzzle-action="close-menu"]').focus();
 const next=structuredClone(s);next.accessGeneration++;ui.update(next);expect(menu.open).toBe(false);expect(dom.window.document.activeElement).toBe(get("[data-puzzle-menu-summary]"));
});
it("picture phone six new round hands focused primary Start to exposed Join without joining",()=>{
 const initial=sixPicture();initial.durable.puzzle.current=null;initial.puzzleRoster.roundId=null;initial.puzzleRoster.memberIds=[];initial.puzzleRoster.selfParticipationId=null;ui.update(initial);
 const start=get('[data-puzzle-action="start"]');start.focus();const next=sixPicture();next.puzzleRoster.memberIds=next.puzzleRoster.memberIds.slice(0,5);next.puzzleRoster.selfParticipationId=null;ui.update(next);
 expect(get("[data-puzzle-menu]").contains(start)).toBe(true);expect((get("[data-puzzle-menu]") as HTMLDetailsElement).open).toBe(false);
 expect(dom.window.document.activeElement).toBe(get('[data-puzzle-action="join"]'));expect(intent).not.toHaveBeenCalled();expect(send).not.toHaveBeenCalled();
});
it("picture phone six new round uses summary focus when the exposed Join is unavailable",()=>{
 const initial=sixPicture();initial.durable.puzzle.current=null;initial.puzzleRoster.roundId=null;initial.puzzleRoster.memberIds=[];initial.puzzleRoster.selfParticipationId=null;ui.update(initial);get('[data-puzzle-action="start"]').focus();
 const next=sixPicture();next.puzzleRoster.memberIds=next.puzzleRoster.memberIds.slice(0,5);next.puzzleRoster.selfParticipationId=null;next.controller=false;ui.update(next);
 expect((get('[data-puzzle-action="join"]') as HTMLButtonElement).disabled).toBe(true);expect(dom.window.document.activeElement).toBe(get("[data-puzzle-menu-summary]"));expect(intent).not.toHaveBeenCalled();
});
it("picture phone six sending Join exposes one clear cancel action before a transport pending object exists",async()=>{
 const s=sixPicture();s.puzzleRoster.memberIds=s.puzzleRoster.memberIds.slice(0,5);s.puzzleRoster.selfParticipationId=null;ui.update(s);let finish:any;intent.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));click('[data-puzzle-action="join"]');
 const primary=[...get("[data-puzzle-primary]").querySelectorAll<HTMLButtonElement>("button")].filter(item=>!item.hidden);expect(primary).toEqual([get('[data-puzzle-action="leave"]')]);expect(primary[0].textContent).toBe("Cancel joining");
 expect(get("[data-puzzle-roster]").textContent).toContain("watching");expect(get("[data-puzzle-roster]").textContent).toMatch(/join pending/i);expect(retry).not.toHaveBeenCalled();
 finish({ok:true});await tick();expect(get("[data-puzzle-roster]").textContent).not.toContain("You joined");ui.update(sixPicture());expect(get('[data-puzzle-action="leave"]').textContent).toBe("Leave picture");expect(intent).toHaveBeenCalledOnce();
});
it("picture phone six uncertain Join keeps explicit original Retry in options and one upfront cancel",async()=>{
 const s=sixPicture();s.puzzleRoster.memberIds=s.puzzleRoster.memberIds.slice(0,5);s.puzzleRoster.selfParticipationId=null;pending={mode:"join",roundId:s.durable.puzzle.current.id,state:"pending",canRetry:true};ui.update(s);
 expect([...get("[data-puzzle-primary]").querySelectorAll<HTMLButtonElement>("button")].filter(item=>!item.hidden)).toEqual([get('[data-puzzle-action="leave"]')]);expect(get('[data-puzzle-action="leave"]').textContent).toBe("Cancel joining");
 expect(get("[data-puzzle-roster]").textContent).toMatch(/join pending/i);expect(get("[data-puzzle-menu-summary]").getAttribute("aria-label")).toMatch(/pending/i);expect(get("[data-puzzle-menu-alert]").hidden).toBe(false);expect(retry).not.toHaveBeenCalled();expect(intent).not.toHaveBeenCalled();
 get("[data-puzzle-menu-summary]").click();expect((get("[data-puzzle-menu]") as HTMLDetailsElement).open).toBe(true);expect(get('[data-puzzle-action="retry"]').textContent).toBe("Retry original join");click('[data-puzzle-action="retry"]');await tick();expect(retry).toHaveBeenCalledOnce();expect(intent).not.toHaveBeenCalled();expect(get("[data-puzzle-roster]").textContent).not.toContain("You joined");
 click('[data-puzzle-action="leave"]');expect(intent).toHaveBeenCalledWith("leave",s.durable.puzzle.current.id);expect(onLeave).toHaveBeenCalledOnce();expect(send).not.toHaveBeenCalled();
});
it("picture phone six durable pending keeps visible uncertainty, Leave and labelled draft inspection",()=>{
 const s=sixPicture();ui.update(s,{pendingCount:1});expect(get("[data-puzzle-roster]").textContent).toMatch(/save pending/i);expect(get("[data-puzzle-menu-alert]").hidden).toBe(false);
 expect([...get("[data-puzzle-primary]").querySelectorAll<HTMLButtonElement>("button")].filter(item=>!item.hidden)).toEqual([get('[data-puzzle-action="leave"]')]);expect(get('[data-puzzle-action="leave"]').textContent).toBe("Leave picture");
 get("[data-puzzle-menu-summary]").click();expect(get('[data-puzzle-action="pending"]').hidden).toBe(false);expect(get("[data-puzzle-menu]").contains(get('[data-puzzle-action="pending"]'))).toBe(true);expect(get('[data-puzzle-action="pending"]').textContent).toMatch(/pending.*action/i);
 click('[data-puzzle-piece="notebook"]');click('[data-puzzle-destination="15"]');expect(send).not.toHaveBeenCalled();expect(intent).not.toHaveBeenCalled();expect(get('[data-puzzle-destination="15"]').getAttribute("aria-disabled")).toBe("true");
});
it("picture phone six landscape status and toolbar wrap as readable units rather than squeezing status",()=>{
 const style=dom.window.document.createElement("style");style.textContent=readFileSync(new URL("../public/house.css",import.meta.url),"utf8");dom.window.document.head.append(style);ui.update(sixPicture());
 expect(dom.window.getComputedStyle(get(".puzzle-top")).flexWrap).toBe("wrap");expect(dom.window.getComputedStyle(get("[data-puzzle-roster]")).flexShrink).toBe("0");expect(dom.window.getComputedStyle(get("[data-puzzle-roster]")).whiteSpace).toBe("nowrap");
});
it("picture phone six sending Join hands keyboard focus to its exposed cancel control",()=>{
 const s=sixPicture();s.puzzleRoster.memberIds=s.puzzleRoster.memberIds.slice(0,5);s.puzzleRoster.selfParticipationId=null;ui.update(s);intent.mockImplementationOnce(()=>new Promise(()=>{}));
 get('[data-puzzle-action="join"]').focus();click('[data-puzzle-action="join"]');expect(dom.window.document.activeElement).toBe(get('[data-puzzle-action="leave"]'));expect(intent).toHaveBeenCalledOnce();
});
it("picture phone six definitive Join rejection restores deliberate Join without retrying",async()=>{
 const s=sixPicture();s.puzzleRoster.memberIds=s.puzzleRoster.memberIds.slice(0,5);s.puzzleRoster.selfParticipationId=null;ui.update(s);intent.mockRejectedValueOnce(Object.assign(new Error("Sit in an activity chair first."),{code:"ACTIVITY_SEAT_REQUIRED"}));
 get('[data-puzzle-action="join"]').focus();click('[data-puzzle-action="join"]');await tick();expect(get('[data-puzzle-action="join"]').hidden).toBe(false);expect(get('[data-puzzle-action="leave"]').hidden).toBe(true);expect(dom.window.document.activeElement).toBe(get('[data-puzzle-action="join"]'));expect(get("[data-puzzle-roster]").textContent).not.toMatch(/join pending/i);expect(get("[data-puzzle-feedback]").textContent).toContain("Sit in an activity chair");expect(intent).toHaveBeenCalledOnce();expect(retry).not.toHaveBeenCalled();
});
it("picture activation accepted Join then same-round completion clears inferred pending status",async()=>{
 const watch=sixPicture();watch.puzzleRoster.memberIds=watch.puzzleRoster.memberIds.slice(0,5);watch.puzzleRoster.selfParticipationId=null;ui.update(watch);click('[data-puzzle-action="join"]');await tick();ui.update(sixPicture());
 const complete=sixPicture();complete.durable.puzzle.current.completed=true;complete.puzzleRoster.memberIds=[];complete.puzzleRoster.selfParticipationId=null;ui.update(complete);
 expect(get("[data-puzzle-roster]").textContent).toContain("watching");expect(get("[data-puzzle-roster]").textContent).not.toMatch(/pending/i);expect(get("[data-puzzle-menu-alert]").hidden).toBe(true);expect(get("[data-puzzle-menu-summary]").getAttribute("aria-label")).not.toMatch(/pending/i);expect(get('[data-puzzle-action="leave"]').hidden).toBe(true);
});
it("picture activation completion preserves an actual uncertain original Join",()=>{
 const complete=sixPicture();complete.durable.puzzle.current.completed=true;complete.puzzleRoster.memberIds=[];complete.puzzleRoster.selfParticipationId=null;pending={mode:"join",roundId:complete.durable.puzzle.current.id,state:"pending",canRetry:true};ui.update(complete);
 expect(get("[data-puzzle-roster]").textContent).toMatch(/join pending/i);expect(get("[data-puzzle-menu-alert]").hidden).toBe(false);expect(get('[data-puzzle-action="retry"]').hidden).toBe(false);expect(retry).not.toHaveBeenCalled();expect(intent).not.toHaveBeenCalled();
});
function readyToStart(){
 const s=sixPicture();s.durable.puzzle.current=null;s.puzzleRoster.roundId=null;s.puzzleRoster.memberIds=[];s.puzzleRoster.selfParticipationId=null;return s;
}
function watchingSix(){
 const s=sixPicture();s.puzzleRoster.memberIds=s.puzzleRoster.memberIds.slice(0,5);s.puzzleRoster.selfParticipationId=null;return s;
}
it.each(["before","after"])("picture activation keeps an exposed focus anchor then hands off after snapshot %s Start ACK",async order=>{
 let finish:any;send.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));ui.update(readyToStart());const start=get('[data-puzzle-action="start"]');start.focus();start.click();
 expect(send).toHaveBeenCalledOnce();expect(send).toHaveBeenCalledWith("puzzle.start",expect.objectContaining({expectedRoundId:null}),7);expect((start as HTMLButtonElement).disabled).toBe(true);expect(dom.window.document.activeElement).toBe(get("[data-puzzle-menu-summary]"));
 ui.update(readyToStart());expect(dom.window.document.activeElement).toBe(get("[data-puzzle-menu-summary]"));if(order==="after"){finish({ok:true});await tick();}
 ui.update(watchingSix());expect(dom.window.document.activeElement).toBe(get('[data-puzzle-action="join"]'));expect(intent).not.toHaveBeenCalled();if(order==="before"){finish({ok:true});await tick();}expect(dom.window.document.activeElement).toBe(get('[data-puzzle-action="join"]'));
});
it.each(["chat","reference","options","outside"])("picture activation never takes focus back after choosing %s",choice=>{
 send.mockImplementationOnce(()=>new Promise(()=>{}));ui.update(readyToStart());get('[data-puzzle-action="start"]').focus();click('[data-puzzle-action="start"]');
 if(choice==="outside"){const outside=dom.window.document.createElement("button");outside.textContent="Other task";dom.window.document.body.append(outside);outside.focus();}
 else{const control=get(choice==="options"?"[data-puzzle-menu-summary]":'[data-puzzle-action="'+choice+'"]');control.focus();control.click();}
 const chosen=dom.window.document.activeElement;ui.update(watchingSix());expect(dom.window.document.activeElement).toBe(chosen);expect(dom.window.document.activeElement).not.toBe(get('[data-puzzle-action="join"]'));expect(intent).not.toHaveBeenCalled();expect(send).toHaveBeenCalledOnce();
});
it("picture activation does not hand off after leaving or a context change",()=>{
 send.mockImplementation(()=>new Promise(()=>{}));ui.update(readyToStart());get('[data-puzzle-action="start"]').focus();click('[data-puzzle-action="start"]');ui.leave();ui.update(watchingSix());expect(dom.window.document.activeElement).not.toBe(get('[data-puzzle-action="join"]'));expect(onLeave).toHaveBeenCalledOnce();
 const initial=readyToStart();ui.update(initial);get('[data-puzzle-action="start"]').focus();click('[data-puzzle-action="start"]');const changed=readyToStart();changed.generation++;changed.durable.selfId=changed.durable.residents[0].id;ui.update(changed);const arrival=watchingSix();arrival.generation=changed.generation;arrival.durable.selfId=changed.durable.selfId;ui.update(arrival);expect(dom.window.document.activeElement).not.toBe(get('[data-puzzle-action="join"]'));expect(intent).not.toHaveBeenCalled();
});
it("picture activation a definitive Start rejection cannot claim a later round's focus",async()=>{
 let reject:any;send.mockImplementationOnce(()=>new Promise((_,fail)=>{reject=fail;}));ui.update(readyToStart());get('[data-puzzle-action="start"]').focus();click('[data-puzzle-action="start"]');reject(Object.assign(new Error("Start rejected."),{code:"PUZZLE_STALE_ROUND"}));await tick();const chosen=dom.window.document.activeElement;ui.update(watchingSix());expect(dom.window.document.activeElement).toBe(chosen);expect(intent).not.toHaveBeenCalled();
});
