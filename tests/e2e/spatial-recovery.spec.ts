import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { createHash, randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import type { HouseCommand, HouseReceipt, HouseSnapshot, LiveSnapshot } from '../../src/house-contract.ts';
import { beginAdmission, closeTool } from './house-journey.ts';

const canvas = (page: Page) => page.locator('.house-world-canvas');
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function receiptCount(actorId: string, commandId: string) {
  const path = process.env.NATIVE_RECOVERY_DB;
  if (!path) return null; // Explicit isolated fixture only; no production/default fallback.
  const database = new DatabaseSync(path, { readOnly: true });
  try { return Number((database.prepare('SELECT COUNT(*) AS count FROM receipts WHERE actor_id=? AND command_id=?').get(actorId, commandId) as { count: number }).count); }
  finally { database.close(); }
}
interface WireRequest { event: string; body: Record<string, any>; receipt?: HouseReceipt; snapshot?: LiveSnapshot; acknowledged?: boolean }
function observeWire(page: Page) {
  const requests: WireRequest[] = [], heads: LiveSnapshot[] = [], errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('websocket', socket => {
    const pending = new Map<string, WireRequest>();
    socket.on('framesent', frame => {
      const match = String(frame.payload).match(/^42(\d+)(\[.*)$/s);
      if (!match) return;
      const [event, body] = JSON.parse(match[2]);
      const request = { event, body }; requests.push(request); pending.set(match[1], request);
    });
    socket.on('framereceived', frame => {
      const match = String(frame.payload).match(/^4([23])(\d*)(\[.*)$/s);
      if (!match) return;
      const data = JSON.parse(match[3]);
      if (match[1] === '2' && data[0] === 'house.snapshot') heads.push(data[1]);
      if (match[1] === '3') {
        const request = pending.get(match[2]), reply = data[0];
        if (request && reply?.ok) {
          request.acknowledged = true;
          if (reply.snapshot) { request.snapshot = reply.snapshot; heads.push(reply.snapshot); }
          if (reply.commandId) request.receipt = reply;
        }
      }
    });
  });
  return { requests, heads, errors };
}
async function snapshot(page: Page, zoneId = 'lounge'): Promise<HouseSnapshot> {
  const response = await page.request.get('/api/house/snapshot', { params: { zone: zoneId } });
  expect(response.status()).toBe(200); return response.json();
}
async function createHome(page: Page) {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await beginAdmission(page, 'create');
  await page.getByLabel('Your name', { exact: true }).fill('Native Recovery Rowan');
  await page.getByRole('combobox', { name: 'Bedrooms', exact: true }).selectOption('2');
  await page.getByRole('button', { name: 'Create house', exact: true }).click();
  await expect(page.locator('#connection-status')).toHaveText('Together, live');
  await expect(canvas(page)).toHaveAttribute('data-self-x', /^-?\d/);
  return snapshot(page);
}
async function enterBedroom(page: Page, roomId: string) {
  await closeTool(page);
  await page.getByRole('button', { name: 'Places', exact: true }).click();
  await page.locator('#places-panel [data-place="room"]').click();
  await expect(canvas(page)).toHaveAttribute('data-zone-id', roomId, { timeout: 30_000 });
}
async function openPending(page: Page) {
  await closeTool(page);
  await page.getByRole('button', { name: 'Pause and options', exact: true }).click();
  await page.getByRole('button', { name: 'Pending drafts', exact: true }).click();
  await expect(page.locator('#panel-title')).toHaveText('Pending drafts');
}
// Explicit synthetic precondition: production outbox API writes a recent local draft.
// No server state, authority, ACK, connection or network loss is fabricated.
async function seedDraft(page: Page, command: HouseCommand, identityId: string, zoneId: string, held = false) {
  return page.evaluate(async value => {
    const modulePath = '/house-client.js';
    const { createCommandOutbox } = await import(modulePath);
    const outbox = createCommandOutbox(sessionStorage);
    const entry = outbox.add(value.command, value.identityId, value.zoneId);
    if (value.held) outbox.hold(value.command.commandId);
    return entry;
  }, { command, identityId, zoneId, held });
}
async function readDraft(page: Page, commandId: string) {
  return page.evaluate(async id => {
    const modulePath = '/house-client.js';
    const { createCommandOutbox } = await import(modulePath);
    return createCommandOutbox(sessionStorage).all().find((entry: { command: HouseCommand }) => entry.command.commandId === id) ?? null;
  }, commandId);
}
const row = (page: Page, commandId: string) => page.locator(`.pending-entry[data-command-id="${commandId}"]`);
const sendsFor = (wire: ReturnType<typeof observeWire>, commandId: string) => wire.requests.filter(value => value.event === 'house.command' && value.body.command?.commandId === commandId);
async function attachment(info: TestInfo, value: unknown) {
  await info.attach('native-recovery-sanitized', { body: JSON.stringify(value, null, 2), contentType: 'application/json' });
}

test('pending bedroom Return advances real subscription authority and holds its exact chat until explicit Retry', async ({ page }, info) => {
  const wire = observeWire(page), home = await createHome(page);
  const roomId = home.residents.find(value => value.id === home.selfId)!.bedroomId;
  const before = await snapshot(page, roomId), departure = wire.heads.at(-1)!;
  const command: HouseCommand = { commandId: randomUUID(), type: 'chat.send', houseId: home.house.id, payload: { zoneId: roomId, text: 'Native recovery retains my original room message.' } };
  const original = await seedDraft(page, command, home.selfId, roomId);
  const receiptCounts = [receiptCount(home.selfId, command.commandId)]; if (receiptCounts[0] !== null) expect(receiptCounts[0]).toBe(0);
  await openPending(page);
  await expect(row(page, command.commandId).locator('[data-action="retry"]')).toBeDisabled();
  await row(page, command.commandId).getByRole('button', { name: 'Return to original room', exact: true }).click();
  await expect(canvas(page)).toHaveAttribute('data-zone-id', roomId, { timeout: 30_000 });
  await expect(page.locator('#panel-title')).toHaveText('Pending drafts');
  await expect(row(page, command.commandId)).toContainText('Automatic retry is paused');
  await expect(row(page, command.commandId).locator('[data-action="retry"]')).toBeEnabled();
  const arrival = wire.requests.find(value => value.event === 'house.subscribe' && value.body.zoneId === roomId)?.snapshot;
  expect(arrival).toBeDefined(); expect(arrival!.generation).toBeGreaterThan(departure.generation);
  expect(arrival!.accessGeneration).toBeGreaterThan(departure.accessGeneration);
  expect(arrival!.serverEpoch).toBe(departure.serverEpoch);
  const held = await readDraft(page, command.commandId);
  expect(held).toEqual({ ...original, recoveryHeld: true });
  expect(Date.now() - held.createdAt).toBeLessThan(60_000);
  // Polling only observes actual state. It never injects time or triggers a send.
  const arrived = await snapshot(page, roomId);
  expect(arrived.chat).toEqual(before.chat); expect(arrived.sequence).toBe(before.sequence);
  receiptCounts.push(receiptCount(home.selfId, command.commandId)); if (receiptCounts[1] !== null) expect(receiptCounts[1]).toBe(0);
  expect(sendsFor(wire, command.commandId)).toHaveLength(0);
  await row(page, command.commandId).locator('[data-action="retry"]').click();
  await expect.poll(() => readDraft(page, command.commandId)).toBeNull();
  await expect.poll(async () => (await snapshot(page, roomId)).chat.filter(value => value.text === command.payload.text).length).toBe(1);
  const saved = await snapshot(page, roomId), sent = sendsFor(wire, command.commandId);
  expect(sent).toHaveLength(1); expect(sent[0].body.command).toEqual(command);
  expect(sent[0].receipt).toMatchObject({ ok: true, commandId: command.commandId, sequence: before.sequence + 1 });
  expect(saved.chat).toHaveLength(before.chat.length + 1); expect(saved.sequence).toBe(before.sequence + 1);
  expect(saved.chat.at(-1)!.id).toBe(sent[0].receipt!.result!.chatId);
  receiptCounts.push(receiptCount(home.selfId, command.commandId)); if (receiptCounts[2] !== null) expect(receiptCounts[2]).toBe(1);
  expect(wire.errors).toEqual([]);
  await attachment(info, { actor: 'Recovery Rowan', sqliteReceiptCounts: receiptCounts, commandSha256: digest(command), precondition: 'synthetic recent production outbox draft; actual UI identity and room', route: 'lounge to own bedroom', generation: [departure.generation, arrival!.generation], accessGeneration: [departure.accessGeneration, arrival!.accessGeneration], commandSendsBeforeRetry: 0, commandSendsAfterRetry: sent.length, chatCounts: [before.chat.length, arrived.chat.length, saved.chat.length], roomSequences: [before.sequence, arrived.sequence, saved.sequence], acknowledgedReceipts: sent.filter(value => value.receipt).length, originalPayloadPreserved: true, outboxRemoved: true });
});

test('pending game Return waits for a real chair ACK and accepted receipt still reconciles after Stand', async ({ page }, info) => {
  const wire = observeWire(page), home = await createHome(page);
  const roomId = home.residents.find(value => value.id === home.selfId)!.bedroomId;
  await enterBedroom(page, roomId); const departure = wire.heads.at(-1)!;
  const before = await snapshot(page), table = before.game!;
  const command: HouseCommand = { commandId: randomUUID(), type: 'game.join', houseId: home.house.id, expectedRevision: table.revision, payload: { roundId: table.current?.roundId ?? null } };
  const original = await seedDraft(page, command, home.selfId, 'lounge');
  const receiptCounts = [receiptCount(home.selfId, command.commandId)]; if (receiptCounts[0] !== null) expect(receiptCounts[0]).toBe(0);
  await openPending(page);
  await row(page, command.commandId).getByRole('button', { name: 'Go to activity table', exact: true }).click();
  await expect(canvas(page)).toHaveAttribute('data-zone-id', 'lounge', { timeout: 30_000 });
  await expect(page.locator('#panel-title')).toHaveText('Pending drafts', { timeout: 30_000 });
  await expect(row(page, command.commandId)).toContainText('Automatic retry is paused');
  await expect(canvas(page)).toHaveAttribute('data-self-animation', 'sit');
  const arrival = wire.requests.filter(value => value.event === 'house.subscribe' && value.body.zoneId === 'lounge').at(-1)!.snapshot!;
  expect(arrival.generation).toBeGreaterThan(departure.generation); expect(arrival.accessGeneration).toBeGreaterThan(departure.accessGeneration);
  const chair = wire.requests.filter(value => value.event === 'house.seat').at(-1)!;
  expect(chair.body.seatId).toMatch(/^game-seat-[1-6]$/); expect(chair.acknowledged).toBe(true);
  await expect.poll(() => wire.heads.some(head => head.durable.zoneId === 'lounge' && head.players.some(value => value.id === home.selfId && value.seatId === chair.body.seatId))).toBe(true);
  expect(await readDraft(page, command.commandId)).toEqual({ ...original, recoveryHeld: true });
  expect((await snapshot(page)).game).toEqual(before.game); expect(sendsFor(wire, command.commandId)).toHaveLength(0);
  receiptCounts.push(receiptCount(home.selfId, command.commandId)); if (receiptCounts[1] !== null) expect(receiptCounts[1]).toBe(0);
  await row(page, command.commandId).locator('[data-action="retry"]').click();
  await expect.poll(() => readDraft(page, command.commandId)).toBeNull();
  await expect.poll(async () => (await snapshot(page)).game!.current!.players.includes(home.selfId)).toBe(true);
  const first = sendsFor(wire, command.commandId)[0]; expect(first.body.command).toEqual(command); expect(first.receipt?.ok).toBe(true);
  receiptCounts.push(receiptCount(home.selfId, command.commandId)); if (receiptCounts[2] !== null) expect(receiptCounts[2]).toBe(1);
  // Explicit synthetic retained-copy precondition after a real accepted command.
  // Stand changes the actual table; manual replay must return the original receipt.
  await seedDraft(page, command, home.selfId, 'lounge', true);
  await closeTool(page); await page.locator('#game-table-stand').click();
  await expect(canvas(page)).not.toHaveAttribute('data-self-animation', 'sit');
  const afterStand = await snapshot(page); expect(afterStand.game!.current?.players.includes(home.selfId) ?? false).toBe(false);
  await openPending(page); await expect(row(page, command.commandId).locator('[data-action="retry"]')).toBeEnabled();
  expect(sendsFor(wire, command.commandId)).toHaveLength(1);
  await row(page, command.commandId).locator('[data-action="retry"]').click();
  await expect.poll(() => readDraft(page, command.commandId)).toBeNull();
  const sent = sendsFor(wire, command.commandId); expect(sent).toHaveLength(2);
  expect(sent[1].body.command).toEqual(command); expect(sent[1].receipt).toEqual(first.receipt);
  expect((await snapshot(page)).game).toEqual(afterStand.game); expect(wire.errors).toEqual([]);
  receiptCounts.push(receiptCount(home.selfId, command.commandId)); if (receiptCounts[3] !== null) expect(receiptCounts[3]).toBe(1);
  await attachment(info, { actor: 'Recovery Rowan', sqliteReceiptCounts: receiptCounts, commandSha256: digest(command), precondition: 'synthetic recent production outbox draft; actual UI identity and real table revision', route: 'own bedroom to actual lounge game chair', generation: [departure.generation, arrival.generation], accessGeneration: [departure.accessGeneration, arrival.accessGeneration], chairAcknowledged: true, sendsBeforeRetry: 0, sendsAfterFirstRetry: 1, sendsAfterAcceptedReceiptReplay: sent.length, equalAcceptedReceipts: true, gameRevisions: [table.revision, first.receipt!.entityRevision, afterStand.game!.revision], standingReplayDidNotRejoin: true, outboxRemoved: true });
});
