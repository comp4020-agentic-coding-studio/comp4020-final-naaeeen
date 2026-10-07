import { test, expect, type Page } from '@playwright/test';

import { beginAdmission, continueSavedHome, chooseCamera, openMyRoom, clickProjectedTarget, projectionFramingFailures } from './house-journey.ts';

const longName = 'W'.repeat(40);
const controls = '.world-status,#resident-disclosure,.availability,.toolbelt,#chat-window,.movement,.touch-toggle,.context-hint,#panel,#notice,#takeover';

// Fixtures use actual admission and browser identity; no renderer-created people.
async function createHouse(page: Page) {
  await beginAdmission(page, 'create');
  // The server accepts 40 characters; the current lobby input is narrower.
  // Admit the server boundary through its real form, explicitly widening this fixture only.
  await page.getByLabel('Your name', { exact: true }).evaluate(el => el.removeAttribute('maxlength'));
  await page.getByLabel('Your name', { exact: true }).fill(longName);
  await page.getByRole('combobox', { name: 'Bedrooms', exact: true }).selectOption('2');
  await page.getByRole('button', { name: 'Create house', exact: true }).click();
  await expect(page.locator('#lobby')).toBeHidden();
  await expect(page.locator('.house-avatar-name')).toHaveCount(1);
  await expect(page.locator('.house-avatar-name')).toHaveAttribute('data-name', longName);
  await expect(page.locator('#notice')).toBeHidden();
}

async function visualViolations(page: Page) {
  return page.evaluate((selector) => {
    const activeControls = [...document.querySelectorAll<HTMLElement>(selector)].filter(el => !el.hidden && !el.closest('[hidden]') && getComputedStyle(el).visibility !== 'hidden').map(el => el.getBoundingClientRect());
    const violations: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>('.house-avatar-name,.own-door,.door,.room')) {
      if (el.hidden || getComputedStyle(el).visibility === 'hidden') continue;
      const rect = el.getBoundingClientRect();
      const range = document.createRange(); range.selectNodeContents(el);
      for (const source of range.getClientRects()) {
        // Range includes clipped text fragments; painted output obeys the element's overflow clip.
        const clipped = getComputedStyle(el).overflowX === 'hidden';
        const glyph = clipped ? { left: Math.max(source.left, rect.left), right: Math.min(source.right, rect.right), top: Math.max(source.top, rect.top), bottom: Math.min(source.bottom, rect.bottom) } : source;
        if (glyph.right <= glyph.left || glyph.bottom <= glyph.top) continue;
        // A bounded box is insufficient: inspect painted text line fragments too.
        if (glyph.left < rect.left - 1 || glyph.right > rect.right + 1 || glyph.top < rect.top - 1 || glyph.bottom > rect.bottom + 1) violations.push('glyph escapes ' + el.className);
        if (glyph.left < 0 || glyph.right > innerWidth || glyph.top < 0 || glyph.bottom > innerHeight) violations.push('glyph outside viewport');
      }
      if (rect.left < 0 || rect.right > innerWidth || rect.top < 0 || rect.bottom > innerHeight) violations.push('box outside viewport');
      if (el.scrollWidth > el.clientWidth + 1) violations.push('text exceeds inline bounds');
      if (activeControls.some(control => rect.left < control.right && rect.right > control.left && rect.top < control.bottom && rect.bottom > control.top)) violations.push('label overlaps active control');
      if ((el.dataset.name === 'W'.repeat(40) || el.textContent?.includes('W'.repeat(40))) && (!el.title.includes('W'.repeat(40)) || !(el.getAttribute('aria-label') || '').includes('W'.repeat(40)))) violations.push('full name unavailable');
    }
    return { viewport: { width: innerWidth, height: innerHeight }, violations };
  }, controls);
}

for (const viewport of [{ width: 1920, height: 1080 }, { width: 390, height: 844 }, { width: 390, height: 520 }]) {
  test('bounds forty unbroken name glyphs at ' + viewport.width + 'x' + viewport.height + (viewport.height === 520 ? ' reduced-height simulation' : ''), async ({ browser }, info) => {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage(), errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await createHouse(page);
      await expect(page.locator('.house-avatar-name')).toBeVisible();
      await expect.poll(async () => (await visualViolations(page)).violations).toEqual([]);
      expect((await visualViolations(page)).viewport).toEqual(viewport);
      await page.screenshot({ path: info.outputPath('forty-unbroken-name.png') });
      // A second tab shares identity but must show the observer's takeover control.
      const observer = await context.newPage();
      observer.on('pageerror', error => errors.push(error.message));
      await observer.goto('/');
      await continueSavedHome(observer);
      await expect(observer.locator('#takeover')).toBeVisible();
      await expect.poll(async () => (await visualViolations(observer)).violations).toEqual([]);
      expect((await visualViolations(observer)).viewport).toEqual(viewport);
      await observer.screenshot({ path: info.outputPath('observer-takeover.png') });
      expect(errors).toEqual([]);
    } finally { await context.close(); }
  });
}

async function projection(page: Page) {
 return page.locator('.house-world-canvas').evaluate(el => {
  const data = (el as HTMLElement).dataset;
  return { x: Number(data.selfX), z: Number(data.selfZ), screenX: Number(data.selfScreenX), screenY: Number(data.selfScreenY), height: Number(data.selfAvatarHeight), left: Number(data.worldLeft), top: Number(data.worldTop), mode: data.cameraMode, mesh: JSON.parse(data.selfMeshBounds || 'null'), area: JSON.parse(data.cameraPlayArea || 'null') };
 });
}
async function selfClear(page: Page) {
 // Mode/area can publish before the resumed RAF publishes the actual mesh projection.
 // Poll all identical numeric framing bounds together using the unchanged default timeout.
 await expect.poll(async () => projectionFramingFailures(await projection(page))).toEqual([]);
}

for (const viewport of [{ width: 1920, height: 1080 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 390, height: 520 }]) {
 test('close camera preserves walking, overview, picking and stable DIY at ' + viewport.width + 'x' + viewport.height + (viewport.height === 520 ? ' reduced-height simulation' : ''), async ({ browser }, info) => {
  test.setTimeout(120_000);
  const context = await browser.newContext({ viewport }), page = await context.newPage(), errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
   await createHouse(page); await selfClear(page);
   const play = await projection(page); expect(play.mode).toBe('play');
   expect(play.height).toBeGreaterThanOrEqual(viewport.width > 1000 ? 96 : 56);
   expect(play.height).toBeLessThanOrEqual(viewport.width > 1000 ? 160 : 88);
   await chooseCamera(page, 'overview');
   await expect(page.locator('canvas')).toHaveAttribute('data-camera-mode', 'overview');
   await expect.poll(async () => (await projection(page)).height).toBeLessThan(play.height);
   expect((await projection(page)).x).toBe(play.x); expect((await projection(page)).z).toBe(play.z);
   await page.locator('canvas').focus(); await page.keyboard.down('ArrowRight');
   try { await page.waitForFunction(start => Number(document.querySelector<HTMLElement>('canvas')?.dataset.selfX) > 1.5, play.x, { timeout: 15_000 }); }
   finally { await page.keyboard.up('ArrowRight'); }
   await expect(page.locator('canvas')).toHaveAttribute('data-camera-mode', 'overview'); await selfClear(page);
   await chooseCamera(page, 'play');
   await expect(page.locator('canvas')).toHaveAttribute('data-camera-mode', 'play');await selfClear(page);
   await expect(page.locator('#notice')).toBeHidden();
   await page.waitForTimeout(2000); const settled = await projection(page); await page.waitForTimeout(5000);
   const idle = await projection(page); expect(Math.abs(idle.left - settled.left)).toBeLessThan(1); expect(Math.abs(idle.top - settled.top)).toBeLessThan(1);
   // Overview exposes the destination; test the actual physical mesh raycast, not an API seat claim.
   await chooseCamera(page, 'overview');
   await clickProjectedTarget(page, { type: 'seat', seatId: 'seat-1' });
   await expect(page.locator('canvas')).toHaveAttribute('data-self-animation', 'sit', { timeout: 30_000 });
   await selfClear(page); await page.waitForTimeout(2000); const sitting = await projection(page); await page.waitForTimeout(1000);
   expect((await projection(page)).left).toBe(sitting.left);
   await page.locator('canvas').focus(); await page.keyboard.press('e');
   await expect(page.locator('canvas')).not.toHaveAttribute('data-self-animation', 'sit');
   await chooseCamera(page, 'play');
   await openMyRoom(page);
   await page.getByRole('button', { name: 'Walk to my room', exact: true }).click();
   await expect(page.locator('#place-label')).toHaveText(longName + "'s room", { timeout: 30_000 }); await selfClear(page);
   await openMyRoom(page);
   await expect(page.locator('canvas')).toHaveAttribute('data-camera-mode', 'inspection');
   await expect.poll(async () => page.evaluate(() => {
    const area=JSON.parse(document.querySelector<HTMLElement>('canvas')?.dataset.cameraPlayArea || 'null'), panel=document.querySelector('#panel')!.getBoundingClientRect();
    return area && !(area.x<panel.right && area.x+area.w>panel.left && area.y<panel.bottom && area.y+area.h>panel.top);
   })).toBe(true);
   const editor = await projection(page); await page.waitForTimeout(1000); expect((await projection(page)).left).toBe(editor.left);
   await expect(page.locator('#placement')).toBeVisible();
   await expect(page.locator('.house-avatar-name')).toHaveCSS('font-size', viewport.width<700?'12px':'13px');
   await expect(page.locator('.chat-bubble')).toHaveCSS('width', viewport.width<700?'184px':'224px');
   await expect(page.locator('.chat-bubble')).toHaveCSS('font-size', viewport.width<700?'13px':'14px');
   await page.getByRole('button', { name: 'Close panel', exact: true }).click();
   await expect(page.locator('canvas')).toHaveAttribute('data-camera-mode', 'play'); await selfClear(page);
   await page.screenshot({ path: info.outputPath('close-camera-bedroom.png') });
   expect(errors).toEqual([]);
  } finally { await context.close(); }
 });
}

test('reduced-motion close play settles without easing and overview stays stationary', async ({ browser }) => {
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage();
 try {
  await createHouse(page);expect(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  await page.locator('canvas').focus();await page.keyboard.down('ArrowRight');
  try{await page.waitForFunction(()=>Number(document.querySelector<HTMLElement>('canvas')?.dataset.selfX)>1.5,null,{timeout:15000});}
  finally{await page.keyboard.up('ArrowRight');}
  await selfClear(page);await page.waitForTimeout(500);const first=await projection(page);await page.waitForTimeout(1000);const next=await projection(page);
  expect(Math.abs(next.left-first.left)).toBeLessThan(1);expect(Math.abs(next.top-first.top)).toBeLessThan(1);
  await chooseCamera(page,'overview');await expect.poll(async()=> (await projection(page)).height).toBeLessThan(first.height);
  const overview=await projection(page);await page.waitForTimeout(1000);expect((await projection(page)).left).toBe(overview.left);
 } finally{await context.close();}
});
