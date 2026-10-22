# Server-local elapsed clock: bounded implementation

The decision is elapsed-clock-repair-plan.md. This worker owns only house-realtime.ts, server.ts, the new house-elapsed-clock.test.ts and elapsed-core evidence. Preimages/hashes are bound in elapsed-core-entry.json; the exact production diff is elapsed-core-source.diff. No worker commit or release was made.

## Contract and implementation

AttachOptions.elapsedNow and ServiceOptions.houseElapsedNow are internal optional callbacks. The service forwards its hook only at attachHouseRealtime; the default is the bound arrow ()=>performance.now() from node:perf_hooks. No client payload, environment variable or user setting supplies this clock.

Context.budgetElapsedAt owns the30-action/1000ms window. Lease.lastMoveElapsedAt owns3.2m/s movement credit, the existing0.64cap/0.06slack, nonzero80ms interval and walk-to-idle age greater than250ms. Every existing origin initialization/reset uses the same elapsed clock: initial acquisition/spawn, zone/geometry reset, resubscription, takeover and Stand. Existing Stand credit carry is retained; its origin alone changes clock domain. Tick reads separate wall and elapsed values.

Wall-based session/house maintenance, reservation expiry/projection, availability and log timestamps remain. The slow-reader blockedAt clock is intentionally unchanged. So are all thresholds, geometry/collision, generations, consent, payloads, SQLite schemas and timer/event scheduling.

## Requirement -> experiment -> refinement -> verification

| Boundary | Actual evidence | Result / refinement |
| --- | --- | --- |
| Normally paced moves under rollback/stall | Real clients advance injected elapsed100ms while civil time rolls back5000ms or stalls. | Pre-repair handlers return INVALID_MOVE; corrected handlers accept. Forward civil time is a legitimate positive control. |
| Actual abuse window and motion boundaries |30th/31st action, elapsed999/1000ms,79/80ms, zero movement exception, duplicate sequence and0.71m versus0.64m movement. | New suite preserves strict denial/acceptance boundaries while civil jumps cannot refresh credit/window. |
| Idle and all reset origins | Actual timer projection at elapsed250/251ms, six reset routes, and unchanged wall-stamped raw logs. |17-case suite checks the same elapsed origin after every reset. Stand fixture now waits for an actual seated snapshot before testing its release; this corrected a fixture precondition rather than a product rule. |
| Wall policies | Advance elapsed far beyond30seconds while civil time remains before reservation expiry; then advance wall through expiry. | Availability/raw logs retain wall values; chair remains reserved until its existing wall deadline. Service ActivityRecord normalizes to ISO time, so exact raw numeric log checks use the direct attach boundary. |
| Real default clock | One default-hook service waits an actual100ms, rolls civil time back and walks. | Actual default performance clock succeeds; the frozen preimage rejects INVALID_MOVE. No global performance spy is used. |

The first pre-patch16-case run recorded15fail/1pass, with the log-format and observed-seat fixture calibration gaps separately retained. The corrected final17-case suite was then run against isolated frozen pre-repair source: **15 assertion failures /2 legitimate passes**, without production source rewind or protocol-disconnect failures. The current source passes **17/17**, zero skips. This is a controlled technical comparison, not proof of the unknown live mixed rejection category.

## Checks, coverage and limits

Final pnpm typecheck and scoped git diff --check pass. V8 changed-line coverage is **45/49 executable statements (91.84%)** and **21/23 branch arms (91.30%)** across the two changed production files. The method and all file/line counters are in elapsed-core-results.json. The narrow test selection covers only59.24% of all realtime statements and12.05% of all server statements; those whole-module gaps are explicit. Existing wall maintenance/expiry branches on four changed lines remain uncovered in this selection.

Source, command exits, original failures, calibrated preimage comparison and coverage counters are bound in the JSON record. Raw logs and isolated copies remain ignored in .local/elapsed-core. All disposable servers were closed. No full suite, browser, sustained resource workload, provider action or persistent service was run here. Parent independent review, affected fixture families and new-source qualification remain separate gates.

The old mixed full run's exact rejected ACK category remains **UNKNOWN**. This repair addresses independently demonstrated clock sensitivity; it does not diagnose the WSL host or claim that a particular clock branch caused that historical run.
