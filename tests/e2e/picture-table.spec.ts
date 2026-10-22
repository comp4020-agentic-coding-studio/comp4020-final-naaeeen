import { expect, test, type Page } from '@playwright/test';
import { PUZZLE_ILLUSTRATIONS } from '../../public/house-puzzle-content.js';
import { beginAdmission, closeTool, openHouseSettings } from './house-journey.ts';

type Placement = { pieceId: string; destination: number; actorId: string };
type PictureSnapshot = {
  selfId: string;
  house: { id: string; capacity: number };
  puzzle: { current: { id: string; placements: Placement[]; completed: boolean } | null };
};

async function live(page: Page) {
  await expect(page.locator('#connection-status')).toHaveText('Together, live');
  await expect(page.locator('.house-world-canvas')).toHaveAttribute('data-self-x', /^-?\d/);
}

async function savedPicture(page: Page): Promise<PictureSnapshot> {
  const response = await page.request.get('/api/house/snapshot?zone=lounge', { timeout: 10_000 });
  expect(response.status()).toBe(200);
  return response.json();
}

async function pictureTable(page: Page) {
  await closeTool(page);
  await page.getByRole('button', { name: 'Places', exact: true }).click();
  await page.locator('#places-panel [data-place="game"]').click();
  await expect(page.locator('#game-panel')).toBeVisible({ timeout: 30_000 });
  await page.locator('#break-picture').click();
}

async function pauseView(page: Page) {
  await closeTool(page);
  await page.getByRole('button', { name: 'Pause and options', exact: true }).click();
  await expect(page.locator('#panel-title')).toHaveText('Game paused');
  await expect(page.locator('.house-world-canvas')).toHaveAttribute('data-suspended', 'true');
  await expect(page.locator('#connection-status')).toHaveText('Together, live');
}

async function watch(page: Page, active: number, progress: number) {
  await expect(page.locator('[data-puzzle-roster]')).toContainText('You are watching');
  await expect(page.locator('[data-puzzle-roster]')).toContainText(`${active} / 6 active`);
  await expect(page.locator('[data-puzzle-progress]')).toHaveText(`${progress} / 24 placed`);
  await expect(page.locator('[data-puzzle-action="join"]')).toBeVisible();
  await expect(page.locator('[data-puzzle-destination="3"]')).toHaveAttribute('aria-disabled', 'true');
}

async function place(page: Page, pieceIndex: number, actorId: string, touch = false) {
  const before = await savedPicture(page), piece = PUZZLE_ILLUSTRATIONS[0].pieces[pieceIndex];
  expect(before.puzzle.current).not.toBeNull();
  const item = page.locator(`[data-puzzle-piece="${piece.id}"]`);
  if (await item.isHidden()) {
    const currentPage = await page.locator('[data-puzzle-page]').textContent();
    const action = currentPage!.includes('1 of 2') ? 'next' : 'previous';
    await page.locator(`[data-puzzle-action="${action}"]`).click();
  }
  await expect(item).toHaveAttribute('aria-disabled', 'false');
  if (touch) await item.tap();
  else await item.click();
  await expect(item).toHaveAttribute('aria-pressed', 'true');
  const destination = page.locator(`[data-puzzle-destination="${piece.destination}"]`);
  if (touch) await destination.tap();
  else await destination.click();
  await expect(page.locator('[data-puzzle-progress]')).toHaveText(`${pieceIndex + 1} / 24 placed`);
  const after = await savedPicture(page);
  expect(after.selfId).toBe(actorId);
  expect(after.puzzle.current!.id).toBe(before.puzzle.current!.id);
  expect(after.puzzle.current!.placements).toHaveLength(pieceIndex + 1);
  for (const prior of before.puzzle.current!.placements) {
    expect(after.puzzle.current!.placements.find(value => value.pieceId === prior.pieceId)).toEqual(prior);
  }
  expect(after.puzzle.current!.placements.find(value => value.pieceId === piece.id)).toEqual({
    pieceId: piece.id, destination: piece.destination, actorId,
  });
  return after;
}

test('three friends explicitly contribute to a picture and continue after one leaves', async ({ browser, baseURL }, info) => {
  if (!baseURL) throw new Error('The maintained browser task requires its configured baseURL.');
  const contexts = await Promise.all([
    browser.newContext({ baseURL, viewport: { width: 1280, height: 800 } }),
    browser.newContext({ baseURL, viewport: { width: 1280, height: 800 } }),
    browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, hasTouch: true }),
  ]);
  const errors: string[] = [];
  try {
    const pages = await Promise.all(contexts.map(context => context.newPage()));
    for (const page of pages) page.on('pageerror', error => errors.push(error.message));
    const [owner, peer, late] = pages;
    const identities: string[] = [];
    let houseId = '', code = '';

    for (const [index, page] of pages.entries()) {
      await beginAdmission(page, index === 0 ? 'create' : 'join');
      await page.getByLabel('Your name', { exact: true }).fill(`CI picture friend ${index + 1}`);
      if (index === 0) {
        await page.getByRole('combobox', { name: 'Bedrooms', exact: true }).selectOption('3');
        await page.getByRole('button', { name: 'Create house', exact: true }).click();
      } else {
        await page.getByLabel('House code', { exact: true }).fill(code);
        await page.getByRole('button', { name: 'Join house', exact: true }).click();
      }
      await live(page);
      const admitted = await savedPicture(page);
      identities.push(admitted.selfId);
      if (index === 0) {
        houseId = admitted.house.id;
        expect(admitted.house.capacity).toBe(3);
        await openHouseSettings(page);
        code = (await page.locator('#join-code-display').textContent())!.trim();
        await closeTool(page);
      }
      expect(admitted.house.id).toBe(houseId);
      await pictureTable(page);
      if (index === 0) await page.locator('[data-puzzle-action="start"]').click();
      await watch(page, index, index); // Opening and Start never enroll the current identity.
      const watching = await savedPicture(page);
      expect(watching.puzzle.current!.placements).toHaveLength(index);
      expect(watching.puzzle.current!.placements.some(value => value.actorId === admitted.selfId)).toBe(false);
      if (index === 2) await page.locator('[data-puzzle-action="join"]').tap();
      else await page.locator('[data-puzzle-action="join"]').click();
      await expect(page.locator('[data-puzzle-roster]')).toContainText('You joined');
      await expect(page.locator('[data-puzzle-roster]')).toContainText(`${index + 1} / 6 active`);
      await place(page, index, admitted.selfId, index === 2);
      // Ordinary Pause suspends inactive world rendering while preserving the real connection/consent.
      if (index < 2) await pauseView(page);
    }

    expect(new Set(identities).size).toBe(3);
    const three = await savedPicture(late);
    expect(new Set(three.puzzle.current!.placements.map(value => value.actorId))).toEqual(new Set(identities));
    for (const page of pages) {
      await expect(page.locator('#connection-status')).toHaveText('Together, live');
      await expect(page.locator('[data-puzzle-roster]')).toContainText('3 / 6 active');
    }

    await late.locator('[data-puzzle-action="leave"]').tap();
    await expect(late.locator('#game-panel')).toBeHidden();
    await expect(late.locator('.house-world-canvas')).toHaveAttribute('data-self-animation', 'sit');
    await expect(late.locator('#context-hint')).toContainText('Stand up');
    await late.locator('#game-table-reopen').tap(); // Withdrawal keeps the actual chair.
    await expect(late.locator('#game-panel')).toBeVisible();
    await watch(late, 2, 3);
    expect((await savedPicture(late)).puzzle.current!.placements).toEqual(three.puzzle.current!.placements);
    await late.locator('#game-panel-stand').tap();
    await expect(late.locator('#game-panel')).toBeHidden();
    await expect(late.locator('.house-world-canvas')).not.toHaveAttribute('data-self-animation', 'sit');
    await pictureTable(late);
    await expect(late.locator('.house-world-canvas')).toHaveAttribute('data-self-animation', 'sit');
    await watch(late, 2, 3); // A new chair does not renew participation.

    await peer.locator('#resume-game').click();
    await expect(peer.locator('.house-world-canvas')).toHaveAttribute('data-suspended', 'false');
    await peer.locator('#game-table-reopen').click();
    const continued = await place(peer, 3, identities[1]);
    await expect(late.locator('[data-puzzle-progress]')).toHaveText('4 / 24 placed');
    await expect(late.locator('[data-puzzle-roster]')).toContainText('You are watching');
    await expect(owner.locator('[data-puzzle-progress]')).toHaveText('4 / 24 placed');
    await info.attach('three-contributor-attribution', {
      body: JSON.stringify({ houseId, identities, placements: continued.puzzle.current!.placements }, null, 2),
      contentType: 'application/json',
    });
    expect(errors).toEqual([]);
  } finally {
    await Promise.all(contexts.map(context => context.close()));
  }
});

// Solo completion is a separate UI regression; the six-contributor evidence has its own scope.
test('one resident completes a picture and releases participation controls', async ({ browser, baseURL }, info) => {
  if (!baseURL) throw new Error('The maintained browser task requires its configured baseURL.');
  const context = await browser.newContext({ baseURL, viewport: { width: 1920, height: 1080 } });
  const errors: string[] = [];
  try {
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await beginAdmission(page, 'create');
    await page.getByLabel('Your name', { exact: true }).fill('CI picture completer');
    await page.getByRole('combobox', { name: 'Bedrooms', exact: true }).selectOption('2');
    await page.getByRole('button', { name: 'Create house', exact: true }).click();
    await live(page);
    const admitted = await savedPicture(page);
    await pictureTable(page);
    await page.locator('[data-puzzle-action="start"]').click();
    await watch(page, 0, 0);
    await page.locator('[data-puzzle-action="join"]').click();
    await expect(page.locator('[data-puzzle-roster]')).toContainText('You joined');

    const art = PUZZLE_ILLUSTRATIONS[0];
    for (let index = 0; index < art.pieces.length; index++) {
      await place(page, index, admitted.selfId);
    }
    const completed = await savedPicture(page);
    expect(completed.puzzle.current!.completed).toBe(true);
    expect(completed.puzzle.current!.placements).toHaveLength(24);
    expect(new Set(completed.puzzle.current!.placements.map(value => value.actorId))).toEqual(new Set([admitted.selfId]));
    await expect(page.locator('[data-puzzle-progress]')).toHaveText('24 / 24 placed');
    await expect(page.locator('[data-puzzle-complete]')).toBeVisible();
    await expect(page.locator('[data-puzzle-board]')).toBeVisible();
    await expect(page.locator('[data-puzzle-board] .placed')).toHaveCount(24);
    await expect(page.locator('[data-puzzle-board]')).toHaveCSS('background-image', `url("${new URL(art.url, baseURL).href}")`);
    await expect(page.locator('[data-puzzle-reference-image]')).toHaveJSProperty('complete', true);
    expect(await page.locator('[data-puzzle-reference-image]').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect(page.locator('[data-puzzle-roster]')).toHaveText('You are watching · 0 / 6 active');
    await expect(page.locator('[data-puzzle-action="join"]')).toBeHidden();
    await expect(page.locator('[data-puzzle-action="leave"]')).toBeHidden();
    await expect(page.locator('[data-puzzle-action="return"]')).toBeVisible();
    await expect(page.locator('[data-puzzle-action="return"]')).toBeEnabled();
    await info.attach('solo-completed-picture', {
      body: JSON.stringify({ houseId: admitted.house.id, identity: admitted.selfId, picture: completed.puzzle.current }, null, 2),
      contentType: 'application/json',
    });
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});
