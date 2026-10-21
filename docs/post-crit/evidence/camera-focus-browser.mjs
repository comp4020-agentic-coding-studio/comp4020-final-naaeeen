/** Native focus/hit-test regressions. Run only while the shared GPU slot is owned. */
import {chromium} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const root=process.cwd(),runtime=resolve(root,'.local/post-crit/p1-runtime'),out=resolve(root,'.local/post-crit-camera');
const{createService}=await import(pathToFileURL(resolve(runtime,'src/server.ts')).href);
const service=createService({dataDir:resolve(runtime,'data'),secureCookies:false,origin:'http://127.0.0.1:4101'});
await new Promise((resolve,reject)=>{service.server.once('error',reject);service.server.listen(4101,'127.0.0.1',resolve);});
const browser=await chromium.launch({executablePath:'/home/lizhi/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',headless:true,chromiumSandbox:true,args:['--use-angle=swiftshader']});
const sourceHashes=Object.fromEntries(await Promise.all(['house-camera.js','house-world.js','house-ui.js','house.html','house.css'].map(async name=>[name,createHash('sha256').update(await readFile(resolve(runtime,'public',name))).digest('hex')])));
const results=[],errors=[],label=process.env.CAMERA_FOCUS_LABEL||'focus';await mkdir(out,{recursive:true});
const position=page=>page.locator('canvas').evaluate(el=>({x:+el.dataset.selfX,z:+el.dataset.selfZ}));
try{for(const viewport of [{width:1920,height:1080},{width:390,height:844},{width:844,height:390}]){
 const context=await browser.newContext({viewport,hasTouch:true}),page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
 try{await page.goto('http://127.0.0.1:4101/');await page.locator('#title-create').click();await page.locator('#name').fill('Focus friend');await page.locator('#create-form button').click();await page.waitForFunction(()=>Number.isFinite(+document.querySelector('canvas')?.dataset.selfX));
 const row={viewport,actualViewport:await page.evaluate(()=>({width:innerWidth,height:innerHeight,coarse:matchMedia('(pointer:coarse)').matches})),checks:[],failures:[]};results.push(row);
 for(const launcher of ['follow','pause']){
 if(launcher==='follow'){await page.locator('#camera-hud-look').click();await page.locator('#camera-hud-follow').click();}else{await page.locator('#pause-button').click();await page.locator('#panel-close').click();}
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const focus=await page.evaluate(()=>document.activeElement?.id),before=await position(page);await page.keyboard.down(launcher==='follow'?'ArrowRight':'ArrowLeft');try{await page.waitForTimeout(250);}finally{await page.keyboard.up(launcher==='follow'?'ArrowRight':'ArrowLeft');}
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const after=await position(page),distance=Math.hypot(after.x-before.x,after.z-before.z),focusAfter=await page.evaluate(()=>document.activeElement?.id);row.checks.push({launcher,focus,focusAfter,before,after,distance});if(focusAfter!==focus)row.failures.push('walking stole focus from '+focus);if(distance<.1)row.failures.push('walking blocked at '+focus);
 }
 await page.locator('#camera-hud-look').focus();const activationBefore=await position(page);await page.keyboard.press('Enter');await page.keyboard.press('Space');const activationAfter=await position(page);if(Math.hypot(activationAfter.x-activationBefore.x,activationAfter.z-activationBefore.z)>.02)row.failures.push('native activation moved avatar');
 await page.locator('#touch-toggle').click();const hit=await page.locator('#camera-hud-follow').evaluate(button=>{const r=button.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{clear:hit===button||button.contains(hit),hitId:hit?.id,follow:{x:r.x,y:r.y,width:r.width,height:r.height},movement:document.querySelector('#movement-controls').getBoundingClientRect().toJSON()};});
 row.checks.push({movementOpen:hit});if(!hit.clear)row.failures.push('Follow hidden behind '+hit.hitId);else{await page.locator('#camera-hud-follow').click();await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.cameraMode==='play');}
 if(process.env.CAMERA_NATIVE_TOUCH){
  const cdp=await context.newCDPSession(page);try{
   const point=async()=>{await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));return page.locator('canvas').evaluate(el=>{const a=JSON.parse(el.dataset.cameraPlayArea);return{x:a.x+a.w/2,y:a.y+a.h/2};});};
   const gesture=async(id,cancel=false)=>{const p=await point();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p,id}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x+10,y:p.y,id}]});await cdp.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});};
   await gesture(11);await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.cameraInspection==='temporary');
   const move=await page.locator('#move-right').boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:move.x+move.width/2,y:move.y+move.height/2,id:12}]});await page.waitForTimeout(160);const framed=await page.locator('canvas').evaluate(el=>{const m=JSON.parse(el.dataset.selfMeshBounds),a=JSON.parse(el.dataset.cameraPlayArea);return a.available&&m.left>=a.x-1&&m.right<=a.x+a.w+1&&m.top>=a.y-1&&m.bottom<=a.y+a.h+1;});if(!framed)row.failures.push('actual mesh/ring escaped with movement controls open');await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.cameraMode==='play');
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));const stopped=await position(page);await page.waitForTimeout(200);const afterCancel=await position(page);if(Math.hypot(afterCancel.x-stopped.x,afterCancel.z-stopped.z)>.02)row.failures.push('touch direction continued after cancellation');
   await gesture(21,true);await page.locator('#camera-hud-follow').click();const p=await point();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p,id:22}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});const finalMode=await page.locator('canvas').getAttribute('data-camera-mode');if(finalMode!=='play')row.failures.push('cancelled canvas pointer retained drag');row.checks.push({nativeCanvasTouch:{meshWithMovementOpen:framed,temporaryPan:true,directionRecovery:true,directionCancel:true,canvasCancel:finalMode==='play'}});
  }finally{await cdp.detach();}
 }
 await page.screenshot({path:resolve(out,label+'-'+viewport.width+'x'+viewport.height+'.png')});console.log(JSON.stringify(row));
 }finally{await context.close();}
 }await writeFile(resolve(out,label+'.json'),JSON.stringify({sourceHashes,browserVersion:browser.version(),results,errors},null,2)+'\n');if(results.some(row=>row.failures.length)||errors.length)process.exitCode=1;
}finally{await browser.close();await service.close();}
