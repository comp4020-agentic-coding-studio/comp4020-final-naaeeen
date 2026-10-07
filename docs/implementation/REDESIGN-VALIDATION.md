# R0–R4 local redesign validation

7 October 2026. This record covers the owner-tested redesign of the game title,
HUD/Options, spatial proportions/camera and full independent collaborative board.
The canonical workspace is Ubuntu/lizhi,
/home/lizhi/comp4020/comp4020-final-naaeeen, with mise Node24.21.0/pnpm11.9.0.
Local commits are authorised; no push, publication or deployment is performed.
Earlier S0–S4 and 30-minute workload results remain [historical](VALIDATION.md).

## Requirement, refinement and current evidence

| Boundary | Executed evidence and decision | Remaining closeout |
| --- | --- | --- |
| Game title/HUD/Options/chat | 64 scoped UI/shell checks, independent identities and native create/join/continue/input/DIY tasks. Options modal must not own world framing. Long-room header truncation preserves full accessible text and passes desktop/portrait non-overlap. | Final source/build gate |
| Larger authoritative world | Matched old/new same-actor geometry yields 90/90 routes and preserves saved transforms; lounge16x11 and bedroom14x10 support a ten-piece valid arrangement. | Human comfort/value remains unmeasured |
| Camera and posed avatar | Native initial15:12PASS/3FAIL; first strict repair:1PASS/2FAIL; final strict3PASS at390x844,844x390,390x520. Exact posed mesh, editor-return and visual-viewport defects were reproduced/repaired without weakening pixel criteria. | Physical phone/IME/soft keyboard NOT RUN |
| Independent board authority | 69 real authority/service/integration checks after valid large-bootstrap repair. Separate durable elements/tombstones/receipts/assets/chat and current membership/epoch guards. | Final complete required check |
| Full editor and recovery | 42 actual-module/helper checks plus native2D editor, image/text/undo/chat/export and full-house cold recovery. Failed-image adjacent-text loss, false Saved and real React185 callback loop were repaired/reviewed. | Maintained two-case board run |
| Three-database recovery | Actual createService/restart, scoped cache/frame policy, authenticated binary reads, quiescent WAL-aware backup and startup descriptor cleanup passed. Image bytes remain in board.sqlite BLOBs. | Mounted Fly volume/image entrypoint NOT RUN |
| Valid transcript and bounded output | Actual100x2000emoji transcript reproduced old512-KiB disconnect. 1-MiB frame/2-MiB queue, four packets and unchanged16-KiB inbound passed5 integration+22realtime cases and independent extracted controls. | New expanded-source resource exercise |
| Resource evaluator | Five actual-source controls pass after reflection, dropped deadlines/chat bursts and protocol-drift repairs; original failures are preserved. | Original300FAIL RSS301.305/early recovery flag; matched100s quota-only diagnostics retained; reviewed new300 candidate pending |
| Dependency/build provenance | Locked compatible React18.3.1/editor0.18.1/esbuild0.28.2; full audit/peer/lock checks pass. Generated editor assets ignored; self-hosted fonts/upstream licences included by build. | Final build plus source/artifact scan |

These are technical and native-browser observations. Synthetic identities are not
participants, model review is not human preference, and reduced-height simulation
is not a physical soft keyboard. Earlier unit/coverage snapshots do not describe
all later source repairs.

## Maintained browser and CI boundary

The five existing core/legacy cases are retained. The workflow is configured to select both maintained
standalone-board cases in the same five-minute browser step against a disposable
production image. Docker/image/remote CI execution is NOT RUN here. Tests use independent browser contexts, both course viewports,
real native drawing/paste/download/undo and cold identity recovery. Private recovery
values are held in memory; these cases disable traces/videos/automatic screenshots and the installed AI copy-prompt
password snapshot collector, and omit credentials from error/action metadata.
Matched fake-only assertion/hard-timeout controls proved the collector defect
and repair; complete JSON/results and decoded HTML artifacts contain no fake
password with the process-local flag. Real proof values were never used in controls. Their explicit canvas images
are taken only after credential dialogs are gone. Native local execution and
production Docker/remote CI remain different scopes.

## Evidence and remaining gates

The [18-row redesign register](../revisit/REDESIGN-REGISTER.md) links each meaningful
subsection to source, reproduction/comparison, refinement and review. The previous
43-row register is historical. Fresh initial reviews and contextual follow-ups
are labelled; source/runtime checks resolve claims rather than agent confidence.

Final required gate, affected coverage, maintained browser result, sanitized artifact
manifest, resource outcome, hook/diff checks and focused commit IDs are appended
after actual execution. This prepared record does not declare those checks passed.

Still separate: Docker image/entrypoint, Fly TLS/volume/redeploy, WAN behavior,
physical phones/IME, real familiar-friend/next-day value pilot, student PROCESS and
reflection rewriting, and live instruments-only course demo. The README remains
an AI-assisted draft for student review. No local test establishes enjoyment,
productivity, demand, academic correctness or a grade.

## Final local app gate, 7 October 2026

This checkpoint supersedes pending local labels above. The required build/type/spec
gate passes 411 tests in 26 files; process evidence and production dependency audit
pass. Complete house coverage is 86.28% statements / 80.03% branches (211 checks).
Complete board coverage is 69.85% statements / 67.67% branches (130 checks), including
main.jsx at zero unit coverage. Native editor checks do not replace that unit gap.

The preserved seven-case browser run passes before whole-startup enforcement. The
painted title-dialog grader reproduces two failures, then two passes after the
layer repair (13.8s desktop, 3.8s portrait). DOM/click checks alone falsely passed
through the inert foreground title. These unchanged title cases were relocated
from house.spec.ts to title-dialog.spec.ts; collection now selects nine CI cases.
The new nine-case selection is configured, not a combined local execution claim.

The actual startup helper first falsely accepted a successful 12,000ms control.
It now asserts finite, nonnegative unrounded elapsed <=10,000ms, retains failures
and separates completion from budget acceptance. Seven controlled checks pass.
The affected real game case passes in 55.5s under its unchanged 60s budget: Create
724ms, Join 8,672ms and saved return 8,200ms are each accepted by the strict guard.

The README root-app link defect was reproduced and repaired; nine HTTP boundary
checks pass. The smaller 512 shadow map retains the inspected room/avatars/chat
with softer shadows; screenshots have varying label positions and are not human
preference evidence. Exact source/result/image hashes and scope are in
[the closeout record](../../evaluation/redesign-closeout.results.json).

Resource inspection is READY at protocol 1ef47348 / manifest 545d79c3 / instrument
6130e233. Exact e579 is archived. All earlier resource FAILs remain FAIL; the one
registered CI exercise and production release remain separate. The original-data
preview is healthy at http://localhost:4093 using exactly .local/implementation-s1.
Local source commits: ca57bb2 game/world, 2e1cdb4 transport, fc4b5d8 README routing.

Parent release preparation: the reviewed mounted-backup helper succeeded on the
existing production machine at 2026-10-07T04:59:59.935Z, app HEAD fc4b5d8. The private
same-volume copy of the legacy database (24 pages, Node24.21.0) passed integrity.
Optional house/board databases were absent and not created, as expected for the old
Crit8 release. This is individual file consistency, not off-volume recovery; CI will
repeat the backup for the exact final candidate before deployment. No private copy
or raw report is committed.

The final browser/CI/evidence checkpoint is dc99dad. The original preview passes
WSL and parent Windows IPv4 health checks. Host browser initialization remains
blocked by ACLs; opening is queued and visible user-browser rendering is not
confirmed. No app, network or sandbox setting was changed for that boundary.
