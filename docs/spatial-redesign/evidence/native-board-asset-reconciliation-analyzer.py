from pathlib import Path
from collections import Counter
import datetime, hashlib, json, os, re

OUT = Path('.local/spatial-asset-native-first')
EXPECTED = [
    'a lost board reply replays its original receipt after a peer addition and keeps authored export',
    'standalone board core shares a saved canvas without the game',
    'standalone board identity recovers its original place in a full house',
]
sha = lambda path: hashlib.sha256(Path(path).read_bytes()).hexdigest()
CASE = re.compile(r'^\s*✓\s+[0-9]+ tests/e2e/(?:board|board-receipt-recovery)[.]spec[.]ts:[0-9]+:1 › (.+) [(]([0-9]+[.][0-9]+)s[)]\s*$', re.M)
SUMMARY = re.compile(r'^\s*([0-9]+) passed [(][^\n]*[)]\s*$', re.M)
BAD_SUMMARY = re.compile(r'^\s*[0-9]+ (?:failed|skipped|interrupted)\b', re.M)

def grade(log, exit_code, source_same, launch_same, pids):
    cases = CASE.findall(log)
    return exit_code == 0 and Counter(name for name, _ in cases) == Counter(EXPECTED) and SUMMARY.findall(log) == ['3'] and not BAD_SUMMARY.search(log) and source_same and launch_same and pids == []

log = (OUT / 'run.log').read_text()
before = json.loads((OUT / 'before.json').read_text())
after = json.loads((OUT / 'after.json').read_text())
ended = json.loads((OUT / 'execution-end.json').read_text())
started = json.loads((OUT / 'execution-start.json').read_text())
binding = json.loads((OUT / 'binding.json').read_text())
assert after['status'] == 'FAIL_PRESERVED'
assert sha(OUT / 'run.py') == binding['wrapperSHA256'] == 'b6e0abf65866855925f75f3ed28c80c2ed0a5f9c9be8f59c1a2d2cb0eebe0838'
assert sha(OUT / 'binding.json') == before['bindingSHA256']
current = {path: sha(path) for path in before['sourceSHA256']}
source_same = current == before['sourceSHA256'] == after['sourceSHA256'] == binding['sourceSHA256']
assert source_same and len(current) == 518
launch_path = Path('.local/spatial-apply/server-current-source.json')
launch_same = sha(launch_path) == before['launchRecordSHA256'] == binding['launchRecordSHA256']
launch = json.loads(launch_path.read_text())
assert launch_same and launch['pid'] == 66098 and len(launch['source']) == 35
os.kill(66098, 0)
assert all(sha(path) == digest for path, digest in launch['source'].items())
remaining = []
for path in Path('/proc').glob('[0-9]*/cmdline'):
    try:
        executable = path.read_bytes().split(bytes([0]))[0].decode()
    except (OSError, UnicodeDecodeError):
        continue
    if Path(executable).name in ('chrome', 'chromium', 'chromium-browser', 'chrome_crashpad_handler'):
        remaining.append(int(path.parent.name))
remaining.sort()
processes = [{'role': role, 'pid': started[key], 'present': Path('/proc', str(started[key])).exists()} for role, key in [('original wrapper', 'wrapperPID'), ('original Playwright command', 'childPID')]]
assert not any(item['present'] for item in processes)
controls = [
    {'name': 'actual full log, including pnpm resolution-step skip text', 'actual': grade(log, ended['exitCode'], source_same, launch_same, remaining), 'expected': True},
    {'name': 'wrong completed-case count', 'actual': grade(log.replace('3 passed (12.4s)', '2 passed (12.4s)'), 0, True, True, []), 'expected': False},
    {'name': 'framework failure exit', 'actual': grade(log, 1, True, True, []), 'expected': False},
    {'name': 'missing framework exit', 'actual': grade(log, None, True, True, []), 'expected': False},
    {'name': 'source changed', 'actual': grade(log, 0, False, True, []), 'expected': False},
    {'name': 'launch changed', 'actual': grade(log, 0, True, False, []), 'expected': False},
    {'name': 'remaining browser process', 'actual': grade(log, 0, True, True, [12345]), 'expected': False},
    {'name': 'actual skipped-case summary', 'actual': grade(log + chr(10) + '  1 skipped' + chr(10), 0, True, True, []), 'expected': False},
    {'name': 'missing successful case line', 'actual': grade(log.replace(EXPECTED[1], 'missing expected case'), 0, True, True, []), 'expected': False},
]
assert all(item['actual'] == item['expected'] for item in controls)
assert grade(log, ended['exitCode'], source_same, launch_same, remaining)
assert "resolution step is skipped" in log
assert re.search(r'\b3 passed\b', log) and ' skipped' in log
record = {
    'status': 'FRAMEWORK_3_PASS_WRAPPER_FAIL_RECONCILED_WITHOUT_RERUN',
    'recordedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'actualFrameworkExitCode': ended['exitCode'],
    'actualSummary': '3 passed (12.4s)',
    'actualCases': [{'name': name, 'durationSeconds': float(seconds)} for name, seconds in CASE.findall(log)],
    'originalWrapperStatusPreserved': after['status'],
    'originalWrapperSHA256': sha(OUT / 'run.py'),
    'originalLogSHA256': sha(OUT / 'run.log'),
    'originalBeforeSHA256': sha(OUT / 'before.json'),
    'originalAfterSHA256': sha(OUT / 'after.json'),
    'analyzerSHA256': sha(__file__),
    'finding': 'The original wrapper applies its no-skips substring check to the whole pnpm log, so resolution step is skipped falsely rejects all three passing Playwright cases. The summary regex itself is correct.',
    'preliminaryInferenceCorrected': 'Initial suspected escaping faults were disproved by actual source and JSON inspection. Original regex, JSON newlines and cmdline NUL escape are valid; no normalization was applied.',
    'sourceFiles': len(current), 'sourceUnchangedBeforeAfterAndCurrent': source_same,
    'launchRecordUnchanged': launch_same, 'launchPID': 66098, 'launchSourceCount': 35,
    'independentBrowserPIDsAfter': remaining, 'originalCommandProcesses': processes,
    'contextClosureEvidence': 'All three existing test finally paths await their context close calls. The original Playwright process exited0, the original wrapper exited1 on its grader, both recorded process IDs are absent, and an independent real NUL-delimited /proc audit finds no browser or crashpad process. No per-context close event instrumentation was added.',
    'controls': controls, 'originalPNGs': after['originalPNGs'],
    'noBrowserOrTestRerun': True, 'noOriginalOutputWrapperSpecOrAppMutation': True,
    'scope': 'Three maintained board tasks only; framework success, wrapper failure and this independent reconciliation remain separate. Original PNGs are unapproved for public curation.',
    'nativeLane': 'IDLE; no test, browser or background command remains',
}
(OUT / 'reconciliation.json').write_text(json.dumps(record, indent=2) + chr(10))
print(json.dumps({'status': record['status'], 'sourceFiles': len(current), 'sourceUnchanged': source_same, 'launchUnchanged': launch_same, 'browserPIDsAfter': remaining, 'originalCommandProcesses': processes, 'controls': len(controls), 'originalPNGs': record['originalPNGs']}, indent=2))
