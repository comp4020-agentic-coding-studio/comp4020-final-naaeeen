# P2 factual source and verification packet

For an independent read-only review, supply this packet with the actual source.
Base: `1699d44` on `post-crit-improvements`; P2 is an uncommitted local diff.
Canonical checkout: Ubuntu/lizhi `/home/lizhi/comp4020/comp4020-final-naaeeen`.
Review current goals in `docs/post-crit/PLAN.md`, especially P2. Do not load the
worker handoff, P2-ROOM-UI review history or earlier review verdicts.

## Goal and source

Owners receive varied furnished rooms; existing rooms change only through explicit
owner preview/apply. Desks and direct My work open the single existing current-user
house-visible work card in any zone. Visitors see their own work. Owner lamps and
direct lighting controls save a bounded visible setting. Keep chair pose coherent,
drafts and original pending intent safe, observer read-only, and closed/membership
access revoked. Preserve P1 camera policy, controls, posed-body labels and observer
measurement. Preserve all original data and deployment/resource constraints.

Inspect the diff in public/house-ui.js, house-world.js, house.html and house.css;
src/server.ts has only the static allowlist addition for house-room-content.js.
Corresponding checks: spec/house-ui.test.ts, house-world.test.ts, house-http.test.ts
and maintained tests/e2e/house-journey.ts. No P2 edits to camera/client/store/shared
geometry/contracts/game modules. Room content and v2 authority already existed at
foundation 1671cec.

## Inspectable verification artifacts

- `rooms-ui-browser.results.json`: complete two-identity localhost task at actual
  1920x1080, 390x844 and 844x390, all listed criteria true, no failures/page errors.
  `rooms-ui-fulltask-source-manifest.json` binds production files and the exact
  preserved `rooms-ui-browser.fulltask-v1.mjs` runner. These full-task
  and helper runs precede only the final sticky-heading CSS; other runtime hashes match.
  Final affected shell/Close/card-state checks use current CSS as described below.
- `rooms-ui-helper.results.json` and helper source manifest: separate physical
  desk/lamp probes at all three sizes through the maintained bounded projection
  helper imported by current `rooms-ui-browser.mjs`. This probe is shorter than
  the complete task; do not substitute it for that full-task record.
- `rooms-ui-shell.results.json` and `rooms-ui-final-source-manifest.json`: final
  sticky-heading scroll-bottom Close44px actual hit, return control and preserved
  active card at all3viewports, plus desktop/portrait Follow seated captures.
  `rooms-ui-shell.red.results.json` and partial result retain failures; the historic
  160ms zero sample is unexplained. Current3s functional hold is not latency proof.
- `rooms-ui-image-validation.json`: original PNG dimension checks. Original
  screenshots show rooms, work, seating, lighting, previews/apply and observer.
- `rooms-ui-tests.results.json`: exact affected test/coverage summary and recorded
  failure/refinement scope. Native browser and domain/mocked tests are distinct.
- `P2-ROOM-UI-PROTOCOL.md`: declared task and acceptance before native trials.

## Review rubric

Trace normal and denied interactions end to end; check independent work/room
cursors, delayed ACK then Close/new card, preserved newer drafts, unknown command
ID/payload/revision/destination, dirty adoption and delayed starter snapshot,
lighting bases, automatic and explicit pending recovery, identity/access changes,
observer mutation before outbox entry, duplicate desk/lamp selection and chair
render orientation. Verify no P1 camera/label regression or incidental ownership
change. Evaluate visible UI at supplied native dimensions and inspect the evaluator
for stale projection, hidden selectors and unsupported claims.

Report concrete reproducible findings and source pointers. Native local automation
is not physical-phone, human preference, actual friends, live deployment, or the
original sustained resource gate. Parent final required checks and acceptance are
separate from this worker packet.
