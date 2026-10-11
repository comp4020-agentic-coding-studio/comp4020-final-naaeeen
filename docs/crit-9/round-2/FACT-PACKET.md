# Fresh factual candidate packet

Source3c91f53f6ed052af617fc1555c16929d1ec06921. Use SELECTION-PROTOCOL.json.
No previous candidate verdicts are included. All delivered behavior claims must
remain bounded by actual code/evidence. Current task is research, no production changes.

## C: author-controlled commitments with shared canvas

Current members may modify shared canvas objects. Card goal/question/nextStep/
helpRequested and explicit closure are author-only; saving nextStep leaves active.
Cards visible to authorized housemates, not confidential. Current implementation:
house-store370–393, board-store196–238, house-ui225–245/403–418. Earlier actual
unit/store/browser evidence supports the rule. Code in a7f596a/ea60440.
Owner set the game-house/shared-board brief; detailed author semantics appear in
planning and implementation, with no verified unaided inventor. ADR is retrospective.

HCI distinction: shared exploratory material vs personal statement. Alternative:
all-shared with accurate editor/responsibility labels, or author-approved proposals.
Cost: blocks agreed peer transcription/closure. DourishBellotti1992 observed
negotiated authorship yet criticized inflexible roles, not proving hard ACL optimal.
No direct human comparison or strong original agent-mistake episode established.

## B: explicit willingness separate from connection/location/access

Quiet/Can chat is chosen, not inferred from motion or online presence. New controller
lease defaults quiet; same lease reconnect may retain. Roster shows connected/lounged/
can-chat and chosen timestamp; Quiet hides previews, still receives chat/unread.
Actualhouse-realtime216–228/270–273; house-ui199–210; commits2f941e1/ea60440.
Refinement record UI-REFINEMENT136–147 concerns timestamp/state distinctions; no
verified original agent episode inferring consent from motion.

HCI: availability/willingness differs from presence. Fogarty2004 workplace study
supports difficulty interpreting sensed context; criticizes stale manual DND too.
Alternative automated busy cues, negotiated norms, lighter status or expiry/reminder.
Cost manual upkeep/stale Can chat, no enforcement of noninterruption. Human
interpretation NOT RUN; no superiority to configured Discord demonstrated.

## F: uncertain submitted operations retain original intent and newer draft

Actual current clients preserve stored command UUID/payload/identity/destination
after uncertain errors; receipt replay avoids repeated durable effects in retained
scope. Newer typed draft survives old chat/card ACK. Canvas renders optimistically;
the choice is truthful confirmed/pending feedback and recovery, not synchronous UI.
Sources house-client86–99/212–247/295–330; house-store261–275; board-client172–202/
251–304; board-store178–193. ea60440/f5a25f2 contain accepted implementation.

Historical OUTBOX-REFINEMENT105–110/154–189 and BOARD-WORKSPACE-EVIDENCE144–177/
228–239 record red/refinement/review/native loops: numeric TimeoutError deleted UUID;
missing image+text lost before validation, Retry Saved without POST; correction
then React loop despite scoped green checks. Worker-authored same-day reports,
not raw independent proof of every red event; many fixes consolidated into commits.

HCI: visible system state, preserving input, actionable recovery/low cognitive
burden; pessimistic success labeling vs immediate truthful optimistic drawing.
Countercase added status/queue UI complexity; deadlines and storage failure.
Limits: board draft-only state can coexist with 'All changes saved'; pending export
omits unsent/newer chat draft (quota message specifically says export canvas).
Board>24h queue heads block all Retry; house allows inspected explicit expiry retry.
Existing integrated lost-ACK browser test is legacy, not current house/board.
New scoped current-module/HTTP failure probe may clarify, not human usability.

## A: whole-element reconciliation and retained losing drafts/local undo

Actualwinner higher version, lowernonce, deletionexacttie, canonical order. Missing
IDs do not delete others. Remote scene updates use CaptureUpdateAction.NEVER;
local image/sticky captured. Losing submitted receipt can retain conflict draft;
later accepted edit overwritten does not guarantee recovery. Same-object native
undo safety unproved. board-contract303–310, board-store196–238, client185–197/
297–304, main82–87/104/116. 321e27c/f5a25f2.

HCI: collaboration, reversibility and ownership under concurrent edits. Alternative
global undo, object locks, character/operation merging. Peer-unrelated-object undo
verified by maintained native journey; tests not universal intention protection.
Initial replacement/no-op scaffold was intentional negative control, not proven
uncontrolled AI error. CHI2024 VR study32 users shows personalundo protects divided
tasks while worldundo can benefit joint work/social connection; not browser evidence.
Cost quotas/tombstones, originaledit restoration can overwrite peers.

## I: shared document with individual view, draft and history

Patchwhitelist includesid/houseId/elements, files handled separately; no camera/
editor appState serialized. Main onChange passes elements/files. Remote updates
touch elements/collaborators NEVER, not explicit local selection/view. Initial fit
once; Fit all local. Selection IDs shared transiently as awareness, not entirely
private. board-main82–100/136, contract287–300/318–325, service308–355. f5a25f2.

Chatdraft in tab/identity/house sessionStorage; newerdraft ACK guarded. Shared
content can alter visible objects; incoming chat may autoscroll transcript, so
'peers never change your view' false. Revocation/reset/discard clears history;
iframeclosing drops native editor view/undo. Transport/source constraints strong.
No inspected native test directly compares two scroll/zoom/selections around peer
update. Alternative opt-in leader-follow/sharedview for common reference.
HCI relaxedWYSIWIS gives autonomy but awareness debt (GutwinGreenberg2002).
Cost coordinate/common-reference complexity and missing durable view/history.

## J: default readable self-follow while retaining chosen inspection/overview

Camera instance perclient follows ownavatar withdeadzone; manualpan entersinspection,
overview staysselected asuserwalks; HUD/move/resize preserve localmode/zoom/centre.
Actualhouse-world29–31/252–256 and camera39–73/120–139. ca57bb2 plus99bac82/
ee40225/5c40545. Many rule/unit/nativechecks and matched cameraB2 evaluation.
Changedfactor camera+foregroundtext package, not cameraalone; no human preference.

HCI: readable avatar/conversation vsglobalspatialawareness and automationcontrol.
Owner criticized tinyroom/UI andtracking, directed larger world/game-like controls.
Alternative fitwholehouse, fixedcamera orforcedfollow, opt-ininspection. Current
costs cropcontext, more modes/geometry; camera mostly localnotshared, must show why
multiplepeople/usechangedthisdecision rather than generic singleuserstyle.
Useful direct owner->comparison->refine evidence; technical framing measured
mechanically, physicaldevice/camera enjoyment NOT RUN.
