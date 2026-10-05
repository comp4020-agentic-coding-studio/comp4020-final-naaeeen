import {createHash} from 'node:crypto';

export const PALETTE=['#ffc47b','#f391a8','#a0d8b3','#99c8e6','#c7a3ec'];
export const CATALOG={chair:{footprint:[1,1]},table:{footprint:[1.6,1.6]},lamp:{footprint:[0.8,0.8]},plant:{footprint:[0.8,0.8]}};
export const FIXED_FOOTPRINTS=[
  {id:'fixed-sofa',x:-2.72,z:-1.55,footprint:[0.82,1.98]},
  {id:'fixed-shelf',x:2.46,z:-2.86,footprint:[1.55,0.82]},
  {id:'left-wall',x:-3.35,z:0,footprint:[0.32,7]},
  {id:'back-wall',x:0,z:-3.35,footprint:[7,0.5]}
];
export class DomainError extends Error {constructor(code,message){super(message);this.code=code;}}
const fail=(code,message)=>{throw new DomainError(code,message);};
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;

export function createInitialState(){
  return {schemaVersion:1,revision:0,furniture:[
    {id:'chair-a',asset:'chair',owner:'alice',x:-2,z:1,yaw:90,revision:0},
    {id:'chair-b',asset:'chair',owner:'bob',x:2,z:-1,yaw:270,revision:0},
    {id:'table-a',asset:'table',owner:'alice',x:0,z:0,yaw:0,revision:0},
    {id:'lamp-b',asset:'lamp',owner:'bob',x:2,z:2,yaw:0,revision:0},
    {id:'plant-a',asset:'plant',owner:'alice',x:-1.5,z:-2.5,yaw:0,revision:0},
    {id:'plant-b',asset:'plant',owner:'bob',x:1,z:-2.5,yaw:0,revision:0}
  ],lantern:{parts:{alice:{colour:PALETTE[0],revision:0},bob:{colour:PALETTE[1],revision:0}}},message:'A little courtyard, made by both of us.',messageRevision:0,receipts:{},events:[]};
}

function footprint(item){
  if(item.footprint)return item.footprint;
  const [w,d]=CATALOG[item.asset].footprint;
  return item.yaw%180?[d,w]:[w,d];
}
function checkPlacement(item,others){
  const [w,d]=footprint(item);
  if(Math.abs(item.x)+w/2>3.5||Math.abs(item.z)+d/2>3.5)fail('INVALID_INPUT','Keep this item inside the courtyard.');
  for(const other of [...others,...FIXED_FOOTPRINTS]){
    if(other.id===item.id)continue;
    const [ow,od]=footprint(other);
    if(Math.abs(item.x-other.x)<(w+ow)/2-0.001 && Math.abs(item.z-other.z)<(d+od)/2-0.001)fail('COLLISION','Another item occupies that space.');
  }
}

export function applyCommand(input,command){
  if(!command||!['alice','bob'].includes(command.actor))fail('FORBIDDEN','Unknown demo resident.');
  if(typeof command.commandId!=='string'||!/^[a-zA-Z0-9_-]{1,64}$/.test(command.commandId))fail('INVALID_INPUT','A bounded command ID is required.');
  const hash=createHash('sha256').update(JSON.stringify(canonical(command))).digest('hex');
  const key=`${command.actor}:${command.commandId}`;
  const previous=input.receipts[key];
  if(previous){
    if(previous.hash!==hash)fail('COMMAND_ID_REUSED','That command ID already has another payload.');
    return {state:input,result:previous.result,event:null,changed:false};
  }
  if(!Number.isInteger(command.expectedRevision)||command.expectedRevision<0)fail('INVALID_INPUT','A valid expected revision is required.');
  const state=structuredClone(input);
  const payload=command.payload??{};
  let target;
  if(command.type==='contribute'){
    if(command.targetId!=='lantern')fail('INVALID_INPUT','Unknown shared artifact.');
    target=state.lantern.parts[command.actor];
    if(!PALETTE.includes(payload.colour))fail('INVALID_INPUT','Choose a catalogue palette colour.');
    if(target.revision!==command.expectedRevision)fail('REVISION_CONFLICT','This pane changed; refresh before choosing again.');
    target.colour=payload.colour;
  }else if(command.type==='note'){
    if(command.targetId!=='note'||typeof payload.text!=='string'||payload.text.length>140)fail('INVALID_INPUT','Use a short plain-text note.');
    if(state.messageRevision!==command.expectedRevision)fail('REVISION_CONFLICT','This note changed; read the latest version.');
    state.message=payload.text;
    state.messageRevision++;
  }else{
    target=state.furniture.find(x=>x.id===command.targetId);
    if(!target)fail('INVALID_INPUT','Unknown item.');
    if(target.owner!==command.actor)fail('FORBIDDEN','This item belongs to the other resident.');
    if(target.revision!==command.expectedRevision)fail('REVISION_CONFLICT','This item changed; use its latest position.');
    if(command.type==='move'){
      for(const axis of ['x','z'])if(!Number.isFinite(payload[axis])||Math.abs(payload[axis])>3||!Number.isInteger(payload[axis]*2))fail('INVALID_INPUT','Use half-grid positions inside the room.');
      target.x=payload.x;target.z=payload.z;
    }else if(command.type==='rotate'){
      if(![0,90,180,270].includes(payload.yaw))fail('INVALID_INPUT','Use a quarter turn.');
      target.yaw=payload.yaw;
    }else fail('INVALID_INPUT','Unknown command.');
    checkPlacement(target,state.furniture);
  }
  if(target)target.revision++;
  state.revision++;
  const event={seq:state.revision,type:command.type,actor:command.actor,targetId:command.targetId,commandId:command.commandId};
  const result={ok:true,revision:state.revision,entityRevision:target?.revision??state.messageRevision};
  state.events.push(event);state.events=state.events.slice(-200);
  state.receipts[key]={hash,result};
  const keys=Object.keys(state.receipts);
  if(keys.length>200)for(const old of keys.slice(0,keys.length-200))delete state.receipts[old];
  return {state,result,event,changed:true};
}
