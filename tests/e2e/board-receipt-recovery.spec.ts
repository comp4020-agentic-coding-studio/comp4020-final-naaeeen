import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import type { BoardReceipt, BoardSnapshot } from '../../src/board-contract.ts';
import {
  boardFixtureOrigin, boardSnapshot, createBoardHouse, joinBoardHouse, newBoardContext, editorCanvas,
} from './board-journey.ts';

process.env.PLAYWRIGHT_NO_COPY_PROMPT = '1';
test.use({ trace: 'off', screenshot: 'off', video: 'off' });
const sha = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const poll = { timeout: 10_000, intervals: [100, 250, 500] };
async function sticky(page: Page, text: string) {
  await page.getByRole('button', { name: 'Sticky note', exact: true }).click();
  await page.getByLabel('Your note', { exact: true }).fill(text);
  await page.getByRole('button', { name: 'Place note', exact: true }).click();
}

test('a lost board reply replays its original receipt after a peer addition and keeps authored export', async ({ browser, baseURL }, info) => {
  const origin = boardFixtureOrigin(baseURL);
  const ownerContext = await newBoardContext(browser, origin);
  const authorContext = await newBoardContext(browser, origin, true);
  const errors: string[] = [], routeErrors: string[] = [];
  const attempts: { id: string; requestDigest: string; responseDigest?: string; delivered: boolean }[] = [];
  let originalBody: { id: string; houseId: string; elements: unknown[] } | null = null;
  let accepted: BoardReceipt | null = null, replayed: BoardReceipt | null = null, allowReplay = false;
  try {
    const owner = await ownerContext.newPage(), author = await authorContext.newPage();
    for (const page of [owner, author]) page.on('pageerror', error => errors.push(error.message));
    const created = await createBoardHouse(owner, 'Receipt house owner', 2);
    const joined = await joinBoardHouse(author, 'Receipt note author', created.home.code);
    expect(joined.identity.id).not.toBe(created.identity.id);
    await expect(owner.locator('.resident-avatar')).toHaveCount(2);
    await expect(author.locator('.resident-avatar')).toHaveCount(2);

    // Fault only the author's first accepted patch response, after it reaches the
    // real service. The browser's ordinary pending/retry path retains the UUID.
    await author.route('**/api/board/patch', async route => {
      try {
        const body = route.request().postDataJSON() as { id: string; houseId: string; elements: unknown[] };
        if (originalBody && body.id !== originalBody.id) { await route.continue(); return; }
        const observation = { id: body.id, requestDigest: sha(body), delivered: false } as typeof attempts[number];
        attempts.push(observation);
        if (originalBody && !allowReplay) { await route.abort('failed'); return; }
        if (!originalBody) originalBody = body;
        const response = await route.fetch();
        const receipt = await response.json() as BoardReceipt;
        if (response.status() !== 200 || receipt.ok !== true || receipt.id !== body.id) throw new Error('The real patch did not return an accepted original receipt.');
        observation.responseDigest = sha(receipt);
        if (!accepted) { accepted = receipt; await route.abort('failed'); return; }
        replayed = receipt; observation.delivered = true;
        await route.fulfill({ response });
      } catch (error) {
        routeErrors.push(error instanceof Error ? error.message : 'Route observation failed.');
        await route.abort('failed').catch(() => {});
      }
    });
    const originalText = 'Keep the accepted idea.\nKeep the accepted idea.\nKeep the accepted idea.';
    await sticky(author, originalText);
    await expect.poll(() => accepted !== null, poll).toBe(true);
    await expect(author.locator('.board-save')).toContainText('Save needs attention');
    await expect.poll(async () => (await boardSnapshot(owner, created.home.id)).elements.some(element => element.originalText === originalText), poll).toBe(true);

    const peerText = 'A later idea from a different housemate';
    await sticky(owner, peerText);
    await expect(owner.locator('.board-save')).toContainText('All changes saved');
    const beforeReplay = await boardSnapshot(owner, created.home.id);
    expect(beforeReplay.sequence).toBeGreaterThan((accepted as unknown as BoardReceipt).sequence);
    expect(beforeReplay.elements.some(element => element.originalText === peerText)).toBe(true);

    await author.locator('.board-save').click();
    allowReplay = true;
    await author.getByRole('button', { name: 'Retry pending', exact: true }).click();
    await expect(author.locator('.board-save')).toContainText('All changes saved');
    await expect.poll(() => replayed !== null, poll).toBe(true);
    expect(replayed).toEqual(accepted);
    expect(attempts.length).toBeGreaterThanOrEqual(2);
    expect(new Set(attempts.map(attempt => attempt.id)).size).toBe(1);
    expect(new Set(attempts.map(attempt => attempt.requestDigest)).size).toBe(1);
    expect(attempts.filter(attempt => attempt.responseDigest).every(attempt => attempt.responseDigest === sha(accepted))).toBe(true);
    expect((await boardSnapshot(owner, created.home.id)).sequence).toBe(beforeReplay.sequence);

    const downloadEvent = author.waitForEvent('download');
    await author.getByRole('button', { name: 'My contributions', exact: true }).click();
    const download = await downloadEvent, path = await download.path();
    expect(download.suggestedFilename()).toBe('my-board-contributions.json');
    expect(path).not.toBeNull();
    const exported = JSON.parse(await readFile(path!, 'utf8')) as BoardSnapshot;
    expect(exported.houseId).toBe(created.home.id);
    expect(exported.elements.some(element => element.originalText === originalText)).toBe(true);
    expect(exported.elements.some(element => element.originalText === peerText)).toBe(false);
    await author.reload();
    await expect(author.locator('.board-save')).toContainText('All changes saved');
    const reopened = await boardSnapshot(author, created.home.id);
    expect(reopened.sequence).toBe(beforeReplay.sequence);
    expect(reopened.elements.some(element => element.originalText === originalText)).toBe(true);
    expect(reopened.elements.some(element => element.originalText === peerText)).toBe(true);
    await expect(editorCanvas(author)).toBeVisible();
    // Read the current editor through its ordinary download control, independently
    // of the server snapshot. A saved label alone cannot prove scene installation.
    const canvasDownloadEvent = author.waitForEvent('download');
    await author.getByRole('button', { name: 'Download canvas file', exact: true }).click();
    const canvasDownload = await canvasDownloadEvent, canvasPath = await canvasDownload.path();
    expect(canvasDownload.suggestedFilename()).toBe('house-board.excalidraw');
    expect(canvasPath).not.toBeNull();
    const rendered = JSON.parse(await readFile(canvasPath!, 'utf8')) as { elements: BoardSnapshot['elements'] };
    for (const text of [originalText, peerText]) {
      const savedText = reopened.elements.find(element => element.originalText === text)!;
      expect(rendered.elements.some(element => element.id === savedText.id && element.originalText === text && !element.isDeleted)).toBe(true);
    }
    await author.getByRole('button', { name: 'Fit all objects', exact: true }).click();
    await author.screenshot({ path: info.outputPath('receipt-recovered-board.png') });
    expect(routeErrors).toEqual([]); expect(errors).toEqual([]);
    await info.attach('receipt-recovery-observations', { body: JSON.stringify({
      scope: 'Two native browser identities, controlled lost HTTP reply, real service and ordinary retry/export/reload. Peer adds a separate note; same-object replacement and expiry remain store/service tests.',
      houseId: created.home.id, authorId: joined.identity.id, original: originalBody,
      accepted, replayed, attempts, sequenceAfterPeer: beforeReplay.sequence,
      exportedOwnObjectIds: exported.elements.map(element => element.id),
      reopenedEditorObjects: rendered.elements.map(element => ({ id: element.id, originalText: element.originalText, isDeleted: element.isDeleted })), pageErrors: errors,
    }, null, 2), contentType: 'application/json' });
  } finally {
    await authorContext.close(); await ownerContext.close();
  }
});
