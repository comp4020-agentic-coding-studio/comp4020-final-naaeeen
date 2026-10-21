/** Actual two-identity native authority test; no injected players or DOM game state. */
import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd(), runtime = resolve(root, '.local/post-crit/p1-runtime');
const shortNames = process.env.CAMERA_COPRESENCE_SHORT_NAMES === '1', ownerName = shortNames ? 'Robin' : 'Readability owner', peerName = shortNames ? 'Taylor' : 'Readability peer';
const observerProbe = process.env.CAMERA_OBSERVER_PROBE === '1';
const output = resolve(root, observerProbe ? '.local/post-crit-camera/b-observer-no-self' : shortNames ? '.local/post-crit-camera/b-copresence-short-names' : '.local/post-crit-camera/b-copresence');
await mkdir(output, { recursive: true });
const { createService } = await import(pathToFileURL(resolve(runtime, 'src/server.ts')).href);
const service = createService({ dataDir: resolve(runtime, 'data'), secureCookies: false, origin: 'http://127.0.0.1:4101' });
await new Promise((resolve, reject) => { service.server.once('error', reject); service.server.listen(4101, '127.0.0.1', resolve); });
const browser = await chromium.launch({ executablePath: '/home/lizhi/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome', headless: true, chromiumSandbox: true, args: ['--use-angle=swiftshader'] });
const sourceHashes = Object.fromEntries(await Promise.all(['house-camera.js', 'house-world.js', 'house-label-layout.js', 'house-ui.js', 'house.html', 'house.css'].map(async name => [name, createHash('sha256').update(await readFile(resolve(runtime, 'public', name))).digest('hex')])));
const results = [], errors = [];
const assert = (condition, message) => { if (!condition) throw new Error(message); };
async function wait(predicate, message, timeout = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeout) { if (await predicate()) return; await new Promise(resolve => setTimeout(resolve, 40)); }
  throw new Error('Timed out: ' + message);
}
async function frames(page, count = 2) { for (let index = 0; index < count; index++) await page.evaluate(() => new Promise(requestAnimationFrame)); }
function readAudit() {
  const canvas = document.querySelector('canvas'), bodies = JSON.parse(canvas?.dataset.avatarMeshBounds || '[]');
  const names = [...document.querySelectorAll('.house-avatar-name')].map(el => ({ id: el.dataset.playerId, name: el.dataset.name, available: el.title, visible: getComputedStyle(el).visibility === 'visible' }));
  const violations = [], shown = [];
  for (const element of document.querySelectorAll('.house-world-label')) {
    if (element.hidden || element.closest('[hidden]') || getComputedStyle(element).visibility !== 'visible') continue;
    const rect = element.getBoundingClientRect(); if (!rect.width || !rect.height) continue;
    shown.push({ kind: element.className, authorId: element.dataset.playerId, text: element.textContent, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom });
    for (const body of bodies) if (rect.left < body.right && rect.right > body.left && rect.top < body.bottom && rect.bottom > body.top) violations.push({ kind: element.className, labelAuthor: element.dataset.playerId, bodyId: body.id, rect: rect.toJSON(), body });
  }
  const invalid = bodies.filter(body => !['left', 'right', 'top', 'bottom'].every(key => Number.isFinite(body[key])) || body.right <= body.left || body.bottom <= body.top);
  return { viewport: { width: innerWidth, height: innerHeight }, bodies, names, shown, violations, invalid, animation: canvas?.dataset.selfAnimation, mode: canvas?.dataset.cameraMode };
}
async function audit(page, row, stage, expectedCount = 2) {
  const value = await page.evaluate(readAudit);
  assert(value.bodies.length === expectedCount, 'Expected '+expectedCount+' actual authorized posed actors at ' + stage);
  assert(value.names.length === expectedCount && value.names.every(person => person.available.includes(person.name)), 'Full names remain attributed at ' + stage);
  assert(value.invalid.length === 0, 'Invalid posed body rectangles at ' + stage);
  assert(value.violations.length === 0, 'World label overlaps a body at ' + stage + ': ' + JSON.stringify(value.violations));
  row.samples.push({ stage, ...value });
  return value;
}
async function hold(page, key, duration) {
  await page.locator('canvas').focus(); await page.keyboard.down(key);
  try { await page.waitForTimeout(duration); } finally { await page.keyboard.up(key); }
}
async function projectedClick(page, filter) {
  await frames(page); let target;
  await wait(async () => { target = await page.locator('canvas').evaluate((el, filter) => JSON.parse(el.dataset.pickTargets || '[]').find(entry => entry.visible && Object.entries(filter).every(([key, value]) => entry.target[key] === value)), filter); return Boolean(target); }, 'native projected target');
  assert(await page.evaluate(point => document.elementFromPoint(point.x, point.y)?.tagName === 'CANVAS', target), 'Physical target must be clear of HUD');
  await page.mouse.click(target.x, target.y);
}
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
    const ownerContext = await browser.newContext({ viewport, hasTouch: true });
    const peerContext = await browser.newContext({ viewport, hasTouch: true });
    const owner = await ownerContext.newPage(), peer = await peerContext.newPage();
    const row = { viewport, samples: [], failures: [] }; results.push(row);
    for (const page of [owner, peer]) page.on('pageerror', error => errors.push(error.message));
    try {
      await owner.goto('http://127.0.0.1:4101/'); await owner.locator('#title-create').click();
      await owner.locator('#name').fill(ownerName); await owner.locator('#colour').selectOption('sage'); await owner.locator('#capacity').selectOption('2'); await owner.locator('#create-form button').click();
      await owner.locator('#house-code-button').click(); const code = (await owner.locator('#join-code-display').textContent()).trim(); await owner.locator('#panel-close').click();
      await peer.goto('http://127.0.0.1:4101/'); await peer.locator('#title-join').click();
      await peer.locator('#name').fill(peerName); await peer.locator('#colour').selectOption('blue'); await peer.locator('#join-code').fill(code); await peer.locator('#join-form button').click();
      await wait(async () => (await owner.locator('.house-avatar-name').count()) === 2 && (await peer.locator('.house-avatar-name').count()) === 2, 'real two-context admission');
      await frames(owner); await frames(peer);
      const ownerIdentity = await (await owner.request.get('http://127.0.0.1:4101/api/house/me')).json();
      const peerIdentity = await (await peer.request.get('http://127.0.0.1:4101/api/house/me')).json();
      row.identities = [{ id: ownerIdentity.identity.id, name: ownerIdentity.identity.name, colour: ownerIdentity.identity.colour }, { id: peerIdentity.identity.id, name: peerIdentity.identity.name, colour: peerIdentity.identity.colour }];
      assert(row.identities[0].id !== row.identities[1].id, 'Separate browser contexts must have independent authority identities');
      for (const page of [owner, peer]) {
        await page.locator('#resident-disclosure summary').click();
        const roster = await page.locator('#roster').innerText(); assert(roster.includes(ownerName) && roster.includes(peerName), 'Both real identities must be available in the roster');
        await page.locator('#resident-disclosure summary').click();
        await page.getByRole('radio', { name: 'Can chat', exact: true }).check();
      }
      await wait(async () => await owner.locator('.house-avatar-name[data-name="'+ownerName+'"]').getAttribute('data-availability') === 'chat' && await owner.locator('.house-avatar-name[data-name="'+peerName+'"]').getAttribute('data-availability') === 'chat', 'explicit real availability snapshots');
      if (observerProbe) {
        await frames(owner); await audit(owner, row, 'latest controller co-presence smoke');
        const observer = await ownerContext.newPage(); observer.on('pageerror', error => errors.push(error.message));
        await observer.goto('http://127.0.0.1:4101/'); await observer.locator('#title-continue').click();
        await wait(async () => await observer.locator('#takeover').isVisible(), 'same-identity actual observer');
        await owner.locator('[data-panel=room]').click(); await owner.locator('#walk-room').click();
        await wait(async () => (await owner.locator('#place-label').textContent()) === ownerName + "'s room", 'controller enters own bedroom while observer stays in lounge');
        await wait(async () => (await observer.evaluate(readAudit)).bodies.length === 1, 'observer publishes the remaining peer without self');
        await observer.locator('#camera-hud-follow').click(); await frames(observer);
        let view = await audit(observer, row, 'observer has no self mesh', 1);
        assert(view.bodies[0].id === peerIdentity.identity.id && !view.bodies.some(body => body.id === ownerIdentity.identity.id), 'Observer sees actual peer while own controller is elsewhere');
        assert(await observer.locator('canvas').getAttribute('data-self-mesh-bounds') === null, 'Observer must not retain self-only mesh diagnostics');
        await peer.locator('canvas').focus(); await peer.keyboard.down('ArrowLeft');
        try { for (let frame = 0; frame < 8; frame++) { await frames(observer, 1); await audit(observer, row, 'observer moving peer frame ' + frame, 1); } } finally { await peer.keyboard.up('ArrowLeft'); }
        await peer.locator('#camera-hud-overview').click(); await projectedClick(peer, {type:'seat',seatId:'seat-1'});
        await wait(async () => await peer.locator('canvas').getAttribute('data-self-animation') === 'sit', 'observed peer authoritative seat');
        await frames(observer); await audit(observer, row, 'observer seated peer', 1);
        await peer.locator('[data-panel=chat]').click(); await peer.locator('#chat-input').fill('An actual observer can read this attributed message.'); await peer.locator('#quick-chat button[type=submit]').click();
        await wait(async () => (await peer.locator('#transcript').innerText()).includes('An actual observer can read this attributed message.'), 'observer peer chat accepted'); await peer.locator('#chat-close').click();
        await wait(async () => await observer.locator('.chat-bubble[data-player-id="'+peerIdentity.identity.id+'"]').getAttribute('data-message-id'), 'observer fresh attributed bubble');
        await frames(observer); view = await audit(observer, row, 'observer fresh peer speech', 1); row.visibleSpeechPreviews = view.shown.filter(label => label.kind.includes('chat-bubble')).length;
        await observer.screenshot({path:resolve(output,'B-observer-no-self-'+viewport.width+'x'+viewport.height+'.png')});
        await observer.locator('#resident-disclosure summary').click(); const roster = await observer.locator('#roster').innerText(); assert(roster.includes(ownerName)&&roster.includes(peerName),'Observer roster preserves both actual identities'); await observer.locator('#resident-disclosure summary').click();
        await observer.locator('[data-panel=chat]').click(); assert((await observer.locator('#transcript').innerText()).includes('An actual observer can read this attributed message.'),'Observer transcript preserves full attributed message'); await observer.locator('#chat-close').click();
        row.observerWithoutSelf = true; row.complete = true; continue;
      }
      await hold(peer, 'ArrowLeft', 650); await frames(owner); await audit(owner, row, 'separated native peers');
      await peer.locator('canvas').focus(); await peer.keyboard.down('ArrowRight');
      try { for (let frame = 0; frame < 16; frame++) { await frames(owner, 1); await audit(owner, row, 'remote moving frame ' + frame); } } finally { await peer.keyboard.up('ArrowRight'); }
      await owner.locator('#camera-hud-overview').click(); await projectedClick(owner, { type: 'seat', seatId: 'seat-1' });
      await wait(async () => await owner.locator('canvas').getAttribute('data-self-animation') === 'sit', 'owner authoritative seat');
      await peer.locator('#camera-hud-overview').click(); await projectedClick(peer, { type: 'seat', seatId: 'seat-2' });
      await wait(async () => await peer.locator('canvas').getAttribute('data-self-animation') === 'sit', 'peer authoritative seat');
      await owner.locator('#camera-hud-follow').click(); await peer.locator('#camera-hud-follow').click(); await frames(owner); await frames(peer);
      await audit(owner, row, 'two authoritative seated bodies owner view'); await audit(peer, row, 'two authoritative seated bodies peer view');
      await peer.locator('[data-panel=chat]').click(); await peer.locator('#chat-input').fill('An attributed co-presence readability message.'); await peer.locator('#quick-chat button[type=submit]').click();
      await wait(async () => (await peer.locator('#transcript').innerText()).includes('An attributed co-presence readability message.'), 'real attributed chat delivery');
      await peer.locator('#chat-close').click();
      await wait(async () => await owner.locator('.chat-bubble[data-player-id="' + peerIdentity.identity.id + '"]').getAttribute('data-message-id'), 'fresh actual peer bubble');
      await frames(owner); const speech = await audit(owner, row, 'fresh peer speech preview'); row.visibleSpeechPreviews = speech.shown.filter(label => label.kind.includes('chat-bubble')).length;
      await owner.screenshot({ path: resolve(output, 'B-two-peers-' + viewport.width + 'x' + viewport.height + '.png') });
      await owner.locator('[data-panel=chat]').click(); assert((await owner.locator('#transcript').innerText()).includes('An attributed co-presence readability message.'), 'Hidden preview fallback preserves complete delivered chat'); await owner.locator('#chat-close').click();
      await hold(owner, 'e', 10); await wait(async () => await owner.locator('canvas').getAttribute('data-self-animation') !== 'sit', 'owner stand'); await frames(owner); await audit(owner, row, 'stand pose transition');
      row.complete = true;
    } catch (error) {
      row.failures.push(error.message); row.failureAudit = await owner.evaluate(readAudit).catch(() => null);
      await owner.screenshot({ path: resolve(output, 'B-two-peers-' + viewport.width + 'x' + viewport.height + '-failure.png') }).catch(() => {});
    } finally {
      await ownerContext.close(); await peerContext.close();
      await writeFile(resolve(output, 'results.json'), JSON.stringify({ fixtureNames: {ownerName, peerName}, sourceHashes, browserVersion: browser.version(), results, errors }, null, 2) + '\n');
      console.log(JSON.stringify({ viewport, samples: row.samples.length, complete: row.complete, visibleSpeechPreviews: row.visibleSpeechPreviews, failures: row.failures }));
    }
    if (row.failures.length) break;
  }
  if (results.some(row => row.failures.length) || errors.length) process.exitCode = 1;
} finally { await browser.close(); await service.close(); }
