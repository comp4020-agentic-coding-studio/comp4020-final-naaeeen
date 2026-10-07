import { expect } from '@playwright/test';

export interface StartupTiming { action: string; milliseconds: number | null; completed: boolean; budgetAccepted: boolean }

/** Out-of-browser monotonic timing; the optional clock is for calibrated controls only. */
export async function recordStartup(
  action: string, task: () => Promise<void>, settled: () => Promise<void>,
  records: StartupTiming[], now: () => number = () => performance.now(),
) {
  const started = now();
  let completed = false, budgetAccepted = false, elapsed: number | undefined;
  try {
    await task(); await settled(); completed = true;
    elapsed = now() - started;
    expect(Number.isFinite(elapsed)).toBe(true);
    expect(elapsed).toBeGreaterThanOrEqual(0);
    expect(elapsed).toBeLessThanOrEqual(10_000);
    budgetAccepted = true;
  } finally {
    const measured = elapsed ?? now() - started;
    records.push({ action, milliseconds: Number.isFinite(measured) ? Math.round(measured) : null, completed, budgetAccepted });
  }
}
