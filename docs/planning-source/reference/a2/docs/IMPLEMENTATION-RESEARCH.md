# Implementation research and decision record

Updated: 27 September 2026. Scope: After Aincrad, COMP4020 Assignment 2.
This is an English working record, updated when evidence changes a decision.
[Detailed goals](planning/implementation-goals.md) define the human review gates;
[PLAN.md](../PLAN.md) holds the current state. Research is evidence to evaluate,
not permission to change tools, settings or assignment requirements.

## Delivery position

The student traced their interest in computing to Sword Art Online. That gives
this course a specific question: why keep building and inhabiting virtual worlds
after their failures? A historical sequence can hold technical explanations,
ordinary relationships and institutional conflict together. A franchise recap
would describe what happened; each teaching week must also ask students to use
sources to explain a consequence or challenge an interpretation.

The first review compares two homepage treatments with the same outline. The
course remains a proposal until the student has reviewed its representative unit.
The public website is not yet complete. Review routes are explicitly marked and
unlisted; existing starter pages are not evidence of completed curriculum.

## What the assignment rewards

Primary authority: the live [A2 brief](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/assessments/assignment-2/)
and [assessment rubric](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/topics/assessment/),
checked 27 September. A2 weights process 45%, artefact 20%, response 35%. The HD
bands call for corroborated decisions, robustness in use and a distinctive,
sustained response. They do not specify a number of research papers or agent runs.

| Contract | Where it will be realised | Verification |
| --- | --- | --- |
| Twelve dated teaching weeks | sessions collection and timetable | Distinct week numbers and date bounds in generated API; human review of progression |
| Course identity and assigned digits | course-config.ts | Existing schema and suffix test |
| Assessment weights total 100% | Three connected briefs, 20/30/50 | Generated API total; human workload/alignment review |
| Lecture links to a real deck | Representative unit, then chosen lecture set | Built lecture link, real deck route, actual slide reading |
| Fixed platform and Slop identity | Existing build, keys, API, crest and brand tokens | Diff inspection and build; no stack replacement |
| Replaced starter material | Authored content and course-specific artwork | Evidence gate plus direct reading |
| Usable at both marking sizes | All student journeys | Build accessibility checks plus browser at 1920×1080 and 390×844 |
| Account supported by history | PROCESS.md, CLAUDE.md, spec and commits | Real commit citations and student-confirmed reasoning |
| Public working submission | Course GitHub Pages URL | Verify deployed URL after explicit shipping authorization |

The supplied README and installed theme are the authority for local implementation
contracts. The initial snapshot used Astro 7.2.2, university theme 0.13.2 and Slop theme 0.1.0; the later dependency refresh below records Astro 7.2.8 in the current
manifest/installation. No new dependency is needed for the first comparison.

## Course teaching: techniques to carry forward

These are the actual HTML lecture decks, not summaries of their titles.

| Primary course source | Evidence and application |
| --- | --- |
| [Week 3: Backpressure](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/lectures/week-3/) | Useful checks identify a particular defect and remain trustworthy. Verify production output and base paths. Do not add a test merely to increase the count. |
| [Week 4: Context engineering](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/lectures/week-4/) | Persistent guidance and on-demand procedures serve different needs. Keep current decisions in the plan and detailed research outside the standing harness. |
| [Week 5: Verification](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/lectures/week-5/) | Inspect actual runtime evidence and turn observed behavioral defects into appropriate regression checks. Keyboard use, screenshots and the console reveal different failures. |
| [Week 6: Evidence of practice](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/lectures/week-6/) | Trace decisions through history, then retain useful corrections and prune stale rules. The final A2 process account connects course-design choices to encoded rules and deliberate human judgement. |

Our extension of these ideas is project-specific: compare shared-content design
alternatives, independently inspect the evaluator, maintain adaptation-level
source provenance, and use actual human review to calibrate editorial and visual
judgements. This is a proposed workflow, not a measured claim that it exceeds all
classroom practice.

## Research beyond the course

| Source and evidence type | Finding used here | Limits and decision |
| --- | --- | --- |
| [Anthropic, Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents), engineering experiment | Incremental work, progress records and browser checks addressed observed agent failures. | Model/task-specific experience; use a representative teaching slice and compact handoffs, not an assumed universal initializer architecture. |
| [Anthropic, Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents), engineering guidance | Deterministic, model and human judgements cover different properties; model judges need calibration. | A second model is not a student. Require evidence for review findings and retain the user's own decisions at each gate. |
| [Simon Willison, Agentic manual testing](https://simonwillison.net/guides/agentic-engineering-patterns/agentic-manual-testing/), practitioner account | Running and visually inspecting the result can expose gaps in automated tests; preserve demonstrated outcomes. | Adopt the method with existing browser tools, without installing the author's preferred utilities. |
| [W3C WAI, Easy Checks](https://www.w3.org/WAI/test-evaluate/preliminary/), standards-body guidance | Titles, headings, image alternatives and keyboard access require examination of the real page. | These are preliminary checks, not a claim of full accessibility certification. |
| [Australian Government, plain language guide](https://www.stylemanual.gov.au/style-manual-resources/quick-guides/quick-guide-plain-language), editorial guidance | Put reader needs first, use familiar terms and make actions easy to identify. | Evaluate the student's task and comprehension, not a rigid sentence-length score. |
| [Kobak et al., excess vocabulary, v5](https://arxiv.org/abs/2406.07016v5), empirical paper | Large-scale biomedical abstract vocabulary changed alongside LLM adoption. | Population-level evidence is not an authorship detector for an individual passage or a blacklist of forbidden words. |

The parent re-opened these primary sources and inspected relevant passages after
receiving bounded research reports. Reports are leads, not authority. Research on
OpenAI, Claude Code, empirical instruction-file studies, practitioner settings and
an official webinar is already recorded in the [earlier source register](harness-research/sources.md)
and [harness report](harness-research/REPORT.md); retain their model/version and
experimental limits rather than repeating the entire survey.

### Earlier experiments that remain relevant

The existing [results summary](harness-research/results-summary.json) records 18
scored trials: six original-versus-v2 pairs, then three original-versus-final-v3
pairs. All passed their mechanical grader. This does not mean 18 semantic
successes, a full six-case rerun of v3, a Claude-versus-Codex comparison, or universal
speed improvement. Independent review found a false-positive pattern in a
generated deck-link regex; evaluator scope also needed correction during the pilot.

The revised [AGENTS.md study](https://arxiv.org/html/2602.11988v2) and
[efficiency study](https://arxiv.org/html/2601.20404v2) are already analysed there.
They do not establish one best instruction length, compaction percentage or agent
count. The practical decision is to preserve the current concise harness and make
small justified changes. The user-requested [practitioner repository](https://github.com/shanraisshan/claude-code-best-practice/tree/b70072cc2fed48b710ddb555b66c3d0ad7c40641)
is an idea index, not a permission or settings preset.

## Writing review

Look for empty promises, abstract praise, repeated section rhythms, vague actors,
unearned certainty, redundant disclaimers and conclusions that merely repeat the
opening. Those are editorial problems whether a human or model wrote the words.
Keep qualifications that affect source interpretation or an actual decision.

For each weekly page ask: what happened, whose account supports it, what is the
question, and what does a student do next? Keep a historical voice after a concise
statement of the fictional premise. Do not repeat implementation details to
students. Explain Full-Dive, AR and artificial life at the point where each concept
helps explain an event. Avoid replacing the course's distinctive interests with
generic warnings about technology.

A later paired editorial comparison will hold evidence and intended meaning
constant while comparing an abstract opening with a concrete one. Only real user
responses will count as comprehension evidence. Model comments will be labelled
editorial review.

## SAO source and media decisions

| Primary source | What it currently supports | Boundary |
| --- | --- | --- |
| [Official series portal](https://www.swordart-online.net/) | Identifying the chosen television arcs and films | A navigation page is not enough evidence for detailed episode claims. |
| [Progressive: Aria introduction](https://sao-p.net/aria/story-character/) | Return to early Aincrad, with Asuna's perspective | Compare adaptations explicitly; do not treat the films as sequels after Alicization. |
| [Ordinal Scale story](https://sao-movie.net/us/story/story.html) | The 2026 setting and Augma's AR distinction from Full-Dive | Do not infer every memory mechanism from promotional synopsis. |
| [War of Underworld introduction](https://sao-alicization.com/intro/) | Underworld conflict and artificial intelligence as central stakes | Add episode/scene-level sources before teaching more detailed claims. |

These pages were checked directly. The course year 2035 is an invented teaching
frame; event dates and publication dates remain separate. Selected scenes should
be identifiable without requiring viewers to purchase or watch the entire series;
short background notes and open official material support access. Readings and
claims will receive specific references when the representative unit is authored.

The first preview uses original vector artwork, drawn in the Slop palette, as an
interpretive illustration. It carries no claim to reproduce a canonical map.
Official source pages are linked. Their images have not been downloaded or
relicensed. Later media decisions will record the creator, URL, use and reuse basis;
attribution alone will not be treated as permission for public republication.

## Comparison protocol: Gate 1

Question: should the homepage lead with an archival narrative or immediate course
orientation? A and B use one shared course outline, assessments and source set.
Both preserve the institutional identity. Information order and composition vary;
this is a paired design comparison, not an isolated-variable causal experiment.

Tasks for inspection:

1. Identify the course, audience and central question.
2. Find the week about Ordinal Scale and its historical question.
3. Find what the exhibition is worth and whether coding is required.
4. Locate the source/continuity boundary and navigate between A and B.

Inspect desktop and mobile layout, headings, focus, navigation, overflow and console.
Record actual observations and refinements in the Gate 1 review note. The user then
judges appeal and clarity. No fabricated timing, participant count, preference or
statistical significance will be reported.

## Decision log

| ID | Decision | Evidence | State / next check |
| --- | --- | --- | --- |
| R01 | Preserve the gold/bronze Slop identity and create original archival artwork | README and installed slop.css; approved historical course premise | Preview built and visually inspected; see Gate 1 review |
| R02 | Use unlisted preview routes before selecting a homepage | User requires review before expansion; avoids presenting unfinished curriculum as complete | Both variants inspected; human preference remains pending |
| R03 | Reuse current harness study; add precise review-gate and research pointers | Existing paired results and this explicit user request | Six planning/research lines added, then one navigation-check refinement; no new benchmark claim |
| R04 | Stage the full curriculum after a complete sample unit | User's gates and incremental-delivery evidence | Gate 2 begins only after Gate 1 feedback |
| R05 | Keep the existing checkout with exclusive file ownership | Known planning changes and no conflicting implementation worker | Reassess isolation if edits overlap; no mechanical worktree creation |

## Next review triggers

Update this record when a new API is needed, a source contradicts the course text,
a browser/test failure changes the approach, a comparison changes the design, or
human feedback alters the goal. For a routine known edit, check the relevant local
contract instead of reopening a broad literature survey. Log the question, evidence,
choice, observed result and unresolved limit. Keep this file useful to the next
implementation step rather than accumulating unrelated references.

### Evaluator probe, 27 September

A read-only reproduction compared the current lecture-link regex with linkedom
(the parser already installed with the theme). The invalid fragment
`<a title="Use href='/comp4020-ass2-Naaeeen/decks/week-01/'">Slides</a>`
produced one regex match and zero actual anchors with an href. This confirms the
previous study's blind spot in the current spec implementation. No site content
was modified by the probe. Correct and regression-test the parser before relying
on the deck-link assertion for the representative teaching unit. The valid starter
deck link itself was not shown to be broken.

### Gate 1 outcome

[The review record](planning/gate-1-review.md) records the initial comparison,
actual browser defects, two refinements and independent review reconciliation.
We consulted the [W3C disclosure example](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/)
when fixing mobile fragment navigation. Its ordinary navigation semantics and
Escape/focus behavior informed a small page-local handler. The example is guidance;
passing our focused cases does not establish assistive-technology certification.

The first phone composition delayed course orientation. Moving the premise and
prerequisites into the shared opening brought them into the first viewport in both
variants. We retained two valid alternatives for the student to judge. No human
A/B result has been collected, and no full course-completion claim is made.

## Immersive design revision — 27 September

The student asked for a more vivid, immersive result, research beyond course
websites, suitable additional APIs/packages, and implementation commits/pushes.
The [goals](planning/implementation-goals.md) were expanded and pushed in
`2bdf84d`; the remote hash was checked against the local commit. This is a Gate 1
revision, not an assumed A/B preference or permission to skip human review.

### Platform permission

The live [brief](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/assessments/assignment-2/)
and [upstream README](https://github.com/comp4020-agentic-coding-studio/template-course-site/blob/main/README.md)
allow custom components and visual treatment while retaining Slop identity,
collections, build and generated API. They do not impose a general ban on added
browser libraries. We infer that a self-hosted decorative scene and motion library
fit these customization points; neither replaces the Astro stack or course API.
No hosted service, account, live-data API or key is needed for this candidate.

### References examined and their use

| Reference | What was actually examined | Transfer to After Aincrad |
| --- | --- | --- |
| [Apple AirPods Pro](https://www.apple.com/airpods-pro/) | Live browser opening and scrolled sections: large product image, clear type, retained navigation, transitions into short visual chapters | A single dominant hero scene, readable introduction and sectional storytelling; no copied product assets or claim about Apple's private implementation |
| [Bruno Simon](https://bruno-simon.com/) and [Folio 2025 source](https://github.com/brunosimon/folio-2025/blob/main/readme.md) | Live opening miniature scene and author README describing ordered simulation/rendering and an asset pipeline | A cohesive original miniature world with a controlled palette; use a small inspectable scene, without recreating a driving game or borrowing its art |
| [a-lign: Webflow Symphony](https://www.a-lign.studio/work/the-webflow-symphony) | Original author case study describing chapters, timeline navigation and GSAP sequencing | Tie animation to a narrative structure; keep the story understandable without motion. The full live Symphony experience was not browser-tested here |
| [The Pudding: Scrollama](https://pudding.cool/process/introducing-scrollama/) | Original 2017 explanation of intersection-triggered story steps and a persistent graphic | Learn the text-to-visual relationship; use current browser/layout techniques and ordinary mobile flow rather than importing an old desktop implementation |

A research subagent supplied leads and limitations. The parent independently read
the original sources and inspected the Apple/Bruno pages. Bruno's rendered entry
scene demonstrates art direction; its minimal accessibility-tree text also reinforces
our decision to keep course navigation and meaning in ordinary HTML. This is a
local design inference, not an accessibility audit of his portfolio.

### Dependency decision

| Candidate | Verified current evidence | Decision |
| --- | --- | --- |
| Native CSS/Web Animations | [MDN Web Animations guide](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API/Using_the_Web_Animations_API) documents playback controls; existing CSS handles normal hover/focus feedback | Keep native styling for small states and maintain visible default content |
| GSAP | npm and installed package **3.15.0**; [official docs](https://gsap.com/docs/v3/) cover sequencing and [media-query cleanup](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/) | Adopt one coordinator for finite entrances and chapter transitions, with explicit pause/reduced-motion handling |
| Motion | npm **13.4.4**, MIT; [vanilla quick start](https://motion.dev/docs/quick-start) confirms React is not required | Credible alternative, not installed alongside GSAP because two coordinators add little to this candidate |
| Three.js | npm and installed package **0.186.1**, MIT; current renderer source inspected; **@types/three 0.186.0** installed | Lazy-load one original procedural illustration with HTML controls and a static SVG alternative |

The researcher's Three.js development-branch version differed from the published
package. We used the registry and installed manifest to resolve it. GSAP is under
its [standard no-charge licence](https://gsap.com/standard-license), not MIT;
Three.js's installed MIT licence was checked. Package versions are pinned. These
choices reflect this proposed experience, not a benchmark proving one library best.
Registry unpacked size is not the website's transfer size; measure built chunks.

### Motion and access decisions

[W3C's pause/stop/hide guidance](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)
and [tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) inform the controls.
The scene will have a clear pause control; reduced motion will produce immediate
state changes. Canvas contains illustration only. Chapter content exists in the
server-rendered page and becomes an accessible tab interface after initialization.
Keyboard support follows its actual orientation and must survive live resizing.

Candidate C combines an inspectable floating world, finite typographic entrance,
chapter selection and the complete twelve-week outline. Its illustration is a
course interpretation, not a canonical map. Self-hosted code and procedural artwork
avoid blocking the course on an external content service.

Provisional engineering targets: additional compressed animation/scene JavaScript
around 300 KB or less, one canvas, device pixel ratio capped at 1.5, and no running
scene loop while hidden/offscreen/paused. These are our targets to inspect, not
assignment requirements or measured outcomes. Actual results belong in the
[motion review record](planning/gate-1-motion-review.md).

### Dependency audit follow-up

`pnpm audit --prod` reported seven advisory entries in the existing platform
(Astro, sharp, js-yaml, SVGO and devalue); neither added animation library appeared
in the report. The [Astro AVIF advisory](https://github.com/withastro/astro/security/advisories/GHSA-26w7-cxv4-gfx2)
and [sharp advisory](https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c)
require processing malicious image input. Static deployment does not eliminate
image decoding during builds, so the compatible patch was worthwhile before
adding new media. This was an advisory finding, not evidence of compromise.

An independent source triage agreed on Astro 7.2.8 and sharp 0.35.4. The parent
checked the actual installed manifests and lockfile after a targeted update:
Astro **7.2.8**, sharp **0.35.4**, js-yaml **4.3.2**, SVGO **4.1.0**, devalue
**5.9.4**. Existing Slop/theme package versions and integration configuration are
unchanged. The devalue advisory's metadata and description disagree on its first
fixed version; the installed 5.9.4 exceeds both stated thresholds.

The follow-up production audit exited 0 with zero reported advisories. The
post-update baseline build checked 18 pages, with no type/accessibility/link error;
four spec checks passed and the existing twelve-week coverage check remained red.
Local build log: `/tmp/a2-motion-dependencies-0q0k4auc.log`. This validates the
compatible refresh, not the still-in-progress C preview or all possible security
properties. The working three-dimensional scene module also typechecked in this
run; its visual and real browser lifecycle validation remain separate.

### Motion revision results

[The motion review](planning/gate-1-motion-review.md) records the actual cases and
limits. The browser showed a near-invisible initial text entrance, tiny phone
labels, an inherited no-script menu gap and stale chapter return state. We kept
text opaque, enlarged labels, supplied plain no-script navigation, and used the
[History API](https://developer.mozilla.org/en-US/docs/Web/API/History/replaceState)
to keep the selected chapter's deep link current without adding history entries.
The final source reviewer found no actionable issue. [03159e6](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-Naaeeen/commit/03159e6)
contains the refinements and the corresponding CLAUDE.md checks.

Scene/control compressed files total 171,420 gzip bytes, inside our provisional
300 KB target. The raw optional scene remains above Vite's 500 KB warning threshold;
we kept the warning, tested delayed/failed loading and retained the static alternative.
No GPU frame-rate claim follows from the measurements. Vendor notices stripped by
minification are carried in a linked public notice file. The student's preference
between A/B and the immersive C direction is the next decision, not an agent score.

Consequential review findings and rule changes now feed the curated
[process evidence bank](PROCESS-EVIDENCE.md), as explicitly requested by the student.

## Reference-led Aincrad revision — 27 September 2026

**Trigger.** The student found C's Aincrad insufficiently faithful and its motion
too limited. This is actual negative design feedback, not an inferred preference
or a failed automated test. They invited existing official/fan imagery and models
for the private preview.

| Primary source | Verified evidence | Decision / limit |
| --- | --- | --- |
| [Official SAOA art award](https://www.swordart-online.net/SAOA/) and [Aincrad exterior](https://www.swordart-online.net/SAOA/img/10/thumb_01.jpg) | Parent inspected the image: continuous tapered grey body, closely layered bands, broad lower mass, radial arms and hanging structures, small summit | Use as the original-anime visual anchor; proportions are observations, not canonical measurements. Reference only, not a copied site asset |
| [Official episode 2 synopsis](https://www.swordart-online.net/aincrad/story/?id=ep02) | The Japanese synopsis explicitly describes one hundred floors | Support the dense layered structure; no unverified kilometre dimensions |
| [Castle Aincrad, mhil](https://sketchfab.com/3d-models/castle-aincrad-d1069b4ceb054f328d26fd444e3ea617) | Parent checked public model metadata: CC BY 4.0, downloadable, 169,062 faces and 85,033 vertices. Browser inspection showed its rendered exterior and a device-weight warning. Download opens a login dialog | Useful silhouette reference. No model downloaded, imported or viewer buffers extracted; original file formats/sizes remain unverified |
| [TheGabmeister: Aincrad](https://thegabmeister.com/p/aincrad/) | Creator describes dynamic lighting, cloud cards/TrueSky and a modified StefansArya mesh | Transfer layered atmosphere and light to a lightweight local illustration; no assumption that the creator's textures/mesh are licensed for reuse |
| [Three.js LatheGeometry](https://threejs.org/docs/pages/LatheGeometry.html), [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) | Current primary APIs support a revolved body and scroll-linked composition | Check installed Three 0.186.1 / GSAP 3.15.0 and the actual result. Additional services are unnecessary for this bounded revision |

The first model optimized for a small warm miniature before establishing the
recognizable structure. Its open terraces and large golden castle were a poor
match for the reference. Slop's UI palette remains fixed; that does not justify
recolouring the depicted architecture. The revision retains the course's identity
while using a cooler material palette inside the artwork.

Initial acceptance plan: compare the new render with the inspected reference and
the saved old C screenshot, then exercise pause, device
preference changes, native scroll, responsive tabs and fallback. Do not report a
build or a source review as proof of resemblance or smooth frame rate.

### Additional primary design accounts checked by the parent

- [Lusion's Oryzo production account](https://blog.lusion.co/oryzo-bts-part-2-7-3d-design-and-motion-graphics) describes testing several representations, then concentrating detail where the camera sees it and combining detailed props with simpler surfaces. Our inference: a constrained, carefully lit fortress and cloud layers can improve this hero without importing its expensive production pipeline. We did not benchmark or copy their splat assets.
- [Active Theory's founders](https://www.commarts.com/webpicks/active-theory-2) describe a simple navigation structure with scroll-responsive feedback and WebGL atmosphere. Our inference: keep stable HTML course links, use animation to respond to selection, and concentrate visual spectacle in the world. No networked cursor system is needed here.
- [Three Material documentation](https://threejs.org/docs/pages/Material.html) explains the draw-call cost of double-sided transparent materials and the grain tradeoff of alpha hashing. Use few shared cloud layers and check transparency in the actual renderer.
- [GSAP matchMedia](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/) documents automatic animation/trigger reversion on media-query changes and separate custom cleanup. The existing explicit lifecycle may be retained if it covers those same transitions; adding a second lifecycle abstraction is not itself an improvement.

These source accounts inform design decisions. They do not establish that our
implementation shares those studios' quality, performance or production budget.

### Revision 2 implementation and verified outcome

The new scene uses Three.js 0.186.1 with an original revolved shell of 100 floor
bands, lower foundation, radial bridges, a small summit, generated surface maps
and layered cloud cards. No remote image, model, account or additional service is
required at runtime. The student subsequently asked for both more 2D/3D animation
and larger amplitude: normal mode now uses about +/-18 degrees of slow yaw,
larger cloud travel and a bounded scroll-dependent camera change. The site adds
three chapter SVG compositions, path drawing and a traveling marker, a moving
selection rail, stronger finite entrances, hover feedback and a reading indicator.

The installed GSAP timeline API was checked against the
[primary timeline documentation](https://gsap.com/docs/v3/GSAP/Timeline/). Native
passive scroll events plus one scheduled animation-frame callback were sufficient;
ScrollTrigger was evaluated but not added. Reading progress is functional and
continues under reduced motion; nonessential movement is stopped.

The parent inspected the render at verified 1920x1080 and 390x844. The continuous
body, foundation and bridges now correspond to the inspected exterior reference,
while the actual artwork remains an original interpretation. The larger effects
were checked in use, not inferred from CSS duration values. Paused hero captures
were identical. The visible SVG marker changed coordinates while running and
reduced-motion chapter captures were identical. All three views remained usable
in reduced mode; mobile navigation closed and focused the requested assessment.
Responsive keyboard tabs, selected-fragment Back behavior and the no-script
content/navigation/artwork were checked. See the revision test record for limits.

Independent source review found windows embedded in the sloping exterior. The
first centre-offset correction was insufficient at their lower corners. The final
planes follow the actual wall normal above the floor lip; the reviewer confirmed
that this resolves the geometry relationship. A separate worker reported isolated
mock-renderer geometry/lifecycle checks; its inline harness was not retained, so
those are not described as parent-reproduced tests or real GPU profiling.

Parent visual inspection found abruptly clipped clouds at the canvas edges. A
horizontal edge mask softens those boundaries without fading the central fortress.
No style or integration change was made to the fixed Slop branding or platform.

Full check: `/tmp/a2-aincrad-final-77p3_n74.log`, zero type errors/warnings/hints,
19-page build/accessibility/links passed, spec four passed/one known incomplete
twelve-week failure. After the cloud-only CSS refinement the build passed again:
`/tmp/a2-cloud-edge-refinement-jqe4o4x6.log`. Optional scene raw/gzip bytes:
575292 / 144638; controller+GSAP: 79314 / 30250; combined gzip 174888 bytes.
This measures compressed output, not hosted transfer or GPU timing. The raw chunk
warning remains visible. Production dependency audit returned zero advisories.

Implementation: [06ce955](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-Naaeeen/commit/06ce955).
Goals, research and reference-checking harness rule: [8d518f9](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-Naaeeen/commit/8d518f9).

### Browser-check recovery

Two test-tab handles disappeared from the browser session, and the 127.0.0.1
origin later reported DPR 1.8 and a smaller CSS viewport than requested. These
were recorded as verification-environment problems, not website bugs. Reusing
the connected browser and opening the same local build at localhost produced
DPR 1 with measured 1920x1080 and 390x844 viewports. No browser profile, global
setting or permission was changed. The cause of the disappearing tabs was not
established; the successful replacement checks are the acceptance evidence.

## Gate 2: from an accepted scene to a teachable unit

The student accepted revised C's broad direction and restated the process
requirements. Continue one slice at a time, then stop for human judgement. The
[claim ledger](planning/gate-2-source-ledger.md) and
[comparison/check record](planning/gate-2-review.md) make the next step inspectable.

### Requirements and upstream recheck

The parent re-read the [A2 brief](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/assessments/assignment-2/)
and current [upstream README](https://github.com/comp4020-agentic-coding-studio/template-course-site).
A representative unit is our review milestone; the final requirements still
include the whole coherent course, dates, weights, deck, checks and evidence.
The [week 4 context lecture](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/lectures/week-4/)
and [week 5 verification lecture](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/lectures/week-5/)
remain relevant to concise guidance and actual-output verification. Researcher
findings about lecture guidance are treated as recommendations, not new fixed
platform rules or permission to install unrelated tools.

Upstream main was reported as ecd1d71228e40105310fcb25e1bcf00cc5ed5284; the parent
opened [that exact spacing-fix commit](https://github.com/comp4020-agentic-coding-studio/template-course-site/commit/ecd1d71228e40105310fcb25e1bcf00cc5ed5284).
Its compressHTML option addresses wrapped prose spacing. Check the actual slice
before adopting it. Local installed Astro 7.2.8 and Astromotion 0.23.0 remain the
implementation baseline; newer upstream versions do not require a wholesale
migration. The installed deck route supports published:false and initializes a
1280x720 Reveal canvas, so phone text needs explicit browser verification.

### External practice, interpreted for this project

| Primary source checked | Finding and project decision | Limit |
| --- | --- | --- |
| [OpenAI eval guidance](https://developers.openai.com/api/docs/guides/evaluation-best-practices) | Use task-specific pass/fail checks and a same-content paired comparison; retain human calibration | The guide does not prove a teaching layout improves learning; our walkthrough is not a controlled learner trial |
| [Anthropic multi-agent account](https://www.anthropic.com/engineering/multi-agent-research-system) | Bounded research questions and owned file sets reduce overlap; parent integrates and verifies | Their research-system gains do not transfer automatically to coding or justify agents for every small task |
| [Gloaguen et al., inspected v1](https://arxiv.org/html/2602.11988v1) | Conclusion distinguishes marginally negative generated context from marginal developer-written gains, with more steps. Keep the harness compact and tied to this course | Python-heavy issue-resolution evaluation; not a verdict on all safety, maintainability or coursework uses of context files |
| [Huang et al.](https://arxiv.org/abs/2310.01798) | Intrinsic correction without external feedback can fail; treat model critiques as leads checked against sources, tests and browser output | Older reasoning-model/task evidence, not proof that present reviewers are useless; parent checked abstract, not every experimental detail |
| [Liang et al.](https://arxiv.org/abs/2403.07183) | Corpus-level vocabulary shifts are not reliable authorship judgements about a single page | Parent checked the abstract/current version metadata; no detector score or banned-word claim follows |
| [GOV.UK clear-language guidance](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/writing-guidelines/clear-language/) | Replace vague praise with concrete student actions; explain necessary specialist terms | Keep source qualifications that change meaning; do not turn clarity into a ban on passive voice or useful nuance |
| [CMU Eberly alignment](https://www.cmu.edu/teaching/assessment/basics/alignment.html) | Connect the question, preparation, activity, output and assessment | Our fictional-history design and source choices remain our judgement |

### Bounded harness refinement

Replace the generic instruction to propose learning outcomes with a compact unit
alignment and source-purpose rule in CLAUDE.md. The official packet supports
fewer technical claims than common SAO recollection; it is promotional framing,
not survivor testimony. This is a newly explicit teaching requirement supported
by inspected sources, not a manufactured failed experiment. Detailed claims and
paper limitations stay in these linked records rather than inflating the harness.

The existing regex's quoted-title false positive is being corrected with parsed
HTML anchors and valid/invalid fixtures. parse5 8.0.1 is an exact test-only dev
dependency already present transitively; the parent inspected the diff and found
only a direct importer entry added, with existing resolved versions unchanged.
Actual parent tests, review outcomes and commits will be appended after integration.

### Gate 2 verification, refinements and delivery

The [review record](planning/gate-2-review.md) contains actual outcomes. The
[teaching implementation](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-Naaeeen/commit/4fc9cde)
promotes the accepted homepage, derives navigation and assessment facts from
published collections, supplies one full seminar/lecture/deck/assessment, and keeps
unfinished content explicitly staged or draft. A/B share the same session entry.

Source review found a genuine access gap: B's paraphrase lacked the evidence
needed for the lesson's worked inference. The fallback now preserves it. The
parent also accepted the reviewer's editorial suggestion to use SAO's entry,
exit and collective action as a concrete explanation of the analytical categories.
The reviewer checked those refinements against the primary packet.

Parent browser checks covered the linked teaching path, responsive reading,
all ten slides, native slide controls, no-script reading and the corrected
contents/current-page state. The phone card-spacing issue illustrates why a
bounding-box pass is not a legibility verdict. Early viewport mismatches and a
stale stylesheet after hash navigation were rejected as evidence and corrected.
This supports the small explicit reload/actual-viewport rule added to the harness.

Selected rendered source/lecture paragraphs retained their intended spaces around
inline links and emphasis. The upstream compressHTML issue was not reproduced in
this slice, so that configuration update was not applied. This is a scoped
observation, not a guarantee about every future MDX/HTML composition.

The [oracle repair](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-Naaeeen/commit/785b1ce)
passed all 31 parent-run fixtures. Final required check on patched tooling:
`/tmp/a2-gate2-patched-final-mk5lpl5s.log`, with zero type diagnostics, passing
21-page build/a11y/links and 35 passing spec tests. The only failure is honest
coverage of Week 2 rather than all twelve weeks. A subsequent no-script CSS
specificity fix passed the build at `/tmp/a2-gate2-noscript-final-469xb2q4.log`.
The submission evidence gate still rejects the retained starter files/images
and unfilled PROCESS.md; unpublished staging does not bypass it.

The complete dependency audit additionally found development-only fast-uri and
Vitest/mocker advisories. Parent and worker checked the maintainers' descriptions:
[fast-uri IPv6 normalization](https://github.com/fastify/fast-uri/security/advisories/GHSA-f65p-4m7j-42xc)
requires a consumer that trusts normalized untrusted URLs; the
[Vitest mocker issue](https://github.com/vitest-dev/vitest/security/advisories/GHSA-82fw-gwwq-j7x9)
depends on a reachable mock-registration path. The described unauthenticated
standalone-plugin exposure was not found in this static course configuration.
No exploit or compromise was claimed. Compatible patches in
[2752781](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-Naaeeen/commit/2752781)
leave Astro/theme/Astromotion versions intact. The parent inspected the exact
nine-package version family diff and the zero-advisory post-patch audit JSON.

The student still needs to review teaching depth, voice, layout and slide usability.
Completing one unit establishes a usable pattern, not the coherence of twelve
weeks or a promised grade.

A final keyboard walkthrough found that the inherited reading-page navigation
lacked Escape handling even though the homepage already supplied it. The parent
verified the theme source and [W3C's disclosure-navigation pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/),
then reused the theme toggle in TeachingLayout rather than separately manipulating
its state. Actual Escape and resize-return cases now close the menu and restore
focus. The final full check remains 35 passes and the known coverage failure;
see the review record's last follow-up. The first four Gate 2 commits were pushed
through 19b7b97 with a matching remote hash and unchanged private visibility.

## Gate 3 — a complete course and a connected atlas (27 September 2026)

### Requirement refresh and scope

The parent reopened the [A2 brief/spec](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/assessments/assignment-2/)
and [upstream README](https://github.com/comp4020-agentic-coding-studio/template-course-site/blob/main/README.md)
after the student challenged the planned volume. Twelve dated weeks are required;
twelve complete lectures or decks are not. The chosen response is eleven concise
new/replacement guides around the established Week 2 example, four selected
lecture-note pages and the existing ten-slide Week 2 deck. Each guide has a
different student output. This distinction is now explicit in the goals and
[requirements audit](planning/requirements-audit.md).

Upstream main was rechecked through GitHub API and remained
`ecd1d71228e40105310fcb25e1bcf00cc5ed5284`. The private project still had no Pages
site enabled. No fixed collection, Slop identity, generated API or build integration
was replaced. The new atlas uses installed GSAP 3.15.0 and original SVG; no extra
package, paid API, remote model asset or service was needed.

### Claim-level source decisions

The source packets identify their original passages and provide labelled teaching
paraphrases. Publisher publicity is evidence of a selected account, not independent
witness testimony. The parent checked the decisive originals as well as the
research agents' recommendations; the independent content reviewer checked the
complete set of guides, briefs and source pages and sampled the originals again.

| Material and primary sources | Supported teaching use | Boundary retained |
| --- | --- | --- |
| [Aincrad opening](https://www.swordart-onlineusa.com/aincrad/story/), [episode 7](https://www.swordart-onlineusa.com/aincrad/story/?no=07), [episode 8](https://www.swordart-onlineusa.com/aincrad/story/?no=08) | Entry/exit rules, craft dependencies and a shared meal; episode 8 explicitly places its event in October 2024 | The summaries do not establish a complete economy or independent survivor testimony |
| [Progressive introduction](https://saop-anime.com/intro-character/) and [Scherzo story](https://saop-anime.com/intro-character/story/) | Revisit early Aincrad through Asuna, information and rival groups | A revisit, not a chronological sequel; do not infer an unstated floor number |
| [Fairy Dance 15](https://www.swordart-onlineusa.com/fairy_dance/story/?no=15) and [16](https://www.swordart-onlineusa.com/fairy_dance/story/?no=16) | Escape leaves recovery unfinished; Kazuto interprets a screenshot and enters ALO with retained data | Character belief is not a demonstrated causal mechanism or clinical diagnosis |
| [Phantom Bullet introduction](https://www.swordart-onlineusa.com/phantom_bullet/intro/) and [episode 9](https://www.swordart-onlineusa.com/phantom_bullet/story/?no=09) | Reported threat, investigation, cooperation under uncertainty | Parent read the introduction's supplied image alternative; the content reviewer did not independently visually read that image |
| Mother's Rosario [20](https://www.swordart-onlineusa.com/mothers_rosario/story/?no=20), [23](https://www.swordart-onlineusa.com/mothers_rosario/story/?no=23), [24](https://www.swordart-onlineusa.com/mothers_rosario/story/?no=24) | Yuuki's goals, fictional Medicuboid, school participation and ordinary activities | No claim about real medical-device efficacy; diagnosis is not invented for every guild member |
| [Ordinal Scale story/device guide](https://sao-movie.net/us/story/story.html) | 2026 Augma, awake AR, location-based collection and ranking | Its promotional safety claim is a claim to analyse. The selected source does not explain memory extraction |
| [Alicization press release, p. 2](https://aniplexusa.com/pdf/PR_082318_SAOAlicization.pdf), [episode 11](https://sao-alicization.com/1st/story/11.html), [War of Underworld introduction](https://sao-alicization.com/intro/), [episode 22](https://sao-alicization.com/story/?id=ep22) | Artificial life, institutional rules, unequal account powers, outside intervention and Alice's public introduction as AGI | No inference of legal citizenship; hearing/council activities are classroom proposals |

The original Week 9 homepage wording promised an inquiry into memory. Its new
packet instead gives accessible evidence about AR, bodies, place and ranking.
Rather than relying on recollected plot detail, the parent aligned the homepage,
course map and assessment act description with the source-supported guide. Memory
still has an evidenced role in Alicization; it is not presented as a feature proved
by the Ordinal Scale promotional page.

Optional real-computing lenses use [Sutherland's 1965 paper](https://cise.ufl.edu/research/lok/teaching/dcvef05/papers/ultimate_display.html),
[Google SRE's postmortem chapter](https://sre.google/sre-book/postmortem-culture/)
and [W3C XAUR, section 4.4](https://www.w3.org/TR/xaur/#interaction-and-target-customization).
They are explicitly optional and do not increase the required preparation budget.
Sutherland is speculative, not evidence of a working Full-Dive device or influence
on SAO; the blameless-postmortem model assumes well-intentioned operators, an
assumption the class can challenge; W3C's input/target needs offer a design lens,
not a clinical claim about Yuuki.

### Design references and choices

The parent read The Pudding's [responsive scrollytelling discussion](https://pudding.cool/process/responsive-scrollytelling/)
and [storytelling process](https://pudding.cool/process/how-to-make-dope-shit-part-3/).
The useful principles here are a central question, complete understandable visual
states and a small-screen reading route. These older articles do not establish
current CSS/API compatibility or prove a learning benefit. Their warnings about
hidden or scroll-dependent content motivated an equivalent reading-list view,
while direct world selection suits this reference/exploration task better than a
forced narrative sequence. Both views use the same five DOM panels.

Research agents also identified the British Museum/Google [Museum of the World](https://a.experiments.withgoogle.com/the-museum-of-the-world)
and Matan Stauber's [Histography](https://histography.io/) as linked-object and
curated-story references. Parent fetches of the Museum project/Google account and
Adobe's creator interview failed or timed out. These remain named research leads,
not claims of a successful live interface walkthrough. No assets or source code
were copied from either project.

The atlas pairs five original emblems with three lenses: interface, everyday life
and a question of power. Connection questions lead into the next setting, and
seminar links come from the published collection. The phone view isolates one
larger emblem with all five selectors rather than shrinking a desktop map. Motion
belongs to traces, floating objects and selection; study text stays readable.

### Review evidence and the working method

The earlier OpenAI evaluation and Anthropic delegation/context findings still
inform this stage: bounded file ownership, task-specific checks and parent
verification of reviewer claims. We reused them instead of declaring a new
universal agent recipe. No claim is made that more agents, more packages or more
animation necessarily produce a better course.

The first full Gate 3 check had zero type diagnostics but a real accessibility
failure: duplicate named inner landmarks on the atlas. Parent browser checks then
reproduced the reviewer's covered sticky toolbar, world-state loss at the controls
URL and the controller stealing focus from the native skip link. Current
[MDN positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/position),
[scroll margin](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/scroll-margin-top)
and [GSAP context lifecycle](https://gsap.com/docs/v3/GSAP/gsap.context()/)
documentation support focused fixes; the final browser result, not the suggestion
alone, determines acceptance. Results are recorded in the Gate 3 review record.

Content review also exposed missing hand-in and feedback arrangements. The course
now specifies fictional in-person delivery/drop-ins, an accessible alternative
arranged with the convenor, and feedback before the next assessment needs it. This
is our course-design choice; no functioning external submission service is claimed.
Exhibition formats are consistently slides, a document or a self-contained webpage.

The harness gains a small periodic requirement-audit rule after the observed scope
drift. Detailed audit findings stay in the linked record. PROCESS.md remains the
student's later account; these notes supply verifiable events, not invented
personal experience or human preference.


A final API inspection showed the generic integration's default empty
`learningOutcomes` array. The plan already contained four learning outcomes, so
the homepage now publishes them from the existing course-outline data. An initial
attempt to add them to `courseMeta` failed: the starter's local strict schema in
`src/course-config.ts` has a narrower field set than the generic integration.
The parent checked that actual schema and restored the course record unchanged;
no validation, fixed API contract or build integration was relaxed. The rejected
candidate is logged at `/tmp/a2-gate3-candidate-xy1flfse.log`.

Native skip-link interference also justified adding one compact sentence to the
existing navigation-check rule in CLAUDE.md. A passing controlled DOM review was
followed by actual browser checks: the skip link's next Tab enters the main
content, and world/view state survives controls links and browser history. The
mocked review did not establish sticky geometry or native BFCache behavior.


## Gate 4 research and decisions — 28 September 2026

The student accepted progression and then supplied three linked corrections:
show lecture slides, make the first action and weekly routine immediately clear,
and teach SAO as historical events from 2035 for complete newcomers. Further
steering invited a learning route beyond navigation. These are actual user
requests, not findings invented by a model review.

The [pre-implementation plan](planning/gate-4-plan.md) records the live brief,
unchanged upstream ecd1d71228e40105310fcb25e1bcf00cc5ed5284, file ownership,
source model and acceptance checks. The parent captured the existing 1920×1080
lecture catalogue: four cards, zero direct deck links and zero inline decks.
It also dated lectures without explaining their delivery. The metadata/copy audit
found an unrepresented cross-week assignment: Week 9 reuses Week 2 notes.

### Orientation, progression and resource design

| Primary reference checked | Transfer to this course | Limit |
| --- | --- | --- |
| [COMP4020 homepage](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/) | Explain weekly components, semester divisions and resource purposes | Its live lectures/crit schedule is not our seminar timetable |
| [MIT OCW unit page](https://ocw.mit.edu/courses/6-100l-introduction-to-cs-and-programming-using-python-fall-2022/pages/lecture-1-introduction/) | Group readings, explanations, media and activity for the same unit | Historical example, not evidence that our redesigned page improves learning |
| [Calling Bullshit syllabus](https://callingbullshit.org/syllabus.html) | Make required vs supplementary material explicit | Do not copy its provocative voice or assume the same audience |
| [NN/g progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) | Keep common study tasks upfront and reference destinations secondary | Exactly three links is a project choice; hiding useful deadlines would defeat the principle |
| [GOV.UK start pattern](https://design-system.service.gov.uk/patterns/start-using-a-service/) | A clear action-labelled beginning with enough prior context | This is a course, not a government transaction; no account/eligibility flow is needed |
| [Duolingo's path explanation](https://blog.duolingo.com/new-duolingo-home-screen-design/) | Show a next step and place learning resources in the route | Language-learning claims and locked progression do not transfer to this course |
| [Three.js Journey introduction](https://threejs-journey.com/lessons/introduction) | Chapters and lessons can coexist with explicit media/reading choices | No paid access, completion tracking or purchased materials were added |

The chosen design makes the route visible in the page, not only in the menu:
Start here introduces the incident; a twelve-week itinerary opens each weekly
dossier; ordered preparation, meeting, output and deadline are shown together.
Library remains a reference route and the atlas remains optional exploration.
A freely revisitable itinerary suits a dated seminar better than a locked game
path or an obligatory cinematic scroll. All links remain usable in plain HTML.

### The source model had to change with the historical viewpoint

Independent review confirmed that a terminology sweep alone was insufficient.
The old Week 2 assessment required publicity originals and adaptation analysis;
the deck juxtaposed a 2021 media release with a 2022 event. These tasks enacted
media analysis rather than the historical course the student wanted.

Required reading is now being revised into substantive course-compiled case
accounts with stable paragraph locations. Running prose treats people and events
historically. Source credits retain actual publishers, works, dates, adaptations
and the educational premise. Accounts are not mislabelled as diaries or independent
eyewitnesses. The assessment asks students to compare editorial emphasis and
supported interpretations, using onsite passages. Event chronology replaces the
old production-date exercise. Narrative context defines unfamiliar people and
systems before asking newcomers to analyse them.

The parent rechecked launch/first-month sources and the previously inspected
case sources. The official [Fairy Dance introduction](https://www.swordart-onlineusa.com/fairy_dance/intro/)
stores its passage in an image with no usable alternative text. Web extraction
failed; the parent then inspected the original image in the browser. It supports
Kirito's return after fighting Kayaba/Heathcliff and the 300 people, including
Asuna, still unconscious. The [November 2024 episode synopsis](https://www.swordart-onlineusa.com/aincrad/story/?no=14)
dates the late Aincrad sequence but does not by itself supply the exact ending
day. The briefing uses supported relative chronology and does not claim that all
100 floors were completed.

### Embedding the real deck

The worker inspected Astromotion 0.23.0 and Reveal 6.0.1 rather than assuming
framework-level configuration. Astromotion hardcodes its defaults; Reveal merges
query settings at runtime and supplies a documented
[postMessage interface](https://revealjs.com/postmessage/). The parent read that
primary API, [W3C frame-title guidance](https://www.w3.org/WAI/WCAG22/Techniques/html/H64),
[carousel controls](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/) and
[reflow explanation](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).
The prototype uses the real local deck, explicit outer controls, origin/frame
checks, a readiness response, persistent reading/presentation links and a generous
phone frame. The original deck's narrow/short-screen reflow makes a shallow 16:9
phone frame unsuitable. A load event alone is not counted as a working player.

A deck-owned embedded class hides its once-per-tab hint inside the viewer, where
visible controls explain navigation. No vendor/export automation flag is changed.
The native helper still consumes its per-path seen flag; this implementation limit
is retained for browser/human review. It is not evidence of a fresh ordinary-user
hint test. No new dependency or paid API was required.

### Verification approach in progress

Bounded workers have separate UI, slide, source and teaching-copy ownership. The
parent owns integration and independent verification. The new study-navigation
checks ran against the unchanged Gate 3 build: four genuine failures and one pass.
They cover per-week preparation routes/order, matching preparation budgets,
Week 9's cross-week note assignment and consistent meeting facts. They do not
measure clarity or teaching quality. Final browser outcomes and commit links will
be recorded after integration rather than predicted here.

### Organisation refinement after the first browser walkthrough

The student asked to keep important pages visible, then explicitly asked to finish
organisation carefully before rushing release. The design now pairs four primary
routes (Start here, Weekly plan, World atlas, Library) with a separate Study desk
(Notes & slides, Case files, Assessments, People & help). The desk is static and
the first-use Start page omits it to preserve its single first action. The Library
explains resource purpose; it is not the only route to important material.

The parent read [NN/g's distinction between IA and navigation](https://www.nngroup.com/articles/ia-vs-navigation/):
page grouping, labels and relationships need design beyond the visible menu. The
semester trail and each week's before/together/after dossier supply those
relationships. No participant study or measured learning benefit is claimed.

At 390x844 the first weekly selector was at y=1384, below the full rhythm
explanation. The selector now sits in the Weekly plan header with native anchors
and the existing keyboard-focus handling. Study-desk link labels grew from 12px
to 14px after visual review.

The student's screenshot also revealed arrows touching numbered circles. The
compact variant had a 28px grid gap but retained a 30px external arrow offset;
the parent confirmed that geometry in the browser. Following the actual gutter
model described in [MDN gap](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/gap),
the connector is centred in the shared gap, with a fixed width and separate
vertical phone styling. A visual CSS defect needs rendered geometry verification,
not a test that merely checks whether a particular CSS string was written.

### Gate 4 integrated result

Implementation [9741b89](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-Naaeeen/commit/9741b8908915bac9fda81faf8aad5d7cdde1a7dd) completes the plan above. Final evidence is in
[the review record](planning/gate-4-review.md): 42 passing checks, 45 built pages,
actual desktop/phone navigation and all ten slides both embedded and standalone.
The critical refinements came from rendered output, including double vertical
centering, hidden-but-accessible old slides, transformed MDX script quotes and
the student's arrow/number screenshot. The observer error and failed-network
verification remain bounded, explicit limitations. No additional package or
service was needed. The research-informed workflow remained bounded ownership,
independent review, parent reproduction and selective harness updates, not a
claim that a more elaborate agent recipe guarantees quality.

## Gate 5 evidence drafting — 28 September 2026

The parent re-read the [AI policy](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/topics/ai-use-and-integrity/)
and [assessment guidance](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/topics/assessment/).
The policy permits AI drafting with human accountability, prohibits a false
process account and requires naming reuse of earlier work. The assignment's
400–600 words are indicative guidance, not a mechanical penalty threshold.

The student requested preparation plus Chinese review documents. The draft uses
only their supplied SAO motivation, accepted course direction, explicit research
and verification requirements, scope questions and UI feedback, tied to real
commits. Agent browser work is attributed to the agent. Crit 5 reuse is named.
Eighteen harness trial runs are not misreported as eighteen pairs or universal
success. Generated-output checks establish structural consistency, not realistic
learning time, comprehension or human preference. The comparison citation now
includes the planning/harness commit as well as its subsequent implementation.

A bounded independent review found no material attribution, citation or translation
issue. Parent verification checked the actual diffs and both translations' URLs,
commands and important paths. The English draft is 512 whitespace-delimited words
with Markdown link targets removed; the evidence gate resolves seven commit IDs.
No suitable style references were returned by the configured style search, so
the draft follows the student's stated plain-writing preferences without claiming
a retrieved style match. Human approval of the account is still required.

## Gate 5 focused process account — 28 September 2026

The student requested a narrower account centred on researching agent practice,
maintaining working documents and converting review into implementation and harness
changes. The parent rechecked the live brief/rubric and AI policy, and read the
actual paired-trial runner, result summary, masked review and relevant commit diffs.
The rubric rewards justified decisions and demonstrated acceptance; the revised
account makes those visible through this project's experiments and course choices.

The 510-word narrative recommends the implementation goals, research record and
process evidence bank, explaining their different jobs. Its concrete examples are
the grader's missed href counterexample, the coordinated historical-course rewrite
and browser-led improvements to study navigation and embedded slides. Eighteen
scored runs, eight cited commits and the external frozen grader are checked against
repository evidence. The final comparison does not claim a winning model or an
optimized context setting. The Chinese PROCESS copy is synchronized for student
review. CLAUDE.md remains unchanged because this revision concerns the account.

## Gate 5 plain-language writing comparisons — 28 September 2026

The student found the previous PROCESS too abstract. The parent checked the
Australian Government plain-language guide, GOV.UK clear-language guidance and
current Anthropic writing/review recommendations, recorded with their actual
application in [the writing research note](review/process-comparison/research.md).
A fixed evidence packet and rubric preceded two editorial A/B comparisons. Each
round had two fresh reviewers, anonymous labels and reversed presentation order.

The reviewers favoured the first candidate's verified course-change argument and
the alternative's simpler opening and explanations. Parent checks caught shared
citation/reuse omissions, verified the representative-week chronology against git
and removed an unsupported personal-motivation sentence. The final 520-word account
explains three actual agent practices through concrete actions and recommends three
working documents. The [comparison record](review/process-comparison/README.md)
keeps candidates, criteria and observed decisions. These are model editorial reviews,
not a learner study or predicted mark. The Chinese account is synchronized.

A small CLAUDE.md addition responds to the repeated writing feedback: name the
actual request, observation and resulting change, and explain technical terms
through that example. It changes the next writing task's instructions rather than
merely asking for an unspecified 'better' tone.

## Clarifying the tested rules and adopted findings — 28 September 2026

The student asked for the research location and its operational use to appear in
the opening, for 'rules' to mean concrete CLAUDE.md directions, and for the wider
workflow to replace an apparently exhaustive three-practice list. The revised
594-word account names the research folder, explains selective adoption into
CLAUDE.md and the AGENTS.md reading requirement, and connects comparisons, review
and maintained documents to course decisions. The live brief/rubric were checked
again; the account stays within the 400–600-word guidance.

An independent audit and parent source checks verified the frozen starting
conditions, 18 scored runs, independent masked review and evaluator repair. Model
and effort were held fixed; the protocol does not record a separate CoT/effort
experiment. The account names the actual comparison instead. A final precision
change uses 'evaluation' rather than 'tests' for reporting-honesty checks because
semantic review also carried that judgement. The [audit note](review/process-comparison/technique-clarification.md)
records the sources. Earlier comparison inputs/results remain unchanged.

## Selecting the implementation ending and standardising language — 28 September 2026

The user asked to remove the paragraph about editing PROCESS and replace it with
a more consequential website example. Parent and independent review selected the
Aincrad reconstruction: the student's fidelity criticism led to primary-reference
inspection, a rebuilt layered fortress, a reusable visual-reference rule and real
motion/fallback checks. This complements the earlier evaluator and curriculum
examples. The parent checked the exact 8d518f9 rule diff, 06ce955 implementation and
Revision 2 browser record; no new resemblance or performance measurement is claimed.

The user's supplied opening judgement about a prepared agent framework is now
reflected in the 598-word English account. The goals file's A/B/research/review
requirements are explicit. The whole current submission tree is English: the
original research report was translated, a user quote paraphrased, and convenience
translations archived outside the repository before their removal. The language
change preserves earlier evidence and Git history.

## Final delivery requirements refresh — 28 September 2026

Re-read the [official A2 brief](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/assessments/assignment-2/)
and upstream contract before final verification. The required written account is
PROCESS.md; the following retro uses that file, with no separate reflection.
The supplied workflow runs test:template only in the template repository, which
explains its four missing starter-artwork fixtures after course replacement.
Keep required submission-check results separate from that maintenance suite.
The [final audit](planning/final-submission-audit.md) records the source checks,
browser evidence and public deployment still to complete.
