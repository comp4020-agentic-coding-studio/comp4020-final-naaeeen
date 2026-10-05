import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

// Local diagnostic only: explicit demo actors are not production authentication.
const origin = 'http://127.0.0.1:4260';
const read = async()=>{const response=await fetch(origin+'/api/state');assert.equal(response.status,200);return response.json();};
const initial = await read();
const chair = initial.furniture.find(item=>item.id==='chair-a');
const plant = initial.furniture.find(item=>item.id==='plant-a');
const results=[];
async function check(name,command,status,code){
  const response=await fetch(origin+'/api/command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(command)});
  const outcome=await response.json();
  assert.equal(response.status,status);
  if(code)assert.equal(outcome.code,code);
  assert.equal((await read()).revision,initial.revision);
  results.push({name,status,outcome,unchangedRevision:initial.revision});
}
const move={commandId:crypto.randomUUID(),actor:'bob',type:'move',targetId:chair.id,expectedRevision:chair.revision,payload:{x:chair.x,z:chair.z}};
await check('Reject another demo actor editing an owned chair',move,403,'FORBIDDEN');
await check('Reject stale revision without mutation',{...move,commandId:crypto.randomUUID(),actor:'alice',expectedRevision:chair.revision-1},409,'REVISION_CONFLICT');
await check('Reject a plant inside the fixed sofa',{commandId:crypto.randomUUID(),actor:'alice',type:'move',targetId:plant.id,expectedRevision:plant.revision,payload:{x:-2.5,z:-2}},400,'COLLISION');

// The last browser task moved chair-a west then east. Replay the already accepted
// absolute-position command; this is a replay test, not injected ACK loss.
const last = initial.events.at(-1);
if(last?.type==='move' && last.targetId===chair.id && last.actor==='alice'){
  const replay={commandId:last.commandId,actor:'alice',type:'move',targetId:chair.id,expectedRevision:chair.revision-1,payload:{x:chair.x,z:chair.z}};
  await check('Repeat the already accepted browser command, one committed effect',replay,200);
  await check('Reject changed payload under the accepted command ID',{...replay,payload:{x:chair.x-.5,z:chair.z}},400,'COMMAND_ID_REUSED');
}else{
  results.push({name:'Accepted browser command replay',status:'NOT_RUN',reason:'Expected last west/east browser task no longer matches; do not invent a replay envelope.'});
}
await writeFile(new URL('../evaluation/local-api-check.json',import.meta.url),JSON.stringify({recordedOn:'2026-10-06',scope:'Local demo HTTP/domain boundary; not authentication or actual lost-ACK fault injection',initialRevision:initial.revision,results},null,2)+'\n');
console.log(JSON.stringify({checks:results.length,revision:initial.revision,allRun:results.every(item=>item.status!=='NOT_RUN')}));
