import { expect, type Page } from '@playwright/test';

// These helpers perform visible native tasks; they never set game state or bypass actionability.
export async function beginAdmission(page: Page, kind: 'create' | 'join') {
  await page.goto('/');
  await expect(page.locator('#title-screen')).toBeVisible();
  await page.locator(kind === 'create' ? '#title-create' : '#title-join').click();
  await expect(page.locator('#lobby')).toBeVisible();
  await expect(page.getByLabel('Your name', { exact: true })).toBeVisible();
  await expect(page.locator(kind === 'create' ? '#join-form' : '#create-form')).toBeHidden();
}

export async function continueSavedHome(page: Page) {
  await expect(page.locator('#title-screen')).toBeVisible();
  await page.locator('#title-continue').click();
  await expect(page.locator('#title-screen')).toBeHidden();
  await expect(page.locator('.house-world-canvas')).toBeVisible();
}

export async function closeTool(page: Page) {
  if (await page.locator('#panel').isVisible()) await page.getByRole('button', { name: 'Close panel', exact: true }).click();
}

export async function showResidents(page: Page) {
  const disclosure = page.locator('#resident-disclosure');
  if (await disclosure.getAttribute('open') === null) await disclosure.locator('summary').click();
  await expect(page.locator('#roster')).toBeVisible();
}

export async function hideResidents(page: Page) {
  const disclosure = page.locator('#resident-disclosure');
  if (await disclosure.getAttribute('open') !== null) await disclosure.locator('summary').click();
}

export async function openHouseSettings(page: Page) {
  await closeTool(page);
  await page.getByRole('button', { name: 'Invite and house settings', exact: true }).click();
  await expect(page.locator('#panel-title')).toHaveText('House settings');
}

export async function openStudyNotes(page: Page) {
  await closeTool(page);
  await page.getByRole('button', { name: 'Study notes', exact: true }).click();
  await expect(page.locator('#panel-title')).toHaveText('Study notes');
}

export async function openMyRoom(page: Page) {
  await closeTool(page);
  await page.getByRole('button', { name: 'My room', exact: true }).click();
  await expect(page.locator('#panel-title')).toHaveText('My room');
}

export async function openChat(page: Page) {
  await closeTool(page);
  if (!await page.locator('#chat-window').isVisible()) await page.getByRole('button', { name: /^Chat/ }).click();
  if (!await page.locator('#chat-body').isVisible()) await page.locator('#chat-collapse').click();
  await expect(page.getByLabel('Message this room', { exact: true })).toBeVisible();
}

export async function closeChat(page: Page) {
  await closeTool(page);
  if (await page.locator('#chat-window').isVisible()) await page.getByRole('button', { name: 'Close chat', exact: true }).click();
}

export async function showMovement(page: Page) {
  if (await page.locator('#movement-controls').isHidden()) await page.getByRole('button', { name: 'Movement', exact: true }).tap();
  await expect(page.getByRole('button', { name: 'Interact', exact: true })).toBeVisible();
}

export async function chooseCamera(page: Page, mode: 'play' | 'overview') {
  await closeTool(page);
  await page.getByRole('button', { name: 'Pause and options', exact: true }).click();
  await expect(page.locator('#panel-title')).toHaveText('Game paused');
  await page.getByRole('button', { name: mode === 'overview' ? 'Room overview' : 'Follow my avatar', exact: true }).click();
  await page.getByRole('button', { name: 'Resume game', exact: true }).click();
  await expect(page.locator('.house-world-canvas')).toHaveAttribute('data-camera-mode', mode);
}

export async function showIdentityTools(page: Page) {
  await expect(page.locator('#title-screen')).toBeVisible();
  const details = page.locator('.identity-tools');
  if (await details.getAttribute('open') === null) await details.locator('summary').click();
}

export async function clickProjectedTarget(page: Page, filter: { type: 'door' | 'seat'; slot?: number; seatId?: string }) {
  await closeChat(page);
  await hideResidents(page);
  const canvas = page.locator('.house-world-canvas');
  const read = () => canvas.evaluate((el, wanted) => JSON.parse((el as HTMLElement).dataset.pickTargets || '[]')
    .find((entry: { target: { type: string; slot?: number; seatId?: string }; visible: boolean; x: number; y: number }) => entry.target.type === wanted.type
      && (wanted.slot === undefined || entry.target.slot === wanted.slot)
      && (wanted.seatId === undefined || entry.target.seatId === wanted.seatId)), filter);
  await expect.poll(async () => (await read())?.visible).toBe(true);
  const target = await read(), bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();expect(Number.isFinite(target.x) && Number.isFinite(target.y)).toBe(true);
  const point = { x: bounds!.x + target.x, y: bounds!.y + target.y };
  // Frustum metadata alone cannot prove that a HUD overlay leaves this point clickable.
  expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y) === document.querySelector('.house-world-canvas'), point)).toBe(true);
  await page.mouse.click(point.x, point.y);
}

interface FramingProjection {
  screenX: number; screenY: number; height: number;
  mesh: { left: number; right: number; top: number; bottom: number } | null;
  area: { available: boolean; x: number; y: number; w: number; h: number } | null;
}

// Validate the predicate independently with malformed metadata as well as real rendered frames.
export function projectionFramingFailures(value: FramingProjection) {
  if (!value.mesh || !value.area) return ['Authorised projection not ready'];
  const fields: Array<[string, unknown]> = [
    ['screenX', value.screenX], ['screenY', value.screenY], ['height', value.height],
    ...Object.entries(value.mesh).map(([name, number]): [string, unknown] => ['mesh.' + name, number]),
    ...['x', 'y', 'w', 'h'].map((name): [string, unknown] => ['area.' + name, value.area![name as 'x' | 'y' | 'w' | 'h']]),
  ];
  const invalid = fields.filter(([, number]) => !Number.isFinite(number));
  if (invalid.length) return invalid.map(([name]) => 'Invalid numeric projection: ' + name);
  const half = value.height / 2, failures: string[] = [];
  if (value.area.available !== true) failures.push('No available play rectangle');
  if (!(value.screenY - half >= value.area.y - 1)) failures.push(`Upright top ${value.screenY - half} < ${value.area.y - 1}`);
  if (!(value.screenY + half <= value.area.y + value.area.h + 1)) failures.push(`Upright bottom ${value.screenY + half} > ${value.area.y + value.area.h + 1}`);
  if (!(value.mesh.left >= value.area.x - 1)) failures.push(`Mesh left ${value.mesh.left} < ${value.area.x - 1}`);
  if (!(value.mesh.right <= value.area.x + value.area.w + 1)) failures.push(`Mesh right ${value.mesh.right} > ${value.area.x + value.area.w + 1}`);
  if (!(value.mesh.top >= value.area.y - 1)) failures.push(`Mesh top ${value.mesh.top} < ${value.area.y - 1}`);
  if (!(value.mesh.bottom <= value.area.y + value.area.h + 1)) failures.push(`Mesh bottom ${value.mesh.bottom} > ${value.area.y + value.area.h + 1}`);
  if (!(value.screenX >= value.area.x)) failures.push(`Self x ${value.screenX} < ${value.area.x}`);
  if (!(value.screenX <= value.area.x + value.area.w)) failures.push(`Self x ${value.screenX} > ${value.area.x + value.area.w}`);
  return failures;
}
