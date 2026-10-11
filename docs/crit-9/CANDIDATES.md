# Implemented decision candidates for Crit 9

Current source: dea0b7a. This factual packet does not nominate a winner.
Use DECISION-SELECTION-PROTOCOL.json. Scores are structured judgement, not grades
or human preference data. Current implementation/Git evidence is inspected;
previous release tests are historical until an affected check is rerun.

## A — Merge object edits rather than replace the whole thinking surface

Behavior: separate canvas object edits merge. Higher element version wins; lower
nonce breaks equal-version ties; exact ties prefer deletion then canonical order.
Missing objects in an incoming patch do not delete peer objects. Remote editor
updates are outside captured local history. A losing submitted patch receipt can
retain a recoverable local draft; restoring it is a new higher-version edit.

Value: friends can work on separate objects without a stale full scene erasing
unrelated contributions. Same-object concurrent text is a whole-element winner,
not character-level editing or semantic agreement.
Alternatives: full-scene replacement; selected-object locking; operation/character
merging. Costs: retained tombstones use quota; fine-grained intention is not
preserved universally. An edit accepted then overwritten later need not enter
the local conflict list. Restoring a draft can itself overwrite a peer.
Counter-case: for jointly writing the same paragraph, a mature text editor or
a lock may be preferable. The current app cannot promise every edit or undo
preserves another person's same-object intention.
Evidence: README34–36; src/board-contract303–310; src/board-store196–238;
board/client185–197,297–304; board/main82–87; specs board-store72–161,
board-client116–131; tests/e2e/board88–104.
Commits: 321e27c authority; f5a25f2 editor/client. Demo: two people add different
objects, then one undoes; same-object conflict is a separate stronger challenge.

## B — Publish willingness as a declaration, not an inference from presence

Behavior: Quiet/Can chat is a user's choice independent of online state, location,
sitting/moving and bedroom permission. A new controller lease defaults Quiet;
same controller reconnect under30 seconds may retain its declaration. A lounge
helper cue requires connected + lounge + Can chat. Last-set time is displayed.
Quiet suppresses floating previews; messages and unread cues still arrive.

Value: visible company need not be a claim of attention or invitation to reply.
Alternatives: all online friends approachable; activity-inferred willingness;
explicit invitation before every conversation; configured Discord statuses.
Costs: manual upkeep, stale declarations, conservative default may make the house
socially empty. Connected Can chat has no inactivity expiry. The cue is neither
an enforced consent/DND barrier nor a guarantee of response.
Counter-case: familiar friends may prefer spontaneous interruptions and ordinary
social negotiation; a manual switch may add work without enough benefit.
Evidence: README22–25; src/house-realtime216–228,270–273;
public/house-ui188–210; public/house-world329; house-realtime test185;
house-ui104–109. Commits: 52ce8ee purpose, 2f941e1 authority, ea60440 presentation.
Demo: remain at a shared table while Quiet; friend sends a message; transcript
and unread survive without a floating preview. Toggle Can chat without movement.
Human interpretation and interruption reduction are not tested.

## C — Share a thinking surface, reserve personal study commitments to their author

Behavior: current housemates can edit canvas objects. Study cards are a different
state type: all housemates can read them, but only their author may rewrite
goal/question/nextStep or close the card. Expected revision rejects stale
same-author edits. Saving a next step leaves the card active; closure is explicit.
Cards are personal in authorship, not private in visibility.

Value: a helper can contribute a diagram or suggestion without declaring another
person's intended action or that their question is solved. This extends the
README's voluntary-help / author-written next-step purpose into data authority.
Alternatives: let every member edit/close all cards; make both canvas and cards
author-only; rely on social negotiation without permission boundaries; delegate
card editing explicitly. Costs: two permission models, no direct co-writing of
another person's card, no delegation, a poor fit for a genuinely shared team plan.
Counter-case: a group-assignment team may want a communal goal and pooled
responsibility, where author-only closure is unnecessary friction. The split
must follow this individual-study target, not a universal claim about autonomy.
Evidence: README34–39; src/house-store370–393; public/house-ui225–245,405–418;
house-store134–149,189–192 and card ownership/closing cases; board-service
current membership/edit checks; board-store independent edits.
Commits: 52ce8ee purpose; a7f596a card authority; ea60440 UI; 321e27c/f5a25f2 canvas.
Demo: B adds a shared explanation but cannot edit/close A's card; A writes a
next step and explicitly chooses whether to close. Denial does not mean privacy.
Technical permissions do not prove improved learning, comfort or market value.

## D — A member is a returning person, not a connected browser

Behavior: capacity counts permanent member records. Offline residents keep rooms.
An existing member returns before capacity checks; recovery restores identity in
a full house and revokes old sessions. One avatar controller, other tabs observers.
Alternatives: attendance-counted capacity; temporary guests; login accounts;
membership expiry. Costs: dormant friends consume scarce capacity, recovery key
handling, owner removal/transfer chores.
Counter-case: a two-person space can block a new willing friend because an
inactive resident still belongs. Continuity competes with flexible attendance.
Evidence: README10–12,45–49; house-store171–175,230–237,309–325;
house-store47,67,120 tests; house-realtime98 controller test.
Commits: a7f596a membership; 2f941e1 live controller.
Demo: close A's tab, fill all slots, reopen A with original/recovered identity.
Current functional continuity is verified; natural next-day return is not.

## E — Opening a bedroom grants reading/history access, not decoration authority

Behavior: bedroom closed by default. Opening permits current members to visit
and read retained room conversation; visitors still cannot decorate. Closing
revokes current private view and returns a visitor to the lounge.
Alternatives: always-shared rooms; per-person invitation; read-from-now-only
history; separate private messages. Costs: an all-housemates switch and history
disclosure that people may not expect; no retroactive erasure of downloaded data.
Counter-case: permission to visit may not be understood as permission to read
previous conversations. A physical-door metaphor can mislead as well as help.
Evidence: README18–25; house-store108,144–147,242–249,345–368;
house-realtime108–114; house-store97–117; realtime110.
Commits: a7f596a; 2f941e1. Demo: authorized visit, rejected DIY, close/revoke.
Human comprehension of the history boundary is not validated.

## F — A missing reply is pending, not evidence that the action saved or failed

Behavior: durable action UUID/receipt and state commit transactionally. Retry
keeps original payload/UUID; changed payload under a consumed ID fails. Local
draft is not cleared by an old acknowledgement if the user typed further.
Alternatives: optimistic saved label; retry with a new ID; manual fresh action.
Costs: receipt retention, pending/error UI, local recovery storage and bounded
automatic retry. Session storage is not cross-device or crash-proof recovery.
Counter-case: too much pending machinery can overwhelm a simple social task;
the tradeoff is strongest where a claimed commitment or drawing must survive.
Evidence: README39–43; board/client43–88,172–202,280–285;
board-store178–194; board-service454–470; client/store rollback/replay tests.
Commits: 321e27c/f5a25f2. Demo: lost receipt and safe replay on isolated service.
This is a behavior/trust contract; transaction complexity alone is not its value.

## G — A narrow familiar-peer help purpose, rather than a general cozy platform

Behavior/position: related-course friends, a brief voluntary conversation when
stuck, author records their next step. Compared with a fairly configured Discord.
Costs: excludes broad community/productivity use; 3D may add setup/movement burden.
Evidence: positioning/0004 records; 52ce8ee; README definition.
Counter-case: questions may be rare or configured Discord better. Demand untested.
For C9, this supplies context; alone it lacks one precise concurrent-use rule.

## H — Resource/GPU/agent harness optimization

Implemented examples: explicit server budget, bounded delivery index, idle-only
GPU draw budget, native source checks. Strong process/correctness evidence and
real failures exist. These support reliability of many people using the artifact.
Counter-case: choosing a Node heap setting does not itself answer what people
should be allowed to do together. For C9 this is supporting process evidence,
not a substitute for an argued collaboration behavior decision.

## Authorship and evidence boundaries

Owner explicitly requested real controlled avatars, 2–6 capacity, owned DIY
rooms, shared study and a full independent board, and requested narrowing purpose.
Precise willingness, card/undo/recovery policies were derived/implemented through
agent work; commit authorship does not prove student invention. This task lets
the student critically select/adopt/defend a policy now, without invented memories.
No human A/B, demand, learning benefit or grade is inferred from tests/model review.

## Post-review scope errata, 12 October

Original reviewer input is retained above. D's continuity refers to historical
verification, not fresh whole-system execution. C closure records author choice,
not objective learning; author-controlled cards are readable by housemates.
Current checks and refined claims are in SOURCE-AND-CODE-EVIDENCE.md/VERIFICATION.md.
