# Spatial place native browser journeys

23 October 2026. Local canonical WSL checkout, branch `post-crit-improvements`.
This is browser evidence for the implementation gate, not a human preference study.

## Protocol and acceptance

Four bounded maintained Playwright cases use the installed 1.63.0 Chromium,
`chromiumSandbox: true`, SwiftShader, and the existing 60-second case budget.
The origin is the parent's isolated service at `http://127.0.0.1:4108/`; data is
`.local/spatial-apply/data`. No provider, production account or existing resident
identity is used. The room case admits three independent contexts, including a
390x844 touch phone and 1920x1080 desktop. Sofa and study retain the two actual
participants; their unrelated third admission was removed with parent approval
after the first cases approached the unchanged 60-second bound. All mutations use ordinary visible UI.
Authenticated GETs verify persisted/current results; they do not set state.

| Requirement | Native proof and negative control |
| --- | --- |
| Room reference and continuity | Native canvas encodes a real PNG fixture, native file input uploads it, owner saves crop/preset, closes/reopens and exports. Downloaded image bytes match the server PNG SHA256. |
| Visit and privacy | Named phone visit sees the original owner's identity/image and hidden owner write controls. Guest local zoom cannot change owner view. Closing the door returns the visitor to lounge and denies subsequent studio bytes. |
| Optional local sound | An observing Proxy delegates to the unmodified native AudioContext constructor. No context exists before Listen; Listen produces a running native context and access loss closes it. This verifies mechanics, not perceived sound quality. |
| Sofa purpose and consent | Places walks to an actual seat. Sitting does not Join; explicit two-person Join, house copy, explicit Follow, presenter zoom and pointing reach the other browser. Leave retains the chair; Stand/reseat does not renew consent/follow. |
| Study and independent board | Actual seat and explicit Join precede huddle presentation. Phone opens the actual board iframe and returns to the same huddle/seat. Opening it without Join does not enroll. Another browser is not forced into the board. |
| Scoped readable chat | Lounge and bedroom drafts retain their own text. A huddle message reaches a second browser. Native bounds, scroll width and elementFromPoint check that transcript and composer are visible and pointer accessible. |
| Ordinary exits | A real projected bedroom rug is clicked/tapped, after an independently checked unobscured native target; it returns to lounge. |

Screenshots are captured from actual desktop/phone frames and must be inspected.
No test changes production state through evaluation, HTTP POST helpers or fabricated
socket events. No skip, retries, widened case/global timeout, security setting
change or giant video artifact is introduced.

## Comparison and refinement

The meaningful evaluator choice is visible native action plus state read versus
state read alone. The second can miss a hidden or blocked control, a wrong owner's
image, muted-by-default behavior, or an unreadable overlay. The combined method is
used here. This is a technical verification choice, not a measured agent A/B win.

A first development run occurs before the parent's final backend restart and is
not acceptance. Preserve its first failed condition separately from any inferred
cause. After relevant repairs and the parent's ready signal, run affected cases
again against the restarted service, bind source hashes and inspect the screenshots.
Existing maintained break/voice and picture-table cases retain their original
budgets. The changed return destination is Room studio; Saved work remains
reachable through Options and is checked independently.

## Initial authoring checkpoint

Initially three cases were authored and discovered. Later deadline refinement
separates the draft round trip into a fourth case; actual results follow below.
Human usefulness, physical-phone performance, WAN/Fly behavior and the unchanged
sustained resource gate are outside this lane.

## First development observations

- `native-development-first.txt`: FAIL after three successful independent
  admissions. Phone reload/Continue stayed `Reconnecting…` for the existing
  ten-second assertion. This was against the earlier retained service before
  backend epoch refinements and restart. Root coordinated restart; no cause is
  claimed from that run. A current-backend reload/Continue check remains in the
  final room case.
- `native-typecheck-first.txt`: FAIL only at the concurrently edited
  `spec/house-studio-preview.test.ts(8,624)` argument type. The native test files
  produced no diagnostics in that check. That does not claim the full check passed.
- Instrumentation now observes the real native AudioContext before initial
  admission, eliminating a setup-only reload while preserving the explicit
  end-of-journey reload recovery assertion.

## Review and current-backend refinement

A fresh read-only Astra review used only source/contracts and the requested tasks,
without previous test outcomes. Three findings were confirmed and repaired:
require decoded dimensions rather than `complete` alone; send a bedroom message
and verify owner receipt/lounge exclusion; and retain partial setup contexts inside
cleanup ownership. Its contextual source recheck confirmed all three repairs.
It did not run browsers or accept behavior.

`native-places-first.txt` preserves two 60-second failures with three continuously
rendering worlds. The sofa final condition was waiting for its gathering panel
while the actor was near the seat. The study actor did reach its seat/panel. These
artifacts alone do not isolate an application fault or rendering cause. The next
attempt uses ordinary Pause for inactive worlds, preserving their connections.

`native-places-refined.txt` preserves one sofa PASS (59.8 seconds), a room FAIL and
a study FAIL. The room failure was an evaluator error: server CSP permits `blob:`
for images but restricts fetch to self, so fetching a valid displayed blob URL
fails. The corrected check uses actual native Image decoding before/after cleanup;
no CSP/security setting changes. The study passed its board/consent/chat actions
but reached the unchanged case deadline on a final repeated walk to the bedroom.
No motion failure is inferred from that ongoing walk.

Inspected original screenshots from that attempt establish that the selected
fixture is actually painted on the bedroom wall and desk after Studio closes;
the phone visitor sees the same owner's cropped PNG; sofa Follow shows the PNG;
and phone chat has a visible transcript, composer and Send control above its panel.
They also exposed an actual CSS defect: gathering paragraphs inherit root `--ink`
(`#f5ead1`), effectively matching the paper background. Root received the source
and screenshot finding for a production fix. A native text-contrast assertion
will guard roster/role/explanation; the prior functional PASS does not accept that
unreadable UI.

`native-room-second.txt`: PASS in42.9 seconds, including guest current-door
revocation, native audio context closure, native image URL decoding cleanup and
phone reload/Continue with the same identity. `native-typecheck-final.txt`: PASS.
These are intermediate checks: the last seat writer refinement landed after that
service's imports, so root requires a fresh retained-service restart before the
final source-bound three-case run. Preserve this passing artifact in its scope.

The contrast repair is root's one-token paper text variable correction after the
observed native screenshot. The screenshot is the failure reproduction; the
computed contrast assertion was added afterwards and has not been presented as a
test-first failure. No artificial prepatch run was invented.

## Final lane verification and released freeze

Root restarted the retained service after the last backend refinement: session
85610, PID11867, port4108. It explicitly held backend/UI writes for the native
runs. `native-source-before.json`/`native-source-after.json` record57 unchanged
working-source SHA256 values and an unchanged server-launch record around the
three-case pass. A later affected test refinement has its own unchanged binding
in `native-refinement-before.json`/`native-refinement-after.json`.

| Current maintained case | Actual result and scope |
| --- | --- |
| Room reference and named phone visit | PASS43.1s in `native-places-final.txt`: three identities, saved crop/preset/export byte SHA, actual closed-panel world image, correct read-only guest image, private room-message delivery, no lounge leak, opt-in native audio running then closed, revoked URL fails native image decoding,403 byte access and same-identity phone reload recovery. |
| Sofa deliberate copy and follow | PASS42.0s in `native-refinement-final.txt`: two participants, actual chairs, explicit Join, decoded identical house copy, explicit Follow, presenter zoom, visible phone pointer inside the image viewport, Leave/Stand/reseat without renewed consent/follow. |
| Study huddle and independent board | PASS34.3s in `native-refinement-final.txt`: explicit Join, native board sticky note persisted and read by another browser, same-seat board return, readable live phone chat, fresh seat without automatic Join, then owner removes the phone resident while its actual board is open; iframe/panel clear and title returns. |
| Scoped local drafts | PASS30.7s in `native-refinement-final.txt`: ordinary bedroom entry, actual rug exit and return retain distinct lounge/bedroom text. |

The fourth case is a deadline-preserving split of existing scope, not a new
feature. An earlier combined draft-return plus open-board negative hit60s while
walking; it remains in `native-study-context.txt`. No deadline, retry, skip or
global budget was relaxed. The affected refinement run passed3/3 in1.8minutes;
the unchanged room case retains its earlier source-bound result. It is not
reported as a single four-case command. Both native runs left their source files
and server-launch record unchanged. All test-owned browser contexts are closed,
and root was told the freeze is released.

`native-results.json` contains the four selected actual test records, saved-state
attachments and six inspected native PNGs (908,989bytes total). The selected PNG
is painted on the bedroom wall and desk after the Studio closes. The final sofa
phone screenshot shows the real point inside the reference, with readable roster,
roles and explanation. The phone chat screenshot shows its transcript, composer
and Send control above the nonmodal huddle. Native text contrast assertions pass
for all three gathering paragraphs on desktop and phone.

The installed headless Chromium launch mutes audible output. Native AudioContext
graph start/close and UI status were checked; no audible-device or listening
preference result is claimed. This Windows-to-WSL run is not a physical phone,
human utility, WAN/Fly or sustained resource result. No external service was used.

`native-typecheck-refinement.txt` passes. `git diff --check` passed for owned test
files. Existing helper/break/picture semantics now follow actual seats, Room studio
and Options -> Saved work. The picture regression explicitly withdraws while
keeping its chair, reopens through Table choices, then Stands/reseats without
automatic participation. That last maintained-game edit awaits root's13-case
selection on the subsequent final recovery source; this lane did not run that
suite or claim it passed. Root's later recovery changes require their own affected
checks and must not inherit this earlier runtime binding.
