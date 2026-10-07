# Detailed A3 revisit register

7 October 2026. Owner-required capability-by-capability revisit after adapting the
active harness. This is retrospective for implemented work, followed by fresh
checks/refinements where necessary. No row is accepted from one overall phase PASS.

Read [REPORT](../harness/REPORT.md) and
[CHECKPOINT-TEMPLATE](../harness/CHECKPOINT-TEMPLATE.md) first. Each of the 43
subsections gets its own requirement, actual source/version, uncertainty/alternatives,
chosen comparison/check, normal/failure/concurrent/recovery paths, evidence, review,
parent reconciliation, changes and gap. Multiple targeted checks support a row.

| ID | Phase / section | Subsection | Goal / invariant | Specific paths and decisions | Status |
| --- | --- | --- | --- | --- | --- |
| S0.P1 | S0 / Purpose | Specific peer goal and target | Find a familiar willing peer and choose a next step. | Hypothesis; episodes; baseline Discord. | HUMAN NOT RUN; purpose audited; [detail](S0-S1-DETAILED.md#s0p1-specific-goal-and-target) |
| S0.P2 | S0 / Positioning | Alternatives and selling point | Earn the extra spatial interaction cost. | Configured Discord, co-study, peer-help house; novelty. | REVIEWED WITH GAPS; human baseline NOT RUN; [detail](S0-S1-DETAILED.md#s0p2-alternatives-and-selling-point) |
| S0.P3 | S0 / Scope | Feasibility and core cut line | Preserve core quality within a bounded budget. | Enhancements; estimates; dependencies; pivots. | REVIEWED WITH GAPS; scope/budget provisional; [detail](S0-S1-DETAILED.md#s0p3-feasibility-and-cut-line) |
| S1.I1a | S1 / I1 | Cookie identity/profile | Return as the same recognisable person. | Tokens/digests/expiry; names/colours; duplicate cookies. | REVIEWED WITH GAPS; local identity checks accepted; [detail](S0-S1-DETAILED.md#s1i1a-cookie-identity-and-profile) |
| S1.I1b | S1 / I1 | Code/admission | Create or join a complete house for 2–6 people safely. | Entropy/collisions; full house; last-slot races; limits. | ACCEPTED LOCAL authority and native admission/recovery; [detail](S0-S1-DETAILED.md#s1i1b-code-and-admission) |
| S1.I1c | S1 / I1 | Membership/bedrooms | Offline friends keep stable rooms. | One home; slots/doors; create/join/rejoin; tabs. | REVIEWED WITH GAPS; stable membership checks accepted; [detail](S0-S1-DETAILED.md#s1i1c-permanent-membership-and-bedrooms) |
| S1.I2a | S1 / I2 | Durable authority/receipts | Saved means one committed effect. | Atomic state/receipt/cursor; UUID reuse; house binding. | ACCEPTED LOCAL transactional authority; [detail](S0-S1-DETAILED.md#s1i2a-durable-authority-and-receipts) |
| S1.I2b | S1 / I2 | Snapshots/streams | Share current state without private leakage. | Private revisions; cursors; epochs/access generations. | REVIEWED WITH GAPS; fresh boundaries checked; [detail](S0-S1-DETAILED.md#s1i2b-snapshots-and-stream-boundaries) |
| S1.I2c | S1 / I2 | Presence/movement transport | Show actual connected people and same-zone actions. | Per-action/delivery auth; volatile motion; disconnect. | ACCEPTED LOCAL movement/browser and full synthetic load; WAN NOT RUN; [detail](S0-S1-DETAILED.md#s1i2c-presence-and-movement-transport) |
| S1.I2d | S1 / I2 | Chat/outbox | Attribute conversation and recover uncertain sends. | Zone/house binding; retries; retention; slow readers. | ACCEPTED LOCAL; final independent-from-author replay one UUID/one effect; [detail](S0-S1-DETAILED.md#s1i2d-chat-and-pending-outbox) |
| S1.I3a | S1 / I3 | Layouts/routes/collision | Reach every door/seat/board at every capacity. | Templates; circle/AABB; connectors; tunnelling. | ACCEPTED LOCAL geometry and native camera/picking; [detail](S0-S1-DETAILED.md#s1i3a-layouts-routes-and-collision) |
| S1.I3b | S1 / I3 | Avatar/animation/prediction | Movement and remote actions reflect real state. | Prediction; interpolation; pose; renderer lifecycle. | ACCEPTED LOCAL animation/framing; physical feel NOT RUN; [detail](S0-S1-DETAILED.md#s1i3b-avatar-animation-and-prediction) |
| S1.I3c | S1 / I3 | Keyboard/touch/IME | Control without typing moving the avatar. | Focus/blur/visibility; Dpad; targets; reduced motion. | REVIEWED WITH GAPS; DEVICE/IME NOT RUN; [detail](S0-S1-DETAILED.md#s1i3c-keyboard-touch-and-ime) |
| S1.I5a | S1 / I5 | Lobby/feedback | Understand admission and saved return. | Validation; errors; uncertain ACK; cold-start readiness. | ACCEPTED LOCAL current flows; earlier busy-host failures retained; [detail](S0-S1-DETAILED.md#s1i5a-lobby-and-feedback) |
| S1.I5b | S1 / I5 | HUD/camera/labels | World leads and people/doors remain readable. | Viewports; overlapping labels/bubbles; framing/cost. | ACCEPTED LOCAL framing; HUMAN/DEVICE judgement NOT RUN; [detail](S0-S1-DETAILED.md#s1i5b-hud-camera-and-conversation-labels) |
| S1.I6a | S1 / I6 | Integrated invite task | Two browsers meet/move/chat/return. | Native UI; real SQLite/server; console; actual version. | ACCEPTED LOCAL current native invitation/return; [detail](S0-S1-DETAILED.md#s1i6a-integrated-invitation-task) |
| S2.I1d | S2 / I1 | Recovery | Recover a full-house identity without another slot. | One-use proof; rotation/revocation; failed recovery. | ACCEPTED LOCAL authority and native full-house recovery; [detail](S2-S3-DETAILED.md#s2i1d-identity-recovery) |
| S2.I1e | S2 / I1 | Transfer/remove/reinstate | Membership changes preserve coherent ownership. | Transfer; code rotation; guards; admin pagination. | REVIEWED WITH GAPS; admin UI fixed, native pending; [detail](S2-S3-DETAILED.md#s2i1e-transfer-removal-and-reinstatement); [later repair evidence](UI-REFINEMENT.md) |
| S2.I1f | S2 / I1 | Leave/archive/export | Retrieve original private work after leaving. | Last resident; transfer prerequisite; own-only export. | ACCEPTED LOCAL native own archive/departure; production NOT RUN; [detail](S2-S3-DETAILED.md#s2i1f-leave-archive-and-own-export) |
| S2.I2e | S2 / I2 | Takeover/observer | One identity has one moving avatar. | Generations/tokens; old inputs; observer scope. | ACCEPTED LOCAL native observer/takeover and one-avatar identity; [detail](S2-S3-DETAILED.md#s2i2e-controller-takeover-and-observer) |
| S2.I2f | S2 / I2 | Room access/revocation | Visit allowed rooms and leave on closure. | Closed default; push/read; stale response; denial fallback. | ACCEPTED LOCAL native permitted visit/revocation; WAN gaps disclosed; [detail](S2-S3-DETAILED.md#s2i2f-bedroom-access-and-revocation); [later repair evidence](UI-REFINEMENT.md) |
| S2.I2g | S2 / I2 | Seats/leases | Sit with one occupant and no ghost claim. | Races; reconnect; takeover/zone/removal/expiry/restart. | REVIEWED WITH GAPS; leases locally checked; [detail](S2-S3-DETAILED.md#s2i2g-seats-and-reconnect-leases) |
| S2.I3d | S2 / I3 | Dynamic geometry | DIY cannot trap visitors or retain old seat poses. | Moved/removed/rotated chairs; clear entrance reset. | REVIEWED WITH GAPS; dynamic variants pending; [detail](S2-S3-DETAILED.md#s2i3d-dynamic-geometry-and-occupants) |
| S2.I3e | S2 / I3 | Contextual walks/transitions | Approach/enter/return continuously. | BFS stride; proximity; open/closed/vacant; slow frames. | ACCEPTED LOCAL native walks/transitions; physical feel NOT RUN; [detail](S2-S3-DETAILED.md#s2i3e-walks-and-contextual-transitions) |
| S2.I5c | S2 / I5 | Bounded DIY | Make a recognisable saved room. | Palette; add/move/rotate/remove; preview; revision/draft. | ACCEPTED LOCAL native DIY/reload and reviewed draft barriers; [detail](S2-S3-DETAILED.md#s2i5c-meaningful-bounded-diy); [later repair evidence](UI-REFINEMENT.md) |
| S2.I5d | S2 / I5 | Quiet/Can chat | Willingness differs from connection/privacy. | Defaults; retreat; last-set time; Quiet/lounge eligibility. | REVIEWED WITH GAPS; HUMAN INTERPRETATION NOT RUN; [detail](S2-S3-DETAILED.md#s2i5d-quiet-can-chat-and-availability); [later repair evidence](UI-REFINEMENT.md) |
| S2.I6b | S2 / I6 | Scene performance/usability | Remain playable on target devices. | Elapsed-time speed; GPU/device/2D switch evidence. | REVIEWED WITH GAPS; physical GPU/phone NOT RUN; [detail](S2-S3-DETAILED.md#s2i6b-scene-performance-and-devices) |
| S3.I4a | S3 / I4 | Useful shared card | Support conversation and a useful next step. | Card versus canvas; optional help/resource; no forced task. | REVIEWED WITH GAPS; HUMAN VALUE NOT RUN; [detail](S2-S3-DETAILED.md#s3i4a-useful-shared-card) |
| S3.I4b | S3 / I4 | Authorship/conflicts/drafts | Independent and newer work survives. | Per-card revisions; ACK during typing; explicit close; owner guards. | ACCEPTED LOCAL author/draft semantics; adversarial WAN gap; [detail](S2-S3-DETAILED.md#s3i4b-authorship-conflicts-and-newer-drafts); [later repair evidence](UI-REFINEMENT.md) |
| S3.I4c | S3 / I4 | Card lifecycle/retention | Departure never falsely solves or evicts active work. | One active; 12 inactive; ownerLeft; archive/trim transaction. | REVIEWED WITH GAPS; lifecycle authority checked; [detail](S2-S3-DETAILED.md#s3i4c-card-lifecycle-and-retention) |
| S3.I5e | S3 / I5 | Text/links/readability | Conversation/resources stay readable and safe. | Escaping; HTTPS; no fetch; bubbles/history/retention. | ACCEPTED LOCAL native literal text/glyph/frame bounds; [detail](S2-S3-DETAILED.md#s3i5e-literal-text-resources-and-readability); [later repair evidence](WORLD-READABILITY.md) |
| S3.I6c | S3 / I6 | Peer-help/next-day task | Retrieve the author's next step and assess value. | UI/restart versus human next-day; baseline trial. | HUMAN NEXT-DAY NOT RUN; local reload/operations verified; [detail](S2-S3-DETAILED.md#s3i6c-peer-help-and-next-day-loop) |
| S4.I6d | S4 / I6 | Migration/backup/restore | Protect old C8 data and new saved work. | Additive schema; WAL; unknown version; startup cleanup. | ACCEPTED LOCAL OPERATIONS; production NOT RUN; [detail](S4-DETAILED.md#s4i6d-migration-backup-and-restore) |
| S4.I6e | S4 / I6 | Races/grader calibration | Checks accept good and reject plausible bad outcomes. | Process exercise; false PASS; scope/hash; infrastructure. | REVIEWED WITH GAPS; evaluator corrections recorded; [detail](S4-DETAILED.md#s4i6e-races-and-evaluator-calibration) |
| S4.I6f | S4 / I6 | Load/slow readers/resources | Hold the fixed budget under exact twelve-view workloads. | L1/L2; 10 Hz; 180 intents per house; 30 minutes; readers/queues/RSS. | ACCEPTED LOCAL full L1/L2 PASS; Fly/WAN NOT RUN; [detail](S4-DETAILED.md#s4i6f-load-slow-readers-and-resource-bounds) |
| S4.I6g | S4 / I6 | Semantic instruments | Trace actions without exposing private content. | Start/stop; rooms/cards/seats/lifecycle; blind demo. | REVIEWED WITH GAPS; instruments-only demo NOT RUN; [detail](S4-DETAILED.md#s4i6g-semantic-instruments) |
| S4.I6h | S4 / I6 | Checks/coverage/browser/CI | Maintain actual core verification. | Native commands; coverage scopes; images; CI/local. | ACCEPTED LOCAL required/native/coverage checks; Docker/remote CI NOT RUN; [detail](S4-DETAILED.md#s4i6h-required-checks-coverage-browser-and-ci) |
| S4.I6i | S4 / I6 | Release/production | Publish a verified candidate retaining work. | Origin/cookie/CSP; Fly resource shape; secrets; restart/rollback. | DEPLOYMENT NOT RUN; local candidate and runbook prepared; [detail](S4-DETAILED.md#s4i6i-release-and-production) |
| S4.I6j | S4 / I6 | Maintenance/content growth | Extend without breaking saved rooms. | Dependencies; catalogue/template IDs; migrations/modules. | REVIEWED WITH GAPS; content/migration growth bounded; [detail](S4-DETAILED.md#s4i6j-maintenance-content-and-sustainable-growth) |
| S4.I6k | S4 / I6 | Evidence/understanding | Make the argument and process inspectable. | README/harness/spec; commits; reflections; claim limits. | ACCEPTED LOCAL evidence record; student explanation/reflections NOT RUN; [detail](S4-DETAILED.md#s4i6k-evidence-course-argument-and-understanding) |
| S4.H1 | S4 / Harness | Active A3 methods/loading | Later tasks repeatedly apply relevant guidance. | REPORT/provenance; fresh review; cadence; load assumptions. | ACCEPTED LOCAL GUIDANCE; efficacy NOT RUN; [detail](S4-DETAILED.md#s4h1-active-a3-methods-and-loading) |
| S4.H2 | S4 / Harness | Comparison/review validity | Use appropriate evidence for each decision. | Technical/design/agent/human; masking; reviewer limits. | ACCEPTED LOCAL comparison/review discipline; human studies NOT RUN; [detail](S4-DETAILED.md#s4h2-comparison-and-review-validity) |
| S4.H3 | S4 / Harness | Coordination/continuation | Proceed with bounded work and useful handoffs. | Ownership; hold/freeze/release; commits/checkpoints. | ACCEPTED LOCAL ownership, checkpoints and focused commits; [detail](S4-DETAILED.md#s4h3-coordination-continuation-and-checkpoints) |

## Execution and evidence

Bounded fresh-context read-only reviewers receive current brief/source/rubric
without earlier verdicts or parent preferences. They separately attribute findings
and evidence to every assigned subsection. Parent verifies, writes detailed phase
records and updates statuses. Old evidence is an input; new review cannot relabel
it as a new execution. Declare criteria before a new comparison.

Statuses: PENDING; REVIEWED WITH GAPS; ACCEPTED LOCAL; NEEDS CHANGE;
NEEDS ACCEPTANCE; HUMAN NOT RUN; DEPLOYMENT NOT RUN; ABORTED. Distinguish runtime
acceptance from user value.

The sequential full L1/L2 measurement is complete, with both local synthetic
configurations PASS. Recorded source bytes stayed fixed throughout. Any new
measurement needs a new declared candidate; post-measurement maintenance does not
retroactively change what ran.

Parent reconciliation, 7 October: all 43 rows have individual detailed records
and attributed statuses. Replacing PENDING is an audit-state update, not a blanket
runtime, human-value or deployment PASS. Current camera/browser/load evidence is linked below; historical findings remain
visible rather than being rewritten as current executions.

Some linked S2/S3 records retain the NEEDS CHANGE disposition of an earlier review.
Where this register records a later local repair, its additional repair-evidence
link identifies the newer source/checkpoint. Preserve those earlier findings and
read the later evidence together; REVIEWED WITH GAPS still leaves current native
integration and parent acceptance open. It does not rewrite historical checks.


Final parent reconciliation7October: accepted local rows bind to195required tests,
163expandedcoverage cases,19maintained native cases across scoped runs,final
contextual73client/UI recheck and exactfullL1/L2PASS. This does not override historical
failures in the linked records or imply human demand/preference,physical-phone
performance or deployed behavior. Current core ea60440;verification5548bb1.

## Closeout checkpoint

The local S1–S4 core and current evidence are accepted within the named scopes.
Residual REVIEWED WITH GAPS rows preserve specific device, dynamic-variant, human
and deployment uncertainties; they are not a request to repeat resolved lanes.
Current milestones are `ea60440`, `5548bb1` and `2c120a1`. The annotated frozen
tag is `crit-8`, peeled commit `6dc79c5`. Read the current handoff and validation
for source identities and planned external/student work.

## Active redesign after owner trial

The owner rejected the baseline interaction quality on 7 October. Current R0–R4
work uses [18 additional detailed checkpoints](REDESIGN-REGISTER.md); earlier
S0–S4 acceptance remains bound to its historical source. Changed UI, geometry,
camera and full board require their own current checks and reviews.
