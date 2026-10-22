# One-probe bootstrap rate attribution plan

Status: PREPARE ONLY; execution HELD. Written before attribution instrument edits.
The stopped ABBA A1/B1/B2/A2 record is immutable and will not resume or receive a
replacement A2. B2's RATE_LIMITED remains unattributed.

After targeted controls, independent review and a NEW final-source binding after
the puzzle UI repair freezes, request one NEW mixed bootstrap trace. No retry,
production optimization, backend/clock/limit change or300second exercise is part
of this plan. The24views, fixture content, four routes, sleep100ms, original ACK
wait and all resource/action budgets remain unchanged. Abort on the first failed
ACK/timeout, trace cap or detected route/source drift, or close normally. Preserve
already-in-flight outcomes; stop new sends after the first failed traced action.

## Frozen bounded observation

The existing canonical geometry/arrival paths produce41/54moves for actual view
indices2/4, repeated at14/16, plus one seat action each:190moves +4seats =194maximum
trace rows. `rate-attribution-route-bound.json` preserves the four route hashes,
counts and geometry hash, computed without starting a service. Check each actual
bootstrap route against its frozen hash/count before using it; keep original
route computation and per-actor scheduling. Do not precompute/reorder live routes,
change sleep, add actions or retry a rejected step.

One bounded row per bootstrap move/seat records only numeric actor index, step,
motion-sequence context, parent send/ACK monotonic and wall milliseconds, and fixed
outcome enums. Seat rows label sequence as the current motion-sequence context;
the seat command itself has no sequence field. Never retain raw ACK messages,
actor/house/room IDs, tokens, command bodies, coordinates, arbitrary error text or
server logs. Only RATE_LIMITED plus either exact known server message maps to
ACTION_BUDGET or MOVE_INTERVAL; every other denial/message maps to OTHER.
Timeouts use a fixed timeout outcome. The cap is194, not an unbounded ring buffer.
Write after child closure and bounded settling of already-in-flight ACKs.

Add numeric server Date.now beside the existing100ms server-monotonic diagnostic
sample in a new opt-in self-describing schema. Wall time may go backwards; reject
only nonfinite wall values. Compare deltas within the SAME process; parent/server
wall clocks are not interchangeable. Keep old one-second result fields, sampler,
original resource gates and v1 ABBA artifacts intact. Keep terminal/count/ACK
completeness and the exact original gated-sample prefix separation.

Preserve current board/spatial instrument and registered baseline/mixed protocol
bytes before editing. Do not rebind the registered default or alter the four ABBA
protocols. The new trace protocol/source registration remains HELD until the
puzzle UI is frozen and the parent separately authorizes binding/execution.

## Discriminating controlled checks

Use isolated real createService/Socket.IO handlers with fresh synthetic identities
and an explicit Date.now spy. Name test elapsed time as synthetic; ordinary network
I/O/real monotonic duration is separate and is not a benchmark or a clock diagnosis.

- Normal100ms synthetic elapsed and100ms wall advance accepts valid quarter-metre
  steps and31paced zero/valid actions across refreshed one-second windows.
- After one accepted quarter-metre step leaves0.07motion credit, a next100ms
  synthetic interval with30ms backward wall adjustment has net70ms. Its valid
  quarter-metre distance still passes credit and isolates MOVE_INTERVAL.
-31otherwise100ms-paced zero moves or valid actions with stalled/backward wall
  isolate the general ACTION_BUDGET without the movement-interval predicate.
- Genuine fast movement, a31event burst and duplicate STALE_INPUT still deny.
  Calibrate masking by the earlier distance/credit branch; retain first failed
  discriminator checks and refined controls rather than silently replacing them.
- Pure trace checks cover exact classification/unknownOTHER, cap, first-failure
  stop, timestamp validation, payload exclusion, server wall rollback, unchanged
  timer/one-second/grader and v1/v2 schema separation.

These constructed controls establish branch behavior under injected conditions.
They do not establish what happened to B2 or justify a production clock change.
Run only targeted specs, syntax, types and independent review before any probe GO.
