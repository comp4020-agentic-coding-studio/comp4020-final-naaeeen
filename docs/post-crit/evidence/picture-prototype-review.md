# Picture table prototype: evidence and integration recommendation

22 October 2026. Local UI prototype only. The final common source passes six
matched native CSS-viewport cases in `picture-prototype-native-final-v2/results.json`.
A fresh parent-owned review found a landscape chat transcript omission; the narrow
closure below supersedes that part of the v2 report. No production code, server-game source,
database, dependency, commit, push or deployment was changed by this worker.

## Common task, factor and result

The original protocol and environment/grader amendment were saved before their
respective runs. The factor is a bounded all-24 scroll tray versus a bounded
12-per-page tray. Both use the same original illustration, fixed shuffle, board,
semantic labels, targets and controls. The final keyboard goals are identical.

| Native viewport | Tray | Board / piece minimum px | Browse to final shuffled piece | Task Tab / Arrow-Home |
| --- | --- | --- | --- | --- |
| desktop | scroll | 106.33 / 74.75 | 3 scroll gestures | 14 / 14 |
| desktop | pages | 106.33 / 74.75 | 1 page action | 18 / 8 |
| portrait | pages | 53.33 / 49.66 | 1 page action | 18 / 8 |
| portrait | scroll | 53.33 / 49.66 | 2 scroll gestures | 14 / 12 |
| landscape | scroll | 47.66 / 48.33 | 2 scroll gestures | 14 / 12 |
| landscape | pages | 47.66 / 48.33 | 1 page action | 18 / 8 |


The mixed task also used eight pointer/tap activations, one programmatic field
fill, seven native key activations and one synthetic peer event in each case.
Page-navigation activations are counted separately. Another 21 native mock-peer
activations complete the picture, outside the comparison task. The raw runner
pointerOrTap counter 30 includes the field fill; the summary corrects that category
explicitly rather than silently changing the saved result. These are scripted
operation counts with known target answers, not solving time, physical effort,
preference or an advantage estimate. A separate inventory audit reached all 24
pieces through native keyboard focus in each case.

Both candidates meet the declared mechanical criteria. The paged tray exposes the
last piece with one deliberate navigation; the scroll tray took 2-3 bounded native
scroll gestures under this script. Paging adds four Tabs; it saves 4-6 Arrow/Home
presses for these same goals. This does not identify a general human winner.

**Concrete integration recommendation, model judgement:** use the 12-per-page tray
for the first bounded integration and retain the scroll variant for an actual
friend pilot. Finite visible groups and one labelled navigation are easier to
inspect at small viewports; the cost is an extra navigation state and additional
Tab stops. Keep the selected crop summary, row/column destination labels, roving
arrows/Home/End, wrong-placement retention and stable placed placeholders. Use
one original board image under opaque destination covers. Avoid deleting a
selected/focused button on a remote placement. Parent decides after inspecting
both candidates and the independent review.

## Requirement to evidence trail

| Requirement | Actual evidence and refinement | Limit |
| --- | --- | --- |
| One representative original continuous 6x4 picture | Original 8,445-byte 600x400 SVG; 24 semantic crop descriptions; full visual/text reference; 53 px inspection sheet | Only one illustration, not the proposed three-asset set. No external art or generator. |
| Meaningful crops on phone | Native phone board 53.33 px, tray 49.66 px; parent worker inspected actual PNG and separate 53 px shuffled crop sheet | Recognition is model judgement; actual people and nonvisual contribution remain untested. |
| Tap and keyboard selection/placement | Same piece/cell goals; native button tap, Space/Enter and arrow/Home navigation; all 24pieces exposed without ancestor clipping or obscured centers | Mixed-input task, not an exhaustive keyboard-only or screen-reader audit. |
| Incorrect placement | Selected aria-pressed state and progress unchanged; clear retry feedback | Local rule simulation, not authoritative network rejection. |
| Peer places selected piece | Same focused DOM node retained, selection cleared, aria-disabled placed placeholder and feedback | Event deliberately invokes the mock handler without taking focus. No real peer connection. |
| Reference, chat and exit | Native overlay open/close, chat submit, reachable close/input/send; exit visible and hit-testable; text inserted as text | Local chat; landscape history scrolls internally. Full keyboard history-reading is not established. |
| Return and completion | Explicit local desk placeholder, rejoin required, progress retained in-page; completion replaces empty selection summary | Real room/card/draft restoration is not connected. Retained placeholders are deliberate; no empty-tray claim. Reload resets all data. |
| Controls fit | Actual 1920x1080, 390x844, 844x390; clientWidth/visualViewport width/scale/DPR recorded; no horizontal overflow; targets >=44 px; ancestor clips and hit targets checked | CSS viewport plus software touch, not a physical phone. |
| Small text contrast | Shared muted #53624c; sRGB ratios 5.457 on paper, 4.883 minimum across checked light panels | Scoped token calculation, not full WCAG conformance. |
| Three to six active friends | UI mechanism can be selected/placed without turns; mock peers clearly labelled | NOT RUN: multi-client lifecycle, balanced contributions, real 3-6 person activity, fun or a 3-5 minute break. |

## Rendering/evaluator failures preserved

The initial mechanical green report missed visual/capture defects and excessive
Tab traversal. Earlier portrait PNGs include blank crops and transparent areas.
The first alpha grader missed fully transparent black pixels; its standalone SVG
export also failed because canvas was created in an SVG document namespace. These
are preserved, not upgraded into acceptance.

Paired isMobile:true/false observations initially suggested an environment remedy,
but the later matched-final run reproduced invalid completed PNGs at every size.
That inference was withdrawn in the amendment. Repeated CSS crops, nested SVG crops
and CDP view capture did not establish a cause or robust remedy. No sandbox was
weakened. A simpler single board image with stable opaque covers passed one bounded
desktop diagnostic, then the final six-case run. This is an observed successful
refinement under recorded conditions, not an identified Chromium defect.

The final run uses native CSS viewports, isMobile:false, hasTouch:true for the two
small views, DPR1, Chromium 1243/153.0.8010.12, sandbox enabled and SwiftShader. Source
hashes stayed fixed during the run. All 36 gameplay PNGs plus the original artwork
passed exact native dimensions and zero nonopaque/unexpected dark-pixel checks.
The separate 53 px inspection sheet has its own stated dimensions and visual check.
No page errors were observed. Browser and isolated random-port 127.0.0.1 static server
closed in finally; the original 4093 data/server was never used.

Failure history is in folders prefixed picture-prototype-initial, refinement-one,
refinement-two, portrait-diagnostic, native-layout-diagnostic,
paired-mobile-emulation, matched-final, css-native-diagnostic and
view-capture-diagnostic. Passing single-image-diagnostic is one case; final
acceptance is native-final-v2. Preserve these distinctions when summarising.

## Review packet and next gate

Fresh reviewer should inspect current prototypes/picture-table source, runner,
original protocol, amendment, final JSON and native PNGs; assess content accuracy,
control fit, focus/selection, counter validity and whether the observed mechanism
supports the next integration step. No prior preferred candidate is needed.

Before production integration, freeze the revised participation/lifecycle contract
and obtain the parent's review reconciliation. Keep actual backend authority,
3-6 separate active contributors, restart/reconnect/round races, retained storage,
real room return, physical-phone performance and human accessibility/fun testing
as distinct later evidence. Do not inherit this prototype's local PASS for them.

For a later manual local inspection, serve only prototypes/picture-table on a
free IPv4 loopback port with the installed Python static server, then open
/?tray=pages or /?tray=scroll. Close that helper when done. The automated runner
also starts and closes its own folder-only server.


## Fresh review reconciliation and final affected closure

The parent and fresh reviewer conditionally selected the 12-per-page tray for
small-view inventory clarity, retaining the keyboard tradeoff and human limits.
They found that v2's landscape chat check covered the form but omitted the nearly
clipped transcript. V2 remains unchanged and carries this acceptance limitation.

The only UI change after v2 is an appended landscape media rule in style.css:
input and Send share a row, label/footer are compact, and the message list has an
80 px minimum. `picture-prototype-chat-source-delta.json` recovers the exact v2
CSS prefix and verifies its recorded hash; all four other prototype UI files are
byte-identical. Original artwork remains 8,445 bytes and its catalogue is frozen.

The first two-case v3 chat recheck passed. The final affected run is
`picture-prototype-landscape-chat-bound-v4/results.json`: both 844x390 tray modes
PASS with a 98 px message viewport, a fully visible 57 px representative message,
author/body text ranges inside the clip, all form targets retained, no page errors,
source bytes stable, and browser/server closed. Original protocol, preserved
amendment and chat patch criteria have exact entry copies and matching entry/exit
hashes. This is the affected landscape closure, not a new full six-case run.
Desktop/portrait are outside the appended CSS media rule; their v2 evidence keeps
its original source identity.

V2's amendment association is explicitly retrospective in
`picture-prototype-native-final-v2/retrospective-criteria-binding.json`, with an
exact amendment copy and the original result hash. No run-time amendment check is
claimed for v2. The raw JSON and PNGs are preserved. The current final review PNG
for the chat fix is `picture-prototype-landscape-chat-bound-v4/landscape-pages-chat.png`.

Parent owns final review reconciliation and production integration. This worker
has finished the prototype and bounded rechecks, left all processes closed, and
made no commits or external changes. No full screen-reader audit, physical-phone
acceptance, real peer session or human activity pilot is implied.
