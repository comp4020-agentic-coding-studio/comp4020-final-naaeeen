# Night Neighbourhood working agreement

## Outcome and authority

Build a cosy fixed-camera pixel-styled neighbourhood in which an unfamiliar
visitor can make a personal window, contribute to a shared lamp, and find that
trace on return. The Crit8 proof-of-life release is narrower than the final
private-circle plan. The current task targets the Shítāo cutoff:6October2026,
12:00 Canberra/Sydney. Read docs/C8-CONTRACT.md for current scope.

Use current official course pages, the user's stated aims, actual repository
files and observed behaviour as authority. Imported plans and skills are
recommendations to verify; subagent confidence is not evidence. Do not change a
requirement to make a test pass. The provided course checks and Fly256MB/one-volume
configuration remain intact. Keep new code, active instructions and submission
documents English; imported Chinese research retains its source language.

## Development and critique

Work through the shortest complete saved interaction, then improve expression
and visual quality. Preserve the long-term renderer-independent room/contribution
model; avoid arbitrary model uploads, social feeds, physical walking and a large
editor in Crit8. Research unfamiliar/changing APIs from primary documentation and
installed code. Reconsider a plan when current requirements or runtime evidence
justify it. Record the observation, alternatives, choice, cost and verification
in docs/decisions, not just a list of features.

Delegate bounded independent work with explicit file ownership; workers are not
alone and must preserve each other's changes. Read-only fresh reviewers get only
the current brief, evidence and rubric without parent conversation/preferences.
Reconcile findings yourself. For a consequential comparison, declare factors and
stopping criteria before trials; distinguish technical checks/model judgement
from human A/B/preference results. Do not manufacture repetitions for a score.

## Contracts and verification

Use Linux Node24.21.0 and pnpm11.9.0 through mise exec. Do not reuse Windows
node_modules or import old runtime pins. Node's installed SQLite engine is3.53.4;
the built-in binding avoids an additional native-build dependency, but its actual
transactions, parameter handling and persistence must be tested.

New production rules/bugs use meaningful failing tests before the fix. The server
resolves identity from a persisted opaque session, never a body actor/alias.
Validate command UUIDs, revisions, bounded names/notes/catalogue/transforms,
ownership and full collision geometry. Commit state and idempotency receipt in
one transaction before acknowledgement/broadcast. A timeout is pending, not saved.
Never reuse a successful command ID for another payload.

SQLite lives on /data in production. Mounted startup performs migrations; a Fly
release command cannot access that volume. Reject an absent/wrong data path instead
of reseeding old data. Keep transient connection/camera/selection out of SQLite.
The public rehearsal's visible content is explained before posting; it is not
the final invite-only friends' privacy contract.

Run actual typecheck/spec/evidence scripts, relevant domain/HTTP tests and real
browser flows. Include1920x1080 and390x844, native keyboard controls, resize,
return/restart, failed/stale/cross-owner commands and plain-text notes. Target80%
affected-code coverage where supported; report its scope. Build/HTTP mocks are
not live deployment or human usability proof. Inspect diagnostics from actual DOM
viewport and verify native image encoding/framing before comparing screenshots.
Repeat passing checks only after relevant changes or unresolved concerns.

## Evidence, commits and release

Make logical commits as milestones become reviewable. Keep required secret hooks;
never bypass a failing scanner. Preserve untracked/private credentials and never
print them. Do not stage local databases, raw logs, caches, node_modules, runtime
tokens or local mise settings. Commit and compare links in PROCESS refer to actual
commits in this repository; historical A2 commits do not count as new work.

README states the argument and real capabilities; /readme/ publishes it fully in
server HTML. PROCESS and crit8reflection drafts use the user's given aims and
actual work only, identify AI assistance, and remain subject to student review.
Do not invent personal feelings, human trials, approval, successful deploys or
test counts. Keep a concise PLAN handoff and actual check records.

Continue authorized local work and commits autonomously. Public repository
visibility, remote pushes and deployment need scoped user authorization under the
personal working agreement. Prepare a concrete verified version before asking.
Do not inherit A2 ship permission, install global services, buy jobs or change
sandbox settings.

## Methods and sources

Adapt these focused imported methods rather than loading every historical file:
docs/planning-source/methods/RESEARCH.md,
COMPARISON-AND-REVIEW.md, REQUIREMENTS-AUDIT.md,
EVIDENCE-AND-WRITING.md and ASSET-AND-CODE-REUSE.md.
Their historical directory instructions do not override this release contract.

Official: https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/crits/08-its-alive/
and assessments/final-project/, topics/assessment/, topics/ai-use-and-integrity/.
