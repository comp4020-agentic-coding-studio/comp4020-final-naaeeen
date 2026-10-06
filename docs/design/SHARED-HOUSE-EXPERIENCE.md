# Shared-house experience and spatial design

6 October 2026. Reviewed design proposal,not human-tested preference. Root [PLAN](../../PLAN.md)
is authoritative; the [contract](../product/SHARED-HOUSE-CONTRACT.md) governs rights
and lifecycle. References and measured trials are linked from that plan.

## The place

A late-night house for existing friends: warm cutaway rooms around a shared
reading lounge. Quiet study and spontaneous conversation are both legitimate.
There is no attention score or obligation to reply. Entering creates a clear
sense of who is around; saved contributions connect yesterday with today.

The owner proposed two bedrooms and one lounge for two people. Keep that concrete
topology. Once inside a bedroom,draw only that room; the lounge contains named
doors leading to persistent bedroom instances. Do not simultaneously simulate
six fully furnished interiors. This keeps personal ownership while reducing
rendering/scene-transition costs.

## First-use and return journeys

1. Create a house: select2-6capacity,read what the code invites,choose a name/avatar,
   receive code and recovery guidance. The creator's own door is unmistakable.
2. Join: paste/type the code,preview permitted house identity/capacity,confirm the
   permanent membership claim and acknowledge that new members can see the
   retained lounge history/current board. Recovery guidance belongs in this first
   flow,not only the final polish stage. Full house retains returning-member access.
3. Arrive at the lounge door: see real connected residents,walk freely,greet.
   A concise movement hint dismisses after use; native interaction buttons remain.
4. Approach a chair and sit; seat ownership and success/failure are visible. Join
   a shared focus session voluntarily. A person can keep chatting or opt out.
5. Approach the board: open a readable panel,post a goal/question or resource,
   move it between stages,draw a short explanatory mark. Others see changes.
6. Walk through own door: make a few meaningful furniture/colour choices,preview,
   save with clear confirmation. Open the door when ready to welcome housemates.
7. Leave/reconnect/return: presence changes truthfully while room,board and chosen
   history remain. Pending writes are resolved rather than silently discarded.

Doors/seats/board have both scene targets and named native controls. Interaction
depends on proximity in the world; accessible action can walk to the same valid
anchor. It does not create a separate,unrelated form app.

## Layout comparison and capacity configuration

A puts doors on the rear wall. B distributes them on rear/side walls. The local
comparison keeps the rectangular floor,furniture,avatars,light,camera and tasks
matched. It compares a door-placement decision,not different visual styles.
Results and initial label-occlusion fixes are reported separately.

| Capacity | Spatial aim | Parametric configuration to test |
| --- | --- | --- |
| 2 | Intimate shared living room | Two clear doors; two opposed seats; enough empty floor |
| 3 | Equal access without odd polygon rooms | Three doors; triangular seat anchors around one common table |
| 4 | Legible balanced group | Four doors; opposed paired seats; board beside shared circulation |
| 5 | Avoid crowding one wall | Split door bank; five staggered seat anchors; preserve aisle |
| 6 | A usable gathering rather than a miniature corridor | Split three/three or tested rear/side bank;six seats; readable names |

These are data configurations of a stable shell,not five independently authored
levels. Vacancy/ownership affects signs,not walls. Membership slots keep stable
door anchors across reconnect/departure. Bedroom templates share geometry,while
catalogue placements and colours make each recognisable.

A hallway/polygon mansion was considered: more traversal and architectural variety,
but more camera states,hidden destinations and asset/collision work. Retain as
a future template only if actual use needs it. A fixed central lounge is the
initial recommendation,subject to the declared comparison.

## Game presentation and input

Desktop scene fills the viewport with small status/space controls,contextual bottom
actions and optional chat/board/editor sheets. Do not ship the prototype's large
research banner/diagnostics as final UI. Keep the nearest action visibly named.
Select a chair/door rather than reading an unexplained icon row.

Phone reserves a meaningful world area,reachable thumb movement pad and one
contextual sheet. Chat/board typing suppresses movement; respect IME composition
and soft-keyboard resizing. Native targets are at least44px. A searchable/list
view helps find a door or board card without precision picking. No hover-only
functions. Keyboard focus is visible and escape closes a sheet before controlling
the world; movement held keys clear on blur.

Warm palette: cream,muted wood,amber lamps,small mint/rose/blue identity accents.
Use a fixed oblique orthographic view,shadows kept modest and crisp DOM text.
Pixel rendering affects the world only; never make chat/labels low-resolution.
Fit projected door/seat labels inside safe viewport/HUD margins at both sizes.
Walls fade/omit camera-facing occluders. Contrast and occupied/free states must
not depend only on colour. Reduced motion suppresses bobbing and camera flourish
while retaining player-controlled navigation.

Avatar minimum: recognisable silhouette,identity colour,name,idle/walk/sit/stand.
Add wave when the loop works. One rig/animation family avoids retargeting each new
outfit. A simple procedural figure with animated limbs remains a viable original
style; a commercial-quality character creator is not a prerequisite.

## Board as a social object

Board view initially contains Today / Stuck / Useful / Done filters. Goal progress
is todo/doing/done,with separate helpNeeded. Filters are not additional statuses;
drag changes spatial position,explicit buttons change progress/help. A study
goal card can be marked Stuck and becomes an invitation for help,not a ranking.
Members add a resource link or annotate a note with pen marks while talking.
Completed work stays as a small actual trace for next-day return.

Keep cards bounded rather than infinite pan/zoom. Text/link/goal and short marks
are the initial meaningful set. Images are next once storage/decode passes its
gate. Keyboard users can use cards and per-stroke delete; drawing is optional
for completing a study task. Zoom/full-panel mode must be reversible without
losing an unsaved draft.

## A few distinctive rituals

Bring a goal to the table: create a board card,then sit; its short title is visible
with the chosen focus marker. Asking for help marks a goal Stuck and invites a
friend to approach/respond. Leave one useful thing: a completed goal/link/note
connects the next visit to a real shared session. These reuse board/chat/seat
contracts and are design hypotheses; they do not require a rewards economy.

Later one gentle shared object can give breaks a physical anchor: tea tray,a
window plant or a small notice/postcard board. More weather/pets/themed rooms are
content updates,not blockers to the core. Rainy attic,cafe and night-train reading
carriage templates share the same data/interaction contracts. No fishing economy,
city map,voice service or habit dashboard is required to make the house feel alive.

## Human study before visual polish is called success

Start paired tasks as soon as the integrated loop works. Two people get only the
room code and tasks: greet,sit,post a goal,find a resource,visit an opened bedroom.
Observe hesitation,misattribution,missed messages and control errors without
coaching. Ask what they thought the other person was doing and whether the space
felt personally theirs; invite a next-day return. Do not turn a handful of friends
into a statistical wellbeing study.

A bounded presentation comparison can vary bubble/transcript placement or quiet
status cues while holding room/content/tasks fixed. Alternate order and record
qualitative observations. Independent agent review helps identify defects; it
does not replace human pleasure or natural conversation evidence.
