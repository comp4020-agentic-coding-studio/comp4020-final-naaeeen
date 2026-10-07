# Pre-deploy mounted SQLite backup gate

7 October 2026. This record covers the bounded helper and its local verification.
No production API call, mounted backup, deployment, token inspection, credential
change, push or commit was performed by this worker. Root owns deployment workflow
integration and the authorized release. Fresh independent implementation review found one memory-bound issue; its correction
and contextual closure are recorded below.

## Requirement and decision

The release runbook requires an online backup on the existing mounted machine
before schema startup. Its legacy neighbourhood.sqlite is mandatory; additive
house.sqlite and board.sqlite are backed up only when already present. A release
command cannot reach the persistent volume. The current contract is one shared
CPU, 256 MB machine, with one /data mount. The existing 1 GB volume is retained;
the Machines list topology check does not independently measure volume capacity.

The common task was to preserve committed pre-release data, including WAL writes,
without overwriting an older backup or introducing credentials/services.
A main-file copy was compared with the built-in SQLite online backup against the
same open WAL fixture: the copy omitted the later committed row; the online backup
preserved it. Mounted exec was selected over a volume-less release command.
The existing app-scoped token was selected over a new token/service; an unavailable
permission blocks the gate. These are source-backed technical decisions, not an
agent-performance or human A/B trial.

The [official Machines API schema](https://docs.fly.io/api/machines/openapi.json),
read directly without credentials on 7 October, defines list and exec endpoints.
Exec accepts command: string[] and integer timeout; its response declares
integer exit_code/exit_signal and string stdout/stderr, without required fields.
The gate accepts omitted zero exit values only with the exact verified success
report. The [Node 24 backup API](https://nodejs.org/download/release/v24.0.0/docs/api/sqlite.html#sqlitebackupsourceDb-path-options)
uses the [SQLite online backup API](https://www.sqlite.org/backup.html) and can
overwrite an existing destination, so exclusive private-directory creation and
exclusive file reservation are explicit preconditions.

## Implemented boundaries

tools/backup-mounted-data.mjs uses built-ins only. Native ESM imports no SQLite
module until the remote backup function executes, allowing the runner's Node 22+
to import the helper. The actual SQLite process requires Node 24. Runner Node 22
execution itself was not available in this lane; native verification used Node
24.21.0. Production exec fixes /data; the exported function accepts an explicit
temporary root solely for local real-SQLite checks.

The Machines API origin/app are fixed. A single expected mounted machine is
required; unexpected memory, CPU, mounts, IDs, multiple machines or states fail.
A stopped existing machine may be awakened through one bounded public GET without
the token, then topology is checked again. There is no create/start/scale API call.
API requests disable redirects, time out, and stop reading above 64 KiB. List
requests allow 15 seconds; wake allows 45 seconds; exec allows 90 seconds with a
100-second transport timeout and an 80-second remote process deadline.

The remote function rejects a noncanonical/symlink root, symlink/nonfile databases
and WAL/SHM/journal companions, missing legacy data, corrupt SQLite and failed
integrity/foreign-key checks. Read-only source connections prevent missing database
creation. Before allocating the destination, available space must cover twice
the observed page-count/page-size total plus a 32 MiB reserve. This is a
conservative preflight, not a continuing quota or protection against concurrent
volume growth. The helper does not rewrite source database contents.

Each backup uses a fresh release-backup-<epoch>-<UUID> directory with mode 0700
and files with mode 0600. No prior backup is reused or overwritten and no file is
pruned, including failed partial copies. Completed copies are reopened read-only
and checked with PRAGMA integrity_check and PRAGMA foreign_key_check.

The remote command reports only its fixed sentinel, release candidate commit,
private backup basename, Node runtime and fixed database names/page counts.
That commit identifies the candidate requesting the backup; it does not attest
the old running image's commit. HTTP/network/remote errors and raw responses are
never printed. The gate verifies actual remote exit fields, expected commit,
exact report fields, safe basename/runtime and unique allowed database entries
before printing the harmless success report.

## Requirement-to-evidence checkpoints

| Boundary | Verification | Result / refinement |
| --- | --- | --- |
| WAL preservation | Real on-disk SQLite, open writer, main-copy negative control, online backup reopen | Main copy missed committed WAL row; backup retained both rows and integrity was ok. |
| Existing/absent files | Legacy-only fixture then all three fixed databases | Existing databases copied; absent additive source files stayed absent. Missing legacy rejected before creating files. |
| Private unique destinations | Two backups around a later source write; bytes and POSIX modes inspected | Earlier bytes unchanged; distinct private 0700 directories and 0600 files. |
| Input/storage failure paths | Real symlink root/database/WAL, corrupt bytes and foreign-key-invalid database; million-row constrained-heap check | Rejected without success evidence. Foreign-key validation now reads only its first violation. Diskspace preflight reviewed; low-free-space threshold was not exercised by a filled-volume trial. |
| Remote program | Native ESM import captured production command and executed it in a disposable root | Command-array program completed with real SQLite and private destination; no row contents in output. |
| Fixed API/topology | Isolated fetch responses with empty/multiple/wrong-size/wrong-mount/state machines | Rejected before exec. Stopped-machine path used a token-free public GET and rechecked list. |
| Execution/result authority | Isolated nonzero/malformed exit fields, missing/malformed/wrong-commit/report cases, explicit/omitted zeros | Only valid zero-exit strict success evidence accepted. Raw HTTP/network bodies and oversized replies rejected without secret output. |
| Independent review | Fresh reviewer receives fact-only packet, no prior chat history, read-only source/test scope | One confirmed P2 memory issue corrected; no other confirmed defect. Fresh reviewer inspected the correction and native regression in a contextual recheck; P2 resolved, no remaining actionable findings. No redundant suite rerun. |

## Actual red, green and scope

Native Windows-to-WSL bridge, Ubuntu/lizhi, Linux mise Node 24.21.0 and pnpm
11.9.0; APP_URL was http://127.0.0.1:4099. Fixtures were disposable directories,
not the application data directory. Tests use the project's existing Vitest 5.0.1.

Initial explicit unimplemented exports: 27 tests failed as expected (exit 1).
The red output also exposed a test.each array fixture spreading topology items;
the test was corrected to pass the complete array. First implementation: 27 PASS,
914 ms, typecheck exit 0. A scoped refinement script syntax error applied no edits;
its unchanged 27-case coverage run remained green and was not new acceptance.

The added serialization test first failed when executing Vitest's transformed
function in native Node. Vite rewrites dynamic imports inside that function.
The integration check was corrected to import/capture/run the actual production
ESM wholly in native Node, preserving the real deployment path. This is a harness
boundary correction; no bundler is supported for the production helper.

Fresh reviewer reproduced a consequential memory failure: an 11,034,624-byte
disposable SQLite file with one million foreign-key violations caused native Node
with a 48 MiB heap to abort (SIGABRT), because foreign_key_check.all() materialized
all violations. Production memory impact was not measured. The parent inspected
the query and accepted the first-row .get() refinement. A new native regression
uses one million invalid rows under the same heap bound and now exits normally
with sanitized REJECTED and no stderr (834 ms). This is a controlled local
resource/failure-path comparison, not a live 256 MB machine result.

The same reviewer then inspected the updated query and native regression,
confirmed P2 resolved, and found no remaining actionable issues in the assigned
scope. This was a contextual recheck, not a second fresh review. The reviewer did
not repeat the already passing suite.

Final affected check after that correction:

~~~text
APP_URL=http://127.0.0.1:4099 mise exec -- pnpm exec vitest run spec/backup-mounted-data.test.ts --coverage --coverage.include=tools/backup-mounted-data.mjs --coverage.reporter=text --coverage.reportsDirectory=/tmp/release-backup-coverage
31 PASS; exit 0; 2.75 seconds.
9 real SQLite cases + 1 native serialized-command integration + 21 isolated API cases.
Helper-only coverage: statements 90.55%, branches 92.43%, functions 100%, lines 95.83%.
mise exec -- pnpm typecheck: exit 0.
git diff --check: exit 0.
~~~

Source identities at this check:

~~~text
14cdd20734048aeca93a5182630c9236e5b6fe8e81ef1072e2a30dda376dfb93  tools/backup-mounted-data.mjs
f2c31566b002ced70633c92f542aaa0003bfa4dba45416621a5c93b0d3cbcb0d  spec/backup-mounted-data.test.ts
~~~

## Remaining release limits

API mocks and native disposable-root execution are not live Fly release evidence.
At this checkpoint, root reports a separate read-only actual Machines API GET:
HTTP 200, existing environment token present, exactly one stopped machine with
shared CPU / one CPU / 256 MB and exactly one /data mount; ID shapes passed.
No credential, raw machine configuration or database content was printed.
The first direct mise bridge failed PATH before making a request; the corrected
known bash/mise bridge succeeded. This is parent-observed topology evidence,
separate from this worker's API fakes. Exec authorization, actual mounted runtime/
free space, backup completion and deployment remain unverified at this checkpoint. A live
failure blocks deployment; it does not authorize changing credentials or topology.

Copies remain private on the same mounted volume. Each database is individually
consistent, with no common cross-file instant and no protection against losing
that volume. Concurrent writes after a snapshot stay outside that snapshot.
Quiescing writers and an authorized private off-volume copy are still required
where coordinated restoration or disaster recovery depends on them. There is
no automatic rollback, retention pruning or data export in this helper.
