# C8 validation record

Date: 6 October 2026. Status: local candidate, release pending. This record separates production-candidate checks from imported prototype results. The parent implementation task will update final counts, commit and release observations after integration.

## Environment and evidence

The current repository is `/home/lizhi/comp4020/comp4020-final-naaeeen`, accessed from Windows through the Ubuntu WSL bridge as `lizhi`. Node 24.21.0 and pnpm 11.9.0 run through Linux `mise exec`. The installed `node:sqlite` reports SQLite 3.53.4. The [official pinned Node API source](https://github.com/nodejs/node/blob/v24.21.0/doc/api/sqlite.md) marks the binding release candidate; it is not described here as a stable API.

The local app has run at port 4088 with a task-local SQLite directory. Persistent app data is configured for mounted `/data` in production. No database, session token, cookie export or raw trace belongs in committed evidence.

## Checks observed at the drafting stage

The coordinating implementation task reported `pnpm check` passing with 32 tests: 13 domain, 9 store, 8 HTTP/SSE and the 2 supplied course invariants. This is an interim count before final review changes, not a claim about a later commit or CI run. The document worker inspected those test definitions; it has not independently rerun this suite. The supplied checks still cover `/` returning 200 and README headings appearing in server HTML at `/readme/`.

| Evidence | Scope | Result at drafting stage |
| --- | --- | --- |
| `spec/domain.test.ts` | Stable owned placements, collision geometry, valid transforms, Unicode bounds, literal notes, forged actor rejection | 13 tests reported passing |
| `spec/store.test.ts` | Real SQLite session and state restart, receipt replay, changed-ID payload rejection, cross-owner/stale commands, rollback, withdrawal revision, older author's retained projection | 9 tests reported passing |
| `spec/server.test.ts` | HTTP cookie boundary, origin/size/JSON rejection, SSE owned projections and stream limits, confined assets, complete README HTML, failed commit/retry | 8 tests reported passing |
| Domain coverage via `vitest.domain.config.ts` | `src/domain.ts` only | Lines 95.23%, branches 87.35%, statements 87.27%, functions 100%, reported by coordinating task |
| `tests/e2e/first-night.spec.ts` | Real Chromium contexts and app HTTP/SSE path | 3 tests passed; `.local/browser-results/.last-run.json` records passed with no failed tests |

The browser suite uses separate desktop 1920×1080 and phone-sized 390×844 contexts. It saves two names, observes peer windows and panes without reloading, checks literal markup-looking notes, moves furniture with keyboard Enter, and opens a fresh context with retained cookie state to find the saved placement. It also checks withdrawal followed by a fresh contribution, no horizontal overflow at 390 pixels, 44-pixel movement controls, loaded model diagnostics and no collected page errors. Screenshots are local under `.local/browser-results`; storage state stays in memory and traces/video are disabled. These are automated contexts, not two human participants or a physical phone.

The coordinating task also observed two in-app browser origins, `127.0.0.1` and `localhost`, seeing each other's saved windows and lamp contributions. This is additional local observation, not a friends' trial.

## Document verification

The document task ran the repository's actual `mise exec -- pnpm check:evidence`: it passed, found `reflections/crit-8.md`, and resolved the two cited commits. `git diff --check` passed. At this stage README is 547 words, PROCESS about 550 words and reflection 256 words, counting rendered link labels rather than URL text. A separate read-only review found that a relative validation link would fail from `/readme/`; README now uses the repository's absolute document link. That link becomes publicly readable when this candidate is pushed and the repository made public.

## Still required or deliberately unclaimed

- Final integrated `pnpm check`, `pnpm check:evidence`, independent review and resulting commit links need to be recorded after all workers finish.
- No local Docker daemon was available, so the production image has not been built or exercised. The parent verified the official `node:24.21.0-bookworm-slim` tag exists; tag existence is not image validation.
- Fly deployment, the live public URL, production volume restart/redeploy persistence and the remote CI result are unverified. The repository is still private at this drafting stage. Local checks do not establish that C8 has shipped.
- Resize during use, slow-network recovery, measured one-second peer latency, a physical phone and long-running use need explicit observations before claims about them.
- No human test establishes whether visitors understand the lamp, value returning, feel co-presence or experience reply pressure. C8 does not validate the later private-circle privacy/recovery design.
- README, PROCESS and reflection are AI-assisted drafts for student review. PROCESS is the requested initial C8 account, to be rewritten as development continues; the [final brief](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/assessments/final-project/#what-you-submit) gives 900–1100 words for the final process overview. Its later expansion should follow actual work and evidence, without inventing experience to reach a count.

Historical planning evidence under `docs/planning-source/evaluation` belongs to the earlier prototype. Its tests, screenshots and comparisons are sources for decisions, not production verification. Commit [b1677a4](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/commit/b1677a4) records the migration, and [87a8c14](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/commit/87a8c14) records the owned-editing domain milestone. Later production changes must be cited using their actual commits.

## Final local candidate, before remote publication

The revised world-firstHUD passes all32fast checks plus3real Chromium cases.
The third case failed before the403recovery control was added, thenpassed.
A direct current-browser reload retained Previewtest after the local process
was stopped/restarted, with three modeltypes loaded and no observed pageerrors.
Runtime-only dependency audit reported no known advisories; all163migration
records match both workingtree and committedGitbytes. Final focusedindependent
review found no remainingconfirmedC8blocker. Production/Fly/CI remains pending.

Owner feedback and the actualgame references are recorded inADR0003.
Screenshots in docs/screenshots compare oldwebpage and HUD; these use generated
testvisitorlabels and changedrosters, so are requirement-led visual evidence,
not a perfectlymatched preferenceA/B. Physicalphone/softkeyboard nottested.
