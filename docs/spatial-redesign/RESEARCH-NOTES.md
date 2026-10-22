# Research notes: mechanisms that give a place a purpose

Primary pages were read during this pass. Access is recorded as UTC22October2026;
product dates/versions below come from their own pages. Developer documentation
establishes documented behavior, not our playtesting or evidence of user benefit.
Our transfer decisions are judgments. All links lead to the underlying source.

## Physical membership and visible capacity

**Sky — a seat changes who can chat.** Its production
[chat FAQ](https://thatgamecompany.helpshift.com/hc/en/17-sky-children-of-the-light/faq/497-how-do-i-chat-with-other-players/?p=web)
documents two-person benches and seated chat props for two to four, with compatible
props combinable to eight. The page is old and was not checked against a running
client. Transfer: capacity and participation should agree. Do not copy candle costs
or stranger-friendship unlocks into a familiar-friends house.

**Gather Classic1.0 — a location has an actual effect.**
[Games](https://support.gather.town/articles/4156487779-playing-embedded-games)
use approach plus X; custom objects expose an activation distance.
[Private Areas](https://support.gather.town/articles/2550999600-overview-of-meeting-rooms-private-areas)
connect occupants, provide admission controls in applicable space types, and
recommend clear furniture cues and exit corridors. Transfer: approach, enrollment
and exit are different actions. An embedded game still has its own membership;
copying its iframe does not integrate our six seats or identity rules. These are
Classic1.0 docs, not claims about every newer Gather version.

## Parallel company versus doing the same thing

**gogh — distinguish separate work from a common event.** The current
[Multiplayer FAQ](https://gogh.zendesk.com/hc/ja/articles/55524515648025-Multiplayer),
updated29September2026, documents local audio/environment customization and a
Focus Party shared timer with late entry and a group ending. Host departure
prevents new arrivals while current participants can finish. Transfer: define
which state is shared and what late entry means. A timer or avatar alone does not
establish productivity; a shared schedule can inconvenience mixed intentions.

**WEBFISHING — a small ongoing action gives conversation breathing room.** The
[developer's Steam description](https://store.steampowered.com/app/3146520/)
documents fishing, collection and social toys including guitar/chalk. Transfer:
people can do modest independent things while remaining together. A garden or
household object could borrow this rhythm; an economy, catalogue and progression
system would add a much larger product. A decorative click counter is not useful
merely because it persists. No player-cap or proximity claim is imported.

## Giving the sofa a concrete task

**gogh Watch Party is not synchronized playback.** The
[official FAQ](https://gogh.zendesk.com/hc/ja/articles/57392101152665-Watch-Party),
updated5October2026, says the host shares a YouTube item; each device opens it.
Play/pause/seek/volume are not synchronized; playlists and full timeline sync are
unsupported. Transfer: a shared-viewing label is not proof of shared playback.
A synchronized sofa player would be our additional engineering requirement.

**Discord is a serious alternative, not a straw man.**
[Watch Together](https://support-apps.discord.com/hc/en-us/articles/26502500234519-Watch-Together-FAQ)
documents collaborative queuing, synchronized playback, host/shared controls and
local volume. Our spatial house should be compared against friends using that
workflow. Rebuilding a weaker cinema would not justify entering our house.

**YouTube supplies a player, not group authority.** Its
[IFrame API](https://developers.google.com/youtube/iframe_api_reference) exposes
play/pause/seek, events and blocked-autoplay reporting; it also specifies player
size requirements. It does not manage our invitations, seats, shared timeline,
reconnect, ownership or unavailable-content recovery. The small Fly server should
coordinate bounded state, not proxy video. No provider integration was executed.

A lower-cost first sofa task is explicitly selected still-image/diagram inspection
with common selection and pointer. This is a proposed design, not a proven substitute
for watching clips. Compare it with exchanging the same image in chat before
committing to a media subsystem.

## Personal-room utility and place-specific expression

**Kind Words2 uses different contribution settings.** The
[Steam description](https://store.steampowered.com/app/2118120/)
documents letters, coffee-shop poetry, recommendations, stories and wishes.
Transfer: a place can frame a particular voluntary social act. Its anonymous
stranger community does not prove familiar friends want emotional disclosure,
synchronous poetry or a mandatory check-in. No exact seating/synchrony is inferred.

**Tower Unite's condo can host something.** The
[Condo I/O guide](https://www.towerunite.com/guides/condo_io.html)
documents connected buttons, lights, triggers, cameras and media objects. Transfer:
a resident can prepare an experience and invite someone to use it. Copying visual
scripting, emulation or a general room-game editor is out of this timebox. Furniture
editing alone remains an insufficient answer to this owner's bedroom criticism.

**Palia separates publishing from owning.** Historical
[patch0.182](https://palia.com/news/patch-182),30July2024, introduced opt-in Home Tours
of a submitted instanced plot. Transfer: selected display material should be
explicitly published, not everything owned by the resident. Weekly rewards are
not evidence that our friends need a gallery or an engagement economy.

**Focusmate's routine has different conditions.** Its
[getting-started guide](https://support.focusmate.com/en/articles/9110188-getting-started)
describes goals, quiet work and an ending with a visible video partner. Transfer:
a repeatable appointment has a beginning/end. We cannot attribute its accountability
mechanism to avatars, infer completed work, or copy its camera expectations.

## Everyone can contribute without performing for everyone

**Tee K.O. has players as well as an audience.** Its
[official page](https://www.jackboxgames.com/games/the-jackbox-party-pack-3/tee-k-o)
specifies3–8players and drawing/slogan remixing. It also lists a30-minute duration.
Transfer: whole-group making/exchange is different from two players plus spectators.
Borrowing the contribution structure does not make the original a three-minute
study break; original art, content and a bounded new lifecycle would still be needed.

**FigJam's independent choices are a mechanism, not social proof.** Its
[voting guide](https://help.figma.com/hc/en-us/articles/9359912208663-Run-voting-sessions-in-FigJam)
documents hidden choices until reveal and an Ignore invitation option. Transfer:
a show-and-improve table could collect optional independent reactions. The artifact
owner still decides; votes are neither truth nor evidence of user demand.

## Corrections from checking researchers' output

An earlier gogh news item described Chat Items as beta. Parent inspection found
a stronger current [Chat FAQ](https://gogh.zendesk.com/hc/ja/articles/59238671699481-Chat-FAQ),
updated14July2026, documenting text/stickers/dice. Multiple objects open one room
chat; they do not create object-local seated conversations. The researcher then
reconciled the claim. Keep the older beta status historical, not a blanket present
claim. Its temporary own-room history is not durable bedroom utility.

The parent also checked Watch Party's explicit no-sync limitation, Tee K.O.'s
30-minute scope, and the exact old/current documentation boundaries. Useful
research includes these rejected transfers, not only attractive features.

## HCI interpretation

Harrison and Dourish's
[Re-Place-ing Space](https://www.dourish.com/~dourishc/publications/1996/cscw96-place.pdf)
argues that shared practices and appropriation give places social meaning. It does
not prove that three dimensions, rigid seating rules or forced rituals improve
collaboration. Our design should make an understandable practice possible while
leaving friends free to decline or adapt it. This is why a meaningful shared task
and its audience matter more than adding decorative boundaries.
