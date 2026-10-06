import {test,expect,type Page,type BrowserContext} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const desktop={width:1920,height:1080},phone={width:390,height:844};
function trackErrors(...pages:Page[]){const errors:string[]=[];for(const page of pages)page.on('pageerror',error=>errors.push(error.message));return errors;}
test.setTimeout(90_000);
async function enter(page:Page,name:string,code?:string){
 await page.goto('/');await page.getByLabel('Your name',{exact:true}).fill(name);
 if(code)await page.getByLabel('Join code',{exact:true}).fill(code);
 await page.getByRole('button',{name:code?'Join house':'Create house',exact:true}).click();
 await expect(page.locator('#connection-status')).toHaveText('Together, live');
 await expect(page.locator('.house-world-canvas')).toHaveAttribute('data-self-x',/^-?\d/);
}
async function settings(page:Page){await page.getByRole('button',{name:'House settings',exact:true}).click();}
async function code(page:Page){await settings(page);return (await page.locator('#join-code-display').innerText()).trim();}
async function me(page:Page){return (await page.request.get(new URL('/api/house/me',page.url()).href)).json();}
async function download(page:Page){
 const waiting=page.waitForEvent('download');await page.getByRole('button',{name:'Download my saved data',exact:true}).click();
 const file=await waiting;expect(file.suggestedFilename()).toBe('my-study-house.json');
 const path=await file.path();expect(path).not.toBeNull();return JSON.parse(await readFile(path!,'utf8'));
}
async function cleanup(...contexts:BrowserContext[]){for(const context of contexts)await context.close();}

test('full-house recovery revokes the old controller and preserves identity and saved next step',async({browser})=>{
 const ownerContext=await browser.newContext({viewport:desktop}),peerContext=await browser.newContext({viewport:phone,isMobile:true,hasTouch:true}),recoveredContext=await browser.newContext({viewport:phone,isMobile:true,hasTouch:true});
 try{
  const owner=await ownerContext.newPage(),peer=await peerContext.newPage(),recovered=await recoveredContext.newPage();const errors=trackErrors(owner,peer,recovered);
  await enter(owner,'Recovery Tern');const invite=await code(owner);await enter(peer,'Recovery Jay',invite);
  const before=await me(owner);await owner.getByRole('button',{name:'Study board',exact:true}).click();
  await owner.getByLabel('Small goal',{exact:true}).fill('Keep my original identity');
  await owner.getByLabel('Next step',{exact:true}).fill('Continue my saved derivation');
  await owner.getByRole('button',{name:'Save card',exact:true}).click();
  await expect(peer.locator('#roster')).toContainText('Recovery Tern');
  await settings(owner);await owner.getByRole('button',{name:'Create recovery key',exact:true}).click();
  await expect(owner.locator('#recovery-output')).toHaveText(/^[A-Za-z0-9_-]+$/);
  const proof=(await owner.locator('#recovery-output').innerText()).trim();
  await recovered.goto('/');await recovered.getByRole('button',{name:'Already have a recovery key?',exact:true}).click();
  await recovered.getByLabel('Recovery key',{exact:true}).fill(proof);
  await recovered.getByRole('button',{name:'Recover my identity',exact:true}).click();
  await expect(recovered.locator('#connection-status')).toHaveText('Together, live');
  const after=await me(recovered);expect(after.identity.id).toBe(before.identity.id);expect(after.home.id).toBe(before.home.id);
  await expect(recovered.locator('#roster [data-player-id]')).toHaveCount(2);
  await expect(owner.locator('#lobby')).toBeVisible();
  await expect(owner.locator('#recovery-output')).toHaveText('');
  await recovered.getByRole('button',{name:'Study board',exact:true}).click();
  await expect(recovered.getByLabel('Next step',{exact:true})).toHaveValue('Continue my saved derivation');
  const observer=await recoveredContext.newPage();await observer.goto('/');
  await expect(observer.getByRole('button',{name:'Control from this tab',exact:true})).toBeVisible();
  await observer.getByRole('button',{name:'Control from this tab',exact:true}).click();
  await expect(observer.getByRole('button',{name:'Control from this tab',exact:true})).toBeHidden();
  await expect(recovered.getByRole('button',{name:'Control from this tab',exact:true})).toBeVisible();
  await expect(peer.locator('#roster [data-player-id]')).toHaveCount(2);
  await observer.reload();await expect(observer.locator('#connection-status')).toHaveText('Together, live');
  await expect(observer.getByRole('radio',{name:'Quiet',exact:true})).toBeChecked();expect(errors).toEqual([]);
 }finally{await cleanup(ownerContext,peerContext,recoveredContext);}
});

test('transfer and both departures preserve only each authors own archive and disable the old code',async({browser})=>{
 const a=await browser.newContext({viewport:desktop}),b=await browser.newContext({viewport:phone,isMobile:true,hasTouch:true}),c=await browser.newContext({viewport:desktop});
 try{
  const owner=await a.newPage(),peer=await b.newPage(),late=await c.newPage();const errors=trackErrors(owner,peer,late);
  owner.on('dialog',dialog=>dialog.accept());peer.on('dialog',dialog=>dialog.accept());
  await enter(owner,'Archive Tern');const invite=await code(owner);await enter(peer,'Archive Jay',invite);
  for(const [page,goal,next] of [[owner,'Tern own goal','Tern original next step'],[peer,'Jay own goal','Jay private next step']] as const){
   await page.getByRole('button',{name:'Study board',exact:true}).click();await page.getByLabel('Small goal',{exact:true}).fill(goal);await page.getByLabel('Next step',{exact:true}).fill(next);await page.getByRole('button',{name:'Save card',exact:true}).click();await expect(page.locator('#cards')).toContainText(next);
  }
  await settings(owner);await owner.locator('#membership-actions .member-row').filter({hasText:'Archive Jay'}).getByRole('button',{name:'Transfer ownership',exact:true}).click();
  await settings(peer);await expect(peer.locator('#membership-actions')).toContainText('Archive Jay · owner');
  await owner.getByRole('button',{name:'Leave this house',exact:true}).click();await expect(owner.locator('#lobby')).toBeVisible();
  const ownerExport=await download(owner);expect(JSON.stringify(ownerExport)).toContain('Tern original next step');expect(JSON.stringify(ownerExport)).not.toContain('Jay private next step');
  await expect(peer.locator('#capacity-status')).toContainText('1 of 2');
  await peer.getByRole('button',{name:'Leave this house',exact:true}).click();await expect(peer.locator('#lobby')).toBeVisible();
  const peerExport=await download(peer);expect(JSON.stringify(peerExport)).toContain('Jay private next step');expect(JSON.stringify(peerExport)).not.toContain('Tern original next step');
  await late.goto('/');await late.getByLabel('Your name',{exact:true}).fill('Late Finch');await late.getByLabel('Join code',{exact:true}).fill(invite);
  const response=late.waitForResponse(reply=>new URL(reply.url()).pathname==='/api/house/command'&&reply.request().postDataJSON()?.type==='house.join');
  await late.getByRole('button',{name:'Join house',exact:true}).click();expect((await response).ok()).toBe(false);await expect(late.locator('#lobby')).toBeVisible();
  await expect(late.locator('#lobby-feedback')).toBeVisible();expect((await me(late)).home).toBeNull();expect(errors).toEqual([]);
 }finally{await cleanup(a,b,c);}
});
