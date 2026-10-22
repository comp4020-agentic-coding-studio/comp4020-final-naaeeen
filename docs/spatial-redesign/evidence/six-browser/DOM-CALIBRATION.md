# Production avatar DOM mapping calibration

23 October 2026. Offline preparation only; no browser, service or load run.

The contextual review concern that .house-avatar-name/data-player-id never exist
is not reproduced on production source8be15ef. house-world.js:57 constructs
.house-world-label.avatar;249–253 add its .house-avatar-display-name child and a
separate chat bubble;418 subsequently adds the legacy avatar class and playerId
attribute in syncPlayers. The actual production-DOM fixture observes six of both
structural labels and legacy aliases. The reviewer withdrew that absence claim.

Per root's requested robustness refinement, runner.mjs now serializes the shared
collectWorldPresence function from dom-observation.mjs. It reads structural avatar
labels and their actual display-name children, maps exact unique scripted names
to the six authenticated IDs, permits '(you)' only for the current self, and
never uses legacy playerId/class aliases. The runner separately requires each
authenticated /me profile name to equal its scripted name. Unknown, missing or
duplicate display names cannot acquire an ID. Existing mesh-ID, visible-label,
target, cleanup, privacy, source and240-second checks remain.

The new dom-calibration.test.mjs imports actual createHouseWorld/createLayout and
constructs the actual scene/DOM from a six-game-seat offline snapshot. It mocks
only WebGLRenderer submission, host RAF/layout/hit APIs. It evaluates the exact
reader's serialized function in JSDOM's isolated window context, then models the
Playwright return-value serialization into Node. No fictional positive label
markup or production diagnostic hook is added. This does not establish native
paint, viewport exposure, hit-testing or physical-phone acceptance.

Actual command, canonical WSL checkout:

```sh
SIX_DOM_CALIBRATION_OBSERVE=1 mise exec -- pnpm exec vitest run --config docs/spatial-redesign/evidence/six-browser/dom-calibration.config.mjs --reporter=verbose
```

The first attempt is preserved in dom-calibration-first.txt:3 positive failures
and7 apparent negative passes. The returned IDs matched, but Node deep equality
rejected live foreign-realm JSDOM array prototypes. That run is not accepted as
negative-control proof. The fixture now models Playwright's serialization bridge;
dom-calibration-green.txt passes all10 cases, including the positive baseline and
actual production mesh IDs, removed/spoofed legacy aliases, missing/unknown/
duplicate/wrong-self display names and ambiguous authenticated mapping inputs.

82 existing pure guard/final-decision controls also pass in
calibration-dom-wiring-v1.json. Syntax checks pass. inspect-dom-wiring.txt is
READY_HELD with509 source files and no network/browser start. The live source
manifest must be refreshed only after root's final UI/backend freeze and service
restart. The reviewed prior runner/guard bytes are preserved as review-v2-runner
(b6301f12...) and review-v2-guards (ae8036fc...). The latter preimage was recovered
by reversing the three explicit mapping edits and verifying its exact recorded
SHA256 before writing the archive; it is not represented as a fresh review.
