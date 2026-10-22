import {createHousePuzzleUI} from './public/house-puzzle-ui.js';
import {PUZZLE_ILLUSTRATIONS} from './public/house-puzzle-content.js';

const settings=JSON.parse(document.querySelector('#fixture-settings').textContent);
const art=PUZZLE_ILLUSTRATIONS[0],ids=settings.names.map((_,index)=>'fixture-player-'+(index+1));
const self=ids[5],events=[];
let state={serverEpoch:'fixture-epoch',generation:3,accessGeneration:2,controller:true,
  players:ids.map((id,index)=>({id,connected:true,zoneId:'lounge',seatId:'game-seat-'+(index+1),seatGeneration:index+1,animation:'sit'})),
  durable:{selfId:self,zoneId:'lounge',house:{id:'fixture-house',ownerId:ids[0],capacity:6},
    residents:ids.map((id,index)=>({id,name:settings.names[index]})),
    puzzle:{revision:7,current:{id:'fixture-round',ruleset:1,illustrationId:art.id,illustrationVersion:art.version,illustrationDigest:art.digest,
      placements:art.pieces.slice(0,6).map((piece,index)=>({pieceId:piece.id,destination:piece.destination,actorId:ids[index]})),completed:false}},
    game:{revision:0,current:null}},
  puzzleRoster:{serverEpoch:'fixture-epoch',houseId:'fixture-house',roundId:'fixture-round',revision:7,memberIds:[...ids],selfParticipationId:'fixture-consent-one'}};
const initialState=structuredClone(state);let pendingDirect=null,pendingCount=0;
const ui=createHousePuzzleUI(document.querySelector('#picture-game-panel'),{
  send:async(type,payload,revision)=>{events.push({event:'send',type,payload,revision});return {ok:true};},
  intent:async(mode,roundId)=>{events.push({event:'intent',mode,roundId});return {ok:true};},
  pendingIntent:()=>pendingDirect,retryIntent:async()=>{events.push({event:'retryIntent'});return {ok:true};},
  onLeave:()=>events.push({event:'onLeave'}),onReturn:()=>events.push({event:'onReturn'}),
  onChat:()=>events.push({event:'onChat'}),onPending:()=>events.push({event:'onPending'})
});
function project(joined){
  state=structuredClone(state);
  state.puzzleRoster.memberIds=joined?[...ids]:ids.filter(id=>id!==self);
  state.puzzleRoster.selfParticipationId=joined?'fixture-consent-'+(++state.puzzleRoster.revision):null;
  document.querySelector('#break-picture-count').textContent=state.puzzleRoster.memberIds.length+' / 6 active';
  document.querySelector('#break-exclusive').textContent=joined?
    'You joined the picture table. Leave participation before joining Four-in-a-row; you can watch either.':
    'Watching never joins. Choose Start if needed, then Join separately. Leave your activity before joining the other.';
  ui.update(state,{pendingCount});
}
function setScenario(kind){
  state=structuredClone(initialState);pendingDirect=null;pendingCount=0;
  state.durable.puzzle.current.id='fixture-round-'+kind;state.puzzleRoster.roundId=state.durable.puzzle.current.id;
  if(kind==='pending-join'){
    state.puzzleRoster.memberIds=ids.filter(id=>id!==self);state.puzzleRoster.selfParticipationId=null;
    pendingDirect={mode:'join',roundId:state.durable.puzzle.current.id,state:'pending',canRetry:true};
  }else if(kind==='pending-save'){pendingCount=1;}
  else if(kind==='no-round'){
    state.durable.puzzle.current=null;state.durable.puzzle.revision=0;state.puzzleRoster.roundId=null;
    state.puzzleRoster.memberIds=[];state.puzzleRoster.selfParticipationId=null;
  }else throw new Error('Unknown scripted recovery scenario');
  document.querySelector('#break-picture-count').textContent=state.puzzleRoster.memberIds.length+' / 6 active';
  document.querySelector('#break-exclusive').textContent=state.puzzleRoster.selfParticipationId?
    'You joined the picture table. Leave participation before joining Four-in-a-row; you can watch either.':
    'Watching never joins. Choose Start if needed, then Join separately. Leave your activity before joining the other.';
  ui.update(state,{pendingCount});
}
function applyStartedRound(){
  state=structuredClone(initialState);state.durable.puzzle.current.id='fixture-round-started';state.durable.puzzle.current.placements=[];
  state.durable.puzzle.revision=1;state.puzzleRoster.roundId=state.durable.puzzle.current.id;state.puzzleRoster.memberIds=[];
  state.puzzleRoster.selfParticipationId=null;pendingDirect=null;pendingCount=0;ui.update(state,{pendingCount});
}
project(true);
document.querySelector('#panel-close').focus();
window.fixture={events,ids,self,art:{id:art.id,pieces:art.pieces},project,setScenario,applyStartedRound,inspectPlacements:()=>structuredClone(state.durable.puzzle.current?.placements||[]),dispose:()=>ui.dispose(),ready:true};
