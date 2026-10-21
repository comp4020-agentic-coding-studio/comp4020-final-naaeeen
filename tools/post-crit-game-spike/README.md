# Isolated shared-break game comparison

Read [the pre-trial protocol](../../docs/post-crit/evidence/game-protocol.md), [spacing refinement](../../docs/post-crit/evidence/game-refinement-protocol.md) and [results](../../docs/post-crit/evidence/game-comparison.md). This directory is a disposable comparison fixture, not a second application or production game implementation. It uses original project palette and Unicode pieces/cards, with no copied commercial artwork. Fixed fixture identities and a deterministic deck are deliberate limitations.

From the canonical Linux repository root, using explicit installed Linux tools:

```sh
/home/lizhi/.local/share/mise/installs/node/24.21.0/bin/node tools/post-crit-game-spike/setup.mjs
/home/lizhi/.local/share/mise/installs/node/24.21.0/bin/node tools/post-crit-game-spike/probe.mjs
/home/lizhi/.local/share/mise/installs/node/24.21.0/bin/node tools/post-crit-game-spike/server.mjs
```

The server binds only127.0.0.1:4197; visit `/?kind=four&count=6`, `/?kind=chess&count=6` or `/?kind=cards&count=6`. Stop that owned foreground server before running `browser.mjs`, which owns its own server and rejects an occupied port. Get the parent GPU/browser slot before browser trials. The runner uses the installed Playwright1.63.0 and sandboxed Chromium1243 cache; no sandbox flags or host settings are weakened.

```sh
/home/lizhi/.local/share/mise/installs/node/24.21.0/bin/node tools/post-crit-game-spike/browser.mjs
```

Setup isolates chess.js1.4.0 under ignored `.local/post-crit/game-spike` with pnpm11.9.0 `--ignore-workspace --ignore-scripts`. The root manifest/lock/workspace are untouched. The retained [BSD-2-Clause notice](chess-LICENSE.txt) applies to the separately served chess.js code. No dependencies are copied into production. If a local package install initially prints Already up to date without installing chess.js, the repository workspace was selected; setup's explicit `--ignore-workspace` fixes this observed routing issue.

`engine.mjs` is shared pure fixture logic; `app.mjs`/`index.html`/`style.css` are matched DOM shells; `probe.mjs` records assertions and state sizes; `browser.mjs` records native browser activations/targets/screenshots. `window.spike` and Fixture: next actor intentionally expose fixture state and switch identities locally: they must never be production authentication. Browser output and screenshots are reproducible fixtures, not human evidence.
