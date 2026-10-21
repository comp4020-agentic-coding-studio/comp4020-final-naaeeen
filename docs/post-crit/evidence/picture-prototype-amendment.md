# Picture prototype: environment and grader amendment

Declared before the final matched tray comparison, 22 October 2026. The original
protocol remains preserved. Both final candidates use native CSS viewports of
1920x1080,390x844,844x390, DPR1, isMobile:false and hasTouch:true for portrait and
landscape. Native keyboard and dispatched software touch remain tested. This is
not physical-phone acceptance or acceptance of Chromium mobile-device emulation.

Initial isMobile:true portrait PNGs contain missing crops and up to96,360fully
transparent pixels despite an opaque page. `picture-prototype-portrait-diagnostic`
and `picture-prototype-native-layout-diagnostic` bind the same UI source hashes;
only the latter uses isMobile:false. The former fails alpha-aware PNG grading;
the latter renders the whole picture opaquely. DOM/SVG crop refinement is not
identified as the cause or fix. The final source gets a further same-source paired
portrait diagnostic with clientWidth,visualViewport scale/width andDPR recorded.
Invalid captures are not labelled a demonstrated application-image defect.

The final common sequence is identical in both modes: find/place cat-tail by
pointer, select cat-book by keyboard for the simulated peer event, then place
shelf-leaves by keyboard. Aggregate input counts from earlier mismatched sequences
are superseded. Explicit page/scroll browsing and keyboard arrows are reported
separately from scripted activations and the completion audit. No solving time or
human preference is measured. Ground-truth target knowledge is used by the runner.

Grader refinement checks ancestor clipping and center hit targets as well as
viewport rectangles, including selection/instructions, the completion message,
chat close/input/send and toolbar controls. PNGs must have zero unexpected dark or
nonopaque pixels. Every loose piece gets a separate native-keyboard reachability
audit. These changes tighten omitted checks; initial green results are retained
but do not prove the omitted conditions.

Completed trays deliberately retain labelled, aria-disabled placed placeholders
so a peer update never removes the focused button. The completion message replaces
the empty selection summary. This tests completion with retained placeholders;
it does not test an empty tray. Reload deliberately resets all local data.

The source has one original continuous SVG,24semantic crop descriptions, no
backend or server-game edits and no new dependencies. Full screen-reader access,
nonvisual meaningful contribution, actual3-6person balance/fun, physical phone,
WAN synchronization and durable lifecycle remain outside this prototype evidence.


## Further bounded refinement before final acceptance

`picture-prototype-matched-final` disproved treating isMobile:false as a general
capture fix: its completed pictures also had transparent regions after the newer
completion-summary source change. That environment-as-fix inference is withdrawn.
CDP view capture (`fromSurface:false`) and the simpler CSS crop renderer reproduced
the invalid regions; both failures remain. Installed Playwright1.63.0 CDP types
and the [official Page.captureScreenshot definition](https://chromedevtools.github.io/devtools-protocol/tot/Page/#method-captureScreenshot)
were inspected; no sandbox flag or browser installation was changed.

The parent proposed a simpler board: one continuous original SVG under stable
opaque cell covers. Correct placements reveal that one image. This changes only
the common board renderer in both tray candidates; the same semantic crops,
shuffled tray, controls and targets remain. A bounded desktop-pages diagnostic
passed opaque native capture and every interaction/inventory check. It is evidence
for this refinement under those conditions, not a confirmed Chromium root cause.
The final comparison uses this board in both candidates. Phone cells are about
53.3px. Small muted text also uses shared#53624c after a fresh contrast finding.
A separate53px-crop inspection sheet is labelled separately from gameplay PNGs.
