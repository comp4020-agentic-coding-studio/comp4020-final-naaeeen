/** CI-only preflight; passing this does not pass any application browser case. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const profileBytes = readFileSync('evaluation/ci-browser/seccomp-playwright-v1.63.0-node24.json');
const upstreamBytes = readFileSync('evaluation/ci-browser/seccomp-playwright-v1.63.0.json');
const upstream = JSON.parse(upstreamBytes);
const profile = JSON.parse(profileBytes);
assert.ok(upstream.syscalls.every(rule => !rule.names.includes('clone3')));
assert.deepEqual(profile, { ...upstream, syscalls: [...upstream.syscalls,
  { names: ['clone3'], action: 'SCMP_ACT_ERRNO', errnoRet: 38 }] });
const profileSHA256 = createHash('sha256').update(profileBytes).digest('hex');
const upstreamSHA256 = createHash('sha256').update(upstreamBytes).digest('hex');
const output = '.local/browser-environment';
const save = (name, value) => writeFileSync(`${output}/${name}.json`, JSON.stringify(value, null, 2) + '\n');
if (process.argv[2] === '--inspect') {
  const [containerId, imageId, restriction] = process.argv.slice(3);
  const [container] = JSON.parse(execFileSync('docker', ['inspect', containerId], { encoding: 'utf8' }));
  const [image] = JSON.parse(execFileSync('docker', ['image', 'inspect', imageId], { encoding: 'utf8' }));
  const host = container.HostConfig;
  assert.equal(host.Privileged, false);
  assert.equal(host.CapAdd, null);
  assert.equal(host.IpcMode, 'private');
  assert.equal(host.ShmSize, 1024 ** 3);
  assert.equal(host.NetworkMode, 'host');
  assert.equal(host.SecurityOpt?.length, 1);
  assert.ok(host.SecurityOpt[0].startsWith('seccomp={'));
  assert.deepEqual(JSON.parse(host.SecurityOpt[0].slice('seccomp='.length)),
    profile);
  // Docker selects its default AppArmor profile at start when this create-time field is empty.
  assert.ok(['', 'docker-default'].includes(container.AppArmorProfile));
  assert.equal(container.Config.User, `${process.getuid()}:${process.getgid()}`);
  assert.notEqual(process.getuid(), 0);
  assert.equal(container.Image, imageId);
  assert.ok(image.RepoDigests?.some(digest => digest.startsWith('mcr.microsoft.com/playwright@sha256:')));
  save('container', { image: 'mcr.microsoft.com/playwright:v1.63.0-noble', imageId,
    repoDigests: image.RepoDigests, architecture: image.Architecture,
    uid: process.getuid(), gid: process.getgid(), appArmorSelection: container.AppArmorProfile || 'Docker default at startup',
    seccomp: 'upstream profile plus clone3 denied with ENOSYS', profileSHA256, upstreamSHA256, privileged: false, addedCapabilities: [],
    ipc: host.IpcMode, shmBytes: host.ShmSize, network: host.NetworkMode,
    hostUnprivilegedUsernsRestriction: Number(restriction) });
  console.log('CI browser container settings verified');
} else {
  assert.equal(process.argv.length, 2);
  assert.notEqual(process.getuid(), 0);
  assert.equal(process.version, 'v24.21.0');
  assert.equal(process.env.PLAYWRIGHT_BROWSERS_PATH, '/ms-playwright');
  const require = createRequire(import.meta.url);
  const testPackage = require.resolve('@playwright/test/package.json');
  const playwrightRequire = createRequire(createRequire(testPackage).resolve('playwright/package.json'));
  const coreRoot = dirname(playwrightRequire.resolve('playwright-core/package.json'));
  assert.equal(JSON.parse(readFileSync(testPackage)).version, '1.63.0');
  const chromiumVersion = JSON.parse(readFileSync(join(coreRoot, 'browsers.json'))).browsers.find(b => b.name === 'chromium');
  assert.equal(chromiumVersion.revision, '1243');
  assert.equal(chromiumVersion.browserVersion, '153.0.8010.12');
  const status = pid => Object.fromEntries(readFileSync(`/proc/${pid}/status`, 'utf8').trim().split('\n').map(line => {
    const colon = line.indexOf(':'); return [line.slice(0, colon), line.slice(colon + 1).trim()];
  }));
  const baseline = status('self');
  assert.equal(baseline.Seccomp, '2');
  assert.ok(Number(baseline.Seccomp_filters) >= 1);
  // SYS_ADMIN must be absent even from the bounding set; retain Docker's defaults.
  assert.equal(BigInt(`0x${baseline.CapBnd}`) & (1n << 21n), 0n);
  const appArmor = readFileSync('/proc/self/attr/current', 'utf8').trim();
  assert.equal(appArmor, 'docker-default (enforce)');
  const { default: config } = await import('../playwright.config.ts');
  const options = config.use.launchOptions;
  assert.equal(options.chromiumSandbox, true);
  assert.equal(options.executablePath, undefined);
  assert.equal(config.timeout, 60_000);
  assert.equal(config.globalTimeout, 300_000);
  assert.equal(config.retries, 0);
  const { chromium } = await import('@playwright/test');
  let server, browser;
  try {
    server = await chromium.launchServer({ ...options, host: '127.0.0.1' });
    browser = await chromium.connect(server.wsEndpoint()); // Private ephemeral endpoint; never printed or saved.
    assert.equal(browser.version(), chromiumVersion.browserVersion);
    const browserPid = server.process().pid;
    const arguments_ = readFileSync(`/proc/${browserPid}/cmdline`, 'utf8').split('\0');
    const forbidden = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-namespace-sandbox',
      '--disable-seccomp-filter-sandbox', '--single-process', '--no-zygote'];
    assert.ok(!arguments_.some(arg => forbidden.includes(arg.split('=')[0])));
    const page = await browser.newPage();
    await page.setContent('<p>Sandbox preflight</p>');
    await page.locator('p').waitFor();
    const processes = readdirSync('/proc').filter(name => /^\d+$/.test(name)).flatMap(pid => {
      try { return [{ pid, status: status(pid), args: readFileSync(`/proc/${pid}/cmdline`, 'utf8').split('\0') }]; }
      catch (error) { if (['ENOENT', 'EACCES', 'ESRCH'].includes(error.code)) return []; throw error; }
    });
    const byPid = new Map(processes.map(item => [item.pid, item]));
    const descendant = item => {
      const seen = new Set();
      while (item && !seen.has(item.pid)) {
        if (Number(item.status.PPid) === browserPid) return true;
        seen.add(item.pid); item = byPid.get(item.status.PPid);
      }
      return false;
    };
    const renderers = processes.filter(item => item.args.includes('--type=renderer') && descendant(item));
    assert.ok(renderers.length > 0, 'No renderer process found');
    const browserStatus = status(browserPid);
    const browserMap = readFileSync(`/proc/${browserPid}/uid_map`, 'utf8').trim();
    for (const renderer of renderers) {
      assert.notEqual(readFileSync(`/proc/${renderer.pid}/uid_map`, 'utf8').trim(), browserMap);
      assert.ok(renderer.status.NSpid.split(/\s+/).length > browserStatus.NSpid.split(/\s+/).length);
      assert.equal(renderer.status.NoNewPrivs, '1');
      assert.equal(renderer.status.Seccomp, '2');
      assert.ok(Number(renderer.status.Seccomp_filters) > Number(browserStatus.Seccomp_filters));
      assert.ok(Number(renderer.status.Seccomp_filters) > Number(baseline.Seccomp_filters));
    }
    save('sandbox', { status: 'PASS', scope: 'blank-renderer sandbox preflight only',
      node: process.version, playwright: '1.63.0', chromium: browser.version(), revision: '1243',
      nonRoot: true, appArmor, containerSeccomp: 2, sandboxDisableFlagsAbsent: true,
      rendererCount: renderers.length, rendererUserNamespace: true, rendererPidNamespace: true,
      rendererNoNewPrivileges: true, rendererAdditionalSeccompFilters: true });
    console.log('CI renderer user/PID namespaces and additional seccomp filters verified');
  } finally {
    await browser?.close();
    await server?.close();
  }
}
