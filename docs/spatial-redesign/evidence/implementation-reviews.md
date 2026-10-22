# Fresh implementation reviews and parent reconciliation

23October2026. All three initial implementation reviewers started without the
previous chat, received factual goals/contracts and source boundaries, and were
read-only. They were not user A/B trials. Review completion is not blanket product
acceptance. Source may change after a finding; repairs and rechecks follow below.

| Boundary / reviewer | Findings checked by parent | Refinement / current verification |
| --- | --- | --- |
| Seat and command authority, Astra max | Stand called maintenance-coupled snapshot before releasing; receipt replay also called maintenance before UUID lookup. HTTP fresh Join captured no originating access/seat epoch. | Source paths independently inspected. Seat executor adds earliest-dependency/realSQLite fault regressions; HTTP held-body tests reproduce both reconnect/reseat ABA with200 responses. Repairs in progress. |
| Studio ownership/storage/codec and ingress, Astra max | No confirmed P1/P2 security/storage finding in reviewed snapshot. API doc named wrong POST path. | Parent corrected path to /api/house/studio/command. Reviewer64/64codec/store and1roomauthority testpassed. NewHTTPepochguards, load and finalbrowser are outside that review snapshot. |
| Studio and whole-house UI, Astra high | Cancelled chunk timeout recreated uncertain pending; Cancel duringcommit claimed rollback; rapid presenter zoomlostnewsavedview; validzero coordinate becamecenter. | Parent traced source; studio and gathering executors assigned deferred-response RED/GREEN repairs. ActualIABroute/create/seat/Join inspected separately. |

Pending: gathering authority review, repair reruns, contextual recheck, final
cross-module/browser/resource verification and source-bound acceptance. No row
here equates passed module tests to human usefulness or listening quality.


Contextual UI recheck (same reviewer, not another fresh trial) inspected the
cancellation and coalescing repairs and ran46studioUI+17gatheringUI tests:63/63
passed. It confirmed all four original UI findings resolved in that snapshot.
The new room-thumbnail controller and final native/device checks were outside it.


Seat contextual follow-up confirmed the maintenance/epoch repairs in10targeted
regressions, then reproduced a separate held-writer reservation despite readable
receipts. The executor reproduced it for both ingress paths and changed exactly
four pure read transactions to deferred BEGIN. Final165focused tests and typecheck
passed. A final source-only contextual recheck confirmed those callbacks contain
only reads/pure projections, with all effects and receipt insertion still IMMEDIATE.
No unresolved finding remains within that seat review scope.

Gathering contextual recheck ran48tests and closed failed withdrawal, coalescing,
zero-coordinate and epoch issues. Bounded retired epochs and active member renewal
were inspected; global saturation/load remained outside that module review.

The later recovery-navigation review found automatic outbox replay/data loss and
missing chair ACK state despite mocked UI tests passing. That separate repair is
in progress, with real-client regression required. The source-bound room/sofa/study
native evidence precedes that pending-only repair and keeps its actual hashes.

## Current closure after the recovery review

The recovery lane repaired all three independently checked findings: selected intent
is held across the real subscribe/automatic flush; seat denial retains its payload;
and pending return requires an explicit current seat ACK. A subsequent real-service
regression exposed ordinary generation advancement during room arrival. The journey
now adopts only the intended matching subscribe ACK and clears stale routes on
identity/authority failure. Contextual review closed the three findings. Final-source
native cases verify explicit Retry and SQLite receipt counts, including inert
historical replay while standing. See native-recovery-verification.md.

Required check #3 passes64files/1,364tests with unchanged source. Earlier7-suite
failures and later fixture assumptions remain recorded; no test was skipped to
accept a changed behavior. Current browser/resource/final integrated review gates
remain separate. In particular the mixed bootstrap215.2695MiB violates210MiB;
this is retained CALIBRATION failure, not an accepted hosting result.

The final integrated place review identified two additional sofa UX defects after
those module closures: losing a presenter discarded the visible crop, and touch
users had no off-center pan. Parent checked source and assigned focused visible-
transform/claim and touch-control regressions. See integrated-places-review.md.
This reopens only the affected sofa continuity/native acceptance scope.

The six-browser contextual review's absent-avatar-selector finding was withdrawn:
`syncPlayers` adds the class and identity data at runtime. Actual production-DOM
calibration observes all six original aliases; the structural display-name mapping
is a robustness refinement. Parent checked the update path independently. The
review record preserves the factual correction rather than crediting a false bug.
