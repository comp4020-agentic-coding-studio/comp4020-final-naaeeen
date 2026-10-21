# Post-Crit research and design implications

Access date: 22 October 2026. Primary-source desk research for the
[owner feedback](OWNER-FEEDBACK.md) and [plan](PLAN.md), not a usability study.
Official descriptions establish advertised mechanisms, not productivity effects.
The authoring agent checked sources and the project manifest, applying the
available evidence-driven-work skill. No account, game or asset was installed.
[COMPARISONS.md](COMPARISONS.md) separates proposed trials from actual results.
Parent review and implementation acceptance remain open.

## Personal places and voluntary social activity

[gogh's official announcement](https://steamcommunity.com/app/3213850/announcements/)
labels version 4.0.0, 29 September 2026. It distinguishes ordinary multiplayer
rooms with individual timers from its new Focus Party sharing one timer. Social
co-presence therefore need not mean synchronized work. The announcements also
list 4.0.1 on 12 October. Our inference: arrival, desk use, availability and breaks
should remain independent; a shared timer would require an explicit choice.
This mechanism comparison does not establish that our house needs timers.

[Kind Words](https://store.steampowered.com/app/1070710/Kind_Words_lo_fi_chill_beats_to_write_to/)
uses a cozy room for writing and receiving supportive letters, with stickers.
[Kind Words 2](https://store.steampowered.com/app/2118120/Kind_Words_2/) adds
neighbors, recommendations, coffee-shop poetry and wishes in the night sky.
The useful precedent is place-specific social actions. Our desk can open My work,
chairs support sitting, the lamp expose one saved setting and the lounge support
a voluntary break. Do not import anonymous counseling or imply private study
cards: the existing author-owned card remains house-visible. Preserve the direct
My work entry so walking is an optional interaction, not an access barrier.

[Spirit City](https://store.steampowered.com/app/2113850/Spirit_City_Lofi_Sessions/)
combines room/avatar customization, music, focus tools and collectible spirits.
[Virtual Cottage](https://store.steampowered.com/app/1369320/Virtual_Cottage/)
presents an atmospheric place around a self-selected goal.
[Chill Corner](https://store.steampowered.com/app/1749630/Chill_Corner/?l=english)
advertises decoration, tasks, character/pet customization and rest quests; its
separately listed mini-games DLC should not be described as mandatory core play.
[On-Together](https://store.steampowered.com/app/3707400/OnTogether_Virtual_CoWorking/)
combines co-working, hangout spots and break games. Its
[September school update](https://steamcommunity.com/app/3707400) also describes
a lounge and shared whiteboard. These establish credible ambient and active
alternatives, not novelty for our combination or evidence that our larger lounge
will work. Do not copy their progression, artwork or music. Personalization is a
valid experiential goal without inventing a productivity benefit.

## One shared game: preserve meaningful alternatives

Common task: an optional three-to-six-minute pause with immediate exit and an
understandable watching role. Four-in-a-row offers a public 7-by-6 board, at most
42 placements and two active players. These simplify inspection and restart;
they do not guarantee a short elapsed round or make it the best experience.
Four residents may only watch in a six-person house. Seven column targets offer
a plausible phone advantage that still needs testing. Use original presentation
and generic rules rather than copying branded artwork.

Chess offers strategic depth, a familiar ritual and spectator discussion. Friends
who already play may reasonably prefer it. The
[chess.js 1.4.0 manifest](https://github.com/jhlywa/chess.js/blob/v1.4.0/package.json)
and [license](https://github.com/jhlywa/chess.js/blob/v1.4.0/LICENSE) identify
BSD-2-Clause; retain source/binary redistribution notices. The
[library](https://github.com/jhlywa/chess.js/tree/v1.4.0) supplies legal moves and
terminal detection, rather than our board UI, network authority or clocks.
We still need touch/keyboard selection, promotion, spectators, move feedback and
server-authoritative deadlines. Preserve history/repetition state beyond current
FEN. Three-minute clocks per side bound combined running clocks to six minutes,
but abandonment, reconnect and unfinished-round policies remain explicit product
work. A rules library reduces risk without proving phone usability.

Crazy Eights keeps two-to-six residents active and may better fit a group break.
It needs declared house rules, server-side shuffle, private hands, legal draw/play/
suit selection, deck exhaustion and departure handling. A bounded hand is not a
duration guarantee. Never broadcast another player's hand or the hidden deck.
Compare a small prototype and authority spike for each before selecting one
production table. If all-six active participation becomes core, revisit the
two-player choices. Chess remains justified if task performance and actual group
preference outweigh clock/UI complexity; the simplest implementation is not an
automatic winner. No real group preference has yet been collected here.

## Voice routes and provider boundaries

[Discord Social SDK](https://discord.com/developers/docs/social-sdk/index.html)
is a native C++ library shipped with games, with Unity/Unreal integrations;
communications also require authorization. It is not a standalone browser voice
SDK. Discord [Activities](https://docs.discord.com/developers/activities/overview)
run web apps in Discord iframes through the
[Embedded App SDK](https://docs.discord.com/developers/developer-tools/embedded-app-sdk).
That changes hosting/distribution and needs authentication, networking and mobile
checks. A proportionate first route is an owner-configured Open Discord HTTPS
destination. Opening it cannot establish microphone, membership or mute state.
House Quiet remains independent. Supply a no-link state and preserve silent study
when Discord fails. This is an integration decision, not a claim of native voice.

Managed browser audio moves media off Fly, adding external processing and cost
policy. The [LiveKit manifest](https://github.com/livekit/client-sdk-js/blob/main/package.json)
read 2.23.0, Apache-2.0. Its
[Build quotas](https://docs.livekit.io/deploy/admin/quotas-and-limits/) include
5,000 WebRTC participant-minutes and 50 GB downstream transfer monthly. Free
allowances are hard caps shared across a user's free projects; new requests fail
after exhaustion. [Pricing](https://livekit.com/pricing) lists Build at $0 and
Ship starting at $50/month. SDK license and service terms are separate. Six users
for an hour consume 360 participant-minutes: 5,000/360 is about 13.9 such hours,
ignoring other use and the independent transfer cap.

The [Daily registry](https://registry.npmjs.org/@daily-co%2fdaily-js/latest)
returned @daily-co/daily-js 0.94.0, BSD-2-Clause. Its old public GitHub main manifest
still says 0.29.0, so it is unsuitable evidence of the current release.
[Daily pricing](https://www.daily.co/pricing/video-sdk/) includes 10,000 free
participant-minutes monthly, then $0.00099 per audio-only participant-minute in
the first paid tier. Sending any video/screenshare changes that session's rate.
Daily explicitly has no hard usage cap after the allowance: it is not a spending
guard. At six users, 10,000 minutes are about 27.8 one-hour sessions. Neither
calculation is a traffic benchmark or promise of free operation.

A six-user full WebRTC mesh has 6*5/2 = 15 pairwise links, each person sending to
five peers. [WebRTC's TURN guide](https://webrtc.org/getting-started/turn-server)
explains why direct connectivity often needs a relay. Browser APIs do not supply
signaling, TURN capacity, credentials or mobile reliability. Do not co-host
SFU/TURN on the fixed 256 MB application machine. In-app voice is conditional on
course eligibility, owner cost policy, scoped server-issued tokens, revocation
and real device/network tests. Vendor documentation does not settle course
permission for an external media provider. No provider was provisioned. Muted
entry, explicit join/leave, denied-permission recovery, stopped capture and no
recording are required. Do not store audio in SQLite.

## Furniture, graphics and resource evidence

[Kenney Furniture Kit](https://kenney.nl/assets/furniture-kit) lists 140 files,
CC0, version 1.0 released in 2018. It offers a plausible consistent source,
subject to model inspection and retained source/license provenance. The
[Quaternius Furniture Pack](https://quaternius.com/packs/furniture.html) lists
23 models and CC0, but the [global license](https://quaternius.com/license.html)
is QAL v1.0, updated 28 August 2026, with asset redistribution restrictions.
Do not call it unconditionally CC0: inspect the actual archive license and resolve
applicability before adoption, particularly for public repository assets. No
archive was downloaded in this research lane.

The project pins Three 0.186.1 and @types/three 0.186.0. The
[registry](https://registry.npmjs.org/three/latest) also returned 0.186.1, MIT.
[GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html) supports glTF and
separate Draco, KTX2 and Meshopt configuration when an asset requires compression
decoders. Inspect the asset before choosing decoders and match installed versions.
Measure transfer, decoding, draw calls, textures and disposal separately from
server RSS. Existing procedural furniture is a valid baseline that avoids
asset download/license uncertainty; do not add a large catalogue to solve empty
starter rooms when curated layouts can use the existing kinds.

The [actual resource snapshot](resource-baseline.json), checked at
2026-10-21T13:12:21.996Z (22 October Sydney), identifies 256 MB configured RAM,
97.19 MiB idle RSS and 100.78 MiB peak RSS. It records about 7.25 MiB used on /data,
900 MiB available, and 6.03 MiB in 13 backup directories. This is idle evidence,
not new concurrency acceptance. Public files and production dependencies are
allocated disk, not browser GPU memory or compressed image size. Preserve the
existing 300-second workload, RSS <=210 MiB and p95 <=1000 ms gates; add a
separately declared combined workload after changes. Do not delete backups or
reduce visual quality based on an approximate 300 MB recollection.


## Reopened admission diagnosis: a live canvas behind a modal

22 October, before the next diagnostic. Several native peer admissions exceeded
10 seconds while the owner's House settings remained open. One closed-panel case
passed. These observations establish a task failure and a candidate factor, not
its cause. Parent source inspection found that `.modal-backdrop` blurs the full
viewport by 4 px while the house renderer continues animating; closing the panel
removes that layer. Options separately suspends the renderer.

[Google's backdrop-filter guide](https://web.dev/articles/backdrop-filter), updated
26 July 2019 and read 22 October 2026, explains the separate filter/colour layers
and recommends measuring performance. [WebKit's implementation introduction](https://webkit.org/blog/3632/introducing-backdrop-filters/),
10 August 2015, describes filtering the content behind a layer and compositing it
back, with extra rendering passes. These are mechanism/background sources, not
measurements of our installed Chromium 153 or evidence that a browser bug caused
our timeout. A discovered Chromium issue could not be read beyond its sign-in page,
so its search summary is not used as a diagnosis.

Complete the registered open/closed/open admission series on unchanged source.
If the association persists, a useful next comparison keeps the modal open and
varies only blur versus the existing dim colour, holding viewports, content,
controls and deadlines fixed. Keep original failures, registration and passive
frame/network timing. A dim-only candidate must preserve focus, contrast and
controls. No latency improvement or causal attribution is claimed before that
comparison. This client rendering question is separate from server RAM/storage.
