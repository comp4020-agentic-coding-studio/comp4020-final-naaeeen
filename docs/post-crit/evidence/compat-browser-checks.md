# Frozen8cdad6a compatibility: bounded native evidence

22 October 2026. The accepted source-bound result is
[reviewed-grader](compat-browser-2026-10-21T16-49-08-398Z-reviewed-grader.json).
The runnable tool is tools/post-crit-compat-browser.mjs; the predeclared sequence
is in [protocol](compat-browser-protocol.md). This lane edited no production
source, made no commit/push/deployment/provider change, and used synthetic local
sessions only.

## What ran

Exact Git commit8cdad6ad17e698d5b02896d570afb7892f365351 was archived into an
ignored fixture, including its real HTML/UI/client/world/geometry/server/store.
The old pages' actually received response bytes match the frozen hashes.
Existing canonical dependencies were symlinked; nothing was installed. Current
src/public were copied and hash-checked before execution, so later root edits
could not change the running fixture. Node24.21.0, existing sandboxed Chromium,
1920x1080, two independent browser identities and one later owner tab were used.

| Requirement | Actual observation |
| --- | --- |
| Original page genuinely controlled old service | Native admission and saved room/card/private chat ran through frozen UI. Its real module client held controller=true before cutover. |
| Commit before lost ACK | One native card save committed in frozen SQLite. The test then synchronously destroyed only isolated service transports and closed that service before its realtime handler could ACK. Native WebSocket observation captured the exact sent UUID/body and no corresponding receipt ACK. |
| Same origin and data | Current copied service reopened the same port and directory without reloading either old page. House DB moved from schema1 to4. |
| Preserve old records | Every row in every original column of all12original house tables matched after migration. Nonempty data included archive1, bedrooms3, cards2, privatechat1, receipts9, members3 and sessions3. Original secrets/digests are represented only by aggregate hashes in tracked evidence. |
| Available same-zone unsent form | The owner's unsubmitted lounge chat text was restored in the original DOM and captured in the result before deliberate reload. This is a runner backup of the observed form value, not an OS-clipboard test. |
| Old read-only / no fake pose or lease | Old snapshot had controller=false,generation0,players[]. Native world had zero avatar labels and no self mesh. Old geometry remained width16; new page used width20. |
| Existing update explanation | Native old Take control button displayed the server's read-only/copy/export/reload explanation. No new banner was injected into old source. |
| Original Pending export | The real old Pending download contained the original command UUID/body and creation time. canRetry=false in the old read-only tab. |
| Current independent control | A newly loaded current page acquired actual lounge-2 control, received finite self pose and changed availability while the old page remained read-only. |
| Private revocation | Current owner closed its room and the old guest cleared private chat/view to lounge. After reopening and revisiting, member removal cleared the old guest's private DOM again. |
| Deliberate reload / exact retry | Same-tab current reload retained sessionStorage. After explicit current takeover, native wire showed a new identical command and a successful ACK exactly equal to the original old receipt. Pending cleared; card content and revision2 stayed unchanged. |

There were zero JavaScript page errors and no cleanup error. Browser, contexts
and both isolated services closed; ignored source/data fixtures remain for
inspection. No native/GPU process remains owned by this lane.

The debugger briefly exposed the existing module-private UI client at an actual
served openPanel call. It did not rewrite old files, strip current authentication
or substitute a reconstructed client. Native UI covered admission, editors,
takeover, Pending download and reload. Private subscriptions and membership
removal invoked that actual UI client's methods; these were not pointer-navigation
or admin-discovery usability tests.

## Evidence refinement and unsuccessful attempts

[First](compat-browser-2026-10-21T16-45-51-799Z-first.json) failed because the
runner tried filling guest chat after a zone change had closed its chat window.
This was a harness navigation error, not an application regression.

[Second](compat-browser-2026-10-21T16-46-51-799Z-chat-open.json) reported PASS
and executed the cutover, but is **insufficient acceptance**. Fresh independent
review found that Pending disappearance could also result from terminal rejection,
and a mutable served-hash object was overwritten during reload. The original
artifact remains unchanged; do not use its loadedOld hashes as frozen evidence.

The corrected runner requires a new native retransmission plus matching successful
receipt ACK, and snapshots old delivery hashes before recording current reload
hashes separately. [Seven pure grader controls](compat-browser-grader-controls.json)
pass: accepted match, terminal rejection, missing retransmission, changed command,
changed receipt, stale pre-reload ACK and immutable delivery checkpoint. These
are grader controls, not additional browser journeys. The corrected dated run
passed the complete declared sequence. Fresh contextual fix review found no
residual actionable issues; see [review](compat-browser-review.md).

## Source scope and remaining limits

The result records sourceChangedAfterSnapshot=true. Only public/house-ui.js and
public/house-game-ui.js changed in the canonical checkout after this run's copy:
the run used UIc350da67/gamec8acde6c; root later had UI1a0918e3/gamebe9cb5e5.
Backend/client/frozen source stayed identical. The copied run is valid for its
recorded bytes; it does not establish forward acceptance for later UI changes.
The following UI/voice lane was notified to bind its actual current sources.

The old UI retains one suspended draft slot and one room-draft object. Some hidden
drafts from other zones cannot be recovered through its ordinary UI, and changing
zone can clear room/chat draft state. This run demonstrates one available same-zone
chat plus a queued card command, not universal multi-zone recovery. Pending export
exports queued commands, not every unsubmitted form. Deliberate reload loses
unsubmitted chat memory after its observed value has been backed up. Old roster
labels say offline/another tab controls because players is empty.

No physical-phone, real-friend preference, WAN, live Fly or resource-budget result
is claimed. The parent owns broader required checks, current UI source acceptance
and any eventual publication decision.
