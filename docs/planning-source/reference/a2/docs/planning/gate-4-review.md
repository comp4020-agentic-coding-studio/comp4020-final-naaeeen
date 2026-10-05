# Gate 4 review: finding the work and reading the history

28 September 2026. Implementation: [9741b89](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-Naaeeen/commit/9741b8908915bac9fda81faf8aad5d7cdde1a7dd).
Status: ready for the student's review; Gate 5 and submission remain unfinished.

## What changed

- Start here introduces the 2022 crisis from the course's 2035 viewpoint and gives
  one visible Begin Week 1 action, first reading and first meeting details.
- The homepage shows one course, three acts and twelve dated weekly entrances.
  Weekly plan groups ordered preparation, the Monday 14:00–15:30 Canberra seminar,
  the room, a concrete output, follow-up and the relevant assessment deadline.
- Primary navigation is Start here / Weekly plan / World atlas / Library. A
  separate Study desk gives direct Notes & slides / Case files / Assessments /
  People & help access. Start omits this row; its first action stays prominent.
- The twelve-week selector is in the planner header. Notes and slides are visible
  both through the resource desk and alongside the week that uses them. Week 9
  correctly reuses Week 2 notes; Week 2 seminar slides are not counted as prep.
- Lecture catalogue and Week 2 notes embed the real ten-slide presentation, with
  controls, a counter, readable notes and an open-presentation link.
- Required case accounts are readable on site and traceable by paragraph. The
  tasks, slides and assessments now analyse those historical accounts. Actual
  works, publisher sources, compilation limits and the premise live in credits.

## Comparisons, review and repairs

The baseline lecture catalogue had four cards, no direct deck links and no inline
viewer. The revised page shows the actual deck and states how notes are used.
This is a same-course design comparison, not a participant experiment.

Independent content review found three supported mismatches: the permitted pair
of Aincrad accounts, Week 8's selection from two different case files, and wording
that counted every note/deck as preparation. Parent corrected and rechecked them.
Independent implementation review found a frame-reload state issue; the controller
now resets readiness, count, index, controls and polling for each load. Controlled
review checks cover that reset; a separate frame-only browser reload was unavailable.

Real-browser slide checks exposed three additional problems:

1. Reveal's inline top offset combined with our centred grid pushed navigation
   below the iframe. Explicit inset reset removed the duplicate offset.
2. Past slides retained display:grid despite hidden state, exposing old links to
   accessibility navigation. The narrowly scoped hidden-slide rule now leaves
   one current Next link; overview, print and script-free layouts are preserved.
3. MDX transformed inline-script quotes into smart quotes. Moving the script to
   an Astro component produced valid emitted JavaScript, checked with Node.

The student then spotted rhythm arrows touching numbered circles. Browser geometry
confirmed a 28px compact gap with a 30px external offset. Connectors now centre in
one shared gap. Parent also found the phone week selector at y=1384, below the
rhythm explanation, and moved it into the header. Independent review caught one
CSS specificity issue in that extraction; the corrected label spacing was rebuilt.
CLAUDE.md gained specific emitted-script, embedded-slide and first-action/returning-
student checks, alongside the historical writing and ordered-material guidance.

## Actual verification

Final check log: `/tmp/a2-gate4-final-spu2zq0y.log`.

- Typecheck: 0 errors, warnings or hints. Build: 45 pages; configured accessibility,
  internal-link/base checks and one deck's structure pass. All 42 spec tests pass.
  The existing large Three.js chunk still produces a bundler size advisory.
- Six new study-navigation tests check generated preparation order/routes/budgets,
  cross-week notes, seminar materials and consistent meeting details. Their initial
  five-case run on Gate 3 output had four real failures and one pass; six now pass.
- At 390x844, Begin Week 1 occupies approximately y=478–542. The twelve week
  choices fit in the planner's first screen after moving and spacing the picker.
- At 1024, 1280 and 1920 CSS-pixel widths the compact rhythm arrows clear the next
  marker by about 6, 10 and 10px. Phone layout uses vertical lines, with no horizontal
  arrow over the circles and no page overflow. Both compact and full CSS use the
  same gap model; the compact defect was directly reproduced and remeasured.
- All ten embedded slides were navigated with their native links at desktop and
  phone sizes. Measured frame sizes were 1278x719 and 348x719; headings, prose,
  lists and navigation stayed inside them. Exactly one Next link remained for
  slides 1–9. All ten standalone slides also fit 1920x1080 and 390x844.
- Keyboard Tab exited the frame into catalogue notes; last-slide Assessment brief
  opened the top-level assessment page. The full-screen action expanded the phone
  frame to 390x844 and Escape returned to the page. Initial DOM reads made before
  the asynchronous fullscreen change were discarded.
- Week 9 picker activation set focus to its section, about y=159 below the header.
  Its assigned Week 2 notes opened correctly and Back restored Week 9. Browser DOM
  checks also covered Weeks 2/3 and the correct deadlines in Weeks 4/8/12.
- Phone menu Escape closes and refocuses its toggle. With scripts disabled the
  planner retains all 12 weeks, all 12 picker links and four ordinary fallback
  navigation links; the inert menu is hidden. All ten standalone deck sections
  remain readable without scripts. Reduced-motion slide bounds were checked.
- Secret-pattern inspection found no matches in outgoing source/doc files; staged
  diff whitespace check and the repository's key hook passed. No packages, fixed
  schemas, build integrations or permissions changed in this stage.

Screenshots and geometry records are under the session's authorized Windows
visualizations directory, including `gate-4-rhythm-desktop.png`,
`gate-4-rhythm-spacing.json`, `gate-4-week-picker-phone.png`,
`gate-4-start-phone-final.png`, `gate-4-semester-trail-desktop.png`,
`gate-4-inline-native-navigation.json`, `gate-4-inline-phone-final.json` and
`gate-4-standalone-bounds.json`. These are observations, not learner scores.

## Limits and remaining submission work

- No human learner study, timed usability experiment or claim of learning gains.
  The student's actual screenshot/feedback is the human evidence at this stage.
- The browser's attempted frame-only navigation and blocked-network setup did not
  reproduce those conditions. Do not count them as passing slow/failed-network
  tests. Fallback links and bounded readiness handling received source review.
- A MutationObserver error without source URL or stack remains unattributed in
  the browser log. The bounded dependency review did not establish a project
  cause. The formerly owned smart-quote SyntaxError no longer appears on fresh
  deck loads; the separate observer error is not claimed fixed.
- The native once-per-tab presentation hint remains consumed by an embedded visit.
  It is hidden in the embed, whose controls are explicit. No fresh ordinary-human
  standalone hint test is claimed. Existing GPU precision warnings are retained.
- No new Core Web Vitals or throttled-network benchmark was completed. Existing
  large scene and presentation bundle inventory is a cost check, not performance
  proof. Earlier accepted atlas tests remain Gate 3 evidence; only changed links
  and shared navigation are in this refinement's scope.
- `pnpm check:evidence` still fails solely for PROCESS.md's template comment and
  two sample commit hashes. The file has not been filled with invented reasoning.
- Live brief and upstream were rechecked. Upstream remains ecd1d71228e40105310fcb25e1bcf00cc5ed5284.
  The repository is private with Pages disabled. No public deployment is claimed.

## Human review

Review the homepage's hierarchy, Start here, the weekly planner and visible
resources. Check whether you can decide what to read first and find an important
reference without guessing its category. Report remaining label, spacing or
content issues before Gate 5. The whole-assignment Goal pauses at this requested
review gate; passing checks do not complete the assignment.
