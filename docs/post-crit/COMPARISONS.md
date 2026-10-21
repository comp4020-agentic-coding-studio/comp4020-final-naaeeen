# Declared comparisons and evidence status

This document preserves the original comparison protocols and their then-current
statuses. Executed outcomes are indexed below and in [ACCEPTANCE](ACCEPTANCE.md);
old NOT RUN wording is not the current completion status.

22 October 2026. Task criteria precede trials. This record supports
[PLAN.md](PLAN.md) and [RESEARCH.md](RESEARCH.md); it does not select winners by
counting features. In every lane preserve source revision, protocol, viewport,
actual outputs, failures and refinements. Automated checks, model judgement,
browser evidence, physical devices and human preference are different evidence.
Do not report scripted users as classmates or fabricate a human A/B study.

## Camera A/B/C

**Common task:** with identical furnished geometry, actor dimensions, users,
zoom and scripted route, enter a room, reach each door/seat/board, inspect, then
walk and recover. Candidate A repairs bounded follow; B centers a damped follow;
C uses stable room framing plus explicit inspection. Change only camera policy.
Use 1920x1080, 390x844 and 844x390, native resize, keyboard/touch and reduced motion.
Record the actual animated mesh/ring bounds and visualViewport offsets.

**Criteria:** follow candidates restore Follow within 250 ms of intentional walking
after temporary inspection. Stable framing is judged by the common visible-actor,
reachable-control and complete-task criteria, without requiring a Follow mode; settled stationary drift is <=1 CSS px over two seconds; default
phone actor height is >=64 CSS px. These are project targets, not published
accessibility standards. Check 0/5/7 px drags, direction reversals, zoom and every
interaction. Typing, chat dragging/collapse and UI activation cannot walk. Explicit
locked Look may stay fixed; editing remains stable; Follow/Recenter is reachable.

**Stop:** reject candidates failing containment or input isolation, resolve fresh
review findings, then compare surviving candidates' framing and occlusion on the
same routes. Do not repeatedly rerun green cases without a changed factor. Human
comfort remains unmeasured until real people try it. **Status: matched browser
trials NOT RUN in this record.** The plan's existing pan-to-walk diagnostic is
baseline defect evidence, not a camera A/B/C result.

## Lounge size and circulation

**Common task:** compare 16x11 and 20x14 with the same functional objects, six
avatars, furniture count, camera scale, routes and open panels. Two to six
residents must enter, cross, approach occupied/free seats, study at the board,
watch/play and leave. Object positions may be adapted to fit each footprint;
record those coordinates so any layout effect is visible instead of attributed
solely to area. Keep study/board, rest and game functions in both candidates.

**Criteria:** reachable doors/seats/action anchors, no collision trapping, readable
avatars and controls at both main viewports, six-person gathering and acceptable
panel occlusion. Record path failures, crossings, screen-space size and screenshots.
Area alone cannot decide: 20x14 adds room but can weaken phone legibility.
**Stop:** choose the smallest candidate completing these tasks after bounded
layout refinement, or document why neither does. Subjective spaciousness requires
human feedback. **Status: paired layout/browser trial NOT RUN.** The 1.26 lounge/
bedroom area ratio in the plan describes the baseline only.

## Four-in-a-row, chess and cards

**Common task:** prototype the same optional three-to-six-minute break and immediate
return to the existing study card. Use matched desktop/phone shells, identical
join/leave/watching labels and two/six-person scenarios. Four-in-a-row has two
players/public state; 3+0 chess has two players plus clocks/promotions/history;
Crazy Eights supports two-to-six with private hands. Report spectators explicitly.

**Criteria:** discover rules and legal action, make a move using touch/keyboard,
understand whose turn it is, recover stale/duplicate commands, reconnect/restart,
leave immediately and return to work. Spike authority/projections for each:
spectator move denial, session/revision/controller checks, terminal result and
member departure. Measure serialized command/public/private state, implementation
surface and unresolved policies; do not equate lower complexity with higher value.
Chess's depth/familiarity can justify additional work; cards can justify hidden
state if all-six participation matters. A 42-move bound is not a time limit.

**Stop:** select one production game after task failures and meaningful review
findings are resolved, recording the tradeoff and whether actual group preference
was available. No requirement to build multiple production tables.
**Status: matched prototypes and authority spikes NOT RUN here; no human preference
result.** A finite public game is a provisional implementation recommendation,
not a completed comparative finding or rejection of chess.

## Three voice routes

**Common task:** six friends optionally talk while studying, then leave voice and
continue silently. Compare (1) Open Discord destination, (2) managed browser audio
with LiveKit/Daily as provider alternatives, and (3) full browser WebRTC mesh.
Keep group size, permission-denial, blocked network, reconnect and member-removal
cases constant. An embedded Discord Activity is a separate host migration, not an
equivalent standalone browser SDK. Preserve that scope difference in the decision.

**Criteria:** explicit consent, muted entry where capture is implemented, leave/
stop-capture, honest status, membership revocation, phone/network reliability,
server RAM, transfer and owner cost exposure. External Discord can only verify
safe opening/no-link behavior locally, not remote mute or membership. Managed
providers need course eligibility and authorized configuration before live trials;
mesh needs credible TURN. Compare free caps against usage, not SDK licenses.
**Stop:** retain a useful silent experience and the authorized external route;
advance in-app audio only when those dependencies and actual device/network checks
are satisfied. **Status: source comparison completed; live voice trials NOT RUN,
provider/course eligibility unresolved.** No paid provisioning occurred.

## Resource and review boundary

[resource-baseline.json](resource-baseline.json) is an actual read-only idle
snapshot, not an A/B result or load test. Preserve it unchanged. Later comparisons
must retain the original 300-second workload and resource thresholds, then declare
a separate combined board/new-actions workload. Report RAM, persistent disk,
transfer and client rendering independently. Fresh independent review and parent
reproduction must attach actual evidence before implementation acceptance; this
protocol document alone is not a PASS.


## Executed game spike and independent decision

The source-bound [spike record](evidence/game-comparison.md) now contains actual
rule, pointer/keyboard and separate emulated-touch results. The parent and fresh
Astra reviewer inspected native images. A shared-padding refinement removes the
initial chess target miss; this was a shell constraint. Fresh review also found
that the move-feedback/keyboard task was under-checked, so the raw PASS labels
remain limited to their implemented assertions. See [production decision and
acceptance](GAME-CONTRACT.md). Four-in-a-row is selected for voluntary interruption
and public progress, not test count or a claim that chess/cards are infeasible.
No human preference, true multiplayer authority or SQLite restart was established
by these fixtures.

## Current outcome index, 22 October

- Camera: matched candidates and readability/observer refinements are recorded in
  [P1-CAMERA](evidence/P1-CAMERA.md) and [P1-B-READABILITY](evidence/P1-B-READABILITY.md).
- Lounge: [paired layout result](evidence/lounge-comparison.md) compares identical
  functional content and records the expanded layout's circulation/travel tradeoff.
- Group participation: [group contract](GROUP-ACTIVITY-CONTRACT.md) and
  [group UI](GROUP-UI-NOTES.md) bind the tray prototype comparison, native six-person
  capability and later affected repairs. Two-player game spectators do not satisfy
  the separate group requirement.
- Admission: open/closed/open diagnosis and the matched blur/dim-only comparison
  informed one CSS change; ordinary native modal/admission checks then passed.
- Receipt storage: representation comparison protects exact accepted meaning and
  current-editor recovery; final sustained outcomes are separate acceptance gates.
- Agent method: [four matched diagnostic responses](../harness/COMPANY-METHODS-2026-10-22.md)
  support retaining the existing default, with no general reliability claim.
- Voice: external destination selected; no in-app media or real call trial claimed.

These are technical/design comparisons, model reviews and browser observations.
No real-human preference A/B study was performed.
