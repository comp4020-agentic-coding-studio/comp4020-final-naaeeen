import { expect, test } from 'vitest';
import { recordStartup, type StartupTiming } from '../tests/e2e/startup-timing.ts';

function clock(elapsed: number) {
  let reads = 0;
  return () => reads++ === 0 ? 1000 : 1000 + elapsed;
}
test.each([0, 9999, 10000])('actual startup recorder accepts controlled elapsed %i ms', async elapsed => {
  const records: StartupTiming[] = [], actions: string[] = [];
  await recordStartup('control', async () => { actions.push('task'); }, async () => { actions.push('settled'); }, records, clock(elapsed));
  expect(actions).toEqual(['task', 'settled']);
  expect(records).toEqual([{ action: 'control', milliseconds: elapsed, completed: true, budgetAccepted: true }]);
});
test('a successful native task after controlled 12000 ms fails the unchanged whole-startup bound', async () => {
  const records: StartupTiming[] = [], actions: string[] = [];
  await expect(recordStartup('delayed control', async () => { actions.push('task'); }, async () => { actions.push('settled'); }, records, clock(12000))).rejects.toThrow();
  expect(actions).toEqual(['task', 'settled']);
  expect(records).toEqual([{ action: 'delayed control', milliseconds: 12000, completed: true, budgetAccepted: false }]);
});
test('an interrupted startup preserves its elapsed record and does not claim completion', async () => {
  const records: StartupTiming[] = [];
  await expect(recordStartup('failed task', async () => { throw new Error('Controlled task interruption'); }, async () => { throw new Error('Unexpected settlement'); }, records, clock(25))).rejects.toThrow('Controlled task interruption');
  expect(records).toEqual([{ action: 'failed task', milliseconds: 25, completed: false, budgetAccepted: false }]);
});

test.each([NaN, -1])('invalid controlled clock elapsed %s cannot pass the startup budget', async elapsed => {
  const records: StartupTiming[] = [];
  await expect(recordStartup('invalid clock', async () => {}, async () => {}, records, clock(elapsed))).rejects.toThrow();
  expect(records).toEqual([{ action: 'invalid clock', milliseconds: Number.isFinite(elapsed) ? elapsed : null, completed: true, budgetAccepted: false }]);
});
