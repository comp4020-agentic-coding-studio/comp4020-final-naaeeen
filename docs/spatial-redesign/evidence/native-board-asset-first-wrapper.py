from pathlib import Path
import argparse, datetime, hashlib, json, os, re, subprocess, time

OUT = Path('.local/spatial-asset-native-first')
LAUNCH = Path('.local/spatial-apply/server-current-source.json')
SPECS = ['tests/e2e/board.spec.ts', 'tests/e2e/board-receipt-recovery.spec.ts']
COMMAND = ['/home/lizhi/.local/bin/mise', 'exec', '--', 'pnpm', 'exec', 'playwright', 'test', *SPECS, '--max-failures=1']
sha = lambda path: hashlib.sha256(Path(path).read_bytes()).hexdigest()
now = lambda: datetime.datetime.now(datetime.timezone.utc).isoformat()

def browser_pids():
    result = []
    for path in Path('/proc').glob('[0-9]*/cmdline'):
        try:
            executable = path.read_bytes().split(b'\0')[0].decode()
        except (OSError, UnicodeDecodeError):
            continue
        if Path(executable).name in ('chrome', 'chromium', 'chromium-browser', 'chrome_crashpad_handler'):
            result.append(int(path.parent.name))
    return sorted(result)

def required_sources():
    fixed = ['mise.toml', 'package.json', 'pnpm-lock.yaml', 'playwright.config.ts', 'tools/ci-browser.sh', *SPECS, 'tests/e2e/board-journey.ts']
    return set(fixed) | {str(p) for folder in ('public', 'src') for p in Path(folder).rglob('*') if p.is_file()}

def verify_launch(binding):
    launch = json.loads(LAUNCH.read_text())
    assert sha(LAUNCH) == binding['launchRecordSHA256'], 'Unapproved launch-record drift'
    assert launch['pid'] == binding['expectedPID'] and launch['pid'] != 55373, 'Fresh parent restart is required'
    os.kill(launch['pid'], 0)
    assert b'src/server.ts' in Path('/proc', str(launch['pid']), 'cmdline').read_bytes(), 'Unexpected launch process'
    for path, digest in launch['source'].items():
        assert sha(path) == digest, 'Runtime launch source mismatch: ' + path
    return launch

parser = argparse.ArgumentParser()
parser.add_argument('--binding', required=True)
args = parser.parse_args()
assert not (OUT / 'execution-start.json').exists() and not (OUT / 'run.log').exists(), 'This attempt already started; retries are forbidden'
binding = json.loads(Path(args.binding).read_text())
assert binding['status'] == 'PARENT_GO' and binding['runLabel'] == 'spatial-asset-native-first', 'Separate execution GO is required'
assert binding['origin'] == 'http://127.0.0.1:4108'
assert binding['budgets'] == {'caseMs': 60000, 'globalMs': 300000, 'retries': 0}
assert sha(__file__) == binding['wrapperSHA256'], 'Wrapper drift'
assert not any(os.environ.get(key) for key in ('DEBUG', 'PWDEBUG', 'PW_EXECUTABLE')), 'Debug/alternate-browser environment would invalidate this selection'
expected = binding['sourceSHA256']
assert required_sources() <= set(expected), 'Binding omits runtime/public/selected sources'
source = {path: sha(path) for path in expected}
assert source == expected, 'Unapproved source drift before run'
assert source['playwright.config.ts'] == '80f462cf6b300c80d50617eafb0b60d8288403389d1a3b71e6b0ad8728778e95', 'Original browser budgets/configuration required'
launch = verify_launch(binding)
assert browser_pids() == [], 'Another browser lane is active'
before = {'status': 'SOURCE_FROZEN_READY', 'recordedAt': now(), 'bindingSHA256': sha(args.binding), 'wrapperSHA256': sha(__file__), 'sourceSHA256': source, 'sourceFiles': len(source), 'launchRecordSHA256': sha(LAUNCH), 'launch': launch, 'browserPIDsBefore': [], 'command': COMMAND, 'budgets': binding['budgets'], 'caseCount': 3}
(OUT / 'before.json').write_text(json.dumps(before, indent=2) + '\n')
env = dict(os.environ, APP_URL=binding['origin'], CI='true', PW_OUTPUT_DIR=str(OUT / 'results'), PW_REPORT_DIR=str(OUT / 'report'))
started = time.monotonic()
with (OUT / 'run.log').open('x') as log:
    child = subprocess.Popen(COMMAND, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, env=env)
    (OUT / 'execution-start.json').write_text(json.dumps({'command': COMMAND, 'startedAt': now(), 'wrapperPID': os.getpid(), 'childPID': child.pid, 'retry': False}, indent=2) + '\n')
    for line in child.stdout:
        log.write(line); log.flush(); print(line, end='', flush=True)
    code = child.wait()
ended = {'exitCode': code, 'durationSeconds': time.monotonic() - started, 'endedAt': now()}
(OUT / 'execution-end.json').write_text(json.dumps(ended, indent=2) + '\n')
after_source = {path: sha(path) for path in expected}
remaining = browser_pids()
launch_unchanged = sha(LAUNCH) == before['launchRecordSHA256']
source_unchanged = after_source == source and required_sources() <= set(expected)
log = (OUT / 'run.log').read_text()
passed = code == 0 and re.search(r'\b3 passed\b', log) is not None and ' skipped' not in log
images = [{'path': str(p), 'sha256': sha(p), 'published': False} for p in sorted((OUT / 'results').glob('*/*.png'))]
after = {'status': 'PASS_MECHANICAL_VISUAL_REVIEW_PENDING' if passed and source_unchanged and launch_unchanged and not remaining else 'FAIL_PRESERVED', 'sourceSHA256': after_source, 'sourceUnchanged': source_unchanged, 'launchRecordUnchanged': launch_unchanged, 'launchPID': launch['pid'], 'launchSourceCount': len(launch['source']), 'browserPIDsAfter': remaining, 'execution': ended, 'originalPNGs': images, 'contextClosureScope': 'Existing cases await context.close in finally; framework exit and absence of browser processes are independently recorded. No new lifecycle assertion is added to maintained specs.', 'scope': 'Three unchanged independent-board browser cases only; raw captures remain ignored pending parent inspection. No human/pixel/resource acceptance is inferred.'}
(OUT / 'after.json').write_text(json.dumps(after, indent=2) + '\n')
print(json.dumps({'status': after['status'], 'exitCode': code, 'sourceUnchanged': source_unchanged, 'launchRecordUnchanged': launch_unchanged, 'browserPIDsAfter': remaining}), flush=True)
raise SystemExit(0 if after['status'] == 'PASS_MECHANICAL_VISUAL_REVIEW_PENDING' else 1)
