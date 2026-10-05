# Requirements audit checkpoints

Use this record at the start of a gate, after a material scope change, and before
committing its deliverable. Check the live brief/spec, upstream README/current
revision, local goals and CLAUDE.md, relevant schemas/configuration, actual changes
and generated output. Record changes or confirm no relevant change; do not treat
an earlier plan or a passing test as the course's authority.

## Gate 3 start and scope clarification — 27 September 2026

Local starting checkpoint: 203b5cb. Upstream main checked through GitHub API:
`ecd1d71228e40105310fcb25e1bcf00cc5ed5284`, the wrapped-prose compressHTML fix.
The [live A2 brief/spec](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/assessments/assignment-2/)
and [upstream README](https://github.com/comp4020-agentic-coding-studio/template-course-site/blob/main/README.md)
were re-opened after the student questioned twelve-week scope.

| Category | Requirement or decision | Implementation boundary |
| --- | --- | --- |
| Course requirement | Twelve dated teaching weeks | Complete all twelve usable weekly guides. The brief does not prescribe a word count or twelve separate full lecture scripts. |
| Course requirement | At least one lecture links to a real deck | Week 2 already meets the quantity requirement. Do not turn it into twelve mandatory decks. |
| Course requirement | Assessment totals 100%; allocated suffix retained | Preserve 20/30/50 and SLOP1897, with real briefs and coherent dates. |
| Fixed platform | Slop identity/palette, four collection keys, build integrations, generated API | Inspect supported customization; no wholesale framework migration. |
| Course requirement | Working deployed site, checks and truthful process evidence | Public release and the student-authored PROCESS account remain later authorized work. |
| Marking guidance | Coherent curriculum; inspect non-adjacent weeks, assessment and deck | Vary questions and student outputs. A list of twelve titles would not demonstrate the intended quality. |
| Project choice | Compact weekly guides plus selected lecture notes | Keep Week 2's detailed method example; add focused notes where they help access/care and artificial-life cases. |
| Project choice | Interactive world atlas with an equivalent reading view | Use visual connections to explain the course; preserve readable content, source links, motion controls and normal navigation. |
| User workflow | Ongoing primary research, independent review, actual browser comparison, human gates, commits/pushes | Record evidence and inspect the parent-verified outcome before the next human review. |

The student's clarification changes the intended volume of new material, not the
fixed twelve-week requirement. Extra animation, readings and lectures must earn
their place through usefulness and quality, rather than being presented as
assignment obligations.

## Before Gate 3 delivery

Recheck this ledger against the implemented guides, current upstream revision and
generated API. Verify all required checks, remaining evidence-gate failures,
source/interpretation boundaries, non-adjacent student paths and the atlas's two
views at the marking sizes. Record any changed requirement and its consequence.


### Gate 3 delivery audit

Live brief and upstream README were re-opened during this stage; GitHub API
reconfirmed upstream `ecd1d71228e40105310fcb25e1bcf00cc5ed5284`. No changed fixed
requirement was found. The local build/API now confirm twelve dated weeks,
SLOP1897, 100% assessment weight and a real lecture-linked deck. All 36 spec tests
pass; the original build pipeline remains intact. Read the exact results and
remaining PROCESS/public-release boundary in [the Gate 3 review](gate-3-review.md).

The original starter's local strict course schema rejects the generic integration's
optional learningOutcomes input. A rejected trial was corrected without altering
that schema: the four planned outcomes now render from existing course-page data.
This is why checking a dependency's broader schema alone was insufficient.


## Gate 4 start — 28 September 2026

The user accepted Gate 3 and clarified visible slides, a clear weekly/first-use
path and an in-world historical voice. Parent re-opened the live brief/upstream
README and rechecked main: ecd1d71228e40105310fcb25e1bcf00cc5ed5284. Fixed scope
is unchanged. The new criteria are user-directed UX/content choices, not extra
course obligations. The wording audit exposed a real mismatch: Week 2 currently
assesses media publicity/production chronology. Update its accounts, activities,
assessment and deck together, with honest provenance in separate credits.

### Gate 4 delivery audit

The parent re-opened the live A2 brief and upstream README, then checked upstream
main through Git: ecd1d71228e40105310fcb25e1bcf00cc5ed5284 remains current. No fixed
requirement changed. The new information architecture is the student's design
choice; the code still preserves SLOP1897, twelve dated weeks, 100% weights, fixed
collections/API and at least one real deck. All 42 tests pass across 45 built
pages. Evidence remains incomplete in PROCESS.md; Pages is disabled/private.

## Gate 5 final audit — 28 September 2026

The live A2 brief, assessment rules, upstream README and current upstream revision
were checked again. The fixed scope is unchanged. Required local checks now pass,
and PROCESS.md is complete at the student's reviewed version. A2 explicitly uses
PROCESS.md for its account and following retro; no separate reflection is required.
See [the final audit](final-submission-audit.md) for the current matrix and browser
limits. Public Pages publication remains outstanding. Earlier red evidence results
in this file describe the dated Gate 3/4 checkpoints, not the current candidate.
