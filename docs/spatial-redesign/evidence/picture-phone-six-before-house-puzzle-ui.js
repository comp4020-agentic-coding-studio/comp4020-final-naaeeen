import { PUZZLE_ILLUSTRATIONS, getPuzzleIllustration } from "./house-puzzle-content.js";
const ORDER=[15,2,21,8,12,5,19,0,17,10,23,6,14,4,18,11,3,22,9,16,1,20,7,13];
const ROWS=["top row","second row","third row","bottom row"],COLUMNS=["left edge","second spot","third spot","fourth spot","fifth spot","right edge"];
/** Stable, transient picture controls. Consent is projected only from accepted live rosters. */
export function createHousePuzzleUI(element,{send,intent,retryIntent=()=>Promise.resolve(),pendingIntent=()=>null,onLeave=()=>{},onReturn=()=>{},onPending=()=>{},onChat=()=>{}}){
 const doc=element.ownerDocument;
 element.innerHTML=`<div class="puzzle-top"><p data-puzzle-roster></p><div class="puzzle-tools"><button data-puzzle-action="reference" aria-expanded="false">Reference picture</button><button data-puzzle-action="chat">Room chat</button></div></div><div class="puzzle-consent"><button data-puzzle-action="start">Start picture</button><button data-puzzle-action="join" class="primary">Join picture table</button><button data-puzzle-action="leave">Leave participation</button><button data-puzzle-action="return">Return to my room</button><button data-puzzle-action="retry" hidden>Retry original participation action</button><button data-puzzle-action="pending" hidden>Inspect pending picture action</button></div><div data-puzzle-reset class="puzzle-reset" hidden><p>Replace this unfinished picture? Its placed pieces will be cleared. Only the house owner can confirm while no one else participates.</p><button data-puzzle-action="confirm" class="danger">Confirm replacement</button><button data-puzzle-action="cancel">Keep this picture</button></div><div class="puzzle-workspace"><section class="puzzle-board-section" aria-label="Shared picture"><div class="puzzle-section-heading"><h3>Rain at the study nook</h3><span data-puzzle-progress></span></div><div data-puzzle-board class="puzzle-board" role="group" aria-label="Picture places, six columns and four rows"></div><p class="puzzle-instruction">Choose a loose piece, then a picture place. Arrow keys move focus.</p></section><section class="puzzle-tray-section" aria-label="Picture pieces"><div class="puzzle-section-heading"><h3 data-puzzle-tray-title>Loose pieces</h3><span>12 per page</span></div><div data-puzzle-tray class="puzzle-tray" role="group" aria-label="Loose picture pieces"></div><div class="puzzle-browse"><button data-puzzle-action="previous">Previous</button><span data-puzzle-page></span><button data-puzzle-action="next">Next</button></div><div class="puzzle-selection"><div data-puzzle-preview class="puzzle-preview" aria-hidden="true"></div><p data-puzzle-selection>No piece selected.</p><p data-puzzle-complete hidden>The picture is complete. Stay and chat, or return to your room. A new picture needs a fresh Start and Join.</p></div></section></div><p data-puzzle-feedback class="puzzle-feedback" role="status" aria-live="polite"></p><section data-puzzle-reference class="puzzle-reference" aria-label="Reference picture" hidden><div><h3>Reference picture</h3><button data-puzzle-action="close-reference">Close reference</button></div><img data-puzzle-reference-image alt=""><p data-puzzle-description></p></section>`;
 const get=selector=>element.querySelector(selector),button=action=>get('[data-puzzle-action="'+action+'"]');
 const art=PUZZLE_ILLUSTRATIONS[0],pieces=ORDER.map(index=>art.pieces[index]),cells=[],pieceButtons=new Map();
 let snapshot=null,selected=null,page=0,boardFocus=0,trayFocus=pieces[0].id,message="",busy=false,disposed=false,confirmation=null,operation=0,durableToken=0,joinStarted=false,withdrawing=false,pendingCount=0;
 const context=()=>snapshot?[snapshot.durable.house.id,snapshot.durable.selfId,snapshot.durable.zoneId,snapshot.serverEpoch,snapshot.generation,snapshot.accessGeneration].join(":"):"";
 const round=()=>snapshot?.durable.puzzle?.current;
 const participating=()=>Boolean(snapshot?.puzzleRoster?.selfParticipationId&&snapshot.puzzleRoster.roundId===round()?.id&&snapshot.puzzleRoster.memberIds.includes(snapshot.durable.selfId));
 const exclusive=()=>Boolean(snapshot?.durable.game?.current?.players.includes(snapshot.durable.selfId));
 const writable=()=>Boolean(snapshot?.controller&&snapshot.durable.zoneId==="lounge"&&snapshot.durable.puzzle&&snapshot.players?.some(player=>player.id===snapshot.durable.selfId&&player.connected&&player.zoneId==="lounge"&&/^game-seat-[1-6]$/.test(player.seatId)));
 const placed=()=>new Map((round()?.placements||[]).map(placement=>[placement.pieceId,placement]));
 const say=text=>{message=text;render();};
 function crop(node,piece){node.style.backgroundImage='url("'+art.url+'")';node.style.backgroundPosition=(piece.destination%6)*20+"% "+Math.floor(piece.destination/6)*100/3+"%";}
 for(let index=0;index<24;index++){
  const cell=doc.createElement("button");cell.type="button";cell.className="puzzle-cell";cell.dataset.puzzleDestination=String(index);
  cell.addEventListener("click",()=>place(index));cell.addEventListener("focus",()=>{boardFocus=index;roving();});get('[data-puzzle-board]').append(cell);cells.push(cell);
 }
 for(const piece of pieces){
  const item=doc.createElement("button");item.type="button";item.className="puzzle-piece";item.dataset.puzzlePiece=piece.id;item.title=piece.description;crop(item,piece);
  item.addEventListener("click",()=>select(piece.id));item.addEventListener("focus",()=>{trayFocus=piece.id;roving();});get('[data-puzzle-tray]').append(item);pieceButtons.set(piece.id,item);
 }
 function roving(){for(let index=0;index<cells.length;index++)cells[index].tabIndex=index===boardFocus?0:-1;const visible=pieces.filter(piece=>!pieceButtons.get(piece.id).hidden);if(!visible.some(piece=>piece.id===trayFocus))trayFocus=visible[0]?.id;for(const [id,item] of pieceButtons)item.tabIndex=id===trayFocus?0:-1;}
 function select(id){
  if(!writable()||!participating()||withdrawing){say("Join the picture table before choosing a piece. Watching keeps your place free.");return;}
  if(placed().has(id)){say("That piece is already placed. Choose another loose piece.");return;}
  selected=id;say("Selected: "+art.pieces.find(piece=>piece.id===id).description+". Choose a picture place.");
 }
 async function durable(type,payload,revision){
  if(disposed||!snapshot||!writable()||busy||pendingCount){if(pendingCount)say("A picture action is pending, not confirmed saved. Inspect Pending drafts before placing again.");return;}
  const ownContext=context(),ownRound=round()?.id,token=++operation,flight=++durableToken;busy=true;say("Sending… this action is not confirmed saved.");
  try{await send(type,payload,revision);if(disposed||token!==operation||context()!==ownContext||round()?.id!==ownRound)return;say(type==="puzzle.start"?"Start acknowledged. Watch the new picture, then choose Join separately.":"Placement acknowledged. Waiting for the saved picture if its update is delayed.");}
  catch(error){if(disposed||token!==operation||context()!==ownContext||round()?.id!==ownRound)return;say(error.code==="PUZZLE_WRONG_PLACE"?"That place does not match. Your piece is still selected; try another place.":["PENDING","TIMEOUT","STORAGE_UNAVAILABLE"].includes(error.code)?"Picture action pending, not confirmed saved. Inspect Pending drafts; Leave and Return remain available.":error.message||"The action was rejected. Check the current picture and try again.");}
  finally{if(flight===durableToken){busy=false;render();}}
 }
 function place(destination){
  if(!writable()||!participating()||withdrawing){say("Join the picture table before placing a piece.");return;}
  if(!selected){say("Choose a loose piece first.");return;}
  if(placed().has(selected)){selected=null;say("That piece has already been placed. Choose another.");return;}
  const current=round();void durable("puzzle.place",{roundId:current.id,participationId:snapshot.puzzleRoster.selfParticipationId,pieceId:selected,destination},undefined);
 }
 async function participation(mode,retry=false){
  const current=round();if(!current||disposed||(mode==="join"&&!retry&&!writable()))return;
  const ownContext=context(),ownRound=current.id,token=++operation;if(mode==="join"){joinStarted=true;withdrawing=false;}else withdrawing=true;
  say(mode==="leave"?"Withdrawal pending. You can return to your room now.":"Joining… participation is not confirmed yet.");
  try{await (retry?retryIntent():intent(mode,current.id));if(disposed||token!==operation||context()!==ownContext||round()?.id!==ownRound)return;say(mode==="leave"?"Withdrawal acknowledged.":round()?.completed?"The picture is complete. A new picture needs a fresh Start and Join.":"Join acknowledged. Waiting for current participation; watching until it arrives.");}
  catch(error){if(disposed||token!==operation||context()!==ownContext||round()?.id!==ownRound)return;say(["PENDING","TIMEOUT"].includes(error.code)?"Participation reply is uncertain. Retry the original action, or Leave to cancel a pending Join.":error.message||"Participation was rejected. Check the current table.");}
  finally{if(token===operation){if(mode==="leave")joinStarted=false;render();}}
 }
 function leave(toRoom=false){const uncertain=pendingIntent();if(round()&&(participating()||joinStarted||uncertain?.mode==="join"))void participation("leave");selected=null;confirmation=null;render();(toRoom?onReturn:onLeave)();}
 function captureStart(confirmUnfinished){const table=snapshot.durable.puzzle,roster=snapshot.puzzleRoster;return {revision:table.revision,payload:{expectedRoundId:table.current?.id??null,illustrationId:art.id,illustrationVersion:art.version,confirmUnfinished,authority:{serverEpoch:snapshot.serverEpoch,accessGeneration:snapshot.accessGeneration,generation:snapshot.generation},expectedRoster:{serverEpoch:roster.serverEpoch,revision:roster.revision}}};}
 button("start").addEventListener("click",()=>{if(!writable()||!snapshot.puzzleRoster)return;const unfinished=round()&&!round().completed;if(unfinished){if(snapshot.durable.house.ownerId!==snapshot.durable.selfId||snapshot.puzzleRoster.memberIds.some(id=>id!==snapshot.durable.selfId))return;confirmation=captureStart(true);render();button("confirm").focus();}else{const captured=captureStart(false);void durable("puzzle.start",captured.payload,captured.revision);}});
 button("confirm").addEventListener("click",()=>{if(!confirmation||!writable())return;const captured=confirmation;confirmation=null;void durable("puzzle.start",captured.payload,captured.revision);});
 button("cancel").addEventListener("click",()=>{confirmation=null;render();button("start").focus();});
 button("join").addEventListener("click",()=>{if(!writable()||exclusive()||participating()||round()?.completed)return;void participation("join");});
 button("leave").addEventListener("click",()=>leave(false));button("return").addEventListener("click",()=>leave(true));button("pending").addEventListener("click",onPending);button("chat").addEventListener("click",onChat);
 button("retry").addEventListener("click",()=>{const value=pendingIntent();if(value?.canRetry)void participation(value.mode,true);});
 for(const [action,delta] of [["previous",-1],["next",1]])button(action).addEventListener("click",()=>{page=Math.max(0,Math.min(1,page+delta));render();});
 function reference(open){get('[data-puzzle-reference]').hidden=!open;button("reference").setAttribute("aria-expanded",String(open));if(open)button("close-reference").focus();else button("reference").focus();}
 button("reference").addEventListener("click",()=>reference(get('[data-puzzle-reference]').hidden));button("close-reference").addEventListener("click",()=>reference(false));
 function keys(event){
  if(event.key==="Escape"){if(!get('[data-puzzle-reference]').hidden){event.preventDefault();event.stopPropagation();reference(false);}return;}
  event.stopPropagation();if(!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"].includes(event.key))return;
  const board=get('[data-puzzle-board]').contains(doc.activeElement),tray=get('[data-puzzle-tray]').contains(doc.activeElement);if(!board&&!tray)return;
  event.preventDefault();const items=board?cells:[...pieceButtons.values()].filter(item=>!item.hidden),index=items.indexOf(doc.activeElement);if(index<0)return;
  const columns=board?6:Math.max(1,doc.defaultView.getComputedStyle(get('[data-puzzle-tray]')).gridTemplateColumns.split(" ").filter(Boolean).length||4),step={ArrowLeft:-1,ArrowRight:1,ArrowUp:-columns,ArrowDown:columns}[event.key];
  const next=event.key==="Home"?0:event.key==="End"?items.length-1:Math.max(0,Math.min(items.length-1,index+step));items[next].focus();
 }
 element.addEventListener("keydown",keys);const up=event=>{if(event.key!=="Escape")event.stopPropagation();};element.addEventListener("keyup",up);
 function render(){
  const current=round(),known=current&&getPuzzleIllustration(current.illustrationId,current.illustrationVersion),roster=snapshot?.puzzleRoster,joined=participating(),taken=placed(),unfinished=Boolean(current&&!current.completed),pendingDirect=pendingIntent();
  const validArt=!current||Boolean(known&&known.digest===current.illustrationDigest),canWrite=writable()&&validArt;
  get('[data-puzzle-roster]').textContent=!snapshot?"The picture table is in the lounge.":(joined?"You joined":"You are watching")+" · "+(roster?.memberIds.length||0)+" / 6 active"+(roster?.memberIds.length?" · "+roster.memberIds.map(id=>snapshot.durable.residents.find(person=>person.id===id)?.name||"Housemate").join(", "):"");
  get('[data-puzzle-progress]').textContent=taken.size+" / 24 placed";get('[data-puzzle-board]').style.backgroundImage=current&&validArt?'url("'+art.url+'")':"none";
  for(let index=0;index<cells.length;index++){const placement=[...taken.values()].find(item=>item.destination===index),cell=cells[index],piece=placement&&art.pieces.find(item=>item.id===placement.pieceId);cell.classList.toggle("placed",Boolean(placement&&validArt));cell.setAttribute("aria-label",(piece?piece.description+", placed":"Empty picture place")+", "+ROWS[Math.floor(index/6)]+", "+COLUMNS[index%6]);cell.setAttribute("aria-disabled",String(!canWrite||!joined||withdrawing||Boolean(placement)||busy||pendingCount>0));}
  for(let index=0;index<pieces.length;index++){const piece=pieces[index],item=pieceButtons.get(piece.id),isPlaced=taken.has(piece.id);item.hidden=Math.floor(index/12)!==page;item.classList.toggle("placed",isPlaced);item.setAttribute("aria-disabled",String(isPlaced||!joined||withdrawing||!canWrite));item.setAttribute("aria-label",piece.description+(isPlaced?", already placed":""));item.setAttribute("aria-pressed",String(selected===piece.id));}
  get('[data-puzzle-page]').textContent="Page "+(page+1)+" of 2";button("previous").setAttribute("aria-disabled",String(page===0));button("next").setAttribute("aria-disabled",String(page===1));
  const selection=selected&&art.pieces.find(piece=>piece.id===selected),preview=get('[data-puzzle-preview]');preview.style.backgroundImage="none";if(selection)crop(preview,selection);get('[data-puzzle-selection]').textContent=selection?selection.description:"No piece selected.";
  const complete=Boolean(current?.completed);get('[data-puzzle-complete]').hidden=!complete;preview.hidden=complete;get('[data-puzzle-selection]').hidden=complete;get('[data-puzzle-tray-title]').textContent=complete?"All pieces placed":"Loose pieces";
  button("join").hidden=!unfinished||joined;button("join").disabled=!canWrite||exclusive()||Boolean(pendingDirect);
  button("leave").hidden=complete||(!joined&&!joinStarted&&!pendingDirect);button("leave").disabled=false;button("return").disabled=false;
  button("start").textContent=unfinished?"Replace unfinished picture":current?"Start new picture":"Start picture";button("start").disabled=!canWrite||!roster||busy||pendingCount>0||Boolean(unfinished&&(snapshot.durable.house.ownerId!==snapshot.durable.selfId||roster.memberIds.some(id=>id!==snapshot.durable.selfId)));
  button("retry").hidden=!pendingDirect;button("retry").disabled=!pendingDirect?.canRetry;button("retry").textContent=pendingDirect?.state==="sending"?"Participation action sending…":"Retry original "+(pendingDirect?.mode||"participation");button("pending").hidden=!pendingCount;
  get('[data-puzzle-reset]').hidden=!confirmation;get('[data-puzzle-feedback]').textContent=!validArt?"This picture version is unavailable. Reload to get matching content; saved progress is kept.":exclusive()?"Leave Four-in-a-row before joining the picture table. You can watch either activity.":message||(pendingCount?"A picture action is pending, not confirmed saved. Inspect Pending drafts.":complete?"Completed together. The image stays here after everyone leaves.":joined?"Choose any loose piece. Closing keeps participation; Leave or Return whenever you choose.":"Sit in a game chair, then Start if needed and explicitly Join to contribute. Watching does not join.");
  get('[data-puzzle-reference-image]').src=art.url;get('[data-puzzle-reference-image]').alt=art.title;get('[data-puzzle-description]').textContent=art.reference;roving();
 }
 return {leave:()=>leave(false),update(next,options={}){const oldContext=context(),oldRound=round()?.id,oldSelected=selected;snapshot=next;pendingCount=options.pendingCount||0;if(oldContext!==context()||oldRound!==round()?.id){selected=null;message="";busy=false;joinStarted=false;withdrawing=false;operation++;durableToken++;if(oldContext!==context()){confirmation=null;get('[data-puzzle-reference]').hidden=true;}}else if(oldSelected&&placed().has(oldSelected)){const placement=placed().get(oldSelected),name=snapshot.durable.residents.find(person=>person.id===placement.actorId)?.name||"A housemate";selected=null;message=name+" placed the piece you had selected. Focus stays here; choose another piece.";}if(!participating())selected=null;render();},dispose(){disposed=true;operation++;element.removeEventListener("keydown",keys);element.removeEventListener("keyup",up);}};
}
