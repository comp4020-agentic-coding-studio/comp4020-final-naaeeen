# Crit 10 acceptance and release verification

19 October 2026. Canonical workspace:
`/home/lizhi/comp4020/comp4020-final-naaeeen` (Ubuntu/lizhi).
Baseline `6bbc4d227f49add4bfb01c182dc0797da37ec2b0`, initially clean. Preparation
began under a local-only instruction. The owner subsequently authorized commits
and a push to main on 19 October, including the existing CI/Fly release. Dated
local evidence below remains historical; release success is checked separately.

Official sources checked today: [Crit 10](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/crits/10-fly-by-instruments/),
[Final Project](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/assessments/final-project/)
and [logging/multi-user lecture](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/lectures/week-10/).
The exact reflection prompts also remain in `reflections/README.md`.

## Requirement -> evidence -> decision -> verification

| Section | Evidence and decision | Current result |
| --- | --- | --- |
| Identity | Cookie-resolved actor; duplicate display names cannot authenticate a peer. Real HTTP and native independent contexts. | PASS: permission cases and native same-name/different-UUID journey. |
| Rooms | Closed/foreign reads denied; an open door grants visiting/retained-chat access, not editing. | PASS: store/HTTP controls; opening exposes retained room conversation by design. |
| Goals | Author controls personal next step and closure, including against house owner. | PASS: real authorized-controller HTTP attempts reject peer/owner edits. |
| Board / exit | Current members co-edit; filtered own submissions remain exportable after removal. | PASS for native already-open standalone export and denied shared read; reopening discovery is a KNOWN UX GAP. |
| Administration / control | Store checks owner/target; live controller token/generation/zone remain authoritative. | PASS: seven new permission cases plus existing controller/revocation suite. |
| Logging | Structured allowlist, cookie actor, valid context/interaction metadata, safe HTTP denials and retry receipts. | PASS: 47 logger cases, nine integration cases, native actor-correlated output. |
| Privacy / failure | No private text, aliases, cookies, recovery proofs or control tokens in records; sink failure cannot reverse action outcome. | PASS: content/credential controls, real recovery failure reproduction and repaired behavior. |
| Pointer rate window | Original20/1000 limit, measured with elapsed rather than adjustable civil time. | PASS: paced rollback and immediate burst controls, independent rerun. |
| Browser | Native 1920x1080 and touch 390x844 contexts, real create/join/chat/edit/remove/download. | PASS with documented reopen gap; final run 4, 12 assertion groups, 17 attributed records. |
| Writing | One argument about submitted versions/shared outcome; two prompts; rewritten current PROCESS and actual commit citations. | Fresh factual/prose review and refinement complete; exact files and native evidence checker pass. |
| Resource | Existing300s workload, unchanged instrument/criteria, source-bound including logger. | PASS on final current source; first failed trial and exact bindings preserved. |
| Publication / people | Deployed URL, current repo reflection and two classmates narratable from logs. | Release authorized; verify actual pushed head, CI and deployed source. Classroom task NOT RUN. |

## Inspectable outputs

- [Reflection](../../reflections/crit-10.md): 251 whitespace-separated words including
  heading/link; [PROCESS](../../PROCESS.md): current overview (744 words), shortened at the owner's request; below the 900–1100-word guidance.
- [Topic comparison](TOPIC-COMPARISON.md): common task, credible alternatives,
  three history-free discovery passes, parent choice and interface counterexample.
- [Permission decision and log policy](PERMISSIONS-AND-LOGGING.md): who may see/change
  each object and why; metadata/content comparison and actual red/green work.
- [Review/refinement](REVIEW-AND-REFINEMENT.md): separate meaningful subsections,
  fresh versus contextual reviewers and observed corrections.
- [Runbook](RUNBOOK.md): actual-class procedure and interpreting logs without the
  presenter's own UI.

## Current-source verification

[Required check](evidence/required-check.json): `pnpm check` exited 0 on pinned
Node 24.21.0 / pnpm 11.9.0. Board build and TypeScript passed; 569 tests in 33 files
passed. This includes real SQLite/HTTP/socket authority and rollback/burst cases.
The new logger alone [measured 100% lines/statements/functions/branches](evidence/logger-coverage.json);
this is not whole-app coverage.

[Final native run4](evidence/browser-run-4-summary.json) uses the tracked opt-in
`tests/rehearsal/playwright.config.ts`; runtime/test/config hashes are in the
summary. [Protocol and failures](evidence/browser-protocol.json) preserve the
first selector failure, independent evidence refinements and earlier runs.
[Activity](evidence/browser-run-4-activity.json) contains only whitelisted synthetic
fixture metadata. Native downloads demonstrate peer-local shared rewrite versus
original personal contribution, not merely two API reads. Screenshots show
[phone board](evidence/browser-run-4-board-phone.png),
[revoked export](evidence/browser-run-4-peer-revoked.png) and
[reopened admission](evidence/browser-run-4-peer-reloaded-admission.png).

Normal browser discovery remains 23 tests in 7 files, excluding this opt-in local
rehearsal; no default skips were added. The entire normal browser suite was not
rerun. Browser contexts closed after each completed attempt. This is local
Chromium/SwiftShader technical evidence, not physical-device, WAN or human study.

[Clock red/green evidence](evidence/pointer-clock-regression.json) and
[resource refinement](RESOURCE-REFINEMENT.md) explain why the rate-clock correction
was made. The first [full resource trial](evidence/resource-local.json) is FAIL:
300.001 s, 174.48 MiB RSS, 7,188 patches/708 chats/zero skips, but 3,245 pointer rate-limit
rejections. Its failure is not erased by passing memory or a later trial.
[Protocol1](evidence/resource-protocol-1.json) and
[protocol2](evidence/resource-protocol-2.json) preserve exact source bindings;
workload, instrument and every acceptance threshold are identical.

## Final registered resource verification

[Second full result](evidence/resource-local-2.json): PASS, all 21 gates true,
300 recorded monotonic seconds, 24 initial/final views, 7,188 saved patches and 708
saved chats. Normal inputs had zero rejections/timeouts, writes had zero skipped
slots, and unexpected disconnects were zero. Peak server RSS was 201.46875 MiB
against the unchanged 210 MiB bound. Slow-reader expiry, recovery, queued-data,
delivery, HTTP budget and negative-control gates passed. Exact latency, cadence,
queues and runtime are in the result.

The parent verified every recorded runtime source hash, both exact protocol
hashes, unchanged workload/instrument/criteria and byte-for-byte restoration of
the historical `evaluation/board-resource.results.json`. No additional full trial
is justified after this pass. These are controlled local synthetic results;
they do not enforce a Fly 256 MiB cgroup or establish long-term memory stability.

## Operational and submission boundary

[Read-only production check](evidence/production-readonly.json): existing public
health returned 200. Status/recent-log commands worked through the already-configured
credential loader; no credential contents were printed. No recent parsed activity
was available to establish live multi-user attribution. No synthetic production
users, provider configuration or deployment were created. The local final browser
source is a different acceptance lane from the existing public release.

Shítāo's cutoff is 19 October noon Sydney, class 14:00–15:30. The official brief also
requires the current work shipped and classmates using the URL while the presenter
narrates from logs. These remain distinct from this prepared local candidate.
The earlier local-only restriction was lifted by the owner before publication.
The actual commits preserve implementation and writing as separate milestones.

## Final local closeout

[Final checks](evidence/final-checks.json) confirm the exact Crit 10 file, all six
PROCESS commit citations, current runtime/test/config hashes, required569/33,
final browser and resource results. At the original closeout README573 / PROCESS960 / reflection281 words fit the
guidance. Later owner edits supersede the PROCESS/reflection counts below. Parent inspected the production diff, validated evidence JSON
and local links, and found no high-signal credential patterns in changed files.
HEAD and remote main remain6bbc4d2; staging is empty. The owned candidate45305 and
all rehearsal browsers are closed; the existing4093 preview was untouched.
No commit, push, deployment or classmate evaluation took place.

### Owner-directed reflection wording revision

The retrospective agent-review paragraph was removed at the owner's request.
The developer aspiration remains, with a brief acknowledgement of AI drafting
and editing based on actual implementation/design tradeoffs. The synchronized
Chinese reading copy remains private. [Current wording/hash record](evidence/reflection-edit.json)
supersedes the reflection word count in the earlier final-checks artifact; runtime,
browser and resource evidence is unchanged. No commit, push or deployment.

### Owner-directed PROCESS section removal

The owner requested complete deletion of Asking what remains personal, without
replacement prose. [Current PROCESS revision](evidence/process-edit.json) records
the new hash and word count, superseding the earlier overview count. This latest
owner edit is below the900–1100word guidance; no filler was added. Runtime evidence
and the separate reflection remain unchanged. No commit, push or deployment.

## Authorized release, 19 October

The owner approved commit and push after reviewing the current writing. The
published candidate must keep the requested PROCESS section deletion and the
reflection's short AI drafting acknowledgement. Chinese reading copies stay in
ignored local storage. CI/Fly publication and deployed two-browser/log checks
are verified against the exact pushed head, not inferred from local passes.
The in-class two-person activity still requires actual classmates.

[Release preflight](evidence/release-preflight.json) records the real runtime
commit and English-only publication boundary. One test's committed LF bytes are
semantically identical to its preserved CRLF working-copy snapshot; the original
record is not rewritten. Fresh CI checks the actual committed checkout.
