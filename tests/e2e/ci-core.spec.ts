import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { recordStartup as timedStartup, type StartupTiming } from './startup-timing.ts';

import { beginAdmission, continueSavedHome, showResidents, openHouseSettings, openChat, openStudyNotes } from './house-journey.ts';

const DESKTOP = { width: 1920, height: 1080 };
const PHONE = { width: 390, height: 844 };
const canvas = (page: Page) => page.locator('.house-world-canvas');
const resident = (page: Page, name: string) => page.locator('#roster [data-player-id]').filter({ hasText: name });

async function settled(page: Page) {
  await expect(page.locator('#lobby')).toBeHidden();
  await expect(page.locator('#connection-status')).toHaveText('Together, live');
  await expect(canvas(page)).toBeVisible();
  await expect(canvas(page)).toHaveAttribute('data-self-x', /^-?\d/);
}

async function sessionMetadata(context: BrowserContext) {
  // Assertions and logs omit the generated session token.
  return (await context.cookies()).filter(cookie => cookie.name === 'house_session')
    .map(({ name, httpOnly, secure, sameSite, path }) => ({ name, httpOnly, secure, sameSite, path }));
}

async function verifySession(context: BrowserContext) {
  await expect.poll(() => sessionMetadata(context)).toHaveLength(1);
  const [metadata] = await sessionMetadata(context);
  expect(metadata).toMatchObject({ name: 'house_session', httpOnly: true, sameSite: 'Lax', path: '/' });
  if (process.env.EXPECT_SECURE_COOKIES === 'true') expect(metadata?.secure).toBe(true);
}

async function viewportFits(page: Page, viewport: { width: number; height: number }) {
  expect(await page.evaluate(() => ({
    width: innerWidth, height: innerHeight, overflow: document.documentElement.scrollWidth > innerWidth,
  }))).toEqual({ ...viewport, overflow: false });
}

test('house browser core keeps two live identities and a saved authored next step', async ({ browser }, info) => {
  const startupTimings: StartupTiming[] = [];
  async function recordStartup(action: string, task: () => Promise<void>, page: Page) {
    await timedStartup(action, task, () => settled(page), startupTimings);
  }
  const ownerContext = await browser.newContext({ viewport: DESKTOP });
  const peerContext = await browser.newContext({ viewport: PHONE, isMobile: true, hasTouch: true });
  let returningContext: BrowserContext | undefined;
  const errors: string[] = [];
  try {
    const owner = await ownerContext.newPage();
    const peer = await peerContext.newPage();
    for (const [label, page] of [['owner', owner], ['peer', peer]] as const) {
      page.on('pageerror', error => errors.push(`${label}: ${error.message}`));
    }
    await beginAdmission(owner, 'create');
    await owner.getByLabel('Your name', { exact: true }).fill('CI author');
    await owner.getByRole('combobox', { name: 'Bedrooms', exact: true }).selectOption('2');
    await recordStartup('create to first usable frame', () => owner.getByRole('button', { name: 'Create house', exact: true }).click(), owner);
    await verifySession(ownerContext);
    await openHouseSettings(owner);
    const code = (await owner.locator('#join-code-display').textContent())?.trim() ?? '';
    expect(code).toMatch(/^[0-9A-Z]{8}$/);
    await owner.getByRole('button', { name: 'Close panel', exact: true }).click();

    await beginAdmission(peer, 'join');
    await peer.getByLabel('Your name', { exact: true }).fill('CI peer');
    await peer.getByLabel('House code', { exact: true }).fill(code);
    await recordStartup('join to first usable frame', () => peer.getByRole('button', { name: 'Join house', exact: true }).click(), peer);
    await verifySession(peerContext);
    const ownerMe = await (await owner.request.get('/api/house/me')).json();
    const peerMe = await (await peer.request.get('/api/house/me')).json();
    expect(ownerMe.identity.id).toEqual(expect.any(String));
    expect(peerMe.identity.id).toEqual(expect.any(String));
    expect(ownerMe.identity.id).not.toBe(peerMe.identity.id);
    expect(ownerMe.home.id).toEqual(expect.any(String));
    expect(ownerMe.home.id).toBe(peerMe.home.id);
    await showResidents(owner);await showResidents(peer);
    await expect(resident(owner, 'CI peer')).toBeVisible();
    await expect(resident(peer, 'CI author')).toBeVisible();
    await viewportFits(owner, DESKTOP);
    await viewportFits(peer, PHONE);

    await owner.getByRole('radio', { name: 'Can chat', exact: true }).check();
    await expect(resident(peer, 'CI author')).toContainText(/can chat/i);
    await canvas(owner).focus();
    await owner.keyboard.down('ArrowRight');
    try {
      await expect.poll(async () => Number(await canvas(owner).getAttribute('data-self-x'))).toBeGreaterThan(0.2);
      await expect.poll(async () => Number(await resident(peer, 'CI author').getAttribute('data-x'))).toBeGreaterThan(0.2);
    } finally { await owner.keyboard.up('ArrowRight'); }

    await openChat(owner);
    await owner.getByLabel('Message this room', { exact: true }).fill('Where does the last term come from?');
    await owner.getByRole('button', { name: 'Send', exact: true }).click();
    await openChat(peer);
    await expect(peer.locator('#transcript')).toContainText('Where does the last term come from?');
    await peer.getByLabel('Message this room', { exact: true }).fill('<b>Expand the previous line</b>');
    await peer.getByRole('button', { name: 'Send', exact: true }).click();
    await openChat(owner);
    await expect(owner.locator('#transcript')).toContainText('<b>Expand the previous line</b>');
    await expect(owner.locator('#transcript span').filter({ hasText: '<b>Expand the previous line</b>' })).toHaveText('<b>Expand the previous line</b>');
    await expect(owner.locator('#transcript span b')).toHaveCount(0);

    await openStudyNotes(owner);
    await openStudyNotes(peer);
    await owner.getByLabel('Small goal', { exact: true }).fill('Understand the worked example');
    await owner.getByLabel('Question', { exact: true }).fill('Where does the last term come from?');
    await owner.getByLabel('Ask for help', { exact: true }).check();
    await owner.getByRole('button', { name: 'Save card', exact: true }).click();
    await expect(peer.locator('#cards')).toContainText('Understand the worked example');
    await owner.getByLabel('Next step', { exact: true }).fill('Expand the preceding line myself');
    await owner.getByRole('button', { name: 'Save card', exact: true }).click();
    await expect(peer.locator('#cards')).toContainText('Expand the preceding line myself');
    await expect(peer.locator('#cards article').filter({ hasText: 'Understand the worked example' })).toContainText('Question open');

    const storageState = await ownerContext.storageState(); // In memory only.
    const savedIdentity = ownerMe.identity.id;
    await ownerContext.close();
    returningContext = await browser.newContext({ viewport: DESKTOP, storageState });
    const returned = await returningContext.newPage();
    returned.on('pageerror', error => errors.push(`return: ${error.message}`));
    await recordStartup('saved return to first usable frame', async () => {
      await returned.goto('/');
      await continueSavedHome(returned);
    }, returned);
    await verifySession(returningContext);
    const returnedMe = await (await returned.request.get('/api/house/me')).json();
    expect(returnedMe.identity.id).toBe(savedIdentity);
    await openStudyNotes(returned);
    await expect(returned.getByLabel('Small goal', { exact: true })).toHaveValue('Understand the worked example');
    await expect(returned.getByLabel('Next step', { exact: true })).toHaveValue('Expand the preceding line myself');
    await expect(returned.getByLabel('Ask for help', { exact: true })).toBeChecked();
    await openChat(returned);
    await expect(returned.locator('#transcript')).toContainText('<b>Expand the previous line</b>');
    expect(errors).toEqual([]);
  } finally {
    await info.attach('startup-timings', {
      body: JSON.stringify({ clock: 'out-of-browser monotonic', startupTimings,
        complete: startupTimings.length === 3 && startupTimings.every(timing => timing.completed),
        withinTenSeconds: startupTimings.length === 3 && startupTimings.every(timing => timing.budgetAccepted) }, null, 2),
      contentType: 'application/json',
    });
    await Promise.all([ownerContext.close(), peerContext.close(), returningContext?.close()]);
  }
});
