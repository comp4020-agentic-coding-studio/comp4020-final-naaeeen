# Gate 4: a clear first step, a visible week, and history from 2035

28 September 2026. The student accepted Gate 3 for continuation, requested visible
lecture slides and explicit weekly logistics, then clarified two priorities:
the many peer-level categories obscure where to begin, and the course must treat
SAO as events in its historical world while introducing complete newcomers.
The whole-assignment Goal is active. Starting checkpoint: 37075dc, pushed/clean.

## Requirements and evidence checked before implementation

The parent reopened the live A2 brief/spec and upstream README. Upstream main
remains ecd1d71228e40105310fcb25e1bcf00cc5ed5284. The fixed contract remains one
Slop course, twelve dated weeks, at least one lecture-linked real deck, 100%
assessment weight and the existing platform/API. Twelve lecture/deck packages
are not required. The current course has 12 seminar guides, four lecture-note
entries (1, 2, 7, 10), and a real ten-slide Week 2 deck.

The current lecture index shows four generic cards without slides. Monday
14:00–15:30, Canberra time, in Slop Library seminar room 2 is buried in policies.
Assigned notes are already included in weekly preparation. Week 9 also reuses
Week 2 notes, which the current same-week collection lookup misses.

The wording audit found that the mismatch extends beyond introductory language:
Week 2 asks students to analyse TV/film publicity and compare a 2021 publication
with a 2022 event. That is a different course from the user's intended historical
world. Update the source model, tasks, assessment and slides together.

Primary design evidence checked:

- [COMP4020: How the course runs / Course materials](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/): explain semester divisions, weekly components and resource purposes separately. Do not copy its timetable.
- [MIT OCW Lecture 1](https://ocw.mit.edu/courses/6-100l-introduction-to-cs-and-programming-using-python-fall-2022/pages/lecture-1-introduction/): put media, notes, readings and activity together for one unit.
- [Calling Bullshit: Schedule and readings](https://callingbullshit.org/syllabus.html): distinguish required and supplementary reading.
- [NN/g: Progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/): foreground frequent tasks and make secondary routes clear. Three links is our design choice, not a proven universal optimum.
- [W3C iframe titles](https://www.w3.org/WAI/WCAG22/Techniques/html/H64) and [Reveal postMessage](https://revealjs.com/postmessage/): label the real embedded resource; isolate keyboard focus and validate any cross-window messages.

The researcher also identified [GOV.UK start pages](https://design-system.service.gov.uk/patterns/start-using-a-service/).
The parent's earlier /patterns/start-pages/ URL failed; the corrected primary
page was subsequently opened and its start-action/context guidance checked. Sources are precedents, not evidence
of learning gains in our course.

## The student experience

### A clear beginning with prominent exploration

Use **Start here / Weekly plan / World atlas / Library** as the primary navigation. The brand
and course breadcrumbs still link home. Keep the accepted exhibition/atlas as
exploration, but let a student begin without interpreting six resource categories.

Start here gives a short 2035 historical briefing: what SAO was, what happened
when leaving became impossible, what Aincrad was, and why later worlds matter.
Define unfamiliar terms as they appear. Show one course → three acts → twelve
weeks, then one primary action: Begin Week 1. Keep detailed provenance and optional
exploration secondary. Do not build a locked wizard or fake completion tracking.

Weekly plan is the return route. Each dated week groups preparation in its actual
reading order, the Monday meeting, the concrete output, follow-up and any deadline.
Use the published collections and explicit assigned-material links, including
cross-week reuse. Do not assume every week has a lecture or label a week current
from today's real date. Library gathers case files, notes/slides, assessment briefs,
optional atlas/history exploration and support, each with its purpose and use time.

### The weekly rhythm

A visual before / together / afterwards sequence shows:

1. Prepare for 20–30 minutes, following that week's ordered steps. Assigned lecture
   notes are self-paced and included in this allowance; the Week 2 deck also helps
   during the seminar. There is no separate scheduled live lecture to invent.
2. Meet Monday 14:00–15:30, Canberra time, in Slop Library seminar room 2. A seminar
   is a small-group working session: discuss evidence and make the week's output.
3. Spend about 30 minutes organising/revising that output afterwards. Reserve
   separate work blocks for the three assessments; deadlines remain visible in
   their teaching weeks and in the briefs.

Use a shared teaching-rhythm module for rendered UI. Keep policy prose readable
in the generated API and verify duplicated timetable facts rather than embedding
unresolved expressions into the policy body. Keep the strict course record intact.

### Historical voice with honest provenance

Write teaching prose from 2035, about people, events and systems. Explain enough
background for someone who has never encountered SAO. Do not repeatedly interrupt
with fictional-character, novel, film or anime framing.

Required readings become **course-compiled case accounts**, with stable account
and paragraph identifiers. Students distinguish what an account reports, their
inference, and a classroom proposal or remaining uncertainty. Never invent diaries,
interviews, survivor quotations, archive publication dates or primary evidence.
Accounts prepared by the same course are not independent corroboration.

A separate Source credits / How these accounts were prepared page identifies the
actual works, publisher summaries, adaptations, dates, exact passages and URLs.
It explains the educational premise once and preserves adaptation limits. Link
it clearly from case files and the Library. Students cite the assigned account
and paragraph; provenance remains inspectable without becoming a hidden reading
prerequisite. Main historical facts still require primary-source checking.

A/B/C in Week 2 become launch conditions / the first month / Asuna's entry.
Preserve enough contrasting detail for close comparison. Replace the deck's
publication-versus-event exercise with supported chronology: launch on 6 November
2022 and the first-floor meeting in December. Keep actual media publication dates
in credits. Align the lecture, seminar, 20% comparison and later assessments with
this model. Keep weights, dates and substantive word counts.

### Show the actual lecture slides

Feature the real Week 2 deck inline in the lecture catalogue and lecture page,
with a clear title, native navigation, open-presentation link and readable notes.
Other entries say Notes, not missing slides. A wide media slot can keep the frame
out of a narrow prose column. Test all ten slides at actual embedded dimensions;
a phone 16:9 frame is too shallow for the existing responsive deck.

Installed Astromotion 0.23.0 does not expose a public Reveal configuration option.
Installed Reveal 6.0.1 does accept query configuration and postMessage; verify
that runtime before using it. No pipeline replacement or new package is planned.
If adding outer controls, use a fixed method allowlist and check both message
origin and frame identity. No autoplay. Keep a way to leave the frame, including
last-slide links. An iframe load event alone does not establish successful display.

## Ownership and sequence

- **Orientation/UI worker:** new teaching-rhythm module, WeeklyRhythm component,
  /start/, /library/, weekly planner and TeachingSession presentation. No content
  Markdown edits; consume the content worker's structured metadata. Parent owns
  homepage/global navigation/shared layout and all process documents.
- **Content worker:** 12 seminar guides, 4 lecture-note Markdown files and three
  assessment briefs. Update historical voice and account-based tasks together;
  add ordered preparation metadata and takeaways without changing time budgets.
- **Source worker:** source packets/index/methods, new source credits and beginner
  history briefing data. Preserve existing routes and stable anchors where used;
  give new paragraph IDs for precise citations. Parent verifies primary claims.
- **Slide worker:** lecture index/catalogue/detail route, slide-viewer component,
  scoped style/controller, Week 2 deck and necessary deck CSS. Coordinate the
  revised account labels and chronology with the content/source contracts.
- **Verification/review:** independent bounded read-only review and meaningful
  new checks for weekly material/timing promises. Parent owns full checks,
  browser tests, final source/copy consistency, integration and commit/push.

Workers share this checkout and must preserve others' changes. Keep dependent
steps sequential. No full build while owned source sets are mid-edit.

Shared interfaces:

- `src/data/teaching-rhythm.ts`: export teachingRhythm with seminarDay, startTime,
  endTime, location, timeZone, followUpMinutes; export derived seminarTime.
- `WeeklyRhythm.astro`: optional compact:boolean and preparationMinutes:number.
- Session metadata: `takeaway: string`; `preparationSteps: {title, minutes, detail,
  href?}[]`. Preserve the existing preparation total. Links identify actual
  assigned readings and cross-week reuse; hands-on steps need no artificial URL.
- Planner groups: data-week-plan and data-week for stable route-contract checks.
- Beginner briefing data: src/data/history-briefing.ts, with short introduction,
  supported events and minimal glossary. UI worker and source worker coordinate
  the export shape before writing dependent markup.
- Stable Week 2 account paragraph anchors: a1/a2, b1/b2, c1/c2 as needed; actual
  text must support each assigned comparison. Existing packet section anchors
  remain available for already-linked routes.

## Acceptance and human review

A newcomer can identify one course, the three acts, the first action/read, the
weekly meeting, the roles of seminar/lecture/case file/atlas, and a chosen week's
preparation order, output and deadline. The historical briefing makes the opening
crisis understandable without prior fandom knowledge; credit notes remain honest.

Compare the old catalogue with the revised task-led entry using the existing
course, and compare the same deck standalone/inline. Record visibility, route and
navigation observations; no invented learner times, scores or preference claims.

Run pnpm check, inspect the generated API and fixed-contract diff, and retain the
honest PROCESS evidence failures. Browser: measured 1920×1080 and 390×844,
intermediate header width, all ten inline and standalone slides, keyboard entry/
exit, menu/focus/Back, no-JS/reduced motion, blocked or slow-loading content and
readable fallbacks. Walk Weeks 2, 3, 9 and assessment weeks 4/8/12, including the
cross-week lecture link and an assessment hand-in path. Record performance limits.

Update English research, curated PROCESS evidence, goals and a small justified
CLAUDE.md refinement. Commit/push normal checkpoints to private main, verify the
remote, then stop for Gate 4 human feedback. PROCESS.md and public release remain
Gate 5 work; do not write invented personal experience or publish automatically.


## Further design steering: the learning route is more than a menu

The student explicitly invited alternatives to navigation and more imaginative
presentations. The primary links remain a utility layer. The parent is
adding a visible SemesterTrail near the top of the homepage: one course, three
acts, twelve dated nodes, a highlighted Week 1 start and direct access to every
week. The worker's weekly dossiers then give the actual ordered tasks. These are
teaching dates in 2035, separate from the historical event briefing.

Primary references checked: [Duolingo's 2022 path explanation](https://blog.duolingo.com/new-duolingo-home-screen-design/)
and [Three.js Journey's introduction](https://threejs-journey.com/lessons/introduction).
Take the explicit next step, grouped chapters and nearby learning materials; do
not copy locks, streaks, subscriptions or claims of learning effectiveness.
A timetable-based university course needs direct revisits and deadlines. Nicky
Case's [Evolution of Trust](https://ncase.me/trust/) was identified as an explorable
narrative reference, but the web reader exposed little of its interactive content;
no completed walkthrough is claimed. Parent owns SemesterTrail.astro and its CSS.


### Atlas visibility refinement

The student then clarified that the atlas is too important and interesting to be
reached only through Library. Restore it as a primary World atlas link and add a
contextual entrance beside the homepage's Aincrad illustration. Keep the guided
start and weekly route prominent; four purpose-led entrances are a better fit
for this feedback than enforcing the earlier three-link proposal as a quota.


### Important resources remain directly visible

The student's next clarification extends beyond Atlas. Add a secondary Study desk
on the homepage and learning/resource pages with direct Notes & slides, Case files,
Assessments and People & help routes, each labelled by purpose. Keep the four
primary route links and the visual semester journey. The first-use Start page
retains its focused action rather than adding another resource row before it;
its routes remain available in the main navigation and following study pages.
The Library also gains an explicit complete lecture-catalogue link. This separates
recommended sequence from reference access without hiding important material.

### Organisation review and rhythm spacing

The student explicitly prioritised finishing organisation over rushing delivery.
Keep the guided route and the secondary resource desk; verify both in the real
browser before presenting the result. Their screenshot identified a real compact
weekly-rhythm defect: its 28px column gap inherited an arrow offset of 30px,
placing the arrow over the next number. Centre the connector in the actual shared
gap and preserve the vertical phone sequence. Check compact and full variants.

The parent's 390x844 walkthrough then found the week selector at y=1384, below
the full rhythm explanation. Move the existing selector into the Weekly plan
header, retain every week as a native anchor, and reuse the existing focus handling.
Increase resource-desk link labels from 12px to 14px. These changes address actual
findability/readability observations; they do not establish learner success.
