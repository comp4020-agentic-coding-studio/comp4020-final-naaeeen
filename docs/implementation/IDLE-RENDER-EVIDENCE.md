# GPU-only idle rendering refinement

7 October2026. Run37587377555 at38148c8 passed454required checks. Eight native cases passed; peer admission remained visible
under the unchanged10-second guard. Resource/deploy did not run. The previous
verified d693d06 release remains the deployed version at this checkpoint.

## Evidence and alternatives

Root inspected the failing native image and filtered only request paths/status/
timestamps and action selectors/times from its own synthetic trace. Join command
returnedHTTP200 in5.674ms and subsequent identity read200 in1.608ms. Title-join
click took8.684s. The network service is not the observed slow component here;
browser/render scheduling is a supported hypothesis, not a proven soleGPU cause.

[Three's current demand-rendering guide](https://threejs.org/manual/pages/rendering-on-demand.html)
recommends avoiding redundant drawing of unchanged scenes and invalidating after
input/data/resize changes; damping needs continuing updates. [React Three Fiber's
performance guide](https://r3f.docs.pmnd.rs/advanced/scaling-performance) describes
the same principle. We borrowed the principle without changing frameworks. The
old cleanup URL had moved; [current cleanup](https://threejs.org/manual/pages/cleanup.html)
and installed0.186.1source agree on explicit resource disposal.

Compare unchanged continuous drawing with an idleGPU budget. The initial metadata
trial excluded FPS changes; this separate phase explicitly changes only GPU
submission while stationary. All simulation/input/speech/labels/network and active
movement/interpolation/camera updates keep their existingRAF cadence. Dirty scene,
material, membership, pose, selection, projection, resize and resume force redraw.
A100ms safety refresh bounds static redraws to10Hz. Models, lights, shadows, AA,
resolution, actual movement speed, deadlines and retries remain unchanged.

## Red, review, native comparison and current acceptance

Two renderer-spy controls failed: the old stationary world drew60times/sec.
Forty-two existing/other controls passed. Final47cases cover firstframe, movement/
send cadence, remote walking/settling, camera easing and immediateAPI projection,
material/geometry/selection/resize, DOMspeech while drawing skips, pose changes,
reduced-motion walking and resume. A new fixture incorrectly assumed positive
seated lift; it was corrected against the unchanged geometry constant. The fresh
reviewer reran47PASS and checked12settled camera cases for numeric churn.

One matched native pair used the same two-person task/names, viewport/browser/
renderer/server/origin settings, fresh browser per candidate and baseline-first
order. Baseline create345ms/join9861ms; candidate create251ms/join257ms. Owner draw
counts during their different task durations were77and8. Fixed order, cache and
host effects remain confounds; this is not a rate/reliability/battery or human
preference measurement. Source-specific results remain preserved separately from
the earlier geometry trial; no winning repetitions were manufactured.

Parent inspected final source/diff and actual rendered owned-room image. Existing
strict native game core passes19.6s and real seat/door/DIY/access flow33.2s. Required
board build/type/spec passes465checks in27files. Affected world coverage alone is
92.95% statements/83.81% branches; this does not erase board69.85/67.67% or its
React entry's zero unit coverage. The registered serverresource source/protocol
is unchanged; no new local full load was run.

[Exact final source/evidence](../../evaluation/idle-render.results.json) binds
review, comparison and actual gates. Raw own-fixture trace/timings/images stay
private under.local/redesign-closeout. Refined remoteCI/deploy/live source and
critical flows remain required; successful remote run identity must be checked
before goal completion. Future visual animations must participate in dirty/active
invalidation; do not lower simulation cadence to match idleGPU draws.
