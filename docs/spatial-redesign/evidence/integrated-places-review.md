# Fresh integrated place review

23 October2026. Fresh GPT-6 Astra/max, no previous chat. Read-only packet: factual
2–6 friends' house goals, current source range93f8cfa..8be15ef, selected production,
README and relevant spec/native cases; no earlier review verdicts. No service,
browser, load or full suite was run by this reviewer.

Two P2 findings were checked by the parent against the actual UI/server paths:

1. `apply` stopped following on presenter change without retaining the displayed
   crop. A JSDOM reproduction followed(x.2,y.8,zoom3), then jumped to center1x on
   departure. A new claim retained server3x but the presenter showed local1x.
   Existing tests checked role text rather than visible continuity.
2. Phone inspection exposed Fit/Zoom but panning required keyboard arrows. Pointer
   taps placed a marker; they did not provide touch panning. The old native phone
   case only inspected centered zoom, leaving the off-center task untested.

Assigned bounded repair: same-image last-followed crop freezes on presenter loss;
new explicit presentation must match its visible crop. New image/session must not
inherit old material's view. Compare native pan controls with touch dragging using
phone reachability, marker conflict, accessibility and implementation cost; add
focused RED/GREEN and actual off-center phone task. No backend redesign is needed.
Current repair/recheck/native results remain pending and will be appended here.

The review found no additional concrete permission blocker in its inspected paths.
It did not validate room usefulness or preference. Its source-reading conclusions
remain checked against concrete code and evidence rather than accepted by role.
