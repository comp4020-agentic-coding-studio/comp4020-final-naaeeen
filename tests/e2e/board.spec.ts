import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import {
  boardFixtureOrigin, boardMe, boardSnapshot, closeBoardContexts, createBoardHouse,
  editorCanvas, houseMembership, joinBoardHouse, newBoardContext, requestedGameAssets,
  viewportFits, visibleBox, writeNativePngClipboard,
} from './board-journey.ts';

// Playwright 1.63 also captures password.value in automatic AI error context.
// Keep this worker-local safeguard through teardown; it does not change app config.
process.env.PLAYWRIGHT_NO_COPY_PROMPT = '1';

// Private keys must never enter automatic traces, videos, failure screenshots or
// password-field assertion output. Public canvas artifacts are explicit below.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });
const POLL = { timeout: 10_000, intervals: [100, 250, 500] };

test('standalone board core shares a saved canvas without the game', async ({ browser, baseURL }, info) => {
  test.setTimeout(60_000);
  const origin = boardFixtureOrigin(baseURL);
  const contexts: BrowserContext[] = [];
  const urls: string[] = [], errors: string[] = [], peerAssets: string[] = [];
  try {
    const desktop = await newBoardContext(browser, origin); contexts.push(desktop);
    const phone = await newBoardContext(browser, origin, true); contexts.push(phone);
    const author = await desktop.newPage(), peer = await phone.newPage();
    peer.on('response', response => { if (response.status() === 200 && new URL(response.url()).pathname === '/api/board/asset') peerAssets.push(response.url()); });
    for (const page of [author, peer]) {
      page.on('request', request => urls.push(request.url()));
      page.on('pageerror', error => errors.push(error.message));
    }
    const original = await createBoardHouse(author, 'Board author', 2), houseId = original.home.id;
    const joined = await joinBoardHouse(peer, 'Board peer', original.home.code);
    expect(joined.identity.id).not.toBe(original.identity.id);
    expect(joined.home?.id).toBe(houseId);
    await viewportFits(author); await viewportFits(peer, true);
    // Both peers must be present before either user moves a canvas pointer.
    await expect(author.locator('.resident-avatar')).toHaveCount(2);
    await expect(peer.locator('.resident-avatar')).toHaveCount(2);
    await expect(author.locator('.resident-avatar[title="Board peer"]')).toBeVisible();
    // The phone header hides this roster; this is subscription data, not a visible badge.
    await expect(peer.locator('.resident-avatar[title="Board author"]')).toHaveCount(1);

    const note = 'A shared idea\nAn author-written next step';
    await author.getByRole('button', { name: 'Sticky note', exact: true }).click();
    await author.getByLabel('Your note', { exact: true }).fill(note);
    await author.getByRole('button', { name: 'Place note', exact: true }).click();
    await expect.poll(async () => (await boardSnapshot(author, houseId)).elements.some(element =>
      element.type === 'text' && Boolean(element.containerId) && element.originalText === note), POLL).toBe(true);
    const sticky = await boardSnapshot(author, houseId);
    expect(sticky.elements.some(element => element.type === 'rectangle' && Array.isArray(element.boundElements) &&
      element.boundElements.some(bound => bound.type === 'text'))).toBe(true);

    const pastedText = 'A pasted board note\nWith another line';
    const beforePasteIds = new Set(sticky.elements.map(element => element.id));
    await author.evaluate(async text => navigator.clipboard.writeText(text), pastedText);
    await editorCanvas(author).click({ position: { x: 550, y: 300 } });
    await author.keyboard.press('Control+V');
    // Ordinary native paste creates one text object per line in Excalidraw.
    await expect.poll(async () => (await boardSnapshot(author, houseId)).elements
      .filter(element => element.type === 'text' && !element.isDeleted && !beforePasteIds.has(element.id))
      .sort((a, b) => Number(a.y) - Number(b.y)).map(element => element.originalText), POLL).toEqual(pastedText.split('\n'));
    await expect.poll(async () => (await boardSnapshot(peer, houseId)).elements
      .filter(element => element.type === 'text' && !element.isDeleted && !beforePasteIds.has(element.id))
      .sort((a, b) => Number(a.y) - Number(b.y)).map(element => element.originalText), POLL).toEqual(pastedText.split('\n'));

    const beforeChat = (await boardSnapshot(author, houseId)).elements.map(element => element.id).sort();
    const message = 'A native shortcut\nSecond line';
    await author.getByLabel('Message to everyone in your house', { exact: true }).fill(message);
    await author.getByLabel('Message to everyone in your house', { exact: true }).press('Control+Enter');
    await expect(peer.locator('.chat-log')).toContainText(message);
    await expect(peer.locator('.chat-log article p').filter({ hasText: message })).toBeVisible();
    await expect(author.getByLabel('Message to everyone in your house', { exact: true })).toHaveValue('');
    expect((await boardSnapshot(author, houseId)).elements.map(element => element.id).sort()).toEqual(beforeChat);
    expect(await peer.locator('.chat-log b').count()).toBe(0);

    await writeNativePngClipboard(author);
    await editorCanvas(author).click({ position: { x: 550, y: 300 } });
    await author.keyboard.press('Control+V');
    await expect.poll(async () => (await boardSnapshot(author, houseId)).elements.some(element =>
      element.type === 'image' && !element.isDeleted), POLL).toBe(true);
    const afterPaste = await boardSnapshot(author, houseId), picture = afterPaste.elements.find(element => element.type === 'image' && !element.isDeleted);
    if (!picture || typeof picture.fileId !== 'string') throw new Error('Native image paste must save an image and separate file metadata.');
    await expect.poll(async () => (await boardSnapshot(peer, houseId)).files.some(file => file.id === picture.fileId), POLL).toBe(true);
    expect(afterPaste.files.every(file => !('dataURL' in file))).toBe(true);
    await expect.poll(() => peerAssets.some(url => new URL(url).searchParams.get('fileId') === picture.fileId), POLL).toBe(true);

    await peer.getByRole('button', { name: 'Collapse house chat', exact: true }).click();
    await editorCanvas(peer).click({ position: { x: 200, y: 160 } });
    await peer.keyboard.press('r');
    const boardBounds = await visibleBox(editorCanvas(peer), 'Phone canvas');
    await peer.mouse.move(boardBounds.x + 120, boardBounds.y + 180);
    await peer.mouse.down();
    await peer.mouse.move(boardBounds.x + 220, boardBounds.y + 260, { steps: 8 });
    await peer.mouse.up();
    const previousIds = new Set(afterPaste.elements.map(element => element.id));
    await expect.poll(async () => (await boardSnapshot(author, houseId)).elements.some(element =>
      element.type === 'rectangle' && !element.isDeleted && !previousIds.has(element.id)), POLL).toBe(true);
    const peerDrawing = (await boardSnapshot(author, houseId)).elements.find(element =>
      element.type === 'rectangle' && !element.isDeleted && !previousIds.has(element.id));
    if (!peerDrawing) throw new Error('The peer native rectangle gesture must create its own durable object.');

    await author.locator('.excalidraw').focus();
    await author.keyboard.press('Control+z');
    await expect.poll(async () => (await boardSnapshot(author, houseId)).elements.some(element =>
      element.id === picture.id && element.isDeleted), POLL).toBe(true);
    expect((await boardSnapshot(author, houseId)).elements.some(element => element.id === peerDrawing.id && !element.isDeleted)).toBe(true);
    await author.keyboard.press('Control+Shift+z');
    await expect.poll(async () => (await boardSnapshot(author, houseId)).elements.some(element =>
      element.id === picture.id && !element.isDeleted && element.version > picture.version), POLL).toBe(true);
    expect((await boardSnapshot(peer, houseId)).elements.some(element => element.id === peerDrawing.id && !element.isDeleted)).toBe(true);

    const chat = author.locator('.chat-window'), handle = author.locator('.chat-handle');
    const oldChat = await visibleBox(chat, 'Desktop companion'), grip = await visibleBox(handle, 'Companion handle');
    await author.mouse.move(grip.x + 45, grip.y + 16); await author.mouse.down();
    await author.mouse.move(grip.x - 220, grip.y - 100, { steps: 5 }); await author.mouse.up();
    const moved = await visibleBox(chat, 'Moved companion');
    expect(moved.x).toBeLessThan(oldChat.x); expect(moved.y).toBeLessThan(oldChat.y);
    const resize = await visibleBox(author.locator('.chat-resize'), 'Companion resize handle');
    await author.mouse.move(resize.x + 7, resize.y + 7); await author.mouse.down();
    await author.mouse.move(resize.x - 35, resize.y - 45, { steps: 5 }); await author.mouse.up();
    expect((await visibleBox(chat, 'Resized companion')).width).toBeLessThan(moved.width);
    await author.getByRole('button', { name: 'Collapse house chat', exact: true }).click();
    await expect(author.getByLabel('Message to everyone in your house', { exact: true })).toBeHidden();
    await author.getByRole('button', { name: 'Expand house chat', exact: true }).click();
    await expect(author.getByLabel('Message to everyone in your house', { exact: true })).toBeVisible();

    const pngEvent = author.waitForEvent('download');
    await author.getByRole('button', { name: 'Download PNG', exact: true }).click();
    const png = await pngEvent, pngPath = info.outputPath('shared-board.png');
    await png.saveAs(pngPath); expect(png.suggestedFilename()).toBe('house-board.png');
    const pixels = await readFile(pngPath);
    expect([...pixels.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(pixels.readUInt32BE(16)).toBeGreaterThan(0); expect(pixels.readUInt32BE(20)).toBeGreaterThan(0);
    const sceneEvent = author.waitForEvent('download');
    await author.getByRole('button', { name: 'Download canvas file', exact: true }).click();
    const scene = await sceneEvent, scenePath = info.outputPath('shared-board.excalidraw');
    await scene.saveAs(scenePath);
    const exported = JSON.parse(await readFile(scenePath, 'utf8')) as { elements: { id: string; isDeleted: boolean }[] };
    expect(exported.elements.some(element => element.id === peerDrawing.id && !element.isDeleted)).toBe(true);
    expect(exported.elements.some(element => element.id === picture.id && !element.isDeleted)).toBe(true);

    await author.reload(); await expect(editorCanvas(author)).toBeVisible();
    await expect.poll(async () => (await boardSnapshot(author, houseId)).elements.some(element => element.id === peerDrawing.id && !element.isDeleted), POLL).toBe(true);
    expect((await boardMe(author)).identity.id).toBe(original.identity.id);
    await viewportFits(author); await viewportFits(peer, true);
    await expect(author.locator('#issued-identity-key, #recover-identity-key')).toHaveCount(0);
    await author.screenshot({ path: info.outputPath('board-desktop.png'), animations: 'disabled' });
    await peer.screenshot({ path: info.outputPath('board-phone.png'), animations: 'disabled' });
    expect(requestedGameAssets(urls)).toEqual([]);
    await expect(author.locator('.house-world-canvas')).toHaveCount(0);
    await expect(peer.locator('.house-world-canvas')).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally { await closeBoardContexts(contexts); }
});

test('standalone board identity recovers its original place in a full house', async ({ browser, baseURL }) => {
  test.setTimeout(60_000);
  test.skip(Boolean(process.env.DEBUG || process.env.PWDEBUG), 'Private credential checks require debug logging to be disabled.');
  const contexts: BrowserContext[] = [], pages: Page[] = [], urls: string[] = [], errorNames: string[] = [];
  let privateProof = '', cold: Page | undefined, checkpoint = 'create';
  try {
    const origin = boardFixtureOrigin(baseURL);
    const authorContext = await newBoardContext(browser, origin); contexts.push(authorContext);
    const peerContext = await newBoardContext(browser, origin, true); contexts.push(peerContext);
    const coldContext = await newBoardContext(browser, origin, true); contexts.push(coldContext);
    const author = await authorContext.newPage(), peer = await peerContext.newPage(); cold = await coldContext.newPage();
    pages.push(author, peer, cold);
    for (const page of pages) {
      page.on('request', request => urls.push(request.url()));
      page.on('pageerror', error => errorNames.push(error.name));
    }
    const original = await createBoardHouse(author, 'Recovery author', 2);
    await joinBoardHouse(peer, 'Recovery peer', original.home.code);
    const membership = await houseMembership(author), originalSlot = membership.residents.find(resident => resident.id === original.identity.id);
    if (!originalSlot) throw new Error('The original author must own a permanent slot.');
    expect(membership.residents).toHaveLength(2);

    checkpoint = 'private key issuance';
    await author.getByRole('button', { name: 'Identity and recovery', exact: true }).click();
    await author.getByRole('button', { name: 'Generate private key', exact: true }).click();
    const issuedKey = author.getByLabel('Private recovery key', { exact: true });
    await expect.poll(async () => Boolean(await issuedKey.inputValue()), POLL).toBe(true);
    privateProof = await issuedKey.inputValue();
    await author.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(author.locator('#issued-identity-key')).toHaveCount(0);

    checkpoint = 'cold recovery';
    await cold.goto('/board/');
    await expect(cold.getByRole('button', { name: 'Recover my identity', exact: true })).toBeVisible();
    expect((await boardMe(cold)).home).toBeNull();
    await cold.getByRole('button', { name: 'Recover my identity', exact: true }).click();
    const recoveryInput = cold.getByLabel('Your private recovery key', { exact: true });
    await recoveryInput.focus();
    // Installed Playwright renders fill/insertText values into HTML step titles.
    // Evaluate arguments are omitted there; with tracing off, transient clipboard
    // transfer plus a real paste keeps this proof out of recorded action metadata.
    await cold.evaluate(async proof => navigator.clipboard.writeText(proof), privateProof);
    privateProof = '';
    await cold.keyboard.press('Control+V');
    await expect.poll(async () => Boolean(await recoveryInput.inputValue()), POLL).toBe(true);
    await cold.getByRole('button', { name: 'Recover identity', exact: true }).click();
    await expect(editorCanvas(cold)).toBeVisible();
    await expect(cold.locator('#recover-identity-key')).toHaveCount(0);

    checkpoint = 'recovered scope';
    const recovered = await boardMe(cold);
    expect(recovered.identity.id).toBe(original.identity.id);
    expect(recovered.home?.id).toBe(original.home.id); expect(recovered.home?.capacity).toBe(2);
    const returnedMembership = await houseMembership(cold), returnedSlot = returnedMembership.residents.find(resident => resident.id === original.identity.id);
    expect(returnedMembership.residents).toHaveLength(2);
    expect(returnedSlot?.slot).toBe(originalSlot.slot); expect(returnedSlot?.bedroomId).toBe(originalSlot.bedroomId);
    await expect(author.getByRole('heading', { name: 'Your house access changed', exact: true })).toBeVisible();
    await expect(author.locator('#issued-identity-key')).toHaveCount(0);
    await cold.reload(); await expect(editorCanvas(cold)).toBeVisible();
    expect((await boardMe(cold)).identity.id).toBe(original.identity.id);
    expect(requestedGameAssets(urls)).toEqual([]); expect(errorNames).toEqual([]);
  } catch {
    // Drop any underlying action error/call log: it must not echo a credential.
    throw new Error(`Standalone identity case failed at ${checkpoint}; private values were not recorded.`);
  } finally {
    privateProof = '';
    if (cold) await cold.evaluate(async () => navigator.clipboard.writeText('')).catch(() => {});
    // Close credential dialogs before context-close/failure hooks could inspect DOM.
    await Promise.allSettled(pages.map(page => page.keyboard.press('Escape')));
    await closeBoardContexts(contexts);
  }
});
