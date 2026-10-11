# Round 2 recommendation: preserve intent during uncertain collaboration

12 October2026. This supersedes the first-round choice for the owner's new joint
question: demonstrate HCI reasoning **and actual AI-agent direction/correction**.
It does not invalidate the earlier personal-card decision or claim a universal best.

## Recommended single Crit 9 decision

**Keep a submitted collaborative action's original identity and content while its
confirmation is uncertain; accepting an old reply must preserve newer composition.**

For this house, a friend should be able to help while the learner continues
thinking. A save/send is one submitted intention. What the user types next is a
new thought. Delayed feedback must not collapse those two into the same state.

Concrete example: Alice sends a question to Bob, then starts a follow-up thought.
The server may save that question even though Alice loses the reply. Bob can
already see it while Alice still has an unconfirmed original. Retry uses the
same stored command ID/content/identity and its retained receipt rather than
creating another effect. A later acknowledgement clears only the matching
submitted composer version; Alice's newer text remains.

Frame the scope as **submitted operations**, not “everything the user types is
durable”. Current unsent chat drafts have a separate storage/export gap.
Do not call recovery an exactly-once network guarantee.

## Why change the first-round recommendation?

The first round prioritized observable multiuser rules and product purpose.
Author-controlled cards were a strong clear choice. It did not separately weight
a genuine agent correction chain. The owner now asks for both HCI and agent practice.

This decision joins those dimensions in one concrete task:

- HCI: the user can distinguish local interaction from confirmed submission,
  retain their current work and recover without reconstructing the original action.
- Multiuser behavior: the sender and peer may have different knowledge of the
  same already-saved action; retry must not create a duplicate or act as another person.
- Agent judgement: checking a Saved label or a passing helper suite cannot establish
  that the intended outcome exists or that newer work survived.
- Engineering: stored commands, atomic receipts, identity/house checks and
  draft-version guards make the intended behavior inspectable.

These are related layers of one uncertain-submission policy, not four unrelated
feature decisions. The user value remains a reasoned hypothesis; technical checks
cannot demonstrate that people understand or prefer the interface.

## What evidence makes it deeper than a generic reliability claim?

Historical records describe specific accepted corrections:

1. Native numeric TimeoutError was treated as a domain rejection, dropping the UUID.
2. A missing-image/text callback could lose work before validation and Retry
   displayed Saved without a POST.
3. Retaining rejected work then caused a native React rendering loop despite
   scoped passing checks; delta-only notification was needed.

Current source/regressions and actual feature commits corroborate the accepted
behavior. The red/green chronology is in same-day worker-authored records, not
independently inspected raw executions. Most internal repairs are consolidated
in feature commits; never invent a separate commit for each fix.

This round also tested the current board module against a real isolated HTTP/
SQLite authority. Normal, committed-but-lost, uncommitted and delayed replies
exercised exact serialized retries, peer snapshots, receipts/replay, persistence
and newer-draft retention. This is current module/HTTP evidence, not browser,
deployed latency or human usability.

The evaluator itself needed refinement: initial synthetic controls altered
precomputed check booleans. Raw-observation grading replaced that weak
calibration. A fresh reviewer then found an unbounded delayed-hold failure path.
Those are genuine research/harness corrections and are retained, not erased.
Final status and exact artifacts are in VALIDATION.md.

## Alternatives and costs

| Option | Legitimate benefit | Cost or failure |
| --- | --- | --- |
| Immediate local interaction with explicit confirmation/recovery: current scoped choice | Drawing/typing stays responsive while submitted intent remains recoverable. | Queues, status and recovery controls add complexity; current draft/expiry limits remain. |
| Treat timeout as definite failure and create a new send | Simpler mental model and implementation. | Original may already exist; duplicate effects/questions can confuse the conversation. |
| Mark local rendering as Saved | Minimal feedback friction; can be acceptable for an explicitly local-only scratchpad. | In this shared persisted app, local appearance does not prove what peers/server retained. |
| Block interaction until server reply | Simplifies completion feedback and prevents overlapping drafts. | Connection delays interrupt thinking and the next input; still needs a timeout/recovery policy. |

Current canvas already uses optimistic local interaction. The decision is
**confirmation semantics**, not optimism versus pessimism in general.
A simpler truthful optimistic interface is a credible alternative; a real pilot
might find our queue/status controls too costly. Reopen based on comprehension,
duplicate sends, loss/abandonment and recovery effort, not a preference for
technical complexity.

## What to show and what to be ready to explain

Start with one question/follow-up example. Show a pending original, peer's saved
view, same-command retry and intact newer text. The new probe demonstrates those
mechanics; a user-facing dropped-reply browser demonstration is still a rehearsal
task, not already recorded evidence. Keep the card ownership and chosen
willingness as context, not extra main decisions.

Be able to explain with the files shut: why no reply does not imply no commit;
why a new UUID changes semantics; what counts as confirmation; why newer draft
version matters; what the peer can see; and what remains unverified. The ability
to account for those choices matters more than memorizing this report.

## Known gaps are part of the judgement

Current board draft-only typing is outside submitted pending work. Under failed
local storage it can show a saved header plus a visible error, and export omits
the unsent/newer composer text. Expired board queue heads stop all Retry, unlike
the house's inspected explicit retry. The UI also overstates pointer/selection
locality. These require future targeted correction; research has not repaired
runtime behavior or declared the entire app ready.

Use the precise scoped decision now. Do not turn it into “all work is always
saved/recoverable”, “no peer intention can be lost” or “users learned more”.
Student PROCESS/reflection and deployed C9 acceptance remain separate.
