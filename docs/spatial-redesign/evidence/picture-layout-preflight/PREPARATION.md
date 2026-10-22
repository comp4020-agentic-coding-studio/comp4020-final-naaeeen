# Picture layout component preflight

This is a prepared matched technical comparison, held before any browser run.
The actual six-browser attempt remains a failure at
`../six-browser/run-current-seats-first/`. Its runner, protocol, targets and
240-second deadline are unchanged. The old phone surface exposed only six of
twelve pieces; tray bottom864px and paging bottom908px exceeded844px height.

The new ignored runner is `.local/picture-layout-preflight/runner.mjs`; its
fixture and guards live beside it. It imports the captured production picture
component, content, illustration and CSS. The wrapper comes from the real
`house.html` panel; its title, visibility, counts and explanatory text follow
`house-ui.js`. The fixture introduces no layout CSS or service/session traffic.
Six scripted long names, six placements by six scripted actors, joined count6,
the24-piece picture and all wrapper controls are identical between variants.

The comparison factor is the full old versus repaired picture HUD pattern:
roster presentation and grouping/locations of actions, expressed through
`house-puzzle-ui.js` and `house.css`. The comparison cannot attribute an effect
to a single CSS property or disclosure choice. Old bytes match the failed run:

- component `72c10db20bd73294b2cc8931a45c0b4f32f00c9b73fbd58c095749fb3d2ee8ab`
- CSS `ac23672a5b3bf349b29463eea8881b98de79e6ddbcef5a08bffab9b045f44e00`

The UI owner confirmed the unchanged create/update/dispose API and native
`details[data-puzzle-menu]`, summary, player list and Close selectors. Only the
self list entry appends ` · you`. Actual list names are measured after native
scrolling; collapsed core layout is measured before any interaction. Next/Previous
use actual buttons; ArrowRight/Enter use real browser keyboard input. Callback
stubs do not persist anything: only an explicit fixture roster projection changes
participation after callback invocation. This is component behavior evidence.

The fixed90-second deadline covers six component cases: old/new at390×844,
1920×1080 and844×390. It is sufficient for the declared local layout interactions
without admission, network, route movement or six rendered worlds. There are no
retries. Baseline layout failures are recorded for the matched comparison;
any repaired-case failure stops after capture and cleanup. Baseline geometry
outcomes are recorded without stopping candidate measurement; an infrastructure
or unknown fixture/interaction failure still stops. The exact gates and
scope are declared in [protocol.json](protocol.json).

Preparation checks: three JavaScript syntax checks passed;22 pure guard controls
passed, including clipped/offscreen/obstructed/under44px/missing-control and
cleanup-failure counterexamples. Old capture hashes matched the actual failed
run. These checks started no browser and make no native-layout claim.

The fairness refinement preserves the earlier runner/protocol as ignored
`pre-fairness-*` byte copies; their hashes are in `fairness-preimages.json`.
Baseline tasks use inline names, Return and Replace; new disclosure selectors
occur only in candidate task branches (optional surface diagnostics may observe
whether a summary exists). The captured baseline production component and the
exact shared fixture pass seven browser-free DOM/callback controls at a nominal
1920×1080, with queries for new-only selectors deliberately rejected. There were
zero such queries. [baseline-control.json](baseline-control.json) scopes this to
JSDOM wiring; native desktop geometry and real browser input remain NOT RUN.

For later reproducible curation, the two old changed inputs already have safe
preimage source paths under `docs/spatial-redesign/evidence/picture-phone-six-before-*`.
The other old inputs are exact Git blobs at `fbdc853:public/<path>` and are also
verified against the failed six source manifest. The eventual bound source map
lists every input path/hash. After parent inspection, copy the frozen ignored
runner/fixture/guards/control and necessary input sources byte-for-byte into safe
evidence, or record their exact committed Git blobs. Raw captures and bodies stay
ignored. This packaging does not change the comparison or six-browser scripts.

After the UI source freezes, capture repaired bytes once:

```sh
mise exec -- node .local/picture-layout-preflight/runner.mjs --bind
```

That emits `source-binding.json`, including live production hashes, captured
old/new bytes and runner/fixture/guard hashes. Parent reviews it and gives a
separate GO before the one fresh-label run:

```sh
mise exec -- node .local/picture-layout-preflight/runner.mjs --run --label current-compact-first --protocol PROTOCOL_SHA --freeze SOURCE_MANIFEST_SHA --runner RUNNER_SHA
```

All raw results and untouched native PNGs remain ignored. Concise metadata alone
is written here. Even an automated pass is `PASS_COMPONENT_LAYOUT_VISUAL_REVIEW_PENDING`
until original images are inspected; it never supplies six-user, human A/B,
physical-device, persistence, performance or deployment acceptance.
