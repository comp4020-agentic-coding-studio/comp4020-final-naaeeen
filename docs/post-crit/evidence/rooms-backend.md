# P2 room backend foundation

22 October 2026. Local implementation based on `8cdad6a`, on
`post-crit-improvements`. This is a backend/content checkpoint, not P2 UX
acceptance. Exact source identities and check summaries are in
[rooms-backend-checks.json](rooms-backend-checks.json). No provider, deployment,
push, commit, frontend reducer or shared geometry edit was performed by this worker.

## Requirement, evidence and decision

| Subsection | Requirement and observed baseline | Decision and verification |
| --- | --- | --- |
| Native persistence | v1 has no room light/origin columns and rejects later versions. Existing rooms may be customized or deliberately empty. | Add three columns transactionally; light defaults to `standard`, origin fields to null. Native v1 fixtures preserve custom/empty/archived rooms, serialized archive JSON and receipt responses, three card states, sessions and cursors through three startups. An injected native DDL failure rolls back version/columns/data; retry succeeds. Future version17 is rejected without logical-data changes. |
| Allocation/content | New rooms previously received empty placements. The reviewed contract fixes six slot-specific version1 catalogues using the existing six kinds. | Frozen stable preset IDs/item keys instantiate fresh persisted UUIDs once. Six curated layouts contain5–8 pieces and each includes bed/desk/chair/lamp. Duplicate create/join and restart preserve allocations. Existing rooms are never backfilled. |
| Starter/light authority | Existing room commands already share owner/access/revision and durable receipt rules. | Reuse that authority: `room.starter` replaces placements/palette/light/origin while retaining door state; `room.light` updates only light/revision. Reject stale, foreign-house, cross-owner and unsupported fields/values. Duplicate receipts return the same result; failed receipt insertion rolls back room/cursor and permits one successful retry. Old payloads remain valid and retain origin/light. New exports/archives include settings; old archive JSON is unchanged. |
| Useful routes | Geometry validation protects the spawn/exit aperture and authoritative chair approaches; actual server arrivals use a slot/capacity band at z3.3. | All six presets pass existing collision validation and routes from every exact server arrival-band coordinate at capacities2–6 to exit, chair approach and shared pure desk/lamp targets. These are source-bound geometry checks, not a native browser trial or human comfort finding. Chair/bed/footprint semantics are unchanged. |
| Own work | Bedroom `cards` is deliberately empty; card mutations advance the lounge cursor. | Query only the authenticated identity's active card plus lounge cursor inside the same snapshot transaction. Native SQLite with actual Socket.IO verifies create/close/new delivery while in a bedroom, self-only projection, empty bedroom cards and unchanged bedroom cursor. Existing queueRefresh already supplies this delivery path. |
| Transport boundaries | Existing controller/access/zone checks precede durable commands. | Extend the room zone allowlist for starter/light. Actual native store/socket tests cover observer, visitor ownership, wrong room, stale revision, controller takeover and HTTP wrong-zone/stale-generation rejection. |
| Query/resource boundary | Native statement cache is bounded at96 constant plans. | One exercised room/card/recovery/membership lifecycle prepares57 distinct constant SQL plans; repeated reads with varying bound values add none. Keep cap96. This is query-catalogue evidence, not RSS/load acceptance. |

The reviewed contract fixes the principal persistence and replacement choices.
Reusing existing authority avoids a second task database, alternate receipts or
new room command semantics. Focused failure/compatibility checks were used here;
no fabricated A/B preference result is claimed.

## Checks and refinements

- First behavioral red run:5/5 failed for missing preset allocation, room command
  types and ownWork. Corrected native v1 fixture run:2 expected migration failures
  and1 existing future-version rejection pass. Two earlier fixture-construction
  attempts had placeholder-count mistakes; they were infrastructure/test defects,
  not product regressions.
- Final scoped coverage run:92 tests in5 files pass. Store lines99.31%,
  statements96.10%, branches95.01%; room-content lines94.73%, branches100%;
  realtime lines94.62%, statements86.40%, branches79.87%. Aggregate three-source
  branches87.63%. Realtime whole-file branch coverage remains just below80%.
- Typecheck passed after the contract and owned realtime fixture update, before
  final test-only receipt-rollback/catalogue additions. Parent final integrated
  typecheck remains required.
- Coverage began at reported01:01:29 and ended about01:01:38, possibly overlapping
  the parent's camera lane. Its9.23s duration is execution metadata, not comparison
  or performance evidence. Broader work stopped when the parent froze timing.
- Read-only migration audit independently verified a prototype-level native DDL
  exception can exercise rollback without adding production test hooks.
- Self-review inspected the owned diff. Fresh implementation review remains open
  for the parent's combined backend/client review. Source was frozen for that
  review after this checkpoint.

## Remaining integration and acceptance

The renderer/client still need to consume the new module/settings and merge
ownWork with its separate high-water mark. Desk/My work/lamp controls, starter
preview/confirmation, ordinary discovery, unsaved draft behavior and server asset
reachability belong to parent/UI integration. No complete P2 journey is claimed.

Native browser, physical-phone, human preference/value and sustained/combined
resource trials were not run here. Legacy `standard` is the persistence contract;
matching legacy rendered illumination is a later renderer check. Route unit checks
use the exact authority arrival formula; full browser interaction/comfort and
occupied six-person circulation remain separate gates. No old release acceptance
was inherited.


## Fresh review: Rose desk orientation

A fresh GPT-6 Astra review, delivered by the parent, found that Rose's desk faces
away from its chair. The renderer's monitor accent faces local +Z, transformed
by the placement's world Y rotation. At rotation1, Rose's chair-side dot product
is-1.5; the other five preset pairs are+1.5. The parent independently confirmed
the source geometry before authorizing this narrow refinement.

A new assertion covers desk front-side and authoritative seated heading for every
preset. The filtered red run failed only Rose, with5 passes and31 cases excluded
by the name filter. Changing only Rose's desk rotation1→3 yields+1.5 and retains
the same1-by-2 footprint. No chair renderer, database, command, position or legacy
room change was made. This is a correction before the initial template release,
so existing saved placements remain untouched rather than being reseeded.

The single-worker affected run passes70 tests in4 files: all37 content cases
(including all six orientation pairs and all30 preset/capacity route cases),
23 store,7 settings and3 native migration cases. No coverage, browser or load run
was repeated. The initial92-test coverage record and original hashes remain
unchanged as historical evidence; they do not claim coverage of the corrected
content bytes. Exact final hashes, commands and results are in
[the refinement packet](rooms-backend-orientation-refinement.json).
The parent's contextual review and final integrated typecheck remain pending.
