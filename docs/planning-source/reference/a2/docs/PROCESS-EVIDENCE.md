# Process evidence bank

Updated: 28 September 2026. This is a factual working record for the student's
later PROCESS.md, not a student reflection. Decisions labelled as recommendations
or source-level findings are not human feedback or verified runtime outcomes.
Keep this file selective: preserve events that changed what we asked for, built,
checked or accepted. The [living research](IMPLEMENTATION-RESEARCH.md) and
[review records](planning/gate-1-review.md) hold supporting detail.

## E01 — A history course with computing as an explanation

**Trigger and decision.** The student said SAO originally motivated them to study
computing, proposed treating its events as history, and accepted a history of
technology and society. The course plan makes historical inquiry the structure;
computing explains relevant mechanisms. Friendship, ordinary life and reasons for
returning accompany institutional conflict. The 2035 teaching frame is invented,
while source-supported events remain distinguishable from interpretation.

**Alternative and consequence.** A plot recap would not teach a method; a generic
computing course with substituted names would lose the student's particular
interest. The planned source comparison, incident study and exhibition give the
semester a progression. These are design arguments, not measured learning effects.
The full teaching content still needs implementation and human review.

**Evidence.** [c14d959](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-Naaeeen/commit/c14d959)
records PLAN.md and the implementation gates. The student has not yet reviewed a
complete teaching unit; do not claim that they have.

## E02 — Compare the same content, then fix first-screen orientation

**Observation.** A and B share one outline dataset. A foregrounds an archive-like
composition; B brings semester navigation forward. On the first A phone layout at
390×844, prerequisite information appeared around y=1495. The illustration had
pushed essential orientation beyond the first screen.

**Decision and verification.** Move the fictional frame and entry requirements into
the shared opening. They then occupied about y=451–556 in A and y=399–505 in B,
inside the first viewport. Keep both alternatives for human judgement. This tests
placement and function, not comprehension or preference.

**Commits.** Initial comparison:
[800ed14](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-Naaeeen/commit/800ed14).
Refinement and actual observations:
[4fe3d0c](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-Naaeeen/commit/4fe3d0c).
See [Gate 1 record](planning/gate-1-review.md). Human choice remains open; the
student subsequently requested a more immersive direction, now being developed as C.

## E03 — Check a reviewer's prediction against the browser

**Finding.** An independent reviewer predicted that the expanded mobile menu would
hide an anchor destination. The browser confirmed that the menu stayed open, but
the assessment heading remained visible: menu bottom about y=297, heading y=327.
The parent narrowed the claim; the reviewer withdrew the unconfirmed occlusion.

**Fix.** Close the disclosure after a same-page selection and focus its destination.
Keyboard selection then reached the assessment section with the menu closed; its
heading appeared near y=138 below a roughly 90px navigation bar. A second test
found that resizing could move focus to BODY, preventing a nav-scoped Escape
handler from receiving the key. A guarded document listener fixed that case.

**Harness consequence.** CLAUDE.md gained: "For in-page navigation, verify
destination visibility, keyboard focus and mobile menu state after activation."
The reusable check belongs in the harness; selector code and pixel measurements
remain in the review record. This is a demonstrated correction rather than a
speculative rule.

**Evidence.** [4fe3d0c](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-Naaeeen/commit/4fe3d0c),
actual pointer/keyboard/resize checks at the marking viewports and independent
follow-up source review. No user enjoyment or preference was inferred from them.

## E04 — A green test can still have a faulty oracle

**Reproduction.** The original lecture-deck regex accepted `href=` text inside a
quoted title attribute. An isolated probe returned one regex match but zero real
anchors with an href when the same fragment was parsed as HTML. The earlier
harness study had identified this failure pattern, and the parent reproduced it
against the then-current expression.

**Status: resolved in Gate 2.** The real starter link was valid; the oracle was
not reliable. The parent reproduced one match for the fake title href, then ran
31 passing regression cases against parsed HTML anchors. Independent review found
no actionable issue. Valid authoring alternatives remain accepted; comments,
script text, inert templates, missing targets and decoded path escapes are rejected.
The fixed twelve-week promise is unchanged. [785b1ce](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-Naaeeen/commit/785b1ce)
records the helper, fixtures and the exact test-only parse5 dependency. This check
still does not establish whether a deck is legible or engaging.

**Evidence.** The probe and pending action are recorded in
[4fe3d0c](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-Naaeeen/commit/4fe3d0c)
and [the research record](IMPLEMENTATION-RESEARCH.md). The prior paired harness
study lives at [2b885c8](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-Naaeeen/commit/2b885c8);
its 18 mechanical passes are not 18 fully verified semantic successes.

## E05 — Add immersion within the course platform

**User feedback.** The student requested more vivid animation and permitted
additional APIs/packages if compatible with course rules. The parent rechecked the
live brief and upstream template, inspected Apple and Bruno Simon pages, and read
original maker accounts and package documentation.

**Decision.** Use an original procedural world with inspectable views and a chapter
explorer. Keep course meaning and navigation in HTML. Choose Three.js for depth,
GSAP for finite sequences, and native CSS for small states. Motion was considered
but adding a second coordinator offered little benefit. A full driving game,
external model downloads and a new framework were outside the useful scope.

**Evidence and limits.** Expanded goals:
[2bdf84d](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-Naaeeen/commit/2bdf84d).
Dependencies/research:
[e1b037f](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-Naaeeen/commit/e1b037f).
Candidate C is now ready for human review. An initial build measured 142,285 gzip bytes
for the scene chunk and 29,084 for its controller/GSAP chunk. The 571,138-byte
minified scene triggers Vite's size warning; lazy loading and actual usability,
not a suppressed threshold, must justify that cost. These are compressed-file
measurements, not observed network transfer or frame-rate measurements.

## E06 — Dependency review found a real inherited issue

**Observation.** Adding animation libraries prompted a production dependency audit.
It reported seven entries in the inherited platform, including the AVIF decoding
issue in Astro/sharp. Neither new animation library appeared in the report. Static
output does not remove image decoding during a build.

**Decision and outcome.** Apply compatible patches, retaining Astro 7.2 and the
Slop integrations. Installed versions became Astro 7.2.8, sharp 0.35.4, js-yaml
4.3.2, SVGO 4.1.0 and devalue 5.9.4. Audit then exited 0 with zero reported production
advisories. Typecheck/build/accessibility/links passed on the 18-page baseline;
the existing incomplete twelve-week test remained red.

**Evidence.** [e1b037f](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-Naaeeen/commit/e1b037f)
and primary advisory links in the research record. This is a verified dependency
refresh, not an assertion that an exploit occurred or that the whole app was
security-audited. Both planning and dependency commits were pushed and the remote
hashes matched the local commits.

## E07 — Progressive enhancement must also pass without JavaScript

**Observed failure.** The first C build failed the existing axe `landmark-unique`
rule. The chapter panels and full weekly outline used the same three accessible
region names. A direct parse of the built HTML confirmed each name twice. Client
code would later turn the panels into tabs, but that did not repair the initial
HTML or the no-script experience.

**Change.** Give weekly-outline regions distinct descriptive accessible names;
keep the checker intact. The repeated production build checked 19 pages with
zero accessibility violations; the original incomplete twelve-week check remained
red. Passing build log: `/tmp/a2-immersive-landmarks-g8ucwu3b.log`. First failing log: `/tmp/a2-immersive-first-zib1v8ya.log`.
The corrected HTML is recorded in [99b0491](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-Naaeeen/commit/99b0491).

## E08 — A source review lead needed a broader runtime correction

An independent source review identified a stale-fragment issue on cache restore.
The parent tested navigation away/back and observed the selected chapter revert,
but protocol events showed ordinary Navigation, not BFCache. A cache-only guard
therefore did not cover the actual observed path. User selection now updates the
chapter fragment with history.replaceState, while cached state is retained and
explicit hash navigation still works. The repeated browser case returned to both
the selected beginnings chapter and its matching URL.

**Evidence.** [03159e6](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-Naaeeen/commit/03159e6). Initial deep links, pointer/keyboard selection
and ordinary Back behavior were verified. The native BFCache branch received
source review; it was not exercised by this browser. The distinction matters when
explaining why the first proposed fix was insufficient.

## E09 — Inspect the first animated frame, not only the settled page

The first phone capture showed the course introduction fading from near-invisible
text. Source inspection confirmed a GSAP entrance starting at opacity zero. The
settled page was readable, but the earliest usable frame did not meet our stated
orientation goal. A separate phone inspection measured 10px model controls and a
9px illustration caption; the parent judged these too small for comfortable use.

The refinement keeps text opaque during the entrance and retains restrained
position movement. Model controls are now 12px, captions 11px and introductory
body text 16px on the phone. The first frame computed to opacity 1 and the
introduction fitted in the first viewport. This
is a visual/readability judgement, not a claim that a minimum font-size rule in the
assignment was violated. [03159e6](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-Naaeeen/commit/03159e6) also adds the CLAUDE.md check for the
first usable frame, reduced motion and HTML fallback, alongside the settled view.

## E10 — Preserve navigation when enhancements are unavailable

A real browser run with script execution disabled retained all chapter content,
static illustration and body links, but the inherited theme's menu remained inert
and its toggle could not operate. Add a plain HTML course-contents navigation for
that condition and hide the nonfunctional toggle. Also avoid adding a second
anchor offset on top of the theme's existing scroll padding: the first mobile
Assessment jump left the heading around y=335 despite a roughly 70px closed nav.
These are refinements of the student path, not reasons to replace the theme.
Status: browser verified. With scripting disabled, all three panels and five
plain course-contents links were available; the menu toggle was hidden and the
Assessment link worked. The normal menu/resize path was also rechecked.
[03159e6](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-Naaeeen/commit/03159e6) records the fixes.

## E11 — Human feedback exposed a reference gap in the artwork

**Trigger.** The student said Aincrad was not realistic or close enough to the
original and requested more and better animation. They explicitly invited existing
models and images as assets or references. Previous mechanical checks had passed
for the preview; none established recognizable fidelity or sufficient visual impact.

**Evidence and decision.** Parent inspected the official anime exterior and a CC BY
fan model. The official image shows a continuous densely layered tapered fortress,
not the previous model's separated terraces. The fan model's download required
login and its viewer reported a device-weight limit. Use these as references for
a local reconstruction and coordinated atmosphere, preserving ordinary HTML and
the established motion controls. Details and primary links are in the research log.

**Harness refinement.** Added to CLAUDE.md: “When depicting a recognizable subject,
inspect a primary visual reference and compare the rendered silhouette, proportions
and materials before presenting it for human review.” This addresses an observed
failure to ground visual work, rather than adding a generic longer design checklist.

**Changes and verification.** The new continuous fortress, clouds and wider camera
motion are paired with three animated chapter diagrams, a moving selection rail
and reading progress. Parent browser checks at both marking sizes verified the
visible output, pause, live reduced motion, views, keyboard tabs, mobile focus,
Back selection and no-script navigation/artwork. A cloud-edge artifact found in
the rendered scene was softened with a horizontal mask. The independent geometry
review also rejected an insufficient centre-only fix for embedded windows; the
final wall-aligned planes resolved its finding. See the motion record for actual
checks and limits, including the unreproduced worker-only mock-renderer checks.

The full check still has only the known incomplete twelve-week failure; type,
build, accessibility and internal links pass. No new package or service was
required for the richer motion. The parent verified private repository visibility.
[8d518f9](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-Naaeeen/commit/8d518f9)
records the goals/research/harness; [06ce955](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-Naaeeen/commit/06ce955)
records implementation and refinements. Human acceptance of this revision remains
pending; the whole course is unfinished.

## E12 — A teaching slice made source purpose part of the harness

After the student accepted C's broad direction, Gate 2 developed one full seminar
before extending all twelve weeks. Official English TV summaries and a dated
Progressive press release made preparation possible without buying a film. Their
status also constrained the lesson: they support analysis of narrative selection,
not a claim to independent survivor testimony.

The parent checked the sources, recorded passage-level support and connected a
source ledger, a worked lecture, a short argument and the Source comparison
assessment. The independent content reviewer found that B's fallback omitted the
very evidence needed for the worked inference. Adding Kirito's difficulty alone
made that alternative useful for the actual task. A later revision replaced some
generic explanation with a concrete mapping of entry, exit and collective action.

CLAUDE.md now asks each unit to connect question/preparation with a student action,
a concrete output and an assessment, and to identify a source's purpose before
using it as evidence. The precise changes accompany [4fc9cde](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-Naaeeen/commit/4fc9cde).
This implements a course-design position; no learner outcomes or student reasoning
were invented. See the [claim ledger](planning/gate-2-source-ledger.md).

## E13 — Passing layout bounds did not settle reading quality

A and B render the same Week 2 content; the parent verified the same 14 teaching
headings. B adds five direct section links and grouped study actions. The walkthrough
favoured B for locating work, while acknowledging that the parent had already seen
it and that no learner-time or learning-gain experiment had been run.

Independent review and browser checks found a contents rail hidden under the
sticky header and two falsely current navigation links. Both were corrected and
retested. All ten slides fitted the marking viewports, yet a phone card's label
sat only about 1.6px from its date. Visual review prompted a spacing change to
about 19.7px. No-script checks separately found inert controls, now replaced by
plain navigation or hidden when their function needs Reveal.

Browser state also needed checking: requested supplementary dimensions initially
remained 390x844, and hash navigation retained stale CSS after a rebuild. Those
runs were discarded and repeated with actual-size checks and a document reload.
The short follow-up CLAUDE.md rule makes that verification explicit. These are
observed evaluator and interface limits, not manufactured red tests.
[Gate 2's review record](planning/gate-2-review.md) preserves the checks and limits.
The final keyboard pass also exposed a missing Escape response on reading pages:
it had worked on the homepage because that component supplied its own handler.
Reusing the theme toggle in the shared reading layout fixed the observed behavior;
normal and resize-return browser cases now close and refocus the menu.

## E14 — A broader audit exposed development-tool dependencies

The earlier production-only audit was clear. Gate 2's full audit found six entries
in development chains: four fast-uri URL-normalization advisories and two entries
for Vitest/mocker's redirect-mock file-read issue. The parent checked primary
advisories and actual dependency paths; no production exploit was established.

Compatible patches moved fast-uri 3.1.5 to 3.1.6 and the Vitest package family from
4.1.10 to 4.1.11. The parent inspected the lock diff: fixed platform versions were
unchanged. Post-patch audit JSON contains zero advisories, and the parent's full
course check retained only the known missing-weeks failure. [2752781](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-Naaeeen/commit/2752781)
records the small dependency change. A worker's extra 71 tooling/oracle test run
is labelled separately from the parent's execution.

## Entry checklist

For a new significant event record: trigger; observed evidence; alternative;
decision and reason; source/file changes; exact harness change if any; actual
checks; remaining limits; commit link; real human feedback. Revise this entry when
new evidence corrects it. Do not invent failures, timings, personal learning or
participants to make the eventual PROCESS account look stronger.

## E15 — Requirement checks changed the size of the course work

The student challenged whether twelve complete weeks were necessary. The parent
reopened the live spec and upstream README: twelve dated weeks are required,
but only one lecture-linked deck is the minimum. The earlier broad expansion
plan could have become twelve copies of the long Week 2 example. Instead Gate 3
uses concise guides with distinct outputs and selected lecture notes. The weekly
progression now reaches an exhibition rather than multiplying slide packages.

CLAUDE.md now requires a live/local audit at gate starts, material scope changes
and delivery. The exact requirement/choice distinction lives in the requirements
audit. [1c27051](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-Naaeeen/commit/1c27051bc85009e128952a9afff34729670ddc04) contains the complete dated course and harness change.
The parent inspected the generated API and the previously red week-coverage check
now passes with weeks 1–12. No requirement or test was deleted to obtain that pass.

## E16 — An immersive atlas still had to behave like a webpage

The student requested more imaginative UI and motion. The atlas uses original
SVG settings, animated traces and an equivalent reading list, drawing on
source-checked responsive visual-story principles. It reuses the installed GSAP;
no new package or remote service was needed. Both views contain identical source
notes and study routes, with different presentation and navigation.

The first build found duplicate named landmarks. Independent review exposed a
sticky toolbar hidden by the site nav, a controls URL that lost its selected
world, and a history handler that redirected the native skip link to world notes.
The parent reproduced these in the actual browser before accepting the fixes.
After the fixes, a phone screenshot still clipped the world's label when focusing
its heading; scrolling the enclosing panel kept identity and title together.

[1c27051](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-Naaeeen/commit/1c27051bc85009e128952a9afff34729670ddc04) records the implementation and the small CLAUDE.md instruction
to preserve native skip links/history. The parent checked both marking sizes,
keyboard and pointer selection, reload/Back/Forward, pause/reduced motion,
offscreen suspension and static HTML. A same-content comparison supports keeping
both map and reading views for review; it does not prove a learning benefit or
human preference. The [Gate 3 record](planning/gate-3-review.md) separates actual
browser observations, mocked review checks and unmeasured behavior.

## E17 — A complete-looking brief left a real student question unanswered

Independent content review found that filenames and deadlines did not explain
how a student hands work in, or when feedback returns before the next task.
The parent verified the gap and added one shared procedure, fictional hand-in
sessions, an access alternative and feedback dates. All three briefs link it.
Slides/document/webpage options are now consistent across the exhibition brief
and Week 12. These are proposed course arrangements, awaiting human review.

A later API inspection also caught that planned learning outcomes had not reached
the student-facing site. Trying the generic integration's optional field failed
against the starter's narrower local strict schema. The parent checked that
schema and restored the record unchanged, publishing the outcomes through the
existing course-outline data instead. The existing validation caught a mistaken
assumption; it was not relaxed. [1c27051](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-Naaeeen/commit/1c27051bc85009e128952a9afff34729670ddc04) preserves the resulting pages.

## Gate 3 checkpoint (historical)

Gate 3 was ready for the student's review. Gate 2 continuation was explicitly
authorized. The full site check passes 36 tests and the configured integrity
checks across 42 pages; the dependency audit has zero advisories. The only
remaining evidence-gate failures are the PROCESS.md template and its example
hashes. The student's narrative, Gate 4 whole-site refinement and Gate 5 public
release remain open. No Gate 3 human acceptance or public deployment is claimed.

## E18 — Historical framing changed the work, not just the nouns

The student clarified that SAO should be treated as events in a real historical
world, with an accessible beginning for readers unfamiliar with it. The old Week
2 compared media publicity and production dates. Merely deleting the word
“fictional” would have left that underlying assignment unchanged.

The parent rechecked official episode/device sources and the image-based Fairy
Dance introduction. Required reading became onsite, course-compiled accounts with
stable paragraphs, while actual works/adaptation provenance moved into linked
credits. Seminars, selected notes, the deck and assessments now analyse those
accounts and supported event chronology. No witness documents or quotes were
invented. Independent review caught three remaining assignment/reading mismatches;
parent corrections were read back. The implementation and small historical-voice
CLAUDE.md rule are in [9741b89](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-Naaeeen/commit/9741b8908915bac9fda81faf8aad5d7cdde1a7dd). Human acceptance remains pending.

## E19 — A menu was not enough to explain the learning route

The student could not tell where to start among peer-level categories, but also
wanted Atlas and other important pages visible. The chosen response combines a
Start page and twelve-week itinerary with a separate resource desk. It retains
direct exploration and reference access rather than hiding every resource in a
Library. Each week connects reading order, meeting, output, follow-up and deadline.

A browser review then found the phone week picker below the full rhythm explanation
at y=1384. Moving it to the header made all twelve links visible in the first
390x844 view. Begin Week 1 is also visible at about y=478–542. The cross-week Week
9-to-Week 2 note route works and Back restores the chosen week. These observations
support a design decision; they are not a timed novice study or learning result.
CLAUDE.md now explicitly checks first-use and returning-student actions at phone
size. [9741b89](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-Naaeeen/commit/9741b8908915bac9fda81faf8aad5d7cdde1a7dd) contains the change and six generated-output checks.

## E20 — A compiling deck was still clipped and exposed old links

The actual embedded frame revealed duplicate centering: Reveal's inline top
offset combined with a full-height grid moved native navigation outside the
frame. Browser accessibility also exposed old Next links from past slides because
display:grid overrode hidden state. Finally, MDX smart punctuation changed inline
JavaScript quotes into invalid code despite a successful build.

The fixes reset the slide inset, scope hidden-slide styling to normal screen
presentation and move the inline code into an Astro component. The parent checked
actual emitted-script syntax and all ten slides at both marking sizes, inline and
standalone; native Next was unambiguous and keyboard focus could leave the frame.
Independent review separately found a reload-state problem in the outer controller;
its reset was corrected and reviewed, while a frame-only real-browser reload was
unavailable. CLAUDE.md now checks emitted code and actual frame/focus behavior.
[9741b89](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-Naaeeen/commit/9741b8908915bac9fda81faf8aad5d7cdde1a7dd) records these fixes; the review record retains the unattributed
observer error and unverified blocked-network case instead of calling everything
error-free.

## E21 — A student's screenshot caught a compact-layout collision

The student reported arrows overlapping “02” and “03”. Parent inspection confirmed
the compact rhythm's 28px gap inherited a 30px arrow offset. The connector now
centres in a shared gap, clearing the following number by about 6px at 1024px and
10px at 1280/1920px. Phone presentation keeps vertical connectors. An independent
review also caught a picker-spacing rule losing to a stronger reset; it was fixed
before the final check. [9741b89](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-Naaeeen/commit/9741b8908915bac9fda81faf8aad5d7cdde1a7dd) contains both repairs. This is a genuine
human-reported defect; no artificial red test or invented participant was needed.

## Gate 4 checkpoint (historical)

Gate 4 was ready for the student's review; the whole-assignment Goal pauses at this
requested gate. The final site check passes 42 tests across 45 pages. PROCESS.md
remains the student's unfinished account, with its template and example hashes
correctly failing the evidence gate. Public release and Gate 5 remain open.

## Gate 5 evidence preparation (historical checkpoint)

The student asked to begin preparation and receive two Chinese review copies.
The English PROCESS draft is grounded in their supplied statements and verified
commits, with Crit 5 reuse and agent/student roles explicit. Full Chinese PROCESS
and CLAUDE translations are in docs/review; their source hashes are pinned in
manifest.json. Independent review found no material issue. Parent citation/link
checks and pnpm check:evidence pass. The student has not yet approved the narrative.
No public deployment or additional application-test run is claimed in this prose
pass. Apply feedback to both languages before completing the release candidate.

### Focused PROCESS revision

The student's follow-up asked for a narrower narrative demonstrating how research,
maintained goals/docs and substantive review shaped agent use. The current English
draft is 510 words and directly recommends the goals, research and evidence records
for tutor inspection. Parent checked the frozen external grader in run_trials.py,
the 18 scored runs in results-summary.json and the actual rule/implementation diffs.
Independent review corrected ambiguous wording about the instruction variants and
made the document-creation citation explicit. The Chinese account is synchronized.
Student confirmation of the narrative remains pending; this is evidence preparation,
not a new website implementation or a public release.

### Plain-language PROCESS comparison

The student twice asked for less abstract process writing, then requested multiple
A/B comparisons. The parent fixed facts/criteria before two rounds, each assessed
by two new reviewers with sample order reversed. The final version combines the
stronger supported course-change chain with a simpler opening and concrete terms.
Parent verified the flagged chronology with 4fc9cde / 1c27051 and removed the ungrounded
personal-motivation sentence. Actual samples and model-review observations are in
docs/review/process-comparison; they are not human preference data. A small
CLAUDE.md rule now asks for concrete requests, observations and resulting changes.
The English account is 520 words; its Chinese copy is synchronized for user review.

### Research-to-instructions clarification

The student asked where initial agent-practice research was stored, what the
compared 'rules' actually were, and how selected findings were followed. They
allowed up to 600 words. The 594-word revision names the research folder and the
CLAUDE/AGENTS reading path, describes selective adoption and the broader workflow,
and includes concrete behaviour checks from the evaluation tasks. Parent and
independent review verified the protocol and runner: the varied factor was CLAUDE
content, while model/effort were fixed. No CoT A/B was added to the narrative.
Reporting-honesty checks are described as evaluation, preserving the role of
semantic review. The Chinese account is synchronized for the student's review.

## English submission draft — historical checkpoint

The student asked to replace discussion of PROCESS editing with an implementation
case. The selected ending uses E11: their rejection of Aincrad's first likeness,
primary-reference research, the actual reconstruction and its CLAUDE/browser checks.
The opening reflects their newly supplied judgement about preparing a good agent
framework. PROCESS is 598 words; the goals-file requirements for agent practice are
explicit. No grade or new experimental result is claimed.

The student required all current files to be English. The harness report has a
complete English translation; four Chinese review copies were hash-verified in
the Windows workspace before removal from this tree. Earlier notes that locate
those copies in docs/review describe their former locations. Historical commits
remain intact. Future translations stay outside the submission repository.

## Final audit: support outside attendance — 28 September 2026

Independent review found a circular instruction: an absent student needed Mara
to arrange support, while the only contact route required attending class. The
parent added proxy hand-in with a receipt and a sealed written-request route,
then linked it from both staff profiles and the people index. Independent readback
found the four-file change consistent. The rebuilt policy anchor works, and the
full required check still passes 42 tests. The existing CLAUDE requirement to inspect
student journeys covers this finding; no additional standing rule was needed.

The student froze PROCESS.md during the final audit; the parent restored the
reviewed version and made no further narrative edits. Full verification and the
remaining public-release boundary are in the [final audit](planning/final-submission-audit.md).

## Course judgement in the final account — 28 September 2026

The student subsequently authorized a targeted PROCESS revision and asked for
approximately 600 English words. The revised ending explains why guided weekly
study and visible reference pages were both necessary, what the agent checked
before progression, and why coherence, voice and appeal remain human judgements.
The 3D likeness example was removed from the short account; its implementation
evidence remains in the earlier entries. The parent checked the actual plan,
review and cited diffs; independent readback found the new claims supported.
See the [focused revision record](review/process-comparison/course-judgement-revision.md).
