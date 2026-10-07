/** CI-only preflight; passing this does not pass any application browser case. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
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
function rendererIds(processInfo, browserPid) {
  assert.ok(Array.isArray(processInfo), 'CDP_PROCESS_INFO_INVALID');
  const browserProcesses = processInfo.filter(item => item.type === 'browser');
  assert.equal(browserProcesses.length, 1, 'CDP_BROWSER_COUNT_INVALID');
  // Anchor CDP OS IDs to the launch PID in the same namespace as our /proc mount.
  assert.equal(browserProcesses[0].id, browserPid, 'CDP_BROWSER_PID_NAMESPACE_MISMATCH');
  const ids = processInfo.filter(item => item.type === 'renderer').map(item => item.id);
  assert.ok(ids.length > 0, 'CDP_NO_RENDERERS');
  assert.ok(ids.every(id => Number.isSafeInteger(id) && id > 0 && id !== browserPid), 'CDP_RENDERER_ID_INVALID');
  assert.equal(new Set(ids).size, ids.length, 'CDP_DUPLICATE_RENDERER_ID');
  return ids;
}
const output = '.local/browser-environment';
const save = (name, value) => writeFileSync(`${output}/${name}.json`, JSON.stringify(value, null, 2) + '\n');
if (process.argv[2] === '--renderer-controls') {
  const browser = { type: 'browser', id: 100 }, renderer = { type: 'renderer', id: 200 };
  assert.deepEqual(rendererIds([browser, renderer, { type: 'utility', id: 300 }], 100), [200]);
  assert.throws(() => rendererIds([{ ...browser, id: 101 }, renderer], 100), /CDP_BROWSER_PID_NAMESPACE_MISMATCH/);
  assert.throws(() => rendererIds([browser], 100), /CDP_NO_RENDERERS/);
  assert.throws(() => rendererIds([browser, { ...renderer, id: '200' }], 100), /CDP_RENDERER_ID_INVALID/);
  assert.throws(() => rendererIds([browser, renderer, renderer], 100), /CDP_DUPLICATE_RENDERER_ID/);
  assert.throws(() => rendererIds([browser, { ...renderer, id: 100 }], 100), /CDP_RENDERER_ID_INVALID/);
  console.log('Renderer CDP PID controls: 6 PASS; fixture validation only');
} else if (process.argv[2] === '--inspect') {
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
  let server, browser, stage = 'launch', processCount = null, rendererCount = null;
  try {
    server = await chromium.launchServer({ ...options, host: '127.0.0.1' });
    browser = await chromium.connect(server.wsEndpoint()); // Private ephemeral endpoint; never printed or saved.
    assert.equal(browser.version(), chromiumVersion.browserVersion);
    const browserPid = server.process().pid;
    stage = 'browser-command-line';
    const arguments_ = readFileSync(`/proc/${browserPid}/cmdline`, 'utf8').split('\0');
    const forbidden = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-namespace-sandbox',
      '--disable-seccomp-filter-sandbox', '--single-process', '--no-zygote'];
    assert.ok(!arguments_.some(arg => forbidden.includes(arg.split('=')[0])));
    stage = 'blank-renderer';
    const page = await browser.newPage();
    await page.setContent('<p>Sandbox preflight</p>');
    await page.locator('p').waitFor();
    stage = 'cdp-process-info';
    const session = await browser.newBrowserCDPSession();
    let processInfo;
    try { ({ processInfo } = await session.send('SystemInfo.getProcessInfo')); }
    finally { await session.detach(); }
    processCount = Array.isArray(processInfo) ? processInfo.length : null;
    rendererCount = Array.isArray(processInfo) ? processInfo.filter(item => item.type === 'renderer').length : null;
    const renderers = rendererIds(processInfo, browserPid);
    rendererCount = renderers.length;
    stage = 'browser-kernel-baseline';
    const browserStatus = status(browserPid);
    const browserMap = readFileSync(`/proc/${browserPid}/uid_map`, 'utf8').trim();
    for (const pid of renderers) {
      stage = 'renderer-kernel-status';
      const rendererStatus = status(pid);
      stage = 'renderer-user-namespace';
      assert.notEqual(readFileSync(`/proc/${pid}/uid_map`, 'utf8').trim(), browserMap);
      stage = 'renderer-pid-namespace';
      assert.ok(rendererStatus.NSpid.split(/\s+/).length > browserStatus.NSpid.split(/\s+/).length);
      stage = 'renderer-seccomp';
      assert.equal(rendererStatus.NoNewPrivs, '1');
      assert.equal(rendererStatus.Seccomp, '2');
      assert.ok(Number(rendererStatus.Seccomp_filters) > Number(browserStatus.Seccomp_filters));
      assert.ok(Number(rendererStatus.Seccomp_filters) > Number(baseline.Seccomp_filters));
    }
    save('sandbox', { status: 'PASS', scope: 'blank-renderer sandbox preflight only',
      node: process.version, playwright: '1.63.0', chromium: browser.version(), revision: '1243',
      nonRoot: true, appArmor, containerSeccomp: 2, sandboxDisableFlagsAbsent: true,
      processDiscovery: 'CDP SystemInfo.getProcessInfo', processCount, rendererCount,
      browserPidNamespaceAnchored: true, rendererUserNamespace: true, rendererPidNamespace: true,
      rendererNoNewPrivileges: true, rendererAdditionalSeccompFilters: true });
    console.log('CI renderer user/PID namespaces and additional seccomp filters verified');
  } catch (error) {
    const rejection = ['CDP_PROCESS_INFO_INVALID', 'CDP_BROWSER_COUNT_INVALID', 'CDP_BROWSER_PID_NAMESPACE_MISMATCH',
      'CDP_NO_RENDERERS', 'CDP_RENDERER_ID_INVALID', 'CDP_DUPLICATE_RENDERER_ID']
      .find(code => error.message?.startsWith(code));
    const reason = rejection ?? (['EACCES', 'EPERM', 'ENOENT', 'ESRCH', 'ERR_ASSERTION'].includes(error.code)
      ? error.code : 'PREFLIGHT_OPERATION_FAILED');
    save('sandbox', { status: 'FAIL', scope: 'blank-renderer sandbox preflight only',
      stage, reason, processDiscovery: 'CDP SystemInfo.getProcessInfo', processCount, rendererCount });
    throw new Error(`CI sandbox preflight failed at ${stage}: ${reason}`);
  } finally {
    await browser?.close();
    await server?.close();
  }
}
