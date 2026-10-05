# Final submission audit — 28 September 2026

Status: the local candidate passes the required submission checks. Public release
and verification of its live URL remain outstanding. At the audit checkpoint the student requested that PROCESS.md stay unchanged.
They subsequently authorized the focused 600-word [course-judgement revision](../review/process-comparison/course-judgement-revision.md),
which preserves the verified process facts and strengthens the last two paragraphs.

## Authorities checked

- [Live Assignment 2 brief and spec](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/assessments/assignment-2/), retrieved again during this audit.
- [Assessment rules](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/topics/assessment/).
- [Upstream README](https://github.com/comp4020-agentic-coding-studio/template-course-site/blob/main/README.md); upstream main remains `ecd1d71228e40105310fcb25e1bcf00cc5ed5284`.
- Local README, CLAUDE.md, implementation goals, schemas, workflow, generated API,
  current files and the commits cited by PROCESS.md.

The starting candidate was `148db0e12b27e55b83841b5489223347c09d97bb`.
The commit containing this audit records the final changes below. The original
provisioned course code is SLOP1897 at `f95cbb6`.

## Required deliverables

| Requirement | Result and evidence |
| --- | --- |
| One niche Slop University course | After Aincrad is a first-year history of the Full-Dive age, taught from 2035 for readers new to SAO. Independent review covered non-adjacent weeks, all three assessment briefs, selected notes, the deck and policies. Coherence and appeal remain marking judgements. |
| Allocated code and twelve dated weeks | SLOP1897; twelve Monday seminars from 19 February to 7 May 2035, within the teaching period. Generated API and spec checks pass. |
| Assessment totals 100% | Three completed briefs, weighted 20/30/50, with deadlines, criteria and submission arrangements. |
| A lecture links to a real deck | Week 2 links to the built ten-slide deck; its presentation is also embedded beside readable notes. Four selected lecture-note pages are available. Twelve decks are not required. |
| Fixed platform | Branding, palette ownership, collection keys and API remain intact. Fixed configuration, schema, workflow, Pages helper, evidence checker and README match the provisioned revision. |
| Own spec checks | Course promises and study-navigation checks cover weeks, weights, suffix, actual deck links, preparation order/allowances, cross-week material and timetable consistency. |
| Required checks | Fresh `pnpm check`: exit 0, 42 tests pass, 45 built pages, no reported type, configured accessibility, base-path or internal-link failures. `pnpm check:evidence` passes. |
| Process evidence | PROCESS.md, CLAUDE.md and growing commit history are present. All nine distinct cited commits in the revised account resolve. Important document links resolve locally; the review manifest pins current source hashes. |
| Reflection | Official A2 uses PROCESS.md; there is no separate reflection requirement. The following retro draws from the same account. No duplicate reflection file was created. |
| Public live site | Outstanding: GitHub still reports a private repository with Pages disabled. The local build is not evidence of a public deployment. |

## Final corrections and document checks

Independent content review found that an absent student was told to ask for an
alternative delivery method without a contact route outside their own attendance.
Policies now allow a nominated person to submit work with a receipt or deliver a
sealed support request. Both staff profiles and the people index link to it. The
parent checked the change; independent readback found no remaining contradiction.
The rebuilt policy anchor works in the browser.

Current repository-authored text is English, including decoded JSON strings.
Translated review copies remain outside the repository. Implementation-tool
references use Codex without the specific model label the student asked to remove.
The historical prompting source remains traceable through its pinned source record.
Git history has not been rewritten.

## Browser evidence

Fresh browser tabs used actual viewports of 1920×1080 and 390×844. Checks included:

- Home → Start here → Week 1, with ordered preparation and meeting details.
- All ten embedded slides at each viewport: every measured content region stayed
  inside its frame, and Previous/Next advanced the presentation counter.
- Standalone phone slides: readable text and working navigation. A corrected
  viewport capture showed the bottom navigation; the earlier preview capture
  clipped it despite valid DOM bounds. No stylesheet change was needed.
- Phone weekly-plan selector: Week 9 received keyboard focus and settled visibly
  below the header; its Week 2 reference remained available. No horizontal overflow.
- Atlas setting selection, pause/resume state and reading-list access to all five settings.
- Reduced-motion homepage state and JavaScript-disabled fallback: course links and
  the static illustration remained available; all ten deck sections were readable.

A phone tab intermittently logged a MutationObserver argument error without a
source URL or stack. The complete slide interaction passed. Inspection found no
reachable observer call in the owned lecture/embed code; bundled Fitty disables
mutation observation here. Its origin remains unresolved, so this audit does not
claim an error-free console. A desktop WebGL precision warning was also observed.
A network-blocked iframe condition was not reliably reproduced and remains unverified.

## Additional checks and release boundary

`pnpm audit --json` returned zero advisories. A redacted scan found no high-confidence
credential signatures in current text or 398 reachable historical text blobs; the
course-key pattern and configured entropy threshold also produced no findings.
This is not the full TruffleHog verification used by public CI.

The extra `pnpm test:template` run returned 36 passes and four missing-fixture
failures: its starter-image tests copy artwork that this completed course removed.
The supplied CI explicitly runs those tests only for the template repository.
The student-required checks passed; no starter images were restored or checks weakened.

Local command logs are in `/tmp/a2-final-audit-ys8v1wyg/`, including
`check-final.log`, `evidence.log`, `dependencies.log` and `tooling.log`.
The process-only follow-up is recorded in `evidence-course-judgement.log`; it
does not change the website, dependencies or previous browser observations.

Before submission, obtain the student's public-release authorization, enable and
publish through the course workflow, inspect CI including its full secret scan,
and verify the actual Pages URL at both marking sizes. Ordinary private pushes
are already authorized; public visibility changes remain a separate action.
