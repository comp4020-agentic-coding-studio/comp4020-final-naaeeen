# Integrated house validation

Updated 7 October 2026. Actual local evidence is distinct from deployed use,
physical devices and human value. Canonical workspace is Ubuntu/lizhi
`/home/lizhi/comp4020/comp4020-final-naaeeen`. Core milestone: `ea60440`.

## Current local acceptance

| Scope | Executed result | What it establishes |
| --- | --- | --- |
| Required pnpm check | 195 tests / 14 files and typecheck PASS | Current domain, HTTP, transport, UI and renderer checks |
| Expanded house V8 scope | 163 tests / 10 files PASS | 93.43% lines,84.27% statements,77.47% branches,86.37% functions |
| Provided live invariants after README revision | 2 PASS | Current root/readme server contract; prose truth is separate |
| Production dependency audit | No known vulnerabilities reported | Audit result at this checkpoint, not a complete security proof |
| check:evidence | PASS | Frozen C8 reflection and three existing PROCESS commit links resolve |
| Current house journeys | 3 PASS plus affected room recheck PASS | Movement/chat/return,touch/resize,independent cards,seat/DIY/visit/revocation |
| Current lifecycle journeys | 2 PASS,59.6s | Full-house recovery/takeover,transfer,own-only archive download,last departure/code disabled |
| Bounded CI-native lane | 5 PASS,no retries/skips,1.7min | Core + four legacy flows,real service/SQLite/Secure localhost cookies |
| Camera/readability native lane | 8 PASS,3.7min | Long names,close pan/real seat picking,room/editing and reduced motion |
| Camera matched comparison | 16 A2/B2 images,hash/dimension checks | Mechanical framing/readability; not human preference |
| Storage operations | 5 PASS | Populated legacy preservation,WAL-aware restore,unknown schema cleanup and OS-process final-slot race |

The nineteen maintained browser cases passed across separate source-bound runs;
this was not one nineteen-test invocation. Matching Chromium153.0.8010.12/rev1243
was used for CI, and the maintained lifecycle environment was independently
verified. Software rendering is explicit. Browser contexts are independent test
identities, not human participants.

## Important failures and refinement

HTTP routes first failed with actual404 behavior before implementation. Startup
failure leaked legacy SQLite descriptors; cleanup fixed the native regression.
A renderer clock defect gave0.52units/second at4fps versus2.6 at30fps; elapsed-time
movement/collision checks now preserve2.6 at both simulated rates.

Granular reviews exposed original-identity proof leakage, delayed drafts posted
under another cookie, out-of-order key rotation, late-ACK duplicate chat and room/
card draft loss/rebasing. Captured actor preconditions,privacy/instance fences,
serialized issuance,original UUID retention and acknowledged-projection barriers
repaired them. A real-client/UI replay found a second defect missed by a mocked
successful ACK; independent final replay now produces one effect with one UUID.
Current client36+UI37 tests and contextual follow-up review accepted those repairs.

Native checks found inline-notice pointer obstruction and new camera/takeover
control overlap; normal unforced clicks now pass. A forty-character unbroken name
escaped its border box; actual glyph grading exposed it. Bounded ellipsis with full
name access,consistent creation/resize styles and camera breakpoint correction
passed native/pure checks. No screenshot-only human appeal claim is made.

Earlier maintained lifecycle invocations failed during recovery/join while several
GPU lanes were active. Their cause remains UNCONFIRMED and traces/results remain
under ignored.local. HTTP aliases showed correct recovered identity/home/cookie;
no token/proof was printed. A standalone diagnostic used5s assertions versus the
maintained10s; registered matched10s real-world/adapter probes both passed. Real
renderer startup added about3s in that pair. This explains the diagnostic mismatch,
not every earlier maintained failure. The unchanged two maintained cases later
passed with other GPU lanes closed; no timeout was increased.

The first current house run passed three cases but used old global-toast assertions
for room saves. Feedback had moved into the active panel. The affected recheck uses
visible room/layout saved status and persisted reload state and passed. Movement
grading now measures change from actual separated spawn coordinates, not an assumed
origin. These evaluator repairs preserve the user requirements and failed artifacts.

## Completed sustained workload

Original full v1 L1/L2 failed RSS196.492/260.102MiB; v2 readiness corrected one
stale-generation synthetic input. Eight matched100s memory variants informed
minimal bounded SQL-plan reuse. Corrected full statement-reuse v2 runs passed
RSS167.922/170.699 but still failed normal motion with1/29RATE_LIMITED replies.
All failures are preserved, never relabelled as PASS.

An actual-source controlled-clock replay confirmed a feasible overlapping-ACK
generator defect; aggregate v2 data cannot attribute each historic rejection.
Pacing v3 keeps one outstanding readable move,commits pose on current successful
ACK and preserves deliberate paused stationary10Hz. Fourteen source-calibration
controls and independent recheck passed. A registered100s L2 calibration passed
valid cadence/count/view/expiry gates with0normal rejects; fullDuration and mixed
slow-reader p95 remained false,so it stays CALIBRATION.

One exact 1,800-second L1 then L2 attempt completed on port 4098. L1 PASS:
1800.344s,RSS165.160MiB,p95visibility101.968ms,180saved intents,2160deliveries,
0rejects/timeouts and all slow cycles. L2 PASS:1800.367s,RSS169.031MiB,p95103.042ms,360saved intents,2160deliveries,
zero rejects/unexpectedtimeouts and allcontrollerfaultcycles. Both full runs PASS.
Parent independently parsed all gates and matched every recorded source hash at
measurement exit. The post-measurement calibration fixture-path change is documented;
its exact recorded grader is archived. The180MiB/1second/10Hz/count/slow-reader gates
were not weakened. Slow catch-up maxima remain included and disclosed.

## Coverage limits and remaining gates

The expanded scope includes all house JavaScript,house TypeScript and shared HTTP
server. It excludes legacy renderer/application modules from this house percentage.
UI branch67.36%,world73.3%,server64.79%; aggregate77.47% is below the80% branch
target. All measured statements/lines are reported rather than choosing a favorable
partial report. Mocked renderer/transport paths do not establish physical GPU/WAN
behavior,even when line coverage is high.

Still open: production Docker
image/entrypoint and Fly TLS/volume/restart/redeploy;physical phone/IME and target
hardware;actual familiar-friend value/next-day pilot;student-authored PROCESS/C9/C10
reflection updates and live instruments-only demo. No new candidate has been
pushed/deployed. Existing C8 tag/data and required secret hooks remain intact.

## Evidence routes

- [Detailed43-subsection register](../revisit/REGISTER.md)
- [UI refinement](../revisit/UI-REFINEMENT.md),[outbox refinement](../revisit/OUTBOX-REFINEMENT.md)
- [Camera and foreground](CAMERA-EVIDENCE.md),[world readability](../revisit/WORLD-READABILITY.md)
- [CI verification](CI-VERIFICATION.md),[operations](operations-evidence.md)
- [Memory comparison](../revisit/MEMORY-COMPARISON.md),[load pacing](../revisit/LOAD-PACING-REFINEMENT.md)
- [Research/harness audit](HARNESS-AUDIT.md),[lecture application](LECTURE-APPLICATION.md)
- [Global-method extraction](../harness/global-extraction/INSTALLATION-AND-REVIEW.md)

## Final evidence reconciliation

Core `ea60440`, maintained verification `5548bb1` and measurement evidence
`2c120a1` are actual local commits. The frozen tag is `crit-8`, peeled `6dc79c5`.
The main camera manifest retains historical hash observations and adds an explicit
closeout note: the old label-test bytes are unavailable, while the current test
passed the required/expanded checks and production modules match. Its original
manifest is preserved separately. Read [camera evidence](CAMERA-EVIDENCE.md).

The current handoff and register supersede earlier pending statuses within local
scope. Final document/source/link/JSON/PNG/diff checks reconcile the candidate;
student writing, human/device trials and production operation remain separate.
