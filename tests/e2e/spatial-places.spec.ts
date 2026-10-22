import { expect, test, type Browser, type BrowserContext, type Page, type TestInfo } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { HouseSnapshot } from '../../src/house-contract.ts';
import type { StudioState } from '../../src/house-studio.ts';
import type { GatheringState } from '../../src/house-gathering.ts';
import { beginAdmission, closeChat, closeTool, continueSavedHome, openChat, openHouseSettings, waitForWorldProjection } from './house-journey.ts';
import { boardSnapshot } from './board-journey.ts';

const desktop = { width: 1920, height: 1080 }, phone = { width: 390, height: 844 };
const studio = (page: Page, action: string) => page.locator(`[data-studio-action="${action}"]`);
const gathering = (page: Page, action: string) => page.locator(`[data-gathering-action="${action}"]`);
const canvas = (page: Page) => page.locator('.house-world-canvas');

async function house(page: Page): Promise<HouseSnapshot> {
  const response = await page.request.get('/api/house/snapshot?zone=lounge');
  expect(response.status()).toBe(200); return response.json();
}
async function roomState(page: Page, roomId: string): Promise<StudioState> {
  const response = await page.request.get(`/api/house/studio?roomId=${roomId}`);
  expect(response.status()).toBe(200); return response.json();
}
async function shared(page: Page, kind: 'sofa' | 'study'): Promise<GatheringState> {
  const response = await page.request.get(`/api/house/gathering?kind=${kind}`);
  expect(response.status()).toBe(200); return response.json();
}
async function live(page: Page) {
  await expect(page.locator('#connection-status')).toHaveText('Together, live');
  await expect(canvas(page)).toHaveAttribute('data-self-x', /^-?\d/);
}
async function hideChatOnly(page: Page) {
  if (await page.locator('#chat-window').isVisible()) await page.getByRole('button', { name: 'Close chat', exact: true }).click();
}
async function friends(browser: Browser, baseURL: string | undefined, count: 2 | 3 = 3) {
  if (!baseURL) throw new Error('The native spatial journeys require their configured baseURL.');
  const contexts: BrowserContext[] = [];
  try {
  for (const options of [{ viewport: desktop }, { viewport: phone, isMobile: true, hasTouch: true }, { viewport: desktop }].slice(0, count)) {
    contexts.push(await browser.newContext({ baseURL, ...options }));
  }
  const pages = await Promise.all(contexts.map(context => context.newPage()));
  const errors: string[] = [], identities: string[] = [];
  let code = '', houseId = '';
  await audioObservation(pages[1]);
  for (const [index, page] of pages.entries()) {
    page.on('pageerror', error => errors.push(`${index}: ${error.message}`));
    await beginAdmission(page, index ? 'join' : 'create');
    await page.getByLabel('Your name', { exact: true }).fill(['Native Rowan', 'Native Wren', 'Native Finch'][index]);
    if (!index) await page.getByRole('combobox', { name: 'Bedrooms', exact: true }).selectOption('3');
    else await page.getByLabel('House code', { exact: true }).fill(code);
    await page.getByRole('button', { name: index ? 'Join house' : 'Create house', exact: true }).click();
    await live(page);
    const snapshot = await house(page); identities.push(snapshot.selfId);
    if (!index) {
      houseId = snapshot.house.id; await openHouseSettings(page);
      code = (await page.locator('#join-code-display').innerText()).trim(); await closeTool(page);
    }
    expect(snapshot.house.id).toBe(houseId);
    // Keep idle worlds paused through their ordinary UI, as in the maintained picture task.
    await page.getByRole('button', { name: 'Pause and options', exact: true }).click();
    await expect(canvas(page)).toHaveAttribute('data-suspended', 'true');
  }
  expect(new Set(identities).size).toBe(count);
  return { contexts, pages, errors, identities, houseId };
  } catch (error) { await Promise.allSettled(contexts.map(context => context.close())); throw error; }
}
async function place(page: Page, name: 'room' | 'rest' | 'study') {
  await closeChat(page); await closeTool(page);
  await page.getByRole('button', { name: 'Places', exact: true }).click();
  await page.locator(`#places-panel [data-place="${name}"]`).click();
  if (name === 'room') {
    await expect(canvas(page)).not.toHaveAttribute('data-zone-id', 'lounge', { timeout: 30_000 });
    await page.getByRole('button', { name: 'Room studio', exact: true }).click();
    await expect(page.locator('#studio-panel')).toBeVisible();
  } else {
    await expect(page.locator('#gathering-panel')).toBeVisible({ timeout: 30_000 });
    await expect(canvas(page)).toHaveAttribute('data-self-animation', 'sit');
    await expect(gathering(page, 'join')).toBeEnabled();
  }
}
async function choosePng(page: Page) {
  // This is a real browser-encoded PNG fixture, then a native file-input upload.
  const data = await page.evaluate(() => {
    const image = document.createElement('canvas'); image.width = 320; image.height = 240;
    const ctx = image.getContext('2d'); if (!ctx) throw new Error('PNG fixture requires native 2D encoding.');
    ctx.fillStyle = '#143c3a'; ctx.fillRect(0, 0, 320, 240);
    ctx.fillStyle = '#f4c56e'; ctx.fillRect(24, 24, 96, 96);
    ctx.fillStyle = '#ffffff'; ctx.font = '20px sans-serif'; ctx.fillText('Rowan reference', 24, 184);
    return image.toDataURL('image/png').split(',')[1];
  });
  await page.locator('[data-studio-file]').setInputFiles({ name: 'rowan-reference.png', mimeType: 'image/png', buffer: Buffer.from(data, 'base64') });
  await expect(studio(page, 'upload')).toBeEnabled(); await studio(page, 'upload').click();
  await decodedImage(page, '[data-studio-image]');
  const roomId = (await canvas(page).getAttribute('data-zone-id'))!;
  const saved = await roomState(page, roomId);
  expect(saved.image).toMatchObject({ width: 320, height: 240 });
  const response = await page.request.get(`/api/house/studio/image?roomId=${roomId}&imageId=${saved.image!.id}`);
  expect(response.status()).toBe(200); expect(response.headers()['content-type']).toBe('image/png');
  const bytes = await response.body(); expect(bytes.length).toBeLessThanOrEqual(262144);
  return { roomId, saved, bytes, sha256: createHash('sha256').update(bytes).digest('hex') };
}
async function decodedImage(page: Page, selector: string) {
  const image = page.locator(selector); await expect(image).toBeVisible();
  await expect(image).toHaveAttribute('src', /^blob:/);
  await expect(image).toHaveJSProperty('complete', true);
  await expect(image).toHaveJSProperty('naturalWidth', 320);
  await expect(image).toHaveJSProperty('naturalHeight', 240);
}
async function exitRoom(page: Page) {
  await closeChat(page); await closeTool(page); await waitForWorldProjection(page);
  const world = canvas(page);
  await expect.poll(() => world.evaluate(el => JSON.parse((el as HTMLElement).dataset.pickTargets || '[]')
    .find((entry: { target: { type: string }; visible: boolean }) => entry.target.type === 'exit')?.visible)).toBe(true);
  const target = await world.evaluate(el => JSON.parse((el as HTMLElement).dataset.pickTargets || '[]')
    .find((entry: { target: { type: string }; x: number; y: number }) => entry.target.type === 'exit'));
  const bounds = await world.boundingBox(); expect(bounds).not.toBeNull();
  const point = { x: bounds!.x + target.x, y: bounds!.y + target.y };
  expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y) === document.querySelector('.house-world-canvas'), point)).toBe(true);
  if (page.viewportSize()?.width === phone.width) await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);
  await expect(world).toHaveAttribute('data-zone-id', 'lounge', { timeout: 30_000 });
}
async function visit(page: Page, id: string, roomId: string) {
  await closeChat(page); await closeTool(page);
  await page.getByRole('button', { name: 'Places', exact: true }).click();
  await page.locator(`#resident-visits [data-visit-resident="${id}"]`).click();
  await expect(canvas(page)).toHaveAttribute('data-zone-id', roomId, { timeout: 30_000 });
  await page.getByRole('button', { name: 'Room studio', exact: true }).click();
  await expect(page.locator('#studio-panel')).toBeVisible();
}
async function bounds(page: Page, selector: string) {
  const target = page.locator(selector); await target.scrollIntoViewIfNeeded();
  expect(await target.evaluate(element => {
    const r = element.getBoundingClientRect(), point = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return r.width > 0 && r.height > 0 && r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1 && Boolean(point && (element === point || element.contains(point)));
  })).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
async function readableGathering(page: Page) {
  const values = await page.locator('[data-gathering-roster], [data-gathering-role], [data-gathering-explanation]').evaluateAll(elements => {
    const channels = (color: string) => (color.match(/[\d.]+/g) || []).map(Number);
    const luminance = (rgb: number[]) => rgb.slice(0, 3).map(value => value / 255)
      .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
      .reduce((total, value, index) => total + value * [.2126, .7152, .0722][index], 0);
    return elements.map(element => {
      let parent: Element | null = element, background: number[] = [];
      while (parent) { background = channels(getComputedStyle(parent).backgroundColor); if (background.length === 3 || background[3] === 1) break; parent = parent.parentElement; }
      const foreground = channels(getComputedStyle(element).color), a = luminance(foreground), b = luminance(background);
      return { text: element.textContent?.trim(), contrast: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) };
    });
  });
  expect(values).toHaveLength(3);
  for (const value of values) { expect(value.text).not.toBe(''); expect(value.contrast).toBeGreaterThanOrEqual(4.5); }
}
async function evidence(page: Page, info: TestInfo, name: string) {
  await page.screenshot({ path: info.outputPath(`${name}.png`) });
  await info.attach(name, { path: info.outputPath(`${name}.png`), contentType: 'image/png' });
}
async function audioObservation(page: Page) {
  // Observe actual native contexts. The proxy returns the unmodified real context and methods.
  await page.addInitScript(() => {
    const win = window as typeof window & { __nativeAudio?: AudioContext[] };
    win.__nativeAudio = [];
    window.AudioContext = new Proxy(window.AudioContext, { construct(target, args) {
      const context = Reflect.construct(target, args) as AudioContext; win.__nativeAudio!.push(context); return context;
    } });
  });
}
const audioStates = (page: Page) => page.evaluate(() => (window as typeof window & { __nativeAudio?: AudioContext[] }).__nativeAudio?.map(value => value.state) || []);
const imageUrlDecodes = (page: Page, url: string) => page.evaluate(value => new Promise<boolean>(resolve => {
  // CSP deliberately permits blob images while connect-src restricts fetch to self.
  const image = new Image(), timer = setTimeout(() => resolve(false), 5000);
  image.onload = () => { clearTimeout(timer); resolve(image.naturalWidth > 0); };
  image.onerror = () => { clearTimeout(timer); resolve(false); }; image.src = value;
}), url);

test('room reference survives owner return and a named phone visit loses bytes and sound when access ends', async ({ browser, baseURL }, info) => {
  // Admission runs after instrumentation so opening a desk can prove it stays silent.
  const group = await friends(browser, baseURL), [owner, peer, observer] = group.pages;
  try {
    await place(owner, 'room'); const uploaded = await choosePng(owner);
    await studio(owner, 'zoom-in').click(); await studio(owner, 'right').click(); await studio(owner, 'save-view').click();
    await expect(pageView(owner)).toHaveText('Saved view');
    await owner.locator('[data-studio-preset]').selectOption('rain'); await studio(owner, 'save-preset').click();
    await expect(owner.locator('[data-studio-preset-label]')).toHaveText('Saved preset: rain');
    const saved = await roomState(owner, uploaded.roomId); expect(saved.view.zoom).toBeGreaterThan(1); expect(saved.view.x).toBeGreaterThan(.5);
    await studio(owner, 'close').click(); await owner.getByRole('button', { name: 'Room studio', exact: true }).click();
    await expect(owner.locator('[data-studio-zoom]')).toHaveText(`${Math.round(saved.view.zoom * 100)}%`);
    const downloaded = owner.waitForEvent('download'); await studio(owner, 'export').click();
    const exportFile = await downloaded, exportPath = await exportFile.path(); expect(exportPath).not.toBeNull();
    const exported = JSON.parse(await readFile(exportPath!, 'utf8'));
    expect(exported).toMatchObject({ roomId: uploaded.roomId, ownerId: group.identities[0], view: saved.view, soundscape: 'rain' });
    expect(createHash('sha256').update(Buffer.from(exported.image.data, 'base64')).digest('hex')).toBe(uploaded.sha256);
    await bounds(owner, '[data-studio-viewport]'); await evidence(owner, info, 'room-studio-desktop');
    await closeTool(owner); await expect(canvas(owner)).toHaveAttribute('data-studio-preview', 'true');
    await owner.getByRole('button', { name: 'Overview', exact: true }).click(); await waitForWorldProjection(owner);
    await evidence(owner, info, 'room-reference-world-after-close');
    await owner.getByRole('button', { name: 'My room', exact: true }).click();
    await owner.getByLabel('Open my room to current housemates', { exact: true }).check();
    await owner.getByRole('button', { name: 'Save room settings', exact: true }).click();
    await expect.poll(async () => (await house(peer)).residents[0].open).toBe(true);
    await visit(peer, group.identities[0], uploaded.roomId);
    await expect(peer.locator('[data-studio-owner]')).toHaveText('Native Rowan’s reference desk');
    await expect(peer.locator('[data-studio-owner-controls]')).toBeHidden();
    await expect(peer.locator('[data-studio-preset-controls]')).toBeHidden();
    await expect(studio(peer, 'export')).toBeHidden();
    await decodedImage(peer, '[data-studio-image]');
    const guest = await roomState(peer, uploaded.roomId); expect(guest).toMatchObject({ ownerId: group.identities[0], writable: false, image: saved.image, view: saved.view });
    const imageURL = (await peer.locator('[data-studio-image]').getAttribute('src'))!;
    expect(await imageUrlDecodes(peer, imageURL)).toBe(true);
    expect(await audioStates(peer)).toEqual([]);
    await studio(peer, 'zoom-in').click(); expect((await roomState(owner, uploaded.roomId)).view).toEqual(saved.view);
    await bounds(peer, '[data-studio-viewport]'); await evidence(peer, info, 'room-visit-phone');
    await studio(peer, 'chat').tap();
    await peer.getByLabel('Message this room', { exact: true }).fill('The gold square belongs to this bedroom.');
    await peer.getByRole('button', { name: 'Send', exact: true }).tap();
    await openChat(owner); await expect(owner.locator('#transcript')).toContainText('The gold square belongs to this bedroom.');
    expect((await house(observer)).chat.some(message => message.text === 'The gold square belongs to this bedroom.')).toBe(false);
    await closeChat(owner); await owner.getByRole('button', { name: 'My room', exact: true }).click(); await hideChatOnly(peer);
    await studio(peer, 'listen').click(); await expect(peer.locator('[data-studio-audio-status]')).toHaveText('Sound is playing on this device.');
    await expect.poll(() => audioStates(peer)).toEqual(['running']);
    await owner.getByLabel('Open my room to current housemates', { exact: true }).uncheck();
    await owner.getByRole('button', { name: 'Save room settings', exact: true }).click();
    await expect(canvas(peer)).toHaveAttribute('data-zone-id', 'lounge'); await expect(peer.locator('#studio-panel')).toBeHidden();
    await expect(peer.locator('[data-studio-image]')).not.toHaveAttribute('src');
    await expect.poll(() => audioStates(peer)).toEqual(['closed']);
    expect(await imageUrlDecodes(peer, imageURL)).toBe(false);
    expect((await peer.request.get(`/api/house/studio/image?roomId=${uploaded.roomId}&imageId=${saved.image!.id}`)).status()).toBe(403);
    expect((await observer.request.get(`/api/house/studio?roomId=${uploaded.roomId}`)).status()).toBe(403);
    await info.attach('saved-owner-reference', { body: JSON.stringify({ houseId: group.houseId, identities: group.identities, saved, pngSHA256: uploaded.sha256, audio: await audioStates(peer) }, null, 2), contentType: 'application/json' });
    await peer.reload(); await continueSavedHome(peer); await live(peer);
    expect((await house(peer)).selfId).toBe(group.identities[1]);
    await expect(canvas(peer)).toHaveAttribute('data-zone-id', 'lounge');
    expect(group.errors).toEqual([]);
  } finally { await Promise.allSettled(group.contexts.map(context => context.close())); }
});
function pageView(page: Page) { return page.locator('[data-studio-save-status]'); }

test('sofa needs a real chair and Join before a deliberate house copy, follow and pointing', async ({ browser, baseURL }, info) => {
  const group = await friends(browser, baseURL, 2), [owner, peer] = group.pages;
  try {
    await place(owner, 'room'); const uploaded = await choosePng(owner); await exitRoom(owner);
    await place(owner, 'rest'); await expect(peer.locator('#gathering-panel')).toBeHidden(); await place(peer, 'rest');
    expect((await shared(owner, 'sofa')).members).toEqual([]);
    await expect(gathering(owner, 'publish')).toBeDisabled();
    await gathering(owner, 'join').click(); await expect(owner.locator('[data-gathering-role]')).toContainText('You joined.');
    await gathering(peer, 'join').tap(); await expect(peer.locator('[data-gathering-role]')).toContainText('You joined.');
    await gathering(owner, 'publish').click();
    await decodedImage(owner, '[data-gathering-image]'); await decodedImage(peer, '[data-gathering-image]');
    const state = await shared(peer, 'sofa'); expect(state.members.map(value => value.actorId)).toEqual(group.identities.slice(0, 2));
    expect(state.presenterId).toBe(group.identities[0]); expect(state.item?.ownerId).toBe(group.identities[0]);
    const image = await peer.request.get(`/api/house/gathering/image?kind=sofa&itemId=${state.item!.id}`);
    expect(image.status()).toBe(200); expect(createHash('sha256').update(await image.body()).digest('hex')).toBe(uploaded.sha256);
    await expect(gathering(peer, 'follow')).toHaveAttribute('aria-pressed', 'false'); await gathering(peer, 'follow').tap();
    await expect(gathering(peer, 'follow')).toHaveAttribute('aria-pressed', 'true');
    await gathering(owner, 'in').click(); await expect.poll(async () => (await shared(owner, 'sofa')).view.zoom).toBe(1.25);
    await expect(peer.locator('[data-gathering-plane]')).toHaveCSS('transform', await owner.locator('[data-gathering-plane]').evaluate(el => getComputedStyle(el).transform));
    const viewport = owner.locator('[data-gathering-viewport]'), picture = owner.locator('[data-gathering-image]');
    const imageBox = await picture.boundingBox(), viewportBox = await viewport.boundingBox();
    expect(imageBox).not.toBeNull(); expect(viewportBox).not.toBeNull();
    const left = Math.max(imageBox!.x, viewportBox!.x), right = Math.min(imageBox!.x + imageBox!.width, viewportBox!.x + viewportBox!.width);
    const top = Math.max(imageBox!.y, viewportBox!.y), bottom = Math.min(imageBox!.y + imageBox!.height, viewportBox!.y + viewportBox!.height);
    expect(right).toBeGreaterThan(left); expect(bottom).toBeGreaterThan(top);
    await owner.mouse.click((left + right) / 2, (top + bottom) / 2);
    await expect.poll(async () => (await shared(peer, 'sofa')).pointer).not.toBeNull();
    await expect(peer.locator('[data-gathering-pointer]')).toBeVisible();
    await readableGathering(owner); await readableGathering(peer);
    await bounds(peer, '[data-gathering-viewport]');
    const peerViewport = (await peer.locator('[data-gathering-viewport]').boundingBox())!;
    await expect.poll(async () => {
      const point = await peer.locator('[data-gathering-pointer]').boundingBox();
      return Boolean(point && point.x >= peerViewport.x && point.y >= peerViewport.y && point.x + point.width <= peerViewport.x + peerViewport.width && point.y + point.height <= peerViewport.y + peerViewport.height);
    }).toBe(true);
    await evidence(peer, info, 'sofa-follow-phone');
    await bounds(owner, '[data-gathering-viewport]'); await evidence(owner, info, 'sofa-presenter-desktop');
    await gathering(peer, 'leave').tap(); await expect.poll(async () => (await shared(peer, 'sofa')).selfJoined).toBe(false);
    await expect(canvas(peer)).toHaveAttribute('data-self-animation', 'sit');
    await gathering(peer, 'close').tap(); await expect(peer.locator('#gathering-panel')).toBeHidden();
    await peer.locator('#game-table-stand').tap(); await expect(canvas(peer)).not.toHaveAttribute('data-self-animation', 'sit');
    await place(peer, 'rest'); await expect(gathering(peer, 'join')).toBeVisible(); expect((await shared(peer, 'sofa')).selfJoined).toBe(false);
    await expect(gathering(peer, 'follow')).toHaveAttribute('aria-pressed', 'false');
    await info.attach('sofa-saved-state', { body: JSON.stringify({ houseId: group.houseId, state, afterReseat: await shared(peer, 'sofa') }, null, 2), contentType: 'application/json' });
    expect(group.errors).toEqual([]);
  } finally { await Promise.allSettled(group.contexts.map(context => context.close())); }
});

test('study huddle keeps explicit consent across its independent board and clears on membership loss', async ({ browser, baseURL }, info) => {
  const group = await friends(browser, baseURL, 2), [owner, peer] = group.pages;
  try {
    await place(owner, 'study'); await place(peer, 'study');
    expect((await shared(owner, 'study')).members).toEqual([]);
    await gathering(owner, 'join').click(); await expect(owner.locator('[data-gathering-role]')).toContainText('You joined.');
    await gathering(peer, 'join').tap(); await expect(peer.locator('[data-gathering-role]')).toContainText('You joined.');
    await gathering(owner, 'share').click(); await expect.poll(async () => (await shared(peer, 'study')).presenterId).toBe(group.identities[0]);
    await gathering(peer, 'follow').tap(); await expect(peer.locator('#board-frame')).toBeVisible();
    await expect(peer.locator('#board-status')).toHaveText('Independent board · huddle kept at your seat');
    const board = peer.frameLocator('#board-frame'); await expect(board.locator('.excalidraw')).toBeVisible();
    await board.getByRole('button', { name: 'Sticky note', exact: true }).tap();
    await board.getByLabel('Your note', { exact: true }).fill('A huddle explanation saved on the independent board');
    await board.getByRole('button', { name: 'Place note', exact: true }).tap();
    await expect.poll(async () => (await boardSnapshot(owner, group.houseId)).elements.some(element =>
      element.type === 'text' && !element.isDeleted && element.originalText === 'A huddle explanation saved on the independent board')).toBe(true);
    expect((await shared(peer, 'study')).selfJoined).toBe(true); await expect(owner.locator('#board-frame')).toHaveCount(0);
    await peer.getByRole('button', { name: 'Return to house', exact: true }).tap();
    await expect(peer.locator('#gathering-panel')).toBeVisible(); await expect(peer.locator('[data-gathering-role]')).toContainText('You joined.');
    await expect(canvas(peer)).toHaveAttribute('data-self-animation', 'sit');
    await readableGathering(owner); await readableGathering(peer);
    await gathering(peer, 'chat').tap(); await expect(peer.locator('#chat-title')).toHaveText('Lounge chat');
    await peer.getByLabel('Message this room', { exact: true }).fill('The board stays independent from our huddle.');
    await peer.getByRole('button', { name: 'Send', exact: true }).tap();
    await gathering(owner, 'chat').click(); await expect(owner.locator('#transcript')).toContainText('The board stays independent from our huddle.');
    await bounds(peer, '#transcript'); await bounds(peer, '#chat-input'); await evidence(peer, info, 'study-chat-phone');
    await hideChatOnly(peer); await gathering(peer, 'close').tap(); await expect.poll(async () => (await shared(peer, 'study')).selfJoined).toBe(false);
    await peer.locator('#game-table-stand').tap(); await expect(canvas(peer)).not.toHaveAttribute('data-self-animation', 'sit');
    await place(peer, 'study'); await expect(gathering(peer, 'join')).toBeVisible();
    await gathering(peer, 'board').tap(); await expect(peer.locator('#board-frame')).toBeVisible();
    await expect(peer.frameLocator('#board-frame').locator('.excalidraw')).toBeVisible();
    expect((await shared(peer, 'study')).selfJoined).toBe(false);
    const beforeRemoval = await shared(peer, 'study');
    await openHouseSettings(owner); owner.once('dialog', dialog => dialog.accept());
    await owner.locator('#membership-actions .member-row').filter({ hasText: 'Native Wren' }).getByRole('button', { name: 'Remove member', exact: true }).click();
    await expect(peer.locator('#title-screen')).toBeVisible();
    await expect(peer.locator('#board-frame')).toHaveCount(0); await expect(peer.locator('#gathering-panel')).toBeHidden();
    await info.attach('study-consent-and-access-loss', { body: JSON.stringify({ houseId: group.houseId, identities: group.identities, stateBeforeRemoval: beforeRemoval, boardClearedAfterRemoval: true }, null, 2), contentType: 'application/json' });
    expect(group.errors).toEqual([]);
  } finally { await Promise.allSettled(group.contexts.map(context => context.close())); }
});

test('chat drafts keep both room scopes through a real bedroom exit and return', async ({ browser, baseURL }, info) => {
  const group = await friends(browser, baseURL, 2), [owner] = group.pages;
  try {
    await openChat(owner); await owner.getByLabel('Message this room', { exact: true }).fill('Lounge draft stays in lounge');
    await place(owner, 'room'); const roomId = (await canvas(owner).getAttribute('data-zone-id'))!;
    await studio(owner, 'chat').click(); await expect(owner.getByLabel('Message this room', { exact: true })).toHaveValue('');
    await owner.getByLabel('Message this room', { exact: true }).fill('Bedroom draft stays in bedroom');
    await exitRoom(owner); await openChat(owner); await expect(owner.getByLabel('Message this room', { exact: true })).toHaveValue('Lounge draft stays in lounge');
    await place(owner, 'room'); await expect(canvas(owner)).toHaveAttribute('data-zone-id', roomId);
    await studio(owner, 'chat').click(); await expect(owner.getByLabel('Message this room', { exact: true })).toHaveValue('Bedroom draft stays in bedroom');
    await bounds(owner, '#chat-input');
    await info.attach('retained-scoped-drafts', { body: JSON.stringify({ houseId: group.houseId, identity: group.identities[0], roomId, loungeDraft: 'Lounge draft stays in lounge', bedroomDraft: 'Bedroom draft stays in bedroom' }, null, 2), contentType: 'application/json' });
    expect(group.errors).toEqual([]);
  } finally { await Promise.allSettled(group.contexts.map(context => context.close())); }
});
