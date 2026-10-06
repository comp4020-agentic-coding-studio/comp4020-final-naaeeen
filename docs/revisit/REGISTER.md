# Detailed A3 revisit register

7October2026. Owner-required capability-by-capability revisit after adapting the
active harness. This is retrospective for implemented work, followed by fresh
checks/refinements where necessary. No row is accepted from one overall phase PASS.

Read [REPORT](../harness/REPORT.md) and
[CHECKPOINT-TEMPLATE](../harness/CHECKPOINT-TEMPLATE.md) first. Each of the 43
subsections gets its own requirement, actual source/version, uncertainty/alternatives,
chosen comparison/check, normal/failure/concurrent/recovery paths, evidence, review,
parent reconciliation, changes and gap. Multiple targeted checks support a row.

| ID | Phase / section | Subsection | Goal / invariant | Specific paths and decisions | Status |
| --- | --- | --- | --- | --- | --- |
| S0.P1 | S0 / Purpose | Specific peer goal and target | Find a familiar willing peer and choose a next step. | Hypothesis; episodes; baseline Discord. | PENDING detailed revisit |
| S0.P2 | S0 / Positioning | Alternatives and selling point | Earn the extra spatial interaction cost. | Configured Discord, co-study, peer-help house; novelty. | PENDING detailed revisit |
| S0.P3 | S0 / Scope | Feasibility and core cut line | Preserve core quality within a bounded budget. | Enhancements; estimates; dependencies; pivots. | PENDING detailed revisit |
| S1.I1a | S1 / I1 | Cookie identity/profile | Return as the same recognisable person. | Tokens/digests/expiry; names/colours; duplicate cookies. | PENDING detailed revisit |
| S1.I1b | S1 / I1 | Code/admission | Create/join one whole2–6person house safely. | Entropy/collisions; full house; last-slot races; limits. | PENDING detailed revisit |
| S1.I1c | S1 / I1 | Membership/bedrooms | Offline friends keep stable rooms. | One home; slots/doors; create/join/rejoin; tabs. | PENDING detailed revisit |
| S1.I2a | S1 / I2 | Durable authority/receipts | Saved means one committed effect. | Atomic state/receipt/cursor; UUID reuse; house binding. | PENDING detailed revisit |
| S1.I2b | S1 / I2 | Snapshots/streams | Share current state without private leakage. | Private revisions; cursors; epochs/access generations. | PENDING detailed revisit |
| S1.I2c | S1 / I2 | Presence/movement transport | Show actual connected people and same-zone actions. | Per-action/delivery auth; volatile motion; disconnect. | PENDING detailed revisit |
| S1.I2d | S1 / I2 | Chat/outbox | Attribute conversation and recover uncertain sends. | Zone/house binding; retries; retention; slow readers. | PENDING detailed revisit |
| S1.I3a | S1 / I3 | Layouts/routes/collision | Reach every door/seat/board at every capacity. | Templates; circle/AABB; connectors; tunnelling. | PENDING detailed revisit |
| S1.I3b | S1 / I3 | Avatar/animation/prediction | Movement and remote actions reflect real state. | Prediction; interpolation; pose; renderer lifecycle. | PENDING detailed revisit |
| S1.I3c | S1 / I3 | Keyboard/touch/IME | Control without typing moving the avatar. | Focus/blur/visibility; Dpad; targets; reduced motion. | PENDING detailed revisit |
| S1.I5a | S1 / I5 | Lobby/feedback | Understand admission and saved return. | Validation; errors; uncertainACK; coldstart/readiness. | PENDING detailed revisit |
| S1.I5b | S1 / I5 | HUD/camera/labels | World leads and people/doors remain readable. | Viewports; overlapping labels/bubbles; framing/cost. | PENDING detailed revisit |
| S1.I6a | S1 / I6 | Integrated invite task | Two browsers meet/move/chat/return. | Native UI; real SQLite/server; console; actual version. | PENDING detailed revisit |
| S2.I1d | S2 / I1 | Recovery | Recover a full-house identity without another slot. | One-use proof; rotation/revocation; failed recovery. | PENDING detailed revisit |
| S2.I1e | S2 / I1 | Transfer/remove/reinstate | Membership changes preserve coherent ownership. | Transfer; code rotation; guards; admin pagination. | PENDING detailed revisit |
| S2.I1f | S2 / I1 | Leave/archive/export | Retrieve original private work after leaving. | Last resident; transfer prerequisite; own-only export. | PENDING detailed revisit |
| S2.I2e | S2 / I2 | Takeover/observer | One identity has one moving avatar. | Generations/tokens; old inputs; observer scope. | PENDING detailed revisit |
| S2.I2f | S2 / I2 | Room access/revocation | Visit allowed rooms and leave on closure. | Closed default; push/read; stale response; denial fallback. | PENDING detailed revisit |
| S2.I2g | S2 / I2 | Seats/leases | Sit with one occupant and no ghost claim. | Races; reconnect; takeover/zone/removal/expiry/restart. | PENDING detailed revisit |
| S2.I3d | S2 / I3 | Dynamic geometry | DIY cannot trap visitors or retain old seat poses. | Moved/removed/rotated chairs; clear entrance reset. | PENDING detailed revisit |
| S2.I3e | S2 / I3 | Contextual walks/transitions | Approach/enter/return continuously. | BFS stride; proximity; open/closed/vacant; slow frames. | PENDING detailed revisit |
| S2.I5c | S2 / I5 | Bounded DIY | Make a recognisable saved room. | Palette; add/move/rotate/remove; preview; revision/draft. | PENDING detailed revisit |
| S2.I5d | S2 / I5 | Quiet/Can chat | Willingness differs from connection/privacy. | Defaults; retreat; last-set time; quiet/loungeligibility. | PENDING detailed revisit |
| S2.I6b | S2 / I6 | Scene performance/usability | Remain playable on target devices. | Elapsed-time speed; GPU/device/2Dswitch evidence. | PENDING detailed revisit |
| S3.I4a | S3 / I4 | Useful shared card | Support conversation and a useful next step. | Card versus canvas; optional help/resource; no forcedtask. | PENDING detailed revisit |
| S3.I4b | S3 / I4 | Authorship/conflicts/drafts | Independent and newer work survives. | Per-card revisions; ACKtyping; explicitclose; ownerguards. | PENDING detailed revisit |
| S3.I4c | S3 / I4 | Card lifecycle/retention | Departure never falsely solves or evicts active work. | Oneactive;12inactive; ownerLeft; archive/trim transaction. | PENDING detailed revisit |
| S3.I5e | S3 / I5 | Text/links/readability | Conversation/resources stay readable and safe. | Escaping; HTTPS; nofetch; bubbles/history/retention. | PENDING detailed revisit |
| S3.I6c | S3 / I6 | Peer-help/next-day task | Retrieve the author's next step and assess value. | UI/restart versus human next-day; baseline trial. | PENDING detailed revisit |
| S4.I6d | S4 / I6 | Migration/backup/restore | Protect oldC8 and new saved work. | Additive schema; WAL; unknownversion; initcleanup. | PENDING detailed revisit |
| S4.I6e | S4 / I6 | Races/grader calibration | Checks accept good and reject plausible bad outcomes. | Process exercise; falsePASS; scope/hash; infrastructure. | PENDING detailed revisit |
| S4.I6f | S4 / I6 | Load/slow readers/resources | Hold fixed budget under exact12view workloads. | L1/L2;10Hz;180intents;30min; readers/queues/RSS. | PENDING detailed revisit |
| S4.I6g | S4 / I6 | Semantic instruments | Trace actions without exposing private content. | Start/stop; rooms/cards/seats/lifecycle; blind demo. | PENDING detailed revisit |
| S4.I6h | S4 / I6 | Checks/coverage/browser/CI | Maintain actual core verification. | Native commands; coverage scopes; images; CI/local. | PENDING detailed revisit |
| S4.I6i | S4 / I6 | Release/production | Publish a verified candidate retaining work. | Origin/cookie/CSP; Flyshape; secrets; restart/rollback. | PENDING detailed revisit |
| S4.I6j | S4 / I6 | Maintenance/content growth | Extend without breaking saved rooms. | Dependencies; catalogue/template IDs; migrations/modules. | PENDING detailed revisit |
| S4.I6k | S4 / I6 | Evidence/understanding | Make the argument and process inspectable. | README/harness/spec; commits; reflections; claimlimits. | PENDING detailed revisit |
| S4.H1 | S4 / Harness | Active A3 methods/loading | Later tasks repeatedly apply relevant guidance. | REPORT/provenance; freshreview; cadence; loadassumptions. | PENDING detailed revisit |
| S4.H2 | S4 / Harness | Comparison/review validity | Use appropriate evidence for each decision. | Technical/design/agent/human; masking; reviewerlimits. | PENDING detailed revisit |
| S4.H3 | S4 / Harness | Coordination/continuation | Proceed with bounded work and useful handoffs. | Ownership; hold/freeze/release; commits/checkpoints. | PENDING detailed revisit |

## Execution and evidence

Bounded fresh-context read-only reviewers receive current brief/source/rubric
without earlier verdicts or parent preferences. They separately attribute findings
and evidence to every assigned subsection. Parent verifies, writes detailed phase
records and updates statuses. Old evidence is an input; new review cannot relabel
it as a new execution. Declare criteria before a new comparison.

Statuses: PENDING; REVIEWED WITH GAPS; ACCEPTED LOCAL; NEEDS CHANGE; HUMAN NOT RUN;
DEPLOYMENT NOT RUN; ABORTED. Distinguish runtime acceptance from user value.

Frozen L1/L2runtime measurement runs independently; documentation/harness audits
continue without changing its bytes. A material runtime finding requires an
explicit repeat/pause decision, never silent changes beneath the benchmark.
