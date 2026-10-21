import { createHouseClient, createPendingInspector } from "./house-client.js";
import { createHouseGameUI } from "./house-game-ui.js";
import { createHouseWorld } from "./house-world.js";
import { ROOM_PRESETS, getRoomPreset } from "./house-room-content.js";
import { validatePlacements, footprint } from "./house-geometry.js";
import { createMovableWindow, createModalFocus } from "./house-shell.js";
const $ = id => document.getElementById(id);
function setPlaceLabel(text){const label=$("place-label");label.textContent=text;label.title=text;}
setPlaceLabel($("place-label").textContent||"");
const HUD_SAFE_SELECTOR=".world-status,#resident-disclosure,.availability,#camera-hud,.toolbelt,#chat-window,.movement,#game-table-status,.touch-toggle,.context-hint,#panel,#notice,#takeover";
let live = null, me = null, world = null, client = null, activePanel = null;
let voiceDraft=null,updateRecovery=null,voicePendingRows=[],voicePendingScope="",voicePendingError="";
let cardDirty = false, cardBase = null, cardProjection=null, roomDraft = null, suspendedDrafts = null;
let lastScope="", lastIdentityScope="", lastHouseKey="", inspector=null, pendingRequest=0, privacyGeneration=0,bootstrapRequest=0,keyIssuance=null;
const unreadStreams=new Map();
let adminRequest=0,safeAreaFrame=null;
let lastDurableKey = "", noticeTimer, chatVersion=0, cardVersion=0, checkingMembership=false;
const pending = new Map(), pendingZones = new Map(), saveFlights = new Set();
let entered=false,embeddedFrame=null,embeddedContext="",boardLauncher=null;
let gamePendingRows=[],gamePendingRequest=0,gameRefreshKey="",plannedPlace=null;
const gameUI=createHouseGameUI($("game-panel"),{send:sendGame,resolveJoin:retryOriginalGameJoin,onLeave:closePanel,onReturn:()=>openPanel("board"),onPending:()=>openPanel("pending"),onError:message=>{if(activePanel!=="game")notice(message,true);}});
const panelFocus=createModalFocus($("panel")),boardFocus=createModalFocus($("board-workspace"));
const chatWindow=createMovableWindow({window,element:$("chat-window"),handle:$("chat-handle"),body:$("chat-body"),collapse:$("chat-collapse"),resize:$("chat-resize"),onChange:state=>{if(state.shown&&!state.collapsed&&chatReadable())markChatRead();queueSafeArea();}});
let reducedMotion=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches||false;
try{const saved=window.localStorage.getItem("night-neighbourhood.reduced-motion");if(saved!==null)reducedMotion=saved==="true";}catch{/* A blocked preference store does not block play. */}
$("reduced-motion").checked=reducedMotion;document.body.dataset.reducedMotion=String(reducedMotion);
function setShellInert(){const modal=Boolean(embeddedFrame||activePanel&&!["room","game"].includes(activePanel));for(const id of ["world","game-controls","entry","chat-window"])$(id).inert=modal;}
function renderTitle(){
 $("lobby-export").hidden=!me?.archiveCount;$("archive-count").hidden=!me?.archiveCount;$("archive-count").textContent=me?.archiveCount?me.archiveCount+" private room archive"+(me.archiveCount===1?"":"s")+" available in your download.":"";
 entered=false;$("title-screen").hidden=false;$("lobby").hidden=true;$("game-controls").hidden=true;document.body.dataset.screen="title";
 $("title-continue").hidden=!me?.home;$("title-create").disabled=Boolean(me?.home);$("title-join").disabled=Boolean(me?.home);
 $("title-status").textContent=me?.home?"Your saved home is ready.":"Create a house, or use a friend’s house code.";applyInput();
}
function openAdmission(kind){if(me?.home){notice("Continue your saved home first. House settings includes leaving it.");return;}$("title-screen").hidden=true;$("lobby").hidden=false;$("admission-title").textContent=kind==="create"?"Create your house":"Join your friends";$("create-form").hidden=kind!=="create";$("join-form").hidden=kind!=="join";$("name").focus();document.body.dataset.screen="admission";applyInput();}
function closeBoard(){if(!embeddedFrame)return;embeddedFrame.remove();embeddedFrame=null;embeddedContext="";$("board-workspace").hidden=true;$("board-status").textContent="";setShellInert();applyInput();boardFocus.close();if(boardLauncher?.isConnected&&!boardLauncher.closest("[hidden]"))boardLauncher.focus();boardLauncher=null;queueSafeArea();}
function openBoard(){if(!live){notice("Waiting for the house connection.");return;}closePanel();chatWindow.close();boardLauncher=document.activeElement;embeddedContext=privateContext();embeddedFrame=document.createElement("iframe");embeddedFrame.id="board-frame";embeddedFrame.title="Collaborative shared board";embeddedFrame.src="/board/?embedded=1";const ownedFrame=embeddedFrame;embeddedFrame.addEventListener("load",()=>{if(embeddedFrame===ownedFrame&&embeddedContext===privateContext())$("board-status").textContent="House-wide workspace";});$("board-frame-host").replaceChildren(embeddedFrame);$("board-workspace").hidden=false;$("board-status").textContent="Opening the shared workspace…";setShellInert();applyInput();boardFocus.open(boardLauncher);}

const RETAIN_INTENT_CODES=new Set(["TIMEOUT","PENDING","STORAGE_UNAVAILABLE","NOT_CONTROLLER","STALE_ZONE","CLOSED","IDENTITY_CHANGED","INSPECTION_REQUIRED","CLIENT_UPDATE_REQUIRED"]);
function node(tag, text, className) { const e=document.createElement(tag); if(text!==undefined)e.textContent=text; if(className)e.className=className; return e; }
function notice(message,persistent=false){
 clearTimeout(noticeTimer);const target=activePanel?$("panel-feedback"):!$("title-screen").hidden?$("title-feedback"):!$("lobby").hidden?$("lobby-feedback"):$("notice");for(const id of ["notice","panel-feedback","lobby-feedback","title-feedback"])$(id).hidden=true;target.textContent=message;target.hidden=false;queueSafeArea();
 if(!persistent)noticeTimer=setTimeout(()=>{target.hidden=true;queueSafeArea();},6500);
}
async function api(path, body) {
 const abort=new AbortController();let timer;
 const request=(async()=>{
  const response=await fetch(path,{signal:abort.signal,...(body===undefined?{cache:"no-store"}:{method:"POST",headers:{"Content-Type":"application/json",...((live?.durable.selfId||me?.identity.id)?{"X-House-Identity":live?.durable.selfId||me.identity.id}:{})},body:JSON.stringify(body)})});
  const result=await response.json();if(!response.ok){const error=new Error(result.message||"The house is temporarily unavailable.");error.code=result.code;throw error;}return result;
 })();
 try{return await Promise.race([request,new Promise((_,reject)=>{timer=setTimeout(()=>{abort.abort();const error=new Error("The reply did not arrive. This action is pending, not confirmed saved. Keep its original draft for retry.");error.code="TIMEOUT";reject(error);},8000);})]);}
 finally{clearTimeout(timer);}
}
function command(type,payload,expectedRevision) { return {commandId:crypto.randomUUID(),type,payload,...(live?{houseId:live.durable.house.id}:{}),...(expectedRevision===undefined?{}:{expectedRevision})}; }
async function save(type,payload,expectedRevision) {
 if(!live?.controller)throw Object.assign(new Error("Take control in this tab before saving."),{code:"NOT_CONTROLLER"});
 if(type.startsWith("game.")&&type!=="game.leave"&&gamePendingIntents().length)throw Object.assign(new Error("A game action is pending, not confirmed saved. Inspect Pending drafts before another game action. Leave and Return remain available."),{code:"PENDING"});
 const key=JSON.stringify([live.durable.house.id,live.durable.selfId,type,payload,expectedRevision]);
 if(pending.has(key)&&pendingZones.get(key)!==live.durable.zoneId)throw Object.assign(new Error("This pending action belongs to its original room. Return there or inspect Pending drafts to retry the original action."),{code:"STALE_ZONE"});
 const intent=pending.get(key)||command(type,payload,expectedRevision);pending.set(key,intent);pendingZones.set(key,live.durable.zoneId);saveFlights.add(intent.commandId);
 try {
  const result=await client.command(intent);pending.delete(key);pendingZones.delete(key);
  if(!type.startsWith("house.")){for(let n=0;n<30;n++){const cursor=type.startsWith("card.")?workCursor():live?.durable;if(cursor?.streamId===result.streamId&&cursor.sequence>=result.sequence)break;await new Promise(resolve=>setTimeout(resolve,50));}}
  return result;
 } catch(error) {
  if(error.code&&!RETAIN_INTENT_CODES.has(error.code)){pending.delete(key);pendingZones.delete(key);}
  throw error;
 } finally {saveFlights.delete(intent.commandId);if(type.startsWith("game."))void refreshGamePending();if(activePanel==="pending")void protectedAction(renderPending)();}
}
function showConnectionLimit(error){
 if(!["LOAD_LIMIT","TAB_LIMIT"].includes(error.code))return false;
 $("connection-status").textContent=error.code==="TAB_LIMIT"?"Too many house windows":"House connection limit";
 $("connection-limit-pending").hidden=false;
 notice((error.message||"Another connection cannot open right now.")+" Close an unused house window, then reload this page. Your saved house and pending drafts remain.",true);
 return true;
}
function protectedAction(fn) {return async event=>{event?.preventDefault?.();const context=privateContext();try{await fn(event);}catch(error){if(context!==privateContext())return;if(error.code==="IDENTITY_CHANGED"){invalidateIdentityView();try{await bootstrap();}catch(refreshError){notice(refreshError.message,true);return;}}if(!showConnectionLimit(error))notice(error.message||"That action could not be completed.",true);}};}
function workCursor(){return live?.durable.ownWork??(live?.durable.zoneId==="lounge"?live.durable:null);}
function currentCard(){if(!live)return null;return live.durable.ownWork?live.durable.ownWork.card:live.durable.cards.find(card=>card.authorId===live.durable.selfId&&card.state==="active")||null;}
function effectiveCard(){
 let card=currentCard();const cursor=workCursor();
 if(cardProjection){
  if(cardProjection.scope!==identityScope(live))cardProjection=null;
  else if(cursor?.streamId===cardProjection.streamId&&cursor.sequence>=cardProjection.sequence)cardProjection=null;
  else card=cardProjection.closed?null:{...cardProjection.payload,id:cardProjection.id,revision:cardProjection.revision};
 }
 return card;
}
function ownRoom(){return live && live.durable.room?.ownerId===live.durable.selfId?live.durable.room:null;}
// Movement remains enabled when ordinary tools are closed. Typing/IME is also guarded by the world.
function queueSafeArea(){
 if(safeAreaFrame!==null)return;
 const schedule=window.requestAnimationFrame?.bind(window)||((fn)=>setTimeout(fn,0));
 safeAreaFrame=schedule(()=>{
  safeAreaFrame=null;if(!world?.setLabelSafeArea)return;
  const origin=$("world").getBoundingClientRect();if(!origin.width||!origin.height)return;
  const view=window.visualViewport,left=(view?.offsetLeft||0)-origin.left,top=(view?.offsetTop||0)-origin.top;
  const viewport={left:Math.max(0,left),top:Math.max(0,top),right:Math.min(origin.width,left+(view?.width||window.innerWidth)),bottom:Math.min(origin.height,top+(view?.height||window.innerHeight))};
  const safeRects=[];
  for(const element of document.querySelectorAll(HUD_SAFE_SELECTOR)){
   if(element.hidden||element.closest("[hidden]")||(element.id==="panel"&&element.dataset.tool==="options"))continue;
   const rect=element.getBoundingClientRect();if(rect.width&&rect.height)safeRects.push({x:rect.left-origin.left,y:rect.top-origin.top,w:rect.width,h:rect.height});
  }
  world.setLabelSafeArea({viewport,safeRects});
 });
}
function renderCameraMode(mode=world?.getCameraMode?.()||"play"){
 for(const [id,value] of [["camera-hud-follow","play"],["camera-hud-look","inspection"],["camera-hud-overview","overview"],["camera-look","inspection"],["camera-overview","overview"]])$(id).setAttribute("aria-pressed",String(mode===value&&(value!=="inspection"||world?.isCameraLookLocked?.()!==false)));
 const ready=Boolean(live&&world?.setCameraMode);for(const id of ["camera-overview","camera-look","camera-recenter","camera-zoom","camera-hud-follow","camera-hud-look","camera-hud-overview"])$(id).disabled=!ready||activePanel==="room";
 const zoom=world?.getCameraZoom?.()||1;$("camera-zoom").value=String(zoom);$("camera-zoom-value").textContent=Math.round(zoom*100)+"%";
 $("camera-controls").hidden=activePanel!=="options";$("game-settings").hidden=!live;$("resume-game").hidden=!live;$("return-title").hidden=!live;
 $("pause-description").textContent=live?"Game paused. Your house connection stays live.":"Choose your comfort settings before entering the house.";
}
function applyInput(){world?.setSuspended?.(Boolean(!entered||embeddedFrame||activePanel==="options"));world?.setInputEnabled(Boolean(live?.controller&&entered&&!activePanel&&!embeddedFrame&&$("lobby").hidden));renderCameraMode();setShellInert();}
function closePanel(){adminRequest++;pendingRequest++;activePanel=null;$("panel").hidden=true;$("modal-backdrop").hidden=true;$("panel-feedback").hidden=true;world?.setEditing(false);world?.setRoomPreview?.(null);applyInput();if(chatReadable())markChatRead();panelFocus.close();queueSafeArea();}
function openPanel(name){
 if(name==="game"&&live?.durable.zoneId!=="lounge"){notice("Walk to the break table in the lounge to open it.");return;}
 if(name==="chat"){if(!live){notice("Waiting for the house connection.");return;}if(chatWindow.isOpen())chatWindow.close();else {chatWindow.open(document.activeElement);renderTranscript();markChatRead();}return;}
 if(!["recovery","pending","options","about"].includes(name)&&!live){notice("Waiting for the house connection.");return;}
 if(embeddedFrame)return;
 const visibleNotice=!$("notice").hidden?$("notice").textContent:!$("lobby-feedback").hidden?$("lobby-feedback").textContent:"";activePanel=name;$("panel").hidden=false;$("panel").dataset.tool=name;$("panel").setAttribute("aria-modal",String(!["room","game"].includes(name)));$("modal-backdrop").hidden=["room","game"].includes(name);$("panel-feedback").hidden=true;if(visibleNotice)notice(visibleNotice);
 for(const key of ["board","room","house","recovery","pending","options","about","game","places","voice"])$(key+"-panel").hidden=key!==name;
 $("panel-title").textContent={board:"My work",room:"My room",house:"House settings",recovery:"Recover your identity",pending:"Pending drafts",options:live?"Game paused":"Options",about:"About the neighbourhood",game:"Four-in-a-row",places:"Places",voice:"Optional voice"}[name];
 applyInput();
 if(name==="pending")void protectedAction(renderPending)();
 if(name==="board"){renderCards();if(!cardDirty)fillCard();}
 if(name==="room"){renderRoom();void protectedAction(refreshRoomPending)();}
 if(name==="house"){renderHouse();void protectedAction(inspectVoicePending)();}
 if(name==="voice")renderVoice();
 if(name==="game"){panelFocus.close();$("panel-close").focus();renderGame();}else panelFocus.open();queueSafeArea();
}
function updateWorld(snapshot){
 if(!world)world=createHouseWorld($("world"),{onMove:position=>client?.move(position),onInteract:protectedAction(interact),onSelectPlacement:id=>{$("placement").value=id;},onCameraModeChange:renderCameraMode,onHint:text=>$("context-hint").textContent=text});
 world.update(snapshot);world?.setReducedMotion?.(reducedMotion);applyInput();queueSafeArea();
}
async function interact(target){
 if(!live||!target)return;
 if(target.kind==="game"||target.type==="game"){openPanel("game");return;}
 if(target.type==="door"){
  const resident=live.durable.residents.find(p=>p.slot===target.slot||p.bedroomId===target.roomId);
  if(!resident){notice("This bedroom is waiting for a new housemate.");return;}
  await client.subscribe(resident.bedroomId);closePanel();
 }else if(target.type==="exit"){
  await client.subscribe("lounge");closePanel();
 }else if(target.type==="seat"){
  const self=live.players.find(p=>p.id===live.durable.selfId);
  if(self?.seatId)await client.stand();else await client.claimSeat(target.seatId);
 }else if(target.type==="desk"){
  openPanel("board");
 }else if(target.type==="lamp"){
  if(!ownRoom()){notice("This lamp belongs to the room owner. Your own room has Lighting controls.");return;}
  openPanel("room");$("room-light").focus();$("light-form").scrollIntoView?.({block:"nearest"});
 }else if(target.type==="board"){
  if(live.durable.zoneId!=="lounge"){notice("The shared board is in the lounge.");return;}
  openBoard();
 }
}
function privateContext(){return privacyGeneration+":"+(live?.durable.selfId||me?.identity.id||"");}
function identityScope(snapshot){return snapshot?snapshot.durable.house.id+":"+snapshot.durable.selfId:"";}
function scopeKey(snapshot){return snapshot?snapshot.durable.house.id+":"+snapshot.durable.selfId+":"+snapshot.durable.zoneId:"";}
function roomScope(){const room=ownRoom();return room?scopeKey(live)+":"+room.id+":"+room.ownerId:"";}
function cardValues(){return Object.fromEntries(["small-goal","question","resource","next-step"].map(id=>[id,$(id).value]).concat([["help-requested",$("help-requested").checked]]));}
function restoreCard(values){for(const [id,value] of Object.entries(values))if(id==="help-requested")$(id).checked=value;else $(id).value=value;}
function clearPrivateDOM(){
 setPlaceLabel("");gameUI.update(null);$("game-table-status").hidden=true;
 for(const id of ["roster","transcript","cards","membership-actions","removed-members","placement","pending-entries"])$(id).replaceChildren();
 for(const id of ["name","chat-input","small-goal","question","resource","next-step","palette","room-light","starter-preset","recovery-proof","voice-url"])$(id).value="";
 for(const id of ["join-code-display","capacity-status","room-status","layout-status","availability-freshness","recovery-output","lobby-recovery-output","pending-foreign","card-status","panel-feedback","lobby-feedback","title-feedback","archive-count","starter-summary","starter-status","light-status"])$(id).textContent="";$("lobby-export").hidden=true;$("archive-count").hidden=true;
 $("chat-draft-status").textContent="Enter for a new line · Ctrl / ⌘ Enter to send";$("pending-discard-foreign").hidden=true;$("room-open").checked=false;$("help-requested").checked=false;$("layout-review").hidden=true;$("chat-count").textContent="";
 $("voice-link").hidden=true;$("voice-link").removeAttribute("href");$("voice-destination").textContent="";$("voice-form").hidden=true;
 $("starter-preview").replaceChildren();world?.setRoomPreview?.(null);closeBoard();chatWindow.reset();
}
function onSnapshot(snapshot){
 if(!snapshot){
  privacyGeneration++;
  if(live)suspendedDrafts={scope:scopeKey(live),identity:identityScope(live),chat:$("chat-input").value,chatVersion,card:cardValues()};
  closeBoard();chatWindow.close();live=null;lastDurableKey="";lastHouseKey="";world?.update(null);world?.setInputEnabled(false);clearPrivateDOM();
  setPlaceLabel("Waiting for the house connection");
  $("house-code-button").disabled=true;
  for(const button of document.querySelectorAll("[data-panel]"))button.disabled=!["pending","options","about"].includes(button.dataset.panel);
  $("connection-status").textContent=updateRecovery?"Update needed":"Reconnecting…";$("quick-chat").querySelector("button").disabled=true;
  applyInput();if(activePanel)closePanel();return;
 }
 const reconnect=!live, previousScope=lastScope, previousIdentity=lastIdentityScope, retainedCard=suspendedDrafts?.identity===identityScope(snapshot)?suspendedDrafts.card:cardValues();
 live=snapshot;lastScope=scopeKey(snapshot);lastIdentityScope=identityScope(snapshot);
 if(previousScope&&previousScope!==lastScope){
  roomDraft=null;chatVersion++;clearPrivateDOM();
  if(previousIdentity===lastIdentityScope){if(cardDirty)restoreCard(retainedCard);}
  else {privacyGeneration++;suspendedDrafts=null;cardDirty=false;cardBase=null;cardProjection=null;cardVersion++;unreadStreams.clear();}
 }
 if(roomDraft&&roomDraft.scope!==roomScope())roomDraft=null;
 if(suspendedDrafts?.scope===lastScope){$("chat-input").value=suspendedDrafts.chat;restoreCard(suspendedDrafts.card);suspendedDrafts=null;}
 $("connection-limit-pending").hidden=true;$("title-screen").hidden=entered;$("lobby").hidden=true;document.body.dataset.screen=entered?"game":"title";$("game-controls").hidden=!entered;$("roster").hidden=false;$("house-code-button").hidden=false;
 $("connection-status").textContent=snapshot.controller?"Together, live":"Viewing · another tab controls";
 $("house-code-button").disabled=false;
 for(const button of document.querySelectorAll("[data-panel]"))button.disabled=false;
 $("takeover").hidden=snapshot.controller;$("quick-chat").querySelector("button").disabled=!snapshot.controller;
 $("shared-board").disabled=!snapshot;$("resident-count").textContent=String(snapshot.durable.residents.length);
 const owner=snapshot.durable.residents.find(r=>r.id===snapshot.durable.room?.ownerId);
 setPlaceLabel(snapshot.durable.zoneId==="lounge"?"Shared study lounge":(owner?.name||"A friend")+"'s room");
 $("chat-title").textContent=snapshot.durable.zoneId==="lounge"?"Lounge chat":(owner?.name||"Room")+"’s room chat";
 const self=snapshot.players.find(p=>p.id===snapshot.durable.selfId);
 for(const radio of document.querySelectorAll("input[name=availability]")){radio.checked=self?.availability===radio.value;radio.disabled=!snapshot.controller;}
 $("availability-freshness").replaceChildren();
 if(self?.availabilitySetAt){const time=node("time",new Date(self.availabilitySetAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}));time.dateTime=new Date(self.availabilitySetAt).toISOString();time.title=new Date(self.availabilitySetAt).toLocaleString();$("availability-freshness").append("Last set ",time);}
 else $("availability-freshness").textContent="Quiet by default · choose when ready";
 updateUnread(snapshot,reconnect||previousScope!==lastScope);renderRoster();updateWorld(snapshot);
 const key=JSON.stringify([snapshot.durable.streamId,snapshot.durable.sequence,workCursor()?.streamId,workCursor()?.sequence,snapshot.controller]);
 if(key!==lastDurableKey){lastDurableKey=key;renderTranscript();if(activePanel==="board"){renderCards();if(!cardDirty)fillCard();}}
 const houseKey=JSON.stringify([snapshot.durable.house,snapshot.durable.residents,snapshot.durable.selfId,snapshot.durable.voice,snapshot.controller]);
 if(houseKey!==lastHouseKey){lastHouseKey=houseKey;adminRequest++;if(activePanel==="house")renderHouse();else if(activePanel==="voice")renderVoice();}
 if(activePanel==="room")renderRoom();
 renderGame();const gameKey=JSON.stringify([identityScope(live),live.durable.zoneId,live.controller,live.durable.game?.revision]);if(reconnect||gameKey!==gameRefreshKey){gameRefreshKey=gameKey;void refreshGamePending();}
 if(plannedPlace&&snapshot.durable.zoneId==="lounge"){const place=plannedPlace;plannedPlace=null;queueMicrotask(()=>walkToPlace(place));}

}
function unreadKey(){return live?live.durable.house.id+":"+live.durable.selfId+":"+live.durable.streamId:"";}
function updateUnread(snapshot,history){
 const key=unreadKey(), state=unreadStreams.get(key)||{sequence:0,unread:0,seen:new Set()};
 for(const message of snapshot.durable.chat||[]){if(!history&&!state.seen.has(message.id)&&message.sequence>state.sequence&&message.authorId!==snapshot.durable.selfId&&!chatReadable())state.unread++;state.seen.add(message.id);}
 state.seen=new Set(snapshot.durable.chat.map(message=>message.id));
 state.sequence=Math.max(state.sequence,...snapshot.durable.chat.map(message=>message.sequence));
 if(chatReadable())state.unread=0;unreadStreams.set(key,state);$("chat-count").textContent=state.unread?String(state.unread):"";
 $("chat-count").setAttribute("aria-label",state.unread+" unread messages here");
}
function chatReadable(){return entered&&!activePanel&&!embeddedFrame&&chatWindow.isReadable();}
function markChatRead(){const state=unreadStreams.get(unreadKey());if(state)state.unread=0;$("chat-count").textContent="";$("chat-count").setAttribute("aria-label","0 unread messages here");}

function renderRoster(){
 $("roster").replaceChildren();
 for(const resident of live.durable.residents){
  const player=live.players.find(p=>p.id===resident.id), connected=Boolean(player?.connected);
  const eligible=connected&&player.zoneId==="lounge"&&player.availability==="chat";
  const where=connected?(player.zoneId==="lounge"?"lounge":"in a room"):"offline";
  const status=connected?(player.availability==="chat"?"Can chat":"Quiet"):"";
  const chip=node("span",resident.name+(resident.id===live.durable.selfId?" · you":"")+" · "+where+(status?" · "+status:""),"resident");
  if(player?.availabilitySetAt){const time=node("time"," · set "+new Date(player.availabilitySetAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}));time.dateTime=new Date(player.availabilitySetAt).toISOString();chip.append(time);}
  chip.dataset.playerId=resident.id;chip.dataset.willing=String(eligible);chip.dataset.availability=player?.availability||"quiet";
  if(player?.x!==undefined){chip.dataset.x=String(player.x);chip.dataset.z=String(player.z);chip.dataset.animation=player.animation||"idle";}
  $("roster").append(chip);
 }
}
function renderTranscript(){
 const transcript=$("transcript"),atEnd=transcript.scrollHeight-transcript.scrollTop-transcript.clientHeight<40,previous=transcript.scrollTop,messages=live?.durable.chat||[];
 const retained=new Set(messages.map(chat=>chat.id));for(const item of [...transcript.children])if(!retained.has(item.dataset.messageId))item.remove();
 const existing=new Map([...transcript.children].map(item=>[item.dataset.messageId,item]));
 messages.forEach((chat,index)=>{let item=existing.get(chat.id);if(!item){item=node("li");item.dataset.messageId=chat.id;item.append(node("b",chat.name),node("span",chat.text));}if(transcript.children[index]!==item)transcript.insertBefore(item,transcript.children[index]||null);});
 if(atEnd)transcript.scrollTop=transcript.scrollHeight;else transcript.scrollTop=previous;
}
function renderCards(){
 $("cards").replaceChildren();
 if(!live)return;
 $("card-form").hidden=false;
 $("work-visibility").textContent="Your current card is house-visible to current housemates in the lounge. Every desk opens your own work, including when you visit a friend.";
 for(const control of $("card-form").querySelectorAll("input,textarea,button"))control.disabled=!live.controller;
 $("close-card").disabled=!live.controller||cardDirty||!effectiveCard();
 const cards=live.durable.zoneId==="lounge"?live.durable.cards:(effectiveCard()?[{...effectiveCard(),authorId:live.durable.selfId,state:"active"}]:[]);
 for(const card of cards){
  const person=live.durable.residents.find(r=>r.id===card.authorId);
  const article=node("article",undefined,"card");article.dataset.cardId=card.id;
  article.append(node("small",(person?.name||"Former resident")+(card.authorId===live.durable.selfId?" · you":"")),node("h3",card.smallGoal),node("span",card.state==="ownerLeft"?"Author left · not marked solved":card.state==="closed"?"Closed by author":card.helpRequested?"Question open · replies in chat":"Current goal","card-state"));
  if(card.question)article.append(node("p",card.question));
  if(card.resourceUrl){const link=node("a","Open resource");link.href=card.resourceUrl;link.target="_blank";link.rel="noopener noreferrer";article.append(link);}
  if(card.nextStep)article.append(node("p","Next step: "+card.nextStep));
  $("cards").append(article);
 }
 if(!cards.length)$("cards").append(node("p","A clear next step can start with a small question.","subtle"));
}
function fillCard(){
 const card=effectiveCard();
 cardBase=card?{id:card.id,revision:card.revision}:null;
 $("small-goal").value=card?.smallGoal||"";$("question").value=card?.question||"";$("resource").value=card?.resourceUrl||"";$("next-step").value=card?.nextStep||"";$("help-requested").checked=card?.helpRequested||false;
 $("close-card").disabled=!card||!live?.controller;$("saved-card").hidden=true;$("card-status").textContent=!live?.controller?"Viewing your saved work. Take control to save.":card?"Your saved current card.":"Start one current card. A goal is enough.";
}
function ensureRoomDraft(){
 const room=ownRoom();if(!room)return null;
 if(!roomDraft||roomDraft.scope!==roomScope())roomDraft={scope:roomScope(),layout:structuredClone(room.placements),layoutBase:room.revision,basePlacements:structuredClone(room.placements),layoutVersion:0,layoutDirty:false,metadata:{open:room.open,palette:room.palette},metadataBase:room.revision,metadataVersion:0,metadataDirty:false,light:room.light??"standard",lightBase:room.revision,lightVersion:0,lightDirty:false,lightMessage:"",starterId:room.originPresetId||ROOM_PRESETS[0].id,starterAttempt:null,starterBusy:false,awaitingStarter:0,starterMessage:"",ackRevision:0,layoutMessage:"",metadataMessage:"",reviewing:false};
 if(roomDraft.awaitingStarter&&room.revision>=roomDraft.awaitingStarter)roomDraft.awaitingStarter=0;
 if(!roomDraft.metadataDirty&&room.revision>=roomDraft.ackRevision){roomDraft.metadata={open:room.open,palette:room.palette};roomDraft.metadataBase=room.revision;}
 if(!roomDraft.layoutDirty&&room.revision>=roomDraft.ackRevision){roomDraft.layout=structuredClone(room.placements);roomDraft.basePlacements=structuredClone(room.placements);roomDraft.layoutBase=room.revision;}
 if(!roomDraft.lightDirty&&room.revision>=roomDraft.ackRevision){roomDraft.light=room.light??"standard";roomDraft.lightBase=room.revision;}
 return roomDraft;
}
function renderRoom(){
 const room=ownRoom();$("walk-room").hidden=Boolean(room);$("return-lounge").hidden=!live?.durable.room;$("walk-room").disabled=!live?.controller;$("return-lounge").disabled=!live;
 $("room-form").hidden=!room;$("furniture-editor").hidden=!room;$("light-form").hidden=!room;$("starter-editor").hidden=!room;
 $("room-instructions").textContent=room?"Your changes affect this bedroom. Keep the arrival path clear; choose up to ten pieces.":"Walk through your named door to arrange your bedroom. Friends can visit when you open it.";
 world?.setEditing(Boolean(room));if(!room)return;
 const draft=ensureRoomDraft();$("room-open").checked=draft.metadata.open;$("palette").value=draft.metadata.palette;$("room-light").value=draft.light;$("light-status").textContent=draft.lightMessage||(draft.lightDirty?"Unsaved lighting":"Saved lighting: "+draft.light);for(const control of $("room-panel").querySelectorAll("input,select,button"))control.disabled=!roomWritable();$("return-lounge").disabled=false;renderStarter();
 $("room-status").textContent=draft.metadataMessage||(draft.metadataDirty?"Unsaved room settings":"Your saved room settings.");renderPlacements();
}
function renderPlacements(){
 if(!ownRoom()||!roomDraft||roomDraft.scope!==roomScope())return;
 const selected=$("placement").value;$("placement").replaceChildren();
 for(const p of roomDraft.layout){const option=node("option",p.kind+" · "+p.x+", "+p.z);option.value=p.id;$("placement").append(option);}
 if(roomDraft.layout.some(p=>p.id===selected))$("placement").value=selected;
 world?.setRoomPreview?.(roomDraft.reviewing?ownRoom().placements:roomDraft.layout);
 const stale=roomDraft.layoutDirty&&ownRoom().revision!==roomDraft.layoutBase;
 $("layout-status").textContent=roomDraft.layoutMessage||(stale?"Saved room changed. Your preview is kept; review the saved layout before replacing it.":roomDraft.layout.length+"/10 pieces · "+(roomDraft.layoutDirty?"unsaved preview":"saved arrangement"));
 $("layout-review").hidden=!roomDraft.layoutDirty;$("layout-review").textContent=roomDraft.reviewing?"Return to my preview":"Review saved layout";
}
function modifyPlacement(dx,dz,rotate=false,remove=false){
 if(!roomWritable())return;const draft=ensureRoomDraft();if(!draft)return;
 const selected=$("placement").value,next=structuredClone(draft.layout),item=next.find(p=>p.id===selected);if(!item)return;
 if(remove)next.splice(next.indexOf(item),1);else {item.x+=dx;item.z+=dz;if(rotate)item.rotation=(item.rotation+1)%4;}
 if(!validatePlacements(next)){notice("That position blocks furniture or the clear route to your door.");return;}
 draft.layout=next;draft.layoutVersion++;draft.layoutDirty=true;draft.layoutMessage="";draft.reviewing=false;renderPlacements();renderStarter();
}

function roomWritable(){return Boolean(live?.controller&&!(roomDraft?.awaitingStarter&&ownRoom()?.revision<roomDraft.awaitingStarter));}
function forgetPending(commandId,receipt){
 for(const [key,intent] of pending){
  if(intent.commandId!==commandId)continue;pending.delete(key);pendingZones.delete(key);
  if(intent.type.startsWith("game."))gamePendingRows=gamePendingRows.filter(row=>row.commandId!==commandId);
  if(intent.type==="room.starter"&&roomDraft&&ownRoom()?.id===intent.payload.roomId){
   roomDraft.starterAttempt=null;roomDraft.starterMessage=receipt?"Original starter acknowledged.":"Local pending starter discarded. Its server status is unknown; review your saved room.";
   if(receipt?.entityRevision){roomDraft.awaitingStarter=receipt.entityRevision;roomDraft.ackRevision=Math.max(roomDraft.ackRevision,receipt.entityRevision);}
  }
 }
}
function reconcilePendingMemory(result){
 voicePendingRows=result.entries.filter(entry=>entry.type==="house.voice");voicePendingScope=identityScope(live);voicePendingError="";
 const retained=new Set(result.entries.map(entry=>entry.commandId));
 for(const intent of [...pending.values()])if(!saveFlights.has(intent.commandId)&&!retained.has(intent.commandId))forgetPending(intent.commandId);
}
async function refreshRoomPending(){
 const room=ownRoom(),draft=roomDraft;if(!room||!draft||!roomPending(room))return;
 const context=privateContext(),result=await pendingSource().getPending();
 if(context!==privateContext()||roomDraft!==draft)return;reconcilePendingMemory(result);if(activePanel==="room")renderRoom();
}
$("starter-check-pending").addEventListener("click",protectedAction(refreshRoomPending));
function roomPending(room){return [...pending.values()].some(intent=>intent.type.startsWith("room.")&&intent.payload.roomId===room.id);}
function renderStarter(){
 const room=ownRoom(),draft=roomDraft;if(!room||!draft)return;
 if(!$("starter-preset").options.length)for(const preset of ROOM_PRESETS){const option=node("option",preset.name);option.value=preset.id;$("starter-preset").append(option);}
 $("starter-preset").value=draft.starterAttempt?.presetId||draft.starterId;$("starter-preset").disabled=!live.controller||Boolean(draft.starterAttempt);
 const preset=getRoomPreset($("starter-preset").value);if(!preset)return;
 $("starter-preview").replaceChildren();const ns="http://www.w3.org/2000/svg",svg=document.createElementNS(ns,"svg");svg.setAttribute("viewBox","-7.5 -5.5 15 11");svg.setAttribute("role","img");svg.setAttribute("aria-label",preset.name+" top-view furniture preview");
 const shape=(tag,attributes)=>{const item=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attributes))item.setAttribute(key,String(value));svg.append(item);return item;};
 const colours={amber:"#ceb47d",sage:"#a5b49c",rose:"#c6999b",blue:"#92aebb",lavender:"#b29eb9",peach:"#d7a489"};
 shape("rect",{x:-7,y:-5,width:14,height:10,fill:colours[preset.palette],stroke:"#645947","stroke-width":.08,rx:.15});
 for(const piece of preset.items){const bounds=footprint(piece),element=shape("rect",{x:bounds.x-bounds.w/2,y:bounds.z-bounds.d/2,width:bounds.w,height:bounds.d,fill:colours[piece.colour],stroke:"#4c5549","stroke-width":.06,rx:.08,"data-kind":piece.kind});const title=document.createElementNS(ns,"title");title.textContent=piece.kind+" · "+piece.x+", "+piece.z;element.append(title);const text=shape("text",{x:piece.x,y:piece.z+.12,"font-size":.32,"text-anchor":"middle",fill:"#25372d"});text.textContent=piece.kind;}
 shape("path",{d:"M -1 5 L 1 5",stroke:"#fff9dc","stroke-width":.2});const door=shape("text",{x:0,y:4.5,"font-size":.32,"text-anchor":"middle",fill:"#25372d"});door.textContent="Door kept";$("starter-preview").append(svg);
 $("starter-summary").textContent=preset.items.length+" pieces · "+preset.palette+" palette · "+preset.light+" lighting. Applying replaces all furniture, palette and lighting. Your door stays "+(room.open?"open":"closed")+".";
 const waiting=Boolean(draft.awaitingStarter&&room.revision<draft.awaitingStarter),dirty=draft.layoutDirty||draft.metadataDirty||draft.lightDirty,blocked=waiting||dirty||roomPending(room);
 $("starter-apply").disabled=!live.controller||draft.starterBusy||(!draft.starterAttempt&&blocked);$("starter-apply").textContent=draft.starterBusy?"Applying…":draft.starterAttempt?"Retry original starter":"Apply starter layout";
 $("starter-check-pending").hidden=!roomPending(room);$("starter-check-pending").disabled=draft.starterBusy;
 $("starter-discard").hidden=!dirty;$("starter-discard").disabled=!live.controller||draft.starterBusy;
 $("starter-status").textContent=waiting?"Starter saved. Waiting for the saved room before further edits.":draft.starterMessage||(dirty?"Save your room drafts, or explicitly discard them before applying a starter.":blocked?"Resolve the pending room action, or check its status after an automatic retry.":"Preview only. Your room stays as saved until you apply.");
}
$("starter-preset").addEventListener("input",()=>{const draft=ensureRoomDraft();if(!draft||draft.starterAttempt)return;draft.starterId=$("starter-preset").value;draft.starterMessage="";renderStarter();});
$("starter-discard").addEventListener("click",()=>{
 const room=ownRoom(),draft=ensureRoomDraft();if(!room||!draft||!roomWritable()||draft.starterBusy)return;
 if(!confirm("Discard your unsaved furniture, room settings and lighting drafts? Saved room content will be kept until you apply a starter."))return;
 draft.layoutDirty=false;draft.metadataDirty=false;draft.lightDirty=false;draft.layoutVersion++;draft.metadataVersion++;draft.lightVersion++;draft.layoutMessage="";draft.metadataMessage="";draft.lightMessage="";draft.starterMessage="";renderRoom();
});
$("starter-apply").addEventListener("click",protectedAction(async()=>{
 const room=ownRoom(),draft=ensureRoomDraft();if(!room||!draft||!roomWritable()||draft.starterBusy)return;
 if(!draft.starterAttempt&&(draft.layoutDirty||draft.metadataDirty||draft.lightDirty||roomPending(room))){draft.starterMessage="Save your room drafts or explicitly discard them, and resolve pending actions before applying.";renderStarter();return;}
 const attempt=draft.starterAttempt??{presetId:draft.starterId,base:room.revision,layoutVersion:draft.layoutVersion,metadataVersion:draft.metadataVersion,lightVersion:draft.lightVersion};draft.starterAttempt=attempt;draft.starterBusy=true;draft.starterMessage="Applying the selected starter…";renderStarter();
 try{
  const receipt=await save("room.starter",{roomId:room.id,presetId:attempt.presetId},attempt.base);
  if(roomDraft!==draft||(live&&draft.scope!==roomScope()))return;
  draft.ackRevision=Math.max(draft.ackRevision,receipt.entityRevision);draft.awaitingStarter=receipt.entityRevision;
  if(draft.layoutVersion===attempt.layoutVersion){draft.layoutDirty=false;draft.layoutMessage="Starter arrangement saved.";}
  if(draft.metadataVersion===attempt.metadataVersion){draft.metadataDirty=false;draft.metadataMessage="Starter room settings saved.";}
  if(draft.lightVersion===attempt.lightVersion){draft.lightDirty=false;draft.lightMessage="Starter lighting saved.";}
  draft.starterAttempt=null;draft.starterMessage="Starter saved. Newer room drafts, if any, are kept separately; review them before saving.";
 }catch(error){if(roomDraft===draft){draft.starterMessage=(!error.code||RETAIN_INTENT_CODES.has(error.code))?"Starter is pending, not confirmed saved. Retry keeps its original preset, revision and action ID. Newer drafts are kept.":"Starter not applied. "+error.message;if(error.code&&!RETAIN_INTENT_CODES.has(error.code))draft.starterAttempt=null;}throw error;}
 finally{draft.starterBusy=false;if(roomDraft===draft&&live&&draft.scope===roomScope())renderRoom();}
}));
$("light-form").addEventListener("input",()=>{if(!roomWritable())return;const draft=ensureRoomDraft();if(!draft)return;draft.light=$("room-light").value;draft.lightVersion++;draft.lightDirty=true;draft.lightMessage="Unsaved lighting";$("light-status").textContent=draft.lightMessage;renderStarter();});
$("light-reset").addEventListener("click",()=>{const draft=ensureRoomDraft();if(!draft||!roomWritable())return;if(draft.lightDirty&&!confirm("Replace your unsaved lighting choice with saved lighting? Other room drafts will stay."))return;draft.lightDirty=false;draft.lightVersion++;draft.lightMessage="";renderRoom();});
$("light-form").addEventListener("submit",protectedAction(async()=>{
 const room=ownRoom(),draft=ensureRoomDraft();if(!room||!draft||!roomWritable())return;
 const submitted={base:draft.lightBase,version:draft.lightVersion,light:draft.light};
 try{
  const receipt=await save("room.light",{roomId:room.id,light:submitted.light},submitted.base);
  if(roomDraft!==draft||(live&&draft.scope!==roomScope()))return;
  // This command changes only lighting. Advance only sections sharing its known base.
  if(draft.layoutBase===submitted.base)draft.layoutBase=receipt.entityRevision;
  if(draft.metadataBase===submitted.base)draft.metadataBase=receipt.entityRevision;
  if(draft.lightBase===submitted.base)draft.lightBase=receipt.entityRevision;
  draft.ackRevision=Math.max(draft.ackRevision,receipt.entityRevision);
  if(draft.lightVersion===submitted.version){draft.lightDirty=false;draft.lightMessage="Lighting saved.";}else draft.lightMessage="Submitted lighting saved. Your newer choice is still a draft.";
  if(live)renderRoom();
 }catch(error){if(roomDraft===draft&&draft.scope===roomScope()){draft.lightMessage="Lighting draft kept. "+error.message;renderRoom();}throw error;}
}));

async function renderRemoved(after="",append=false){
 const request=++adminRequest, houseId=live?.durable.house.id, ownerId=live?.durable.selfId;
 if(!live||live.durable.house.ownerId!==live.durable.selfId)return;
 try{
  const result=await api("/api/house/removed-members"+(after?"?after="+encodeURIComponent(after):""));
  if(request!==adminRequest||activePanel!=="house"||live?.durable.house.id!==houseId||live.durable.selfId!==ownerId||live.durable.house.ownerId!==ownerId)return;
  if(!append)$("removed-members").replaceChildren();
  $("removed-members").querySelector(".more-removed")?.remove();
  for(const member of result.members){
   const row=node("div",undefined,"member-row");row.append(node("span",member.name+" · removed"));
   const button=node("button","Reinstate "+member.name);
   button.addEventListener("click",protectedAction(async()=>{await save("house.reinstate",{memberId:member.id});notice("This identity can join again with the current code and a fresh bedroom.");void renderRemoved();}));
   row.append(button);$("removed-members").append(row);
  }
  if(result.nextCursor){const more=node("button","More removed residents","more-removed");more.addEventListener("click",()=>{void renderRemoved(result.nextCursor,true);});$("removed-members").append(more);}
 }catch(error){if(request===adminRequest&&activePanel==="house"&&live?.durable.house.id===houseId&&live.durable.selfId===ownerId&&live.durable.house.ownerId===ownerId)notice(error.message);}
}
function pendingVoice(){return Boolean(live&&([...pending.values()].some(intent=>intent.type==="house.voice"&&intent.houseId===live.durable.house.id)||voicePendingRows.some(entry=>entry.houseId===live.durable.house.id)));}
async function inspectVoicePending(){
 const context=privateContext(),scope=identityScope(live);voicePendingScope="";voicePendingError="";renderVoice();
 try{const result=await pendingSource().getPending();if(context!==privateContext()||scope!==identityScope(live))return;reconcilePendingMemory(result);renderVoice();}
 catch(error){if(context===privateContext()&&scope===identityScope(live)){voicePendingError=error.message;renderVoice();}throw error;}
}
function renderVoice(){
 if(!live)return;
 const saved=live.durable.voice||{url:null,revision:0},scope=identityScope(live),owner=live.durable.house.ownerId===live.durable.selfId;
 $("voice-link").hidden=!saved.url;$("voice-empty").hidden=Boolean(saved.url);$("voice-destination").textContent=saved.url||"";
 if(saved.url)$("voice-link").href=saved.url;else $("voice-link").removeAttribute("href");
 $("voice-form").hidden=!owner;
 if(!owner)return;
 if(!voiceDraft||voiceDraft.scope!==scope)voiceDraft={scope,baseRevision:saved.revision,value:saved.url||"",version:0,dirty:false,saving:false,message:""};
 if(!voiceDraft.dirty&&!voiceDraft.saving&&saved.revision>=voiceDraft.baseRevision){voiceDraft.baseRevision=saved.revision;voiceDraft.value=saved.url||"";}
 $("voice-url").value=voiceDraft.value;
 const uncertain=pendingVoice(),unchecked=voicePendingScope!==scope;
 for(const field of $("voice-form").querySelectorAll("button"))field.disabled=!live.controller||voiceDraft.saving||uncertain||unchecked;
 $("voice-url").disabled=!live.controller;
 $("voice-status").textContent=unchecked?(voicePendingError||"Checking pending link changes…"):uncertain&&!voiceDraft.saving?"The link change is pending. Inspect Pending drafts to resolve it.":voiceDraft.message||(voiceDraft.dirty&&saved.revision>voiceDraft.baseRevision?"The saved link changed. Your edit is still here; Use saved link to reload it.":saved.url?"Your housemates can open this Discord destination.":"Voice is optional. Add a link when your group wants one.");
}
async function saveVoice(){
 if(!live?.controller||live.durable.house.ownerId!==live.durable.selfId)throw new Error("Only the house owner in the controlling tab can change this link.");
 renderVoice();if(voicePendingScope!==identityScope(live)||pendingVoice())throw Object.assign(new Error("Inspect and resolve pending link changes before saving another."),{code:"PENDING"});if(voiceDraft.saving)return;const draft=voiceDraft,scope=identityScope(live),version=draft.version,value=draft.value,base=draft.baseRevision;
 draft.saving=true;draft.message="Saving Discord link…";renderVoice();
 try{const receipt=await save("house.voice",{url:value},base);if(voiceDraft!==draft||identityScope(live)!==scope)return;draft.baseRevision=receipt.entityRevision;
  if(draft.version===version){draft.dirty=false;draft.message="Discord link saved.";}else draft.message="Submitted link saved; your newer edit is still here.";
 }catch(error){if(voiceDraft===draft)draft.message=error.message;throw error;}finally{if(voiceDraft===draft){draft.saving=false;renderVoice();}}
}
function showUpdateRequired(){
 if(!updateRecovery){const held=suspendedDrafts,zoneId=live?.durable.zoneId||lastScope.split(":").at(-1)||"lounge";
  updateRecovery=JSON.parse(JSON.stringify({format:"house-local-drafts-v1",identityId:live?.durable.selfId||me?.identity.id,houseId:live?.durable.house.id||me?.home?.id,zoneId,
   chat:{text:live?$("chat-input").value:held?.chat||"",zoneId,version:chatVersion},work:{values:live?cardValues():held?.card||cardValues(),base:cardBase,dirty:cardDirty,version:cardVersion},room:roomDraft,voice:voiceDraft}));
 }
 $("update-required").hidden=false;$("update-status").textContent="Your available drafts stay in this tab until you reload.";queueSafeArea();
}
$("voice-url").addEventListener("input",()=>{if(!voiceDraft)return;voiceDraft.value=$("voice-url").value;voiceDraft.version++;voiceDraft.dirty=true;voiceDraft.message="";});
$("voice-form").addEventListener("submit",protectedAction(saveVoice));
$("voice-clear").addEventListener("click",protectedAction(async()=>{if(!voiceDraft)return;voiceDraft.value="";voiceDraft.version++;voiceDraft.dirty=true;await saveVoice();}));
$("voice-reload").addEventListener("click",()=>{voiceDraft=null;renderVoice();});
$("update-pending").addEventListener("click",()=>openPanel("pending"));
$("update-reload").addEventListener("click",()=>window.location.reload());
$("update-download").addEventListener("click",protectedAction(async()=>{
 const retained=updateRecovery;if(!retained)return;const current=await api("/api/house/me");
 if(updateRecovery!==retained)return;
 if(current.identity.id!==retained.identityId){invalidateIdentityView();me=current;renderTitle();notice("Your identity changed. Continue with your current identity.",true);return;}
 const pendingDrafts=await pendingSource().exportPending();if(updateRecovery!==retained)return;
 const url=URL.createObjectURL(new Blob([JSON.stringify({...retained,pending:pendingDrafts},null,2)],{type:"application/json"}));const link=node("a");link.href=url;link.download="my-local-house-drafts.json";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$("update-status").textContent="Local drafts downloaded.";
}));

function renderHouse(){
 if(!live)return;renderVoice();
 const d=live.durable;$("join-code-display").textContent=d.house.code;
 $("capacity-status").textContent=d.residents.length+" of "+d.house.capacity+" permanent bedrooms claimed. Offline friends keep their rooms.";
 $("membership-actions").replaceChildren();$("removed-members").replaceChildren();
 for(const member of d.residents){
  const row=node("div",undefined,"member-row");row.append(node("span",member.name+(member.id===d.house.ownerId?" · owner":"")));
  if(d.selfId===d.house.ownerId&&member.id!==d.selfId){
   const buttons=node("div");
   for(const [title,type] of [["Transfer ownership","house.transfer"],["Remove member","house.remove"]]){
    const button=node("button",title,type==="house.remove"?"danger":undefined);button.addEventListener("click",protectedAction(async()=>{
     if(type==="house.remove"&&!confirm("Remove "+member.name+"? Their room will be archived privately and the invite code will change."))return;
     await save(type,{memberId:member.id});notice(type==="house.remove"?"Member removed; the invite code has changed.":"Ownership transferred.");
    }));buttons.append(button);
   }row.append(buttons);
  }$("membership-actions").append(row);
 }
 void renderRemoved();
}
async function checkMembership(){
 if(checkingMembership)return;checkingMembership=true;
 try{const next=await api("/api/house/me");if(!next.home){closePanel();await bootstrap();}}catch{ /* Reconnection keeps the existing identity and pending drafts. */ }
 finally{checkingMembership=false;}
}
function setRecoveryBusy(busy){for(const id of ["recovery-key","lobby-recovery-key"])$(id).disabled=busy;}
function invalidateIdentityView(){
 privacyGeneration++;bootstrapRequest++;adminRequest++;pendingRequest++;gamePendingRequest++;gamePendingRows=[];plannedPlace=null;
 client?.close();client=null;inspector?.close();inspector=null;live=null;
 roomDraft=null;suspendedDrafts=null;voiceDraft=null;updateRecovery=null;voicePendingRows=[];voicePendingScope="";voicePendingError="";$("update-required").hidden=true;cardProjection=null;cardDirty=false;cardBase=null;cardVersion++;chatVersion++;
 lastScope="";lastIdentityScope="";lastHouseKey="";lastDurableKey="";unreadStreams.clear();pending.clear();pendingZones.clear();keyIssuance=null;setRecoveryBusy(false);
 closeBoard();chatWindow.reset();clearPrivateDOM();closePanel();world?.update(null);world?.setInputEnabled(false);$("notice").textContent="";$("notice").hidden=true;
 $("game-controls").hidden=true;$("roster").hidden=true;$("house-code-button").hidden=true;$("connection-limit-pending").hidden=true;
}
async function bootstrap(enter=false){
 const request=++bootstrapRequest,epoch=privacyGeneration,loaded=await api("/api/house/me");
 if(request!==bootstrapRequest||epoch!==privacyGeneration)return;
 if(me?.identity.id!==loaded.identity.id||me?.home?.id!==loaded.home?.id)invalidateIdentityView();
 me=loaded;
 if(!me.home){
  client?.close();client=null;live=null;world?.update(null);world?.setInputEnabled(false);
  renderTitle();$("game-controls").hidden=true;$("roster").hidden=true;$("house-code-button").hidden=true;
  $("name").value=me.identity.name==="Study friend"?"":me.identity.name;$("colour").value=me.identity.colour;
  $("connection-status").textContent="Your evening awaits";setPlaceLabel("A little place to make progress together");
  $("lobby-export").hidden=me.archiveCount===0;$("archive-count").hidden=me.archiveCount===0;
  inspector ||= createPendingInspector({expectedIdentityId:me?.identity.id,fetchMe:()=>api("/api/house/me")});
  $("archive-count").textContent=me.archiveCount+" private room archive"+(me.archiveCount===1?"":"s")+" available in your download.";return;
 }
 if(!enter&&!entered){renderTitle();return;}
 entered=true;$("title-screen").hidden=true;$("lobby").hidden=true;$("game-controls").hidden=false;$("connection-status").textContent="Opening your house…";$("title-status").textContent="Opening your saved home…";
 if(!client){
  const actorId=me.identity.id;let ownedClient;
  ownedClient=createHouseClient({expectedIdentityId:actorId,onUpdateRequired:error=>{if(client===ownedClient)showUpdateRequired(error);},onSnapshot:snapshot=>{if(client===ownedClient)onSnapshot(snapshot);},onDisconnect:()=>{if(client!==ownedClient)return;onSnapshot(null);void checkMembership();},onError:error=>{if(client!==ownedClient||(live?.durable.selfId||me?.identity.id)!==actorId)return;if(showConnectionLimit(error))return;notice(error.message||String(error));if(["FORBIDDEN","NO_HOUSE","UNAUTHENTICATED"].includes(error.code))void checkMembership();}});
  client=ownedClient;await ownedClient.connect();
 }
}
for(const [form,type] of [["create-form","house.create"],["join-form","house.join"]])$(form).addEventListener("submit",protectedAction(async()=>{
 const name=$("name").value.trim();if(!name){$("name").focus();notice("Choose a name your friends will recognise.");return;}
 const payload={name,colour:$("colour").value,...(type==="house.create"?{capacity:Number($("capacity").value)}:{code:$("join-code").value.trim().toUpperCase()})};
 const lobbyKey=JSON.stringify([me?.identity.id,type,payload]),intent=pending.get(lobbyKey)||command(type,payload);pending.set(lobbyKey,intent);
 try{inspector ||= createPendingInspector({expectedIdentityId:me?.identity.id,fetchMe:()=>api("/api/house/me")});await inspector.command(intent);pending.delete(lobbyKey);}
 catch(error){
  if(!error.code||["STORAGE_UNAVAILABLE","ALREADY_MEMBER","TIMEOUT","PENDING"].includes(error.code)){
   try{const saved=await api("/api/house/me");if(saved.home){pending.delete(lobbyKey);await bootstrap(true);notice("Opened your saved house. The original reply was interrupted.");return;}}catch{ /* The original UUID remains pending for an explicit retry. */ }
  }else pending.delete(lobbyKey);
  throw error;
 }
 await bootstrap(true);notice(type==="house.create"?"Your house is ready. Share its code with a friend.":"Welcome to the house.");
}));
$("quick-chat").addEventListener("submit",protectedAction(async()=>{
 const text=$("chat-input").value.trim();if(!text||!live)return;
 const submittedVersion=chatVersion,submittedScope=scopeKey(live),submittedText=$("chat-input").value,submittedZone=live.durable.zoneId;
 await save("chat.send",{zoneId:submittedZone,text});
 if(chatVersion===submittedVersion&&scopeKey(live)===submittedScope&&$("chat-input").value===submittedText){$("chat-input").value="";$("chat-draft-status").textContent="Message saved · Enter for a new line";}
 if(suspendedDrafts?.scope===submittedScope&&suspendedDrafts.chatVersion===submittedVersion&&suspendedDrafts.chat===submittedText)suspendedDrafts.chat="";
}));
for(const radio of document.querySelectorAll("input[name=availability]"))radio.addEventListener("change",protectedAction(()=>client.setAvailability(radio.value)));
$("panel-close").addEventListener("click",closePanel);
document.addEventListener("keydown",event=>{if(event.key!=="Escape"||event.isComposing)return;event.preventDefault();if(embeddedFrame){closeBoard();return;}if(activePanel){closePanel();return;}if(entered&&live)openPanel("options");});
$("title-continue").addEventListener("click",protectedAction(()=>bootstrap(true)));
$("title-create").addEventListener("click",()=>openAdmission("create"));$("title-join").addEventListener("click",()=>openAdmission("join"));$("admission-back").addEventListener("click",renderTitle);
$("chat-close").addEventListener("click",()=>chatWindow.close());$("shared-board").addEventListener("click",openBoard);$("board-return").addEventListener("click",closeBoard);
window.addEventListener("message",event=>{if(embeddedFrame&&event.source===embeddedFrame.contentWindow&&event.origin===window.location.origin&&event.data?.type==="night-board-close")closeBoard();});
$("resume-game").addEventListener("click",closePanel);
$("return-title").addEventListener("click",()=>{closePanel();closeBoard();chatWindow.close();client?.close();client=null;onSnapshot(null);renderTitle();});
$("touch-toggle").addEventListener("click",()=>{const visible=$("movement-controls").hidden;$("movement-controls").hidden=!visible;$("touch-toggle").setAttribute("aria-expanded",String(visible));world?.setDirection?.(0,0);queueSafeArea();});
$("camera-zoom").addEventListener("input",()=>{world?.setCameraZoom?.(Number($("camera-zoom").value));renderCameraMode();});
$("reduced-motion").addEventListener("change",()=>{reducedMotion=$("reduced-motion").checked;document.body.dataset.reducedMotion=String(reducedMotion);world?.setReducedMotion?.(reducedMotion);try{window.localStorage.setItem("night-neighbourhood.reduced-motion",String(reducedMotion));}catch{/* Play remains available without local preferences. */}});
$("chat-input").addEventListener("keydown",event=>{if(event.key==="Enter"&&(event.ctrlKey||event.metaKey)&&!event.isComposing){event.preventDefault();$("quick-chat").requestSubmit();}});
for(const button of document.querySelectorAll("[data-panel]"))button.addEventListener("click",()=>openPanel(button.dataset.panel));
$("house-code-button").addEventListener("click",()=>openPanel("house"));
$("recover-open").addEventListener("click",()=>openPanel("recovery"));
$("recovery-form").addEventListener("submit",protectedAction(async()=>{await api("/api/house/recover",{proof:$("recovery-proof").value.trim()});invalidateIdentityView();await bootstrap();notice("Your room and saved work are back. Create a new recovery key.");}));
for(const [id,mode] of [["camera-overview","overview"],["camera-hud-overview","overview"],["camera-look","inspection"],["camera-hud-look","inspection"]])$(id).addEventListener("click",()=>{world?.setCameraMode?.(mode);renderCameraMode();queueSafeArea();});
for(const id of ["camera-recenter","camera-hud-follow"])$(id).addEventListener("click",()=>{if(world?.recenterCamera)world.recenterCamera();else world?.setCameraMode?.("play");renderCameraMode();queueSafeArea();});
$("takeover").addEventListener("click",protectedAction(()=>client.takeover()));
$("interact").addEventListener("click",()=>world?.interact());
for(const [id,x,z] of [["move-up",0,-1],["move-down",0,1],["move-left",-1,0],["move-right",1,0]]){
 const button=$(id);button.addEventListener("pointerdown",event=>{event.preventDefault();button.setPointerCapture(event.pointerId);world?.setDirection(x,z);});
 for(const name of ["pointerup","pointercancel","lostpointercapture"])button.addEventListener(name,()=>world?.setDirection(0,0));
}
$("chat-input").addEventListener("input",()=>{chatVersion++;$("chat-draft-status").textContent=$("chat-input").value?"Unsent draft · Ctrl / ⌘ Enter to send":"Enter for a new line · Ctrl / ⌘ Enter to send";});
$("card-form").addEventListener("input",()=>{cardVersion++;cardDirty=true;$("close-card").disabled=true;$("card-status").textContent="Unsaved draft";});
$("card-form").addEventListener("submit",protectedAction(async()=>{
 if(!live?.controller)return;
 const submittedVersion=cardVersion, submittedScope=identityScope(live), submittedBase=cardBase;
 const payload={...(cardBase?{cardId:cardBase.id}:{}),smallGoal:$("small-goal").value,question:$("question").value,resourceUrl:$("resource").value,nextStep:$("next-step").value,helpRequested:$("help-requested").checked};
 try{
  const receipt=await save("card.save",payload,submittedBase?.revision||0);
  if((live?identityScope(live):lastIdentityScope)!==submittedScope)return;
  cardProjection={scope:submittedScope,id:submittedBase?.id||receipt.result?.cardId,revision:receipt.entityRevision,streamId:receipt.streamId,sequence:receipt.sequence,payload};
  if(cardVersion===submittedVersion){cardDirty=false;if(live)fillCard();else cardBase={id:submittedBase?.id||receipt.result?.cardId,revision:receipt.entityRevision};if(live)notice("Your card is saved. Closing it is your choice.");}
  else{const id=submittedBase?.id||receipt.result?.cardId;cardBase=id?{id,revision:receipt.entityRevision}:submittedBase;cardDirty=true;if(live){$("card-status").textContent="Submitted version saved. Your newer edits are still a draft.";notice("Your newer edits are kept as a draft.");}}
 }
 catch(error){if(identityScope(live)!==submittedScope)throw error;$("saved-card").hidden=false;$("card-status").textContent="Draft kept. "+error.message;throw error;}
}));
$("saved-card").addEventListener("click",()=>{cardDirty=false;fillCard();});
$("close-card").addEventListener("click",protectedAction(async()=>{
 if(!live?.controller||cardDirty)return;const card=effectiveCard()||cardBase;if(!card)return;
 const submittedVersion=cardVersion,submittedScope=identityScope(live),receipt=await save("card.close",{cardId:card.id},card.revision);
 if((live?identityScope(live):lastIdentityScope)!==submittedScope)return;
 cardBase=null;cardProjection={scope:submittedScope,streamId:receipt.streamId,sequence:receipt.sequence,closed:true};
 if(cardVersion===submittedVersion){cardDirty=false;if(live)fillCard();if(live)notice("Card closed by you.");}
 else {cardDirty=true;if(live){$("card-status").textContent="Card closed. Your newer edits are a new draft.";notice("Your newer edits are kept as a new draft.");}}
}));
$("room-form").addEventListener("input",()=>{if(!roomWritable())return;const draft=ensureRoomDraft();if(!draft)return;draft.metadata={open:$("room-open").checked,palette:$("palette").value};draft.metadataDirty=true;draft.metadataVersion++;draft.metadataMessage="Unsaved room settings";$("room-status").textContent=draft.metadataMessage;renderStarter();});
$("room-form").addEventListener("submit",protectedAction(async()=>{
 const room=ownRoom(),draft=ensureRoomDraft();if(!room||!draft||!roomWritable())return;
 const submitted={scope:draft.scope,version:draft.metadataVersion,base:draft.metadataBase,metadata:{...draft.metadata},placements:structuredClone(room.revision<draft.ackRevision?draft.basePlacements:room.placements)};
 try{
  const receipt=await save("room.configure",{roomId:room.id,...submitted.metadata},submitted.base);
  if(roomDraft!==draft||(live&&draft.scope!==roomScope()))return;
  if(draft.layoutBase===submitted.base&&JSON.stringify(draft.basePlacements)===JSON.stringify(submitted.placements))draft.layoutBase=receipt.entityRevision;
  draft.ackRevision=Math.max(draft.ackRevision,receipt.entityRevision);draft.metadataBase=receipt.entityRevision;if(draft.lightBase===submitted.base)draft.lightBase=receipt.entityRevision;
  if(draft.metadataVersion===submitted.version){draft.metadataDirty=false;draft.metadataMessage="Room settings saved.";}
  else draft.metadataMessage="Submitted settings saved. Your newer edits are still a draft.";
  if(live){renderRoom();notice(draft.metadataMessage);}
 }catch(error){if(roomDraft===draft&&draft.scope===roomScope()){draft.metadataMessage="Draft kept. "+error.message;$("room-status").textContent=draft.metadataMessage;}throw error;}
}));
for(const [id,dx,dz,rotate,remove] of [["piece-left",-.5,0],["piece-right",.5,0],["piece-forward",0,-.5],["piece-back",0,.5],["piece-rotate",0,0,true],["piece-remove",0,0,false,true]])$(id).addEventListener("click",()=>modifyPlacement(dx,dz,rotate,remove));
$("piece-add").addEventListener("click",()=>{
 if(!roomWritable())return;const draft=ensureRoomDraft();if(!draft)return;const kind=$("kind").value;
 for(let z=-3;z<=2;z+=.5)for(let x=-5;x<=5;x+=.5){const item={id:crypto.randomUUID(),kind,x,z,rotation:0,colour:$("palette").value};const next=[...draft.layout,item];if(validatePlacements(next)){draft.layout=next;draft.layoutVersion++;draft.layoutDirty=true;draft.layoutMessage="";draft.reviewing=false;renderPlacements();renderStarter();$("placement").value=item.id;return;}}
 notice("There is no clear space for that piece. Move or remove something first.");
});
$("layout-save").addEventListener("click",protectedAction(async()=>{
 const room=ownRoom(),draft=ensureRoomDraft();if(!room||!draft||!roomWritable())return;
 const submitted={scope:draft.scope,version:draft.layoutVersion,base:draft.layoutBase,placements:structuredClone(draft.layout)};
 try{
  const receipt=await save("room.placements",{roomId:room.id,placements:submitted.placements},submitted.base);
  if(roomDraft!==draft||(live&&draft.scope!==roomScope()))return;
  draft.ackRevision=Math.max(draft.ackRevision,receipt.entityRevision);
  if(draft.layoutBase===submitted.base){draft.layoutBase=receipt.entityRevision;draft.basePlacements=submitted.placements;}
  if(draft.metadataBase===submitted.base)draft.metadataBase=receipt.entityRevision;if(draft.lightBase===submitted.base)draft.lightBase=receipt.entityRevision;
  if(draft.layoutVersion===submitted.version){draft.layoutDirty=false;draft.layoutMessage="Your arrangement is saved.";}
  else draft.layoutMessage="Submitted arrangement saved. Your newer edits are still a preview.";
  if(live){renderRoom();notice(draft.layoutMessage);}
 }catch(error){if(roomDraft===draft&&draft.scope===roomScope()){draft.layoutMessage="Preview kept. "+error.message+" Review the saved layout or explicitly reset.";renderPlacements();}throw error;}
}));
$("room-reset").addEventListener("click",()=>{const draft=ensureRoomDraft();if(!draft)return;if(draft.metadataDirty&&!confirm("Replace your unsaved room settings with the saved settings?"))return;draft.metadataDirty=false;draft.metadataVersion++;draft.metadataMessage="";renderRoom();});
$("layout-review").addEventListener("click",()=>{if(roomDraft){roomDraft.reviewing=!roomDraft.reviewing;renderPlacements();}});
$("layout-reset").addEventListener("click",()=>{if(!ownRoom())return;if(roomDraft?.layoutDirty&&!confirm("Replace your unsaved furniture preview with the saved layout?"))return;roomDraft.layoutDirty=false;roomDraft.layoutVersion++;roomDraft.layoutMessage="";roomDraft.reviewing=false;renderRoom();});

$("copy-code").addEventListener("click",protectedAction(async()=>{await navigator.clipboard.writeText(live.durable.house.code);notice("House code copied.");}));
$("leave-house").addEventListener("click",protectedAction(async()=>{
 if(!confirm("Leave this house? Your room and current next step will be kept in your private export."))return;
 await save("house.leave",{});client?.close();client=null;closePanel();await bootstrap();notice("You have left. Your saved data remains yours.");
}));
async function issueRecoveryKey(outputId){
 if(keyIssuance)return;
 const request={context:privateContext()};keyIssuance=request;setRecoveryBusy(true);
 try{
  const result=await api("/api/house/recovery-key",{});
  if(keyIssuance!==request||request.context!==privateContext())return;
  $("recovery-output").textContent="";$("lobby-recovery-output").textContent="";$(outputId).textContent=result.proof;
  notice("Keep this key private. It replaces your previous key.",true);
 }finally{if(keyIssuance===request){keyIssuance=null;setRecoveryBusy(false);}}
}
$("recovery-key").addEventListener("click",protectedAction(()=>issueRecoveryKey("recovery-output")));
$("export-own").addEventListener("click",protectedAction(async()=>{
 const context=privateContext(),data=await api("/api/house/export",{});if(context!==privateContext())return;const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));
 const link=node("a");link.href=url;link.download="my-study-house.json";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}));
function sendGame(type,payload,revision){
 const task=save(type,payload,revision);if(type==="game.join"&&live){const key=JSON.stringify([live.durable.house.id,live.durable.selfId,type,payload,revision]),intent=pending.get(key);if(intent)task.gameJoinIntent={scope:identityScope(live),command:structuredClone(intent)};}return task;
}
async function retryOriginalGameJoin(intent){
 if(!live?.controller||live.durable.zoneId!=="lounge"||intent.type!=="game.join"||intent.houseId!==live.durable.house.id)throw Object.assign(new Error("Return to lounge control to inspect the original Join."),{code:"NOT_CONTROLLER"});
 const receipt=await client.command(intent);forgetPending(intent.commandId,receipt);void refreshGamePending();return receipt;
}
function gamePendingIntents(){
 if(!live)return [];const rows=new Map(gamePendingRows.filter(row=>row.houseId===live.durable.house.id).map(row=>[row.commandId,row]));
 for(const intent of pending.values())if(intent.houseId===live.durable.house.id&&intent.type.startsWith("game."))rows.set(intent.commandId,intent);return [...rows.values()];
}
function renderGame(){
 const rows=gamePendingIntents(),round=live?.durable.game?.current,participant=Boolean(round?.players.includes(live.durable.selfId));gameUI.update(live,{pendingCount:rows.length});
 $("game-table-status").hidden=!live||(!participant&&!rows.length);$("game-table-label").textContent=rows.some(row=>row.type==="game.leave")?"Withdrawal pending":participant?"At break table · "+round.status:"Game action pending";$("game-table-leave").hidden=!participant;$("game-table-reopen").disabled=live?.durable.zoneId!=="lounge";queueSafeArea();
}
async function refreshGamePending(){
 if(!live||!client)return;const request=++gamePendingRequest,context=identityScope(live);
 try{const result=await client.getPending();if(request!==gamePendingRequest||context!==identityScope(live))return;for(const intent of [...pending.values()])if(intent.type.startsWith("game.")&&!saveFlights.has(intent.commandId)&&!result.entries.some(row=>row.commandId===intent.commandId))forgetPending(intent.commandId);gamePendingRows=result.entries.filter(row=>row.type.startsWith("game."));renderGame();}catch{/* Storage/transport problems remain visible through the action or Pending drafts. */}
}
function walkToPlace(place){
 if(!live?.controller){notice("Take control in this tab before walking.");return;}
 closePanel();
 if(live.durable.zoneId!=="lounge"&&(place!=="room"||!ownRoom())){plannedPlace=place;if(!world?.approach({type:"exit"})){plannedPlace=null;notice("Stand up before returning to the lounge.");}return;}
 if(!world?.routeTo?.(place))notice(place==="room"&&ownRoom()?"You are already in your room.":"That place is unavailable right now. Stand up and try again.");
}
$("game-table-reopen").addEventListener("click",()=>openPanel("game"));
$("game-table-leave").addEventListener("click",()=>gameUI.leave());
for(const button of document.querySelectorAll("[data-place]"))button.addEventListener("click",()=>walkToPlace(button.dataset.place));
function pendingSource(){return client||(inspector ||= createPendingInspector({expectedIdentityId:me?.identity.id,fetchMe:()=>api("/api/house/me")}));}
async function renderPending(){
 const request=++pendingRequest, identity=live?.durable.selfId||me?.identity.id;
 const result=await pendingSource().getPending();
 if(request!==pendingRequest||activePanel!=="pending"||(live?.durable.selfId||me?.identity.id)!==identity)return;
 reconcilePendingMemory(result);$("pending-entries").replaceChildren();
 for(const entry of result.entries){
  const row=node("article",undefined,"pending-entry");row.dataset.commandId=entry.commandId;
  row.append(node("strong",entry.type+" · "+(entry.state==="expired"?"Expired automatic retry":"Pending reply")),node("p","Saved status unknown · original "+(entry.zoneId||"house admission")+" · "+new Date(entry.createdAt).toLocaleString(),"subtle"));
  const details=node("details"),summary=node("summary","My original draft"),body=node("pre",JSON.stringify(entry.command.payload,null,2));details.append(summary,body);row.append(details);
  const actions=node("div",undefined,"button-row"),retry=node("button",entry.state==="expired"?"Retry expired draft":"Retry original action");retry.dataset.action="retry";retry.disabled=!entry.canRetry;
  retry.addEventListener("click",protectedAction(async()=>{const context=privateContext(),receipt=await pendingSource().retryPending(entry.commandId);if(context!==privateContext())return;forgetPending(entry.commandId,receipt);notice("Original action acknowledged. Check its saved result.");await bootstrap();if(activePanel==="pending")void protectedAction(renderPending)();}));
  const discard=node("button","Discard local draft");discard.addEventListener("click",protectedAction(async()=>{if(!confirm("Discard this local pending draft? Its server save status is unknown."))return;const context=privateContext();await pendingSource().discardPending(entry.commandId);if(context!==privateContext())return;forgetPending(entry.commandId);void protectedAction(renderPending)();}));actions.append(retry,discard);row.append(actions);
  if(!entry.canRetry)row.append(node("p","Retry needs control in the original house and room. Export or discard is available here.","subtle"));
  $("pending-entries").append(row);
 }
 if(!result.entries.length)$("pending-entries").append(node("p","No pending drafts for this identity.","subtle"));
 $("pending-foreign").textContent=result.otherIdentityCount?result.otherIdentityCount+" local drafts belong to another identity. Restore that identity to inspect or export them.":"";
 $("pending-discard-foreign").hidden=!result.otherIdentityCount;
}
$("connection-limit-pending").addEventListener("click",()=>openPanel("pending"));
$("lobby-pending").addEventListener("click",()=>openPanel("pending"));
$("pending-refresh").addEventListener("click",protectedAction(renderPending));
$("pending-export").addEventListener("click",protectedAction(async()=>{const context=privateContext(),data=await pendingSource().exportPending();if(context!==privateContext())return;const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));const link=node("a");link.href=url;link.download="my-pending-house-drafts.json";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}));
$("pending-discard-foreign").addEventListener("click",protectedAction(async()=>{if(!confirm("Delete local drafts belonging to other identities without viewing them? Restore those identities first if you need their drafts."))return;await pendingSource().discardOtherIdentities();void protectedAction(renderPending)();}));
const hudResizeObserver=typeof window.ResizeObserver==="function"?new window.ResizeObserver(queueSafeArea):null;
for(const element of document.querySelectorAll(HUD_SAFE_SELECTOR))hudResizeObserver?.observe(element);
window.addEventListener("resize",queueSafeArea);
window.visualViewport?.addEventListener("resize",queueSafeArea);window.visualViewport?.addEventListener("scroll",queueSafeArea);
window.addEventListener("pagehide",()=>{clearTimeout(noticeTimer);hudResizeObserver?.disconnect();if(safeAreaFrame!==null){if(window.cancelAnimationFrame)window.cancelAnimationFrame(safeAreaFrame);else clearTimeout(safeAreaFrame);}closeBoard();chatWindow.dispose();gameUI.dispose();panelFocus.dispose();boardFocus.dispose();client?.close();world?.dispose();});
bootstrap().catch(error=>{if(showConnectionLimit(error))return;notice(error.message,true);$("connection-status").textContent="Could not open the house";$("title-status").textContent="Could not check your saved home. Reload to retry.";});

$("walk-room").addEventListener("click",()=>{const resident=live?.durable.residents.find(r=>r.id===live.durable.selfId);closePanel();if(resident&&!world?.approach({type:"door",slot:resident.slot}))notice("Stand up before walking to your room.");});
$("return-lounge").addEventListener("click",()=>{closePanel();if(!world?.approach({type:"exit"}))notice("Stand up before returning to the lounge.");});
$("walk-seat").addEventListener("click",()=>{closePanel();if(live?.durable.zoneId!=="lounge"){notice("Return to the lounge for the shared study table.");return;}if(!world?.approach({type:"seat"}))notice("Stand up before choosing another seat.");});

$("lobby-export").addEventListener("click",protectedAction(async()=>{const context=privateContext(),data=await api("/api/house/export",{});if(context!==privateContext())return;const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));const link=node("a");link.href=url;link.download="my-study-house.json";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}));
$("lobby-recovery-key").addEventListener("click",protectedAction(()=>issueRecoveryKey("lobby-recovery-output")));
