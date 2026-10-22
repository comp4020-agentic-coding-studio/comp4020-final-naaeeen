# Fixture clock refinement after required check 8

23 October 2026. This amends the earlier existing-fixture checkpoint without
rewriting its failed/passed runs. The full required check reported1522/1523tests,
69files, with a failed setup house.move in the game receipt integration case.
The retained log omits the exact ACK fields: category remains UNKNOWN. Source
inspection independently proves that a real Date.now component plus a synthetic
100ms offset can still move backwards between nonzero route steps. This does not
retrospectively establish the failed ACK category or live B2 cause.

The earlier audit checked native1000ms waits too narrowly. The revised audit
covers every elapsed provider used during accepted nonzero movement:

- Game uses native performance.now plus the same explicit clockOffset. Its civil
  spy remains real Date.now plus that offset. Route points and100ms steps remain.
- General realtime defaults to the native production clock. Only tests needing
  manual virtual progression opt into setupWithClock, whose explicit fixed
  counter supplies elapsed time and the paired civil spy. No mock detection or
  global performance replacement is used. Original numeric guard, log, idle and
  civil lease assertions remain.
- Recovery defaults native; its route test explicitly passes a manual counter
  before the first subscription. Its later civil spy and100ms steps remain.
- Picture already uses an independent native monotonic base and synthetic route
  offset, including native1050ms action-window waits. Seat, spatial HTTP and board
  resource fixtures use fixed manual counters. Rate regressions use independent
  synthetic elapsed/civil counters. No elapsed callback reads Date.now now.

Setup route loops now include the complete house.move response in assertion
messages, with a constant phase label and no request payload, token or cookie.
Existing geometry, movement credit/slack, interval/action limits, sequences,
assertions, native scheduling, routes and lease semantics were not relaxed.

The five changed fixture families passed76/76tests in one bounded run (five files,
15.88s Vitest duration), with before/after source hashes unchanged. Typecheck and
scoped diff whitespace checks passed. Unchanged rate/picture/spatial HTTP families
were not repeated. The two production hashes remain the frozen core hashes.
Commands, source hashes, exact old failure log hash and raw-result references are
in elapsed-clock-fixture-required8-refinement.json and ignored
.local/elapsed-fixtures/required8-refinement/. No full suite, browser, resource
workload, retained server, commit or push was run here. Parent owns independent
review, source freeze and the next required check.
