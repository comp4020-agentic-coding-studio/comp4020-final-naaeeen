# Review and refinement record

6–7 October 2026. Fresh reviewers received the brief and actual artifacts without
parent conversation history. Follow-up reviews retain their context and are
labelled rechecks. Model judgement is not user testing. Parent owns reconciliation.

| Observation before change | Parent/worker response | Evidence and limit |
| --- | --- | --- |
|8day-old chat remained visible/stored|7day read filter plus startup/write pruning;100message bound|Actual SQLite regressions; selected contract corrected |
|Closed bedroom placements exposed aggregate revision at unchanged lounge cursor|Remove private revision from shared resident projection; bump lounge only for door permission change|Private-edit projection invariant and reviewer recheck |
|Queued lounge/departure command could target a later house|Freeze houseId at command creation, receipt and outbox; reject new effects in another house|Cross-house domain/client regression |
|Closed-door subscription cleared live state and rejected future lounge updates|Bounded fresh authorised lounge fallback on denial|Actual client reproduction then regression; browser denied visit remains to verify |
|Successful ACK replaced typing made while pending|Version the local draft; clear/replace only the submitted version|Reviewer actual UI reproduction;3DOM regression checks with mocked transport |
|Departure/export and removed-member recovery unavailable from lobby|Expose private export/recovery in lobby; refresh Me after revoked/disconnected membership|DOM regression; browser lifecycle task pending |
|Valid furniture trapped a visitor or left a moved chair occupied|Reconcile all affected leases, stand/reset clear entrance, advance control generation|Real WebSocket regression; authority double disclosed |
|DYI rebuild erased visible avatars until another event|Repopulate only currently authorised avatars synchronously on rebuild|Independent renderer-source/real-geometry repro1/0/0 ->1/1/1; revocation remains0 |
|Canvas not focusable after availability radio|Focusable canvas; explicit Dpad intent focuses it; fields/IME retain suppression|Actual keyboard/chat/return browser task |
|Route steps overshot nearby waypoints|Clamp each stride to remaining route distance|Actual room task reaches destination |
|Mobile movement target35px|44pxnative targets and adjusted HUD width|Touch browser verification pending |
|Six-person door label behind topHUD|Measured camera/frustum fit and compact phone labels|1920×1080 /390×844 native screenshots; reviewer visually rechecked |
|Bounded Unicode state exceeded64KiBoutbound ceiling|512KiBencoded ceiling with bounded queues; motion separate from durable snapshots|Actual socket disconnect reproduction then valid full-fixture delivery |
|Failed house startup left legacy DB handles open|Close legacy Store when HouseStore constructor rejects|Actual /proc/self/fd red then green |
|Walking speed varied with render rate|Use bounded elapsed-time physics with collision substeps; clear inputs on hide|Actual module0.52vs2.6 red; equality green; browser timing pending |

Test harness corrections also matter: a nested select's label text included option
text; role locators were checked against actual DOM, and active labels later gained
explicit for/id. A fixed-position wrapper had no visible box while its controls
were visible; readiness now checks the actual controls/canvas. A15second timeout
was initially called a stale room label, but its screenshot showed arrival just
after expiry. That diagnosis was withdrawn. Foreground the actively controlled
page and retain elapsed timing; do not silently call slow software-rendered use
pleasant.

Focused local commits so far:53a03b4(shared contract/harness/dependencies),
a7f596a(durable authority/geometry). Later integrated commit IDs belong here only
after the actual commits exist. No failed run, timing limitation or review disagreement
is replaced by an invented pass.

## Final reviewed candidate and reconciled evidence

The local core is `ea60440`; maintained browser/CI checks are `5548bb1`; sustained
workloads and preserved grader/source/results are `2c120a1`. Current required
checks passed 195 tests and typecheck. Expanded scope passed 163 cases, exposing
77.47% aggregate branch coverage rather than omitting UI/world/server surfaces.
Nineteen maintained native cases passed across distinct scoped runs.

Granular review/refinement records: [UI](../revisit/UI-REFINEMENT.md),
[outbox](../revisit/OUTBOX-REFINEMENT.md), [world](../revisit/WORLD-READABILITY.md),
[camera](CAMERA-EVIDENCE.md), [CI](CI-VERIFICATION.md), [load](../revisit/LOAD-PACING-REFINEMENT.md).
Fresh initial reviews and contextual rechecks are different events. Final
independent-from-author contextual UI/client review checked 73 cases and actual
late-ACK replay, with one UUID and one durable effect. Identity-proof fences,
captured-actor requests, key serialization and uncertain-send retention address
the four reproduced follow-up defects. No additional assigned-scope defect remained.

An independent fresh documentation review checked current code, official course
requirements and the four course/process/release documents. A separate final
consistency review parsed actual result JSON and hashes. It found stale register
statuses and an old label-test hash presented as current; these were corrected
and historical evidence was qualified. The production camera modules remain
matched. Exact older test bytes are not preserved, so their change is not assumed.

Parent source checks matched both full results to twelve current files plus the
exact archived measured grader. The current grader differs only by one portable
fixture-path literal after freeze release; fourteen controls passed again. Both
full gates passed; earlier failures and slow samples stay visible. No full rerun
was performed to increase a count.

The final records preserve unresolved busy-host startup causes, coverage gaps,
Docker/Fly/WAN and physical-phone checks, real-friend value/next-day study and
student-authored reflections. Review agreement does not substitute for those
observations. Read [VALIDATION](VALIDATION.md) and the [register](../revisit/REGISTER.md).
