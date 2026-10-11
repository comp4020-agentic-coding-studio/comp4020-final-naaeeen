import { createService } from '../../../src/server.ts';
import { createBoardClient } from '../../../board/client.js';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { join } from 'node:path';
const root = new URL('.', import.meta.url).pathname;
const hash = value => createHash('sha256').update(value).digest('hex');
const freeze = JSON.parse(readFileSync(join(root, 'freeze.json'), 'utf8'));
const check = (ok, message) => { if (!ok) throw new Error(message); };
check(hash(readFileSync(new URL(import.meta.url))) === freeze.scriptSha256, 'SCRIPT_CHANGED');
for (const [path, sha] of Object.entries(freeze.sourceSha256)) check(hash(readFileSync(path)) === sha, 'SOURCE_CHANGED');
const canonical = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
function declaredChecks(row) {
 const retry = row.mode==='lost_ack'||row.mode==='no_commit', before = row.mode==='no_commit'?0:1;
 return {
  ...row.observations,
  initialPending:row.initialPending.status==='pending'&&row.initialPending.pending===1,
  firstOutcome:retry?!row.firstOk&&row.afterFirst.status!=='saved'&&row.afterFirst.pending===1:row.firstOk,
  firstAuthorityEffect:row.beforeRetry.effects===before&&row.beforeRetry.receipts===before,
  peerBefore:row.peerBeforeCount===before,
  retryOk:row.retryOk,
  retrySerializedPayload:retry?row.postCount===2&&row.payloadSha256===row.retryPayloadSha256&&row.retrySameId:row.postCount===1,
  finalSaved:row.finalState.status==='saved'&&row.finalState.pending===0,
  oneFinalDurableEffect:row.finalDurable.effects===1&&row.finalDurable.receipts===1&&row.finalDurable.sequence===1,
  peerAfter:row.peerAfterCount===1,
  replayNoNewEffect:canonical(row.afterReplay)===canonical(row.finalDurable),
  composer:row.finalState.draft===row.expectedDraft,
  delayedPending:row.mode!=='delayed_ack'||row.delayedState.pending===1&&row.delayedState.status==='pending'&&row.delayedState.draft===row.expectedDraft,
  reopenedPersistence:row.reopenedDurable.effects===1&&row.reopenedDurable.receipts===1
 };
}
const strongOracle = row => Object.values(declaredChecks(row)).every(Boolean);
const weakOracle = row => row.finalStatus === 'saved';
const results = {schemaVersion:1, kind:'module plus loopback HTTP and SQLite, evaluator calibration', baseline:freeze.baseline, protocolSha256:freeze.protocolSha256, scriptSha256:freeze.scriptSha256, sourceSha256:freeze.sourceSha256, startedAt:new Date().toISOString(), cases:[], errors:[], limitations:['No browser or UI DOM execution','No physical device, WAN, Fly, human usability, one-second delivery or exactly-once general guarantee','Response loss injected after actual authority response; request absence injected before HTTP dispatch','Explicit retry only; polling and Socket.IO disabled','Single bounded run with fresh two-identity fixture per case','Production source/tests/providers unchanged']};
const originalLog = console.log; console.log = () => {};
const memory = () => { const map = new Map(); return {getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,value)}; };
async function runCase(mode) {
 const dataDir = mkdtempSync(join(root, 'fixture-'+mode+'-'));
 const app = createService({dataDir, secureCookies:false}); let client; let closed=false;
 try {
  await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
  const origin = 'http://127.0.0.1:'+app.server.address().port;
  const session = async()=>{const r=await fetch(origin+'/api/house/me'); check(r.ok,'SESSION_HTTP'); return {cookie:r.headers.get('set-cookie').split(';')[0], body:await r.json()};};
  const actor=await session(), peer=await session();
  const api=async(path, person, body)=>{const r=await fetch(origin+path,{headers:{Cookie:person.cookie,Origin:origin,'X-House-Identity':person.body.identity.id,...(body?{'Content-Type':'application/json'}:{})},...(body?{method:'POST',body:JSON.stringify(body)}:{})});const value=await r.json();check(r.ok&&value.ok!==false,'FIXTURE_HTTP');return value;};
  await api('/api/house/command',actor,{commandId:randomUUID(),type:'house.create',payload:{capacity:2,name:'Fixture A',colour:'sage'}});
  actor.body=await api('/api/house/me',actor);
  await api('/api/house/command',peer,{commandId:randomUUID(),type:'house.join',payload:{code:actor.body.home.code,name:'Fixture B',colour:'blue'}});
  peer.body=await api('/api/house/me',peer);
  const houseId=actor.body.home.id, posts=[], replies=[], history=[];
  let first=true, release, heldResolve;
  const held = new Promise(resolve=>heldResolve=resolve);
  const transport = async(path, init)=>{
   const mutation=init?.method==='POST';
   if(mutation) posts.push({body:init.body, id:JSON.parse(init.body).id});
   if(mutation&&first&&mode==='no_commit'){first=false;throw new TypeError('Injected request not dispatched');}
   const response=await fetch(origin+path,{...init,headers:{...init?.headers,Cookie:actor.cookie,Origin:origin}});
   if(mutation){const body=await response.clone().json();check(response.ok&&body.ok,'MUTATION_HTTP');replies.push(body);}
   if(mutation&&first&&mode==='lost_ack'){first=false;await response.arrayBuffer();throw new TypeError('Injected reply lost after authority commit');}
   if(mutation&&first&&mode==='delayed_ack'){first=false;heldResolve();await new Promise(resolve=>release=resolve);}
   return response;
  };
  const view=s=>({status:s.status,pending:s.pending,draft:s.draft});
  client=createBoardClient({identityId:actor.body.identity.id,houseId,fetch:transport,storage:memory(),poll:false,timeoutMs:2000,onState:s=>history.push(view(s))});
  await client.connect(); check(client.getState().status==='saved','INITIAL_SAVED');
  const submitted='fixture original '+mode, newer='fixture newer '+mode;
  client.setDraft(submitted);const saving=client.sendChat();
  const pendingAtStart=view(client.getState());
  let delayedView;
  if(mode==='delayed_ack'){await held;client.setDraft(newer);delayedView=view(client.getState());release();}
  const firstOk=await saving, afterFirst=view(client.getState());
  const originalBody=posts[0].body, id=posts[0].id;
  const durable=()=>({effects:Number(app.boardStore.db.prepare('SELECT COUNT(*) AS n FROM chat WHERE house_id=? AND id=?').get(houseId,id).n), receipts:Number(app.boardStore.db.prepare('SELECT COUNT(*) AS n FROM receipts WHERE actor_id=? AND id=?').get(actor.body.identity.id,id).n), sequence:app.boardStore.snapshot(houseId).sequence});
  const beforeRetry=durable();
  const peerBefore=await api('/api/board/snapshot?houseId='+encodeURIComponent(houseId),peer);
  let queueRetained=true, queuedBodyIdentical=true, originalDraftRetained=true, retryOk=true;
  if(mode==='lost_ack'||mode==='no_commit'){
   const exported=JSON.parse(client.exportPending());
   queueRetained=exported.queue.length===1&&exported.queue[0].body.id===id;
   queuedBodyIdentical=JSON.stringify(exported.queue[0].body)===originalBody;
   originalDraftRetained=client.getState().draft===submitted;
   retryOk=await client.retry();
  }
  const final=view(client.getState()), peerAfter=await api('/api/board/snapshot?houseId='+encodeURIComponent(houseId),peer), finalDurable=durable();
  const receiptRow=app.boardStore.db.prepare('SELECT response FROM receipts WHERE actor_id=? AND id=?').get(actor.body.identity.id,id);
  const canonicalReceipt=replies.every(reply=>canonical(reply)===canonical(JSON.parse(receiptRow.response)));
  const replay=await api('/api/board/chat',actor,JSON.parse(originalBody));
  const afterReplay=durable();
  const expectBefore=mode==='no_commit'?0:1, needsRetry=mode==='lost_ack'||mode==='no_commit';
  const checks={initialPending:pendingAtStart.status==='pending'&&pendingAtStart.pending===1, firstOutcome:needsRetry?!firstOk&&afterFirst.status!=='saved'&&afterFirst.pending===1:firstOk, firstAuthorityEffect:beforeRetry.effects===expectBefore&&beforeRetry.receipts===expectBefore, peerBefore:peerBefore.chat.filter(m=>m.id===id).length===expectBefore, queueRetained, queuedBodyIdentical, originalDraftRetained, retryOk, retrySerializedPayload:needsRetry?posts.length===2&&posts[1].body===originalBody&&posts[1].id===id:posts.length===1, finalSaved:final.status==='saved'&&final.pending===0, canonicalReceipt, oneFinalDurableEffect:finalDurable.effects===1&&finalDurable.receipts===1&&finalDurable.sequence===1, peerAfter:peerAfter.chat.filter(m=>m.id===id&&m.text===submitted).length===1, replaySameReceipt:canonical(replay)===canonical(JSON.parse(receiptRow.response)), replayNoNewEffect:canonical(afterReplay)===canonical(finalDurable), composer:final.draft===(mode==='delayed_ack'?newer:''), delayedPending:mode!=='delayed_ack'||delayedView.pending===1&&delayedView.status==='pending'&&delayedView.draft===newer};
  client.close(); await app.close();closed=true;
  let reopenedDurable; const reopened=new DatabaseSync(join(dataDir,'board.sqlite'),{readOnly:true});
  try{reopenedDurable={effects:Number(reopened.prepare('SELECT COUNT(*) AS n FROM chat WHERE house_id=? AND id=?').get(houseId,id).n),receipts:Number(reopened.prepare('SELECT COUNT(*) AS n FROM receipts WHERE actor_id=? AND id=?').get(actor.body.identity.id,id).n)};}finally{reopened.close();}
  return {mode,firstOk,retryOk,finalStatus:final.status,initialPending:{status:pendingAtStart.status,pending:pendingAtStart.pending},afterFirst:{status:afterFirst.status,pending:afterFirst.pending},beforeRetry,finalDurable,afterReplay,postCount:posts.length,payloadSha256:hash(originalBody),retryPayloadSha256:posts.length===2?hash(posts[1].body):null,observedStatuses:[...new Set(history.map(s=>s.status))],observations:checks,finalState:final,expectedDraft:mode==='delayed_ack'?newer:'',delayedState:delayedView??null,peerBeforeCount:peerBefore.chat.filter(m=>m.id===id).length,peerAfterCount:peerAfter.chat.filter(m=>m.id===id&&m.text===submitted).length,retrySameId:posts.length===2?posts[1].id===id:true,reopenedDurable};
 } finally {client?.close(); if(!closed)await app.close();}
}
try {
 for(const mode of ['normal_ack','lost_ack','no_commit','delayed_ack']){const row=await runCase(mode);row.checks=declaredChecks(row);row.oracles={weak:weakOracle(row),declared:strongOracle(row)};results.cases.push(row);}
 const source=results.cases.find(row=>row.mode==='no_commit');
 const broken={...source,calibrationId:'synthetic_optimistic_saved_without_durable_effect',finalDurable:{effects:0,receipts:0,sequence:0},afterReplay:{effects:0,receipts:0,sequence:0},peerAfterCount:0,reopenedDurable:{effects:0,receipts:0},finalStatus:'saved'};
 const delayed=results.cases.find(row=>row.mode==='delayed_ack');
 const lostDraft={...delayed,calibrationId:'synthetic_saved_but_newer_draft_lost',finalState:{...delayed.finalState,draft:''},finalStatus:'saved'};
 results.calibration=[broken,lostDraft].map(row=>({mode:row.calibrationId,baseCase:row.mode,synthetic:true,trace:{finalDurable:row.finalDurable,afterReplay:row.afterReplay,peerAfterCount:row.peerAfterCount,reopenedDurable:row.reopenedDurable,finalState:row.finalState},weak:weakOracle(row),declared:strongOracle(row),violations:Object.entries(declaredChecks(row)).filter(([,ok])=>!ok).map(([key])=>key)}));
 results.pass=results.cases.every(row=>row.oracles.declared)&&results.calibration.every(row=>row.weak&&!row.declared);
} catch(error) {results.errors.push({name:error.name,message:error.message});results.pass=false;}
finally {console.log=originalLog;results.finishedAt=new Date().toISOString();results.exitCode=results.pass?0:1;writeFileSync(join(root,'results.json'),JSON.stringify(results,null,2)+'\n');originalLog(JSON.stringify({pass:results.pass,exitCode:results.exitCode,cases:results.cases.map(row=>({mode:row.mode,oracles:row.oracles,failed:Object.entries(row.checks).filter(([,ok])=>!ok).map(([key])=>key)})),calibration:results.calibration,errors:results.errors}));process.exitCode=results.exitCode;}
