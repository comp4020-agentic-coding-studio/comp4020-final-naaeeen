# Shared Study House: master design and implementation plan

6 October 2026. Research and reviewed planning stage complete. This is the sole active PLAN.md. It replaces
earlier window/lamp and4-8person/walking-later proposals, while preserving their
history. The task is research,planning and isolated local validation; production
gameplay has not been upgraded.

## Outcome and authority

Build a warm small multiplayer house for2-6 existing friends. A unique space code
creates/joins the whole house; each resident owns a DIY bedroom. Named doors lead
from the common lounge to personal rooms. Residents control moving avatars,
converse through actual text,see truthful presence,sit/study together and use a
shared board. The first useful loop is arrive,greet,sit,post a goal/resource,visit
an opened bedroom,leave and find saved traces next time.

Owner requirements are [preserved verbatim](docs/product/OWNER-BRIEF-2026-10-06.md).
Movement,real dialogue,personal ownership and shared study are minimum experience
requirements,including a2D fallback. Earlier implementation convenience cannot
redefine them. The recommended product definition is recognisable ownership,easy
reciprocal conversation,truthful presence and voluntary shared focus with little
setup. Warmth and pleasure require actual people,not test scores.

## Read this plan with its supporting documents

| Document | Authority and purpose |
| --- | --- |
| [Capability contract](docs/product/SHARED-HOUSE-CONTRACT.md) | H01-H25 traceability,actors,product policies and core promises |
| [Experience design](docs/design/SHARED-HOUSE-EXPERIENCE.md) | Complete journeys,2-6 layouts,game controls,board and social rituals |
| [Implementation](docs/architecture/SHARED-HOUSE-IMPLEMENTATION.md) | Schema,permissions,streams,input,leases,migration and resource budget |
| [Source ledger](docs/research/2026-10-06-shared-house-sources.md) | Primary references,version/licence boundaries and actual adoption |
| [Comparison/review record](docs/planning/COMPARISON-AND-REVIEW.md) | Declared protocol,actual results,failures and reviewed refinements |
| [Protocol](evaluation/shared-house-planning.protocol.json) | Parent-owned criteria declared before trials |
| [Worklog](docs/planning/WORKLOG.md) | Current handoff,commits,checks and next action |

AGENTS.md routes to this plan and CLAUDE.md. docs/C8-CONTRACT.md and
[old handoff](docs/history/crit-8-implementation-handoff.md) describe frozen release
history. docs/NIGHT-NEIGHBOURHOOD-PLAN.md is a pointer,not another active plan.
Earlier docs/research feasibility notes are context,not current capacity policy.
Imported planning-source bytes and historical A2 methods remain provenance.

## Product direction,original synthesis and scope

Borrow rooms/letters from Kind Words,ownership/shared focus from gogh,
visits/cafe/light chat from Virtual Cottage2,spatial availability from Gather,and
shared low-demand activity from WEBFISHING. Spirit City/Chill Corner inform warm
ambience; Tiny Glade informs forgiving DIY. All are reference descriptions,not
APIs to embed or copied game art. [The ledger](docs/research/2026-10-06-shared-house-sources.md)
explains each supported observation and limit.

Our contribution is a persistent connected house for a particular small group:
personal rooms express identity; spatial actions communicate voluntary availability;
the board connects study intentions/questions/resources to later return.
We do not claim market uniqueness or proven effects on concentration/loneliness.

| Core,complete first | Enhancement after core works | Continued development |
| --- | --- | --- |
|2-6capacity,code create/join,stable member/room | Bounded uploaded images after decoder gate | Additional house themes/capacity migration |
| Keyboard/touch avatars,idle/walk/sit/stand | Wave and a few reactions | Modular outfits/advanced character options |
| Real presence,chat bubbles and transcript | Quiet ambient audio/weather preset | More ambience/pets/shared objects |
| Own DIY room,authorised room visits | Extra catalogue variants | Catalogue packs and safe user-created content |
| Atomic seating and shared focus state | Small result/postcard ritual | More study rituals/groups |
| Board notes,goals,links,short pen marks | Card filtering/export | Rich text/offline CRDT collaboration |

Images/drawing were explored rather than dismissed. Short bounded drawing is core;
image decoding/storage is a real additional gate. Do not add a large city,voice/video,
economy or productivity dashboard before the embodied loop is pleasant. The timer and short pen marks are selected
first-release mechanisms,not owner-mandated implementations; an explicit change
may simplify them while preserving shared study and a useful collaborative board.

## Space,visual and interaction decisions

Use a stable rectangular cutaway lounge and reusable bedroom template. Capacity
changes data-driven doors/seats/signs,not five bespoke game levels. Draw only the
currently visited room; do not simulate six bedrooms behind the lounge walls.
Compare rear-wall doors with split rear/side doors under matched light,geometry,
camera and tasks. Treat actual label occlusion/reachability as evidence.

Initial recommendation is rear-wall doors for2/3 and split rear/side banks for4-6,
with clear own-door signs. This is a reasoned design choice from the comparison,
not human preference evidence. The prototype holds one floor size for control;
production may use compact/standard parameters after route and device checks. Names,colour
accents and vacancy markers remain legible without relying only on colour.
The controlled prototype is not final art or multiplayer presence.

World-first desktop HUD: small house/status controls,contextual lower actions and
optional chat/board/editor sheets. Phone retains world area plus thumb movement
and one compact sheet. Native door/seat/board actions complement scene interaction.
No hover-only requirements. Input/IME suppresses game keys,focus is visible,
touch targets are at least44px and reduced motion preserves actual navigation.

Start with a coherent cream/wood/amber palette and limited identity colours.
Fixed oblique orthographic3D with modest shadows is the preferred route. Pixel
effect applies to world,not text. Local procedural figures can demonstrate the
loop; a same-rig animated asset can improve expression after verified adoption.
Never equate a skinned glTF download with completed movement or seat integration.

## Key engineering choices

Retain Node24HTTP,SQLite,Three0.186.1 and accessible DOM. Leading network choice is
Socket.IO4.8.4 attached to existing HTTP,with one domain authority for all commands.
SSE+POST and Colyseus remain documented alternatives; the matched spike compares
SSE full snapshots against Socket.IO deltas,not every framework's optimal design.
No production package was added during planning.

Separate durable house/member/room/board/chat/focus data from transient motion,
connections,controller generations and seats. Persist deadlines,not per-second
ticks. Bedrooms and lounge have separate authorised sequence streams; private
edits cannot create publicly-visible cursor gaps. Same UUID/payload returns a
receipt; new payload for old UUID rejects. Commit precedes ACK/broadcast.

Capacity counts permanent residents; disconnect does not surrender a bedroom.
One controlling tab and one observer avoids duplicate avatars. Reconnect has a
bounded reservation; restart clears presence/seats and rebuilds from authorised
snapshots. Seat claims are atomic; chat/board drafts survive conflicts. The detailed
contract gives explicit proposed defaults,not hidden assumptions.

Keep the board bounded: DOM cards+SVG strokes,per-object revisions,release-to-save
drags and author/current-state checked undo. tldraw/Excalidraw do not automatically
supply our membership,persistence or asset rules. Add a larger editor/CRDT only when
observed collaboration needs justify its runtime/licence/testing costs.

## Actual baseline and changes needed

Frozen crit-8 is6dc79c5ec6cc5610a867d653892d2b827ee94536.
Current production has cookie identities,owned saved furniture,revision/UUID
receipts,static residents,a public lantern and full-state SSE. It has no house
membership,doors/presence/movement/chat/focus/board implementation.

Retain proven session/prepared-query/transaction/editor safeguards and resource
loading/disposal. Replace the product domain and factor coupled app.js and
render-three.js into state/network/world/UI modules; do not append every feature
to those files. Provide an explicit v1-to-v2 migration,archive public C8 traces,
and offer deliberate import of a returning owner's furniture. Never silently
transform public neighbours into private members.

Fixed Fly shape stays one shared-cpu1x,256MB and1GB/data volume. New production
adoption will be tested in that shape. Prototypes/dependencies/evaluation are
excluded from production Docker context. No publication is part of this planning task.

## Two-week execution budget and dependencies

Assume one accountable developer using AI for bounded implementation/review,with
roughly5-6focused hours/day. This is an estimated70-85hour budget including a
10-15hour reserve,not measured effort or a completion guarantee. If availability
is3hours/day,the same core likely needs a longer calendar; adding agents does not
remove integration or human testing work. Day numbers start at implementation,
not today's research session. Stage gates take precedence over a date checkbox.

| Stage / target days | Work and estimated effort | Exit gate and responsibility |
| --- | --- | --- |
| P0,current | Requirements,research,comparisons,review,plan | Parent verifies sources/results and resolves material review issues |
| P1,days1-2 | Shared-house schema/migration,code join,basic identity recovery,controller skeleton,integrated simple3D movement/chat;10-12h | Two real browsers create/join,greet and move; production domain/backend+world owners integrate |
| P2,days3-4 | Door/room access,atomic seats,reconnect/multiple tabs,ordering;10-12h | Last slot/seat races,rejoin,revocation and authorised room transitions tested |
| P3,days5-6 | Small DIY catalogue,add/remove/nudge/rotate/palette,save/import;8-10h | Two owned rooms distinguishable; routes safe; restart retains edits |
| P4,days7-8 | Board goals/notes/links/strokes,individual revisions,conflict/undo;8-10h | Two people collaborate on independent objects; conflicts keep drafts; board survives restart |
| P5,days9-10 | Group focus deadlines,quiet interaction,small optional image gate;5-7h | Shared clock/restart/pause roles consistent; image not enabled before memory/access checks |
| P6,days11-12 | Both viewports,real phone/keyboard,slow network,user refinements,server instruments;8-10h | Complete loop on desktop/phone; bounded load and meaningful action logs |
| P7,days13-14 | Backup restoration/redeploy,rehearsal,owner-authored course account and fixes;5-7h | Verified candidate/evidence,independent review; release under scoped authorisation |
| Reserve |10-15h for integration/failed gates | Cut enhancements first; never silently delete core experience |

P1 is deliberately simple and integrated: separate successful geometry/network
spikes do not prove a complete game. Invite two friends as soon as P1 works.
Do not postpone all human feedback to day13. P2 precedes richer room editing;
P3 precedes content expansion; P4 precedes image/CRDT choices.
Observability starts with meaningful commands,not a last-minute dashboard.

Parallel ownership can split pure rules/storage,world/input,DOM board/chat and
read-only review after interfaces are frozen. Parent owns integration/contracts,
protocol grading and final checks. Every worker gets paths and preserves others.
No agent independently changes schema,permissions or grading to make its work pass.

## Acceptance,testing and measured gates

Use red-green-refactor for new production rules/bugs. Cover atomic last-slot
claims,code uniqueness,bedroom access,revocation,stale generations/sequence,
seat races,UUID replay/changed payload,collision/trap prevention,focus deadlines,
board independent edits/undo and WAL-backed migration/restore.

Real browser flow: create/join -> identify friend -> move/greet -> sit -> board ->
own room/DIY -> open visit -> disconnect/rejoin -> return. Run at1920x1080 and
390x844,resize mid-use,keyboard,touch and text/IME. Physical phone performance/input
requires actual hardware; headless/synthetic results cannot establish it.

Production target has two exact30minute workloads: L1=one house,six controllers
plus six observers,twelve total connections,two slow observer readers; L2=two
six-person houses,twelve controllers and zero observers,twelve total connections,
one slow-reading controller per house. Each connected controller sends10Hz motion;
each house sends six chat/board intents per minute. Reliable shared changes
p95<=1second,RSS<=180MiB,slow-reader recovery and no growing queues. Target>=30FPS on a named ordinary laptop; measure GPU/device
independently. These are future acceptance targets,not demonstrated results.

Run actual pnpm check and check:evidence,affected tests and dependency/secret checks.
Default CI does not run current Playwright browser tests; during production work
explicitly wire a maintained bounded browser suite and preserve the two supplied
invariants. Report coverage scope and gaps; prose has no application coverage.

Human judgement: two friends without coaching recognise ownership and availability,
exchange messages,study/use board and choose whether to return. Record hesitation,
misread states,missed messages and control issues. Small counterbalanced UI trials
are qualitative; subagent rankings are not statistical human A/B evidence.

## Risks,alternatives and switch conditions

| Evidence-triggered issue | First response | Alternative that preserves core |
| --- | --- | --- |
|3D GPU/readability misses named-device gate | Smaller draw area/quality,less shadow,palette,procedural avatar,safe-area camera |2D scene with same movement/chat/rooms/board contracts |
| Motion/rejoin inconsistent | Fix authority,generation,cursors and interpolation | Bounded Colyseus spike if its lifecycle reduces actual defects |
| Synchronous DB stalls | Shorter transactions,batch/previews,retention/profile | Bounded worker queue after measurement; no separate DB workaround |
| Rich board integration exceeds budget | Complete finite notes/goals/links/strokes first | Konva/Fabric; defer infinite canvas/CRDT,not useful board |
| Asset rig/style/licence does not fit | One verified rig or original procedural limbs | Replace visual layer without rewriting identity/network |
| Two-week availability insufficient | Reserve for reliability;remove enhancements | Extend calendar before dropping mandatory interactions |

Classify the failing layer before switching. A2D renderer does not fix identity or
network correctness. Library existence does not prove our art or experience works.

## Course,operations and continued growth

[C9](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/crits/09-all-at-once/)
needs deployed realtime and a documented consequential multiplayer choice; control
takeover/seat leases or board conflict handling is an appropriate decision.
[C10](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/crits/10-fly-by-instruments/)
needs server-side action logs/live view and a blind group demo. Capture actor,
action,time,outcome/sequence without private text,codes or proofs. Do not log motion
every render frame. Verify exact Shitao group cutoff from current schedule before
the next release; do not assume two-week completion arrives before C9.

Final deadline9November2026,noon Sydney. Preserve README/CLAUDE/spec agreement;
before the next authorised upgrade,rewrite README around only actual implemented
house promises. Owner writes/revises personal PROCESS/reflections from evidence;
planning files are not fabricated student reflections. Preserve crit-8 tag.

Future catalogue packs use stable IDs,licences,footprints,pivots,variants,versioned
migrations and golden existing-room fixtures. Themes reuse floor/seat/door
templates and the same permission/command system. Separate public/private legacy
data and test backup restoration. Monitor storage including WAL/receipts; alert
at70% and manage deliberate retention. Code/recovery credentials stay out of logs.

## Planning completion and next action

This research-stage plan is complete: protocol/results links resolve,decisive
sources and actual files were checked,two fresh no-history reviewers inspected
it,confirmed findings were refined and the relevant local checks passed. Actual prototype checks
are recorded as PASS/FAIL/NOT RUN; no staged future acceptance is claimed complete.

The next implementation step is P1: agree the capability interfaces and write
failing create/join/movement/chat tests,then integrate one real two-browser house
loop. It is not adding more catalogue items to the former window/lamp application.
