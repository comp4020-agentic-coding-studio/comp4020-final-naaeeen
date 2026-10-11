# Design-first factual comparison packet

Source ea991747f83e81b5178c10cc86b0c1727062ba28. No new preferred winner or
earlier Crit9 scores. Use integer anchors from SELECTION-PROTOCOL.json.

## Context and outcome

Owner asks for a warm game-like house for2–6 known friends, real moving avatars,
conversation, owned DIY rooms and useful shared study/whiteboard. Owner tried the
core and explicitly rejected webpage-like UX, small proportions/poor tracking,
then requested a full standalone board. A narrower voluntary-peer-help job is
agent-derived provisional positioning, not a user-interview finding: when stuck,
find a willing familiar friend and retain an author-chosen next step. Quiet company
and ordinary conversation are legitimate without manufacturing a question.
All candidates serve this context. No real-human comparison/preferences validated.

## S: choose approachability rather than infer it from presence/location

Actual connection, declared Quiet/Can chat and saved room access are independent.
Only explicit command changes willingness; new controller lease defaultsQuiet,
same-token reconnect under30seconds may retain. Lounge-helper cue requires
connected+lounge+Canchat. Quiet suppresses bubbles, still receives transcript/
unread; metadata(name/zone/chosenstate/time) still visible. Closeddoor blocks
roomread/entry, but open exposes retained chat to current housemates; no promise
of invisibility/antiinterruption/attentivehelper. Sources realtime124–130/216–228/
270–273, UI188–210/world329, house-storeaccess.

Functionalalternatives: everyonlinefriendapproachable(nochoice); activity/proximity
inference(lowupkeep/fresherappearance); explicitinvitation+acceptance(visibleagreement,
moresteps); currentsoftdeclaration(agency/manualupkeep/staleness). Currentdefault
offersquietcompany withoptionalconversation; softhintnotmessagegate.
Beforeimplementation52ce8ee includes productcomparison/research+separatemeanings.
Code2f941e1/ea60440; f18fd52same-dayreviewrecord; UIreviewrefinedtime/unread.
Cannotclaim agentfirstimplementedautomaticconsent thenreversed, orhistoricalhumanAB.

## V: readable close play while preserving chosen overview and inspection

Currentcamera localperclient: self-follow deadzone defaultplay; explicitOverview
stayschosen whilewalking; draginspectionretained untilrecenter; editrestoresmode.
Tradeoff closeravatar/speech vs seeingdistantpeople/wholehouse. Whole-roomfit
worksfororientation; fixedclose protectsstationaritybutrequiresmanualnavigation;
automaticfocus savescontrolsbutcaninterruptchoseninspection. MovingHUDdoesn't
owncamera. Multiplayerpresence/name/speechcompetesforspace; cam itself mostlylocal.

Ownerlarger/game-like/poortrackingfeedback -> sourced alternatives -> camera/world/
labelcomparison -> reviewedimplementation ca57bb2, evidence dc99dad.
Matchedspatialrecord: HUDjump37.91/631.21px→0, scale72/128pxunchanged, noout-of-safearea
across462routes. Earliercamera+labelpackageimprovesprominencebutcropsfriends; not
camera-onlycausality. Historicale46camera bytes missing; finala615snapshotretained.
Nohumancomfort/awarenessgain. OldCAMERA-EVIDENCE forcedoverview behavior superseded.

## W: full focused board reached from house and independently

Ownerexplicitlyrequested completeboard+drawing/notes/images/movablechat usable
withoutgame. Sharedsurface has /board directlobby/identity/memberpermissions.
Embeddediframe closesroomchat, suspends/inerts world, uses house-wideboardchat/
pointerpresence; returnrestoresworldstate/focus. It is notseamlessroomchat/presence.
Sources UI22/30/95, boardmain89–98/135–137. f5a25f2 board, ca57bb2shell.

Alternatives: smallin-worldboardmaintainsimmersion/spatialcontextbutrestrictseditor;
alwayswebworkspace supportsstudybutweakensgame/personalplace; dualmode makesfocused
toolsavailablebutduplicatesentry/controlscope, switchingcontext andlifetimecost.
Architecturecomparison iframe vsintegratingrenderer recordedGAME-SHELL-EVIDENCE76–89.
Nativehistoricaltwoidentitycanvas/chat/undo/reload/directroute checks; nohumancoststudy.
Packagechoicebeforedeclaringsmallerboardisbad dependsactualjointsketch/longstudygoal.

## I: shared content, separately controlled view/history, shared awareness

Canvaspatch onlyid/house/elements; camerazoom/localeditingselection/historynotdurable
sharedstate. Remoteelements/collaboratorsuseCaptureUpdateAction.NEVER. Pointer/selectedIDs
broadcastasephemeralawareness, so notprivate. Chatmayautoscroll; closingiframeloses
nativeview/undo; sharedobjects canmove/deletestillvisible. Sourcesboardmain82–100/136,
contract287–300, client287–289. CurrentUI'cursor/selectionstaylocal' overstatesprivacy.

Functionalternatives sharedview/globalhistory simplifiescommonreference; opt-infollow
preservesescape butrequiresguides; independentviews requireawarenesscues andmorestate.
Nativepeerunrelatedobjectsurvivesownimageundo; same-objectintentions notguaranteed.
Noinspectedcurrenttwo-userzoom/selectionpreservationassertion. f5a25f2 source/history.

## C: personal commitment authority with shared explanations

Everyoneauthorizededitscanvas; goal/question/nextstep/helpRequested/closure authoronly.
Savingstepkeepsactive; closurechoicenotlearning. Loungecardsreadable, notprivate.
Sourceshouse-store370–393/UI225–245. Alternativesallsharedwithtruthfuleditorlabels/
delegatedproposalsenableagreedscribe/teamtasks; strictauthorruleblockslegitimatescribe.
DourishBellottiobservednegotiatedauthorshipwithoutmandatoryACLs.
Earlya7f596a/ea60440 actualimplementation; laterdraftrevisionreviews. NewADRandpolicy
comparisonwere12Octretrospective. Cleardesignpurpose, originalrulecorrectionlessclear.

## F: uncertain submitted intent and newer composition

Actualwithinretrywindow/currentauthorization commandskeepactor/text/id; retained
receiptpreventssecondmatchingdurableeffect; oldACKdoesnotclearnewerdraft. Responsive
canvasalreadyoptimistic. Functionalalternativesblockuntilreply, simplertruthful
optimisticfeedback orfullylocalexplicitlyscratchpad. Currentqueue/statuscomplexity,
expiry andunsentdraftquotarecoverylimits remain. Reportedtimeouts/imagevalidation/
nativeReactlooprefinementsstronger thanproduct-purposecomparison.

Currentrecordedmodule/HTTP/SQLitecases distinguish normal/lostreply/noCommit/delay,
notbrowser/HCIhumanbenefit. Evaluatorsneededraw-statecalibration andboundedwait
repair. These demonstrateverification, notthatthisisstrongestdesignchoice.
No universalexactlyonce orallsaved/recoverable claim.
