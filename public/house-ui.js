import { createHouseClient, createPendingInspector } from "./house-client.js";
import { createHouseWorld } from "./house-world.js";
import { validatePlacements } from "./house-geometry.js";
const $ = id => document.getElementById(id);
const HUD_SAFE_SELECTOR=".top,#roster,.availability,.toolbelt,.quick-chat,.movement,.context-hint,.chat-privacy,#panel,#notice,#takeover,#camera-controls";
let live = null, me = null, world = null, client = null, activePanel = null;
let cardDirty = false, cardBase = null, cardProjection=null, roomDraft = null, suspendedDrafts = null;
let lastScope="", lastIdentityScope="", lastHouseKey="", inspector=null, pendingRequest=0, privacyGeneration=0,bootstrapRequest=0,keyIssuance=null;
const unreadStreams=new Map();
let adminRequest=0,safeAreaFrame=null;
let lastDurableKey = "", noticeTimer, chatVersion=0, cardVersion=0, checkingMembership=false;
const pending = new Map();
const RETAIN_INTENT_CODES=new Set(["TIMEOUT","PENDING","STORAGE_UNAVAILABLE","NOT_CONTROLLER","STALE_ZONE","CLOSED","IDENTITY_CHANGED","INSPECTION_REQUIRED"]);
function node(tag, text, className) { const e=document.createElement(tag); if(text!==undefined)e.textContent=text; if(className)e.className=className; return e; }
function notice(message,persistent=false){
 clearTimeout(noticeTimer);const target=activePanel?$("panel-feedback"):!$("lobby").hidden?$("lobby-feedback"):$("notice");for(const id of ["notice","panel-feedback","lobby-feedback"])$(id).hidden=true;target.textContent=message;target.hidden=false;queueSafeArea();
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
 const key=JSON.stringify([live?.durable.house.id,live?.durable.selfId,type,payload,expectedRevision]);
 const intent=pending.get(key)||command(type,payload,expectedRevision); pending.set(key,intent);
 try {
  const result=await client.command(intent); pending.delete(key);
  if(!type.startsWith("house.")){for(let n=0;n<30;n++){if(live?.durable.streamId===result.streamId&&live.durable.sequence>=result.sequence)break;await new Promise(resolve=>setTimeout(resolve,50));}}
  return result;
 } catch(error) {
  if(error.code&&!RETAIN_INTENT_CODES.has(error.code))pending.delete(key);
  throw error;
 } finally {if(activePanel==="pending")void protectedAction(renderPending)();}
}
function showConnectionLimit(error){
 if(!["LOAD_LIMIT","TAB_LIMIT"].includes(error.code))return false;
 $("connection-status").textContent=error.code==="TAB_LIMIT"?"Too many house windows":"House connection limit";
 $("connection-limit-pending").hidden=false;
 notice((error.message||"Another connection cannot open right now.")+" Close an unused house window, then reload this page. Your saved house and pending drafts remain.",true);
 return true;
}
function protectedAction(fn) {return async event=>{event?.preventDefault?.();const context=privateContext();try{await fn(event);}catch(error){if(context!==privateContext())return;if(error.code==="IDENTITY_CHANGED"){invalidateIdentityView();try{await bootstrap();}catch(refreshError){notice(refreshError.message,true);return;}}if(!showConnectionLimit(error))notice(error.message||"That action could not be completed.",true);}};}
function currentCard(){return live?.durable.cards.find(card=>card.authorId===live.durable.selfId&&card.state==="active")||null;}
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
   if(element.hidden||element.closest("[hidden]"))continue;
   const rect=element.getBoundingClientRect();if(rect.width&&rect.height)safeRects.push({x:rect.left-origin.left,y:rect.top-origin.top,w:rect.width,h:rect.height});
  }
  world.setLabelSafeArea({viewport,safeRects});
 });
}
function renderCameraMode(mode=world?.getCameraMode?.()||"play"){
 $("camera-overview").setAttribute("aria-pressed",String(mode==="overview"));
 const ready=Boolean(live&&world?.setCameraMode);$("camera-overview").disabled=!ready;$("camera-recenter").disabled=!ready;
 $("camera-controls").hidden=Boolean(activePanel)||!live;
}
function applyInput(){world?.setInputEnabled(Boolean(live?.controller&&!activePanel&&$("lobby").hidden));renderCameraMode();}
function closePanel(){adminRequest++;pendingRequest++;activePanel=null;$("panel").hidden=true;$("panel-feedback").hidden=true;world?.setEditing(false);world?.setRoomPreview?.(null);applyInput();queueSafeArea();}
function openPanel(name){
 if(!["recovery","pending"].includes(name)&&!live){notice("Waiting for the house connection.");return;}
 const visibleNotice=!$("notice").hidden?$("notice").textContent:!$("lobby-feedback").hidden?$("lobby-feedback").textContent:"";activePanel=name;$("panel").hidden=false;$("panel-feedback").hidden=true;if(visibleNotice)notice(visibleNotice);
 for(const key of ["chat","board","room","house","recovery","pending"])$(key+"-panel").hidden=key!==name;
 $("panel-title").textContent={chat:"A conversation here",board:"Our study board",room:"Make it yours",house:"Our little house",recovery:"Welcome back",pending:"Pending drafts"}[name];
 applyInput();
 if(name==="chat"){renderTranscript();markChatRead();}
 if(name==="pending")void protectedAction(renderPending)();
 if(name==="board"){renderCards();if(!cardDirty)fillCard();}
 if(name==="room")renderRoom();
 if(name==="house")renderHouse();
 $("panel-close").focus();queueSafeArea();
}
function updateWorld(snapshot){
 if(!world)world=createHouseWorld($("world"),{onMove:position=>client?.move(position),onInteract:protectedAction(interact),onSelectPlacement:id=>{$("placement").value=id;},onCameraModeChange:renderCameraMode,onHint:text=>$("context-hint").textContent=text});
 world.update(snapshot);applyInput();queueSafeArea();
}
async function interact(target){
 if(!live||!target)return;
 if(target.type==="door"){
  const resident=live.durable.residents.find(p=>p.slot===target.slot||p.bedroomId===target.roomId);
  if(!resident){notice("This bedroom is waiting for a new housemate.");return;}
  await client.subscribe(resident.bedroomId);closePanel();
 }else if(target.type==="exit"){
  await client.subscribe("lounge");closePanel();
 }else if(target.type==="seat"){
  const self=live.players.find(p=>p.id===live.durable.selfId);
  if(self?.seatId)await client.stand();else await client.claimSeat(target.seatId);
 }else if(target.type==="board"){
  if(live.durable.zoneId!=="lounge"){notice("The shared board is in the lounge.");return;}
  openPanel("board");
 }
}
function privateContext(){return privacyGeneration+":"+(live?.durable.selfId||me?.identity.id||"");}
function identityScope(snapshot){return snapshot?snapshot.durable.house.id+":"+snapshot.durable.selfId:"";}
function scopeKey(snapshot){return snapshot?snapshot.durable.house.id+":"+snapshot.durable.selfId+":"+snapshot.durable.zoneId:"";}
function roomScope(){const room=ownRoom();return room?scopeKey(live)+":"+room.id+":"+room.ownerId:"";}
function cardValues(){return Object.fromEntries(["small-goal","question","resource","next-step"].map(id=>[id,$(id).value]).concat([["help-requested",$("help-requested").checked]]));}
function restoreCard(values){for(const [id,value] of Object.entries(values))if(id==="help-requested")$(id).checked=value;else $(id).value=value;}
function clearPrivateDOM(){
 for(const id of ["roster","transcript","cards","membership-actions","removed-members","placement","pending-entries"])$(id).replaceChildren();
 for(const id of ["chat-input","small-goal","question","resource","next-step","palette","recovery-proof"])$(id).value="";
 for(const id of ["join-code-display","capacity-status","room-status","layout-status","availability-freshness","recovery-output","lobby-recovery-output","pending-foreign","card-status","panel-feedback","lobby-feedback"])$(id).textContent="";
 $("pending-discard-foreign").hidden=true;$("room-open").checked=false;$("help-requested").checked=false;$("layout-review").hidden=true;$("chat-count").textContent="";
 world?.setRoomPreview?.(null);
}
function onSnapshot(snapshot){
 if(!snapshot){
  privacyGeneration++;
  if(live)suspendedDrafts={scope:scopeKey(live),identity:identityScope(live),chat:$("chat-input").value,chatVersion,card:cardValues()};
  live=null;lastDurableKey="";lastHouseKey="";world?.update(null);world?.setInputEnabled(false);clearPrivateDOM();
  $("place-label").textContent="Waiting for the house connection";
  $("house-code-button").disabled=true;
  for(const button of document.querySelectorAll("[data-panel]"))button.disabled=button.dataset.panel!=="pending";
  $("connection-status").textContent="Reconnecting…";$("quick-chat").querySelector("button").disabled=true;
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
 $("connection-limit-pending").hidden=true;$("lobby").hidden=true;$("game-controls").hidden=false;$("roster").hidden=false;$("house-code-button").hidden=false;
 $("connection-status").textContent=snapshot.controller?"Together, live":"Viewing · another tab controls";
 $("house-code-button").disabled=false;
 for(const button of document.querySelectorAll("[data-panel]"))button.disabled=false;
 $("takeover").hidden=snapshot.controller;$("quick-chat").querySelector("button").disabled=!snapshot.controller;
 const owner=snapshot.durable.residents.find(r=>r.id===snapshot.durable.room?.ownerId);
 $("place-label").textContent=snapshot.durable.zoneId==="lounge"?"Shared study lounge":(owner?.name||"A friend")+"'s room";
 const self=snapshot.players.find(p=>p.id===snapshot.durable.selfId);
 for(const radio of document.querySelectorAll("input[name=availability]")){radio.checked=self?.availability===radio.value;radio.disabled=!snapshot.controller;}
 $("availability-freshness").replaceChildren();
 if(self?.availabilitySetAt){const time=node("time",new Date(self.availabilitySetAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}));time.dateTime=new Date(self.availabilitySetAt).toISOString();time.title=new Date(self.availabilitySetAt).toLocaleString();$("availability-freshness").append("Last set ",time);}
 else $("availability-freshness").textContent="Quiet by default · choose when ready";
 updateUnread(snapshot,reconnect||previousScope!==lastScope);renderRoster();updateWorld(snapshot);
 const key=snapshot.durable.streamId+":"+snapshot.durable.sequence;
 if(key!==lastDurableKey){lastDurableKey=key;renderTranscript();if(activePanel==="board"){renderCards();if(!cardDirty)fillCard();}}
 const houseKey=JSON.stringify([snapshot.durable.house,snapshot.durable.residents,snapshot.durable.selfId]);
 if(houseKey!==lastHouseKey){lastHouseKey=houseKey;adminRequest++;if(activePanel==="house")renderHouse();}
 if(activePanel==="room")renderRoom();
 if(activePanel==="board"&&snapshot.durable.zoneId!=="lounge")closePanel();
}
function unreadKey(){return live?live.durable.house.id+":"+live.durable.selfId+":"+live.durable.streamId:"";}
function updateUnread(snapshot,history){
 const key=unreadKey(), state=unreadStreams.get(key)||{sequence:0,unread:0,seen:new Set()};
 for(const message of snapshot.durable.chat||[]){if(!history&&!state.seen.has(message.id)&&message.sequence>state.sequence&&message.authorId!==snapshot.durable.selfId&&activePanel!=="chat")state.unread++;state.seen.add(message.id);}
 state.seen=new Set(snapshot.durable.chat.map(message=>message.id));
 state.sequence=Math.max(state.sequence,...snapshot.durable.chat.map(message=>message.sequence));
 if(activePanel==="chat")state.unread=0;unreadStreams.set(key,state);$("chat-count").textContent=state.unread?String(state.unread):"";
 $("chat-count").setAttribute("aria-label",state.unread+" unread messages here");
}
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
 $("transcript").replaceChildren();
 for(const chat of live?.durable.chat||[]){const item=node("li");item.dataset.messageId=chat.id;item.append(node("b",chat.name+": "),node("span",chat.text));$("transcript").append(item);}
 $("transcript").scrollTop=$("transcript").scrollHeight;
}
function renderCards(){
 $("cards").replaceChildren();
 if(!live)return;
 if(live.durable.zoneId!=="lounge"){ $("cards").append(node("p","Return to the shared lounge to use the study board.","subtle"));$("card-form").hidden=true;return;}
 $("card-form").hidden=false;
 for(const card of live.durable.cards){
  const person=live.durable.residents.find(r=>r.id===card.authorId);
  const article=node("article",undefined,"card");article.dataset.cardId=card.id;
  article.append(node("small",(person?.name||"Former resident")+(card.authorId===live.durable.selfId?" · you":"")),node("h3",card.smallGoal),node("span",card.state==="ownerLeft"?"Author left · not marked solved":card.state==="closed"?"Closed by author":card.helpRequested?"Question open · replies in chat":"Current goal","card-state"));
  if(card.question)article.append(node("p",card.question));
  if(card.resourceUrl){const link=node("a","Open resource");link.href=card.resourceUrl;link.target="_blank";link.rel="noopener noreferrer";article.append(link);}
  if(card.nextStep)article.append(node("p","Next step: "+card.nextStep));
  $("cards").append(article);
 }
 if(!live.durable.cards.length)$("cards").append(node("p","A clear next step can start with a small question.","subtle"));
}
function fillCard(){
 let card=currentCard();
 if(cardProjection){
  if(cardProjection.scope!==identityScope(live))cardProjection=null;
  else if(live.durable.streamId===cardProjection.streamId&&live.durable.sequence>=cardProjection.sequence)cardProjection=null;
  else card=cardProjection.closed?null:{...cardProjection.payload,id:cardProjection.id,revision:cardProjection.revision};
 }
 cardBase=card?{id:card.id,revision:card.revision}:null;
 $("small-goal").value=card?.smallGoal||"";$("question").value=card?.question||"";$("resource").value=card?.resourceUrl||"";$("next-step").value=card?.nextStep||"";$("help-requested").checked=card?.helpRequested||false;
 $("close-card").disabled=!card;$("saved-card").hidden=true;$("card-status").textContent=card?"Your saved current card.":"Start one current card. A goal is enough.";
}
function ensureRoomDraft(){
 const room=ownRoom();if(!room)return null;
 if(!roomDraft||roomDraft.scope!==roomScope())roomDraft={scope:roomScope(),layout:structuredClone(room.placements),layoutBase:room.revision,basePlacements:structuredClone(room.placements),layoutVersion:0,layoutDirty:false,metadata:{open:room.open,palette:room.palette},metadataBase:room.revision,metadataVersion:0,metadataDirty:false,ackRevision:0,layoutMessage:"",metadataMessage:"",reviewing:false};
 if(!roomDraft.metadataDirty&&room.revision>=roomDraft.ackRevision){roomDraft.metadata={open:room.open,palette:room.palette};roomDraft.metadataBase=room.revision;}
 if(!roomDraft.layoutDirty&&room.revision>=roomDraft.ackRevision){roomDraft.layout=structuredClone(room.placements);roomDraft.basePlacements=structuredClone(room.placements);roomDraft.layoutBase=room.revision;}
 return roomDraft;
}
function renderRoom(){
 const room=ownRoom();$("walk-room").hidden=Boolean(room);$("return-lounge").hidden=!live?.durable.room;
 $("room-form").hidden=!room;$("furniture-editor").hidden=!room;
 $("room-instructions").textContent=room?"Your changes affect this bedroom. Keep the arrival path clear; choose up to ten pieces.":"Walk through your named door to arrange your bedroom. Friends can visit when you open it.";
 world?.setEditing(Boolean(room));if(!room)return;
 const draft=ensureRoomDraft();$("room-open").checked=draft.metadata.open;$("palette").value=draft.metadata.palette;
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
 const draft=ensureRoomDraft();if(!draft)return;
 const selected=$("placement").value,next=structuredClone(draft.layout),item=next.find(p=>p.id===selected);if(!item)return;
 if(remove)next.splice(next.indexOf(item),1);else {item.x+=dx;item.z+=dz;if(rotate)item.rotation=(item.rotation+1)%4;}
 if(!validatePlacements(next)){notice("That position blocks furniture or the clear route to your door.");return;}
 draft.layout=next;draft.layoutVersion++;draft.layoutDirty=true;draft.layoutMessage="";draft.reviewing=false;renderPlacements();
}

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
function renderHouse(){
 if(!live)return;
 const d=live.durable;$("join-code-display").textContent=d.house.code;
 $("capacity-status").textContent=d.residents.length+" of "+d.house.capacity+" permanent bedrooms claimed. Offline friends keep their rooms.";
 $("membership-actions").replaceChildren();$("removed-members").replaceChildren();
 for(const member of d.residents){
  const row=node("div",undefined,"member-row");row.append(node("span",member.name+(member.id===d.house.ownerId?" · owner":"")));
  if(d.selfId===d.house.ownerId&&member.id!==d.selfId){
   const buttons=node("div");
   for(const [title,type] of [["Transfer ownership","house.transfer"],["Remove member","house.remove"]]){
    const button=node("button",title);button.addEventListener("click",protectedAction(async()=>{
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
 privacyGeneration++;bootstrapRequest++;adminRequest++;pendingRequest++;
 client?.close();client=null;inspector?.close();inspector=null;live=null;
 roomDraft=null;suspendedDrafts=null;cardProjection=null;cardDirty=false;cardBase=null;cardVersion++;chatVersion++;
 lastScope="";lastIdentityScope="";lastHouseKey="";lastDurableKey="";unreadStreams.clear();pending.clear();keyIssuance=null;setRecoveryBusy(false);
 clearPrivateDOM();closePanel();world?.update(null);world?.setInputEnabled(false);$("notice").textContent="";$("notice").hidden=true;
 $("game-controls").hidden=true;$("roster").hidden=true;$("house-code-button").hidden=true;$("connection-limit-pending").hidden=true;
}
async function bootstrap(){
 const request=++bootstrapRequest,epoch=privacyGeneration,loaded=await api("/api/house/me");
 if(request!==bootstrapRequest||epoch!==privacyGeneration)return;
 if(me?.identity.id!==loaded.identity.id||me?.home?.id!==loaded.home?.id)invalidateIdentityView();
 me=loaded;
 if(!me.home){
  client?.close();client=null;live=null;world?.update(null);world?.setInputEnabled(false);
  $("lobby").hidden=false;$("game-controls").hidden=true;$("roster").hidden=true;$("house-code-button").hidden=true;
  $("name").value=me.identity.name==="Study friend"?"":me.identity.name;$("colour").value=me.identity.colour;
  $("connection-status").textContent="Your evening awaits";$("place-label").textContent="A little place to make progress together";
  $("lobby-export").hidden=me.archiveCount===0;$("archive-count").hidden=me.archiveCount===0;
  inspector ||= createPendingInspector({expectedIdentityId:me?.identity.id,fetchMe:()=>api("/api/house/me")});
  $("archive-count").textContent=me.archiveCount+" private room archive"+(me.archiveCount===1?"":"s")+" available in your download.";return;
 }
 if(!client){
  const actorId=me.identity.id;let ownedClient;
  ownedClient=createHouseClient({expectedIdentityId:actorId,onSnapshot:snapshot=>{if(client===ownedClient)onSnapshot(snapshot);},onDisconnect:()=>{if(client!==ownedClient)return;onSnapshot(null);void checkMembership();},onError:error=>{if(client!==ownedClient||(live?.durable.selfId||me?.identity.id)!==actorId)return;if(showConnectionLimit(error))return;notice(error.message||String(error));if(["FORBIDDEN","NO_HOUSE","UNAUTHENTICATED"].includes(error.code))void checkMembership();}});
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
   try{const saved=await api("/api/house/me");if(saved.home){pending.delete(lobbyKey);await bootstrap();notice("Opened your saved house. The original reply was interrupted.");return;}}catch{ /* The original UUID remains pending for an explicit retry. */ }
  }else pending.delete(lobbyKey);
  throw error;
 }
 await bootstrap();notice(type==="house.create"?"Your house is ready. Share its code with a friend.":"Welcome to the house.");
}));
$("quick-chat").addEventListener("submit",protectedAction(async()=>{
 const text=$("chat-input").value.trim();if(!text||!live)return;
 const submittedVersion=chatVersion,submittedScope=scopeKey(live),submittedText=$("chat-input").value,submittedZone=live.durable.zoneId;
 await save("chat.send",{zoneId:submittedZone,text});
 if(chatVersion===submittedVersion&&scopeKey(live)===submittedScope&&$("chat-input").value===submittedText)$("chat-input").value="";
 if(suspendedDrafts?.scope===submittedScope&&suspendedDrafts.chatVersion===submittedVersion&&suspendedDrafts.chat===submittedText)suspendedDrafts.chat="";
}));
for(const radio of document.querySelectorAll("input[name=availability]"))radio.addEventListener("change",protectedAction(()=>client.setAvailability(radio.value)));
$("panel-close").addEventListener("click",closePanel);
document.addEventListener("keydown",event=>{if(event.key==="Escape")closePanel();});
for(const button of document.querySelectorAll("[data-panel]"))button.addEventListener("click",()=>openPanel(button.dataset.panel));
$("house-code-button").addEventListener("click",()=>openPanel("house"));
$("recover-open").addEventListener("click",()=>openPanel("recovery"));
$("recovery-form").addEventListener("submit",protectedAction(async()=>{await api("/api/house/recover",{proof:$("recovery-proof").value.trim()});invalidateIdentityView();await bootstrap();notice("Your room and saved work are back. Create a new recovery key.");}));
$("camera-overview").addEventListener("click",()=>{world?.setCameraMode?.("overview");renderCameraMode();queueSafeArea();});
$("camera-recenter").addEventListener("click",()=>{world?.setCameraMode?.("play");renderCameraMode();queueSafeArea();});
$("takeover").addEventListener("click",protectedAction(()=>client.takeover()));
$("interact").addEventListener("click",()=>world?.interact());
for(const [id,x,z] of [["move-up",0,-1],["move-down",0,1],["move-left",-1,0],["move-right",1,0]]){
 const button=$(id);button.addEventListener("pointerdown",event=>{event.preventDefault();button.setPointerCapture(event.pointerId);world?.setDirection(x,z);});
 for(const name of ["pointerup","pointercancel","lostpointercapture"])button.addEventListener(name,()=>world?.setDirection(0,0));
}
$("chat-input").addEventListener("input",()=>{chatVersion++;});
$("card-form").addEventListener("input",()=>{cardVersion++;cardDirty=true;$("close-card").disabled=true;$("card-status").textContent="Unsaved draft";});
$("card-form").addEventListener("submit",protectedAction(async()=>{
 const submittedVersion=cardVersion, submittedScope=identityScope(live), submittedBase=cardBase;
 const payload={...(cardBase?{cardId:cardBase.id}:{}),smallGoal:$("small-goal").value,question:$("question").value,resourceUrl:$("resource").value,nextStep:$("next-step").value,helpRequested:$("help-requested").checked};
 try{
  const receipt=await save("card.save",payload,submittedBase?.revision||0);
  if((live?identityScope(live):lastIdentityScope)!==submittedScope)return;
  cardProjection={scope:submittedScope,id:submittedBase?.id||receipt.result?.cardId,revision:receipt.entityRevision,streamId:receipt.streamId,sequence:receipt.sequence,payload};
  if(cardVersion===submittedVersion){cardDirty=false;if(live?.durable.zoneId==="lounge")fillCard();else cardBase={id:submittedBase?.id||receipt.result?.cardId,revision:receipt.entityRevision};if(live)notice("Your card is saved. Closing it is your choice.");}
  else{const id=submittedBase?.id||receipt.result?.cardId;cardBase=id?{id,revision:receipt.entityRevision}:submittedBase;cardDirty=true;if(live){$("card-status").textContent="Submitted version saved. Your newer edits are still a draft.";notice("Your newer edits are kept as a draft.");}}
 }
 catch(error){if(identityScope(live)!==submittedScope)throw error;$("saved-card").hidden=false;$("card-status").textContent="Draft kept. "+error.message;throw error;}
}));
$("saved-card").addEventListener("click",()=>{cardDirty=false;fillCard();});
$("close-card").addEventListener("click",protectedAction(async()=>{
 const card=currentCard()||(!cardDirty?cardBase:null);if(!card)return;
 const submittedVersion=cardVersion,submittedScope=identityScope(live),receipt=await save("card.close",{cardId:card.id},card.revision);
 if((live?identityScope(live):lastIdentityScope)!==submittedScope)return;
 cardBase=null;cardProjection={scope:submittedScope,streamId:receipt.streamId,sequence:receipt.sequence,closed:true};
 if(cardVersion===submittedVersion){cardDirty=false;if(live?.durable.zoneId==="lounge")fillCard();if(live)notice("Card closed by you.");}
 else {cardDirty=true;if(live){$("card-status").textContent="Card closed. Your newer edits are a new draft.";notice("Your newer edits are kept as a new draft.");}}
}));
$("room-form").addEventListener("input",()=>{const draft=ensureRoomDraft();if(!draft)return;draft.metadata={open:$("room-open").checked,palette:$("palette").value};draft.metadataDirty=true;draft.metadataVersion++;draft.metadataMessage="Unsaved room settings";$("room-status").textContent=draft.metadataMessage;});
$("room-form").addEventListener("submit",protectedAction(async()=>{
 const room=ownRoom(),draft=ensureRoomDraft();if(!room||!draft)return;
 const submitted={scope:draft.scope,version:draft.metadataVersion,base:draft.metadataBase,metadata:{...draft.metadata},placements:structuredClone(room.revision<draft.ackRevision?draft.basePlacements:room.placements)};
 try{
  const receipt=await save("room.configure",{roomId:room.id,...submitted.metadata},submitted.base);
  if(roomDraft!==draft||(live&&draft.scope!==roomScope()))return;
  if(draft.layoutBase===submitted.base&&JSON.stringify(draft.basePlacements)===JSON.stringify(submitted.placements))draft.layoutBase=receipt.entityRevision;
  draft.ackRevision=Math.max(draft.ackRevision,receipt.entityRevision);draft.metadataBase=receipt.entityRevision;
  if(draft.metadataVersion===submitted.version){draft.metadataDirty=false;draft.metadataMessage="Room settings saved.";}
  else draft.metadataMessage="Submitted settings saved. Your newer edits are still a draft.";
  if(live){renderRoom();notice(draft.metadataMessage);}
 }catch(error){if(roomDraft===draft&&draft.scope===roomScope()){draft.metadataMessage="Draft kept. "+error.message;$("room-status").textContent=draft.metadataMessage;}throw error;}
}));
for(const [id,dx,dz,rotate,remove] of [["piece-left",-.5,0],["piece-right",.5,0],["piece-forward",0,-.5],["piece-back",0,.5],["piece-rotate",0,0,true],["piece-remove",0,0,false,true]])$(id).addEventListener("click",()=>modifyPlacement(dx,dz,rotate,remove));
$("piece-add").addEventListener("click",()=>{
 const draft=ensureRoomDraft();if(!draft)return;const kind=$("kind").value;
 for(let z=-3;z<=2;z+=.5)for(let x=-5;x<=5;x+=.5){const item={id:crypto.randomUUID(),kind,x,z,rotation:0,colour:$("palette").value};const next=[...draft.layout,item];if(validatePlacements(next)){draft.layout=next;draft.layoutVersion++;draft.layoutDirty=true;draft.layoutMessage="";draft.reviewing=false;renderPlacements();$("placement").value=item.id;return;}}
 notice("There is no clear space for that piece. Move or remove something first.");
});
$("layout-save").addEventListener("click",protectedAction(async()=>{
 const room=ownRoom(),draft=ensureRoomDraft();if(!room||!draft)return;
 const submitted={scope:draft.scope,version:draft.layoutVersion,base:draft.layoutBase,placements:structuredClone(draft.layout)};
 try{
  const receipt=await save("room.placements",{roomId:room.id,placements:submitted.placements},submitted.base);
  if(roomDraft!==draft||(live&&draft.scope!==roomScope()))return;
  draft.ackRevision=Math.max(draft.ackRevision,receipt.entityRevision);
  if(draft.layoutBase===submitted.base){draft.layoutBase=receipt.entityRevision;draft.basePlacements=submitted.placements;}
  if(draft.metadataBase===submitted.base)draft.metadataBase=receipt.entityRevision;
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
function pendingSource(){return client||(inspector ||= createPendingInspector({expectedIdentityId:me?.identity.id,fetchMe:()=>api("/api/house/me")}));}
async function renderPending(){
 const request=++pendingRequest, identity=live?.durable.selfId||me?.identity.id;
 const result=await pendingSource().getPending();
 if(request!==pendingRequest||activePanel!=="pending"||(live?.durable.selfId||me?.identity.id)!==identity)return;
 $("pending-entries").replaceChildren();
 for(const entry of result.entries){
  const row=node("article",undefined,"pending-entry");row.dataset.commandId=entry.commandId;
  row.append(node("strong",entry.type+" · "+(entry.state==="expired"?"Expired automatic retry":"Pending reply")),node("p","Saved status unknown · original "+(entry.zoneId||"house admission")+" · "+new Date(entry.createdAt).toLocaleString(),"subtle"));
  const details=node("details"),summary=node("summary","My original draft"),body=node("pre",JSON.stringify(entry.command.payload,null,2));details.append(summary,body);row.append(details);
  const actions=node("div",undefined,"button-row"),retry=node("button",entry.state==="expired"?"Retry expired draft":"Retry original action");retry.dataset.action="retry";retry.disabled=!entry.canRetry;
  retry.addEventListener("click",protectedAction(async()=>{await pendingSource().retryPending(entry.commandId);notice("Original action acknowledged. Check its saved result.");await bootstrap();if(activePanel==="pending")void protectedAction(renderPending)();}));
  const discard=node("button","Discard local draft");discard.addEventListener("click",protectedAction(async()=>{if(!confirm("Discard this local pending draft? Its server save status is unknown."))return;await pendingSource().discardPending(entry.commandId);void protectedAction(renderPending)();}));actions.append(retry,discard);row.append(actions);
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
window.addEventListener("pagehide",()=>{clearTimeout(noticeTimer);hudResizeObserver?.disconnect();if(safeAreaFrame!==null){if(window.cancelAnimationFrame)window.cancelAnimationFrame(safeAreaFrame);else clearTimeout(safeAreaFrame);}client?.close();world?.dispose();});
bootstrap().catch(error=>{if(showConnectionLimit(error))return;notice(error.message,true);$("connection-status").textContent="Could not open the house";});

$("walk-room").addEventListener("click",()=>{const resident=live?.durable.residents.find(r=>r.id===live.durable.selfId);closePanel();if(resident&&!world?.approach({type:"door",slot:resident.slot}))notice("Stand up before walking to your room.");});
$("return-lounge").addEventListener("click",()=>{closePanel();if(!world?.approach({type:"exit"}))notice("Stand up before returning to the lounge.");});
$("walk-seat").addEventListener("click",()=>{closePanel();if(live?.durable.zoneId!=="lounge"){notice("Return to the lounge for the shared study table.");return;}if(!world?.approach({type:"seat"}))notice("Stand up before choosing another seat.");});

$("lobby-export").addEventListener("click",protectedAction(async()=>{const context=privateContext(),data=await api("/api/house/export",{});if(context!==privateContext())return;const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));const link=node("a");link.href=url;link.download="my-study-house.json";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}));
$("lobby-recovery-key").addEventListener("click",protectedAction(()=>issueRecoveryKey("lobby-recovery-output")));
