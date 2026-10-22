# Proposed picture-container proxy correction

Status: proposal only. The original evaluator, protocol and first preflight FAIL
remain unchanged. Independent contextual review and a separate GO are required
before applying this amendment or running preflight2.

The archived diagnostic kept candidate component06f26f19/CSS808cd54c and the same
844×390 wrapper. At board sample(387,370.421875), `elementFromPoint` returned
`SECTION.puzzle-board-section`, an ancestor. The other four samples hit the
board or a cell. All24 actual cell targets passed their own five-point hits and
47.656px minimum dimensions. The board rectangle fit entirely within the frame.

In the same isolated session, an opaque overlay blocked all five board samples
and all24 cells. Removing it restored identical original hit identities. Changing
only the fixture border-radius10px to0 changed the disputed sample to the board,
without moving its bounds or cells. This establishes a false negative in the
decorative3px-inset corner proxy. It does not establish current source acceptance.
Exact points, allowlisted hit identities and styles are in
[hit-diagnostic-first.json](hit-diagnostic-first.json).

Propose retaining all board-container bounds, visibility and clipping checks,
and five active container hit tests at the board center plus centers of its four
corner cell content regions (destinations0,5,18,23). Every sample must hit the
board or a descendant; ancestor and foreign hits are rejected. These five points
come from the actual native diagnostic transcript, inside the readable picture
content rather than its decorative rounded cut-outs. The unchanged24 cell
targets still require finite in-frame bounds,44px dimensions, no clipping and
all five of each target's own hit samples. All12 tray targets, paging/primary
targets, native task outcomes, source binding, cleanup and90-second deadline stay
unchanged. This corrects a derived proxy; it changes no user task.

The separate ignored `proposed-board-proxy.mjs` is not imported by any acceptance
runner. Its calibration requires original rounded and square boards to pass,
the actual opaque overlay to fail, and offscreen/clipped/hidden/missing/duplicate/
under44px/individual-target/ancestor-hit counterexamples to fail. Partial-cell
counterexamples combine actual blocked-cell and unoccluded native transcripts;
they are explicitly derived controls, not a native partial-overlay experiment.
An actual partial-overlay negative remains NOT RUN. The proposed next preflight
must first place a native opaque cover over interior cell7, leaving the board's
five content samples unoccluded while the actual cell7 target fails. Removal must
restore the full target/bounds decision. This prelude runs inside the same
unchanged90-second preflight budget, using its first candidate context; a separate
reviewed preflight GO is still required. Candidate outcomes cannot be accepted
unless the native negative rejects and restoration passes. Derived composites
cannot substitute for this actual control. No extra browser is inferred now.

The proposed v2 implementation is held separately in ignored
`.local/picture-layout-preflight-v2/`, with its explicit draft
[protocol](../picture-layout-preflight-v2/protocol.json). It also adds actual
onLeave callback assertions, candidate pending-Join/Retry and durable-pending
recovery-task reachability/status checks, and the native focused initial-Start
transition into the exposed Join target. Full puzzle fit is not required while
pending recovery blocks play; ordinary playable states retain every original
layout/target gate. No second preflight has run or been bound.
