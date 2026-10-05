# Gate 3 review: the complete course and world atlas

Prepared 27 September 2026. Gate 2 continuation was authorized by the student;
Gate 3 human feedback is now required before Gate 4. The whole assignment is not
complete. Implementation checkpoint: [1c27051](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-Naaeeen/commit/1c27051bc85009e128952a9afff34729670ddc04).

## Review the result

- [Course homepage](http://localhost:4321/comp4020-ass2-Naaeeen/)
- [World atlas](http://localhost:4321/comp4020-ass2-Naaeeen/atlas/)
- [Reading-list alternative](http://localhost:4321/comp4020-ass2-Naaeeen/atlas/?view=reading)
- [All twelve seminars](http://localhost:4321/comp4020-ass2-Naaeeen/sessions/)
- [Source library and story chronology](http://localhost:4321/comp4020-ass2-Naaeeen/sources/)
- [Exhibition assessment](http://localhost:4321/comp4020-ass2-Naaeeen/assessments/digital-history-exhibition/)
- [Policies and support](http://localhost:4321/comp4020-ass2-Naaeeen/policies/)

These URLs are the local built preview, not a public deployment. Start with the
atlas and non-adjacent Weeks 1, 7 and 11; inspect the complete assessment route.
Human questions: does the history/computing balance feel right, do the activities
form a course you would want to take, and which parts of the map or reading view
need visual refinement? No human preference or learner improvement is claimed.

## Delivered scope

Twelve dated Monday seminars run from 19 February to 7 May 2035. Each has a
question, short preparation, a 90-minute activity and a concrete output. The
previous Week 2 example remains the detailed method lesson. Four lecture-note
pages and one working ten-slide Week 2 deck support the sequence; twelve decks
are not an A2 requirement.

The three completed assessment briefs retain 20/30/50 weights and dates of
16 March, 13 April and 11 May. Fictional staff and support arrangements are linked
from the course pages. The source library distinguishes story dates, publication,
adaptation and classroom proposals, including optional real-computing lenses.
Week 9 now follows the available official evidence about AR, body, place and rank.

The atlas connects five original SVG settings through source-based notes and
seminar links. It supplies the same content in an interactive map and reading
list, with keyboard selection, URL/history state, pause, reduced motion and
static HTML. The homepage now begins at Week 1, advertises the atlas and source
library, and publishes the four planned learning outcomes. Starter images,
profiles and the unused starter deck were deliberately removed.

## Actual checks

| Check | Parent-observed result |
| --- | --- |
| Required final `pnpm check` | Passed; 0 type errors/warnings/hints, 36 spec tests across 3 files |
| Production integrity | 42 HTML pages, 1 compiled deck; no reported accessibility violations, broken internal links or base-path violations |
| Generated API inspection | SLOP1897, 12 sessions, 4 lectures, 3 assessments, 2 people; 22 graph nodes, 28 edges; dated weeks 1–12 and 20/30/50 weights verified |
| Dependency audit | Full `pnpm audit --json`: zero advisory counts in all severities; dependencies unchanged in this stage |
| Submission evidence | Fails only for PROCESS.md's template comment and nonexistent sample commits a1b2c3d/e4f5a6b; starter content/image failures are gone |
| Change review | Parent inspected scope and fixed contracts; independent content and code reviews were reconciled; staged whitespace and credential-shape scan passed |

Final passing log: `/tmp/a2-gate3-verified-m9fyuqo1.log`. The build retains its
existing large-chunk warning for the 3D feature; this is not a measured performance
result. Accessibility checks use the theme's content cache (40 unchanged pages
reused on the last pass). No claim is made that all 42 pages were visually read.

## Browser checks and local comparison

Parent used the in-app Chrome-compatible browser at measured 1920×1080 and
390×844 with DPR 1. The following are actual browser observations:

- The refined atlas and homepage entry have no horizontal page overflow at both
  marking sizes. The map shows all five connected emblems on desktop and one
  larger selected emblem with five selectors on the phone. A supplemental
  1024×768 homepage check found no horizontal overflow.
- Arrow keys, Home and End select the five worlds and retain a single visible
  panel; rapid changes settle with the selected symbol, notes and URL agreeing.
  A pointer click in the illustrated GGO emblem selects GGO through the existing
  anchor, without a duplicate keyboard stop.
- Returning to controls preserves the selected world in its URL. A fresh load
  restores Underworld; GGO → controls → Augma → Back restores GGO, and Forward
  restores Augma. Reading-list controls links preserve their own world/view.
- At both marking sizes the sticky nav ends at 118px and atlas toolbar occupies
  118–187px in the measured scrolled state. After the last refinement, the phone
  world panel begins at approximately 217px and its heading at 269px, preserving
  the name/eyebrow as well as the title. The desktop seminar shortcut also lands
  below the toolbar.
- The native skip link no longer redirects to world notes: its next Tab enters
  the main-content breadcrumb. Escape closes the phone menu and returns focus.
- The Atlas/Reading list comparison keeps identical text across all five panels.
  Reading mode exposes all five with normal links; map mode exposes one panel
  with tabs. The parent recommends keeping both for different browsing tasks.
  This is a local same-content comparison, not an experiment proving learning,
  speed, student appeal or a human preference.
- Visible SVG movement and route tracers change when running, remain stable after
  Pause, and stop under live reduced motion. The control reports the device
  preference and is disabled while reduction applies. Settled samples remain
  unchanged with the map fully offscreen. Normal motion was restored afterwards.
- With JavaScript disabled, all five headings/notes and six course-navigation
  links remain reachable; inert mode controls and the unsupported menu are hidden.
  Normal script execution was restored afterwards.
- Browser walks covered Weeks 1, 7 and 11 at both marking sizes; the Week 1 source
  route, Week 7 lecture, Underworld → Week 11 → exhibition → hand-in policy →
  convenor chain, and homepage → atlas. Desktop reading width is 820px. The Week
  11 contents link places and focuses the activity heading below the nav.
- Atlas/reading walks produced no error or warning entries. The homepage retains
  the previously documented device-dependent Three shader-precision warning;
  no new script failure was established. The unchanged deck's full visual checks
  remain in Gate 2; this build rechecked compilation and the real linked route.

Some screenshot captures from older tabs had host/emulation scaling conflicts.
They were rejected and repeated in a fresh tab with matching measured viewport
and visible composition. Immediate samples during native smooth navigation or an
observer update were not treated as settled results.

Local host captures are under
`C:/Users/lizhi/.codex/visualizations/2026/09/26/01a0dfb3-8eff-7180-a13c-5d1ea37b2504/`:
`gate-3-atlas-desktop.png`, `gate-3-atlas-phone.png`, `gate-3-notes-phone.png`,
`gate-3-home-desktop.png`, `gate-3-home-atlas-entry.png`, `gate-3-home-phone.png`
and `gate-3-week-11-desktop.png`. These support inspection, not the required
commit-based evidence chain.

## Findings resolved and limits

The first full build caught duplicate named inner regions in the no-script atlas.
Removing unnecessary landmark roles retained the outer world sections and passed
the existing checker. Independent review then identified covered sticky controls,
lost controls-URL state and interference with native skip/history behavior. The
parent reproduced those in the browser and verified their fixes. A further visual
pass moved notes scrolling to the whole panel so its world label remains visible.

The independent code reviewer also reran six controlled DOM cases. Observers and
geometry were stubbed there, so those results do not establish real positioning or
native BFCache restoration. Physical touch hardware, screen-reader output, GPU
frame rate, native BFCache restoration and learner completion times were not
measured. Gate 4 retains the wider whole-site refinement and performance work.

Content review found missing hand-in/feedback logistics and inconsistent exhibition
format descriptions. All three briefs now link the common procedure; feedback
returns before subsequent tasks need it. The fictional seminar room, Friday
hand-in sessions and access alternatives are course-design choices for human review.

A final metadata proposal was rejected by the starter's local strict schema. The
generic integration supports learningOutcomes but this repository's course record
does not. The record was restored unchanged; the planned outcomes are published
from existing course-outline data. No fixed schema or validation was weakened.

The small CLAUDE.md changes require periodic live/local requirements audits and
preserving native skip/history behavior during navigation enhancements. Detailed
findings stay in the research/evidence records. PROCESS.md still needs the
student's own account. Public release remains a separately authorized later step.
