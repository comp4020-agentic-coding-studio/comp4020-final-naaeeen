/** Local-only picture UI comparison. No application server, database or network peer. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {chromium} from '@playwright/test';
const root=resolve('.'),folder=join(root,'prototypes/picture-table'),evidence=join(root,'docs/post-crit/evidence');
const args=process.argv.slice(2),label=args[args.indexOf('--label')+1];
assert.ok(args.includes('--label')&&/^[a-z0-9-]{1,32}$/.test(label),'Pass --label with a fresh lowercase run name.');
const output=join(evidence,'picture-prototype-'+label);await mkdir(output,{recursive:false});
const hash=b=>createHash('sha256').update(b).digest('hex');
const paths=['index.html','style.css','app.js','rainy-nook.svg','README.md'];
const hashes=Object.fromEntries(await Promise.all(paths.map(async file=>[file,hash(await readFile(join(folder,file)))])));
const protocol=await readFile(join(evidence,'picture-prototype-protocol.md'));
const criteriaNames=['picture-prototype-protocol.md','picture-prototype-amendment.md','picture-prototype-chat-refinement.md'];
const criteriaEntry={};await mkdir(join(output,'criteria'));
for(const name of criteriaNames){const bytes=await readFile(join(evidence,name));criteriaEntry[name]=hash(bytes);await writeFile(join(output,'criteria',name),bytes);}

const result={criteria:{entry:criteriaEntry,entryCopies:criteriaNames.map(name=>'criteria/'+name)},capture:args.includes('--view-capture')?'CDP view capture, fromSurface:false':'Playwright surface capture',kind:'native local UI technical comparison; no human or network trial',label,startedAt:new Date().toISOString(),sourceSHA256:hashes,protocolSHA256:hash(protocol),runnerSHA256:hash(await readFile(new URL(import.meta.url))),cases:[],pageErrors:[]};
let browser,server;
const fail=(name,ok)=>assert.ok(ok,name);
async function metrics(page){return page.evaluate(()=>{
 const rect=node=>{const r=node.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right};};
 const inside=r=>r.x>=0&&r.y>=0&&r.right<=innerWidth+.5&&r.bottom<=innerHeight+.5;
 const exposure=node=>{const r=rect(node),clips=[];for(let ancestor=node.parentElement;ancestor;ancestor=ancestor.parentElement){const style=getComputedStyle(ancestor),a=rect(ancestor);if(/hidden|clip|auto|scroll/.test(style.overflowX)&& (r.x<a.x-.5||r.right>a.right+.5))clips.push(ancestor.id||ancestor.className);if(/hidden|clip|auto|scroll/.test(style.overflowY)&&(r.y<a.y-.5||r.bottom>a.bottom+.5))clips.push(ancestor.id||ancestor.className);}const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{ancestorClips:clips,centerUnobscured:!!hit&&(hit===node||node.contains(hit)),fullyExposed:inside(r)&&clips.length===0&&!!hit&&(hit===node||node.contains(hit))};};
 const content=[...document.querySelectorAll('.instruction,.selected-summary,.feedback,#complete:not([hidden])')].map(node=>({class:node.id||node.className,...rect(node),inViewport:inside(rect(node)),...exposure(node)}));
 const controls=[...document.querySelectorAll('button,input')].filter(n=>!n.closest('[hidden]')).map(n=>({id:n.id,...rect(n),inViewport:inside(rect(n)),...exposure(n),name:n.getAttribute('aria-label')||n.textContent.trim()}));
 const pieces=controls.filter(n=>n.id.startsWith('piece-')),cells=controls.filter(n=>n.id.startsWith('cell-'));
 return{scroll:{x:scrollX,y:scrollY,shell:document.querySelector('#table-shell').scrollTop,visual:visualViewport?{top:visualViewport.offsetTop,left:visualViewport.offsetLeft,pageTop:visualViewport.pageTop,width:visualViewport.width,height:visualViewport.height,scale:visualViewport.scale}:null},content,viewport:{width:innerWidth,height:innerHeight,devicePixelRatio,clientWidth:document.documentElement.clientWidth},document:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight},board:rect(document.querySelector('#board')),tray:rect(document.querySelector('#tray')),trayScrollHeight:document.querySelector('#tray').scrollHeight,controls,minPiece:Math.min(...pieces.flatMap(n=>[n.width,n.height])),minCell:Math.min(...cells.flatMap(n=>[n.width,n.height]))};
});}
async function shot(page,path,viewport){
 await page.evaluate(async()=>{const image=new Image();image.src='/rainy-nook.svg';await image.decode();await Promise.all([...document.images].map(image=>image.decode().catch(()=>{})));await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)));});
 let bytes;if(args.includes('--view-capture')){const session=await page.context().newCDPSession(page);const value=await session.send('Page.captureScreenshot',{format:'png',fromSurface:false,captureBeyondViewport:false});await session.detach();bytes=Buffer.from(value.data,'base64');await writeFile(path,bytes);}else bytes=await page.screenshot({path,fullPage:false,animations:'disabled'});assert.equal(bytes.readUInt32BE(16),viewport.width);assert.equal(bytes.readUInt32BE(20),viewport.height);
 const nearBlack=await page.evaluate(async encoded=>{const image=new Image();image.src='data:image/png;base64,'+encoded;await image.decode();const canvas=document.createElementNS('http://www.w3.org/1999/xhtml','canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;let black=0,transparent=0;for(let i=0;i<pixels.length;i+=4){if(pixels[i]<4&&pixels[i+1]<4&&pixels[i+2]<4&&pixels[i+3]===255)black++;if(pixels[i+3]!==255)transparent++;}return{black,transparent};},bytes.toString('base64'));
 assert.equal(nearBlack.black,0,'Reject unexpected black compositor pixels in native PNG');assert.equal(nearBlack.transparent,0,'Reject unexpected transparent compositor pixels in native PNG');
 return{file:path.slice(root.length+1),width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),sha256:hash(bytes),nearBlackPixels:nearBlack.black,nonOpaquePixels:nearBlack.transparent};
}
async function keyTo(page,id,record){
 const group=await page.locator('#'+id).evaluate(node=>node.parentElement.id);
 if(['board','tray'].includes(group)){
  for(let i=0;i<30;i++){
   if(await page.evaluate(group=>document.activeElement?.parentElement?.id===group,group))break;
   await page.keyboard.press('Tab');record.actions.tab++;
  }
  fail('Keyboard entered group '+group,await page.evaluate(group=>document.activeElement?.parentElement?.id===group,group));
  await page.keyboard.press('Home');record.actions.arrowOrHome++;
  const {index,columns}=await page.evaluate(({group,id})=>{const buttons=[...document.getElementById(group).children].filter(button=>!button.hidden);return{index:buttons.findIndex(button=>button.id===id),columns:group==='board'?6:getComputedStyle(document.getElementById(group)).gridTemplateColumns.split(' ').length};},{group,id});
  fail('Keyboard target is exposed',index>=0);
  for(let i=0;i<Math.floor(index/columns);i++){await page.keyboard.press('ArrowDown');record.actions.arrowOrHome++;}
  for(let i=0;i<index%columns;i++){await page.keyboard.press('ArrowRight');record.actions.arrowOrHome++;}
  fail('Arrow navigation reached target',await page.evaluate(id=>document.activeElement?.id===id,id));return;
 }
 for(let i=0;i<30;i++){if(await page.evaluate(id=>document.activeElement?.id===id,id))return;await page.keyboard.press('Tab');record.actions.tab++;}throw Error('Tab target unreachable: '+id);
}
async function fullyInTray(page,id){return page.evaluate(id=>{const a=document.getElementById(id),b=document.getElementById('tray');if(!a||a.hidden)return false;const r=a.getBoundingClientRect(),t=b.getBoundingClientRect();return r.top>=t.top+1&&r.bottom<=t.bottom-1;},id);}
async function browse(page,mode,id,record,touch){
 if(mode==='pages'){if(await page.locator('#'+id).isHidden()){await page.locator('#next')[touch?'tap':'click']();record.actions.pageNavigation++;}}
 for(let i=0;!await fullyInTray(page,id)&&i<12;i++){
  const r=await page.locator('#tray').boundingBox();
  if(touch){const session=await page.context().newCDPSession(page),x=r.x+r.width/2,y=r.y+r.height-12,end=r.y+12;
   await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   for(let step=1;step<=6;step++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+(end-y)*step/6}]});
   await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();
  }else{await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.wheel(0,r.height*.8);}
  record.actions.trayScrollGestures++;await page.waitForTimeout(80);
 }
 fail('Target became fully reachable in bounded tray',await fullyInTray(page,id));
}
try{
 assert.equal(process.version,'v24.21.0');
 const allow=new Map(paths.map(file=>['/'+file,file]));allow.set('/','index.html');
 server=createServer(async(req,res)=>{const file=allow.get(new URL(req.url,'http://127.0.0.1').pathname);if(!file){res.writeHead(404);res.end();return;}try{const bytes=await readFile(join(folder,file));res.writeHead(200,{'Content-Type':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html','Cache-Control':'no-store'});res.end(bytes);}catch{res.writeHead(500);res.end();}});
 await new Promise(done=>server.listen(0,'127.0.0.1',done));const base='http://127.0.0.1:'+server.address().port;result.origin=base;
 browser=await chromium.launch({headless:true,chromiumSandbox:true,executablePath:'/home/lizhi/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args:['--use-angle=swiftshader']});
 result.runtime={node:process.version,chromium:browser.version(),revision:'1243',chromiumSandbox:true,args:['--use-angle=swiftshader']};
 for(const [name,viewport,modes]of[['desktop',{width:1920,height:1080},['scroll','pages']],['portrait',{width:390,height:844},['pages','scroll']],['landscape',{width:844,height:390},['scroll','pages']]])for(const mode of modes){
  if(args.includes('--landscape-only')&&name!=='landscape')continue;
  if(args.includes('--case')&&args[args.indexOf('--case')+1]!==name+'-'+mode)continue;
  const touch=name!=='desktop',context=await browser.newContext({viewport,deviceScaleFactor:1,hasTouch:touch,isMobile:!args.includes('--native-layout')&&touch,reducedMotion:'reduce'}),page=await context.newPage();
  const item={name,mode,mobileEmulation:!args.includes('--native-layout')&&touch,input:touch?'software touch dispatch/tap plus native keyboard':'pointer/wheel plus native keyboard',actions:{pointerOrTap:0,tab:0,keyActivation:0,arrowOrHome:0,pageNavigation:0,trayScrollGestures:0,syntheticPeerEvents:0},screenshots:[],checks:{}};result.cases.push(item);
  page.on('pageerror',error=>result.pageErrors.push({case:name+'-'+mode,message:error.message}));
  const point=async id=>{await page.locator('#'+id)[touch?'tap':'click']();item.actions.pointerOrTap++;};
  try{
   await page.goto(base+'/?tray='+mode);await page.locator('.piece').first().waitFor();
   item.initial=await metrics(page);item.screenshots.push(await shot(page,join(output,name+'-'+mode+'-initial.png'),viewport));
   assert.deepEqual(item.initial.viewport,{...viewport,devicePixelRatio:1,clientWidth:viewport.width});
   fail('No horizontal document overflow',item.initial.document.width<=viewport.width);
   fail('Board cells meet 44px target',item.initial.minCell>=44-.1);fail('Loose pieces meet 44px target',item.initial.minPiece>=44-.1);
   for(const control of item.initial.controls.filter(n=>!n.id.startsWith('piece-')))fail('Exposed control in viewport: '+control.id,control.fullyExposed);
   for(const content of item.initial.content)fail('Content visible: '+content.class,content.fullyExposed);
   item.checks.initialFit=true;
   await point('join');await point('reference-toggle');
   fail('Reference open',await page.locator('#reference-panel').isVisible());
   fail('Exit remains visible with reference',await page.locator('#exit').isVisible());
   fail('Exit/reference/chat targets unobscured with reference',await page.evaluate(()=>['exit','reference-toggle','chat-toggle'].every(id=>{const n=document.getElementById(id),r=n.getBoundingClientRect();return n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})));
   item.screenshots.push(await shot(page,join(output,name+'-'+mode+'-reference.png'),viewport));await point('reference-close');
   await browse(page,mode,'piece-cat-tail',item,touch);await point('piece-cat-tail');
   assert.equal(await page.locator('#piece-cat-tail').getAttribute('aria-pressed'),'true');
   await point('cell-0');assert.equal(await page.locator('#piece-cat-tail').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#progress').textContent(),'0 / 24 placed');
   fail('Wrong placement explains retained selection',/still selected/.test(await page.locator('#feedback').textContent()));item.checks.wrongPlacementRetainsSelection=true;
   await point('cell-13');assert.equal(await page.locator('#progress').textContent(),'1 / 24 placed');
   await point('chat-toggle');item.chatGeometry=await page.evaluate(()=>['chat-close','message','chat-send'].map(id=>{const n=document.getElementById(id),r=n.getBoundingClientRect();return{id,width:r.width,height:r.height,reachable:n===document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)||n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};}));fail('Chat close/input reachable',item.chatGeometry.every(control=>control.reachable));item.chatMessageGeometry=await page.evaluate(()=>{
 const list=document.getElementById('messages'),message=list.firstElementChild,l=list.getBoundingClientRect(),m=message.getBoundingClientRect(),ranges=[];
 const walker=document.createTreeWalker(message,NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode()){if(!node.textContent.trim())continue;const range=document.createRange();range.selectNodeContents(node);for(const r of range.getClientRects())ranges.push({x:r.x,y:r.y,right:r.right,bottom:r.bottom});}
 return{listHeight:l.height,listClientHeight:list.clientHeight,messageHeight:m.height,author:message.querySelector('b').textContent,text:message.textContent,ranges,wholeRepresentativeMessageVisible:m.top>=l.top-.5&&m.bottom<=l.bottom+.5&&ranges.every(r=>r.x>=l.x-.5&&r.right<=l.right+.5&&r.y>=l.y-.5&&r.bottom<=l.bottom+.5)};
 });
 fail('Representative chat author and full text visible without clipping',item.chatMessageGeometry.wholeRepresentativeMessageVisible);
 if(name==='landscape')fail('Landscape chat list has at least80px visible height',item.chatMessageGeometry.listClientHeight>=80);
 item.screenshots.push(await shot(page,join(output,name+'-'+mode+'-chat.png'),viewport));await page.locator('#message').fill('The cat tail is in place.');item.actions.pointerOrTap++;await page.locator('#message').press('Enter');item.actions.keyActivation++;
   fail('Chat text appended as plain text',await page.locator('#messages').textContent().then(t=>t.includes('The cat tail is in place.')));await page.keyboard.press('Escape');item.actions.keyActivation++;item.checks.referenceAndChat=true;
   const keyboardPiece='piece-cat-book';
   await keyTo(page,keyboardPiece,item);await page.keyboard.press('Space');item.actions.keyActivation++;
   assert.equal(await page.locator('#'+keyboardPiece).getAttribute('aria-pressed'),'true');
   // A local mock event uses the same explicit UI handler without stealing native focus.
   await page.evaluate(()=>{globalThis.focusedBeforeMock=document.activeElement;document.getElementById('peer').click();});item.actions.syntheticPeerEvents++;
   fail('Same DOM node retains focus after peer places selected piece',await page.evaluate(()=>document.activeElement===globalThis.focusedBeforeMock));
   assert.equal(await page.locator('#'+keyboardPiece).getAttribute('aria-disabled'),'true');assert.equal(await page.locator('#'+keyboardPiece).getAttribute('aria-pressed'),'false');
   fail('Peer update explains selection change',/piece you had selected/.test(await page.locator('#feedback').textContent()));item.checks.peerFocusAndSelection=true;
   const next='piece-shelf-leaves',cell='cell-4';
   await keyTo(page,next,item);await page.keyboard.press('Space');item.actions.keyActivation++;await keyTo(page,cell,item);await page.keyboard.press('Enter');item.actions.keyActivation++;
   assert.equal(await page.locator('#progress').textContent(),'3 / 24 placed');item.checks.keyboardSelectionPlacement=true;
   item.beforeExit=await metrics(page);item.screenshots.push(await shot(page,join(output,name+'-'+mode+'-before-exit.png'),viewport));
   await keyTo(page,'exit',item);await page.keyboard.press('Enter');item.actions.keyActivation++;fail('Local desk return works',await page.locator('#desk').isVisible());
   await page.keyboard.press('Enter');item.actions.keyActivation++;assert.equal(await page.locator('#progress').textContent(),'3 / 24 placed');assert.equal(await page.locator('#join').textContent(),'Join local demo');item.checks.exitReopenRetainsLocalProgress=true;
   item.afterReopen=await metrics(page);item.screenshots.push(await shot(page,join(output,name+'-'+mode+'-after-reopen.png'),viewport));
   await point('join');for(let i=0;i<21;i++)await point('peer');assert.equal(await page.locator('#progress').textContent(),'24 / 24 placed');fail('Completed state shown',await page.locator('#complete').isVisible());
   item.completed=await metrics(page);for(const content of item.completed.content)fail('Completed content visible: '+content.class,content.fullyExposed);item.screenshots.push(await shot(page,join(output,name+'-'+mode+'-completed.png'),viewport));item.checks.completedState=true;
   await page.reload();assert.equal(await page.locator('#progress').textContent(),'0 / 24 placed');item.checks.reloadHonesty=true;
   const inventoryAudit={actions:{tab:0,arrowOrHome:0}},inspected=new Set();
   for(let trayPage=0;trayPage<(mode==='pages'?2:1);trayPage++){
    if(trayPage){await keyTo(page,'next',inventoryAudit);await page.keyboard.press('Enter');}
    const first=mode==='pages'&&trayPage?'piece-cat-book':'piece-notebook';await keyTo(page,first,inventoryAudit);
    const count=mode==='pages'?12:24;
    for(let i=0;i<count;i++){
     const focused=await page.evaluate(()=>document.activeElement.id),m=await metrics(page),control=m.controls.find(c=>c.id===focused);
     fail('Every tray piece can receive unclipped native keyboard focus: '+focused,control?.fullyExposed);inspected.add(focused);
     if(i<count-1){await page.keyboard.press('ArrowRight');inventoryAudit.actions.arrowOrHome++;}
    }
   }
   assert.equal(inspected.size,24);item.inventoryAudit={inspectedPieces:inspected.size,...inventoryAudit.actions};item.checks.allPiecesReachable=true;
   assert.equal(result.pageErrors.filter(e=>e.case===name+'-'+mode).length,0);item.status='PASS';
  }catch(error){item.status='FAIL';item.error={message:error.message,code:error.code??null};item.failureMetrics=await metrics(page).catch(()=>null);item.screenshots.push(await shot(page,join(output,name+'-'+mode+'-failure.png'),viewport).catch(()=>({failedScreenshot:true})));}
  finally{await context.close();}
 }
 const artPage=await browser.newPage({viewport:{width:600,height:400},deviceScaleFactor:1});await artPage.goto(base+'/rainy-nook.svg');result.originalArtwork=await shot(artPage,join(output,'original-artwork.png'),{width:600,height:400});await artPage.close();
 const inspection=await browser.newPage({viewport:{width:390,height:320},deviceScaleFactor:1});
 const art='data:image/svg+xml;base64,'+(await readFile(join(folder,'rainy-nook.svg'))).toString('base64');
 const order=[15,2,21,8,12,5,19,0,17,10,23,6,14,4,18,11,3,22,9,16,1,20,7,13];
 await inspection.setContent('<html><head><style>body{margin:0;padding:18px;background:#f4ead4;color:#304236;font:12px system-ui}h1{font:19px Georgia;margin:0 0 12px}main{display:grid;grid-template-columns:repeat(6,53px);gap:4px}.crop{width:53px;height:53px;border:1px solid #697b58;border-radius:4px;background-size:600% 400%;background-repeat:no-repeat}</style></head><body><h1>All24original crops at53px</h1><main>'+order.map(index=>'<div class="crop" style="background-image:url('+art+');background-position:'+(index%6)*20+'% '+Math.floor(index/6)*100/3+'%"></div>').join('')+'</main><p>Fixed shuffle · inspection sheet, not gameplay</p></body></html>');
 const inspectionBytes=await inspection.screenshot({path:join(output,'crop-inspection-53px.png'),fullPage:false});
 assert.equal(inspectionBytes.readUInt32BE(16),390);assert.equal(inspectionBytes.readUInt32BE(20),320);
 result.cropInspection={file:join(output,'crop-inspection-53px.png').slice(root.length+1),width:390,height:320,tileCssPixels:53,scope:'separate native inspection sheet, fixed shuffle; not a gameplay viewport'};await inspection.close();
 for(const file of paths)assert.equal(hash(await readFile(join(folder,file))),hashes[file],'Prototype source stayed unchanged during run: '+file);
 result.sourceStable=true;result.status=result.cases.every(item=>item.status==='PASS')?'PASS':'FAIL';
}catch(error){result.status='INFRASTRUCTURE_FAIL';result.error={message:error.message,code:error.code??null};}
finally{await browser?.close();await new Promise(done=>server?server.close(done):done());result.closed={browser:true,loopbackServer:true};result.criteria.exit=Object.fromEntries(await Promise.all(criteriaNames.map(async name=>[name,hash(await readFile(join(evidence,name)))])));result.criteria.stable=JSON.stringify(result.criteria.entry)===JSON.stringify(result.criteria.exit);if(!result.criteria.stable){result.status='CRITERIA_CHANGED';result.error={message:'Criterion files changed during run.'};}result.finishedAt=new Date().toISOString();await writeFile(join(output,'results.json'),JSON.stringify(result,null,2)+'\n');}
console.log(JSON.stringify({status:result.status,output:output.slice(root.length+1),cases:result.cases.map(({name,mode,status,error})=>({name,mode,status,error})),closed:result.closed}));
if(result.status!=='PASS')process.exitCode=1;
