# Night Neighbourhood visual research prototype

This is an isolated engineering comparison, not the final A3 application.
Fixed orthographic and bounded perspective 3D share the same scene/state;
the SVG isometric sketch uses different illustrative assets. Native controls
remain available independently of precise canvas picking.

Run in this folder with the existing Windows Node/npm runtime:

```text
npm install --ignore-scripts --cache .cache/npm
npm test
npm start
```

The server listens only on `http://127.0.0.1:4260`. Use separate tabs with
`?resident=alice&view=camera-fixed` and `?resident=bob&view=flat-iso`.
Choose the view/pixel setting in the page. Stop the task's own server with Ctrl+C.
If the port is occupied, inspect its process instead of killing an unrelated one.

The prototype uses explicit spoofable demo identities, a local `data/state.json`
file and HTTP commands plus SSE. Saved demonstration state can be reused after
restart. This is not production authentication, SQLite, Fly, power-loss durability
or the final room/neighbourhood layout. Do not copy the actor field or bounded
200-receipt store into production identity/idempotency.

Three.js is pinned to 0.186.1. Eight pinned CC0 KayKit files total 62,941 bytes;
three model types are rendered (two chairs, table and standing lamp). Other
architecture, plants, figures and the shared lantern are procedural geometry.
Asset hashes/licence are in `assets/kaykit/ASSET-MANIFEST.json`.

Fifteen meaningful domain tests pass; final coverage is 100% lines, 84.51% branches
and 100% functions for `model.mjs` only. Independent review led to obstacle,
picking/loading and selection-visibility fixes. This is not total application
coverage or proof of production authorization.

Read the [declared protocol](../../evaluation/visual-comparison-protocol.json),
[actual results](../../evaluation/RESULTS.zh-CN.md), [raw matrix](../../evaluation/browser-matrix.json)
and [final browser check](../../evaluation/post-review-browser-check.json).
Viewport and crop failures are retained and rejected, not reported as successes.
Phone-sized desktop rendering is not physical-phone performance/touch evidence.

Additional local diagnostics, run from the documentation workspace root:

```text
node final-project-docs/tools/prototype-api-check.mjs
node final-project-docs/tools/validate-plan-bundle.mjs
```

The API replay diagnostic expects the last accepted chair west/east demonstration;
if that state changed it reports NOT_RUN rather than fabricating a matching command.
The document checker verifies native syntax/links/hashes and image format, not
semantic truth, screenshot framing or runtime user experience.