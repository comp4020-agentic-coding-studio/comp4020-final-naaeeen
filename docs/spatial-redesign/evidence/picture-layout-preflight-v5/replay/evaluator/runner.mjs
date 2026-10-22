import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join,relative} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {JSDOM} from 'jsdom';
import {chromium,expect} from '@playwright/test';
import {layoutDecision,boxPass,assertCleanup,calibrate} from './guards.mjs';
import {verifyRecoveryAndStart} from './recovery-tasks.mjs';

const root=resolve('.'),base=join(root,'.local/picture-layout-preflight-v5');
const evidence=join(root,'docs/spatial-redesign/evidence/picture-layout-preflight-v5');
const protocolPath=join(evidence,'protocol.json'),protocolBytes=await readFile(protocolPath),protocol=JSON.parse(protocolBytes);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const args=process.argv.slice(2),option=name=>args.includes(name)?args[args.indexOf(name)+1]:undefined;
const files=['house-puzzle-ui.js','house.css','house.html','house-ui.js','house-puzzle-content.js','assets/pictures/rainy-nook-v1.svg'];
const support=['runner.mjs','fixture.mjs','guards.mjs','recovery-tasks.mjs','placement-block-guard.mjs'];
const historical=JSON.parse(await readFile(join(root,'docs/spatial-redesign/evidence/six-browser/run-current-seats-first/result.json'))).sourceSHA256;
const oldPreimages={'house-puzzle-ui.js':'docs/spatial-redesign/evidence/picture-phone-six-before-house-puzzle-ui.js','house.css':'docs/spatial-redesign/evidence/picture-phone-six-before-house.css'};
const require=createRequire(import.meta.url);
await mkdir(base,{recursive:true});await mkdir(evidence,{recursive:true});
execFileSync('git',['check-ignore','--quiet',relative(root,base)],{cwd:root});
async function capture(variant){
  const directory=join(base,'sources',variant);await mkdir(directory,{recursive:true});
  for(const file of files){
    const source=variant==='old'&&oldPreimages[file]?oldPreimages[file]:join('public',file);
    const bytes=variant==='old'&&file==='house-ui.js'?execFileSync('git',['show','fbdc853:public/house-ui.js'],{cwd:root}):await readFile(join(root,source));
    if(variant==='old')assert.equal(hash(bytes),historical[join('public',file)],'Old bytes must match the actual failed six attempt: '+file);
    const target=join(directory,'public',file);await mkdir(resolve(target,'..'),{recursive:true});
    try{await writeFile(target,bytes,{flag:'wx'});}catch(error){if(error.code!=='EEXIST')throw error;assert.equal(hash(await readFile(target)),hash(bytes),'Captured sources are immutable: '+target);}
  }
}
async function manifest(){
  const map={};
  for(const variant of ['old','new'])for(const file of files){const path=join(base,'sources',variant,'public',file);map[relative(root,path)]=hash(await readFile(path));}
  for(const file of files){const path=join(root,'public',file);map[relative(root,path)]=hash(await readFile(path));}
  for(const file of support){const path=join(base,file);map[relative(root,path)]=hash(await readFile(path));}
  return map;
}
if(args.includes('--prepare-old')){await capture('old');console.log(JSON.stringify({status:'OLD_CAPTURED',browserStarted:false,historicalSourcesMatch:true},null,2));process.exit(0);}
if(args.includes('--calibrate')){console.log(JSON.stringify({status:'PASS',checks:calibrate(),scope:'Pure guard controls; no browser or network'},null,2));process.exit(0);}
if(args.includes('--bind')){
  await capture('new');const map=await manifest();
  for(const file of files.filter(file=>!['house-puzzle-ui.js','house.css','house-ui.js'].includes(file)))assert.equal(map[relative(root,join(base,'sources/old/public',file))],map[relative(root,join(base,'sources/new/public',file))],'Only the declared component/CSS and capacity-badge input may change: '+file);
  const packet={status:'READY_HELD',browserStarted:false,protocolSHA256:hash(protocolBytes),runnerSHA256:hash(await readFile(new URL(import.meta.url))),sourceManifestSHA256:hash(JSON.stringify(map)),files:map};
  await writeFile(join(evidence,'source-binding.json'),JSON.stringify(packet,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(packet,null,2));process.exit(0);
}
const runnerSHA256=hash(await readFile(new URL(import.meta.url))),protocolSHA256=hash(protocolBytes);
if(!args.includes('--run')){console.log(JSON.stringify({status:'PREPARED_HELD',browserStarted:false,runnerSHA256,protocolSHA256,required:'Source freeze, --bind, review, separate GO; then --run --label FRESH --protocol SHA --freeze SHA --runner SHA'},null,2));process.exit(0);}
const sourceBefore=await manifest(),sourceManifestSHA256=hash(JSON.stringify(sourceBefore));
const bound=JSON.parse(await readFile(join(evidence,'source-binding.json')));
assert.equal(option('--protocol'),protocolSHA256);assert.equal(option('--freeze'),sourceManifestSHA256);assert.equal(option('--runner'),runnerSHA256);
assert.equal(bound.protocolSHA256,protocolSHA256);assert.equal(bound.sourceManifestSHA256,sourceManifestSHA256);assert.equal(bound.runnerSHA256,runnerSHA256);
for(const file of files)assert.equal(sourceBefore[join('public',file)],sourceBefore[relative(root,join(base,'sources/new/public',file))],'Live source must still match captured repaired bytes: '+file);
const label=option('--label');assert.match(label||'',/^[a-z0-9-]{1,40}$/);
const out=join(base,'run-'+label);await mkdir(out,{recursive:false});
const result={status:'RUNNING',label,scope:protocol.scope,startedAt:new Date().toISOString(),protocolSHA256,runnerSHA256,sourceManifestSHA256,sourceBefore,
  cases:[],unexpectedRequests:[],pageErrors:[],cleanup:{contexts:[],errors:[],browserDisconnected:false,remainingContexts:null}};
let browser,currentContext,currentCase,deadlineExceeded=false;
const persist=()=>writeFile(join(out,'raw-result.json'),JSON.stringify(result,null,2)+'\n');
const deadline=setTimeout(()=>{deadlineExceeded=true;void browser?.close();},protocol.fixed.taskDeadlineMs);
const started=performance.now();
try{
  browser=await chromium.launch({headless:true,chromiumSandbox:true,executablePath:'/home/lizhi/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args:['--use-angle=swiftshader']});
  result.runtime={node:process.version,playwright:require('@playwright/test/package.json').version,chromium:browser.version(),chromiumSandbox:true,angle:'swiftshader'};
  assert.equal(result.runtime.playwright,protocol.fixed.browser.playwright);
  for(const viewport of protocol.fixed.viewports)for(const variant of ['old','new']){
    assert.ok(!deadlineExceeded&&performance.now()-started<protocol.fixed.taskDeadlineMs);
    currentCase={variant,viewport,startedAt:new Date().toISOString(),status:'RUNNING',checks:[],screenshots:[],surfaces:[]};result.cases.push(currentCase);
    currentContext=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},hasTouch:viewport.hasTouch,isMobile:viewport.isMobile,deviceScaleFactor:1});
    const owned={case:variant+'-'+viewport.name,closeEvent:false,closed:false,stillPresent:true};result.cleanup.contexts.push(owned);
    currentContext.once('close',()=>owned.closeEvent=true);
    await currentContext.route('**/*',route=>respond(route,variant));
    const page=await currentContext.newPage();page.on('pageerror',error=>result.pageErrors.push({case:owned.case,message:error.message}));
    await page.goto('http://picture-layout.invalid/'+variant+'/index.html',{waitUntil:'load',timeout:10000});
    await page.waitForFunction(()=>window.fixture?.ready===true,null,{timeout:5000});
    await page.locator('[data-puzzle-board]').waitFor();
    await page.evaluate(()=>Promise.all([...document.images].map(image=>image.decode().catch(()=>{}))));
    await screenshot(page,variant+'-'+viewport.name+'-joined');
    const first=await observe(page,'joined');currentCase.surfaces.push(first);
    currentCase.initialLayout=layoutDecision(first);
    if(variant==='new')assert.ok(currentCase.initialLayout.pass,'New initial layout: '+currentCase.initialLayout.failures.join(', '));
    if(variant==='new'&&viewport.name==='portrait')currentCase.nativePartialOverlay=await partialOverlayPrelude(page);
    const firstIds=first.pieces.map(piece=>piece.id);
    await page.locator('[data-puzzle-action="next"]').click({timeout:3000});
    await expect(page.locator('[data-puzzle-page]')).toHaveText('Page 2 of 2',{timeout:2000});
    const second=await observe(page,'second-page');currentCase.surfaces.push(second);currentCase.secondPageLayout=layoutDecision(second);
    assert.equal(second.pieces.length,12);assert.equal(new Set([...firstIds,...second.pieces.map(piece=>piece.id)]).size,24);
    if(variant==='new')assert.ok(currentCase.secondPageLayout.pass,'New second page: '+currentCase.secondPageLayout.failures.join(', '));
    await page.locator('[data-puzzle-action="previous"]').click({timeout:3000});
    await expect(page.locator('[data-puzzle-page]')).toHaveText('Page 1 of 2');
    currentCase.checks.push('native paging preserves 24 stable piece slots and two disjoint pages of twelve');
    currentCase.nameMechanism=variant==='new'?'native-details':'inline-roster';
    if(variant==='new'){
      const menu=page.locator('[data-puzzle-menu]');
      currentCase.disclosurePresent=await menu.count()===1;
      assert.equal(currentCase.disclosurePresent,true);
      const summary=page.locator('[data-puzzle-menu-summary]');await summary.focus();await summary.press('Enter');
      await expect(menu).toHaveAttribute('open','');
      const players=page.locator('[data-puzzle-players] li[data-puzzle-player-id]');assert.equal(await players.count(),6);
      for(let index=0;index<6;index++){
        const player=page.locator('[data-puzzle-player-id="fixture-player-'+(index+1)+'"]');
        await expect(player).toHaveText(protocol.fixed.names[index]+(index===5?' · you':''));await player.scrollIntoViewIfNeeded();
        assert.equal(boxPass(await oneBox(player)),true,'Native disclosure exposes complete name '+index);
      }
      for(const action of ['return','start','close-menu']){const control=page.locator('[data-puzzle-action="'+action+'"]');await control.scrollIntoViewIfNeeded();assert.equal(boxPass(await oneBox(control),true),true,'Disclosure secondary target '+action);}
      await screenshot(page,variant+'-'+viewport.name+'-players');
      await page.locator('[data-puzzle-action="close-menu"]').click();await expect(menu).not.toHaveAttribute('open','');
      currentCase.checks.push('native details keyboard toggle, six exact full names reachable, Return/Replace/Close targets44px');
      // Opening a disclosure may scroll its ancestors. Return to the same unscrolled
      // primary view before evaluating the restored component.
      await page.evaluate(()=>{document.querySelector('#panel').scrollTop=0;});
      assert.ok(layoutDecision(await observe(page,'closed-disclosure')).pass);
    }else{
      // The baseline supplies the same outcomes inline. It is never required to
      // implement the candidate's details/summary/player-list/Close mechanism.
      const roster=page.locator('[data-puzzle-roster]');
      for(const name of protocol.fixed.names)await expect(roster).toContainText(name);
      await roster.scrollIntoViewIfNeeded();currentCase.inlineRoster={box:await oneBox(roster)};currentCase.inlineRoster.pass=boxPass(currentCase.inlineRoster.box);
      currentCase.secondaryTargets={};
      for(const action of ['return','start']){const control=page.locator('[data-puzzle-action="'+action+'"]');await control.scrollIntoViewIfNeeded();const box=await oneBox(control);currentCase.secondaryTargets[action]={box,pass:boxPass(box,true)};}
      currentCase.checks.push('same six full names and existing inline Return/Replace found; baseline geometry outcomes recorded without stopping candidate');
      await page.evaluate(()=>{document.querySelector('#panel').scrollTop=0;});
    }
    await page.locator('[data-puzzle-action="reference"]').click({timeout:3000});
    await expect(page.locator('[data-puzzle-reference]')).toBeVisible();
    await expect(page.locator('[data-puzzle-reference-image]')).toHaveJSProperty('naturalWidth',600);
    await page.locator('[data-puzzle-action="close-reference"]').press('Escape');
    await expect(page.locator('[data-puzzle-reference]')).toBeHidden();
    await expect(page.locator('[data-puzzle-action="reference"]')).toBeFocused();
    await page.locator('[data-puzzle-action="chat"]').click();
    assert.equal(await page.evaluate(()=>window.fixture.events.filter(e=>e.event==='onChat').length),1);
    currentCase.checks.push('native Reference image, Escape/focus return, Chat callback');
    const pair=await page.evaluate(()=>{const items=[...document.querySelectorAll('[data-puzzle-piece]:not([hidden])')],index=items.findIndex((item,index)=>!item.classList.contains('placed')&&items[index+1]&&!items[index+1].classList.contains('placed'));return index<0?null:[items[index].dataset.puzzlePiece,items[index+1].dataset.puzzlePiece];});
    assert.ok(pair,'Fixture supplies adjacent unplaced pieces for native ArrowRight selection');
    const loose=page.locator('[data-puzzle-piece="'+pair[0]+'"]');
    await loose.focus();await loose.press('ArrowRight');
    const selectedId=await page.evaluate(()=>document.activeElement.dataset.puzzlePiece);assert.equal(selectedId,pair[1]);
    await page.keyboard.press('Enter');await expect(page.locator('[data-puzzle-piece="'+selectedId+'"]')).toHaveAttribute('aria-pressed','true');
    const target=await page.evaluate(id=>window.fixture.art.pieces.find(piece=>piece.id===id).destination,selectedId);
    const cell=page.locator('[data-puzzle-destination="'+(target-1)+'"]');await cell.focus();await cell.press('ArrowRight');
    await expect(page.locator('[data-puzzle-destination="'+target+'"]')).toBeFocused();await page.keyboard.press('Enter');
    await page.waitForFunction(()=>window.fixture.events.some(e=>e.event==='send'&&e.type==='puzzle.place'));
    const command=await page.evaluate(()=>window.fixture.events.find(e=>e.event==='send'&&e.type==='puzzle.place'));
    assert.equal(command.payload.pieceId,selectedId);assert.equal(command.payload.destination,target);assert.equal(command.payload.participationId,'fixture-consent-8');
    currentCase.checks.push('native tray/board ArrowRight and Enter invoke actual component placement payload; no persistence claim');
    await page.locator('[data-puzzle-action="leave"]').click();
    await page.waitForFunction(()=>window.fixture.events.some(e=>e.event==='intent'&&e.mode==='leave'));
    assert.equal(await page.evaluate(()=>window.fixture.events.filter(e=>e.event==='onLeave').length),1,'Native Leave invokes the actual onLeave callback');
    await page.evaluate(()=>window.fixture.project(false));
    await expect(page.locator('[data-puzzle-roster]')).toContainText('watching');
    const watch=await observe(page,'watching');currentCase.surfaces.push(watch);currentCase.watchingLayout=layoutDecision(watch,'join');
    if(variant==='new')assert.ok(currentCase.watchingLayout.pass,'Watching Join layout');
    await page.locator('[data-puzzle-action="join"]').click();await page.waitForFunction(()=>window.fixture.events.some(e=>e.event==='intent'&&e.mode==='join'));
    await expect(page.locator('[data-puzzle-roster]')).toContainText('watching');
    await page.evaluate(()=>window.fixture.project(true));await expect(page.locator('[data-puzzle-roster]')).toContainText('joined');
    currentCase.checks.push('native Leave/Join intent callbacks; ACK alone cannot enroll; synthetic accepted roster projection changes state');
    if(variant==='new'){const summary=page.locator('[data-puzzle-menu-summary]');await summary.focus();await summary.press('Enter');}
    await page.locator('[data-puzzle-action="return"]').click();
    assert.equal(await page.evaluate(()=>window.fixture.events.filter(e=>e.event==='onReturn').length),1);
    currentCase.checks.push('Return outcome invokes existing callback from each pattern’s own location');
    if(variant==='new')currentCase.recoveryChecks=await verifyRecoveryAndStart(page,{oneBox,boxPass,screenshot:name=>screenshot(page,variant+'-'+viewport.name+'-'+name)});
    const baselineGeometryPass=currentCase.initialLayout.pass&&currentCase.secondPageLayout.pass&&currentCase.watchingLayout.pass&&currentCase.inlineRoster?.pass&&Object.values(currentCase.secondaryTargets||{}).every(target=>target.pass);
    currentCase.status=variant==='new'?'PASS':baselineGeometryPass?'BASELINE_PASS':'BASELINE_LAYOUT_FAIL';
    await page.evaluate(()=>window.fixture.dispose());
    await closeContext(currentContext,owned);currentContext=null;await persist();
  }
  const oldPortrait=result.cases.find(c=>c.variant==='old'&&c.viewport.name==='portrait');
  assert.ok(oldPortrait.initialLayout.failures.some(name=>name==='tray'||name==='action-previous'||name==='action-next'),'Old portrait must reproduce captured tray/paging regression');
  assert.equal(result.unexpectedRequests.length,0);assert.equal(result.pageErrors.length,0);
  result.status='PASS_COMPONENT_LAYOUT_VISUAL_REVIEW_PENDING';
}catch(error){
  result.status=deadlineExceeded?'FAIL_DEADLINE':'FAIL';result.failure={message:error.message,stack:error.stack};
  if(currentCase){currentCase.status='FAIL';try{const page=currentContext?.pages()[0];if(page){currentCase.surfaces.push(await observe(page,'failure'));await screenshot(page,currentCase.variant+'-'+currentCase.viewport.name+'-failure');}}catch(captureError){result.failure.captureError=captureError.message;}}
}finally{
  clearTimeout(deadline);
  for(const [index,context] of (browser?.contexts()||[]).entries()){
    const owned=result.cleanup.contexts.find(item=>item.stillPresent);
    try{await closeContext(context,owned);}catch(error){result.cleanup.errors.push({kind:'context-close',index,message:error.message});}
  }
  try{await browser?.close();result.cleanup.browserDisconnected=Boolean(browser&&!browser.isConnected());}catch(error){result.cleanup.errors.push({kind:'browser-close',message:error.message});}
  result.cleanup.remainingContexts=browser?.contexts().length??0;
  result.durationMs=performance.now()-started;result.finishedAt=new Date().toISOString();
  try{const sourceAfter=await manifest();result.sourceUnchanged=JSON.stringify(sourceAfter)===JSON.stringify(sourceBefore);result.sourceAfter=sourceAfter;}
  catch(error){result.sourceUnchanged=false;result.sourceBindingError=error.message;}
  try{assertCleanup(result.cleanup,result.cases.length);}catch(error){result.status='FAIL_CLEANUP';result.cleanup.failure=error.message;}
  if(!result.sourceUnchanged)result.status='INVALID_SOURCE_CHANGED';
  await persist();
  const safe={status:result.status,label,scope:result.scope,startedAt:result.startedAt,finishedAt:result.finishedAt,durationMs:result.durationMs,
    protocolSHA256,runnerSHA256,sourceManifestSHA256,sourceUnchanged:result.sourceUnchanged,runtime:result.runtime,
    cases:result.cases.map(c=>({variant:c.variant,viewport:c.viewport,status:c.status,initialLayout:c.initialLayout,secondPageLayout:c.secondPageLayout,watchingLayout:c.watchingLayout,nameMechanism:c.nameMechanism,disclosurePresent:c.disclosurePresent,inlineRoster:c.inlineRoster,secondaryTargets:c.secondaryTargets,nativePartialOverlay:c.nativePartialOverlay,recoveryChecks:c.recoveryChecks,checks:c.checks,screenshots:c.screenshots})),
    failure:result.failure?{message:result.failure.message}:null,cleanup:result.cleanup,rawDirectory:relative(root,out),nativePixelReview:'NOT_RUN',approvedPNGBytesCopied:false};
  await writeFile(join(evidence,'result-'+label+'.json'),JSON.stringify(safe,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(safe,null,2));
}
process.exitCode=result.status==='PASS_COMPONENT_LAYOUT_VISUAL_REVIEW_PENDING'?0:1;

async function closeContext(context,owned){
  let timer;try{await Promise.race([context.close(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Context close exceeded10000ms')),10000);})]);}finally{clearTimeout(timer);}
  if(owned){owned.closed=true;owned.stillPresent=browser.contexts().includes(context);}
}
async function screenshot(page,name){const path=join(out,name+'.png');await page.screenshot({path,fullPage:false,animations:'disabled'});currentCase.screenshots.push({path:relative(root,path),sha256:hash(await readFile(path)),published:false});}
async function partialOverlayPrelude(page){
  const before=await observe(page,'native-partial-prelude-before');assert.equal(layoutDecision(before).pass,true);
  await page.evaluate(()=>{const r=document.querySelector('[data-puzzle-destination="7"]').getBoundingClientRect(),overlay=document.createElement('div');overlay.className='diagnostic-partial-occluder';Object.assign(overlay.style,{position:'fixed',left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',zIndex:'999999',backgroundColor:'rgb(0, 0, 0)',opacity:'1',pointerEvents:'auto'});document.body.append(overlay);});
  let blocked;
  try{blocked=await observe(page,'native-partial-prelude-blocked');
    assert.equal(blocked.board.hitExposed,true,'The five interior container samples remain unoccluded');
    assert.deepEqual(blocked.cells.filter(cell=>!cell.hitExposed).map(cell=>cell.id),['7'],'Only actual target7 is obstructed');
    assert.deepEqual(layoutDecision(blocked).failures,['cell-7'],'Unchanged actual target checks must reject the partial opaque obstruction');
    await screenshot(page,'new-portrait-native-partial-negative');
  }finally{await page.evaluate(()=>document.querySelector('.diagnostic-partial-occluder')?.remove());}
  const restored=await observe(page,'native-partial-prelude-restored');assert.equal(layoutDecision(restored).pass,true);
  assert.deepEqual(restored.board,before.board);assert.deepEqual(restored.cells,before.cells,'Removal restores actual target hits/bounds');
  currentCase.surfaces.push(before,blocked,restored);
  return {status:'PASS_NATIVE_CONTROL',blockedTarget:7,containerPointsUnaffected:true,negativeDecision:layoutDecision(blocked),restoredDecision:layoutDecision(restored)};
}
async function respond(route,variant){
  const url=new URL(route.request().url()),prefix='/'+variant;
  if(url.origin!=='http://picture-layout.invalid'){result.unexpectedRequests.push({origin:url.origin,pathSHA256:hash(url.pathname)});return route.abort('blockedbyclient');}
  if(url.pathname===prefix+'/index.html')return route.fulfill({status:200,contentType:'text/html',body:await html(variant)});
  if(url.pathname===prefix+'/fixture.mjs')return route.fulfill({status:200,contentType:'text/javascript',body:await readFile(join(base,'fixture.mjs'))});
  const file=url.pathname.startsWith(prefix+'/public/')?url.pathname.slice((prefix+'/public/').length):url.pathname==='/assets/pictures/rainy-nook-v1.svg'?'assets/pictures/rainy-nook-v1.svg':null;
  if(file&&files.includes(file))return route.fulfill({status:200,contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'text/plain',body:await readFile(join(base,'sources',variant,'public',file))});
  if(url.pathname==='/favicon.ico')return route.fulfill({status:204,body:''});
  result.unexpectedRequests.push({origin:url.origin,pathSHA256:hash(url.pathname)});return route.abort('blockedbyclient');
}
async function html(variant){
  const dom=new JSDOM(await readFile(join(base,'sources',variant,'public/house.html'),'utf8'));
  const doc=dom.window.document,panel=doc.querySelector('#panel');panel.hidden=false;panel.dataset.tool='game';panel.dataset.breakActivity='picture';panel.setAttribute('aria-modal','false');
  doc.querySelector('#game-panel').hidden=false;doc.querySelector('#picture-game-panel').hidden=false;doc.querySelector('#four-game-panel').hidden=true;
  doc.querySelector('#panel-title').textContent='Break table';doc.querySelector('#panel-close').textContent='Look around';doc.querySelector('#panel-close').setAttribute('aria-label','Look around while seated');
  doc.querySelector('#game-panel-stand').hidden=false;doc.querySelector('#break-four-count').textContent='0 / 2 active';
  const output='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Synthetic picture component layout</title><link rel="stylesheet" href="./public/house.css"></head><body data-screen="game" data-break-activity="picture">'+doc.querySelector('#modal-backdrop').outerHTML+panel.outerHTML+'<script id="fixture-settings" type="application/json">'+JSON.stringify({names:protocol.fixed.names})+'</script><script type="module" src="./fixture.mjs"></script></body></html>';
  dom.window.close();return output;
}
async function oneBox(locator){return locator.evaluate(boxInPage);}
function boxInPage(element){
  const rect=element.getBoundingClientRect(),clips=[];let visible=true;
  for(let parent=element;parent;parent=parent.parentElement){const style=getComputedStyle(parent);if(style.display==='none'||style.visibility!=='visible'||parent.hidden)visible=false;
    if(parent!==element&&/(hidden|clip|scroll|auto)/.test(style.overflowX+' '+style.overflowY)){
      const r=parent.getBoundingClientRect(),left=r.left+parent.clientLeft,top=r.top+parent.clientTop;
      if(rect.left<left-.5||rect.right>left+parent.clientWidth+.5||rect.top<top-.5||rect.bottom>top+parent.clientHeight+.5)clips.push(parent.id||parent.className||parent.tagName);
    }
  }
  const inViewport=rect.left>=-.5&&rect.top>=-.5&&rect.right<=innerWidth+.5&&rect.bottom<=innerHeight+.5;
  const inset=Math.min(3,rect.width/4,rect.height/4);let points=[[rect.left+rect.width/2,rect.top+rect.height/2],[rect.left+inset,rect.top+inset],[rect.right-inset,rect.top+inset],[rect.left+inset,rect.bottom-inset],[rect.right-inset,rect.bottom-inset]],hitSampleScheme='unchanged-center-and3px-corners';
  if(element.matches('[data-puzzle-board]')){
    hitSampleScheme='board-center-and-four-corner-cell-content-centers';
    points=[[rect.left+rect.width/2,rect.top+rect.height/2],...[0,5,18,23].map(destination=>{const cell=element.querySelector('[data-puzzle-destination="'+destination+'"]');if(!cell)return null;const r=cell.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2];}).filter(Boolean)];
  }
  const hitExposed=visible&&inViewport&&points.length===5&&points.every(([x,y])=>{const hit=document.elementFromPoint(x,y);return hit===element||element.contains(hit);});
  return {id:element.dataset.puzzlePiece??element.dataset.puzzleDestination??element.id??null,x:rect.left,y:rect.top,width:rect.width,height:rect.height,right:rect.right,bottom:rect.bottom,visible,inViewport,clips,hitExposed,hitSampleScheme,hitSamples:points.map(([x,y])=>({x,y,ownOrDescendant:(()=>{const hit=document.elementFromPoint(x,y);return hit===element||element.contains(hit);})()}))};
}
async function observe(page,name){
  const source=boxInPage.toString();
  return page.evaluate(({source,name})=>{const measure=(0,eval)('('+source+')'),one=selector=>{const element=document.querySelector(selector);return element?measure(element):null;};
    return {name,viewport:{width:innerWidth,height:innerHeight},board:one('[data-puzzle-board]'),tray:one('[data-puzzle-tray]'),
      cells:[...document.querySelectorAll('[data-puzzle-destination]')].map(measure),pieces:[...document.querySelectorAll('[data-puzzle-piece]:not([hidden])')].map(measure),
      actions:Object.fromEntries(['previous','next','reference','chat','join','leave'].map(action=>[action,one('[data-puzzle-action="'+action+'"]')])),
      wrapper:Object.fromEntries(['panel-close','game-panel-stand','break-picture','break-four'].map(id=>[id,one('#'+id)])),menuSummary:one('[data-puzzle-menu-summary]'),
      horizontalOverflow:document.documentElement.scrollWidth>innerWidth+.5};
  },{source,name});
}
