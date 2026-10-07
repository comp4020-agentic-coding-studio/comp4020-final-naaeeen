import { expect, type Browser, type BrowserContext, type Locator, type Page } from '@playwright/test';
import type { BoardSnapshot } from '../../src/board-contract.ts';
import type { HouseSnapshot, Me } from '../../src/house-contract.ts';

export const DESKTOP = { width: 1920, height: 1080 };
export const PHONE = { width: 390, height: 844 };
export const editorCanvas = (page: Page) => page.locator('.excalidraw canvas.interactive');
const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export function boardFixtureOrigin(baseURL: string | undefined) {
  const origin = baseURL ?? 'http://127.0.0.1:4088';
  const url = new URL(origin);
  if (!['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('Board mutation cases require the authorised loopback fixture.');
  return origin;
}

export async function newBoardContext(browser: Browser, baseURL: string, phone = false): Promise<BrowserContext> {
  return browser.newContext({
    baseURL, viewport: phone ? PHONE : DESKTOP,
    ...(phone ? { isMobile: true, hasTouch: true } : {}),
    permissions: ['clipboard-read', 'clipboard-write'],
  });
}

export async function boardMe(page: Page): Promise<Me> {
  const response = await page.request.get('/api/board/context');
  if (!response.ok()) throw new Error(`Board context read failed with HTTP ${response.status()}.`);
  const value: unknown = await response.json();
  if (!record(value) || !record(value.identity) || typeof value.identity.id !== 'string' ||
      typeof value.identity.name !== 'string' || typeof value.identity.colour !== 'string' ||
      typeof value.identity.revision !== 'number' || typeof value.archiveCount !== 'number' ||
      !(value.home === null || record(value.home) && typeof value.home.id === 'string' &&
        typeof value.home.ownerId === 'string' && typeof value.home.code === 'string' && typeof value.home.capacity === 'number')) {
    throw new Error('Board context must use the current {identity, home, archiveCount} authority shape.');
  }
  return value as unknown as Me;
}

export async function boardSnapshot(page: Page, houseId: string): Promise<BoardSnapshot> {
  const response = await page.request.get(`/api/board/snapshot?houseId=${encodeURIComponent(houseId)}`);
  if (!response.ok()) throw new Error(`Scoped board snapshot failed with HTTP ${response.status()}.`);
  const value: unknown = await response.json();
  if (!record(value) || value.schemaVersion !== 1 || value.houseId !== houseId || typeof value.sequence !== 'number' ||
      !Array.isArray(value.elements) || !Array.isArray(value.files) || !Array.isArray(value.chat)) {
    throw new Error('Scoped board snapshot has an unsupported authority shape.');
  }
  return value as unknown as BoardSnapshot;
}

export async function houseMembership(page: Page): Promise<HouseSnapshot> {
  const response = await page.request.get('/api/house/snapshot?zone=lounge');
  if (!response.ok()) throw new Error(`Current membership read failed with HTTP ${response.status()}.`);
  const value: unknown = await response.json();
  if (!record(value) || value.schemaVersion !== 2 || !Array.isArray(value.residents)) throw new Error('Current membership snapshot is required.');
  return value as unknown as HouseSnapshot;
}

export async function createBoardHouse(page: Page, name: string, capacity = 2) {
  await page.goto('/board/');
  await page.getByLabel('Your name', { exact: true }).fill(name);
  // The associated label includes selected option text; use its stable visible prefix.
  await page.getByLabel('Permanent places').selectOption(String(capacity));
  await page.getByRole('button', { name: 'Create house', exact: true }).click();
  await expect(editorCanvas(page)).toBeVisible();
  await expect(page.locator('.board-save')).toContainText('All changes saved');
  const me = await boardMe(page);
  if (!me.home) throw new Error('Creating a board house must return current permanent membership.');
  return { ...me, home: me.home };
}

export async function joinBoardHouse(page: Page, name: string, code: string) {
  await page.goto('/board/');
  await page.getByLabel('Your name', { exact: true }).fill(name);
  await page.getByLabel('House code', { exact: true }).fill(code);
  await page.getByRole('button', { name: 'Join house', exact: true }).click();
  await expect(editorCanvas(page)).toBeVisible();
  await expect(page.locator('.board-save')).toContainText('All changes saved');
  return boardMe(page);
}

export async function viewportFits(page: Page, phone = false) {
  expect(await page.evaluate(() => ({ width: innerWidth, height: innerHeight, overflow: document.documentElement.scrollWidth > innerWidth })))
    .toEqual({ ...(phone ? PHONE : DESKTOP), overflow: false });
}

export async function visibleBox(locator: Locator, label: string) {
  const box = await locator.boundingBox();
  if (!box || box.width <= 0 || box.height <= 0) throw new Error(`${label} must have visible native bounds.`);
  return box;
}

export async function writeNativePngClipboard(page: Page) {
  await page.evaluate(async () => {
    const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 48;
    const context = canvas.getContext('2d'); if (!context) throw new Error('Native PNG fixture needs a 2D context.');
    context.fillStyle = '#86a679'; context.fillRect(0, 0, 64, 48);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('PNG encoding failed.')), 'image/png'));
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
  });
}

export const requestedGameAssets = (urls: string[]) => urls.filter(url => /\/(?:house-world|house-ui|house-camera|render-three)\.js|three\.module/.test(url));

export async function closeBoardContexts(contexts: BrowserContext[]) {
  await Promise.allSettled(contexts.map(context => context.close()));
}
