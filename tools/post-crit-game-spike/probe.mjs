import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Chess} from '../../.local/post-crit/game-spike/node_modules/chess.js/dist/esm/chess.js';
import {createEngine} from './engine.mjs';
const e=createEngine(Chess), results=[], sizes=[];
const bytes=x=>Buffer.byteLength(JSON.stringify(x));
const ctx=(actor='p1', extra={})=>({actor,scope:'lounge',controller:true,now:1000,...extra});
const req=(s,action,id='command-1')=>({id,session:s.session,revision:s.revision,action});
const test=(name,fn)=>{try{fn();results.push({name,status:'PASS'});}catch(error){results.push({name,status:'FAIL',error:error.message});}};
const action=s=>s.kind==='four'?{type:'move',column:0}:s.kind==='chess'?{type:'move',move:{from:'e2',to:'e4'}}:e.legal(s,'p1').length?{type:'play',card:e.legal(s,'p1')[0],suit:'C'}:{type:'draw'};
for(const kind of ['four','chess','cards']) for(const count of [2,6]) {
 const base=e.initial(kind,count), a=action(base), r=req(base,a), label=`${kind}/${count}`;
 sizes.push({label,command:bytes(r),public:bytes(e.project(base,'watcher')),privateP1:bytes(e.project(base,'p1')),fullWithoutReceipts:bytes({...base,receipts:{}}),active:base.players.length,watchers:count-base.players.length});
 test(label+' legal move',()=>assert.equal(e.command(base,ctx(),r).ok,true));
 for(const [name,c,request,expected] of [
 ['spectator',ctx('outsider'),r,'NOT-MEMBER'],['observer',ctx('p1',{controller:false}),r,'OBSERVER'],
 ['scope',ctx('p1',{scope:'bedroom'}),r,'WRONG-SCOPE'],['session',ctx(),{...r,session:'old'},'SESSION'],
 ['stale',ctx(),{...r,revision:-1},'STALE'],['turn',ctx('p2'),r,'TURN']])
 test(label+' '+name,()=>assert.equal(e.command(base,c,request).error,expected));
 if(kind!=='cards'&&count===6) test(label+' watcher move denied',()=>assert.equal(e.command(base,ctx('p6'),r).error,'WATCHER'));
 test(label+' duplicate and changed payload',()=>{const next=e.command(base,ctx(),r).state; assert.equal(e.command(next,ctx(),r).replayed,true);assert.equal(e.command(next,ctx(),{...r,action:{type:'leave'}}).error,'ID-REUSED');assert.equal(next.revision,1);});
 test(label+' JSON restart preserves projection/receipt',()=>{const next=e.command(base,ctx(),r).state, reloaded=JSON.parse(JSON.stringify(next)); assert.deepEqual(e.project(next,'p1'),e.project(reloaded,'p1'));assert.equal(e.command(reloaded,ctx(),r).replayed,true);});
 test(label+' immediate departure and terminal',()=>{const request=req(base,{type:'leave'}),next=e.command(base,ctx('p2'),request).state;assert.equal(next.result.reason,'member-left');assert.equal(e.command(next,ctx(),req(next,a,'later')).error,'TERMINAL');});
 test(label+' illegal leaves original unchanged',()=>{const snapshot=JSON.stringify(base); const bad=kind==='four'?{type:'move',column:7}:kind==='chess'?{type:'move',move:{from:'e2',to:'e5'}}:{type:'play',card:'ZZ'}; assert.equal(e.command(base,ctx(),req(base,bad)).ok,false);assert.equal(JSON.stringify(base),snapshot);});
}
test('four horizontal win',()=>{let s=e.initial('four');for(const [n,c] of [0,0,1,1,2,2,3].entries())s=e.command(s,ctx(s.players[s.turn]),req(s,{type:'move',column:c},`win-${n}`)).state;assert.equal(s.result.winner,'p1');});
test('four full column rejection',()=>{let s=e.initial('four');for(let n=0;n<6;n++)s=e.command(s,ctx(s.players[s.turn]),req(s,{type:'move',column:0},`fill-${n}`)).state;assert.equal(e.command(s,ctx(),req(s,{type:'move',column:0})).error,'ILLEGAL');});
test('chess checkmate fixture and terminal detection',()=>{let s=e.initial('chess');for(const [n,move]of ['f3','e5','g4','Qh4#'].entries())s=e.command(s,ctx(s.players[s.turn],{now:n*1000}),req(s,{type:'move',move},`mate-${n}`)).state;assert.equal(s.result.reason,'checkmate');});
test('chess promotion choices and roundtrip repetition history',()=>{let s=e.initial('chess');s.initialFen='8/P7/8/8/8/8/7k/4K3 w - - 0 1';assert.equal(e.legal(s,'p1').filter(m=>m.from==='a7').length,4);const next=e.command(s,ctx(),req(s,{type:'move',move:{from:'a7',to:'a8',promotion:'n'}})).state;assert.equal(e.chessAt(next).get('a8').type,'n');});
test('chess clocks authoritative elapsed and timeout visible',()=>{const s=e.initial('chess');const next=e.command(s,ctx('p1',{now:180001}),req(s,action(s))).state;assert.equal(next.result.reason,'clock-expired');assert.equal(next.moves.length,0);});
for(const count of [2,6]) test(`cards/${count} actor-specific hidden projection`,()=>{const s=e.initial('cards',count);for(const actor of s.members){const view=e.project(s,actor);assert.deepEqual(view.hand,s.hands[actor]);assert.ok(!('hands'in view));assert.ok(!('deck'in view));assert.ok(!('receipts'in view));for(const other of s.players.filter(id=>id!==actor))assert.ok(s.hands[other].every(card=>!view.hand.includes(card)));}assert.deepEqual(e.project(s,'watcher').hand,[]);});
test('cards wild suit required / empty hand result',()=>{const s=e.initial('cards');s.hands.p1=['8S'];assert.equal(e.command(s,ctx(),req(s,{type:'play',card:'8S'})).error,'SUIT-REQUIRED');const next=e.command(s,ctx(),req(s,{type:'play',card:'8S',suit:'H'})).state;assert.equal(next.activeSuit,'H');assert.equal(next.result.reason,'empty-hand');});
test('cards draw remains turn / empty stock pass / blocked draw',()=>{let s=e.initial('cards');const before=s.hands.p1.length; s=e.command(s,ctx(),req(s,{type:'draw'})).state;assert.equal(s.turn,0);assert.equal(s.hands.p1.length,before+1);s.deck=[];s.top='5H';s.activeSuit='H';s.hands={p1:['2S'],p2:['3S']};for(let n=0;n<2;n++)s=e.command(s,ctx(s.players[s.turn]),req(s,{type:'pass'},`pass-${n}`)).state;assert.equal(s.result.reason,'blocked-draw');});
test('chess repetition history retained beyond FEN',()=>{let s=e.initial('chess');for(const[n,move]of ['Nf3','Nf6','Ng1','Ng8','Nf3','Nf6','Ng1','Ng8'].entries())s=e.command(s,ctx(s.players[s.turn],{now:n*1000}),req(s,{type:'move',move},`repeat-${n}`)).state;const reload=JSON.parse(JSON.stringify(s));assert.equal(e.chessAt(reload).isThreefoldRepetition(),true);assert.equal(new Chess(e.chessAt(reload).fen()).isThreefoldRepetition(),false);});
test('cards arbitrary actor input cannot select another hand',()=>{const s=e.initial('cards',6);for(const actor of s.members){const view=e.project(s,actor),serialized=JSON.stringify(view);for(const other of s.players.filter(id=>id!==actor))for(const card of s.hands[other])assert.ok(!serialized.includes(JSON.stringify(card)));for(const card of s.deck)assert.ok(!serialized.includes(JSON.stringify(card)));}const publicView=e.project(s,'watcher');assert.equal(publicView.hand.length,0);for(const card of Object.values(s.hands).flat().concat(s.deck))assert.ok(!JSON.stringify(publicView).includes(JSON.stringify(card)));});
const stateSamples=[];
for(const kind of ['four','chess','cards'])for(const count of [2,6]){
 let s=e.initial(kind,count),max={public:0,private:0,full:0,command:0},step=0;
 const observe=()=>{max.public=Math.max(max.public,bytes(e.project(s,'watcher')));max.private=Math.max(max.private,...s.players.map(id=>bytes(e.project(s,id))));max.full=Math.max(max.full,bytes(s));};observe();
 while(!s.result&&step<512){const actor=s.players[s.turn],options=e.legal(s,actor);let a;
  if(kind==='four')a={type:'move',column:options[(step*7+Math.floor(step/3))%options.length]};
  else if(kind==='chess')a={type:'move',move:options[(step*17+13)%options.length]};
  else a=options.length?{type:'play',card:options[0],suit:'H'}:s.deck.length?{type:'draw'}:{type:'pass'};
  const request=req(s,a,`sample-${step}`);max.command=Math.max(max.command,bytes(request));const result=e.command(s,ctx(actor,{now:step*500}),request);assert.ok(result.ok,`${kind}/${count} sample command ${result.error}`);s=result.state;step++;observe();
 }
 stateSamples.push({kind,count,actions:step,result:s.result,stoppingBound:512,maxBytes:max,receipts:Object.keys(s.receipts).length});
}
const dependency=await readFile('.local/post-crit/game-spike/node_modules/chess.js/dist/esm/chess.js');
const files=['engine.mjs','probe.mjs','app.mjs','index.html','style.css','server.mjs','browser.mjs','setup.mjs','chess-LICENSE.txt'];const sources={};for(const file of files){try{const content=await readFile(new URL(file,import.meta.url));sources[file]={sha256:createHash('sha256').update(content).digest('hex'),bytes:content.length,lines:content.toString().split('\n').length-1};}catch{}}
const output={at:new Date().toISOString(),runtime:process.version,scope:'pure in-memory fixture; no persistence/network/authentication acceptance',protocolSHA256:createHash('sha256').update(await readFile('docs/post-crit/evidence/game-protocol.md')).digest('hex'),sources,sizes,stateSamples,budgetObservations:stateSamples.map(sample=>({kind:sample.kind,count:sample.count,sampledCommandWithin1KiB:sample.maxBytes.command<=1024,sampledPublicWithin8KiB:sample.maxBytes.public<=8192})),productionAcceptance:'NOT RUN',chessESMBytes:dependency.length,chessESMSHA256:createHash('sha256').update(dependency).digest('hex'),results,passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').length};
await writeFile('docs/post-crit/evidence/game-probe.json',JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify({passed:output.passed,failed:output.failed,sizes,failures:results.filter(r=>r.status==='FAIL')}));if(output.failed)process.exitCode=1;
