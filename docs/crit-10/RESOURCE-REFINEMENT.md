# Resource trial: wall clock and elapsed pointer budget

19 October 2026. This note follows an actual failure; it does not reinterpret it
as a pass or attribute it to the new logger.

## Observed trial

[First local result](evidence/resource-local.json) ran the registered 300.001
monotonic seconds with all 24 views, 7,188 saved patches, 708 saved messages and
zero skipped writes. Peak RSS was 174.48046875 MiB. Every gate passed except
`normalInputs`: 3,245 pointer requests received `RATE_LIMITED`. Overall status is
FAIL. The instrument, thresholds and pointer limiter were unchanged from baseline.

The result's civil start/finish timestamps span 287.941 seconds, even though the
measurement itself lasted 300.001 monotonic seconds, with bootstrap/cleanup
outside it. This shows inconsistent clock progress during the trial. It does not
show the exact timing of each rejection. A separate
[idle 10-second diagnostic](evidence/clock-diagnostic.json) found near agreement:
10,421.169 monotonic milliseconds versus 10,422 wall milliseconds. The discrepancy
is therefore not assumed to be a constant conversion factor.

## Discriminating checks

The generator compares `performance.now()` deadlines before sending and after
normal ACKs. A timer merely waking early cannot bypass that guard. The server's
pointer budget instead used `Date.now()`. The independent source reviewer
recommended a real-socket wall-clock rollback test plus a real burst control.

The worker held native timers and monotonic time unchanged, moved only the wall
clock back 60 seconds, and submitted 21 valid pointers. Consecutive normal sends
were at least 55 ms after the preceding ACK. On the original source, the run took
1,177.449 monotonic ms but accepted only 20 and rate-limited the last. The separate
21-request burst finished in 22.130 ms and correctly rejected request 21. This
reproduces a clock-sensitive limiter defect without a full-load retry.

## Scoped repair and acceptance

Only the transient pointer budget's initialization and reset now use
`performance.now()`. The 20-event/1000-ms rule stays the same. Pointer civil
timestamps, presence expiry, identity/membership checks and logging remain as
before. [Node's performance API](https://nodejs.org/docs/latest-v24.x/api/perf_hooks.html#performancenow)
provides time relative to process start; it suits this process-local interval.
This does not convert all persistence/lease times or diagnose the WSL host clock.

The first failed result remains immutable. A second full exercise is justified
only after the actual regression passes, independent review accepts the scope,
and source hashes are rebound. No automatic retry, reduced pointer cadence,
changed duration, relaxed RSS/latency/input criteria or benchmark-instrument
change is permitted. Final results and current source hashes are recorded in
[acceptance](ACCEPTANCE.md).

The unchanged regression passed after the correction: all 21 paced pointers
accepted, while a fresh burst still rejects event 21. A separate independent code review
reran both cases successfully and verified the two clock domains remain separate.
Its executed-tool report is recorded separately from the worker’s fresh static
review, which did not run tests; no extra raw reviewer log file was saved.
[Exact red/green evidence](evidence/pointer-clock-regression.json) records source,
spec and log hashes. The two protocol snapshots preserve the same instrument,
workload and gates; only runtime source binding differs.

## Full verification after the repair

[Second trial](evidence/resource-local-2.json) completed 300 recorded seconds with all
21 gates true: zero pointer/motion/patch rejections and normal timeouts, zero
skipped writes, all 24 final views and full slow-reader recovery. It saved 7,188
patches and 708 chats; RSS peaked at 201.46875 MiB within the unchanged 210 MiB
bound. Parent verified current source hashes, identical criteria/instrument and
exact restoration of the historical result file. This qualifies the current local
candidate; it does not prove which host clock event caused every first-run reject
or establish a causal memory comparison between the two trials.
