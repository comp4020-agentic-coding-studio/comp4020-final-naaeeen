# Crit8 release contract — Night Neighbourhood

Declared6October2026 before production candidate results. C8 is proof of life:
a stranger uses a core interaction and finds their saved trace on return.
The final private circle is a later phase. Public C8 rehearsal: each anonymous
visitor gets a cookie-backed owned window/room and can deliberately publish a
name/window colour and their part of a shared lantern. Say clearly that published
windows and notes are visible to other visitors. Viewing alone publishes nothing.

## Shared records and transport

Server: src/server.ts + src/store.ts (worker ownership). Domain: src/domain.ts and
spec/domain.test.ts (parent). Client: public/index.html, public/app.js,
public/style.css (frontend worker). Renderer: public/render-three.js,
public/render-iso.js optional, public/assets/** (graphics worker). Preserve root
Docker/Fly/course tests; parent adapts image/start/manifest.

GET /api/state establishes a secure random session when absent and returns:
```json
{
  "schemaVersion":1,
  "sequence":0,
  "visitor":{"id":"public-uuid","name":"Night visitor","windowColour":"amber","published":false,"revision":0},
  "room":{"id":"room-uuid","revision":0,"furniture":[{"id":"chair-uuid","asset":"chair","owner":"public-uuid","x":-2,"z":1,"yaw":90,"revision":0}]},
  "lantern":{"parts":[{"id":"part-uuid","owner":"public-uuid","name":"Night visitor","colour":"#ffc47b","note":"","revision":0}]},
  "neighbours":[{"id":"public-uuid","name":"Night visitor","windowColour":"amber","revision":0}],
  "catalogueVersion":1
}
```
Unsubmitted lantern parts are omitted; lantern.ownRevision is0 initially and
retains the withdrawn part revision for the next valid contribution. Neighbours = latest8published windows plus own published window if
older. Lantern projection = latest8parts plus own if older. Every visitor can
return to THEIR window even when not among newest8. Rooms are personal authorship,
not a promise of secrecy; API exposes only own editable room in initialC8.
Newly created sessions/windows are not public roster entries until deliberate save.

SSE GET /api/events sends event:state with current full authorized projection after
connect/reconnect and committed changes, plus comment heartbeats; refresh state
on visible resume. SSE snapshots have sequence; discard older snapshots. Session
must be rechecked before delivery. Readonly public notes use plain text, neverHTML.

POST /api/command: same-origin, JSON,16KiB maximum. No authoritative actor body.
Envelope: commandId UUID, type, targetId, expectedRevision integer, payload.
Types:
- window.configure (targetId=visitor.id): payload{name,windowColour}; name1–24Unicode
  code points/control-free, colour one amber/rose/mint/sky/violet. Sets published.
- placement.move / placement.rotate: target item ID, owned room, payload{x,z} half
  grid or{yaw} in0/90/180/270. Full room/fixed obstacle collision checks.
- contribution.put (targetId=visitor.id): payload{colour,note}; palette below,
  note<=140Unicode code points/control-safe. Publishes authored pane; no shared
  whole-object overwrite.
- contribution.withdraw (targetId=visitor.id): removes own published part.
Creation/removal/catalogue expansion/undo are optional only after this loop works.

Palette: #ffc47b,#f391a8,#a0d8b3,#99c8e6,#c7a3ec.
Placement initial six pieces:2chairs,1table,1lamp,2plants. Catalogue four types,
not six distinct downloaded models. Fixed wall/sofa/shelf footprints are reused
from the reviewed prototype and validated in the same domain as movable objects.

Response success{ok:true,commandId,sequence,entityRevision,changed}; failure
{ok:false,code,message}. CodesINVALID_INPUT400,COLLISION400,FORBIDDEN403,REVISION_CONFLICT409,
COMMAND_ID_REUSED409,RATE_LIMITED429,STORAGE_UNAVAILABLE503.
Validation failure never changes SQLite/sequence. Valid owner editing produces
a new entity revision; sameUUID+canonical payload returns original receipt
without repeated effect. SameUUIDchanged payload rejects. Persist command receipts
and SQLite sessions/window/room/parts together across process restart.
Client retains SAME pending command UUID on network uncertainty; conflict keeps
draft and offers reread. Cookie aliases are display text, not credentials.
Use opaque32byte cryptographic session cookie, digest in SQLite, HttpOnly,
SameSite=Lax, Secure in production, Max-Age. No public actor switch/testing backdoor.

## UI and spatial goal

Warm fixed cutaway3D with gentle pixel scale; HTML text stays crisp. Overview
windows visually show up to8neighbours and each signature; My window uses the
editable room scene; shared lantern changes based on authored panes. Use actual
KayKit models plus disclosed procedural architecture/plants/figures. No claims
of online people from saved avatars/lights. Native object list/nudge/rotate
works without precise picking; phone controls remain reachable near compact scene.
Window sign-up does not require invite/email; explain public rehearsal before save.
Make a first contribution meaningful (a title/short reason), not a progress meter.
Clear confirmation/pending/failure; profile/name fields accessible labels;
44px controls, focus visible, reduced motion, scene failure leaves DOM controls.

## Acceptance and limits

Two shipped invariants preserved; added tests actually reject forged actor,
cross-owner mutation, stale revision, collision, changed-ID payload, excessive text.
Valid/save/replay and realSQLite restart checked. Browser at both course viewport
sizes and keyboard, real retained trace on reload/newsession via cookie. A
separate visitor HTTPcookiejar can verify sharing; do not call that two actual
browsers if not observed. Physical phone/human taste remain untested until done.

C8 README~400–600words sourced, full /readme/; growing PROCESS with true commit
links and crit8reflection~150–300words, explicitly AI-assisted draft for human
review. Real-time is C9 requirement, but a smallSSE path is reasonable here.
Shared authorship value/human response cannot be inferred from tests.

Research/review: direct installed SQLite engine3.53.4 removes nativebindingbuild;
fixed versus orbit decision inherits actual earlier comparison, no new trial
claimed. Public versus invite entry is a requirements comparison, not preference
A/B. Fresh source/code/UX reviewer after implementation; fix findings and recheck.
