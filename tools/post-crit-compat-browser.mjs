/**
 * Frozen 8cdad6a -> current local compatibility acceptance. Synthetic identities only.
 * Runs exact archived source and a byte-bound copy of current source on one origin.
 * node tools/post-crit-compat-browser.mjs --inspect
 * node tools/post-crit-compat-browser.mjs --run --label first
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash,randomUUID } from 'node:crypto';
import { mkdir,readFile,writeFile,cp,symlink,stat } from 'node:fs/promises';
import { resolve,join,relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const root=resolve(process.cwd()),frozenRef='8cdad6a';
const argv=process.argv.slice(2),run=argv.includes('--run'),labelAt=argv.indexOf('--label');
const label=labelAt<0?'attempt':argv[labelAt+1];
assert.ok(/^[a-z0-9-]{1,40}$/.test(label??''),'Use a short lowercase --label.');
assert.ok(argv.every((value,index)=>['--run','--inspect','--label','--grader-controls'].includes(value)||index===labelAt+1),'Unsupported argument.');
assert.ok(!(argv.includes('--inspect')&&run),'Choose --inspect or --run.');
const git=(...args)=>execFileSync('git',args,{cwd:root,maxBuffer:64*1024*1024});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const frozenCommit=git('rev-parse',frozenRef+'^{commit}').toString().trim();
const sources=['src/server.ts','src/house-store.ts','src/house-realtime.ts','src/house-contract.ts','public/house.html','public/house-ui.js','public/house-client.js','public/house-world.js','public/house-geometry.js','public/house-shell.js','public/house-camera.js','public/house-label-layout.js','public/house-room-content.js','public/house-version.js','public/house-game-ui.js','src/house-voice.ts','public/house.css','public/house-game-rules.js','public/house-game-rules.d.ts','src/store.ts','src/domain.ts','src/board-store.ts','src/board-service.ts','src/activity-log.ts','src/server-runtime.ts','package.json'];
const frozenTracked=new Set(git('ls-tree','-r','--name-only',frozenCommit).toString().trim().split('\n'));
const frozenPaths=sources.filter(path=>frozenTracked.has(path));
const sourceHashes=async directory=>Object.fromEntries(await Promise.all(sources.map(async path=>{try{return[path,hash(await readFile(join(directory,path)))];}catch{return[path,null];}})));
const frozenHashes=Object.fromEntries(frozenPaths.map(path=>[path,hash(git('show',frozenCommit+':'+path))]));
const currentHashes=await sourceHashes(root);
function assertReplay(wire,command,receipt,sentAt,ackAt){
 const sent=wire.sent.slice(sentAt).find(value=>value.commandId===command.commandId);
 assert.deepEqual(sent,command,'Native retransmission must equal the original command.');
 const acknowledged=wire.receivedAcks.slice(ackAt).find(value=>value.commandId===command.commandId);
 assert.deepEqual(acknowledged,receipt,'Native successful ACK must equal the original receipt.');
 return {command:safeCopy(sent),receipt:safeCopy(acknowledged)};
}
function safeCopy(value){return JSON.parse(JSON.stringify(value));}
if(argv.includes('--grader-controls')){
 assert.equal(run,false,'Grader controls start no browser.');
 const command={commandId:'test-command',type:'card.save',payload:{smallGoal:'Original'}},receipt={ok:true,commandId:'test-command',sequence:2,entityRevision:1};
 const wire={sent:[command,command],receivedAcks:[receipt,receipt]};
 assertReplay(wire,command,receipt,1,1);
 const terminal=safeCopy(wire);terminal.receivedAcks[1]={ok:false,code:'REVISION_CONFLICT'};assert.throws(()=>assertReplay(terminal,command,receipt,1,1));
 const missingSend=safeCopy(wire);missingSend.sent.length=1;assert.throws(()=>assertReplay(missingSend,command,receipt,1,1));
 const changed=safeCopy(wire);changed.sent[1].payload.smallGoal='Changed';assert.throws(()=>assertReplay(changed,command,receipt,1,1));
 const badReceipt=safeCopy(wire);badReceipt.receivedAcks[1].entityRevision++;assert.throws(()=>assertReplay(badReceipt,command,receipt,1,1));
 assert.throws(()=>assertReplay(wire,command,receipt,1,2));
 const delivered={owner:{'/house-ui.js':'old'}};const checkpoint=safeCopy(delivered);delivered.owner['/house-ui.js']='new';assert.equal(checkpoint.owner['/house-ui.js'],'old');
 console.log(JSON.stringify({status:'PASS',controls:7,scope:'Pure outcome-grader controls, no browser/service.',runnerSHA256:hash(await readFile(new URL(import.meta.url)))}));process.exit(0);
}
if(!run){
 console.log(JSON.stringify({status:'READY',frozenCommit,frozenHashes,currentHashes,runnerSHA256:hash(await readFile(new URL(import.meta.url))),scope:'No browser/service started. --run creates only an ignored isolated fixture and named evidence.'},null,2));
 process.exit(0);
}
const runId=new Date().toISOString().replaceAll(/[:.]/g,'-')+'-'+label;
const scratch=join(root,'.local/compat-fixture',runId),oldRoot=join(scratch,'old'),currentRoot=join(scratch,'current'),dataDir=join(scratch,'data');
const evidence=join(root,'docs/post-crit/evidence'),prefix='compat-browser-'+runId;
const output=join(evidence,prefix+'.json');
const result={kind:'Exact frozen old UI/client/world + copied current local service, same origin/data, synthetic sessions, Chromium desktop. No Fly, physical-device, human or resource acceptance.',
 runId,at:new Date().toISOString(),status:'RUNNING',manifest:{runnerSHA256:hash(await readFile(new URL(import.meta.url))),frozenCommit,frozenHashes,currentHashes,runtime:process.version},
 checks:{},events:[],pageErrors:[],screenshots:[],knownLimits:['Old unsent forms are memory-only and not all hidden multi-zone drafts are recoverable. Pending export exports queued commands, not ordinary unsent fields. Deliberate reload loses unsubmitted form memory after copying. Old roster says offline/another tab controls because players is empty; no modern update banner can be inserted into already-loaded old bytes.']};
let browser,oldApp,currentApp,closingOld,faultArmed=false,faultRecord=null;
const allTcp=new Set();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const timeout=async(promise,message,ms=12000)=>Promise.race([promise,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(new Error(message)),ms);timer.unref();})]);
const settle=page=>page.waitForFunction(()=>['Together, live','Viewing · another tab controls'].includes(document.querySelector('#connection-status')?.textContent),{timeout:20000});
const snapshot=page=>page.evaluate(()=>window.__compatProbe?.read().live);
const safeClone=value=>JSON.parse(JSON.stringify(value));
const record=(name,value=true)=>{result.checks[name]=value;};
const identical=(a,b,message)=>assert.deepEqual(a,b,message);
async function screenshot(page,name){
 const path=join(evidence,prefix+'-'+name+'.png');await page.screenshot({path,fullPage:false});
 const bytes=await readFile(path);result.screenshots.push({path:relative(root,path),sha256:hash(bytes),width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)});
}
async function listen(app,port=0){
 await new Promise((done,reject)=>{app.server.once('error',reject);app.server.listen(port,'127.0.0.1',done);});
 return app.server.address().port;
}
function rowsBefore(db){
 const tables=db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
 return tables.map(({name})=>{
  const columns=db.prepare('PRAGMA table_info("'+name+'")').all().map(c=>c.name);
  const rows=db.prepare('SELECT '+columns.map(c=>'"'+c+'"').join(',')+' FROM "'+name+'" ORDER BY rowid').all();
  return {name,columns,rows,sha256:hash(JSON.stringify(rows))};
 });
}
function proveRows(db,before){
 for(const table of before){const rows=db.prepare('SELECT '+table.columns.map(c=>'"'+c+'"').join(',')+' FROM "'+table.name+'" ORDER BY rowid').all();identical(rows,table.rows,'v1 original columns preserved for '+table.name);}
 return before.map(({name,columns,rows,sha256})=>({name,columns,count:rows.length,sha256}));
}
async function attachProbe(page,source,base){
 // Debugger observation captures the existing module-private UI client. No source
 // rewriting, replacement client, changed authentication, or fabricated state.
 const session=await page.context().newCDPSession(page);await session.send('Debugger.enable');
 const lines=source.split('\n'),line=lines.findIndex(text=>text.startsWith('function openPanel('))+1;
 assert.ok(line>0,'Locate openPanel in actual served bytes.');
 const bp=await session.send('Debugger.setBreakpointByUrl',{url:base+'/house-ui.js',lineNumber:line});
 const paused=new Promise((done,reject)=>{session.once('Debugger.paused',async event=>{try{
  const evaluated=await session.send('Debugger.evaluateOnCallFrame',{callFrameId:event.callFrames[0].callFrameId,expression:'globalThis.__compatProbe={client,read:()=>({live,roomDraft,suspendedDrafts,cardDirty,cardBase})}; undefined',returnByValue:true});
  assert.ok(!evaluated.exceptionDetails,'Debugger captured actual module bindings.');
  await session.send('Debugger.removeBreakpoint',{breakpointId:bp.breakpointId});await session.send('Debugger.resume');done();
 }catch(error){try{await session.send('Debugger.resume');}catch{}reject(error);}});});
 await Promise.all([timeout(paused,'Module debugger probe not reached'),page.locator('.toolbelt [data-panel=chat]').click()]);
 await session.detach();
 assert.ok(await page.evaluate(()=>!!window.__compatProbe?.client),'Actual UI instance captured.');
}
async function invoke(page,method,...args){
 return page.evaluate(async({method,args})=>{try{return{ok:true,value:await window.__compatProbe.client[method](...args)};}catch(error){return{ok:false,code:error.code,message:error.message};}},{method,args});
}
async function awaitZone(page,zoneId){
 await page.waitForFunction(zone=>window.__compatProbe?.read().live?.durable.zoneId===zone,zoneId,{timeout:12000});
}
async function panel(page,name){
 await page.locator('.toolbelt [data-panel="'+name+'"]').click();
 await page.waitForFunction(name=>!document.querySelector('#'+name+'-panel')?.hidden,name);
}
async function closePanel(page){if(await page.locator('#panel').isVisible())await page.locator('#panel-close').click();}
async function admit(page,kind,name,code,base){
 await page.goto(base);await page.locator('#title-'+kind).click();await page.locator('#name').fill(name);
 if(kind==='create')await page.locator('#capacity').selectOption('3');else await page.locator('#join-code').fill(code);
 await page.locator('#'+kind+'-form button[type=submit]').click();await settle(page);
}
async function waitUntil(check,message,ms=12000){
 const end=Date.now()+ms;while(Date.now()<end){if(await check())return;await sleep(40);}throw new Error(message);
}
try{
 assert.equal(process.version,'v24.21.0','Use the repository Linux runtime.');
 assert.equal(git('check-ignore','.local/compat-fixture').toString().trim(),'.local/compat-fixture','Fixture stays ignored.');
 await mkdir(oldRoot,{recursive:true});await mkdir(currentRoot,{recursive:true});await mkdir(dataDir,{recursive:true});
 const archive=join(scratch,'frozen.tar');git('archive','--format=tar','--output='+archive,frozenCommit);
 execFileSync('tar',['-xf',archive,'-C',oldRoot]);
 await cp(join(root,'src'),join(currentRoot,'src'),{recursive:true});await cp(join(root,'public'),join(currentRoot,'public'),{recursive:true});
 for(const file of ['package.json','README.md'])await cp(join(root,file),join(currentRoot,file));
 for(const directory of [oldRoot,currentRoot])await symlink(join(root,'node_modules'),join(directory,'node_modules'),'dir');
 identical(await sourceHashes(root),currentHashes,'Current source remained stable while copying.');
 identical(await sourceHashes(currentRoot),currentHashes,'Copied source equals the captured current bytes.');
 for(const path of frozenPaths)assert.equal(hash(await readFile(join(oldRoot,path))),frozenHashes[path],'Exact archived '+path);
 record('exactFrozenAndCurrentCopies',true);
 const oldModule=await import(pathToFileURL(join(oldRoot,'src/server.ts')).href),currentModule=await import(pathToFileURL(join(currentRoot,'src/server.ts')).href);
 oldApp=oldModule.createService({dataDir,secureCookies:false,activityLog:()=>{}});
 oldApp.server.on('connection',tcp=>{allTcp.add(tcp);tcp.once('close',()=>allTcp.delete(tcp));});
 const port=await listen(oldApp),base='http://127.0.0.1:'+port;result.origin=base;
 browser=await chromium.launch({headless:true,chromiumSandbox:true,executablePath:'/home/lizhi/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args:['--use-angle=swiftshader']});
 result.browser={version:browser.version(),chromiumSandbox:true,args:['--use-angle=swiftshader'],viewport:{width:1920,height:1080}};
 const ownerContext=await browser.newContext({viewport:{width:1920,height:1080},acceptDownloads:true}),guestContext=await browser.newContext({viewport:{width:1920,height:1080},acceptDownloads:true});
 const owner=await ownerContext.newPage(),guest=await guestContext.newPage();
 const loadedOld={owner:{},guest:{}},wire={owner:{sent:[],receivedAckCommandIds:[],receivedAcks:[]},guest:{sent:[],receivedAckCommandIds:[],receivedAcks:[]}};
 for(const [name,page]of[['owner',owner],['guest',guest]]){
  page.on('pageerror',error=>result.pageErrors.push({phase:'old-or-cutover',page:name,message:error.message}));
  page.on('websocket',socket=>{
   socket.on('framesent',frame=>{try{if(typeof frame.payload==='string'&&frame.payload.startsWith('42')){const packet=JSON.parse(frame.payload.slice(frame.payload.indexOf('[')));if(packet[0]==='house.command')wire[name].sent.push(safeClone(packet[1].command));}}catch{}});
   socket.on('framereceived',frame=>{try{if(typeof frame.payload==='string'&&frame.payload.startsWith('43')){const packet=JSON.parse(frame.payload.slice(frame.payload.indexOf('[')));for(const value of packet)if(value?.commandId){wire[name].receivedAckCommandIds.push(value.commandId);wire[name].receivedAcks.push(safeCopy(value));}}}catch{}});
  });
  page.on('response',async response=>{try{const path=new URL(response.url()).pathname;if(['/',...frozenPaths.filter(p=>p.startsWith('public/')).map(p=>'/'+p.slice(7))].includes(path)&&response.status()===200){loadedOld[name][path]=hash(await response.body());}}catch{}});
 }
 const oldUi=await readFile(join(oldRoot,'public/house-ui.js'),'utf8');
 await admit(owner,'create','Compat Robin','',base);
 const ownerMe=await(await owner.request.get(base+'/api/house/me')).json(),ownerId=ownerMe.identity.id,house=ownerMe.home;
 await attachProbe(owner,oldUi,base);
 assert.equal((await snapshot(owner)).controller,true,'Frozen old UI initially holds real control.');
 record('frozenUiInitialControl',true);
 const roomId=(await snapshot(owner)).durable.residents.find(r=>r.id===ownerId).bedroomId;
 await invoke(owner,'subscribe',roomId);await awaitZone(owner,roomId);await closePanel(owner);await panel(owner,'room');
 await owner.locator('#room-open').check();await owner.locator('#palette').selectOption('rose');await owner.locator('#room-form button[type=submit]').click();
 await waitUntil(()=>oldApp.houseStore.snapshot(ownerId,roomId).room.open,'Old room settings saved');
 await closePanel(owner);await invoke(owner,'subscribe','lounge');await awaitZone(owner,'lounge');
 await panel(owner,'board');await owner.locator('#small-goal').fill('Original v1 persisted goal');await owner.locator('#next-step').fill('Original next step');await owner.locator('#card-form button[type=submit]').click();
 await owner.waitForFunction(()=>document.querySelector('#card-status')?.textContent==='Your saved current card.');await closePanel(owner);
 await admit(guest,'join','Compat Finch',house.code,base);await attachProbe(guest,oldUi,base);
 const guestId=(await snapshot(guest)).durable.selfId;await invoke(guest,'subscribe',roomId);await awaitZone(guest,roomId);
 const privateText='Private compatibility marker';await guest.locator('.toolbelt [data-panel=chat]').click();await guest.locator('#chat-input').fill(privateText);await guest.locator('#quick-chat button[type=submit]').click();
 await guest.waitForFunction(text=>document.querySelector('#transcript')?.textContent.includes(text),privateText);
 // Nonempty archived v1 records complement actual two-browser resident data.
 const former=oldApp.houseStore.ensureSession();
 const administrative=(id,type,payload,expectedRevision)=>oldApp.houseStore.execute(id,{commandId:randomUUID(),type,houseId:house.id,payload,...(expectedRevision===undefined?{}:{expectedRevision})});
 administrative(former.id,'house.join',{code:house.code,name:'Former synthetic resident',colour:'sage'});
 administrative(former.id,'card.save',{smallGoal:'Archived v1 goal',nextStep:'Retained archived next step',helpRequested:false},0);
 administrative(former.id,'house.leave',{});
 assert.equal(oldApp.houseStore.db.prepare('PRAGMA user_version').get().user_version,1);
 // Same-zone unsubmitted chat remains available; a different real card submission loses its ACK.
 const draft='Copy this same-zone unsent thought before reloading.';
 await owner.locator('.toolbelt [data-panel=chat]').click();
 if(!await owner.locator('#chat-input').isVisible())await owner.locator('.toolbelt [data-panel=chat]').click();
 await owner.locator('#chat-input').fill(draft);await panel(owner,'board');
 await owner.locator('#small-goal').fill('Card committed before the deliberately lost ACK');
 await owner.locator('#next-step').fill('Keep the exact UUID and this next step');
 const execute=oldApp.houseStore.execute.bind(oldApp.houseStore);
 let rows,receiptBefore,cardBefore;
 oldApp.houseStore.execute=(id,command,...args)=>{
  const receipt=execute(id,command,...args);
  if(faultArmed&&command.type==='card.save'&&id===ownerId){
   faultArmed=false;faultRecord={kind:'Destroy only this isolated service transports and close old service synchronously after SQLite execute committed, before realtime ACK handler can return.',actorId:id,command:safeClone(command),receipt:safeClone(receipt)};
   receiptBefore=oldApp.houseStore.db.prepare('SELECT command_hash,response FROM receipts WHERE actor_id=? AND command_id=?').get(id,command.commandId);
   cardBefore=oldApp.houseStore.snapshot(id).cards.find(c=>c.id===receipt.result.cardId);
   rows=rowsBefore(oldApp.houseStore.db);
   for(const tcp of allTcp)tcp.destroy();
   closingOld=oldApp.close();
  }
  return receipt;
 };
 faultArmed=true;await owner.locator('#card-form button[type=submit]').click();
 await waitUntil(()=>faultRecord!==null,'Real command did not reach the committed fault');
 await closingOld;oldApp=null;
 record('committedAckLoss',faultRecord);
 currentApp=currentModule.createService({dataDir,secureCookies:false,activityLog:()=>{}});
 result.migration={from:1,to:currentApp.houseStore.db.prepare('PRAGMA user_version').get().user_version,originalTables:proveRows(currentApp.houseStore.db,rows)};
 assert.equal(result.migration.to,4,'Current v4 migration');
 await listen(currentApp,port);
 await owner.waitForFunction(()=>document.querySelector('#connection-status')?.textContent==='Viewing · another tab controls',{timeout:20000});
 await guest.waitForFunction(()=>document.querySelector('#connection-status')?.textContent==='Viewing · another tab controls',{timeout:20000});
 const recovered=await snapshot(owner),recoveredGuest=await snapshot(guest);
 assert.equal(recovered.controller,false);identical(recovered.players,[]);assert.equal(recovered.generation,0);assert.equal(recovered.durable.zoneId,'lounge');
 identical(recoveredGuest.players,[]);assert.equal(recoveredGuest.durable.zoneId,roomId);
 await owner.waitForFunction(()=>document.querySelectorAll('.house-avatar-name').length===0);
 await owner.waitForFunction(()=>!document.querySelector('canvas')?.dataset.selfMeshBounds);
 assert.equal(await owner.locator('canvas').getAttribute('data-self-mesh-bounds'),null,'No fabricated self mesh.');
 assert.equal(await owner.locator('#chat-input').inputValue(),draft,'Same-zone unsent chat available after cutover.');
 record('sameZoneDraftAvailable',{text:draft,copiedBeforeReload:true});
 record('legacyReadonlyNoGhosts',{controller:recovered.controller,generation:recovered.generation,players:recovered.players,avatarLabelCount:await owner.locator('.house-avatar-name').count(),oldGeometryWidth:await owner.locator('canvas').getAttribute('data-room-width')});
 const rawPending=await owner.evaluate(()=>JSON.parse(sessionStorage.getItem('house.commandOutbox.v2')||'[]'));
 const original=rawPending.find(e=>e.command.commandId===faultRecord.command.commandId);
 assert.ok(original,'Original lost-ACK command retained in real sessionStorage.');identical(original.command,faultRecord.command,'Original UUID/body retained');
 const sentOriginal=wire.owner.sent.find(command=>command.commandId===faultRecord.command.commandId);
 identical(sentOriginal,faultRecord.command,'The real browser sent this exact command body.');
 assert.equal(wire.owner.receivedAckCommandIds.includes(faultRecord.command.commandId),false,'Native WebSocket observer saw no lost receipt ACK.');
 result.checks.committedAckLoss.browserReceivedReceipt=false;result.checks.committedAckLoss.wireCommandVerified=true;
 await owner.locator('#takeover').click();
 await owner.waitForFunction(()=>document.body.textContent.includes('This older tab is read-only. Copy available drafts or export Pending before reloading.'));
 record('oldTakeoverExplainsUpdate',true);
 await screenshot(owner,'old-readonly');
 await panel(owner,'options');await owner.locator('#game-settings [data-panel=pending]').click();await owner.locator('#pending-refresh').click();
 await owner.locator('.pending-entry[data-command-id="'+faultRecord.command.commandId+'"]').waitFor();
 const downloadPromise=owner.waitForEvent('download');await owner.locator('#pending-export').click();const download=await downloadPromise;
 const exported=JSON.parse(await readFile(await download.path(),'utf8'));identical(exported.find(e=>e.commandId===faultRecord.command.commandId).command,faultRecord.command,'Native Pending export retains exact command.');
 record('originalPendingExport',{suggestedFilename:download.suggestedFilename(),entry:exported.find(e=>e.commandId===faultRecord.command.commandId),sessionCreatedAt:original.createdAt});
 // Preserve exact bytes actually delivered to old pages before creating any current page.
 await waitUntil(()=>loadedOld.owner['/house-ui.js']&&loadedOld.owner['/house-world.js']&&loadedOld.owner['/house-client.js']&&loadedOld.owner['/house-geometry.js'],'Old served sources observed');
 for(const name of ['owner','guest'])for(const asset of ['house.html','house-ui.js','house-client.js','house-world.js','house-geometry.js'])assert.equal(loadedOld[name][asset==='house.html'?'/':'/'+asset],frozenHashes['public/'+asset],'Exact frozen served '+name+' '+asset);
 result.manifest.loadedOld=safeCopy(loadedOld);
 // Current page shares the owner identity but has its own tab/controller, independent of legacy observer.
 const modern=await ownerContext.newPage();modern.on('pageerror',error=>result.pageErrors.push({phase:'current',page:'modern',message:error.message}));
 await modern.goto(base);await modern.locator('#title-continue').click();await settle(modern);
 const currentUi=await readFile(join(currentRoot,'public/house-ui.js'),'utf8');await attachProbe(modern,currentUi,base);
 const modernLive=await snapshot(modern);assert.equal(modernLive.controller,true);assert.ok(modernLive.players.some(p=>p.id===ownerId&&p.connected&&Number.isFinite(p.x)));
 assert.equal((await snapshot(owner)).controller,false,'Opening current tab never grants old tab a lease.');
 const modernChoice=await invoke(modern,'setAvailability','chat');assert.equal(modernChoice.ok,true);
 await modern.waitForFunction(()=>document.querySelector('input[name=availability][value=chat]')?.checked);
 record('currentClientControlsIndependently',{worldVersion:modernLive.worldVersion,controller:modernLive.controller,geometryWidth:await modern.locator('canvas').getAttribute('data-room-width')});
 // Door revocation clears a legacy private view, then membership revocation clears it again.
 assert.ok((await guest.locator('#transcript').textContent()).includes(privateText),'Old private view initially authorized.');
 await invoke(modern,'subscribe',roomId);await awaitZone(modern,roomId);await closePanel(modern);await panel(modern,'room');
 await modern.locator('#room-open').uncheck();await modern.locator('#room-form button[type=submit]').click();
 await awaitZone(guest,'lounge');assert.ok(!(await guest.locator('#transcript').textContent()).includes(privateText));
 record('doorRevocationClearsPrivateDOM',true);
 await modern.locator('#room-open').check();await modern.locator('#room-form button[type=submit]').click();
 await waitUntil(()=>currentApp.houseStore.snapshot(ownerId,roomId).room.open,'Door reopened before membership case');
 assert.equal((await invoke(guest,'subscribe',roomId)).ok,true);await awaitZone(guest,roomId);
 assert.ok((await guest.locator('#transcript').textContent()).includes(privateText));
 const removal=await invoke(modern,'command',{commandId:randomUUID(),type:'house.remove',houseId:house.id,payload:{memberId:guestId}});
 assert.equal(removal.ok,true);await guest.waitForFunction(()=>window.__compatProbe?.read().live===null);
 assert.ok(!(await guest.locator('#transcript').textContent()).includes(privateText));assert.equal(await guest.locator('.house-avatar-name').count(),0);
 record('memberRevocationClearsPrivateDOM',true);
 await screenshot(guest,'old-revoked');
 // Deliberate reload in the same tab retains sessionStorage, but cannot preserve unsubmitted form memory.
 const sentBeforeReload=wire.owner.sent.length,acksBeforeReload=wire.owner.receivedAcks.length;
 await owner.reload();await owner.locator('#title-continue').click();await settle(owner);
 await attachProbe(owner,currentUi,base);
 assert.equal(await owner.locator('#chat-input').inputValue(),'','Unsubmitted chat was copied; reload clears its in-memory form.');
 if((await snapshot(owner)).controller!==true){await owner.locator('#takeover').click();await owner.waitForFunction(()=>window.__compatProbe.read().live?.controller===true);}
 await waitUntil(async()=>!(await owner.evaluate(()=>JSON.parse(sessionStorage.getItem('house.commandOutbox.v2')||'[]'))).some(e=>e.command.commandId===faultRecord.command.commandId),'Current compatible client did not resolve original pending receipt');
 await waitUntil(()=>wire.owner.receivedAcks.slice(acksBeforeReload).some(value=>value.commandId===faultRecord.command.commandId),'No correlated successful receipt ACK after current reload');
 const replayProof=assertReplay(wire.owner,faultRecord.command,faultRecord.receipt,sentBeforeReload,acksBeforeReload);
 await waitUntil(()=>loadedOld.owner['/house-ui.js']===currentHashes['public/house-ui.js'],'Current reload delivery observed');
 for(const asset of ['house.html','house-ui.js','house-client.js','house-world.js','house-geometry.js'])assert.equal(loadedOld.owner[asset==='house.html'?'/':'/'+asset],currentHashes['public/'+asset],'Exact current reloaded '+asset);
 result.manifest.loadedCurrentReload=safeCopy(loadedOld.owner);
 const receiptAfter=currentApp.houseStore.db.prepare('SELECT command_hash,response FROM receipts WHERE actor_id=? AND command_id=?').get(ownerId,faultRecord.command.commandId);
 identical(receiptAfter,receiptBefore,'Exact old receipt retained and returned, not another application.');
 const cardAfter=currentApp.houseStore.snapshot(ownerId).cards.find(c=>c.id===cardBefore.id);identical(cardAfter,cardBefore,'Reload retry did not increment card revision or mutate content.');
 record('manualReloadResolvesOriginalReceipt',{commandId:faultRecord.command.commandId,receipt:faultRecord.receipt,cardRevision:cardAfter.revision,pendingCleared:true,nativeReplay:replayProof,unsentChatLostOnDeliberateReload:true});
 await screenshot(owner,'current-recovered');
 assert.equal(result.pageErrors.length,0,'No browser JavaScript errors.');
 result.status='PASS';
 await ownerContext.close();await guestContext.close();
}catch(error){result.status='FAIL';result.error={name:error.name,message:error.message,stack:error.stack};process.exitCode=1;
}finally{
 try{await browser?.close();}catch(error){result.cleanupError=String(error);process.exitCode=1;}
 try{if(oldApp)await oldApp.close();await closingOld;await currentApp?.close();}catch(error){result.cleanupError=String(error);process.exitCode=1;}
 if(result.cleanupError)result.status='FAIL';
 result.completedAt=new Date().toISOString();result.scratch=relative(root,scratch);result.fixtureDataRetainedIgnored=true;
 result.sourceChangedAfterSnapshot=JSON.stringify(await sourceHashes(root))!==JSON.stringify(currentHashes);
 await mkdir(evidence,{recursive:true});await writeFile(output,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({status:result.status,result:relative(root,output),checks:Object.keys(result.checks),error:result.error?.message,cleanupError:result.cleanupError}));
}
