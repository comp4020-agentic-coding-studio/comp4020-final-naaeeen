# Elapsed-time repair before current qualification

23October2026. Decision: use a server-local elapsed clock for transient action and
avatar-duration rules. This is a narrow implementation refinement, not another
unchanged bootstrap trial or an attribution of earlier failures.

## Evidence and alternatives

The first current full baseline passed23/23gates over300monotonicseconds with
197.148MiBsampledRSS. Its motion driver repeats unchanged coordinates, so it does
not exercise the80msnonzero-motion rule. The first current full mixed run failed
in preparation after2of4gamechairclaims withRATE_LIMITED; exact ACKmessage was
not captured. It never entered its300smeasurement. Both results, protocols and
closed-process/source records remain unchanged. B2 and this exact branch remain
unknown. The separate one-shot194ACKtrace is complete and will not repeat.

Existing controlled actual handlers demonstrate that wall rollback can deny a
normally paced move, stalled wall removes credit/window refresh, and civil time
can differ from elapsed duration. These independently demonstrate a production
clock-domain defect even without attributing the live failure. A fresh Astra max
source decision and a separate Sol fixture inventory checked the affected paths.

Another unchanged probe could collect a branch but would not fix this demonstrated
sensitivity. Raising limits, slowing the registered workload or weakening geometry
would change the question. Select the bounded clock repair and new qualification;
retain an allowlisted first-rejection category in that next mixed run.

## Primary sources and inference

[Node24.21performance API source](https://raw.githubusercontent.com/nodejs/node/v24.21.0/doc/api/perf_hooks.md)
describes performance.now as a process-relative high-resolution millisecond clock.
[Node24.21process timing source](https://raw.githubusercontent.com/nodejs/node/v24.21.0/doc/api/process.md)
distinguishes high-resolution interval timing from civil time.
[High Resolution Time3,1September2026WorkingDraft](https://www.w3.org/TR/hr-time-3/)
explains clock adjustment and recommends monotonic duration measurement; it is a
draft, not a newly verified final standard. Applying that distinction to our action
window/credit/idle rules is our engineering inference. None diagnoses the WSL host
or establishes the exact rejected ACK's category.

## Patch contract

Add attachHouseRealtime options.elapsedNow and internal createService
options.houseElapsedNow, defaulting to a correctly bound performance.now callback.
Use it for action window30events/1000ms, movementcredit3.2m/s/cap0.64+existing0.06
slack, nonzero80msinterval and250mswalk-idle age. Rename private elapsed fields
and update every creation/reset on connect/acquire/zonechange/geometryreset/
resubscribe/takeover/Stand. Tick keeps separate wall and elapsed readings.

Preserve all limits, geometry, generations, consent, permissions, seatreservation
expiry, availability/log/session/durable wall timestamps, payload schemas, browser
quality, persistence and scheduling. No clock value is accepted from a network
client, environment variable or user setting; the hook is internal fixture plumbing.
Do not broaden this patch to backpressure or durable timestamp policy.

## Ownership and verification

Core executor owns only house-realtime.ts/server.ts and a new focused clock test.
Fixture executor owns the eight enumerated existing movement specs, explicit local
clock injection, and corrected active rate regressions. Preserve the historical
bug-characterization spec/evidence; active tests must not overwrite frozen results.
Resource executor owns only first-rejection category reporting on failure, with
no scheduling/success-path grading change. Parent integrates and commits.

Before acceptance: actual-handler rollback/stall/forward cases; unchanged true
abuse/distance/duplicate rejection; clock-consistent resets/idle; wall timestamp and
lease preservation; one default-clock real-timer walking case; affected fixture
families and fullrequiredcheck; independent source review and actionable refinement.
Then freeze newsource, run one NEW baseline and mixed300sunder unchanged conditions
with no concurrent tests/browser/load, and current actual six-browser/maintained
journeys. Old source passes stay scoped to their actual bytes. Stop/preserve a new
failure and review; do not repeat until a favorable result appears.
