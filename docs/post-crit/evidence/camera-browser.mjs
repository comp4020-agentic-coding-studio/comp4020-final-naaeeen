/** P1 scoped native camera comparison. Real local authority; isolated baseline runtime. */
import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const root=process.cwd(), runtime=resolve(root,'.local/post-crit/p1-runtime'), out=resolve(root,'.local/post-crit-camera/native');
await mkdir(out,{recursive:true});
const {createService}=await import(pathToFileURL(resolve(runtime,'src/server.ts')).href);
const service=createService({dataDir:resolve(runtime,'data'),secureCookies:false,origin:'http://127.0.0.1:4101'});
await new Promise((resolve,reject)=>{service.server.once('error',reject);service.server.listen(4101,'127.0.0.1',resolve);});
const source=await readFile(resolve(runtime,'public/house-camera.js'),'utf8'), hash=text=>createHash('sha256').update(text).digest('hex');
if (!source.includes('const FOLLOW_DEAD_ZONE = 0;')) throw new Error('Expected reviewed centered production default');
const factor = value => source.replace('const FOLLOW_DEAD_ZONE = 0;', 'const FOLLOW_DEAD_ZONE = '+value+';');
const variants={A:factor(0.4),B:factor(0),C:factor(0).replace("mode = 'play', inspectionLocked", "mode = 'overview', inspectionLocked").replace("if (value === 'play') reset = true;","if (value === 'play') value = 'overview';")};
if (variants.B !== source) throw new Error('Production source is not the measured centered candidate');
if(new Set(Object.values(variants).map(hash)).size!==3)throw new Error('Candidate transform did not change the intended factor');
const results=[],errors=[];
let browser;
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
async function state(page){return page.locator('canvas').evaluate(el=>{const d=el.dataset;return{mode:d.cameraMode,inspection:d.cameraInspection,x:+d.selfX,z:+d.selfZ,height:+d.selfAvatarHeight,left:+d.worldLeft,top:+d.worldTop,mesh:JSON.parse(d.selfMeshBounds||'null'),area:JSON.parse(d.cameraPlayArea||'null')};});}
function framing(s){const{mesh:m,area:a}=s;if(!m||!a||!a.available)return['missing visible mesh/area'];return ['left','right','top','bottom'].filter(k=>!Number.isFinite(m[k])||(k==='left'?m[k]<a.x-1:k==='right'?m[k]>a.x+a.w+1:k==='top'?m[k]<a.y-1:m[k]>a.y+a.h+1));}
async function wait(page,predicate,label,timeout=30000){const start=Date.now();while(Date.now()-start<timeout){if(await predicate())return;await page.waitForTimeout(50);}throw new Error('Timed out: '+label);}
async function mode(page,value){await wait(page,async()=> (await state(page)).mode===value,'mode '+value);}
async function click(page,id){await page.locator('#'+id).click();}
async function hold(page,key,ms=250){await page.locator('canvas').focus();await page.keyboard.down(key);try{await page.waitForTimeout(ms);}finally{await page.keyboard.up(key);}}
async function settle(page){await page.waitForTimeout(800);}
async function pan(page,pixels){const s=await state(page);const x=s.area.x+s.area.w/2,y=s.area.y+s.area.h/2;assert(await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.tagName==='CANVAS',{x,y}),'pan point hidden by HUD');await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+pixels,y);await page.mouse.up();}
async function projectedClick(page,filter){
 // Projection metadata is published by RAF, after an immediate mode update.
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 let target;
 await wait(page,async()=>{target=await page.locator('canvas').evaluate((el,wanted)=>JSON.parse(el.dataset.pickTargets||'[]').find(e=>Object.entries(wanted).every(([key,value])=>e.target[key]===value)&&e.visible),filter);return !!target;},'visible projected '+JSON.stringify(filter));
 assert(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.tagName==='CANVAS',target),'projected action hidden by HUD '+JSON.stringify(filter));await page.mouse.click(target.x,target.y);
}
async function worldFollow(page,candidate){await click(page,'camera-hud-follow');await mode(page,candidate==='C'?'overview':'play');await settle(page);}
async function clear(page){await wait(page,async()=>framing(await state(page)).length===0,'actual animated mesh/ring containment');}
try{
 browser=await chromium.launch({executablePath:'/home/lizhi/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',headless:true,chromiumSandbox:true,args:['--use-angle=swiftshader']});
 cases: for(const candidate of ['A','B','C'])for(const viewport of [{width:1920,height:1080},{width:390,height:844},{width:844,height:390},{width:390,height:520}]){
 if(process.env.CAMERA_CANDIDATE&&process.env.CAMERA_CANDIDATE!==candidate)continue;
 if(process.env.CAMERA_CASE&&process.env.CAMERA_CASE!==candidate+'-'+viewport.width+'x'+viewport.height)continue;
 const context=await browser.newContext({viewport,hasTouch:true}),page=await context.newPage();const row={candidate,viewport,sourceSha256:hash(variants[candidate]),checks:{},measurements:{},failures:[]};results.push(row);
 page.on('pageerror',error=>errors.push({candidate,viewport,error:error.message}));
 await page.route('**/house-camera.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:variants[candidate]}));
 try{
 await page.goto('http://127.0.0.1:4101/');await click(page,'title-create');await page.locator('#name').fill('Camera friend');await page.locator('#capacity').selectOption('2');await page.locator('#create-form button').click();
 await wait(page,async()=>Number.isFinite((await state(page)).height),'initial renderer');await settle(page);
 assert(await page.evaluate(v=>innerWidth===v.width&&innerHeight===v.height&&document.documentElement.scrollWidth<=innerWidth,viewport),'actual viewport');
 const initial=await state(page);row.measurements.defaultHeight=initial.height;row.checks.phone64px=viewport.width!==390||initial.height>=64;row.checks.initialContainment=framing(initial).length===0;
 const hud=await page.locator('#camera-hud button').evaluateAll(buttons=>buttons.every(button=>{const r=button.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.width>=44&&r.height>=44&&(hit===button||button.contains(hit));}));assert(hud,'visible 44px camera actions');row.checks.hudReachable=hud;
 const recovery=[];
 for(const pixels of [0,5,7]){
 await worldFollow(page,candidate);await pan(page,pixels);const before=(await state(page)).mode;assert(before===(candidate==='C'?'overview':pixels>6?'inspection':'play'),'drag threshold '+pixels+' mode '+before);
 await page.evaluate(()=>{window.__cameraIntent={};window.addEventListener('keydown',()=>{window.__cameraIntent.start=performance.now();},{capture:true,once:true});const observer=new MutationObserver(()=>{if(document.querySelector('canvas')?.dataset.cameraMode==='play'){window.__cameraIntent.delay=performance.now()-window.__cameraIntent.start;observer.disconnect();}});observer.observe(document.querySelector('canvas'),{attributes:true,attributeFilter:['data-camera-mode']});setTimeout(()=>observer.disconnect(),1000);});
 await hold(page,'ArrowLeft',120);await mode(page,candidate==='C'?'overview':'play');const delay=await page.evaluate(()=>window.__cameraIntent.delay??null);recovery.push({pixels,delay});if(candidate!=='C'&&pixels===7)assert(delay!==null&&delay<=250,'250ms follow recovery');
 }row.measurements.recovery=recovery;row.checks.thresholdsAndIntent=true;
 await clear(page);let travel=0,previous=await state(page);for(const key of ['ArrowLeft','ArrowRight','ArrowLeft']){await page.locator('canvas').focus();await page.keyboard.down(key);try{for(let i=0;i<6;i++){await page.waitForTimeout(100);const next=await state(page);travel+=Math.hypot(next.left-previous.left,next.top-previous.top);previous=next;}}finally{await page.keyboard.up(key);}}await clear(page);row.measurements.cameraTravelCssPx=travel;
 await settle(page);const stable=await state(page);await page.waitForTimeout(2000);const stationary=await state(page);row.measurements.stationaryDriftCssPx=Math.hypot(stationary.left-stable.left,stationary.top-stable.top);assert(row.measurements.stationaryDriftCssPx<=1,'stationary drift');row.checks.stationary=true;
 await click(page,'camera-hud-look');await hold(page,'ArrowRight');await mode(page,'inspection');assert((await state(page)).inspection==='locked','explicit Look lock');await worldFollow(page,candidate);row.checks.explicitLook=true;
 // Native touch dispatch exercises the movement controls and pan recovery without synthetic DOM input.
 await pan(page,7);await click(page,'touch-toggle');const button=page.locator('#move-right'),box=await button.boundingBox();assert(box,'touch control bounds');const cdp=await context.newCDPSession(page);try{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2,id:1}]});await page.waitForTimeout(160);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}finally{await cdp.detach();}await mode(page,candidate==='C'?'overview':'play');await click(page,'touch-toggle');row.checks.nativeTouch=true;
 await page.locator('[data-panel=chat]').click();await page.locator('#chat-input').focus();const typed=await state(page);await page.keyboard.type('wasd');await page.waitForTimeout(200);const afterType=await state(page);assert(Math.hypot(typed.x-afterType.x,typed.z-afterType.z)<.02,'typing must not move');const handle=page.locator('#chat-handle');await handle.focus();await page.keyboard.press('ArrowLeft');await page.waitForTimeout(200);const afterHandle=await state(page);assert(Math.hypot(typed.x-afterHandle.x,typed.z-afterHandle.z)<.02,'chat handle arrows must not move');const handleBox=await handle.boundingBox();await page.mouse.move(handleBox.x+20,handleBox.y+12);await page.mouse.down();await page.mouse.move(handleBox.x+38,handleBox.y+30,{steps:4});await page.mouse.up();await page.waitForTimeout(150);const dragged=await state(page);assert(Math.hypot(typed.x-dragged.x,typed.z-dragged.z)<.02,'chat drag must not move');await click(page,'chat-collapse');await click(page,'chat-close');row.checks.inputIsolation=true;
 await click(page,'camera-hud-overview');await mode(page,'overview');await projectedClick(page,{type:'seat',seatId:'seat-1'});await wait(page,async()=>await page.locator('canvas').getAttribute('data-self-animation')==='sit','authoritative lounge sit');await mode(page,'overview');await hold(page,'e',10);await wait(page,async()=>await page.locator('canvas').getAttribute('data-self-animation')!=='sit','stand');row.checks.loungeSeat=true;
 await click(page,'camera-hud-overview');await projectedClick(page,{type:'board'});await wait(page,async()=>await page.locator('#board-workspace').isVisible(),'physical board');await click(page,'board-return');row.checks.board=true;
 await page.locator('[data-panel=room]').click();await click(page,'walk-room');await wait(page,async()=>await page.locator('#place-label').textContent()==="Camera friend's room",'room approach');await page.locator('[data-panel=room]').click();await mode(page,'inspection');const editing=await state(page);await page.waitForTimeout(300);assert((await state(page)).left===editing.left,'stable editor');
 await page.locator('#kind').selectOption('chair');await click(page,'piece-add');const chair=await page.locator('#placement').inputValue();await click(page,'layout-save');await wait(page,async()=> await page.locator('#layout-status').evaluate(el=>/saved/i.test(el.textContent)&&!/unsaved|preview|changed/i.test(el.textContent)),'save chair');await click(page,'panel-close');await mode(page,candidate==='C'?'overview':'play');row.checks.editExit=true;
 await click(page,'camera-hud-overview');await projectedClick(page,{type:'placement',id:chair});await wait(page,async()=>await page.locator('canvas').getAttribute('data-self-animation')==='sit','bedroom chair click');await hold(page,'e',10);await wait(page,async()=>await page.locator('canvas').getAttribute('data-self-animation')!=='sit','bedroom stand acknowledgement');row.checks.bedroomChair=true;
 await page.locator('[data-panel=room]').click();await click(page,'return-lounge');await wait(page,async()=>await page.locator('#place-label').textContent()==='Shared study lounge','return lounge');await worldFollow(page,candidate);await clear(page);
 if(viewport.width===390&&viewport.height===844){await page.setViewportSize({width:844,height:390});await clear(page);await page.setViewportSize(viewport);await clear(page);row.checks.nativeResize=true;}
 await page.screenshot({path:resolve(out,candidate+'-'+viewport.width+'x'+viewport.height+'.png')});row.checks.completeTask=true;
 }catch(error){row.failures.push(error.message);row.failureState=await state(page).catch(()=>null);await page.screenshot({path:resolve(out,candidate+'-'+viewport.width+'x'+viewport.height+'-failure.png')}).catch(()=>{});}finally{await context.close();await writeFile(resolve(out,'results.json'),JSON.stringify({runtimeBase:'d95055b',cameraSource:hash(source),results,errors},null,2)+'\n');console.log(candidate,viewport,JSON.stringify(row));}
 if(row.failures.length)break cases;
 }
 // Reduced motion is a separate condition with the actual production centered default.
 if(!process.env.CAMERA_CASE){const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage();try{await page.goto('http://127.0.0.1:4101/');await click(page,'title-create');await page.locator('#name').fill('Reduced motion');await page.locator('#create-form button').click();await wait(page,async()=>Number.isFinite((await state(page)).height),'reduced renderer');await pan(page,7);await hold(page,'ArrowRight');await mode(page,'play');await clear(page);await settle(page);const a=await state(page);await page.waitForTimeout(2000);const b=await state(page);assert(Math.hypot(b.left-a.left,b.top-a.top)<=1,'reduced motion drift');results.push({candidate:'B',reducedMotion:true,checks:{recovery:true,stationary:true,containment:true}});}finally{await context.close();}}
 await writeFile(resolve(out,'results.json'),JSON.stringify({runtimeBase:'d95055b',cameraSource:hash(source),results,errors},null,2)+'\n');
 if(results.some(row=>row.failures?.length)||errors.length)process.exitCode=1;
}finally{await browser?.close();await service.close();}
