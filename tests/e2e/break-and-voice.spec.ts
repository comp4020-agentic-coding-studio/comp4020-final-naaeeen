import { expect, test, type Page } from '@playwright/test';
import { beginAdmission, closeTool, openHouseSettings, openStudyNotes } from './house-journey.ts';

async function live(page: Page) {
  await expect(page.locator('#connection-status')).toHaveText('Together, live');
  await expect(page.locator('.house-world-canvas')).toHaveAttribute('data-self-x', /^-?\d/);
}

async function breakTable(page: Page) {
  await closeTool(page);
  await page.getByRole('button', { name: 'Places', exact: true }).click();
  await page.locator('#places-panel [data-place="game"]').click();
  await expect(page.locator('#break-four')).toBeVisible({ timeout: 30_000 });
  await page.locator('#break-four').click();
  await expect(page.locator('#game-panel')).toBeVisible();
}

test('friends choose a shared break, return to their next step and share an external voice destination', async ({ browser }, info) => {
  const ownerContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const peerContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errors: string[] = [];
  try {
    const owner = await ownerContext.newPage(), peer = await peerContext.newPage();
    for (const page of [owner, peer]) page.on('pageerror', error => errors.push(error.message));
    await beginAdmission(owner, 'create');
    await owner.getByLabel('Your name', { exact: true }).fill('CI break author');
    await owner.getByRole('combobox', { name: 'Bedrooms', exact: true }).selectOption('2');
    await owner.getByRole('button', { name: 'Create house', exact: true }).click();
    await live(owner); await openHouseSettings(owner);
    const code = (await owner.locator('#join-code-display').textContent())!.trim();
    await beginAdmission(peer, 'join');
    await peer.getByLabel('Your name', { exact: true }).fill('CI break peer');
    await peer.getByLabel('House code', { exact: true }).fill(code);
    await peer.getByRole('button', { name: 'Join house', exact: true }).click();
    await live(peer);

    await owner.getByLabel('Discord invite or server channel', { exact: true }).fill('https://discord.gg/study-ci');
    await owner.getByRole('button', { name: 'Save Discord link', exact: true }).click();
    await expect(owner.locator('#voice-status')).toContainText('saved');
    await openHouseSettings(peer);
    await expect(peer.locator('#voice-form')).toBeHidden();
    await peer.getByRole('button', { name: 'Open voice options', exact: true }).click();
    await expect(peer.getByRole('link', { name: 'Open Discord', exact: true })).toHaveAttribute('href', 'https://discord.gg/study-ci');
    await expect(peer.locator('#voice-link')).toHaveAttribute('target', '_blank');
    await expect(peer.locator('#voice-link')).toHaveAttribute('rel', 'noopener noreferrer');
    // No provider navigation or microphone capture is needed for this regression.

    await openStudyNotes(owner);
    await owner.getByLabel('Small goal', { exact: true }).fill('Understand the worked example');
    await owner.getByLabel('Next step', { exact: true }).fill('Write the missing step myself');
    await owner.getByRole('button', { name: 'Save card', exact: true }).click();
    await expect(owner.locator('#card-status')).toHaveText('Your saved current card.');
    await breakTable(owner); await breakTable(peer);
    const before = await (await owner.request.get('/api/house/snapshot')).json();
    expect(before.game.current).toBeNull(); // Opening Watch does not imply consent.
    await owner.locator('[data-game-action="join"]').click();
    await peer.locator('[data-game-action="join"]').click();
    await expect(owner.locator('[data-game-action="ready"]')).toBeVisible();
    await owner.locator('[data-game-action="ready"]').click();
    await peer.locator('[data-game-action="ready"]').click();
    await expect(owner.locator('[data-game-status]')).toContainText('Your turn');
    await owner.locator('[data-game-column="2"]').click();
    await expect(peer.locator('[data-game-cell="37"]')).toHaveAttribute('data-token', '0');
    await expect(owner.locator('[data-game-cell="37"]')).toHaveAttribute('data-token', '0');
    expect(await peer.locator('[data-game-cell]').count()).toBe(42);
    expect(await peer.evaluate(() => ['.game-grid', '[data-game-status]', '[data-game-last]', '[data-game-action="return"]'].every(selector => {
      const element = document.querySelector<HTMLElement>('#game-panel ' + selector);
      if (!element || element.closest('[hidden]')) return false;
      const box = element.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && box.top >= 0 && box.left >= 0 && box.right <= innerWidth && box.bottom <= innerHeight;
    }))).toBe(true);
    await peer.screenshot({ path: info.outputPath('shared-break-phone.png') });
    await owner.locator('[data-game-action="return"]').click();
    await expect(owner.locator('#room-panel')).toBeVisible({ timeout: 30_000 });
    await owner.locator('#open-room-work').click();
    await expect(owner.locator('#board-panel')).toBeVisible();
    await expect(owner.getByLabel('Next step', { exact: true })).toHaveValue('Write the missing step myself');
    await expect(owner.locator('input[name="availability"][value="quiet"]')).toBeChecked();
    await expect(peer.locator('[data-game-status]')).toContainText('ended when a player left');
    expect(errors).toEqual([]);
  } finally {
    await Promise.all([ownerContext.close(), peerContext.close()]);
  }
});
