import { defineConfig } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// This local operator rehearsal is outside the maintained tests/e2e discovery.
// It never starts a server, chooses a deployed target, or generates credentials.
const root = fileURLToPath(new URL('../..', import.meta.url));
const markerPath = resolve(root, '.local/crit10/server.json');
let marker: { origin: string };
try { marker = JSON.parse(readFileSync(markerPath, 'utf8')); }
catch { throw new Error(`Crit 10 rehearsal needs the owned local server marker at ${markerPath}. Start the isolated server and record origin, sourceHashes and stdout there before running.`); }
const run = process.env.CRIT10_BROWSER_RUN;
if (!run || !/^browser-run-[1-9][0-9]*$/.test(run)) throw new Error('Set CRIT10_BROWSER_RUN=browser-run-N to preserve each rehearsal attempt.');
const baseURL = process.env.APP_URL ?? marker.origin;
let target: URL;
try { target = new URL(baseURL); }
catch { throw new Error('The local server marker must contain a valid origin, or set APP_URL to that owned local origin.'); }
if (!['http:', 'https:'].includes(target.protocol) || !['127.0.0.1', 'localhost'].includes(target.hostname) || target.username || target.password)
  throw new Error('Crit 10 rehearsal accepts only an owned loopback HTTP(S) server.');
if (target.origin !== marker.origin) throw new Error('APP_URL must match the owned local server marker origin.');

export default defineConfig({
  testDir: '.', testMatch: 'crit10-rehearsal.spec.ts',
  outputDir: resolve(root, '.local/crit10', `${run}-results`),
  workers: 1, retries: 0, forbidOnly: true, timeout: 120_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['json', { outputFile: resolve(root, '.local/crit10', `${run}-runner.json`) }]],
  use: { baseURL: target.origin, actionTimeout: 10_000, navigationTimeout: 10_000,
    trace: 'off', video: 'off', screenshot: 'off',
    launchOptions: { executablePath: process.env.PW_EXECUTABLE,
      chromiumSandbox: true, args: ['--use-angle=swiftshader'] } },
});
