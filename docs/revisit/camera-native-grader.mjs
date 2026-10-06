import { chromium } from '../../node_modules/@playwright/test/index.mjs';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const root = '/home/lizhi/comp4020/comp4020-final-naaeeen';
const tracked=['public/house-world.js','public/house-camera.js','public/house-label-layout.js','public/house-geometry.js','public/house-ui.js','public/house-client.js','public/house.css','public/house.html'];
const hashes=async()=>Object.fromEntries(await Promise.all(tracked.map(async path=>[path,createHash('sha256').update(await readFile(root+'/'+path)).digest('hex')])));
const freezeBefore=await hashes();
const baseline = await readFile(root + '/.local/camera-comparison/A-house-world.js', 'utf8');
const output = root + '/docs/revisit/screenshots'; await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: '/home/lizhi/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome', chromiumSandbox: true, args: ['--use-angle=swiftshader'] });
const all = [], errors = [];
const controls = '.top,#roster,.availability,.toolbelt,.quick-chat,.movement,.context-hint,.chat-privacy,#panel,#notice,#takeover,#camera-controls';
const names = ['Avery','Robin','Casey','Morgan','Jamie','Taylor'];
async function diagnostics(page) {
 return page.evaluate(selector => {
  const canvas=document.querySelector('.house-world-canvas'), d=canvas.dataset;
  const active=[...document.querySelectorAll(selector)].filter(n=>!n.hidden&&!n.closest('[hidden]')&&getComputedStyle(n).visibility!=='hidden').map(n=>({id:n.id||n.className,r:n.getBoundingClientRect()}));
  const visible=[...document.querySelectorAll('.house-avatar-name,.chat-bubble')].filter(n=>!n.hidden&&getComputedStyle(n).visibility==='visible');
  const labels=visible.map(n=>{const r=n.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(n);const glyphs=[...range.getClientRects()];return {id:n.dataset.playerId,kind:n.className,text:n.textContent,x:r.x,y:r.y,w:r.width,h:r.height,glyphOverflow:!n.classList.contains('chat-bubble')&&glyphs.some(g=>g.left<r.left-1||g.right>r.right+1||g.top<r.top-1||g.bottom>r.bottom+1),controlOverlap:active.some(c=>r.left<c.r.right&&r.right>c.r.left&&r.top<c.r.bottom&&r.bottom>c.r.top),clip:r.left<0||r.right>innerWidth||r.top<0||r.bottom>innerHeight};});
  const pairOverlaps=[];for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){const a=labels[i],b=labels[j];if(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y)pairOverlaps.push([a.id,b.id]);}
  const height=Number(d.selfAvatarHeight), x=Number(d.selfScreenX), y=Number(d.selfScreenY), selfRect={left:x-height*.3,right:x+height*.3,top:y-height/2,bottom:y+height/2};
  return {viewport:{width:innerWidth,height:innerHeight}, mode:d.cameraMode||'baseline-fit',self:{x:Number(d.selfX),z:Number(d.selfZ),screenX:x,screenY:y,height},world:{left:Number(d.worldLeft),right:Number(d.worldRight),top:Number(d.worldTop),bottom:Number(d.worldBottom)},area:d.cameraPlayArea?JSON.parse(d.cameraPlayArea):null,labels,pairOverlaps,selfControlOverlap:active.filter(c=>selfRect.left<c.r.right&&selfRect.right>c.r.left&&selfRect.top<c.r.bottom&&selfRect.bottom>c.r.top).map(c=>c.id),selfMesh:d.selfMeshBounds?JSON.parse(d.selfMeshBounds):null,selfClipped:selfRect.left<0||selfRect.right>innerWidth||selfRect.top<0||selfRect.bottom>innerHeight};
 }, controls);
}
try {
 for (const candidate of ['A2','B2']) for(const count of [2,6]) {
  const contexts=[],pages=[];
  try {
   for(let i=0;i<count;i++) {
    const context=await browser.newContext({viewport:{width:390,height:844}});contexts.push(context);
    if(candidate==='A2')await context.route('**/house-world.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:baseline}));
    const page=await context.newPage();pages.push(page);page.on('pageerror',e=>errors.push(candidate+'/'+count+': '+e.message));
    await page.goto('http://localhost:4093/');await page.locator('#name').fill(names[i]);
    if(i===0){await page.locator('#capacity').selectOption(String(count));await page.getByRole('button',{name:'Create house',exact:true}).click();await page.locator('.house-avatar-name').first().waitFor();await page.getByRole('button',{name:'House settings',exact:true}).click();var code=(await page.locator('#join-code-display').textContent()).trim();await page.getByRole('button',{name:'Close panel',exact:true}).click();}
    else{await page.locator('#join-code').fill(code);await page.getByRole('button',{name:'Join house',exact:true}).click();}
    await page.waitForFunction(()=>document.querySelector('.house-world-canvas')?.dataset.selfAvatarHeight!==undefined);await page.getByRole('radio',{name:'Can chat',exact:true}).check();await page.waitForFunction(name=>[...document.querySelectorAll('.house-avatar-name')].some(el=>el.dataset.name===name&&el.dataset.availability==='chat'),names[i]);
   }
   const owner=pages[0]; await owner.waitForFunction(()=>document.querySelector('#notice')?.hidden);
   for(const page of pages)await page.waitForFunction(()=>document.querySelector('#notice')?.hidden);
   for(const viewport of [{width:1920,height:1080},{width:390,height:844},{width:844,height:390},{width:390,height:520}]) {
    await owner.setViewportSize(viewport);await owner.waitForTimeout(250);
    await Promise.all(pages.map(async(page,i)=>{await page.getByRole('radio',{name:'Can chat',exact:true}).check();await page.waitForFunction(name=>[...document.querySelectorAll('.house-avatar-name')].some(el=>el.dataset.name===name&&el.dataset.availability==='chat'),names[i]);await page.locator('#chat-input').fill(names[i]+' 中文😀 same conversation');await page.locator('#quick-chat').getByRole('button',{name:'Send',exact:true}).click();}));
    await owner.waitForTimeout(250);
    const result={candidate,count,qualification:viewport.height===520?'reduced-height simulation':'native layout viewport',...await diagnostics(owner)};
    if(JSON.stringify(result.viewport)!==JSON.stringify(viewport))throw new Error('Actual viewport mismatch');
    all.push(result);console.log(JSON.stringify(result));
    await owner.screenshot({path:output+'/camera-'+candidate+'-'+count+'-'+viewport.width+'x'+viewport.height+'.png'});
   }
  } finally {for(const context of contexts)await context.close();}
 }
 const freezeAfter=await hashes();
 await writeFile(root+'/.local/camera-comparison/native-B2-results.json',JSON.stringify({all,errors,freezeBefore,freezeAfter},null,2)+'\n');
 if(JSON.stringify(freezeBefore)!==JSON.stringify(freezeAfter))throw new Error('Candidate byte change during matched run');
 if(errors.length)throw new Error(JSON.stringify(errors));
} finally {await browser.close();}
