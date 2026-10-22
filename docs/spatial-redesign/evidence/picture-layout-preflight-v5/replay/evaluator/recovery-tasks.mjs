// DRAFT HELD: imported only by the proposed v2 preflight after contextual review.
import assert from 'node:assert/strict';
import {expect} from '@playwright/test';
import {assertBlockedPlacement,readPlacementObservation} from './placement-block-guard.mjs';
export async function verifyRecoveryAndStart(page,{oneBox,boxPass,screenshot}){
  const action=name=>page.locator('[data-puzzle-action="'+name+'"]'),menu=page.locator('[data-puzzle-menu]'),summary=page.locator('[data-puzzle-menu-summary]');
  const closeMenu=async()=>{if(await menu.getAttribute('open')!==null)await action('close-menu').click();};
  const openMenu=async()=>{if(await menu.getAttribute('open')===null){await summary.focus();await summary.press('Enter');}};
  const count=event=>page.evaluate(name=>window.fixture.events.filter(item=>item.event===name).length,event);
  const reachable=async locator=>{await locator.scrollIntoViewIfNeeded();assert.equal(boxPass(await oneBox(locator),true),true);};
  const checks=[];
  await closeMenu();await page.evaluate(()=>window.fixture.setScenario('pending-join'));
  await expect(page.locator('[data-puzzle-roster]')).toContainText('Join pending');
  assert.equal(boxPass(await oneBox(page.locator('[data-puzzle-roster]'))),true,'Direct pending status remains readable');
  await expect(page.locator('[data-puzzle-menu-alert]')).toBeVisible();await expect(summary).toHaveAttribute('aria-label',/pending/i);
  await expect(action('leave')).toHaveText('Cancel joining');await reachable(action('leave'));
  const retries=await count('retryIntent');await screenshot('pending-join-recovery');
  await openMenu();await reachable(action('retry'));await action('retry').click();
  await expect.poll(()=>count('retryIntent')).toBe(retries+1);await expect(page.locator('[data-puzzle-roster]')).toContainText('watching');
  await closeMenu();const leaves=await count('onLeave'),leaveIntents=await page.evaluate(()=>window.fixture.events.filter(item=>item.event==='intent'&&item.mode==='leave').length);
  await action('leave').click();await expect.poll(()=>count('onLeave')).toBe(leaves+1);
  await expect.poll(()=>page.evaluate(()=>window.fixture.events.filter(item=>item.event==='intent'&&item.mode==='leave').length)).toBe(leaveIntents+1);
  checks.push('pending Join status/cue readable; original Retry explicit and non-enrolling; upfront44px Cancel invokes Leave/onLeave');

  await closeMenu();await page.evaluate(()=>window.fixture.setScenario('pending-save'));
  await expect(page.locator('[data-puzzle-roster]')).toContainText('Save pending');
  assert.equal(boxPass(await oneBox(page.locator('[data-puzzle-roster]'))),true,'Durable pending status remains readable');
  await expect(page.locator('[data-puzzle-menu-alert]')).toBeVisible();await expect(summary).toHaveAttribute('aria-label',/pending/i);
  await expect(page.locator('[data-puzzle-destination="7"]')).toHaveAttribute('aria-disabled','true');
  const beforeAttempt=await page.evaluate(readPlacementObservation);
  const unplaced=page.locator('[data-puzzle-piece]:not([hidden]):not(.placed)').first(),unplacedId=await unplaced.getAttribute('data-puzzle-piece');
  await unplaced.focus();await unplaced.press('Enter');
  await expect(unplaced).toHaveAttribute('aria-pressed','true');
  const destination=await page.evaluate(id=>window.fixture.art.pieces.find(piece=>piece.id===id).destination,unplacedId);
  const emptyCell=page.locator('[data-puzzle-destination="'+destination+'"]');
  await expect(emptyCell).not.toHaveClass(/placed/);await emptyCell.focus();await emptyCell.press('Enter');
  await page.evaluate(()=>Promise.resolve());
  assertBlockedPlacement(beforeAttempt,await page.evaluate(readPlacementObservation));
  await screenshot('pending-save-recovery');await openMenu();await reachable(action('pending'));
  const inspections=await count('onPending');await action('pending').click();await expect.poll(()=>count('onPending')).toBe(inspections+1);
  await reachable(action('return'));const returns=await count('onReturn');await action('return').click();await expect.poll(()=>count('onReturn')).toBe(returns+1);
  checks.push('durable pending: native piece selection and Enter on empty cell send no additional puzzle.place and leave exact placements/DOM count unchanged;44px Inspect/Return invoke callbacks; no full-board-fit claim while blocked');

  await closeMenu();await page.evaluate(()=>window.fixture.setScenario('no-round'));
  const start=action('start'),node=await start.elementHandle();await expect(start).toBeVisible();await expect(start).toBeEnabled();await reachable(start);
  const starts=await page.evaluate(()=>window.fixture.events.filter(item=>item.event==='send'&&item.type==='puzzle.start').length);
  const joins=await page.evaluate(()=>window.fixture.events.filter(item=>item.event==='intent'&&item.mode==='join').length);
  await start.focus();await start.press('Enter');
  await expect.poll(()=>page.evaluate(()=>window.fixture.events.filter(item=>item.event==='send'&&item.type==='puzzle.start').length)).toBe(starts+1);
  assert.equal(await page.evaluate(()=>window.fixture.events.filter(item=>item.event==='intent'&&item.mode==='join').length),joins);
  await page.evaluate(()=>window.fixture.applyStartedRound());
  assert.equal(await node.evaluate(element=>element===document.querySelector('[data-puzzle-action="start"]')),true,'Start retains its actual node');
  await expect(menu).not.toHaveAttribute('open','');await expect(action('join')).toBeVisible();await expect(action('join')).toBeEnabled();await expect(action('join')).toBeFocused();
  assert.equal(boxPass(await oneBox(action('join')),true),true,'Focus reaches the exposed44px Join target after Start moves');
  checks.push('native focused initial Start sends no Join; fresh-round projection moves same node into closed options and focuses exposed enabled Join');
  return checks;
}
