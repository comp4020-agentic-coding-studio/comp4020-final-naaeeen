# Shared-house research ledger

Accessed6October2026. Primary source claims and our design judgement are separate.
Store pages establish developer descriptions, not actual play or wellbeing effects.
Documentation establishes API capabilities, not performance on our256MB machine.
Measured results and rejected trials belong to [the evidence record](../planning/COMPARISON-AND-REVIEW.md).

## Reference products

| Source | Supported feature / design consequence | Limit |
| --- | --- | --- |
| [Kind Words2](https://store.steampowered.com/app/2118120/Kind_Words_2_lofi_city_pop/) | Cosy rooms,letters,neighbours; borrow gentle reciprocal dialogue and later notes | No reusable game API or source inferred |
| [gogh](https://store.steampowered.com/app/3213850/gogh_Focus_with_Your_Avatar/) | Avatar/room customisation,shared focus rooms,timers; combine ownership and studying | Our2-6capacity comes from owner,not its16 |
| [Virtual Cottage2](https://store.steampowered.com/app/2943180/Virtual_Cottage_2/) | Multiplayer home visits,cafe,minimal chat/reactions | Does not prove free walking,permanent bedrooms or board |
| [Mini Cozy Room](https://store.steampowered.com/app/3511030/) | Shared visits,text/emoji/mini notes,Focus Mode,avatar placement on furniture | Placing a figure is not evidence of WASD movement |
| [WEBFISHING](https://store.steampowered.com/app/3146520/WEBFISHING/) | Social camp,shared activity and toys; actions can anchor conversation | Do not import fishing economy/collection scope |
| [Spirit City](https://store.steampowered.com/app/2113850/Spirit_City_Lofi_Sessions/) | Styling,ambient sound,companions and focus tools | Source does not establish multiplayer benefit |
| [Chill Corner](https://store.steampowered.com/app/1749630/Chill_Corner/) | Rooms,weather,pets,decoration/tasks | Idle presentation is not controllable multiplayer |
| [Tiny Glade](https://store.steampowered.com/app/2198150/Tiny_Glade/) | Forgiving construction; borrow snapping,palette and undo principles | Its procedural building engine is far beyond initial scope |
| [Gather](https://www.gather.town/) | Walk-up interaction,availability/focus cues | Current2.0 site differs from old pixel examples |
| [WorkAdventure](https://workadventu.re/open-source/) | Browser world and custom maps | Full platform,not a Three.js plugin |
| [Animal Crossing](https://animalcrossing.nintendo.com/new-horizons/share/) | Shared island and friend visits; ownership/hospitality | Page does not verify detailed furniture actions |

The connected house,permanent personal rooms,truthful embodied presence and study
board form our proposed synthesis. It is not a claim that nobody has ever combined
these ideas. No new commercial game was purchased or played during this round.

## Frameworks, editors and current versions

| Primary source / capability | Consequence and adoption status |
| --- | --- |
| [Three AnimationMixer](https://threejs.org/docs/pages/AnimationMixer.html) and [SkeletonUtils](https://threejs.org/docs/pages/module-SkeletonUtils.html) | ExistingThree0.186.1; independent mixers and skeleton-aware clone; retargeting helper is not automatic rig compatibility |
| [RenderPixelatedPass](https://threejs.org/docs/pages/RenderPixelatedPass.html) | Optional explicit addon; compare costs with reduced-resolution rendering |
| [Socket server](https://socket.io/docs/v4/server-initialization/) |4.8.4 verified and installed in isolated spike only; attaches to existing HTTP |
| [Delivery](https://socket.io/docs/v4/delivery-guarantees/) / [recovery](https://socket.io/docs/v4/connection-state-recovery/) | Default at-most-once and possible recovery failure; keep receipts and current snapshots |
| [Colyseus rooms](https://docs.colyseus.io/room) / [0.18 migration](https://docs.colyseus.io/migrating/0.18) | Room/schema lifecycle alternative; corresponding SDK/schema5 required; not installed |
| [Official Three example manifest](https://raw.githubusercontent.com/colyseus/realtime-tanks-demo/master/web-threejs/package.json) / [MIT licence](https://raw.githubusercontent.com/colyseus/realtime-tanks-demo/master/LICENSE) | OlderThree0.170/SDK0.17/legacy client; reference verified patterns rather than replace whole stack |
| [Node24 SQLite](https://nodejs.org/download/release/v24.21.0/docs/api/sqlite.html) | Existing synchronous API; short transactions and measured event-loop budget |
| [Konva releases](https://github.com/konvajs/konva/releases) / [Fabric releases](https://github.com/fabricjs/fabric.js/releases) | Official10.7.1/7.4.0 research snapshot; object editing,not collaboration backend |
| [Excalidraw README](https://github.com/excalidraw/excalidraw) | MIT React editor; npm editor differs from hosted app collaboration/encryption; not adopted |
| [tldraw licence](https://tldraw.dev/sdk-features/license-key) / [sync](https://tldraw.dev/docs/sync) | Production key required; Node/SQLite integration is possible; authorisation/assets remain ours |
| [Yjs releases](https://github.com/yjs/yjs/releases) | Stable13.6.33 versus14RC; CRDT is not a board UI |
| [Web Audio](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices) | Start by user gesture with volume/mute; no Spotify integration needed |
| [Upload guidance](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) | Bounded decode/content/access checks before optional images |

Uninstalled editor versions are source snapshots,not locked production choices.
Windows registry retrieval failed TLS without disabling validation; official
release sources were used. Socket.IO was independently checked by the worker
through npm and exact local lock. Recheck package metadata before future adoption.

Excalidraw's npm package has drawing,image,undo features; hosted-app realtime is
separate application code. tldraw's SDK is not generally MIT; its production-key
requirement makes licence continuity a real selection cost, although its sync
can use our Node/SQLite rather than requiring Cloudflare. Konva/Fabric remain
credible later board upgrades; a few bounded DOM/SVG objects need neither first.
No platform or commercial editor was installed merely to follow a skill.

## Models, animation, audio and templates

[KayKit Adventurers](https://kaylousberg.itch.io/kaykit-adventurers),
[Character Animations](https://kaylousberg.itch.io/kaykit-character-animations) and
[Furniture Bits](https://kaylousberg.itch.io/furniture-bits) have publisher CC0 terms
and glTF/FBX formats. Same-family clips include idle,walk,sit,wave. C8 already
contains a small pinned furniture subset; new character rig integration is not
verified in this round. Fantasy characters are a technical starting point,not the
promised final student appearance. Procedural figures provide an original fallback.

[Kenney furniture](https://kenney.nl/assets/furniture-kit) and
[animated characters](https://kenney.nl/assets/animated-characters-protagonists)
are CC0 alternatives. Page labels do not prove every file format/animation clip.
[Quaternius pack](https://quaternius.com/packs/universalbasecharacters.html) still
says CC0, while [current general terms](https://quaternius.com/license.html) are
QALv1.0,updated28August2026,with asset redistribution restrictions and a
non-retroactive clause. Obtain the actual download's licence; do not resolve
conflicting pages by guessing.

Before art adoption record exact source/version/hash,licence,format,scale,pivot,
orientation,footprint,seat anchor,material and animation clips. Use one avatar rig,
small palettes and local immutable catalogue IDs. Animation cloning/material
changes must not accidentally recolour all six figures.

[WorkAdventure deployment](https://github.com/workadventure/workadventure/blob/master/contrib/docker/README.md)
uses multiple services. Its [play licence](https://raw.githubusercontent.com/workadventure/workadventure/master/play/LICENSE.txt)
contains AGPLv3 with Commons Clause. It is an experience reference,not a permissive
drop-in starter. No purchased music/game textures are reused. Ambient procedural
rain or a separately licensed short loop can be added after user-controlled audio.

## Course and agent workflow sources

[Final brief](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/assessments/final-project/)
requires distinguishable users,visible realtime shared change and persistence.
The owner adds the particular house experience. Official final deadline is
9November2026,noon Sydney; the two-week build is a chosen budget.

[C9](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/crits/09-all-at-once/)
needs real-time plus one consequential multiplayer decision.
[C10](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/crits/10-fly-by-instruments/)
needs server logging/live observation and an instruments-only group demo.
[Assessment](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/topics/assessment/)
specifies desktop1920x1080 and phone390x844. Next exact group cutoffs need current
schedule verification before release; no assumed date is presented as confirmed.

Inherited focused methods provide source recording,predeclared comparisons,fresh
reviews and parent verification. Old A2 runs/model pins/paths are historical.
[Agent evaluation guidance](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
helps distinguish task/outcome evidence from model self-claims. No historical
benchmark was replayed for a larger score. This research is not the owner's final
personal reflection or a claim of human-tested delight.
