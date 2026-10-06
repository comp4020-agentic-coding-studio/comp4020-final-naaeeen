# S0–S1 detailed retrospective revisit

7October2026. Fresh reviewer started without parent chat history or earlier
verdicts. Audited fc86f0f plus dirty implementation. Applied activeREPORT§§3–6,
research/comparison/requirements/evidence methods. These are individual capability
records; no aggregate phase PASS substitutes for them.

Actual new execution:7focusedfiles/73testsPASS in2.69s using
`mise exec -- pnpm exec vitest run --config vitest.house.config.ts`.
An earlier omitted-config attempt failed globalsetup because8080wasunavailable:
INFRASTRUCTURE FAILURE/no tests. An isolated reconstructed sixteen-expired-entry
outbox probe observed eligible0/OUTBOX_FULL. No Playwright/device/human/deploy/
full-load execution by this reviewer. Source/test locations below identify the
audited version; subsequent fixes require new hashes/rechecks.

## S0.P1 Specific goal and target

Goal: a stuck student finds a familiar voluntarily willing peer, chooses their
own next step and retrieves it later; Quiet creates no compulsory response.
Source: PRODUCT-POSITIONING, PLAN§§1/3/5, positioningprotocol; eligibility in
house-ui renderRoster, optional card fields and author-owned store branches.
Normal/no-question/no-response/offline/bedroom/return paths are separate: entry
never requires a card; an unanswered question remains unresolved.
Alternatives: peer-help house, ordinary co-study, configured Discord. Compare recent
real episodes and natural trigger frequency before scripted tasks; later measure
willingness interpretation, interruption and return. Criterion: genuine recurring
need and understandable voluntary interaction, not a model's preferred concept.
Existing evidence supports implementation, not demand. Parent retains G0/G2/G3
HUMAN NOT RUN. Next: owner-accessible pairs/group and registered actual protocol;
maintain optional ordinary co-study if questions are rare.

## S0.P2 Alternatives and selling point

Goal: spatial setup/movement earns its cost. Source: positioning, source dossier,
README and protocolA–D; current world/chat/cards. Relevant paths include silence,
concurrent conversation, failed help and saved return.
Comparison: fairly configured Discord with statuses, threads, search and summaries
versus this owned place. Official Discord/VirtualCottage2 descriptions already
overlap with chat/co-study/visits, so features alone do not establish novelty.
Criterion: useful voluntary clarification/next-step retrieval and reasoned reuse,
with extra setup/movement counted separately from visual preference.
Fresh gap: protocol candidateB still mentions an offer workflow, although launch
uses ordinary chat. Parent must amend/register the current task before human
trials; proposals remain NOT RUN. No ownership/novelty superiority is inferred.

## S0.P3 Feasibility and cut line

Goal: preserve moving real avatars/dialogue/ownedDIY/shared study/useful board.
Source: PLAN§§4/6–8/10, owner briefs, contract, manifests and module boundaries.
Normal integrated invite precedes expansion; privacy/recovery faults require
repairs; fixed interfaces and saved-return migration constrain parallel work.
Alternatives: bounded card/procedural catalogue versus richcanvas/uploads/library;
3D versus matched2D only after measured device problems.
Criterion: complete core task/maintainability/resource fit before feature count.
Budget70–91hours is an estimate and approaches/exceeds fourteen5–6hour days.
Parent must reconcile remaining actual effort after current fixes. HUMAN/DEVICE
NOT RUN remains separate; neither missing evidence nor schedule justifies deleting
movement or actual conversation.

## S1.I1a Cookie identity and profile

Goal: return as the same recognisable person; invite code never reclaims another
identity. Source: house-store ensureSession/session/profile validators; server
cookieToken/houseAuth/me; store identity/recovery/field tests and HTTPcookie tests.
Cases: valid/missing/expired/ambiguous cookie; bounded name/colour; conflicting
profile revision; process restart with retained membership.
Alternatives: persisted opaquecookie+recovery proof versus externalaccounts.
The fixed familiar-group scope supports focused authority checks before more
account machinery. Criterion: server-resolved stableidentity/digest/expiry, no
body-actor authority, unchanged state on invalid input.
Local evidence is strong; parent source verification agrees. Dedicated duplicate-
cookie/expired-session native UI recovery remains a gap. Record30daylifetime at
recovery setup and verify actual cookie/old-session behavior in the final browser
candidate. Status ACCEPTED LOCAL WITH GAPS.

## S1.I1b Code and admission

Goal: one whole-house code, capacity2–6, exactly one final-slot winner.
Source: schema partialuniqueindexes, newCode/claim/create/join; store collision/
last-slot tests and operations two-process exercise.
Cases: fresh create, same-house rejoin, other-house denial, offlinefullhouse,
removed guard, code collision and unchanged losing profile/receipt.
Alternatives: random capability, named/publicdirectory, individualinvite system.
Criterion: cryptographic40bitcode, atomic slot/room/receipt, stable ownership.
Sequential two-connection test is distinct from genuine two-process test; parent
already executed operational5/5 but stdout marker cannot prove overlapping waits.
Native capacity5/6 admission has not been freshly driven. History sharing at join
is a confirmed missing disclosure, assignedUIrefinement. Status local authority
accepted; decision-point/privacy and full-capacity UI checks outstanding.

## S1.I1c Permanent membership and bedrooms

Goal: offline friends keep owned rooms; tabs do not create residents.
Source: one-home/one-slot uniqueindexes, active/claim/access/snapshot and tab test.
Cases: firstroomUUID, reconnect/rejoin, full denial, departure/archive, slot reuse,
multi-tab identity and fresh new occupant rather than inherited private content.
Comparison: permanent residents versus connection-expiring membership. Permanent
ownership is the selected experience; only control/seats use leases.
Criterion: no disconnection frees a bedroom; same identity returns to same claim;
new member receives fresh room. Native/stored invariants support this.
Parent must separately verify six distinct named doors and own-room recognition
through UI; a membership SQL test is not visual recognition. Status ACCEPTED LOCAL
WITH GAPS; final capacity/native evidence remains to bind to current hashes.

## S1.I2a Durable authority and receipts

Goal: savedACK means exactly one committed effect/receipt/cursor.
Source: canonical command parser, execute/apply transaction, private replay access
and original-house binding; rollback/reuse/restart tests.
Cases: firstUUID, exactretry, alteredpayload, independentactor namespace, failed
receipt insertion, restart and private replay after access loss.
Comparison: application atomicreceipt versus transportACK alone. These are
enforceable properties; failure-injection and restart checks are appropriate.
Criterion: COMMIT precedes ACK/broadcast, no second effect, invalidintent leaves
state/profile/receipt unchanged. Parent verified source and prior tests.
No process crash at every instruction boundary was simulated. Maintain that limit
and retain consumed-ID protection when revising outbox recovery. Status ACCEPTED
LOCAL; replay/privacy fence regression must accompany future changes.

## S1.I2b Snapshots and stream boundaries

Goal: current authorised state without private-edit activity or stale resurrection.
Source: access/snapshot, realtime project/tick and client reducer; privacy,
generation/epoch/closure tests.
Cases: lounge excludes layouts/chat; open-room grant; revoke-clear-lounge barrier;
old/new response ordering; reconnect/rapid switches.
Comparison: bounded fresh snapshots versus durableevent replay. Current snapshot
scope is feasible for bounded data; Socket.IO does not supply durable replay.
Criterion: no old private snapshot restores a revoked room; own/publicstream
ordering stays explicit. Earlier private revision leakage is corrected.
Parent agrees current boundary, but integrated hostile-delay/rapid-switch browser
faults remain not run. New memory projection must preserve every current session/
member/room fence and fresh semantic snapshots. Status ACCEPTED LOCAL WITH GAPS.

## S1.I2c Presence and movement transport

Goal: actual connected controllers and same-zone poses, never saved-profile ghosts.
Source: leases, per-action/delivery auth, movement, projection and cleanup; world
visible-player filter; authority/finite/speed/sequence/tab/recovery tests.
Cases: controller/observer, disconnect/reconnect, takeover, invalidsession,
privatezone, restart. Offline profile is not attention or study.
Alternatives: volatileposes+durablesemantics versus per-frame persistence.
Criterion: truthful current connection, bounded motion/correction and no old input
after control moves. Current local tests support correctness.
WAN/backgroundphone smoothness is not established; register bounded faults on
actual sessions. Memory comparison must preserve validmotion/content workloads
rather than simply reduce fields/features. Status ACCEPTED LOCAL WITH GAPS.

## S1.I2d Chat and pending outbox

Goal: correctly attributed scoped text commits once; uncertain drafts are reviewable.
Source: chat branch/retention, client outbox/sendEntry/flush, UIpending map; UUID/
scope/ACKtyping/retention tests. Normal send, ACKloss, reload, expiry, foreignscope
and privateaccess loss are separate.
Comparison: persistent UUIDoutbox versus transport-managed retry alone.
Criterion: originalUUID/payload/identity/house/zone remain immutable, pending differs
fromsaved and quota remains recoverable.
Fresh reconstructed16expiredentries yielded eligible0/OUTBOX_FULL; no inspect/
discard path existed. Parent verified exact source. Current outbox worker adds
own-only inspection/export/discard/manualretry and storage/readiness edges with
28clienttests; integrated browser faults still needed.
Also align selected100/7days with older200/page50 proposal. Status NEEDS CHANGE
until scoped native recovery and finalreview are complete.

## S1.I3a Layouts, routes and collision

Goal: reach every door/seat/board at all five capacities.
Source: shared createLayout/bedroomLayout/validPosition/slide/findRoute; swept
server validation; geometry tests cover90targetdirections/connectors.
Cases: rear/splitbanks, vacant doors, circleAABBbounds, tunnelling, protected
arrivals, DIYtransforms and chair approaches.
Alternatives: stable authored templates versus procedural packing/navengine.
Criterion: no trapped destination and matching rendering/authority semantics.
Current bounded templates pass mechanical routes; procedural replacement has no
demonstrated value yet. Parent retains90queryevidence and actual sixdoorframing.
Visible mesh/pick target correspondence is not automatically proven by shared
constants; verify side doors/obstructions in final native scenes. Status ACCEPTED
LOCAL WITH GAPS, not a claim of human navigation understanding.

## S1.I3b Avatar animation and prediction

Goal: own prediction and remote idle/walk/sit reflect actual authorised people.
Source: world update/syncPlayers/animate/rebuild/dispose; realtime poses/seats;
elapsed-time module and peer-rendered browser assertions.
Cases: correction, sit/stand, zone/controlchange, idle rebuild and disposal.
Comparison: prediction/interpolation versus delayed authority-only presentation
under matchedlatency; measure correction/task continuity separately from comfort.
The4fps speed regression reproduced0.52versus2.6 and was fixed to equal2.6.
A stubGPU test proves simulation, not hardware rendering. Parent source agrees;
native imagery exists for earlier candidate. More deterministic correction/
rebuild/disposal checks and current images remain. Status REVIEWED WITH GAPS;
worldreadability refinement owns those targeted cases.

## S1.I3c Keyboard, touch and IME

Goal: native movement never leaks from typing/composition/focus loss.
Source: world input listeners/canControl/clearInput, Dpad capture/cancel; browser
heldkey/touch/typing/resize tasks.
Cases: focusedcanvas, fields/contenteditable/IME, blur/hidden, pointercancel,
controlrevocation and reducedmotion.
Alternatives: Dpad+keyboard/context versus joystick or click-only. Use matched
navigate/type/sit/door tasks, rejecting stuckmotion/precision burdens.
Existing nativeCDP touch and typing isolation are meaningful, not realIME/phone.
Reducedmotion suppresses bob but retains limbs; describe that precise policy.
Parent requires actual softkeyboard/physicalinput follow-up when available and
synthetic cancellation regressions now. Status REVIEWED WITH GAPS / DEVICE NOT RUN.

## S1.I5a Lobby and feedback

Goal: clear create/join/pending/full/return behavior.
Source: lobby/form controls, api/bootstrap/save, HTTPreadiness and browserarrival.
Cases: blankname, invalid/fullcode, uncertainACK, hungfetch, transportfailure,
expired identity, removedhome and archivedexport.
Comparison: compactlobby versus fulleradmissionpreview; explain permanent capacity/
history without a compulsory tutorial.
Confirmed missing join/post disclosure and unboundedapi fetch; parent assigned
timeout/originalUUID/member-recovery and concisecopy toUIworker.
Current tests formerly assumed snapshot-beforeACK; new lateprojection/identity
responses exposed further races, so initialgreen counts do not settle acceptance.
Status NEEDS CHANGE; nativefault/recovery flow and sourcehash binding required.

## S1.I5b HUD, camera and conversation labels

Goal: gameworld leads while names/doors/messages remain readable.
Source: fixedcamera/DOMlabels, responsiveCSS/roster; measured1920/390bounds.
Cases: sixnearbyplayers, longUnicode, resize, openpanels/keyboard, quietmessages.
Alternatives: fixedview+collision-awarelabels/limitedpreviews versus closercamera/
transcriptonly. Match people/content/viewport/controls; mechanical occlusion and
preference are distinct criteria.
Sixspeakers produced six6second110UTF16previews, with no collision/globalcap/unread.
Parent verified literal contract3global/4sec/about80codepoints/twolines.
Worldworker puretests/currentnativeafterimages address this; tofu-font before
samples cannot count as matched glyph-readability A/B. Status NEEDS CHANGE and
DEVICE NOT RUN until correctly conditioned images/rectangles/review complete.

## S1.I6a Integrated invitation task

Goal: independent browsers create/join, recognise movement, converse and return.
Source: maintainedpair/readiness/native journeys plus actualHTTP/SQLite specs.
Cases: forms, receivingrenderer, plainmarkup, typing, cookie return, touch/resize
and uncertainoutbox recovery.
Method: integrated nativeUI/actualauthority is necessary; another renderer/
transport comparison needs a specific failure question.
Prior combined4/4/0retries proves an earlier dirty candidate only; this reviewer
did not rerunPlaywright. Final output needs exactruntime/static hashes and faults.
Parent retains early success and all harness corrections (select/wrapper/
touchcancel/latearrival) without relabelling them app failures.
Status REVIEWED WITH GAPS: bind a final maintainedsuite and realfault/recovery/
six-person readable conversation to the revised source and CI.

## Reconciliation and continuation

Parent checked confirmed defects against actualsource and contract. NewUI/client/
world workers own separate files, use activeper-subsection methods, observedred
checks and independent/contextual review. Acceptance is not promoted merely from
these reports. Currentregister rowstatuses distinguish localauthority, required
changes and human/device/deploy gaps; update each after affected evidence.
