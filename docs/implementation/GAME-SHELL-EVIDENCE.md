# Game shell redesign evidence

7 October 2026. Local working-tree shell extension for R1.1, R1.2 and the game-side
R3.3 entry boundary. This record is independent of the earlier core acceptance and
of the parent board editor/integration evidence. No publication or human preference
trial is inferred.

## R1.1: title, admission, HUD and focused tools

Requirement: the owner tried the previous core and found the interface crowded and
like a webpage. Starting/continuing, reading connection state, playing, and changing
settings must be distinct tasks. Identity, projection, command UUID, receipt/revision,
recovery issuance and private-draft rules remain authoritative.

Inspected AGENTS, CLAUDE, PLAN, active handoff, REPORT, owner redesign/harness addendum,
redesign plan, actual HTML/UI/styles/tests and CI. Applied the available WSL,
evidence-driven work, frontend design, test workflow and Playwright skills. The
active comparison/requirements methods were reopened at implementation and verification.

Alternatives considered under the same create/join/return, chat, settings and room
editing tasks: retain the persistent header/forms/quick-chat/tool bands; replace them
with a title gate, minimal world HUD and deliberate tools. The first preserves direct
access but continues competing for room space. The latter introduces one explicit
start choice and preserves native controls while reducing permanent scene obstruction.
This is a source/design comparison and mechanical check, not a human A/B winner.
Stop when each chosen surface has a complete native task and the inherited safeguard
suite remains meaningful; do not add UI elements merely to increase feature count.

Implemented: a warm title scene with Continue saved home, Create house, Join friends,
Options and About. Create/join each expose one profile/admission task. The saved-home
connection opens after explicit Continue; successful admission enters directly.
Connection/observer/takeover, residents and chosen Quiet/Can chat remain real state.
Residents use a native disclosure; a small dock offers Chat, Shared board, Study notes,
My room and pause. Touch movement is a separate collapsible control. Settings/camera,
private identity and house administration are deliberate sheets. Room layout editing
remains restricted to the actual owned-room snapshot with selected-piece/grid/rotate,
preview/reset/review/save feedback. Existing author-owned study cards are Study notes.

Pause uses Esc or the native dock, suspends world rendering/input without closing
its controller connection, traps modal keyboard focus and restores its launcher.
Options offers actual zoom/follow/overview and a local reduced-motion preference.
Normal tools stop movement; room editing retains the renderer's stable editing view.
Private DOM and iframe projections clear before another identity can be shown.

Actual red/green: a new title-gate regression failed against the previous HTML because
there was no Continue control. During implementation an inverted title hidden flag
caused eight meaningful fixture failures; corrected the transition and kept the
privacy/admission assertions. The first general Vitest command did not execute unit
cases because the default global HTTP setup expected port 8080. This infrastructure
failure is preserved and subsequent unit work used vitest.house.config.ts.

## R1.2: companion chat and world input isolation

Requirement: long conversation must remain readable without permanently covering the
scene; drag/resize/collapse/close must preserve drafts and keep controls reachable.

Compared a fixed shared tool panel with a separate companion window on the same
history, composer and viewport tasks. A fixed panel is simpler but couples discussion
to every other tool and takes a permanent strip. A transient companion window permits
placement near the current task and retains the original domain send/ACK logic. Its
extra risk is focus/geometry, so those receive explicit boundary tests. Stop at native
movement/resize, draft, reading and input isolation acceptance. No usability preference
or throughput result follows from this comparison.

Implemented a multiline textarea, explicit Send and Ctrl/Command Enter (ordinary
Enter remains a newline). The 2,000 maxlength is coordinated with the parent-owned
contract/outbox extension; this UI record does not claim the backend bound by itself.
Uncertain sends retain the original action UUID. Only the acknowledged unchanged
scope/version clears; newer/suspended drafts remain. The window has pointer and native
keyboard movement/resize, collapse/close, bounded geometry after viewport changes,
compact composer layout for short viewports, and unread status while hidden, collapsed
or blocked by a modal. Transcript delivery retains existing message nodes and reading
position. Plain text uses textContent. Key, wheel and paste events are isolated from
the scene; typing focus also uses the world's existing clear-input guard.

## R3.3: game-side shared-board entry

Requirement: the full board is a separate same-origin app. Embedded entry suspends the
scene, keeps the live controller/heartbeat and returns to its existing world state.
Author study cards are retained independently.

Compared loading the full editor into the game renderer with a dedicated same-origin
iframe. The iframe retains the separate standalone route/build and a clear focus/lifetime
boundary. Entry is /board/?embedded=1. A native Return to house control is always outside
its content. A close message is accepted only when both origin and source match the
current iframe and type is night-board-close. Identity/disconnect teardown removes the
frame immediately. The frame's load callback is also tied to its captured instance.
Modal keyboard focus includes the iframe so keyboard users can reach its controls.
Parent server mapping/embedding headers and editor authority remain integration-owned.

## Actual checks and artifacts

Linux via Windows-to-WSL bridge, Ubuntu user lizhi, project mise Node 24.21.0 and
pnpm 11.9.0. All work stays local; no commits/pushes/publication by this worker.

- Targeted suite: `mise exec -- pnpm exec vitest run --config vitest.house.config.ts
  spec/house-ui.test.ts spec/house-shell.test.ts` passed 63 cases (56 UI and 7 window/focus).
  Tests retain original privacy/draft/UUID/revision cases and add real title task gates,
  admission visibility, pause/focus, board source/origin/teardown, multiline shortcuts,
  draft return, unread/reading and selected catalogue behavior.
- Affected final coverage after transcript and review refinements: 63 cases passed;
  house-ui.js + house-shell.js 81.50% statements, 94.52% lines, 72.39% branches.
  UI alone 80.42% statements/94.24% lines; window helper 90.54% statements/100% lines.
  Branch coverage remains below 80%; this does not establish exhaustive correctness.
- Native TypeScript check passed after correcting JSDOM's MessageEvent source type.
  Owned `git diff --check` passed after EOF cleanup.
- Scoped native Playwright used an isolated data directory and fresh server at port
  4095, started after the parent static module/server integration. Desktop 1920x1080
  and mobile-emulated 390x844 completed title/create, reload/Continue saved home, real
  multiline chat commit/ACK, typing isolation, collapse/close/options draft return,
  native keyboard and pointer window movement/resize, chat wheel isolation, pause
  focus restoration, 180% zoom, native Tab entry to the board iframe/native close and
  visible world return. A real peer joined, sent a message during the host pause, and
  its unread badge survived modal viewport resize before clearing on resumed chat.
  Resizing each to 390x320 kept Send and Close reachable; final native page errors: 0.
  `.local/game-shell-native/observations.json` records bounds and task results;
  `{title,game,chat,compact}-{1920,390}.png` are full native captures inspected visually.
- Native evaluator refinements are retained: an immediate bounds assertion raced the
  resize event; a transcript-before-ACK assertion raced composer clearing; both now
  wait for the corresponding visible state. One Chromium screenshot capture failed
  before interaction; the task-scoped launch uses disable-dev-shm-usage and final native
  captures passed. The capture exposed an unsupported fullwidth plus, replaced with +.

Fresh fork-without-history reviewer independently passed the then-current 62 cases
and found one P2 issue: window geometry changes marked expanded chat read even while
Options made it inert. The worker reproduced it with a failing exact-source test,
gated the callback through chatReadable(), and marks read after the sheet closes.
The reviewer’s contextual recheck independently passed that regression (1 passed,
55 filtered out) and confirmed the fix. The final 63-case suite, actual peer-message
modal-resize task, types and owned diff passed after correction. No other confirmed
actionable shell finding remained in the bounded review. Native retained-history
eviction reading position remains NOT RUN; ordinary incoming-message reading position
is covered. Parent critical reconciliation and integrated server/board/maintained e2e
checks remain separately owned. Physical phones, actual IME,
real-human A/B/preference, production image/Fly/WAN and a usefulness study are NOT RUN
in this worker lane. Native board editor content/authority were not asserted here;
opening/closing its game shell is the measured boundary.

## Final owned-room header boundary

The final camera screenshot exposed a separate control overlap: a synthetic
forty-W owned-room name wrapped over the availability row. The source correction
uses bounded ellipsis while retaining complete DOM text and native title. Identity
reset/revocation clears that title; a meaningful new test reproduced stale-title
leakage before the three narrow assignments were repaired. The new case passed
with the other57UI cases filtered; the earlier full57UI+7shell64PASS remains a
separate snapshot until the required final suite executes.

A scoped actual Chromium/WebGL task checked both forty-W and forty-CJK room names
at1920x1080 and390x844. Header bottom86 precedes availability95 desktop; bottom76
precedes87 portrait. No overflow, 44-pixel invite/resident targets, full text/title,
ordinary Options/My room actions and zero page errors passed. Contexts closed
before the exclusive resource run. These synthetic names are not real user data.

Frozen header source: CSS7a8fbaf381061f29e9a36746e9db9a922c84808c66d13e886fb28fd2cdcf853e
and UI48a541d05c86744c830a3691c7406fa0152f3ca9c45d9576f2d444ce94b29ee2.
The four selected native screenshots, exact dimensions/CRC/hash record and
non-overlap observations are [archived](../screenshots/redesign/manifest.json).
The portrait PNG was opened and inspected; its camera/room/actor were visibly
rendered. No forced clicks, timeout/criterion reduction or human preference claim
was used to close this bounded lane. Final source/gate reconciliation belongs to
[R4 validation](REDESIGN-VALIDATION.md).

## Final local app gate, 7 October 2026

This checkpoint supersedes pending local labels above. The required build/type/spec
gate passes 411 tests in 26 files; process evidence and production dependency audit
pass. Complete house coverage is 86.28% statements / 80.03% branches (211 checks).
Complete board coverage is 69.85% statements / 67.67% branches (130 checks), including
main.jsx at zero unit coverage. Native editor checks do not replace that unit gap.

The preserved seven-case browser run passes before whole-startup enforcement. The
painted title-dialog grader reproduces two failures, then two passes after the
layer repair (13.8s desktop, 3.8s portrait). DOM/click checks alone falsely passed
through the inert foreground title. These unchanged title cases were relocated
from house.spec.ts to title-dialog.spec.ts; collection now selects nine CI cases.
The new nine-case selection is configured, not a combined local execution claim.

The actual startup helper first falsely accepted a successful 12,000ms control.
It now asserts finite, nonnegative unrounded elapsed <=10,000ms, retains failures
and separates completion from budget acceptance. Seven controlled checks pass.
The affected real game case passes in 55.5s under its unchanged 60s budget: Create
724ms, Join 8,672ms and saved return 8,200ms are each accepted by the strict guard.

The README root-app link defect was reproduced and repaired; nine HTTP boundary
checks pass. The smaller 512 shadow map retains the inspected room/avatars/chat
with softer shadows; screenshots have varying label positions and are not human
preference evidence. Exact source/result/image hashes and scope are in
[the closeout record](../../evaluation/redesign-closeout.results.json).

Resource inspection is READY at protocol 1ef47348 / manifest 545d79c3 / instrument
6130e233. Exact e579 is archived. All earlier resource FAILs remain FAIL; the one
registered CI exercise and production release remain separate. The original-data
preview is healthy at http://localhost:4093 using exactly .local/implementation-s1.
Local source commits: ca57bb2 game/world, 2e1cdb4 transport, fc4b5d8 README routing.
