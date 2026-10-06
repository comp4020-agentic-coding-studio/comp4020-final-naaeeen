# Game interaction and independent whiteboard research

7 October 2026. This decision research follows the owner's actual negative UX
feedback. Product documentation, package/source findings and our design proposals
are different evidence; no reference game was played or human A/B trial conducted.

## References with concrete consequences

[Kind Words 2](https://store.steampowered.com/app/2118120/Kind_Words_2_lofi_city_pop/)
uses places for different writing activities and advertises longer writing and
accessibility. We infer that a lounge, bedroom and large board should have distinct
interaction modes. It does not establish synchronous avatar multiplayer for us.

[gogh's official operation guide](https://gogh.zendesk.com/hc/ja/articles/55293951004569-Operation-Guide)
separates furniture poses, editing, pan and zoom. Its
[developer news](https://steamcommunity.com/app/3213850/allnews/) documents 2026 chat
items and shared focus-party features. Old claims that gogh has no chat are stale.
We borrow contextual furniture actions and user-controlled chat visibility; do not
copy undocumented menu order, camera algorithms or exact model proportions.

[Nintendo's multiplayer instructions](https://en-americas-support.nintendo.com/app/answers/detail/a_id/49136/)
distinguish hosting and visiting by code. [Gather Classic movement](https://support.gather.town/articles/1285650718-looking-moving-around-the-office)
and [objects](https://support.gather.town/articles/5874848981-objects-overview)
show spatial navigation, camera inspection/return and contextual tools. We use clear
Create/Join/Continue intentions and usable board/seat affordances, avoiding extra
dialogue steps. [Palia's visitor/editor distinction](https://www.palia.com/news/patch-200)
reinforces that bedroom visiting must not grant decorating authority.

## Editor comparison under the same task

The common task is draw, sticky note, multiline writing/paste, image paste, two-user
editing, peer-safe undo, durable reopen and movable chat at desktop and phone width.

| Candidate | Existing value | Work/cost and disposition |
| --- | --- | --- |
| Excalidraw 0.18.1, MIT | Mature drawing/text/shapes/selection/zoom/undo/export | Host collaboration/assets/privacy/chat and bound-text sticky notes remain ours. Selected for an integrated spike with no production-key dependency. |
| tldraw 5.5.2 | Native notes and sync/storage APIs | Default SDK licence is development-only; production needs a valid key. No current key or approval is assumed. Reconsider if Excalidraw host semantics cannot pass. |
| Fabric 7.4 / Konva 10.7 | Canvas/scene primitives | Most complete-editor controls/clipboard/history/product UX still need building; too much duplicate work for this phase. |
| WBO 2.17.1 | Actual persisted collaborative app | AGPL integration and feature/auth/storage adaptation need explicit evaluation; not a drop-in complete study board. |

[Excalidraw FAQ](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/faq) explicitly
excludes collaboration from the npm editor. The hosted service's encryption and
sharing do not become features of our embed. [Public props](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/)
provide changes, pointer/paste events, local keyboard scope and embedding controls.
[Pinned reconciliation source](https://raw.githubusercontent.com/excalidraw/excalidraw/v0.18.1/packages/excalidraw/data/reconcile.ts)
uses versions and lower nonce ties; this is element convergence, not character-level
collaborative text. Remote changes must not become local undo steps.

[tldraw's current licence](https://tldraw.dev/community/license) requires an active
production key, including discretionary hobby use. [Sync](https://tldraw.dev/docs/sync)
can use an existing Node server, but host auth/assets/resource work remains.
No licence form was submitted. [Fabric](https://www.fabricjs.com/docs/),
[Konva text editing](https://konvajs.org/docs/sandbox/Editable_Text.html) and
[WBO source](https://github.com/lovasoa/whitebophir) were research references only.

## Actual installed compatibility finding

The parent verified the npm registry: Excalidraw 0.18.1 is MIT and advertises React
17/18/19 peers. React 19.3.0 initially installed, but actual `pnpm peers check`
failed against bundled Radix peers supporting only 16/17/18. Pinned React/DOM
18.3.1 resolved that mismatch; the subsequent native peer check passed. This is a
measured dependency compatibility correction, not a claim newer versions are bad.
The board is a separate React island; the vanilla Three game is preserved.

Native esbuild 0.28.2 builds browser assets; editor/font licences and needed font
assets are self-hosted. The Node production stage excludes browser-only packages.
A package build is still distinct from actual image execution and deployed use.

## Interface review and refinements

A fresh plan reviewer could not be spawned twice because the session reported its
agent-thread limit. A context-retaining independent-from-author reviewer was used
and labelled accordingly. It found merge/undo, binary snapshot, stale-event,
export, iframe/build, input and capacity gaps. The parent checked existing code and
addressed the contract before integration; fresh implementation review remains
required when a slot is available. This is not an agent-efficacy A/B experiment.

Metadata-only assets avoid duplicating up to 20 MiB into every snapshot. Per-action
membership/session checks, subscription identity barriers, canonical winners and
own-authored contribution export make the collaboration boundary explicit. The
same-origin board iframe is narrowly allowed; other pages keep frame denial. A
standalone route needs cold Create/Join without constructing a game renderer.

[Registered comparison protocol](../../evaluation/redesign-comparison.protocol.json)
separates geometry, camera and coherent UX trials. [Phased plan](../implementation/REDESIGN-PLAN.md)
records acceptance and limits. No screenshots/model agreement prove human appeal.
