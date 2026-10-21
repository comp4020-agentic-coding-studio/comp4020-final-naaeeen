import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';
const evidence='docs/post-crit/evidence', local='.local/post-crit/game-spike',origin='http://127.0.0.1:4197';
const runs=[], errors=[];let browser,server;
const sources={};for(const file of ['engine.mjs','app.mjs','index.html','style.css','server.mjs','browser.mjs'])sources[file]=createHash('sha256').update(await readFile(new URL(file,import.meta.url))).digest('hex');
const artifact={at:new Date().toISOString(),runtime:process.version,status:'RUNNING',scope:'scripted Chromium localhost DOM shell; no physical phone/human/multiplayer acceptance',sources,protocolSHA256:createHash('sha256').update(await readFile(evidence+'/game-refinement-protocol.md')).digest('hex'),launch:{executablePath:'/home/lizhi/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',chromiumSandbox:true,args:['--use-angle=swiftshader'],headless:true},runs,errors};
try {
 await mkdir(local+'/screenshots-refined',{recursive:true});
 // Fail rather than reuse an unrelated listener.
 try{await fetch(origin);throw Error('PORT-ALREADY-IN-USE');}catch(error){if(error.message==='PORT-ALREADY-IN-USE')throw error;}
 server=spawn(process.execPath,['tools/post-crit-game-spike/server.mjs'],{stdio:['ignore','pipe','pipe']});
 let ready=false;for(let attempt=0;attempt<60;attempt++){if(server.exitCode!==null)throw Error('SERVER-EXIT');try{const r=await fetch(origin);ready=r.ok;if(ready)break;}catch{}await new Promise(resolve=>setTimeout(resolve,50));}assert.ok(ready,'server ready');
 // No --no-sandbox or host-policy changes. Unsupported launch is an infrastructure result.
 browser=await chromium.launch({headless:true,chromiumSandbox:true,executablePath:'/home/lizhi/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args:['--use-angle=swiftshader']});artifact.browser=browser.version();
 for(const viewport of [{width:390,height:844},{width:1920,height:1080}]) for(const count of [2,6]) for(const kind of ['four','chess','cards']) {
  const run={kind,count,viewport,status:'RUNNING'};runs.push(run);const context=await browser.newContext({viewport,isMobile:viewport.width===390,hasTouch:viewport.width===390});const page=await context.newPage(),consoleErrors=[];page.on('pageerror',e=>consoleErrors.push(e.message));
  try{
   await page.goto(`${origin}/?kind=${kind}&count=${count}`);await page.waitForFunction(()=>window.spike);
   run.actualViewport=await page.evaluate(()=>({width:innerWidth,height:innerHeight,dpr:devicePixelRatio,visualWidth:visualViewport.width,visualHeight:visualViewport.height}));assert.equal(run.actualViewport.width,viewport.width);assert.equal(run.actualViewport.height,viewport.height);
   assert.equal((await page.evaluate(()=>spike.snapshot())).joined,false);
   await page.locator('#join').click();
   run.targets=await page.locator('[data-target]').evaluateAll(elements=>elements.map(el=>{const r=el.getBoundingClientRect();return{target:el.dataset.target,width:r.width,height:r.height,x:r.x,y:r.y,fullyInInitialViewport:r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight};}));
   run.minTarget={width:Math.min(...run.targets.map(r=>r.width)),height:Math.min(...run.targets.map(r=>r.height))};run.target44=run.minTarget.width>=44&&run.minTarget.height>=44;
   run.horizontalOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(run.horizontalOverflow,false);
   const screenshot=`${local}/screenshots-refined/${kind}-${count}-${viewport.width}.png`;await page.screenshot({path:screenshot,fullPage:true});run.screenshot=screenshot;run.screenshotSHA256=createHash('sha256').update(await readFile(screenshot)).digest('hex');
   const viewportShot=`${local}/screenshots-refined/${kind}-${count}-${viewport.width}-viewport.png`;await page.screenshot({path:viewportShot,fullPage:false});const viewportPNG=await readFile(viewportShot);run.nativeViewportScreenshot={path:viewportShot,sha256:createHash('sha256').update(viewportPNG).digest('hex'),width:viewportPNG.readUInt32BE(16),height:viewportPNG.readUInt32BE(20)};assert.equal(run.nativeViewportScreenshot.width,viewport.width);assert.equal(run.nativeViewportScreenshot.height,viewport.height);
   const before=await page.evaluate(()=>spike.snapshot());
   if(kind==='four')await page.getByRole('button',{name:'Drop column 1',exact:true}).click();
   else if(kind==='chess'){await page.locator('[data-square=e2]').click();await page.locator('[data-square=e4]').click();}
   else{const playable=page.locator('[data-card]:not([disabled])');if(await playable.count())await playable.first().click();else await page.locator('[data-draw]').click();}
   const afterPointer=await page.evaluate(()=>spike.snapshot());assert.equal(afterPointer.revision,1);run.pointerMoveActivations=afterPointer.metrics.pointerActivations-before.metrics.pointerActivations;
   await page.locator('#actor').click();
   const beforeKey=await page.evaluate(()=>spike.snapshot());
   if(kind==='four'){await page.getByRole('button',{name:'Drop column 2',exact:true}).focus();await page.keyboard.press('Enter');}
   else if(kind==='chess'){await page.locator('[data-square=e7]').focus();await page.keyboard.press('Enter');await page.locator('[data-square=e5]').focus();await page.keyboard.press('Enter');}
   else{const playable=page.locator('[data-card]:not([disabled])');const target=await playable.count()?playable.first():page.locator('[data-draw]');await target.focus();await page.keyboard.press('Enter');}
   const afterKey=await page.evaluate(()=>spike.snapshot());assert.equal(afterKey.revision,2);run.keyboardMoveActivations=afterKey.metrics.keyActivations-beforeKey.metrics.keyActivations;
   await page.locator('#watch').click();assert.equal((await page.evaluate(()=>spike.snapshot())).joined,false);assert.equal(await page.locator('[data-target]:not([disabled])').count(),0);
   await page.locator('#join').click();await page.locator('#leave').click();assert.equal((await page.evaluate(()=>spike.snapshot())).result.reason,'member-left');await page.locator('#return').click();assert.equal(await page.locator('#work').isVisible(),true);
   run.final=await page.evaluate(()=>spike.snapshot());assert.deepEqual(consoleErrors,[]);run.status='PASS';
   if(viewport.width===390){
    run.emulatedTouch={status:'RUNNING'};
    try{
     await page.goto(`${origin}/?kind=${kind}&count=${count}`);await page.waitForFunction(()=>window.spike);
     await page.evaluate(()=>{window.touchProbe={touchstarts:0,pointerTypes:[]};document.addEventListener('touchstart',()=>touchProbe.touchstarts++,{passive:true});document.addEventListener('pointerdown',event=>touchProbe.pointerTypes.push(event.pointerType));});
     await page.locator('#join').tap();const beforeTap=await page.evaluate(()=>spike.snapshot());
     if(kind==='four')await page.getByRole('button',{name:'Drop column 1',exact:true}).tap();
     else if(kind==='chess'){await page.locator('[data-square=e2]').tap();await page.locator('[data-square=e4]').tap();}
     else{const playable=page.locator('[data-card]:not([disabled])');if(await playable.count())await playable.first().tap();else await page.locator('[data-draw]').tap();}
     const afterTap=await page.evaluate(()=>spike.snapshot());assert.equal(afterTap.revision,1);run.emulatedTouch.moveActivations=afterTap.metrics.pointerActivations-beforeTap.metrics.pointerActivations;
     await page.locator('#leave').tap();assert.equal((await page.evaluate(()=>spike.snapshot())).result.reason,'member-left');await page.locator('#return').tap();assert.equal(await page.locator('#work').isVisible(),true);
     run.emulatedTouch.events=await page.evaluate(()=>touchProbe);assert.ok(run.emulatedTouch.events.touchstarts>=4);assert.ok(run.emulatedTouch.events.pointerTypes.every(type=>type==='touch'));run.emulatedTouch.status='PASS';
    }catch(error){run.emulatedTouch.status='FAIL';run.emulatedTouch.error=error.message;}
   }
  }catch(error){run.status='FAIL';run.error=error.message;run.consoleErrors=consoleErrors;}finally{await context.close();}
 }
 artifact.status=runs.some(r=>r.status==='FAIL'||r.emulatedTouch?.status==='FAIL')?'FAIL':'PASS';
}catch(error){artifact.status='INFRASTRUCTURE-FAILURE';errors.push(error.message);}finally{if(browser)await browser.close();if(server){server.kill('SIGTERM');await new Promise(resolve=>{if(server.exitCode!==null)return resolve();server.once('exit',resolve);});}await writeFile(evidence+'/game-browser-refined.json',JSON.stringify(artifact,null,2)+'\n');}
console.log(JSON.stringify({status:artifact.status,browser:artifact.browser,runs:runs.map(({kind,count,viewport,status,minTarget,target44,pointerMoveActivations,keyboardMoveActivations,error})=>({kind,count,viewport,status,minTarget,target44,pointerMoveActivations,keyboardMoveActivations,error})),errors}));if(artifact.status!=='PASS')process.exitCode=1;
