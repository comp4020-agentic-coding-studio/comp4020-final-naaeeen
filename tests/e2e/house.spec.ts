import { test, expect, type Browser, type BrowserContext, type Locator, type Page, type TestInfo } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import { beginAdmission, continueSavedHome, showResidents, openHouseSettings, openChat, closeChat, openStudyNotes, openMyRoom, showMovement, chooseCamera, clickProjectedTarget } from './house-journey.ts';

const DESKTOP = { width: 1920, height: 1080 };
const PHONE = { width: 390, height: 844 };
const canvas = (page: Page) => page.locator('.house-world-canvas');
const roster = (page: Page) => page.locator('#roster');
const resident = (page: Page, name: string) => roster(page).locator('[data-player-id]').filter({ hasText: name });
const renderedResident = (page: Page, name: string) => page.locator('.house-avatar-name').filter({ hasText: name });

test.setTimeout(60_000);

async function arrival(page: Page, kind: 'create' | 'join') {
  await beginAdmission(page, kind);
}

async function settled(page: Page) {
  await expect(page.locator('#lobby')).toBeHidden();
  await expect(page.getByRole('radio', { name: 'Quiet', exact: true })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Quiet', exact: true })).toBeEnabled();
  await expect(canvas(page)).toBeVisible();
  await expect(page.locator('#connection-status')).toHaveText('Together, live');
  await expect(canvas(page)).toHaveAttribute('data-self-x', /^-?\d/);
  await expect(page.getByRole('radio', { name: 'Quiet', exact: true })).toBeChecked();
}

async function create(page: Page, name: string) {
  await arrival(page, 'create');
  await page.getByLabel('Your name', { exact: true }).fill(name);
  await page.getByRole('combobox', { name: 'Avatar colour', exact: true }).selectOption('sage');
  await page.getByRole('combobox', { name: 'Bedrooms', exact: true }).selectOption('2');
  const created = page.waitForResponse(response => new URL(response.url()).pathname === '/api/house/command' && response.request().method() === 'POST' && response.request().postDataJSON()?.type === 'house.create');
  await page.getByRole('button', { name: 'Create house', exact: true }).click();
  expect((await created).ok()).toBe(true);
  await settled(page);
  await openHouseSettings(page);
  const code = (await page.locator('#join-code-display').textContent())?.trim() ?? '';
  expect(code).toMatch(/^[0-9A-Z]{8}$/);
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  return code;
}

async function joinHouse(page: Page, name: string, code: string) {
  await arrival(page, 'join');
  await page.getByLabel('Your name', { exact: true }).fill(name);
  await page.getByRole('combobox', { name: 'Avatar colour', exact: true }).selectOption('rose');
  await page.getByLabel('House code', { exact: true }).fill(code);
  const joined = page.waitForResponse(response => new URL(response.url()).pathname === '/api/house/command' && response.request().method() === 'POST' && response.request().postDataJSON()?.type === 'house.join');
  await page.getByRole('button', { name: 'Join house', exact: true }).click();
  expect((await joined).ok()).toBe(true);
  await settled(page);
}

async function pair(browser: Browser, ownerName: string, peerName: string) {
  const ownerContext = await browser.newContext({ viewport: DESKTOP });
  const peerContext = await browser.newContext({ viewport: PHONE, isMobile: true, hasTouch: true });
  const owner = await ownerContext.newPage();
  const peer = await peerContext.newPage();
  const errors: string[] = [];
  owner.on('pageerror', error => errors.push(`owner: ${error.message}`));
  peer.on('pageerror', error => errors.push(`peer: ${error.message}`));
  try {
    const code = await create(owner, ownerName);
    await joinHouse(peer, peerName, code);
    await showResidents(owner);await showResidents(peer);
    await expect(roster(owner)).toContainText(peerName);
    await expect(roster(peer)).toContainText(ownerName);
    return { ownerContext, peerContext, owner, peer, errors, code };
  } catch (error) {
    const readDOM = (page: Page) => page.evaluate(() => ({
      lobbyHidden: (document.querySelector('#lobby') as HTMLElement | null)?.hidden,
      connection: document.querySelector('#connection-status')?.textContent,
      notice: document.querySelector('#notice')?.textContent,
      header: document.querySelector('#place-label')?.textContent,
      zone: document.querySelector<HTMLElement>('.house-world-canvas')?.dataset.zoneId,
      activeTag: document.activeElement?.tagName,
    })).catch(() => ({ unavailable: true }));
    const diagnostics: Record<string, unknown> = { errors };
    try {
      diagnostics.owner = await readDOM(owner);
      diagnostics.peer = await readDOM(peer);
      try {
        const response = await peer.request.get(new URL('/api/house/me', peer.url()).href, { timeout: 2_000 });
        const me = await response.json();
        diagnostics.peerMe = { status: response.status(), hasHome: Boolean(me.home) };
        diagnostics.peerHasSessionCookie = (await peerContext.cookies()).some(cookie => cookie.name === 'house_session');
      } catch { diagnostics.peerMe = 'unavailable'; }
    } catch { diagnostics.readFailure = true; }
    finally {
      const closed = await Promise.allSettled([ownerContext.close(), peerContext.close()]);
      diagnostics.cleanupFailureCount = closed.filter(result => result.status === 'rejected').length;
    }
    throw new Error(`Browser pair not ready: ${JSON.stringify(diagnostics)}`, { cause: error });
  }
}

async function position(page: Page) {
  return canvas(page).evaluate(node => ({
    x: Number((node as HTMLElement).dataset.selfX),
    z: Number((node as HTMLElement).dataset.selfZ),
  }));
}

async function keyboardMove(page: Page, key: string) {
  await canvas(page).focus();
  await expect(canvas(page)).toBeFocused();
  const before = await position(page);
  await page.keyboard.down(key);
  try {
    await expect.poll(async () => {
      const after = await position(page);
      return Math.hypot(after.x - before.x, after.z - before.z);
    }).toBeGreaterThan(0.2);
  } finally {
    await page.keyboard.up(key);
  }
}

async function typingDoesNotMove(page: Page, input: Locator) {
  await input.focus();
  const before = await position(page);
  await page.keyboard.down('d');
  // Intentional held-key interval exercises the world loop while typing.
  await page.waitForTimeout(450);
  await page.keyboard.up('d');
  const after = await position(page);
  expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeLessThan(0.02);
}

async function touchHold(page: Page, button: Locator) {
  const box = await button.boundingBox();
  expect(box).not.toBeNull();
  if (!box) throw new Error('Touch control has no visible bounds.');
  const session = await page.context().newCDPSession(page);
  let touching = false;
  try {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2, id: 1 }],
    });
    touching = true;
    // Real browser touch events must span frames to exercise held movement.
    await page.waitForTimeout(500);
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    touching = false;
  } finally {
    try {
      if (touching) await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    } finally { await session.detach(); }
  }
}

async function viewportFits(page: Page, expected: { width: number; height: number }) {
  const dimensions = await page.evaluate(() => ({
    width: innerWidth, height: innerHeight, overflow: document.documentElement.scrollWidth > innerWidth,
  }));
  expect(dimensions).toEqual({ ...expected, overflow: false });
  const box = await canvas(page).boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    expect(box.width).toBeGreaterThan(expected.width * 0.9);
    expect(box.height).toBeGreaterThan(expected.height * 0.6);
  }
}

async function screenshot(page: Page, info: TestInfo, name: string) {
  await page.screenshot({ path: info.outputPath(`${name}.png`), animations: 'disabled' });
  if (process.env.HOUSE_EVIDENCE_DIR) {
    await mkdir(process.env.HOUSE_EVIDENCE_DIR, { recursive: true });
    await page.screenshot({ path: join(process.env.HOUSE_EVIDENCE_DIR, `${name}.png`), animations: 'disabled' });
  }
}

async function closeContexts(...contexts: BrowserContext[]) {
  for (const context of contexts) await context.close();
}

test('independent residents move, converse, and return to persisted identity and chat', async ({ browser }, info) => {
  const { ownerContext, peerContext, owner, peer, errors, code } = await pair(browser, 'Browser owner', 'Browser peer');
  let returning: BrowserContext | undefined;
  try {
    await viewportFits(owner, DESKTOP);
    await viewportFits(peer, PHONE);
    await expect(resident(peer, 'Browser owner')).toContainText(/quiet/i);
    await owner.getByRole('radio', { name: 'Can chat', exact: true }).check();
    await expect(resident(peer, 'Browser owner')).toContainText(/can chat/i);
    await expect(renderedResident(peer, 'Browser owner')).toBeVisible();
    const ownerBeforeMove = await position(owner);
    await keyboardMove(owner, 'ArrowRight');
    const moved = await position(owner);
    await expect.poll(async () => Number(await resident(peer, 'Browser owner').getAttribute('data-x'))).toBeGreaterThan(ownerBeforeMove.x + 0.2);
    await expect.poll(async () => Number(await renderedResident(peer, 'Browser owner').getAttribute('data-x'))).toBeGreaterThan(ownerBeforeMove.x + 0.2);
    expect(moved.x).toBeGreaterThan(ownerBeforeMove.x + 0.2);
    await openChat(owner);
    await typingDoesNotMove(owner, owner.getByLabel('Message this room', { exact: true }));
    await owner.getByLabel('Message this room', { exact: true }).fill('Could we look at this example together?');
    await owner.getByRole('button', { name: 'Send', exact: true }).click();
    await openChat(peer);
    await expect(peer.locator('#transcript')).toContainText('Could we look at this example together?');
    await peer.getByLabel('Message this room', { exact: true }).fill('<b>literal browser message</b>');
    await peer.getByRole('button', { name: 'Send', exact: true }).click();
    await openChat(owner);
    await expect(owner.locator('#transcript')).toContainText('<b>literal browser message</b>');
    await expect(owner.locator('#transcript span b')).toHaveCount(0);
    await screenshot(owner, info, 'house-desktop-chat');
    await screenshot(peer, info, 'house-phone-chat');
    const savedIdentity = await ownerContext.storageState(); // Kept in memory; never written to evidence.
    await ownerContext.close();
    returning = await browser.newContext({ viewport: DESKTOP, storageState: savedIdentity });
    const returned = await returning.newPage();
    returned.on('pageerror', error => errors.push(`return: ${error.message}`));
    await returned.goto('/');
    await continueSavedHome(returned);
    await settled(returned);
    await expect(roster(returned)).toContainText('Browser owner');
    await expect(resident(peer, 'Browser owner')).toContainText(/quiet/i);
    await openHouseSettings(returned);
    await expect(returned.locator('#join-code-display')).toHaveText(code);
    await openChat(returned);
    await expect(returned.locator('#transcript')).toContainText('Could we look at this example together?');
    await expect(returned.locator('#transcript')).toContainText('<b>literal browser message</b>');
    expect(errors).toEqual([]);
  } finally {
    await closeContexts(ownerContext, peerContext);
    if (returning) await returning.close();
  }
});

test('native touch controls move an avatar and resizing preserves usable controls', async ({ browser }, info) => {
  const { ownerContext, peerContext, owner, peer, errors } = await pair(browser, 'Touch witness', 'Touch resident');
  try {
    await showMovement(peer);
    const controlNames = ['Move forward', 'Move back', 'Move left', 'Move right', 'Interact'];
    for (const name of controlNames) {
      const box = await peer.getByRole('button', { name, exact: true }).boundingBox();
      expect(box).not.toBeNull();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
    await expect(renderedResident(owner, 'Touch resident')).toBeVisible();
    const before = await position(peer);
    await touchHold(peer, peer.getByRole('button', { name: 'Move left', exact: true }));
    const after = await position(peer);
    expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeGreaterThan(0.2);
    await expect.poll(async () => Number(await resident(owner, 'Touch resident').getAttribute('data-x'))).toBeLessThan(before.x - 0.2);
    await openChat(peer);
    await typingDoesNotMove(peer, peer.getByLabel('Message this room', { exact: true }));
    await expect.poll(async () => Number(await renderedResident(owner, 'Touch resident').getAttribute('data-x'))).toBeLessThan(before.x - 0.2);
    await openStudyNotes(peer);
    await peer.getByLabel('Small goal', { exact: true }).fill('Touch input reaches the board');
    await peer.getByRole('button', { name: 'Close panel', exact: true }).tap();
    await viewportFits(peer, PHONE);
    await screenshot(peer, info, 'house-phone-world');
    await owner.setViewportSize(PHONE);
    await viewportFits(owner, PHONE);
    await expect(owner.getByRole('button', { name: 'Pause and options', exact: true })).toBeVisible();
    await peer.setViewportSize(DESKTOP);await viewportFits(peer, DESKTOP);
    await expect(peer.getByRole('button', { name: 'Interact', exact: true })).toBeVisible();
    await peer.setViewportSize(PHONE);await viewportFits(peer, PHONE);
    await owner.setViewportSize(DESKTOP);
    await viewportFits(owner, DESKTOP);
    await screenshot(owner, info, 'house-desktop-world');
    expect(errors).toEqual([]);
  } finally {
    await closeContexts(ownerContext, peerContext);
  }
});

test('two authors save independent cards, retain drafts, and retrieve active next steps', async ({ browser }, info) => {
  const { ownerContext, peerContext, owner, peer, errors } = await pair(browser, 'Card author', 'Card peer');
  try {
    for (const page of [owner, peer]) await openStudyNotes(page);
    await owner.getByLabel('Small goal', { exact: true }).fill('Understand the example');
    await owner.getByLabel('Question', { exact: true }).fill('Where does the final term come from?');
    await owner.getByLabel('Resource link', { exact: true }).fill('https://example.com/course-example');
    await owner.getByLabel('Ask for help', { exact: true }).check();
    await peer.getByLabel('Small goal', { exact: true }).fill('Check my own outline');
    await peer.getByLabel('Next step', { exact: true }).fill('Read paragraph two');
    await Promise.all([
      owner.getByRole('button', { name: 'Save card', exact: true }).click(),
      peer.getByRole('button', { name: 'Save card', exact: true }).click(),
    ]);
    for (const page of [owner, peer]) {
      await expect(page.locator('#cards')).toContainText('Understand the example');
      await expect(page.locator('#cards')).toContainText('Check my own outline');
    }
    await peer.getByLabel('Next step', { exact: true }).fill('An unsaved independent thought');
    await owner.getByLabel('Next step', { exact: true }).fill('Expand the preceding line myself');
    await owner.getByRole('button', { name: 'Save card', exact: true }).click();
    await expect(peer.locator('#cards')).toContainText('Expand the preceding line myself');
    await expect(peer.locator('#cards article').filter({ hasText: 'Understand the example' })).toContainText('Question open');
    await expect(peer.getByLabel('Next step', { exact: true })).toHaveValue('An unsaved independent thought');
    await peer.getByRole('button', { name: 'Save card', exact: true }).click();
    await expect(owner.locator('#cards')).toContainText('An unsaved independent thought');
    await Promise.all([owner.reload(), peer.reload()]);
    await Promise.all([continueSavedHome(owner), continueSavedHome(peer)]);
    await Promise.all([settled(owner), settled(peer)]);
    for (const page of [owner, peer]) await openStudyNotes(page);
    await expect(owner.getByLabel('Small goal', { exact: true })).toHaveValue('Understand the example');
    await expect(owner.getByLabel('Next step', { exact: true })).toHaveValue('Expand the preceding line myself');
    await expect(owner.getByLabel('Ask for help', { exact: true })).toBeChecked();
    await expect(peer.getByLabel('Small goal', { exact: true })).toHaveValue('Check my own outline');
    await expect(peer.getByLabel('Next step', { exact: true })).toHaveValue('An unsaved independent thought');
    // Restored current-card fields prove that saving nextStep kept the card active.
    await screenshot(owner, info, 'house-desktop-board');
    await screenshot(peer, info, 'house-phone-board');
    expect(errors).toEqual([]);
  } finally {
    await closeContexts(ownerContext, peerContext);
  }
});


async function walkToOwnRoom(page: Page, ownerName: string) {
  await page.bringToFront();
  const started = Date.now();
  const before = await position(page);
  await openMyRoom(page);
  await page.getByRole('button', { name: 'Walk to my room', exact: true }).click();
  await expect.poll(async () => {
    const after = await position(page);
    return Math.hypot(after.x - before.x, after.z - before.z);
  }).toBeGreaterThan(0.2);
  try {
    await expect(page.locator('#place-label')).toHaveText(`${ownerName}'s room`, { timeout: 30_000 });
  } catch (error) {
    const diagnostics = { elapsedMs: Date.now() - started, header: await page.locator('#place-label').textContent(), position: await position(page), zone: await canvas(page).getAttribute('data-zone-id'), animation: await canvas(page).getAttribute('data-self-animation'), hint: await page.locator('#context-hint').textContent(), notice: await page.locator('#notice').textContent(), focus: await page.evaluate(() => document.activeElement?.tagName) };
    throw new Error(`Bedroom walk did not complete: ${JSON.stringify(diagnostics)}`, { cause: error });
  }
  await expect(canvas(page)).not.toHaveAttribute('data-zone-id', 'lounge');
  const timing = { elapsedMs: Date.now() - started, viewport: page.viewportSize(), position: await position(page) };
  await test.info().attach('room-walk-timing', { body: JSON.stringify(timing), contentType: 'application/json' });
  console.log(`Room walk timing: ${JSON.stringify(timing)}`);
}

test('real seat and door interactions preserve owned DIY and revoke a bedroom visitor', async ({ browser }, info) => {
  test.setTimeout(90_000); // Two measured 30-second software-renderer route gates plus the remaining real UI flow.
  const { ownerContext, peerContext, owner, peer, errors } = await pair(browser, 'Room owner', 'Room visitor');
  try {
    await canvas(owner).focus();
    await expect(canvas(owner)).toBeFocused();
    await expect(owner.locator('#context-hint')).toContainText(/sit/i);
    await owner.keyboard.press('e');
    await expect(canvas(owner)).toHaveAttribute('data-self-animation', 'sit');
    await expect(resident(peer, 'Room owner')).toHaveAttribute('data-animation', 'sit');
    await owner.keyboard.press('e');
    await expect(canvas(owner)).not.toHaveAttribute('data-self-animation', 'sit');
    await walkToOwnRoom(owner, 'Room owner');
    await openMyRoom(owner);
    await owner.getByRole('combobox', { name: 'Room palette', exact: true }).selectOption('lavender');
    await owner.getByLabel('Open my room to current housemates', { exact: true }).check();
    await owner.getByRole('button', { name: 'Save room settings', exact: true }).click();
    await expect(owner.locator('#room-status')).toHaveText('Room settings saved.');
    const originalPieces = await owner.locator('#placement option').count();
    await expect(renderedResident(owner, 'Room owner')).toBeVisible();
    await owner.getByRole('combobox', { name: 'Add a piece', exact: true }).selectOption('plant');
    await owner.getByRole('button', { name: 'Add furniture', exact: true }).click();
    await expect(renderedResident(owner, 'Room owner')).toBeVisible();
    await owner.getByRole('button', { name: 'Rotate', exact: true }).click();
    await expect(renderedResident(owner, 'Room owner')).toBeVisible();
    await owner.getByRole('button', { name: 'Remove', exact: true }).click();
    await expect(owner.locator('#placement option')).toHaveCount(originalPieces);
    await expect(renderedResident(owner, 'Room owner')).toBeVisible();
    await owner.getByRole('button', { name: 'Add furniture', exact: true }).click();
    await expect(owner.locator('#placement option')).toHaveCount(originalPieces + 1);
    const addedPieceId = await owner.locator('#placement').inputValue();
    const addedPiece = owner.locator(`#placement option[value="${addedPieceId}"]`);
    const addedArrangement = await addedPiece.textContent();
    expect(addedArrangement).toMatch(/^plant · /);
    await owner.getByRole('button', { name: 'Save layout', exact: true }).click();
    await expect(owner.locator('#layout-status')).toHaveText('Your arrangement is saved.');
    await owner.getByRole('button', { name: 'Use saved layout', exact: true }).click();
    await expect(renderedResident(owner, 'Room owner')).toBeVisible();
    await owner.getByRole('button', { name: 'Close panel', exact: true }).click();
    await expect(renderedResident(owner, 'Room owner')).toBeVisible();
    await screenshot(owner, info, 'house-desktop-owned-room');
    await owner.reload();
    await continueSavedHome(owner);
    await settled(owner);
    await walkToOwnRoom(owner, 'Room owner');
    await openMyRoom(owner);
    await expect(owner.getByRole('combobox', { name: 'Room palette', exact: true })).toHaveValue('lavender');
    await expect(owner.getByLabel('Open my room to current housemates', { exact: true })).toBeChecked();
    await expect(owner.locator('#placement option')).toHaveCount(originalPieces + 1);
    await expect(owner.locator(`#placement option[value="${addedPieceId}"]`)).toHaveText(addedArrangement!);
    // The current keys are camera-relative. Select the physical door in Overview;
    // native raycast -> collision-aware route -> arrival still performs the actual visit.
    await chooseCamera(peer, 'overview');
    const guestBefore = await position(peer), guestStarted = Date.now();
    await clickProjectedTarget(peer, { type: 'door', slot: 0 });
    await expect.poll(async () => {const after=await position(peer);return Math.hypot(after.x-guestBefore.x,after.z-guestBefore.z);}).toBeGreaterThan(0.2);
    await expect(peer.locator('#place-label')).toHaveText("Room owner's room", { timeout: 30_000 });
    console.log(`Guest native door approach timing: ${Date.now() - guestStarted}ms`);
    await expect(peer.locator('#place-label')).toHaveText("Room owner's room");
    await openMyRoom(peer);
    await expect(peer.locator('#room-form')).toBeHidden();
    await expect(peer.locator('#furniture-editor')).toBeHidden();
    await peer.getByRole('button', { name: 'Close panel', exact: true }).tap();
    await screenshot(peer, info, 'house-phone-allowed-visit');
    await owner.getByLabel('Open my room to current housemates', { exact: true }).uncheck();
    await owner.getByRole('button', { name: 'Save room settings', exact: true }).click();
    await expect(owner.locator('#room-status')).toHaveText('Room settings saved.');
    await expect(peer.locator('#place-label')).toHaveText('Shared study lounge');
    await expect(canvas(peer)).toHaveAttribute('data-zone-id', 'lounge');
    await expect(peer.locator('.house-avatar-name').filter({ hasText: 'Room owner' })).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally {
    await closeContexts(ownerContext, peerContext);
  }
});
