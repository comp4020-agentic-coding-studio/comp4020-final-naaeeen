# S2–S3 detailed retrospective revisit

7October2026. Fresh reviewer audited all16capability/failure-path subsections
without parent chat history or earlier verdicts. Baseline fc86f0f plus dirty UI
SHA5060949d…; later contextual recheck used SHA1e520cf5….
Current source must be rebound after repairs. Actual new work here: in-memory
JSDOM/VM reproductions using realUI/geometry and mocked transport/GPU; no new
Vitest/Playwright/load/human/deploy by this reviewer. Parent verified source paths.
ActiveREPORT§§3–6 and granularmethods were reopened; proposed comparisons NOT RUN.

## S2.I1d Identity recovery

Invariant: original identity/occupiedroom returns even when capacity is full,
single-use proof rotates sessions and revokes old controllers atomically.
Source: issueRecovery/recover, HTTP recover, realtime revokeIdentity and UI
recovery handlers; store recovery/fullhouse/rollback and invalidsession specs.
Cases: issue/replace proof, first/second consumption, failed sessioninsert rollback,
oldsocket and HTTP revocation, full-house return.
Alternatives: cookie-only, proof recovery, accountlogin. Current bounded group
supports proof+focused authority checks; adding accounts needs observed benefit.
Local source/tests find no authority fault. Real two-context interrupted-response/
old-controller recovery remains a gap. ContextualUIreview also found delayedAproof
reappearing afterBidentity; worker adds generation/identity-bound response guards.
Status REVIEWED WITH GAPS; close only with actual recovery/export browser evidence.

## S2.I1e Transfer, removal and reinstatement

Invariant: coherent owner, stable originalroom, removal revokes/rotates code,
reinstatement permits fresh membership without resurrecting someone else's room.
Source: removedResidents and adminapply branches; renderHouse/renderRemoved;
store role/guard/pagination/isolation tests.
Cases: currentowner/member/selftarget guards, transferbeforeleave, atomicremove,
code invalidation, removedidentity rejoin denial, reinstatefullhouse and pagedread.
Alternatives: rotation only, stableidentityguard, individualinvites. Current
guard addresses identity return; it is not a guarantee against a new human identity.
Fresh actualUIreproduction insidebedroom retained oldcode/two rows while authorised
snapshot had newcode/one row, because privatecursor didnotchange. Parent verified.
Worker uses separate house/memberkey and stale-owner/request pagination guards.
Status NEEDS CHANGE pending native lounge/bedroom admin plus interrupted actions.

## S2.I1f Leave, archive and own export

Invariant: departure ends sharedaccess while originalauthor retrieves own room/
cardstep; nobody inherits former private content.
Source: depart/trimCards/exportOwn/house.leave; HTTPexport; lobby/downloadhandlers;
store departure/lastmember/archive/ownerOnly tests and lobby DOMtest.
Cases: transfer prerequisite, solearchive/code disabled, removed/left cards become
ownerLeft, snapshotbeforetrim, oldread denial, freshslot on rejoin, repeatedexport.
Comparison: minimal ownexport versus fullarchivebrowser. Current cutline favors
verified content/ownership over addednavigation.
No authority defect confirmed. Browser lastleave/transfer/remove/download/
recovery-afterleave and lostACK need direct checks; ensure no otherauthors' text.
Late oldidentity export completion also needs privacy guard alongside proof.
Status REVIEWED WITH GAPS; original source/export promises stay explicit.

## S2.I2e Controller takeover and observer

Invariant: oneidentity/oneavatar, currentcontroller acts and observers read.
Source: controller/takeover/subscribe/executeHttp token/generation checks; client
tokenconstruction and takeOver API; transport/clienttests.
Cases: secondtab observe, thirdtab denied, explicittakeover, oldinputs rejected,
seat release, fullreloadquiet, sametokenshortreconnect, delayedoldACK.
Alternatives: denysecondtab, explicitobserve/takeover, mostrecenttabwins.
Compare clarity/accidentalcontrol using the same two-tab task; correctness requires
no observerHTTP/socket bypass. Nativecookie actor remains server-resolved.
Source and scopedtests support current policy; real native takeover/edit/delayedACK
is outstanding. Status REVIEWED WITH GAPS. New memory path must keep every
current-session/current-member/zone/generation fence, not merely faster projection.

## S2.I2f Bedroom access and revocation

Invariant: ownclosedroom; samehouse/open access for visitors; revoke clears old
scene/data before authorised lounge return.
Source: access/snapshot/privateReceipt replay; switchToLounge/project; reducer
access/epoch/desiredzone barriers and deniedentry fallback.
Cases: closed/open/own, stale response afterclose, reopen freshgrant, removedviewer,
seatedclosure, deniedwalk recovering usable controls.
Comparison: open default, closed+explicitmember opening, per-visitor grants.
Current closeddefault is a small enforceable boundary; understandinghistory
sharing requires human judgement separately.
Fresh source confirms permissionchecks. OpeningUI omitted retainedconversation
disclosure; workersadd concise decisionpoint explanation. Deliberately delayed
close/reopen/removal browser faults still pending. Status NEEDS CHANGE for
disclosure/integration, not a claimed unauthorisedread bypass.

## S2.I2g Seats and reconnect leases

Invariant: oneoccupant, bounded reservation, no ghost after stand/zone/takeover/
removal/expiry/restart.
Source: lease release/prune, seatclaim/stand, resetZone/close; seat/race/lifecycle
specs and existing nativeE sit/stand assertions.
Cases: simultaneous claim, distant/occupied denial, sametokenreconnect within30s,
expiry, movedchair, invalidsession, restart.
Alternatives: immediaterelease,30slease,persistedseats. Current transient lease
balances shortdrop continuity with reclaim; durable seats would add ghost risk.
Tests support synchronous arbitration but several claims were sequential. Add
actual simultaneous clients, retainedseat reconnect and occupiedprocessrestart.
Status REVIEWED WITH GAPS; do not label observertransportcycle as controllerlease
expiry. Keep source/measuredscopes distinct in load results.

## S2.I3d Dynamic geometry and occupants

Invariant: savedfurniture cannot trap guests or retain obsolete sitposes.
Source: validatePlacements/bedroomLayout; realtime geometryreconciliation;
world control/gen corrections. Relevanttests cover footprint/route/movedchair.
Cases: blockedstandingpose, missing/moved/rotatedchair, changedapproach, several
people affected, staleoldmotion aftergeneration advances.
Alternatives: reject disruptiveedits, safeentrancereset, nearestvalidrelocation.
Current deterministic reset is bounded and auditable; compare disruption with
nearestrelocation only after actualediting need.
Source resetsinvalid occupants/releases seats. Add explicitremoved/quarter-turn/
multipleoccupant variants, not justmovedchair. Parent preserves originalgeometry
limits/arrival corridor and real slot-separatedspawns. Status REVIEWED WITH GAPS.

## S2.I3e Walks and contextual transitions

Invariant: continuousapproach/enter/return with readable permissionfeedback.
Source: BFS+connectors/slide; world targets/approach/action/strideclamp; UIinteract.
Cases: manualcancel, seatedstand, vacantdoor, closeddenial/loungefallback, validvisit,
occupiedseat and lowrenderfrequency.
Alternatives: manualonly, click-to-walk, directteleport. Match greet/sit/visit/return
and score mistaken targets, steps and tasktime while retaining ownermovementcore.
Earlier overshoot was real/fixed; reportedstaleheader was withdrawn after late
arrival screenshot. Later speedmodule reproduced0.52vs2.6 andfixedboundedelapsed
time. These do not establish physicalfeel. Maintain slowframe route/collision and
native vacant/closed/failure cases. Status REVIEWED WITH GAPS.

## S2.I5c Meaningful bounded DIY

Invariant: sixcategories/tenpieces, clear preview/save, ownrevision and recoverable
conflict/newerwork. Source: room.configure/placements; UIroomdraft/editor/save;
rendererpreview; domain/geometry/nativepersistence evidence.
Cases: add/nudge/rotate/remove/reset, save/reload, otherowner denied, takeover,
metadataonly edit, olderACK, same-roomdrop and externallayout update.
Comparison: explicitpreview/save versus perpieceimmediate versus presets, with
matchedarrangement/interruption task. Current promised scope favors retaining
recoverable local intent; expandcatalogue only after reliability.
Freshreproductions: submitted1piece/newpreview2 ->ACK1; reconnect2 ->saved1; oldplant
preview plus newerdesk/configrev2 ->oldplant sent withrev2. Parent verified source.
Worker adds scopedversioneddraft and ownreceipt-only base, explicit savedcomparison/
reset. Follow-up caught lateprojection after1.5swait reverting acknowledgedstate;
projectionbarrier added with redchecks. Status NEEDS CHANGE until finalnative/
contextualreview; original and new counts remain attributed.

## S2.I5d Quiet, Can chat and availability

Invariant: chosenwillingness differs from online/location/doorpermission; no
automaticpair/forcedcall/helperassignment.
Source: leasecreation/day/token policy, availability mutation, eligibilityroster,
worldquietfilter; chosenstatus and browser tests.
Cases: newlease/reload/restart quiet, shortsametoken reconnectretain, expire,
retreatwithout changingchoice, voluntaryreturn, offlineexcluded.
Comparison: declaration versus inferredactivity versus configuredDiscord statuses;
actualusers must interpret cues, not model preference.
Last-settime existed onlyintransport; unreadcue absent whenbubbleshidden.
UIworker nowdisplays explicitchosenfreshness and deduplicateddelivery badge;
worldliteralquiet suppresses speechpreviews. Test both freshness and eligibility
without inventingattention/study. Status NEEDS CHANGE / HUMAN INTERPRETATION NOT RUN.

## S2.I6b Scene performance and devices

Invariant: playable/readabletargetworld on desktop/phone whilemaintainingmovement.
Source: rendererpixelratio/shadows/camera/disposal, elapsed-time motiontest,
touch/resize native suite.
Cases: resize, slowframes, controllercorrection, reducedmotion, repeatedrebuild,
WebGLfailure/contextloss, realkeyboard/IME.
Alternatives: currentThree, reducedscene/shadows, movement-preserving2D. Match
sixresidents/tenpieces and measureframetime/input-response/taskcompletion before
switching. A differentrenderer cannot solve unvalidatedproductvalue.
SwiftShader walks originally15–19s andlater~10s; simulationequal-speed test is
stubGPU. PhysicalGPU/phone/IME NOT RUN. Keep serverRSS separate fromclientGPU.
Status REVIEWED WITH GAPS; no pleasantness/performance assertion from screenshots.

## S3.I4a Useful shared card

Invariant: optionalgoal/question/resource/nextstep supports voluntaryconversation;
peers cannot change/close author'soutcome and ordinaryentry needs no card.
Source: Cardcontract/storebranches, renderCards/form, two-author/native tests.
Cases: goalonly, explicithelprequest, independentauthor, savedstepstillactive,
unansweredquestion, explicitclose and return.
Comparison: smallcard, richcanvas, configuredDiscord thread/summary using actual
clarification/context/retrieval tasks; richcanvas earnscost fromobservedneed.
Currentsoftware supports chosenobject, not demonstratedusefulness.
Existingcardtest doesnotprove a peerconversation producedthe step. Addnative
chat→authorstep→processrestart task; humanvalue/next-day remains NOT RUN.
Status REVIEWED WITH GAPS; avoid turningeveryvisitinto a manufacturedquestion.

## S3.I4b Authorship, conflicts and newer drafts

Invariant: independentcards survive; losing/newertyping retained and explicitclose.
Source: per-cardrevision/author/state guards, cardDirty/version/base, outbox.
Cases: unrelatedupdate, staleedit, delayedACK, laterother-controllerrevision,
roomvisit/reconnect, pendingclose, statebecominginactive.
Comparison: wholeboardreplace, ownedoptimisticcards, CRDT. Currentownership makes
merge-machinery unnecessary; targeted samecard/conflict/delay checks are decisive.
EarliernewerACK preservation usedlatestcurrentCardrevision andcouldblindlyrebase
overexternallateredit; worker nowuses ownreceipt revision/resultID. Follow-up
reproducednormalACK-before-snapshot blankinggoal, requiring acknowledgedprojection
lock. Nativefault/two-tabconflict remains. Status REVIEWED WITH GAPS/NEEDS CHANGE
until new source/hashes and lateprojection checks are accepted.

## S3.I4c Card lifecycle and retention

Invariant: oneactive/author, newest12inactive, neverquota-evict active or falsely
resolve departure. Source: trimCards/depart/cardclose/save; renderedstate/copy;
store retention/overflow/archive tests.
Cases: explicitclose, ownerLeft, archivebeforetrim, deterministicties, newcurrent
afterclose, inactivewrite denied, concurrentclose/depart/restart.
Alternatives: unboundedarchive, replacement, boundedinactive+ownexport. Current
scopeiscredible ifretainedset/activepreservation/exportordering verified.
Currentoverflow mostlysequential; addconcurrentquota-boundary andrestoredordering.
Status REVIEWED WITH GAPS. Codeclosed is authorchoice, not verifiedcorrectanswer;
ownerLeft is never substitutedwithsolved.

## S3.I5e Literal text, resources and readability

Invariant: safe/readable conversation, Quiet awareness and informedhistory sharing.
Source: codepointbounds/textContent, HTTPS/no credentials/no remotefetch,
noopenerlinks, chat100/7days; world preview policy.
Cases: literalmarkup, longChinese/emoji, sixsenders, frame/controlclustering,
initial/reconnecthistory, unreaddedupe, shortenedpreview/fulltranscript.
Alternatives: transcript-only, boundedbubbles+transcript, remote linkpreview.
Criterion: attribution/limits/safeviewport and honestquietdelivery; previews add
fetch/privacy cost without currentneed.
Confirmed contractgap:6sec/110UTF16/noglobal3/twolines/collision andunusedchat-count.
Workers implementdelivery-based4sec/80codepoints/3global andintrinsiccollisionlayout,
plusjoin/post/open copy and7daystatement. Nativefonts exposedtofu; changedfont
conditions cannot be a matchedvisualwin. Status NEEDS CHANGE pending realafter
rectangles and conditionedglyph/softkeyboard-simulation disclosure.

## S3.I6c Peer-help and next-day loop

Invariant: willingconversation leads to authoredstep, laterretrieval remainsowned.
Source: PLAN G2/G3, positioning, storeCard/export/restart, scriptedbrowsercard task.
Cases: willingreply/noresponse, silentparticipation, authorstep, leave/archive,
reload/restart, uncertain/stale save.
Comparison: fairlyconfiguredDiscord statuses/thread/summary, registeredparticipants/
order/coaching/interruption/retrieval/reusechoice. Scriptedrequests prove usability
only, not naturallyoccurringneed.
Existingreload retrieves scriptedtext; no realnext-day continuation orconversation-
derivedstep observed. Add integratedactualtextchat→step→restart ascodeacceptance;
separatelyrecruitvoluntaryreturn trial whenpeopleavailable.
Status HUMAN NOT RUN / REVIEWED WITH GAPS. No participant, personalreflection,
preference orHDguarantee is manufactured.

## Parent reconciliation and next gates

Originalfreshreview found sixP2groups. Contextualrecheck found lateprojection ACK
andold-identity proofresponse cases after initialworker green; distinguish these
from a new independenttrial. Parent assigned scoped UI/client/world repairs,
inspected source against the contract, and requires actualred/green, sourcehash,
nativeflow and finalreview perID. Finalrepairrecords live in UI-REFINEMENT,
OUTBOX-REFINEMENT and WORLD-READABILITY; update acceptance only after evidence.
