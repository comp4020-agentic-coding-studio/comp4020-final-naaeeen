# Final native handoff verification

23 October 2026. Parent released one bounded native lane after core commit
`e800f4efa225d103ab8e5d4d309368803465484d`, required check12 (73 files,
1,575 tests, 510 unchanged runtime/build hashes, 43.206 seconds), final client
review and retained synthetic-service restart. This is a prospective record;
actual outcomes are separate source-bound native-handoff records.

## Selection and stopping rule

1. Unchanged `tests/e2e/motion-transition.spec.ts`: one case, hash
   `7d8e14a5b0d1527249e60b0c1c657e6eef281c0a9c526ee95249fcbbfac96e9c`.
   Preserve the old source-bound functional RED; do not retry it.
2. `tests/e2e/spatial-places.spec.ts`: all four room/sofa/study/scoped-draft cases.
3. `tests/e2e/spatial-recovery.spec.ts` (two),
   `tests/e2e/picture-table.spec.ts` (two) and
   `tests/e2e/break-and-voice.spec.ts` (one): five maintained cases that exercise
   the changed HouseClient through seat, Stand, recovery and game boundaries.
4. Unchanged `six-browser/return-runner.mjs`, label `handoff-final`: one complete
   six-identity journey, 24 placements/four per author, explicit consent,
   Leave/Stand/reseat, reload and authenticated owned-room return.

Selections run sequentially, once each. Stop on a concrete failure and preserve
all raw evidence. Playwright keeps its original 60-second case, 300-second CI
global bound and zero retries. The existing six-person task keeps 240 seconds.
Outer wrappers allow only bounded framework cleanup; exceeding that allowance
fails the record and never extends a task acceptance deadline. The independent
board-only, legacy trace and title lanes are not repeated for this HouseClient
repair; their previous results retain their own source scope.

## Binding, isolation and cleanup

The native-handoff wrapper records the actual current source count and hashes
for src/public/board/spec/tests/e2e/tools/scripts, allowlisted runtime/build
configuration and current six-runner imports. Before/after equality includes
added/removed paths. The retained launch record, all 35 startup source hashes,
PID/start-time identity and live HouseClient response bytes must match. The
pre-run source count is 648; it is an observed count, not a required constant.

Every Playwright selection has its own ignored raw directory, results, HTML/JSON
report and `.last-run.json`. Exact JSON case statuses/counts/attempts, case/global
timeouts, retries and failure records are checked; stdout wording is not a
grader. All observed owned child and native browser executable processes must
close. The motion observation independently reports actual context closure. The
existing six runner additionally requires all six resolved context closes, close
events, no remaining contexts and a disconnected browser.

Raw logs, original PNGs and original JSON bytes stay ignored under
`.local/spatial-apply/native-handoff-final` and the one separately assigned
`.local/spatial-six-browser/run-handoff-final` directory. The unchanged runner
may create only the fresh tracked `six-browser/run-handoff-final` directory.
Public JSON uses a lossless Unicode spelling for the known public vendor Slovak
locale basename; parsed equality and raw/serialized hashes remain inspectable.
All new text uses canonical LF. No source, test, runner, service lifecycle,
credential, configuration or acceptance-threshold change is part of this lane.

Native PNGs remain `PARENT_PENDING` and unpublished. The parent owns actual pixel
inspection and curation. Mechanical passes do not establish physical-phone
performance, human usefulness, deployment or sustained resource acceptance.
The resource lane remains held until this executor reports complete closure
and idle status.
