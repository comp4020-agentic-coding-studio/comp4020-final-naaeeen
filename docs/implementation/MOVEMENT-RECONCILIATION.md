# Movement reconciliation: verification protocol and record

7 October 2026. R2 movement/collision and R4 acceptance reopened by actual CI
37596250446 at61e297e. Earlier release evidence is preserved, source-specific.

## User outcome and defect

Holding movement must move the real avatar visible to a friend. Local prediction
must not keep travelling away from the server after a dropped or rejected packet.
The latest failed owner PNG places its avatar far across the room; the peer PNG
and roster retain x0.1861. This establishes divergence, not the exact first
transport rejection. Nominal geometry/speed simulations did not reproduce rejection.

## Alternatives and criteria declared before native verification

Compare the existing fire-and-forget volatile movement with one bounded volatile
ACK flight and client correction. A reliable queued emit is another alternative,
but replays obsolete movement after stalls. Full authoritative input simulation
could avoid absolute-position reconciliation, but changes the protocol and is not
needed before testing the smaller repair. Keep server sequence, ownership,
controller/access generation, collision, speed3.2/credit.64/tolerance.06 and80ms
rate protections unchanged. Do not relax any browser threshold or retries.

Common tasks: held manual movement, furniture corners, autoroute to a door,
rejection/timeout then continued held movement, stale lifecycle replies and
ordinary desktop/touch room interactions. Failure disqualifiers: an unbounded
prediction/queue, accepted local chord rejected by the unchanged collision guard,
stale reply mutating a new identity/zone/control state, or weakened acceptance.
Stop when meaningful red regressions become green, independently reviewed
findings are resolved, affected unmodified native tasks and required checks pass,
and actual approved CI/deploy/live checks verify the released candidate.
This is a technical comparison and regression review, not a human A/B experiment.

## Current evidence

- Baseline client uses volatile emit without receipt; the world advances sent and
  prediction optimistically. The server already supports bounded ACK replies.
- Official Socket.IO documentation describes at-most-once default delivery,
  volatile discard and timeout acknowledgements. Installed version4.8.4 is the
  implementation authority. No transport replay guarantee is inferred.
- Worker actual client/service and world factory regressions pass on the frozen candidate.
- Fresh no-history review reproduced a plant-corner emitted chord rejected by the
  unchanged server sweep: shared slide is not idempotent. Refine by validating
  emitted chords, rather than assuming a second slide accepts its own output.
- Parent required board build/typecheck/spec:485 PASS across27 files. Affected native2 PASS; remote release remains OPEN for the current candidate.

Sources: [delivery guarantees](https://socket.io/docs/v4/delivery-guarantees/) and
[client API](https://socket.io/docs/v4/client-api/). No WAN reliability, physical
phone, enjoyment or grade claim follows from the local synthetic checks.

## Review and refinement on the frozen candidate

The fresh reviewer received only goals, constraints and current code, without
parent conversation. It reproduced a plant-corner chord with a .030633659-unit
server-sweep error, beyond the unchanged .01 tolerance. The worker independently
reproduced that red case, then validates each predicted endpoint from its ACK
anchor. A valid wall component is preferred; otherwise at most eight stride
shortenings prevent invalid emission. The contextual recheck ran126 focused tests
and confirmed the finding fixed, with no further actionable findings. That
recheck retains reviewer context and is not a second fresh trial.

The frozen implementation keeps a one-second volatile ACK flight, no obsolete
replay queue, at most .65 travelled units of outstanding prediction and a guard
against stale identity/house/zone/epoch/access/control/seat replies. Failed or
busy movement restores the last authority while keeping held movement intent;
autoroutes replan from that authority. Server rules and the100ms dispatch ceiling
remain unchanged, with80ms after settlement to avoid bunched server arrivals.

Worker184 affected tests:client43, world58, realtime25 andUI58. Red controls
covered missing dropped/rejected receipts, five-motion versus one-flight
prediction, the furniture corner, busy correction and continued held movement.
Actual isolated Socket.IO authority tests cover transport discard, server guards
and a furniture-induced control-generation change. Client statement/branch
coverage93.39%/88.31%; world92.42%/82.88%. These scopes meet the affected-code
target; they are not full-project coverage or browser proof.

The first wrong default-config test invocation waited for missing8080 and did not
run the relevant cases. It is an infrastructure outcome; the corrected existing
house config supplied the product results. The exact first CI transport failure
remains unproven.

## Parent verification and commit

Source commit `5c40545` contains only the two production movement modules and
three affected specs. Parent board build/typecheck/spec passes485 across27 files.
Unmodified native `ci-core.spec.ts` passes20.5s and `house.spec.ts` seats/doors/DIY/
visitor revocation passes29.6s onlocalhost4093. The test observes a real second
identity's roster/avatar movement, text dialogue, persistence and room transitions.
These are native software-rendered desktop/touch viewports, not physical phones
or WAN impairment. [Exact result](../../evaluation/movement-reconciliation.results.json)
binds the frozen five source hashes. Original preview data/cookies andCrit8 refs
are preserved. Required evidence/diff checks pass; the existing commit hook ran.
Actual approved main CI/resource/backup/deploy and selected live-source checks
remain pending. Do not inherit earlier b95 remote acceptance for this new source.

## Evidence provenance and review limits

The retained parent logs are private
`.local/redesign-closeout/motion-required-check.log` and `motion-native.log`; the
coverage summary is `.local/house-coverage/coverage-summary.json`. Five source
hashes are committed in the JSON result. The worker's184-case checkpoint and
historical red runs were returned as tool output, without separate saved logs.
The126-case contextual reviewer run was reviewer-reported output; the evidence
reviewer did not rerun it or inspect a raw log. These facts limit replayability
of those intermediate checkpoints; they are not substituted for parent checks.

A second fresh read-only evidence review verified the current five hashes,
parent485/27 and native20.5/29.6 logs, coverage figures and committed regression
assertions. It reported no actionable inconsistency. That was an evidence review,
not another application test. A separate exploratory lane did not complete source
inspection after Windows/WSL tooling errors, so it supplies no independent root-
cause evidence and is not counted as a completed code review.

## First corrected-source CI: resource workload failed

[CI37600728762](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/actions/runs/37600728762)
at71ec3a7 passes485 required cases and all nine maintained image browser cases.
The300.001s registered resource result is FAIL solely on workload: ten skipped
scene-write slots and every board pointer below18Hz (16.283–16.617Hz). All other
gates pass, including204.97MiB peakRSS, normal deliveryp95118.948ms, no missing
delivery, no unexpected disconnection and full recovery. Deployment is skipped.
[Exact failed artifact](../../evaluation/board-resource.motion-publication-fail.results.json)
and the original [v1 protocol](../../evaluation/board-resource.protocol.v1.json)
are preserved. No threshold, skip count or result has been relabelled.

Backend, protocol and instrument hashes match the earlier300s PASS; motion client
and world are outside this synthetic backend workload. This failure does not by
itself establish an application regression or a proven host cause. Inspection
finds the generator's reflect function scanning every retained historical delivery
on each received event and six more times after every HTTP write. Completed
history grows to7,886 records in this run. This synchronous evaluator work shares
the generator timers/ACK event loop. The proposed refinement indexes outstanding
obligations while retaining every full delivery record for final pending/counters.
Its acceptance is exact grading equivalence, bounded completed-history work,
unchanged scheduling/criteria, fresh review and a newly frozen full resource run.
The causal performance effect is unmeasured until that run.

Resource tracker sourcee54a694 preserves every criterion and obligation; parent
495/28 PASS. [Refinement evidence](RESOURCE-TRACKER-EVIDENCE.md) records actual
red/green, alternative comparisons, fresh review and new source freeze. Full
CI/resource/deploy/live acceptance remains pending; application5c40545 unchanged.
