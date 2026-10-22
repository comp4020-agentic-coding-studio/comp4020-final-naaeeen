# Existing movement fixture adaptation

Historical initial checkpoint; the later required8 refinement is recorded in
[elapsed-clock-fixture-required8-refinement.md](elapsed-clock-fixture-required8-refinement.md).

23 October 2026. Scope: eight existing test files only, plus this evidence. Core
implementation and the separate default-clock/reset/idle/lease test belong to the
core executor. No global performance spy or network-controlled clock is introduced.

## Requirements, comparison and refinement

Six existing movement fixture families explicitly inject their existing
controlled clock. This preserves virtual route distances, 80/100/250 ms increments,
geometry/sequence assertions and civil-time lease cases. These paired fixture clocks
are compatibility plumbing, not independent clock-domain verification.

The picture fixture uses a local native monotonic base plus a synthetic route
offset, preserving its existing civil spy and real1050ms action-window waits.
The active spatial-resource-rate fixture independently injects an elapsed
counter while Date.now supplies a separate controlled civil clock. Its twelve
former bug-characterization cases now require corrected behavior; five additional
cases cover forward civil profiles, unearned credit, an unrefreshed thirty-action
budget, and the 79/80 ms interval boundary. Exact ACK classifications remain strict.
Existing speed-slack/distance/duplicate assertions in the other families remain.

Before core changes, the corrected rate suite was run against the original two
production-source hashes. The refined RED run failed nine assertions and passed
eight tests; there were no unavailable-ACK/setup failures. The normal timing,
true fast-movement, real thirty-action burst and duplicate controls passed.
The failures exposed wall-backstep/stall sensitivity and wall-forward credit,
window-refresh and interval errors. Actual-handler I/O is real; elapsed progression
is synthetic and does not establish host scheduling or B2 attribution.

An initial test attempt used 60-second forward civil jumps. Five cases lost their
Socket.IO ACK through that protocol's separate civil-time heartbeat expiry. This
setup limitation was preserved in the tool transcript, then the test factor was
bounded to 500 ms/action (15.5 seconds in total) or a 1000 ms single correction.
The refined run reached application ACK assertions throughout. No application
limit, workload cadence, geometry or production heartbeat was changed.

## Preservation and reproducibility

The exact historical test is saved in elapsed-clock-historical-rate-spec.ts.txt
(SHA256 32b343ff60d298306bdc54346598cbd9a4dac1ee4f3d82af2a009e61268fde70).
The original rate-attribution-controls-observations.json remains byte-identical
(SHA256 500350c209f17abe511211ae15cafd4f708ac7a0bd15ec08a6ad17046ee50549).
The active suite emits new observations only to stdout and cannot rewrite it.
The refined RED record and source attribution are adjacent JSON files;
full raw output and all eight preimages are retained under ignored
.local/elapsed-fixtures/. Each RED fixture reports closure of its service,
socket and disposable directory (17/17 for each).

The bounded eight-file runner is .local/elapsed-fixtures/vitest.config.ts. It
contains the eight explicit include paths and one worker, with no global setup
requiring an external retained service. Command: mise exec -- pnpm exec vitest run
--config .local/elapsed-fixtures/vitest.config.ts. Type check: mise exec -- pnpm
typecheck. The first changed-set run completed124/125tests, with all17independent rate
regressions passing. Its single picture-test failure followed a real1050ms budget
wait while its injected elapsed callback still read the civil spy. The refinement
above removes that mixed domain; its affected16-test family then passed16/16.
Both runs and exact source hashes are preserved in elapsed-clock-fixture-verification.json
and ignored raw logs. This is a combined affected-check result, not a claim of a
single125/125run. No thresholds, waits or assertions were weakened.

Other Date.now elapsed wrappers were audited: general-realtime idle/guard cases
advance explicit counters before delivery waits; recovery waits observe DOM/ACK
delivery; game native25ms waits process disconnect events and its longer waits
check durable civil-time maintenance/authentication. They do not rely on a native
1000ms elapsed-budget reset. These deliberately paired fixtures are not claimed
wall-independent.

The one typecheck attempt exited2 on three errors in the core-owned new clock
test (record type and two tuple callback arities). Its owner fixed them and owns
the follow-up check; parent reconciles that result. No full suite, browser,
resource benchmark, retained server, commit or push is part of this lane.
