# Authorised implementation, 6 October 2026

The owner authorised phase-by-phase implementation of the root PLAN, logical local
commits, harness review, fresh independent reviews, meaningful tests and refinement.
All project artifacts live in Ubuntu WSL at
/home/lizhi/comp4020/comp4020-final-naaeeen. The Windows directory coordinates tools.

Active goal: deliver the complete S1-S4 local core house, preserving the frozen
Crit8 tag and its existing data. A new release must be a concrete tested candidate.
The owner has not supplied human participants or physical-phone observations;
these remain explicit follow-up gates, not fabricated agent results.

Integration contract: src/house-contract.ts. Separate house.sqlite and house_session
is an additive migration: legacy neighbourhood.sqlite and night_session continue
unchanged. Public C8 neighbours do not silently become private members. A deliberate
own-data import can follow verified identity linkage; it is not assumed.

Initial reliable updates use authorised bounded zone snapshots with persisted
per-zone sequences; avatar motion is volatile and transient. A reconnect obtains a
fresh snapshot, rather than claiming Socket.IO delivery is durable. This is a
deliberate simpler implementation of the planned single-authority contract. Private
snapshots include access generations; revocation clears state before any re-grant.

Acceptance: real independent browser identities create/join, control and recognise
moving avatars, converse, sit, visit only allowed rooms, make bounded DIY changes,
save an author-controlled question/next step, return after reload/restart, and
exercise recovery/departure/removal/export. Check permanent capacity, UUID receipts,
stale revisions/generations, seat races, permission revocation and safe text. Verify
1920x1080 and390x844 actual DOM viewports, keyboard/touch and typing isolation.
Record tests, independent findings, parent reconciliation and commit IDs per phase.
Keep fixed Fly machine/volume; production load/device/user tests are separate gates.

Parallel ownership will be recorded here before worker mutations. The parent owns
contracts, integration, package/CI changes, evidence and final acceptance. Workers
preserve others and do not commit or publish independently.

Parallel paths: house_store owns house-store.ts/spec; house_realtime owns adapter/client/spec; house_world owns world/geometry/spec. Parent owns HTTP, UI, CI and acceptance. Output English; evidence sources may use any language.

HTTP acceptance red phase: three tests failed against the unchanged C8 server (404 versus expected identity/create/module routes), 6 October2026. This is an observed behavioural failure, not an import error.

## Owner steering7October
FIRSTadaptA3harness/methodfiles; thenrevisit everyphase/section/subsection in detail
via docs/harness/REPORT.md and docs/revisit/REGISTER.md. LaterA3tasks must continually
return to these methods. Labelretrospective/newchecks. RuntimeL1/L2isfrozen/running
independently; no runtimebytechange under measurement.
