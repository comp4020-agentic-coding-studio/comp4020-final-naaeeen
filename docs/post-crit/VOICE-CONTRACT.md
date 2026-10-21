# Optional Discord destination

Purpose: familiar housemates can choose their existing voice room while the study
house stays available. The first version stores an owner-selected HTTPS Discord
invite or server-channel destination and labels the action Open Discord. It opens
an external tab; the app does not assert microphone, membership, mute or attendance
state. Quiet, door access and text continue independently.

Current [Discord invite guidance](https://support.discord.com/hc/en-us/articles/208866998-Invites-101)
and [joining guidance](https://support.discord.com/hc/en-us/articles/360034842871-How-do-I-join-a-Server),
read22October2026, describe invites and their expiry/revocation. The house can
validate the destination format, not whether the visitor can still join. The
managed voice alternatives and cost limits remain in RESEARCH.md. No SDK, media
server, Discord account, invite, OAuth application or paid provider is provisioned.

## Exact first-version contract

- Member-only snapshot field `voice: {url: string|null, revision: number}` is
  available in both house zones. No link is configured by default.
- `house.voice` uses `{url: string}` and expectedRevision. Only the house owner
  with current control can set/clear it; the existing UUID/receipt path applies.
- Schema4 adds one house_voice row per configured house, with revision. An absent
  row projects null/revision0. It is independent of game schema3 and all existing
  data. Never modify or replace an old personal room to add voice metadata.
- Accept only https discord.gg/<invite>, discord.com/invite/<invite>, or
  discord.com/channels/<server-id>/<channel-id>. This is our bounded destination
  policy, not a claim that every Discord URL has this shape. No credentials,
  query, fragment, arbitrary redirect/host, DM destination or server fetch.
- Owner configuration is in House settings; every member has a Voice entry with
  the actual destination, external-service description and clear no-link state.
  The link uses target=_blank, rel=noopener noreferrer. Removing a resident
  revokes house visibility, but cannot revoke Discord membership or a copied URL.
- Expired, inaccessible or removed destinations leave the house usable. Owner can
  update/clear the link. We never pretend an external popup means a call was joined.

Compare this route against in-app SDK voice on actual requirements: zero new media
load on256MB Fly, existing friend group access, manual context switch versus
browser permissions/TURN/provider cost and revocation. External destination wins
the current bounded implementation; in-app voice remains a separately verified
extension. Real Discord call quality/account permissions are not locally simulated.

## Acceptance

Red/green allowlist and owner/revision/receipt/restart tests; outsider/member/stale
control denial; members see updates; clearing and default empty state; native UI
saved destination and external link attributes; no autoplay/getUserMedia and no
URL in activity logs. Match UI success to receipt, preserve newer edits, and cover
independent updates from another owner tab. Review these actual boundaries after
implementation. Browser checks need not join a real server or create external data.
