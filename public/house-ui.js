import { createHouseClient, createPendingInspector } from "./house-client.js";
import { createHouseGameUI } from "./house-game-ui.js";
import { createHouseGatheringUI } from "./house-gathering-ui.js";
import { createHouseStudioUI } from "./house-studio-ui.js";
import { createHouseStudioPreview } from "./house-studio-preview.js";
import { createHousePuzzleUI } from "./house-puzzle-ui.js";
import { createHouseWorld } from "./house-world.js";
import { ROOM_PRESETS, getRoomPreset } from "./house-room-content.js";
import { validatePlacements, footprint, createLayout } from "./house-geometry.js";
import { createMovableWindow, createModalFocus } from "./house-shell.js";
const $ = id => document.getElementById(id);
function setPlaceLabel(text){const label=$("place-label");label.textContent=text;label.title=text;}
setPlaceLabel($("place-label").textContent||"");
const HUD_SAFE_SELECTOR=".world-status,#resident-disclosure,.availability,#camera-hud,.toolbelt,#chat-window,.movement,#game-table-status,.touch-toggle,.context-hint,#panel,#notice,#takeover";
let live = null, me = null, world = null, client = null, activePanel = null;
let voiceDraft=null,updateRecovery=null,voicePendingRows=[],voicePendingScope="",voicePendingError="";
let cardDirty = false, cardBase = null, cardProjection=null, roomDraft = null, suspendedDrafts = null;
let lastScope="", lastIdentityScope="", lastHouseKey="", inspector=null, pendingRequest=0, privacyGeneration=0,bootstrapRequest=0,keyIssuance=null;
const unreadStreams=new Map(), zoneDrafts=new Map(), roomDrafts=new Map();
let pendingSeatChoice=null,plannedVisit=null,gatheringKind="study",pendingReturn=null;
let adminRequest=0,safeAreaFrame=null;
let lastDurableKey = "", noticeTimer, chatVersion=0, cardVersion=0, checkingMembership=false;
const pending = new Map(), pendingZones = new Map(), saveFlights = new Set();
let entered=false,embeddedFrame=null,embeddedContext="",boardLauncher=null,boardReturnGathering=null;
let gamePendingRows=[],gamePendingRequest=0,gameRefreshKey="",plannedPlace=null,breakActivity="picture",returnJourney=null;
const gameUI=createHouseGameUI($("four-game-panel"),{send:sendGame,resolveJoin:retryOriginalGameJoin,onLeave:closePanel,onReturn:()=>returnToMyRoom("four"),onPending:()=>openPanel("pending"),onError:message=>{if(activePanel!=="game")notice(message,true);}});
const puzzleUI=createHousePuzzleUI($("picture-game-panel"),{send:save,intent:(mode,roundId)=>client.puzzleIntent(mode,roundId),retryIntent:()=>client.retryPuzzleIntent(),pendingIntent:()=>client?.pendingPuzzleIntent?.()||null,onLeave:closePanel,onReturn:()=>returnToMyRoom("picture"),onPending:()=>openPanel("pending"),onChat:()=>openPanel("chat")});
const roomPreview=createHouseStudioPreview({document,onPreview:image=>world?.setStudioPreview?.(image)});
const studioUI=createHouseStudioUI($("studio-panel"),{api:{state:roomId=>studioRequest("/api/house/studio?roomId="+encodeURIComponent(roomId),undefined,roomId),image:(roomId,imageId)=>studioRequest("/api/house/studio/image?roomId="+encodeURIComponent(roomId)+"&imageId="+encodeURIComponent(imageId),undefined,roomId,true),command:exactCommand=>studioRequest("/api/house/studio/command",exactCommand,exactCommand.roomId),export:value=>studioRequest("/api/house/studio/export",value,value.roomId||live?.durable.room?.id)},onClose:()=>{if(activePanel==="studio")closePanel();},onChat:()=>openPanel("chat"),onStatus:message=>{if(message&&activePanel==="studio")notice(message);}});
const gatheringUI=createHouseGatheringUI($("gathering-panel"),{api:{state:kind=>gatheringRequest("/api/house/gathering?kind="+encodeURIComponent(kind),undefined,kind),action:(command,context)=>gatheringRequest("/api/house/gathering",command,command.kind,false,context),image:(kind,itemId)=>gatheringRequest("/api/house/gathering/image?kind="+encodeURIComponent(kind)+"&itemId="+encodeURIComponent(itemId),undefined,kind,true)},onOpenBoard:()=>openBoard({keepGathering:true}),onClose:()=>{if(activePanel==="gathering")closePanel();},onChat:()=>openPanel("chat")});
const panelFocus=createModalFocus($("panel")),boardFocus=createModalFocus($("board-workspace"));
const chatWindow=createMovableWindow({window,element:$("chat-window"),handle:$("chat-handle"),body:$("chat-body"),collapse:$("chat-collapse"),resize:$("chat-resize"),onChange:state=>{if(state.shown&&!state.collapsed&&chatReadable())markChatRead();queueSafeArea();}});
let reducedMotion=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches||false;
try{const saved=window.localStorage.getItem("night-neighbourhood.reduced-motion");if(saved!==null)reducedMotion=saved==="true";}catch{/* A blocked preference store does not block play. */}
$("reduced-motion").checked=reducedMotion;document.body.dataset.reducedMotion=String(reducedMotion);
function setShellInert(){const modal=Boolean(embeddedFrame||activePanel&&!["room","game","studio","gathering"].includes(activePanel));for(const id of ["world","game-controls","entry","chat-window"])$(id).inert=modal;}
function renderTitle(){
 $("lobby-export").hidden=!me?.archiveCount;$("archive-count").hidden=!me?.archiveCount;$("archive-count").textContent=me?.archiveCount?me.archiveCount+" private room archive"+(me.archiveCount===1?"":"s")+" available in your download.":"";
 entered=false;$("title-screen").hidden=false;$("lobby").hidden=true;$("game-controls").hidden=true;document.body.dataset.screen="title";
 $("title-continue").hidden=!me?.home;$("title-create").disabled=Boolean(me?.home);$("title-join").disabled=Boolean(me?.home);
 $("title-status").textContent=me?.home?"Your saved home is ready.":"Create a house, or use a friend’s house code.";applyInput();
}
function openAdmission(kind){if(me?.home){notice("Continue your saved home first. House settings includes leaving it.");return;}$("title-screen").hidden=true;$("lobby").hidden=false;$("admission-title").textContent=kind==="create"?"Create your house":"Join your friends";$("create-form").hidden=kind!=="create";$("join-form").hidden=kind!=="join";$("name").focus();document.body.dataset.screen="admission";applyInput();}
function closeBoard(){
 if(!embeddedFrame)return;embeddedFrame.remove();embeddedFrame=null;embeddedContext="";$("board-workspace").hidden=true;$("board-status").textContent="";
 const retained=boardReturnGathering;boardReturnGathering=null;if(retained&&retained===gatheringAuthorityKey(gatheringContext())){activePanel="gathering";$("panel").hidden=false;$("panel").dataset.tool="gathering";}
 setShellInert();applyInput();boardFocus.close();if(boardLauncher?.isConnected&&!boardLauncher.closest("[hidden]"))boardLauncher.focus();boardLauncher=null;queueSafeArea();
}
function openBoard({keepGathering=false}={}){
 if(!live){notice("Waiting for the house connection.");return;}
 if(keepGathering&&activePanel==="gathering"){boardReturnGathering=gatheringAuthorityKey(gatheringContext());activePanel=null;$("panel").hidden=true;}else{boardReturnGathering=null;closePanel();}
 chatWindow.close();boardLauncher=document.activeElement;embeddedContext=privateContext();embeddedFrame=document.createElement("iframe");embeddedFrame.id="board-frame";embeddedFrame.title="Collaborative shared board";embeddedFrame.src="/board/?embedded=1";const ownedFrame=embeddedFrame;embeddedFrame.addEventListener("load",()=>{if(embeddedFrame===ownedFrame&&embeddedContext===privateContext())$("board-status").textContent=boardReturnGathering?"Independent board · huddle kept at your seat":"House-wide workspace";});$("board-frame-host").replaceChildren(embeddedFrame);$("board-workspace").hidden=false;$("board-status").textContent="Opening the shared workspace…";setShellInert();applyInput();boardFocus.open(boardLauncher);
}

const RETAIN_INTENT_CODES=new Set(["TIMEOUT","PENDING","STORAGE_UNAVAILABLE","NOT_CONTROLLER","STALE_ZONE","CLOSED","IDENTITY_CHANGED","INSPECTION_REQUIRED","CLIENT_UPDATE_REQUIRED","ACTIVITY_SEAT_REQUIRED"]);
function node(tag, text, className) { const e=document.createElement(tag); if(text!==undefined)e.textContent=text; if(className)e.className=className; return e; }
function notice(message,persistent=false){
 clearTimeout(noticeTimer);const target=activePanel?$("panel-feedback"):!$("title-screen").hidden?$("title-feedback"):!$("lobby").hidden?$("lobby-feedback"):$("notice");for(const id of ["notice","panel-feedback","lobby-feedback","title-feedback"])$(id).hidden=true;target.textContent=message;target.hidden=false;queueSafeArea();
 if(!persistent)noticeTimer=setTimeout(()=>{target.hidden=true;queueSafeArea();},6500);
}
async function api(path, body, extraHeaders={}) {
 const abort=new AbortController();let timer;
 const request=(async()=>{
  const response=await fetch(path,{signal:abort.signal,...(body===undefined?{cache:"no-store",headers:extraHeaders}:{method:"POST",headers:{"Content-Type":"application/json",...extraHeaders,...((live?.durable.selfId||me?.identity.id)?{"X-House-Identity":live?.durable.selfId||me.identity.id}:{})},body:JSON.stringify(body)})});
  const result=await response.json();if(!response.ok){const error=new Error(result.message||"The house is temporarily unavailable.");error.code=result.code;throw error;}return result;
 })();
 try{return await Promise.race([request,new Promise((_,reject)=>{timer=setTimeout(()=>{abort.abort();const error=new Error("The reply did not arrive. This action is pending, not confirmed saved. Keep its original draft for retry.");error.code="TIMEOUT";reject(error);},8000);})]);}
 finally{clearTimeout(timer);}
}
function studioContext(){const room=live?.durable.room;if(!room)return null;const owner=live.durable.residents.find(person=>person.id===room.ownerId);return {serverEpoch:live.serverEpoch,identityId:live.durable.selfId,houseId:live.durable.house.id,roomId:room.id,ownerId:room.ownerId,ownerName:owner?.name||"Resident",doorOpen:room.open,controller:live.controller,generation:live.generation,accessGeneration:live.accessGeneration,zoneId:live.durable.zoneId};}
async function studioRequest(path,body,roomId,binary=false){
 const scope=studioContext(),context=privateContext();if(!scope||scope.roomId!==roomId)throw Object.assign(new Error("Return to the permitted room before opening its studio."),{code:"STALE_ZONE"});
 const headers={"X-House-Identity":scope.identityId};if(path==="/api/house/studio/command"){const authority=client.getRoomHttpAuthority();if(authority.zoneId!==scope.roomId)throw Object.assign(new Error("Return to the original room before retrying."),{code:"STALE_ZONE"});headers["X-House-Generation"]=String(scope.generation);headers["X-House-Access-Generation"]=String(scope.accessGeneration);headers["X-House-Controller-Token"]=authority.controllerToken;}
 let result;if(binary){const response=await fetch(path,{cache:"no-store",headers});if(!response.ok){const error=await response.json();throw Object.assign(new Error(error.message||"This image is unavailable."),{code:error.code});}result=await response.blob();}else result=await api(path,body,headers);
 const current=studioContext();if(context!==privateContext()||!current||JSON.stringify(scope)!==JSON.stringify(current))throw Object.assign(new Error("Room access changed. Reopen the current studio."),{code:"STALE_ZONE"});if(path==="/api/house/studio/command"&&["studio.upload.commit","studio.clear"].includes(body?.type))void roomPreview.refresh();return result;
}
function gatheringContext(kind=gatheringKind){if(!live)return null;const self=live.players.find(player=>player.id===live.durable.selfId);return {kind,houseId:live.durable.house.id,identityId:live.durable.selfId,controller:live.controller,generation:live.generation,accessGeneration:live.accessGeneration,zoneId:live.durable.zoneId,seatPurpose:self?.connected&&live.durable.zoneId==="lounge"?createLayout(live.durable.house.capacity).seats.find(seat=>seat.id===self.seatId)?.purpose||null:null,seatId:self?.seatId||null,seatGeneration:self?.seatGeneration,ownRoomId:live.durable.residents.find(person=>person.id===live.durable.selfId)?.bedroomId,residents:live.durable.residents.map(person=>({id:person.id,name:person.name}))};}
function gatheringAuthorityKey(value){return JSON.stringify(value?[value.kind,value.houseId,value.identityId,value.controller,value.generation,value.accessGeneration,value.zoneId,value.seatPurpose,value.seatId,value.seatGeneration]:null);}
async function gatheringRequest(path,body,kind,binary=false,captured=null){
 const scope=gatheringContext(kind),context=privateContext();if(!scope||scope.zoneId!=="lounge"||(captured&&gatheringAuthorityKey(captured)!==gatheringAuthorityKey(scope)))throw Object.assign(new Error("Return to the original lounge place and reopen its choices."),{code:"STALE_ZONE"});const headers={"X-House-Identity":scope.identityId};if(body){const requested=captured||scope;if(!Number.isSafeInteger(requested.seatGeneration))throw Object.assign(new Error("Wait for the current chair authority, then reopen its choices."),{code:"STALE_ZONE"});const authority=client.getRoomHttpAuthority();headers["X-House-Generation"]=String(requested.generation);headers["X-House-Access-Generation"]=String(requested.accessGeneration);headers["X-House-Seat-Generation"]=String(requested.seatGeneration);headers["X-House-Controller-Token"]=authority.controllerToken;}
 let result;if(binary){const response=await fetch(path,{cache:"no-store",headers});if(!response.ok){const error=await response.json();throw Object.assign(new Error(error.message||"This shared item is unavailable."),{code:error.code});}result=await response.blob();}else result=await api(path,body,headers);
 if(context!==privateContext()||gatheringAuthorityKey(scope)!==gatheringAuthorityKey(gatheringContext(kind)))throw Object.assign(new Error("Your place changed. Reopen its choices."),{code:"STALE_ZONE"});return result;
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
 } finally {saveFlights.delete(intent.commandId);if(type.startsWith("game.")||type.startsWith("puzzle."))void refreshGamePending();if(activePanel==="pending")void protectedAction(renderPending)();}
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
 $("pause-description").textContent=live?"Your view is paused. Friends can keep moving and playing.":"Choose your comfort settings before entering the house.";
}
function applyInput(){document.body.dataset.panel=activePanel||"";document.body.dataset.breakActivity=activePanel==="game"?breakActivity:"";world?.setSuspended?.(Boolean(!entered||embeddedFrame||activePanel==="options"));world?.setInputEnabled(Boolean(live?.controller&&entered&&!activePanel&&!embeddedFrame&&$("lobby").hidden));renderCameraMode();setShellInert();}
function closePanel(){activePanel=null;studioUI.close();gatheringUI.close({notify:false});adminRequest++;pendingRequest++;activePanel=null;$("panel").hidden=true;$("modal-backdrop").hidden=true;$("panel-feedback").hidden=true;world?.setEditing(false);world?.setRoomPreview?.(null);applyInput();if(chatReadable())markChatRead();panelFocus.close();queueSafeArea();}
function openPanel(name){
 if(name!=="pending")cancelPendingReturn();
 if(name==="game"&&live?.durable.zoneId!=="lounge"){notice("Walk to the break table in the lounge to open it.");return;}
 if(name==="gathering"&&!["study","rest"].includes(gatheringContext()?.seatPurpose)){notice("Sit at the study table or sofa before opening its choices.");return;}
 if(name==="studio"&&!live?.durable.room){notice("Enter a room to inspect its reference desk.");return;}
 if(name==="chat"){if(!live){notice("Waiting for the house connection.");return;}if(chatWindow.isOpen())chatWindow.close();else {chatWindow.open(document.activeElement);renderTranscript();markChatRead();}return;}
 if(!["recovery","pending","options","about"].includes(name)&&!live){notice("Waiting for the house connection.");return;}
 if(embeddedFrame)return;
 if(activePanel==="gathering"&&name!=="gathering")closePanel();if(name!=="studio")studioUI.close();const visibleNotice=!$("notice").hidden?$("notice").textContent:!$("lobby-feedback").hidden?$("lobby-feedback").textContent:"";activePanel=name;$("panel").hidden=false;$("panel").dataset.tool=name;$("panel").setAttribute("aria-modal",String(!["room","game","studio","gathering"].includes(name)));$("modal-backdrop").hidden=["room","game","studio","gathering"].includes(name);$("panel-feedback").hidden=true;if(visibleNotice)notice(visibleNotice);
 for(const key of ["board","room","studio","gathering","house","recovery","pending","options","about","game","places","voice"])$(key+"-panel").hidden=key!==name;
 $("panel-close").textContent=name==="game"?"Look around":"Close";$("panel-close").setAttribute("aria-label",name==="game"?"Look around while seated":"Close panel");
 $("panel-title").textContent={board:"Saved work",room:"My room",studio:"Room studio",gathering:gatheringKind==="study"?"Study huddle":"Sofa · shared inspection",house:"House settings",recovery:"Recover your identity",pending:"Pending drafts",options:live?"Game paused":"Options",about:"About the neighbourhood",game:"Break table",places:"Places",voice:"Optional voice"}[name];
 applyInput();
 if(name==="pending")void protectedAction(renderPending)();
 if(name==="board"){renderCards();if(!cardDirty)fillCard();}
 if(name==="gathering"){gatheringUI.update(gatheringContext());gatheringUI.open(gatheringKind);}
 if(name==="studio"){studioUI.update(studioContext());studioUI.open();}
 if(name==="room"){renderRoom();void protectedAction(refreshRoomPending)();}
 if(name==="places")renderPlaces();
 if(name==="house"){renderHouse();void protectedAction(inspectVoicePending)();}
 if(name==="voice")renderVoice();
 if(["game","studio","gathering"].includes(name)){panelFocus.close();$("panel-close").focus();if(name==="game")renderGame();}else panelFocus.open();queueSafeArea();
}
function updateWorld(snapshot){
 if(!world)world=createHouseWorld($("world"),{onMove:position=>client?.move(position),onMovementIntent:()=>{pendingReturn=null;returnJourney=null;plannedPlace=null;plannedVisit=null;pendingSeatChoice=null;},onInteract:protectedAction(interact),onSelectPlacement:id=>{$("placement").value=id;},onCameraModeChange:renderCameraMode,onHint:text=>$("context-hint").textContent=text});
 world.update(snapshot);world?.setReducedMotion?.(reducedMotion);applyInput();queueSafeArea();
}
async function interact(target){
 if(!live||!target)return;
 if(target.kind==="game"||target.type==="game"){if(atGameSeat())openPanel("game");else walkToPlace("game");return;}
 if(target.type==="door"){
  const resident=live.durable.residents.find(p=>p.slot===target.slot||p.bedroomId===target.roomId);
  if(!resident){notice("This bedroom is waiting for a new housemate.");return;}
  closePanel();await subscribeForPendingReturn(resident.bedroomId);
 }else if(target.type==="exit"){
  closePanel();await subscribeForPendingReturn("lounge");
 }else if(target.type==="seat"){
  const self=live.players.find(p=>p.id===live.durable.selfId);
  if(self?.seatId){pendingSeatChoice=null;await client.stand();}else {
   const kind=seatKind(target.seatId),choice=kind?{kind,seatId:target.seatId,scope:identityScope(live),generation:live.generation,accessGeneration:live.accessGeneration,serverEpoch:live.serverEpoch,ack:false}:null;pendingSeatChoice=choice;if(pendingReturn?.activity)pendingReturn.seatClaim=choice;
   try{await client.claimSeat(target.seatId);if(choice&&pendingSeatChoice===choice&&seatChoiceCurrent(choice))choice.ack=true;reopenSeatedChoice();}catch(error){if(pendingReturn?.seatClaim===choice)pendingReturn=null;if(pendingSeatChoice===choice)pendingSeatChoice=null;throw error;}
  }
 }else if(["desk","studio","radio"].includes(target.type)){
  openPanel("studio");if(target.type==="radio")$("studio-panel").querySelector("[data-studio-preset]")?.focus();
 }else if(target.type==="lamp"){
  if(!ownRoom()){notice("This lamp belongs to the room owner. Your own room has Lighting controls.");return;}
  openPanel("room");$("room-light").focus();$("light-form").scrollIntoView?.({block:"nearest"});
 }else if(target.type==="board"){
  if(live.durable.zoneId!=="lounge"){notice("The shared board is in the lounge.");return;}
  openBoard();
 }
}
function seatKind(id){if(!live||live.durable.zoneId!=="lounge")return null;const purpose=createLayout(live.durable.house.capacity).seats.find(seat=>seat.id===id)?.purpose;return purpose==="rest"?"sofa":purpose||null;}
function atGameSeat(){return Boolean(live?.controller&&live.durable.zoneId==="lounge"&&live.players.some(player=>player.id===live.durable.selfId&&player.connected&&player.zoneId==="lounge"&&/^game-seat-[1-6]$/.test(player.seatId)));}
function seatChoiceCurrent(choice){return Boolean(live?.controller&&choice.scope===identityScope(live)&&choice.generation===live.generation&&choice.accessGeneration===live.accessGeneration&&choice.serverEpoch===live.serverEpoch);}
function reopenSeatedChoice(){const choice=pendingSeatChoice;if(!choice||!live)return;if(!seatChoiceCurrent(choice)){if(pendingReturn?.seatClaim===choice)pendingReturn=null;pendingSeatChoice=null;return;}const self=live.players.find(player=>player.id===live.durable.selfId);if(choice.ack&&live.controller&&self?.connected&&self.seatId===choice.seatId&&seatKind(self.seatId)===choice.kind){pendingSeatChoice=null;if(pendingReturn){continuePendingReturn();return;}if(!activePanel&&!embeddedFrame){if(choice.kind==="game")openPanel("game");else{gatheringKind=choice.kind;openPanel("gathering");}}}}
function retainZoneDrafts(snapshot){if(!snapshot)return;const cached=zoneDrafts.get(scopeKey(snapshot));if(!cached||cached.restoredVersion!==chatVersion||cached.chat!==$("chat-input").value)zoneDrafts.set(scopeKey(snapshot),{chat:$("chat-input").value,chatVersion});if(roomDraft)roomDrafts.set(roomDraft.scope,roomDraft);}
function clearZoneDrafts(){zoneDrafts.clear();roomDrafts.clear();pendingSeatChoice=null;plannedVisit=null;cancelPendingReturn();}
function privateContext(){return privacyGeneration+":"+(live?.durable.selfId||me?.identity.id||"");}
function identityScope(snapshot){return snapshot?snapshot.durable.house.id+":"+snapshot.durable.selfId:"";}
function scopeKey(snapshot){return snapshot?snapshot.durable.house.id+":"+snapshot.durable.selfId+":"+snapshot.durable.zoneId:"";}
function roomScope(){const room=ownRoom();return room?scopeKey(live)+":"+room.id+":"+room.ownerId:"";}
function cardValues(){return Object.fromEntries(["small-goal","question","resource","next-step"].map(id=>[id,$(id).value]).concat([["help-requested",$("help-requested").checked]]));}
function restoreCard(values){for(const [id,value] of Object.entries(values))if(id==="help-requested")$(id).checked=value;else $(id).value=value;}
function clearPrivateDOM(){
 boardReturnGathering=null;setPlaceLabel("");$("open-room-studio").hidden=true;roomPreview.update(null);studioUI.update(null);gatheringUI.update(null);gameUI.update(null);puzzleUI.update(null);$("game-table-status").hidden=true;
 for(const id of ["roster","transcript","cards","membership-actions","removed-members","placement","pending-entries","resident-visits"])$(id).replaceChildren();
 for(const id of ["name","chat-input","small-goal","question","resource","next-step","palette","room-light","starter-preset","recovery-proof","voice-url"])$(id).value="";
 for(const id of ["join-code-display","capacity-status","room-status","layout-status","availability-freshness","recovery-output","lobby-recovery-output","pending-foreign","card-status","panel-feedback","lobby-feedback","title-feedback","archive-count","starter-summary","starter-status","light-status","room-saved-goal","room-saved-next"])$(id).textContent="";$("lobby-export").hidden=true;$("archive-count").hidden=true;
 $("chat-draft-status").textContent="Enter for a new line · Ctrl / ⌘ Enter to send";$("pending-discard-foreign").hidden=true;$("room-open").checked=false;$("help-requested").checked=false;$("layout-review").hidden=true;$("chat-count").textContent="";
 $("voice-link").hidden=true;$("voice-link").removeAttribute("href");$("voice-destination").textContent="";$("voice-form").hidden=true;
 $("game-place-occupancy").textContent="";$("starter-preview").replaceChildren();world?.setRoomPreview?.(null);closeBoard();chatWindow.reset();
}
function onSnapshot(snapshot){
 if(!snapshot){
  if(pendingReturn?.seatClaim)cancelPendingReturn();pendingSeatChoice=null;privacyGeneration++;
  retainZoneDrafts(live);if(live)suspendedDrafts={scope:scopeKey(live),identity:identityScope(live),chat:$("chat-input").value,chatVersion,card:cardValues()};
  closeBoard();chatWindow.close();live=null;lastDurableKey="";lastHouseKey="";world?.update(null);world?.setInputEnabled(false);clearPrivateDOM();
  setPlaceLabel("Waiting for the house connection");
  $("house-code-button").disabled=true;
  for(const button of document.querySelectorAll("[data-panel]"))button.disabled=!["pending","options","about"].includes(button.dataset.panel);
  $("connection-status").textContent=updateRecovery?"Update needed":"Reconnecting…";$("quick-chat").querySelector("button").disabled=true;
  applyInput();if(activePanel)closePanel();return;
 }
 if(live&&scopeKey(live)!==scopeKey(snapshot))retainZoneDrafts(live);
 const reconnect=!live, previousScope=lastScope, previousIdentity=lastIdentityScope, retainedCard=suspendedDrafts?.identity===identityScope(snapshot)?suspendedDrafts.card:cardValues();
 live=snapshot;lastScope=scopeKey(snapshot);lastIdentityScope=identityScope(snapshot);
 if(previousScope&&previousScope!==lastScope){
  roomDraft=null;chatVersion++;clearPrivateDOM();
  if(previousIdentity===lastIdentityScope){if(cardDirty)restoreCard(retainedCard);}
  else {privacyGeneration++;clearZoneDrafts();suspendedDrafts=null;cardDirty=false;cardBase=null;cardProjection=null;cardVersion++;unreadStreams.clear();}
 }
 if(roomDraft&&roomDraft.scope!==roomScope())roomDraft=null;
 if(previousScope!==lastScope&&previousIdentity===lastIdentityScope&&snapshot.durable.residents.some(resident=>resident.id===snapshot.durable.selfId)){
  const draft=zoneDrafts.get(lastScope);$("chat-input").value=draft?.chat||"";if(draft)draft.restoredVersion=chatVersion;if(ownRoom())roomDraft=roomDrafts.get(roomScope())||null;
 }
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
 gatheringUI.update(gatheringContext());if(activePanel==="studio"&&!snapshot.durable.room)closePanel();studioUI.update(studioContext());$("open-room-studio").hidden=!snapshot.durable.room;updateUnread(snapshot,reconnect||previousScope!==lastScope);renderRoster();updateWorld(snapshot);roomPreview.update(studioContext());
 const key=JSON.stringify([snapshot.durable.streamId,snapshot.durable.sequence,workCursor()?.streamId,workCursor()?.sequence,snapshot.controller]);
 if(key!==lastDurableKey){lastDurableKey=key;renderTranscript();if(activePanel==="board"){renderCards();if(!cardDirty)fillCard();}}
 const houseKey=JSON.stringify([snapshot.durable.house,snapshot.durable.residents,snapshot.durable.selfId,snapshot.durable.voice,snapshot.controller]);
 if(houseKey!==lastHouseKey){lastHouseKey=houseKey;adminRequest++;if(activePanel==="house")renderHouse();else if(activePanel==="voice")renderVoice();}
 if(activePanel==="room")renderRoom();
 continueRoomReturn();reopenSeatedChoice();continuePendingReturn();if(activePanel==="places")renderPlaces();
 renderGame();const gameKey=JSON.stringify([identityScope(live),live.durable.zoneId,live.controller,live.durable.game?.revision,live.durable.puzzle?.revision]);if(reconnect||gameKey!==gameRefreshKey){gameRefreshKey=gameKey;void refreshGamePending();}
 if(plannedVisit&&snapshot.durable.zoneId==="lounge"&&!pendingReturn?.transition){const residentId=plannedVisit;plannedVisit=null;queueMicrotask(()=>visitResident(residentId));}
 if(plannedPlace&&snapshot.durable.zoneId==="lounge"&&!pendingReturn?.transition){const place=plannedPlace;plannedPlace=null;if(returnJourney){returnJourney.started=false;queueMicrotask(continueRoomReturn);}else queueMicrotask(()=>walkToPlace(place));}

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
function chatReadable(){return entered&&(!activePanel||["game","studio","gathering"].includes(activePanel))&&!embeddedFrame&&!$("chat-window").inert&&chatWindow.isReadable();}
function markChatRead(){const state=unreadStreams.get(unreadKey());if(state)state.unread=0;$("chat-count").textContent="";$("chat-count").setAttribute("aria-label","0 unread messages here");}

function renderRoster(){
 $("roster").replaceChildren();
 for(const resident of live.durable.residents){
  const player=live.players.find(p=>p.id===resident.id), connected=Boolean(player?.connected);
  const eligible=connected&&player.zoneId==="lounge"&&player.availability==="chat";
  const where=connected?(player.zoneId==="lounge"?"lounge":"in a room"):"offline";
  const status=connected?(player.availability==="chat"?"Can chat":"Quiet"):"";
  const chip=node("button",resident.name+(resident.id===live.durable.selfId?" · you":"")+" · "+where+(status?" · "+status:""),"resident");
  if(player?.availabilitySetAt){const time=node("time"," · set "+new Date(player.availabilitySetAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}));time.dateTime=new Date(player.availabilitySetAt).toISOString();chip.append(time);}
  chip.type="button";chip.dataset.visitResident=resident.id;chip.setAttribute("aria-label","Visit "+resident.name+" · "+(resident.id===live.durable.selfId?"your room":resident.open?"door open":"door closed"));chip.addEventListener("click",()=>visitResident(resident.id));chip.dataset.playerId=resident.id;chip.dataset.willing=String(eligible);chip.dataset.availability=player?.availability||"quiet";
  if(player?.x!==undefined){chip.dataset.x=String(player.x);chip.dataset.z=String(player.z);chip.dataset.animation=player.animation||"idle";}
  $("roster").append(chip);
 }
}
function renderPlaces(){
 $("resident-visits").replaceChildren();for(const resident of live?.durable.residents||[]){const button=node("button","Visit "+resident.name+(resident.id===live.durable.selfId?" · your room":resident.open?" · door open":" · door closed"));button.dataset.visitResident=resident.id;button.addEventListener("click",()=>visitResident(resident.id));$("resident-visits").append(button);}
 const seats=live?.players.filter(player=>/^game-seat-[1-6]$/.test(player.seatId)&&(player.connected||player.seatReservedUntil>Date.now()))||[];$("game-place-occupancy").textContent=live?Array.from({length:live.durable.house.capacity},(_,index)=>{const occupant=seats.find(player=>player.seatId==="game-seat-"+(index+1));return "Game place "+(index+1)+" · "+(occupant?(occupant.connected?occupant.name:"Reconnecting: "+occupant.name):"Free");}).join("; "):"";
}
function visitResident(id){
 const resident=live?.durable.residents.find(person=>person.id===id);if(!resident)return;
 if(id!==live.durable.selfId&&!resident.open){notice(resident.name+"’s door is closed. Ask them to open it when they want a visit.");return;}
 if(!live.controller){notice("Take control before walking to a room.");return;}
 if(live.durable.zoneId===resident.bedroomId){notice("You are already in "+resident.name+"’s room.");return;}
 closePanel();if(live.durable.zoneId!=="lounge"){plannedVisit=id;if(!world?.approach({type:"exit"})){plannedVisit=null;notice("Stand up before walking to a room.");}return;}
 if(!world?.approach({type:"door",slot:resident.slot,roomId:resident.bedroomId}))notice("Stand up before walking to "+resident.name+"’s room.");
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
 $("work-visibility").textContent="Your current card is house-visible to current housemates in the lounge. Saved cards remain available here independently of room desks.";
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
 const saved=currentCard();$("room-saved-goal").textContent=saved?.smallGoal||"No saved goal yet.";$("room-saved-next").textContent=saved?.nextStep||"No saved next step yet.";$("open-room-work").disabled=!live;
 $("room-studio-entry").textContent=live?.durable.room?"Inspect this room’s studio":"Walk to my room studio";const room=ownRoom();$("walk-room").hidden=Boolean(room);$("return-lounge").hidden=!live?.durable.room;$("walk-room").disabled=!live?.controller;$("return-lounge").disabled=!live;
 $("room-form").hidden=!room;$("furniture-editor").hidden=!room;$("light-form").hidden=!room;$("starter-editor").hidden=!room;
 $("room-instructions").textContent=room?"Your changes affect this bedroom. Keep the arrival path clear; choose up to ten pieces.":"Walk through your named door to arrange your bedroom. Friends can visit when you open it.";
 world?.setEditing(Boolean(room));if(!room)return;
 const draft=ensureRoomDraft();$("room-open").checked=draft.metadata.open;$("palette").value=draft.metadata.palette;$("room-light").value=draft.light;$("light-status").textContent=draft.lightMessage||(draft.lightDirty?"Unsaved lighting":"Saved lighting: "+draft.light);for(const control of $("room-panel").querySelectorAll("input,select,button"))control.disabled=!roomWritable();$("return-lounge").disabled=false;$("open-room-work").disabled=false;renderStarter();
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
  if(intent.type.startsWith("game.")||intent.type.startsWith("puzzle."))gamePendingRows=gamePendingRows.filter(row=>row.commandId!==commandId);
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
 privacyGeneration++;bootstrapRequest++;adminRequest++;pendingRequest++;gamePendingRequest++;gamePendingRows=[];plannedPlace=null;returnJourney=null;
 client?.close();client=null;inspector?.close();inspector=null;live=null;
 clearZoneDrafts();roomDraft=null;suspendedDrafts=null;voiceDraft=null;updateRecovery=null;voicePendingRows=[];voicePendingScope="";voicePendingError="";$("update-required").hidden=true;cardProjection=null;cardDirty=false;cardBase=null;cardVersion++;chatVersion++;
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
  ownedClient=createHouseClient({expectedIdentityId:actorId,onUpdateRequired:error=>{if(client===ownedClient)showUpdateRequired(error);},onPuzzleIntent:()=>{if(client===ownedClient)renderGame();},onSnapshot:snapshot=>{if(client===ownedClient)onSnapshot(snapshot);},onDisconnect:()=>{if(client!==ownedClient)return;cancelPendingReturn();onSnapshot(null);void checkMembership();},onError:error=>{if(client!==ownedClient||(live?.durable.selfId||me?.identity.id)!==actorId)return;if(showConnectionLimit(error))return;notice(error.message||String(error));if(["FORBIDDEN","NO_HOUSE","UNAUTHENTICATED"].includes(error.code))void checkMembership();}});
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
 const retained=zoneDrafts.get(submittedScope);if(retained?.chatVersion===submittedVersion&&retained.chat===submittedText){if(scopeKey(live)===submittedScope&&chatVersion===retained.restoredVersion&&$("chat-input").value===submittedText)$("chat-input").value="";retained.chat="";}
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
function downloadJSON(data,filename){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));const link=node("a");link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function exportOwnHouse(){
 const context=privateContext(),data=await api("/api/house/export",{});if(context!==privateContext())return;downloadJSON(data,"my-study-house.json");
 let page=data.studio,index=1;const seen=new Set();while(page?.nextCursor){const cursor=page.nextCursor;if(typeof cursor!=="string"||seen.has(cursor))throw new Error("Studio export stopped at an invalid continuation. Your previous files are downloaded; try again.");seen.add(cursor);page=await api("/api/house/studio/export",{cursor});if(context!==privateContext())return;downloadJSON(page,"my-room-studios-"+(++index)+".json");}
 if(index>1)notice("Saved data downloaded in "+index+" files. Keep all files together for your room references.");
}
$("export-own").addEventListener("click",protectedAction(exportOwnHouse));
function sendGame(type,payload,revision){
 if(type==="game.join"&&(live?.puzzleRoster?.selfParticipationId||client?.pendingPuzzleIntent?.()?.mode==="join"))throw Object.assign(new Error("Leave picture-table participation before joining Four-in-a-row. Watching is always available."),{code:"ACTIVITY_ACTIVE"});
 const task=save(type,payload,revision);if(type==="game.join"&&live){const key=JSON.stringify([live.durable.house.id,live.durable.selfId,type,payload,revision]),intent=pending.get(key);if(intent)task.gameJoinIntent={scope:identityScope(live),command:structuredClone(intent)};}return task;
}
async function retryOriginalGameJoin(intent){
 if(!live?.controller||live.durable.zoneId!=="lounge"||intent.type!=="game.join"||intent.houseId!==live.durable.house.id)throw Object.assign(new Error("Return to lounge control to inspect the original Join."),{code:"NOT_CONTROLLER"});
 const receipt=await client.command(intent);forgetPending(intent.commandId,receipt);void refreshGamePending();return receipt;
}
function gamePendingIntents(){
 if(!live)return [];const rows=new Map(gamePendingRows.filter(row=>row.houseId===live.durable.house.id&&row.type.startsWith("game.")).map(row=>[row.commandId,row]));
 for(const intent of pending.values())if(intent.houseId===live.durable.house.id&&intent.type.startsWith("game."))rows.set(intent.commandId,intent);return [...rows.values()];
}
function puzzlePendingIntents(){
 if(!live)return [];const rows=new Map(gamePendingRows.filter(row=>row.houseId===live.durable.house.id&&row.type.startsWith("puzzle.")).map(row=>[row.commandId,row]));for(const value of pending.values())if(value.houseId===live.durable.house.id&&value.type.startsWith("puzzle."))rows.set(value.commandId,value);return [...rows.values()];
}
function chooseBreak(activity){breakActivity=activity;renderGame();}
function renderGame(){
 const rows=gamePendingIntents(),puzzleRows=puzzlePendingIntents(),round=live?.durable.game?.current,participant=Boolean(round?.players.includes(live.durable.selfId)),puzzleParticipant=Boolean(live?.puzzleRoster?.selfParticipationId),direct=client?.pendingPuzzleIntent?.();gameUI.update(live,{pendingCount:rows.length});puzzleUI.update(live,{pendingCount:puzzleRows.length});
 $("game-panel-stand").hidden=!atGameSeat();$("four-game-panel").hidden=breakActivity!=="four";$("picture-game-panel").hidden=breakActivity!=="picture";$("panel").dataset.breakActivity=breakActivity;document.body.dataset.breakActivity=activePanel==="game"?breakActivity:"";
 $("break-picture").setAttribute("aria-pressed",String(breakActivity==="picture"));$("break-four").setAttribute("aria-pressed",String(breakActivity==="four"));$("break-picture-count").textContent=(live?.puzzleRoster?.memberIds.length||0)+" / "+(Number.isInteger(live?.durable.house.capacity)&&live.durable.house.capacity>=2&&live.durable.house.capacity<=6?live.durable.house.capacity:6)+" active";$("break-four-count").textContent=(round?.players.filter(Boolean).length||0)+" / 2 active";
 $("break-exclusive").textContent=puzzleParticipant?"You joined the picture table. Leave participation before joining Four-in-a-row; you can watch either.":participant?"You hold a Four-in-a-row slot. Leave that table before joining the picture table; you can watch either.":"Watching never joins. Choose Start if needed, then Join separately. Leave your activity before joining the other.";
 const seated=Boolean(live?.players.find(player=>player.id===live.durable.selfId&&player.connected)?.seatId);$("game-table-stand").hidden=!seated;$("game-table-go").hidden=atGameSeat();
 $("game-table-status").hidden=!live||(!seated&&!participant&&!puzzleParticipant&&!rows.length&&!puzzleRows.length&&!direct);$("game-table-label").textContent=direct?.mode==="leave"?"Picture withdrawal pending":puzzleParticipant?"At picture table · "+(live.durable.puzzle?.current?.placements.length||0)+" / 24":participant?"At break table · "+round.status:rows.some(row=>row.type==="game.leave")?"Withdrawal pending":(seated?"Seated · Look around keeps your chair":"Break action pending");$("game-table-leave").hidden=!participant&&!puzzleParticipant&&!direct;$("game-table-reopen").hidden=!seated||live?.durable.zoneId!=="lounge";$("game-table-reopen").disabled=!live?.controller;queueSafeArea();
}
async function refreshGamePending(){
 if(!live||!client)return;const request=++gamePendingRequest,context=identityScope(live);
 try{const result=await client.getPending();if(request!==gamePendingRequest||context!==identityScope(live))return;for(const intent of [...pending.values()])if((intent.type.startsWith("game.")||intent.type.startsWith("puzzle."))&&!saveFlights.has(intent.commandId)&&!result.entries.some(row=>row.commandId===intent.commandId))forgetPending(intent.commandId);gamePendingRows=result.entries.filter(row=>row.type.startsWith("game.")||row.type.startsWith("puzzle."));renderGame();}catch{/* Storage/transport problems remain visible through the action or Pending drafts. */}
}
function fallbackToWork(message){returnJourney=null;plannedPlace=null;const showWork=Boolean(live&&!activePanel&&!embeddedFrame);if(showWork)openPanel("board");notice(message+(showWork?" Your work is available here.":" My work is available from the toolbelt."));}
function returnToMyRoom(source){
 if(!live)return;
 // A viewer can return from either tab; withdraw their actual activity before routing.
 if(source!=="four"&&(live.durable.game?.current?.players.includes(live.durable.selfId)||gamePendingIntents().some(row=>row.type==="game.join")))gameUI.leave();
 if(source!=="picture"&&(live.puzzleRoster?.selfParticipationId||client?.pendingPuzzleIntent?.()?.mode==="join"))puzzleUI.leave();
 closePanel();const journey={scope:identityScope(live),waitingStand:Boolean(live.players.find(player=>player.id===live.durable.selfId)?.seatId),started:false};returnJourney=journey;
 if(ownRoom()){returnJourney=null;openPanel("studio");return;}
 if(!live.controller){fallbackToWork("Take control to walk to your room.");return;}
 if(journey.waitingStand){notice("Standing before walking to your room. My work stays available from the toolbelt.");void client.stand().catch(error=>{if(returnJourney===journey)fallbackToWork(error.message||"Standing was not confirmed.");});return;}
 continueRoomReturn();
}
function continueRoomReturn(){
 const journey=returnJourney;if(!journey||!live)return;if(journey.scope!==identityScope(live)||!live.controller){returnJourney=null;plannedPlace=null;return;}
 if(ownRoom()){returnJourney=null;plannedPlace=null;queueMicrotask(()=>{if(live&&identityScope(live)===journey.scope&&ownRoom()&&!activePanel&&!embeddedFrame){openPanel("studio");}});return;}
 if(journey.waitingStand){if(live.players.find(player=>player.id===live.durable.selfId)?.seatId)return;journey.waitingStand=false;}
 if(journey.started)return;journey.started=true;
 if(live.durable.zoneId!=="lounge"){plannedPlace="room";if(!world?.approach?.({type:"exit"}))fallbackToWork("The route home is unavailable.");return;}
 if(!world?.routeTo?.("room"))fallbackToWork("The route home is unavailable.");
}
function walkToPlace(place){
 if(!live?.controller){notice("Take control in this tab before walking.");return;}
 closePanel();
 if(live.durable.zoneId!=="lounge"&&(place!=="room"||!ownRoom())){plannedPlace=place;if(!world?.approach({type:"exit"})){plannedPlace=null;notice("Stand up before returning to the lounge.");}return;}
 if(!world?.routeTo?.(place))notice(place==="room"&&ownRoom()?"You are already in your room.":"That place is unavailable right now. Stand up and try again.");
}
for(const id of ["game-table-stand","game-panel-stand"])$(id).addEventListener("click",protectedAction(async()=>{pendingSeatChoice=null;closePanel();await client.stand();}));
$("game-table-go").addEventListener("click",()=>walkToPlace("game"));
$("game-table-reopen").addEventListener("click",()=>{const kind=seatKind(live?.players.find(player=>player.id===live.durable.selfId)?.seatId);if(kind==="game")openPanel("game");else if(kind){gatheringKind=kind;openPanel("gathering");}});
$("game-table-leave").addEventListener("click",()=>{if(live?.puzzleRoster?.selfParticipationId||client?.pendingPuzzleIntent?.())puzzleUI.leave();else gameUI.leave();});
$("break-picture").addEventListener("click",()=>chooseBreak("picture"));$("break-four").addEventListener("click",()=>chooseBreak("four"));
$("open-room-studio").addEventListener("click",()=>openPanel("studio"));
$("room-studio-entry").addEventListener("click",()=>{if(live?.durable.room)openPanel("studio");else returnToMyRoom("room");});
$("open-room-work").addEventListener("click",()=>{returnJourney=null;plannedPlace=null;openPanel("board");});
for(const button of document.querySelectorAll("[data-place]"))button.addEventListener("click",()=>walkToPlace(button.dataset.place));
function pendingDestination(entry){
 const houseId=entry.houseId||entry.command?.houseId,activity=/^(game|puzzle)\./.test(entry.type)&&entry.zoneId==="lounge",sameHouse=Boolean(live&&houseId===live.durable.house.id),resident=sameHouse?live.durable.residents.find(person=>person.bedroomId===entry.zoneId):null;
 let label=entry.zoneId==="lounge"?(activity?"Activity table in the lounge":"Shared lounge"):resident?(resident.id===live.durable.selfId?"Your room":resident.name+"’s room"):"Your earlier room",reason="";
 if(!houseId){label="House admission";reason="Continue the original house admission here, or inspect and export this draft.";}
 else if(!sameHouse)reason="This draft belongs to an earlier house. Inspect or export it here; this house cannot reopen that room.";
 else if(entry.zoneId!=="lounge"&&!resident)reason="This earlier room is not a current house bedroom. Its original draft remains available for export.";
 else if(resident&&resident.id!==live.durable.selfId&&!resident.open)reason=resident.name+"’s room is closed. Ask them to open it when they want a visit. Your original draft can still be inspected or exported.";
 return {houseId,sameHouse,resident,activity,label,reason};
}
function pendingRouteAuthority(){return live?JSON.stringify([identityScope(live),live.serverEpoch,live.generation,live.accessGeneration,live.durable.zoneId,live.controller]):"";}
async function returnToPendingDestination(entry){
 const target=pendingDestination(entry);if(target.reason){notice(target.reason,true);return;}if(!live?.controller){notice("Take control in this tab, then choose Return. Your original draft is kept.",true);return;}
 if(live.players.find(player=>player.id===live.durable.selfId)?.seatId&&!(entry.zoneId===live.durable.zoneId&&(!target.activity||atGameSeat()))){notice("Stand up first, then return to this original draft. Pending drafts keeps the same action.",true);return;}
 const context=privateContext(),authority=pendingRouteAuthority(),request=pendingRequest;await pendingSource().holdPending(entry.commandId);if(context!==privateContext()||!live?.controller||authority!==pendingRouteAuthority()||activePanel!=="pending"||request!==pendingRequest)return;
 const currentTarget=pendingDestination(entry);if(currentTarget.reason){notice(currentTarget.reason,true);return;}
 returnJourney=null;plannedPlace=null;plannedVisit=null;pendingReturn={scope:identityScope(live),serverEpoch:live.serverEpoch,generation:live.generation,accessGeneration:live.accessGeneration,seatClaim:null,transition:null,zoneId:entry.zoneId,activity:target.activity,commandId:entry.commandId};
 if(entry.zoneId===live.durable.zoneId&&(!target.activity||atGameSeat())){continuePendingReturn();return;}
 if(target.activity){walkToPlace("game");return;}
 if(entry.zoneId==="lounge"){closePanel();if(!world?.approach({type:"exit"})){pendingReturn=null;notice("The lounge route is unavailable. Your original draft is kept.",true);}return;}
 visitResident(target.resident.id);
}
function cancelPendingReturn(journey=pendingReturn){if(journey&&pendingReturn===journey){pendingReturn=null;plannedPlace=null;plannedVisit=null;}}
function pendingArrivalKey(snapshot){return snapshot?JSON.stringify([identityScope(snapshot),snapshot.serverEpoch,snapshot.generation,snapshot.accessGeneration,snapshot.durable.zoneId,snapshot.controller]):"";}
async function subscribeForPendingReturn(zoneId){
 const journey=pendingReturn;
 const intended=journey&&!journey.seatClaim&&live&&journey.scope===identityScope(live)&&journey.serverEpoch===live.serverEpoch&&journey.generation===live.generation&&(zoneId===journey.zoneId||zoneId==="lounge"&&live.durable.zoneId!=="lounge");
 const transition=intended?{zoneId,departureGeneration:live.generation,departureAccess:live.accessGeneration,candidate:null}:null;
 if(journey){if(transition)journey.transition=transition;else cancelPendingReturn(journey);}
 try{
  const reply=await client.subscribe(zoneId);
  if(transition&&pendingReturn===journey&&journey.transition===transition){
   const arrival=reply?.snapshot;
   if(!arrival?.controller||arrival.durable.zoneId!==zoneId||identityScope(arrival)!==journey.scope||arrival.serverEpoch!==journey.serverEpoch||arrival.generation<=transition.departureGeneration||arrival.accessGeneration<=transition.departureAccess||pendingArrivalKey(arrival)!==pendingArrivalKey(live)||transition.candidate&&transition.candidate!==pendingArrivalKey(arrival)){cancelPendingReturn(journey);return reply;}
   journey.generation=arrival.generation;journey.accessGeneration=arrival.accessGeneration;journey.transition=null;
   if(plannedVisit&&live.durable.zoneId==="lounge"){const residentId=plannedVisit;plannedVisit=null;queueMicrotask(()=>{if(pendingReturn===journey&&pendingArrivalKey(live)===pendingArrivalKey(arrival))visitResident(residentId);});}
   else if(plannedPlace&&live.durable.zoneId==="lounge"){const place=plannedPlace;plannedPlace=null;queueMicrotask(()=>{if(pendingReturn===journey&&pendingArrivalKey(live)===pendingArrivalKey(arrival))walkToPlace(place);});}
   continuePendingReturn();
  }
  return reply;
 }catch(error){if(pendingReturn===journey)cancelPendingReturn(journey);throw error;}
}
function continuePendingReturn(){
 const journey=pendingReturn;if(!journey||!live)return;
 if(journey.scope!==identityScope(live)||!live.controller||journey.serverEpoch!==live.serverEpoch){cancelPendingReturn(journey);return;}
 if(journey.transition){
  const transition=journey.transition,key=pendingArrivalKey(live);
  if(live.durable.zoneId!==transition.zoneId||live.generation<=transition.departureGeneration||live.accessGeneration<=transition.departureAccess||transition.candidate&&transition.candidate!==key){cancelPendingReturn(journey);return;}
  transition.candidate=key;return;
 }
 if(journey.generation!==live.generation||journey.accessGeneration!==live.accessGeneration){cancelPendingReturn(journey);return;}
 if(journey.activity&&(!journey.seatClaim?.ack||!seatChoiceCurrent(journey.seatClaim)||!atGameSeat()||live.players.find(player=>player.id===live.durable.selfId)?.seatId!==journey.seatClaim.seatId))return;
 if(live.durable.zoneId!==journey.zoneId||activePanel||embeddedFrame)return;
 cancelPendingReturn(journey);queueMicrotask(()=>{if(live&&identityScope(live)===journey.scope&&live.serverEpoch===journey.serverEpoch&&live.generation===journey.generation&&live.accessGeneration===journey.accessGeneration&&live.durable.zoneId===journey.zoneId&&(!journey.activity||journey.seatClaim?.ack&&seatChoiceCurrent(journey.seatClaim)&&atGameSeat())&&!activePanel&&!embeddedFrame)openPanel("pending");});
}
function pendingSource(){return client||(inspector ||= createPendingInspector({expectedIdentityId:me?.identity.id,fetchMe:()=>api("/api/house/me")}));}
async function renderPending(){
 const request=++pendingRequest, identity=live?.durable.selfId||me?.identity.id;
 const result=await pendingSource().getPending();
 if(request!==pendingRequest||activePanel!=="pending"||(live?.durable.selfId||me?.identity.id)!==identity)return;
 reconcilePendingMemory(result);$("pending-entries").replaceChildren();
 for(const entry of result.entries){
  const row=node("article",undefined,"pending-entry");row.dataset.commandId=entry.commandId;
  const destination=pendingDestination(entry);row.append(node("strong",(entry.label||entry.type)+" · "+(entry.state==="expired"?"Expired automatic retry":"Pending reply")),node("p","Saved status unknown · original "+destination.label+" · "+new Date(entry.createdAt).toLocaleString(),"subtle"));
  const details=node("details"),summary=node("summary","My original draft"),body=node("pre",JSON.stringify(entry.command.payload,null,2));details.append(summary,body);row.append(details);
  const actions=node("div",undefined,"button-row"),retry=node("button",entry.state==="expired"?"Retry expired draft":"Retry original action");retry.dataset.action="retry";retry.disabled=!entry.canRetry;
  retry.addEventListener("click",protectedAction(async()=>{const context=privateContext(),receipt=await pendingSource().retryPending(entry.commandId);if(context!==privateContext())return;forgetPending(entry.commandId,receipt);notice("Original action acknowledged. Check its saved result.");await bootstrap();if(activePanel==="pending")void protectedAction(renderPending)();}));
  if(destination.houseId&&(!entry.canRetry||destination.activity&&!atGameSeat())){const go=node("button",destination.activity?"Go to activity table":entry.zoneId==="lounge"?"Return to lounge":"Return to original room");go.dataset.action="return-original";go.disabled=!destination.sameHouse||!live?.controller||entry.zoneId!=="lounge"&&!destination.resident;go.addEventListener("click",protectedAction(()=>returnToPendingDestination(entry)));actions.append(go);}
  if(destination.sameHouse&&!live.controller){const control=node("button","Take control in this tab");control.dataset.action="take-control";control.addEventListener("click",protectedAction(async()=>{const context=privateContext();await pendingSource().holdPending(entry.commandId);if(context!==privateContext())return;await client.takeover();if(context===privateContext()&&activePanel==="pending")await renderPending();}));actions.append(control);}
  const discard=node("button","Discard local draft");discard.addEventListener("click",protectedAction(async()=>{if(!confirm("Discard this local pending draft? Its server save status is unknown."))return;const context=privateContext();await pendingSource().discardPending(entry.commandId);if(context!==privateContext())return;forgetPending(entry.commandId);void protectedAction(renderPending)();}));actions.append(retry,discard);row.append(actions);
  if(entry.recoveryHeld)row.append(node("p","Automatic retry is paused for this original draft. Choose Retry when you are ready.","subtle"));
  if(destination.reason)row.append(node("p",destination.reason,"subtle"));else if(!entry.canRetry)row.append(node("p","Take control and return to the named destination, then retry the same original action. Inspect and export remain available here.","subtle"));else if(destination.activity&&!atGameSeat())row.append(node("p","An unaccepted activity action needs a game chair. An already accepted receipt can still be reconciled here.","subtle"));
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
window.addEventListener("pagehide",()=>{privacyGeneration++;live=null;returnJourney=null;plannedPlace=null;clearTimeout(noticeTimer);hudResizeObserver?.disconnect();if(safeAreaFrame!==null){if(window.cancelAnimationFrame)window.cancelAnimationFrame(safeAreaFrame);else clearTimeout(safeAreaFrame);}closeBoard();chatWindow.dispose();gameUI.dispose();puzzleUI.dispose();roomPreview.dispose();studioUI.dispose();gatheringUI.dispose();panelFocus.dispose();boardFocus.dispose();client?.close();world?.dispose();});
bootstrap().catch(error=>{if(showConnectionLimit(error))return;notice(error.message,true);$("connection-status").textContent="Could not open the house";$("title-status").textContent="Could not check your saved home. Reload to retry.";});

$("walk-room").addEventListener("click",()=>{const resident=live?.durable.residents.find(r=>r.id===live.durable.selfId);closePanel();if(resident&&!world?.approach({type:"door",slot:resident.slot}))notice("Stand up before walking to your room.");});
$("return-lounge").addEventListener("click",()=>{closePanel();if(!world?.approach({type:"exit"}))notice("Stand up before returning to the lounge.");});
$("walk-seat").addEventListener("click",()=>{closePanel();if(live?.durable.zoneId!=="lounge"){notice("Return to the lounge for the shared study table.");return;}if(!world?.approach({type:"seat"}))notice("Stand up before choosing another seat.");});

$("lobby-export").addEventListener("click",protectedAction(exportOwnHouse));
$("lobby-recovery-key").addEventListener("click",protectedAction(()=>issueRecoveryKey("lobby-recovery-output")));
