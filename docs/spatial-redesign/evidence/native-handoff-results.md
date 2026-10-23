# Final source-bound native handoff results

23 October 2026. Ten selected Playwright cases pass on repaired core
`e800f4efa225d103ab8e5d4d309368803465484d`; the single whole-six journey passes
its mechanical gate with parent pixel inspection still pending. This record
does not replace the parent's resource qualification or human/device acceptance.

| Selection | Actual result | Framework task duration | Cleanup |
| --- | --- | --- | --- |
| Unchanged motion transition | 1/1 PASS | 24.163s; case22.567s | Actual context close; zero owned/browser processes |
| Four spatial journeys | 4/4 PASS | 134.673s | Zero owned/browser processes |
| Maintained recovery/game | 5/5 PASS | 138.475s | Zero owned/browser processes |
| Whole-six | PASS_VISUAL_REVIEW_PENDING | 165.824s /240s | Six resolved context closes/events, disconnected browser, zero contexts/processes |

Every Playwright case uses its unchanged60-second case budget,300-second global
bound, one attempt and zero retries. Exact framework JSON records show ten
expected passes, no skipped/unexpected/flaky cases, and isolated passed last-run
files. The four-case timings are38.726/42.182/27.178/25.881seconds. The maintained
case timings are31.640/32.535/42.990/11.793/18.150seconds. Raw logs, reports and
original captures remain ignored.

The unchanged motion spec hash is7d8e14a5b0d1527249e60b0c1c657e6eef281c0a9c526ee95249fcbbfac96e9c.
Its four actual seat-held cycles and owned-room arrival finish with every observed
request settled and no movement/action rejection. First move after Stand ACK is
107.481–153.570ms; the room subscribe-to-first-move observation is103.106ms.
Sub80-after-Stand coverage remains0/4, so this pass does not exclude that timing
hypothesis. The original old-client native functional RED remains unchanged.

The unchanged whole-six runner completes32checks:24unique placements from six
authenticated authors/four each, six distinct physical chairs/visible labels/posed
meshes, voluntary Leave/Stand/reseat, reload/fresh consent and actual phone Return
to its authenticated owned room while preserving the saved picture. The complete
frame-rejection ledger is empty. All six contexts have resolved closes and actual
close events; none remains. Browser disconnect and zero remaining contexts are
confirmed. All29observed owned command/browser processes are absent after the run.

All648current source/runtime/build paths remain unchanged around every selection.
The source manifest is2737fa44d4fe771b1fc311404e49712aa814b2521f6436db5290f14a4fbc660a.
The retained service remains PID72794 with35current startup hashes and launch
record fbfa83ce63baad97340ba14349f1101ea90a52c8917740fcc77e2ae287aeb374.
The existing six runner additionally verifies its512file source binding, runner,
protocol and final closure. The full map is retained once in
[native-handoff-final-source.json](native-handoff-final-source.json); each
selection's before/after record and the [summary](native-handoff-summary.json)
provide current results and relative raw paths.

Seven distinct spatial PNGs and six whole-six PNGs remain unpublished with
PARENT_PENDING inspection. Their dimensions, chunk CRCs, byte sizes and SHA256s
are recorded; no screenshot was claimed inspected by this executor. The parent
owns native pixel review/curation and the separate resource lane.

The native lane is IDLE and released after complete process/context cleanup.
No service lifecycle, production/spec/runner change, credential/configuration
change, commit, push or deployment was performed by this executor.
