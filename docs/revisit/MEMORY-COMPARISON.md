# Memory comparison: completed short diagnostic

Completed 7 October 2026 for S4.I6f, S4.I6j and S4.H2. The parent owns REGISTER status, candidate selection and canonical implementation. No canonical runtime source, global flag, Fly machine, production data, commit or push was changed by this task.

Select B as the smallest candidate to take into the full L1/L2 acceptance gate. It sharply reduced native preparation work and consistently reduced short-run CPU/RSS without changing the authorization or projection architecture. C provides further CPU and materialization savings, but showed essentially the same short RSS as B and adds a projection boundary. Neither has passed sustained acceptance. D is not supported as the memory repair.

## Frozen question and design

The original actual-server 30-minute failures remain unchanged: L1 RSS196.492 MiB and L2 RSS260.102 MiB exceeded180 MiB. All eight new trials are100-second synthetic localhost diagnostics. No short result replaces those failures or establishes30-minute stability, a leak, Fly performance or human value.

Two fresh-data repetitions compared A frozen actual source; B A plus per-HouseStore constant-SQL statement reuse capped at 96 keys; C B plus freshly authorized metadata reads for motion input and motion-only projection; D A bytes with child-only --max-old-space-size=96. C is a bundled change, not a separate causal estimate for its individual paths. No user rows are cached. The unchanged production Fly 256 MB / one-volume shape was not exercised.

Every run used the same installed Node 24.21.0, ancestor dependencies/shared canonical node_modules symlink, loopback 4106 and sequential dedicated child. Each of two houses had 6 permanent members,100 full bounded ASCII chats and18 full bounded cards(6 active and 12 closed), seeded through real commands. Twelve actual controllers used real safe spawn poses/current identities, successful subscribe readiness, current generations and staggered 10 Hz valid geometry routes. Both real TCP-paused controller readers underwent a 65-second pause starting 15 seconds in, heartbeat/lease expiry, fresh same-token rejoin and Quiet verification. No reader or180 MiB criterion was dropped.

Actual phase-start HEAD was 1c44cb7adc09bddd7952f9e068799e03d21c7d38 with explicitly dirty runtime files. Parent static route/README fixes were copied before freeze. Canonical server/authority source and house geometry hashes still matched A at completion. The presentation module public/house-label-layout.js changed independently in the parallel UI work; measured children retained their unchanged frozen copy. Variant/instrument hash checks passed at completion. The WSL host was unconstrained and shared, not a fixed production VM; order was counterbalanced A1,B1,C1,D1,D2,C2,B2,A2.

Protocol: evaluation/house-memory-profile.protocol.json version 2, SHA256 `77e84357af4b5448dbc17e7e246e278b145461501eb7866ba95bacd7ee6d872a`. Instrument SHA256 `7cfb0d37aefcc0e2d7ab17e6e12e96a0fcb04040d5cc3daf810489fc4d3bc62d`. Node executable SHA256 `7fde7b8afa198da66257f42ee2001d874c7355631e6d1579a5fb5ef1f246df4c`.

## Actual matched results

RSS/heap/external are sampled child process high-water values in MiB, including startup; CPU is child user+system seconds. Statement preparations are actual DatabaseSync.prepare calls across the service. Call counts indicate allocation work, not measured allocated bytes.

| Trial | RSS | Heap used | External | Native prepares | Full snapshots | CPU s | Normal visible p95 ms | Normal move rejects |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| A1 | 158.988 | 46.753 | 11.164 | 837429 | 33074 | 27.845 | 105.971 | 0 |
| B1 | 150.375 | 52.815 | 11.165 | 37 | 33088 | 18.356 | 107.576 | 0 |
| C1 | 151.066 | 52.597 | 11.236 | 37 | 219 | 11.749 | 116.359 | 0 |
| D1 | 152.793 | 33.096 | 11.163 | 836782 | 33067 | 36.529 | 125.654 | 0 |
| D2 | 193.875 | 45.516 | 11.163 | 827827 | 32724 | 54.909 | 169.133 | 120 |
| C2 | 151.227 | 52.125 | 11.235 | 37 | 209 | 11.337 | 99.262 | 0 |
| B2 | 150.758 | 46.812 | 11.164 | 37 | 33088 | 18.627 | 98.141 | 0 |
| A2 | 158.195 | 47.893 | 11.165 | 837389 | 33074 | 28.047 | 113.470 | 0 |

Every trial saved exactly 20 scheduled intents (10 per house), delivered all 120 target saved entities with matching chat text/card fields and revision, ended with 12 healthy views, achieved the registered connected-controller cadence and completed both slow-reader expiry/rejoin checks. Queue observations were0 packets / 0 bytes at the100 ms sample points; instantaneous peaks are not proved absent. Normal visibility p95 ranged98.141–169.133 ms. No unexpected ACK timeout occurred.

All eight statuses remain DIAGNOSTIC_FAIL because the original combined p95 criterion includes deliberately paused-reader recovery. With this100-second fault concentration, combined p95 was30.013–30.125seconds and maximum recovery visibility about60seconds; slow latencies are retained, not removed. fullDuration=false remains visible. The registered normal-reader metric is additional diagnostic evidence, not a redefinition of the original gate.

D2 additionally failed RSS(193.875>180 MiB) and validNormalMotion:78RATE_LIMITED plus42INVALID_MOVE rejections. Its achieved cadence still passed; cadence alone cannot hide rejected frames. D2 CPU was54.909seconds and event-loop maximum818.414 ms. No failed trial was rerun to obtain a pass. Event-loop p95/p99 stayed within the declared50/100 ms diagnostic limits across all trials.

B had37native preparations in each run versus about 837,000 for A, with almost identical full-snapshot and SQL execution counts. Mean CPU fell from27.946to18.491seconds(about34%), and RSS peaks were150.375/150.758versus158.988/158.195. C cut full snapshots to219/209and all-query calls to33,521/33,522versus B 99,274 per run; mean CPU fell further to11.543seconds. C RSS151.066/151.227did not improve on B. These two repeats support choosing a smaller repair first, not a sustained-memory guarantee or statistical significance claim.

Default observed V8 heap limit was2240 MiB. D with96 MiB old-space had an observed total V8 heap limit288 MiB; the flag does not impose a96 MiB heap/RSS/VM cap. D left native preparations and materialization work in place, used more CPU in both repeats and failed the RSS/motion bounds once. Native StatementSync prototype inspection showed no explicit finalize method in this runtime. Reuse bounds statement lifetime by the store, but passing short trials and observed counters do not prove a source leak.

## Functional verification, review and calibration

Each candidate passed all 55 protected tests:54 unedited original store/realtime/HTTP/operations tests plus 1 identical private lease-expiry content regression. The copied original grader hashes were protected and checked. Every candidate also passed the private actual-createService validator covering fresh metadata/profile motion delivery, closed-room input/delivery, membership removal, session revocation, control generations and valid state. C additionally passed direct lightweight-metadata cross-house and removed-member denials; the original store tests protect cross-house access for all candidates. C final strict TypeScript check passed.

Fresh read-only review found an introduced C race: a motion-only projection could queue a reliable refresh during lease pruning or pose reconciliation, then be sent with empty chat/cards. A seeded-content regression observed a genuine missing-chat red. C now recomputes the full projection when pendingSnapshot arises during the motion projection; the regression and full suite pass. Optional metadata fallback preserves the original fake-authority test adapter. The initial expiry test attempt that triggered client heartbeat timeout was a rejected setup attempt, not the behavioral red.

The reviewer also corrected instrument startup scope, complete card-field delivery validation and failure-time duration capture. Six content-grader calibration cases passed(good/missing chat/card, wrong question/resource). Occupied-port startup produced preserved INFRASTRUCTURE_FAILURE; deliberate child SIGTERM produced preserved ABORTED with bounded shutdown. Signal/exit handling guards closed IPC. A first partial A run was interrupted for the final grader refinement; its version 1 freeze/partial evidence remains ignored and is excluded from the eight matched version 2trials. An initial static-module fixture404 was corrected with matched shared dependency links without changing protected tests.

The initial reviewer was fresh-context and read-only; later repair checks were contextual rechecks. This is technical evidence and model review, not independent human preference or usability evidence. No private variant coverage percentage is claimed.

## Recommendation and concrete next patch

Minimal candidate B: adapt `.local/memory-candidates/B/src/house-store.ts` into canonical `src/house-store.ts` only after parent selection. It adds a bounded per-instance constant-SQL StatementSync map, executes every read/write with current parameters and clears references on close/startup failure. Schema, receipts, row authorization, expiry, membership, room access and all realtime generation/delivery fences stay as measured. Keep the SQL key set fixed/bounded when adding future queries.

C is an optional further CPU repair using `.local/memory-candidates/C/src/house-store.ts` and `src/house-realtime.ts`, with the seeded-content promotion regression carried into maintained tests. If selected, give lightweight metadata an explicit internal type so it cannot accidentally masquerade as a complete durable snapshot. Do not attribute its bundled gain to one path without a separate future comparison.

After selecting/integrating a candidate, parent must run actual required project checks/review and the unchanged full 1800-second L1 and L2 acceptance workloads before changing their status. If B fails sustained RSS, C remains a measured next alternative; neither is an automatic accepted fallback. Do not change Fly shape or adopt D to claim acceptance.

## Retained provenance and use

Sanitized report/protocol/instrument are the only task-owned committable artifacts. Candidate modules, test copies, freeze manifests, raw logs/databases/synthetic tokens/identities, memory series and per-run JSON remain ignored under `.local/memory-candidates`. No production credentials or data were read; no heap dump was taken. `matched-summary.json` indexes all eight results and full source hashes.

Reproduction requires the retained frozen copies and freeze.json; the instrument rejects changed candidate, protocol or instrument hashes. Example from the repository: `mise exec -- node tools/house-memory-profile.mjs --variant B --repetition 1 --config L2 --duration 100 --port 4106`. Fresh source requires a newly declared protocol/copy/freeze, rather than silently reusing these identities.

| Frozen source | A/D SHA256 | B SHA256 | C SHA256 |
| --- | --- | --- | --- |
| src/server.ts | `ed5fc67218b8c183b48e38969219cb26107198fad9c24aad3055c28a212dd781` | same as A | same as A |
| src/house-store.ts | `935493406f732360387e3a531c8515518a99f5300f3e55ae32a874787b2a0128` | `045dd7f308ad94c0a574158fa7eb0c8cd4942d00ff4f41629407c3477ded7e51` | `02314006c0fdc3cb4a111735bf81e8735e67f24b7962006ec35a502e428569a0` |
| src/house-realtime.ts | `0a3823c4dfc62e77aa52206c6d260d47f3367f5f6bfacfaa8cd16ae8c0beb995` | same as A | `33b6ecd4d2c1f1ecea53b882d4f15309efb858e2b8b2f8880f0810845a9b31d9` |
| src/house-contract.ts | `d7eb13fdd434f15359a47bf371ac58f6a92d31ae5258a6c33ba30b723087bdf1` | same as A | same as A |
| src/store.ts | `88233c71b2f88437f4cb23923a67271283e4a63a32e9dd4859b53c90a15e63e1` | same as A | same as A |
| src/domain.ts | `9bd3f8f6720bea86f370d13e6435def6470c5bed140c210ad3f65c233a7b0d1b` | same as A | same as A |
| public/house-geometry.js | `7dc28ad3eae9c8874c6ae9cb352d38ecc94f3630f8426a85d4e5b57c1544dc53` | same as A | same as A |
| pnpm-lock.yaml | `dc7ab3eb2935e4fc45a8674c3c34e72563384eb01d2cfb895527771ecfeae0c6` | same as A | same as A |

Preserved original result hashes: L1 `2c32e85e1dfab420e52da9775e66b41d87797a18cc312fc00f56b2a7a52709ff`; L2 `172de8e62e38ffc9f22d7a11a47b5b3efa99c90530cf11ed28e37d98cb3ff089`. Their status remains FAIL.

## Parent selection and canonical integration

Parent inspected the Bdiff: boundedprivateconstant-SQL StatementSync reuse only;
no row/result cache, environment change or authority projection change. Chose B
for smaller integration risk and measured preparation/CPU reduction. Canonical
regression first observed650nativepreparations for100 warmedviewer snapshots+
sessionchecks versusdeclared<8. B integration preserves freshpermissions/profile
reads and closes cachedplans with theDB. Affectedchecks and fullnewL1/L2remain
required; no sustainedPASS claimed from short results.
