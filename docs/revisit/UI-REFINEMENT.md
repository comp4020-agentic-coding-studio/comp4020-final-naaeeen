# UI subsection refinement, 7 October 2026

This is a retrospective revisit of the existing local UI plus newly reproduced repairs.
It does not relabel the earlier implementation or model reviews as a registered
human comparison. Ownership is limited to public/house-ui.js, public/house.html,
public/house.css, spec/house-ui.test.ts and this record. No commit, push, publication,
new service or personal-memory change was performed by this worker. The parent
owns integration, final review and register/commit updates.

## Method and acceptance established before repairs

Read AGENTS, CLAUDE, PLAN, ACTIVE-TASK, current handoff/audit, the owner harness
addendum, REGISTER and REPORT at entry. Applied REPORT sections3–6/8 plus RESEARCH,
REQUIREMENTS-AUDIT, COMPARISON-AND-REVIEW and EVIDENCE-AND-WRITING. Reopened the
subsection methods when delayed snapshots, private response races and actual
mobile screenshot overlap contradicted the first repair. Returning to requirements
and evaluator calibration produced additional failing tests rather than a generic
phase PASS.

Common task: the same identity uses the contextual game tools, saves while typing,
reconnects or changes room, and inspects uncertain actions without losing work or
seeing another identity's data. Acceptance disqualifies draft loss, blindly advancing
to an unreviewed external revision, stale owner controls, another identity's private
response, historical chat counted as new delivery, false saved feedback, offscreen
native controls and exposed foreign outbox payloads. Stop when those concrete local
cases pass and material review findings are reconciled. Human preference, physical
phone/IME comfort, deployed performance and value remain NOT RUN.

The technical options were destructive refill, blind latest-revision rebasing,
and scoped draft/receipt projection. The first two violate the declared acceptance
criteria, so a focused correctness comparison with calibrated DOM cases was useful;
there is no human A/B winner. For recovery presentation, a separate dashboard and
one native contextual panel were considered. The existing game panel preserves
world-first navigation and needs no new editor, route or product concept. Native
viewports and screenshots judge fit/readability, not human preference.

## S1.I5a / S1.I2d — admission, uncertain requests and pending drafts

The old api() awaited fetch/JSON without a limit; uncertain lobby admission was
held only in the UI Map. api() now bounds the entire response operation at8seconds,
reports a missing reply as pending, and never says an uncertain action was saved.
Admission uses the client's persisted inspector command path before sending. The
same UI intent reuses its original UUID; checking /me can recover already-saved
membership without claiming another slot.

The native Pending drafts panel is available in the game and lobby, including an
archived identity. It shows only current-identity original command payloads;
foreign rows are a count with explicit redacted deletion. Export, own discard,
refresh and manual expired retry are explicit. Retry retains the original UUID,
house, room and payload, requires the original authorized scope and never silently
rebinds. A foreign-house or archived bedroom retry is disabled. Automatic retry
expiry is24hours; an expired row remains inspectable/exportable/discardable.
Client guarantees and its independent tests are recorded in OUTBOX-REFINEMENT.md.

Evidence: DOM cases bound a hanging request, preserve uncertain admission UUIDs,
expose own expired lobby drafts and redact foreign rows. Actual Chromium intercepted
a native admission response only after the real server committed, asserted that the
request UUID matched its already-persisted outbox entry, then aborted the reply;
/me recovered the existing house. An artificial expired own lounge row was manually
retried through the native panel; actual Socket command and ACK both contained the
original UUID, and the transcript contained one message. Artificial archived rows
verified own-only download bytes, native own discard and redacted foreign discard.
These artificial rows are recovery fixtures, not naturally occurring student use.

An extra HTTP replay assertion initially omitted the required controller headers
and correctly failed authorization. It was an invalid evaluator step, not a reason
to weaken the authority. The revised check observes the actual authorized Socket
command/ACK. Private recovery-key and own-export response races were subsequently
reproduced and repaired: a captured identity/privacy generation must still match
before displaying a proof or starting a download. Disconnection and identity
replacement invalidate the response. This guard also covers lobby and pending exports.

## S1.I5b — bounded HUD and world label exclusion

Retained the game world and one contextual tool panel. The roster now has bounded
scrolling instead of pushing six names across fixed willingness controls. Explicit
server time is readable in native resident chips and the willingness HUD. Compact
Drafts joins the existing toolbelt. Native mobile targets retain44px height.

The UI batches cached DOM rectangle reads on snapshots, panel changes, notice
show/hide, resize and visualViewport resize/scroll. It passes world.setLabelSafeArea
an actually clipped viewport and visible HUD/panel rectangles. It performs no
per-frame forced layout. World label policy belongs to the world worker's record;
a hidden world label is not a missing native resident/transcript record.

Actual1920x1080 and390x844 DOM dimensions matched their requested sizes, had no
document horizontal overflow and contained the pending panel. Native screenshot
inspection found transient notices covering mobile recovery copy, and an open panel
covering posting retention. Refinement moved messages into the active panel and
raised its bottom above the posting copy. Final phone geometry: panel y210–684,
posting copy y692.3125–714, toolbelt y716–772. The phone panel scrolls; this does not
claim physical-phone comfort. The world worker separately checked six native names and control exclusions at390x844 and390x520; this is separate from the two-resident UI screenshots. Native camera/takeover controls were then checked at all three sizes, including normal clicks at reduced height.

## S2.I1e — current membership and asynchronous owner pagination

The previous house panel rerendered only when its current private stream cursor
changed. Code rotation, ownership transfer and member updates could therefore stay
stale while a bedroom cursor was unchanged. A separate house/resident/self key now
refreshes those controls. Owner pagination captures house and identity, and rejects
responses after ownership change, panel closure or a newer request. Its error path
uses the same scope guard.

Evidence: unchanged bedroom cursor plus new code/owner/member count immediately
rerenders the house panel; an old pagination response cannot append removed-member
names after transfer. These are real DOM assertions with isolated API replies.
The parent retains server membership authorization responsibility.

## S2.I5c — scoped furniture and room metadata drafts

A draft contains house/self/room/owner scope, original furniture base and placement
snapshot, separate metadata base, edit versions and dirty state. Same-owner,
same-room reconnect keeps it in memory while immediately clearing private DOM.
Another identity, house or room cannot restore it. Own ACK completion preserves
edits made while the submitted version was in flight.

A layout ACK advances only its legitimate original base to its own receipt revision.
Metadata ACK advances a furniture base only when it equals the submitted metadata
expected revision and the underlying acknowledged placement snapshot is unchanged.
It never advances a stale furniture preview to the latest external room revision.
A known acknowledged room revision prevents clean fields being refilled from an
older live snapshot after the bounded wait. Once its revision is projected, clean
fields may use current saved state; dirty fields retain their reviewed base.

Conflict feedback keeps the preview. Review saved layout temporarily previews
canonical furniture without discarding the draft; returning restores the preview.
Use saved layout/settings is a distinct confirmed reset. Metadata reset leaves the
furniture preview intact. Pending metadata inputs also retain newer versions.

Evidence: regressions initially reproduced newer furniture loss, disconnect draft
loss/private DOM residue, stale metadata-driven furniture rebase and newer metadata
loss. Review then reproduced ACK-before-snapshot refills after1.5seconds for both
furniture and metadata; three delayed-snapshot tests failed before receipt projection
was added. Native real-server walking, palette save, added lamp and layout save pass.
Persistence/geometry authority remains in the store/world sections.

## S2.I5d — explicit willingness freshness and separate meanings

Availability comes from server players, including availabilitySetAt, rendered as
native time elements with ISO datetime and full-date title. Connection, room
location, Quiet/Can chat and bedroom permission stay separate; no availability is
inferred from avatar movement or room retreat. Lounge willingness eligibility still
requires connected, in lounge and self-declared Can chat.

Evidence: DOM timestamp and ISO value checks; actual native radio changes updated
Last set while room permission remained an independent saved control. Quiet retains
unread badge delivery. This checks displayed state, not genuine attention or a
social benefit. Timestamp localization follows the actual browser environment.

## S3.I5e — readable plain text, delivered unread and retention decisions

Per-identity/house/stream unread state tracks delivered message IDs and sequence.
The first/history or reconnect snapshot establishes a baseline; retained history is
not invented new activity. Fresh non-self deliveries count once even in Quiet.
The actual transcript opening/rendering marks the current stream read. Existing
plain-text node rendering and safe resource-link behavior are retained.

Joining explains retained lounge history and current-housemate visibility. Posting
shows allowed-room audience, latest100 messages and up to7days. Opening a bedroom
explains furniture plus retained history; closing ends access. The transcript repeats
the same retention boundary. This is concise decision copy, not a broad warning list.

Evidence: DOM deduplication/history/open-read checks and actual two-browser Quiet
message delivery, history retrieval, count1→read0 and zero Quiet world bubbles.
Retention expiry itself is a server test, not established by these copy checks.

## S3.I4b — own card receipts, delayed projection and author typing

The earlier newer-card ACK branch used currentCard's latest revision, allowing an
external newer write to become an unreviewed overwrite base. It now uses only its
own receipt entity revision and actual result.cardId, captured against house/self.
A temporary own receipt projection retains acknowledged fields until its authorized
stream cursor arrives. A shared card draft survives a room visit in the same house,
while private bedroom/chat drafts remain room-bound.

Own save ACK during reconnect may update scoped memory, never private DOM; the
same identity/house can restore newer typing, another identity cannot. An explicit
close ACK with newer typing leaves a new card draft with expectedRevision0 and no
closed card ID. A close receipt tombstone prevents old pre-close snapshots from
refilling an active card. Closing remains the author's explicit action.

Evidence: external-revision delayed ACK, withheld-snapshot, room visit, reconnect
ACK and newer typing during close each have DOM regressions. Parent/card lifecycle
and real-human next-day retrieval remain separate sections.

## Actual checks, review and limits

Initial unchanged UI:15 DOM tests,10 failed and5 passed. Added reset/room-transition
and follow-up races were separately run red before their repairs. The delayed
identity fixtures initially gave false PASS because an unrelated owner query replaced
the completion callback; path-specific queued replies then reproduced both failures.
The final suite is37/37 PASS, with no test skips in the complete run. One case executes the actual client and actual UI against a simulated idempotent transport, rather than mocking client.command.

Commands used through the Windows-to-WSL bridge and Linux mise/Node/pnpm:

- pnpm exec vitest run --config vitest.house.config.ts spec/house-ui.test.ts
- pnpm exec vitest run --config vitest.house.config.ts spec/house-ui.test.ts --coverage --coverage.include=public/house-ui.js --coverage.reportsDirectory=.local/ui-revisit-coverage
- pnpm typecheck
- Actual scripts using Playwright1.63.0 against http://127.0.0.1:4093, using the installed Chromium revision1234 and real local SQLite/Socket authority.

Final UI-file V8 coverage is350/383 lines (91.38%),783/1032 statements (75.87%),
419/622 branches (67.36%) and87/125 functions (69.60%). The line target exceeds80%;
statement/branch/function coverage has a documented gap. Mocked DOM coverage does
not include Three rendering, actual network authority or physical devices.

Native result and inspected PNGs are in .local/ui-revisit-browser/results.json and
that directory; final phone images have -final filenames. Earlier full-flow images
precede the small feedback-layout refinement. Final scoped native checks revalidated
mobile geometry and recovery interactions. There were no page errors. Hashes bind
the actual final UI bytes below; this is local, not Fly deployment or human A/B.

Initial subsection audit was performed by the parent team's fresh read-only reviewer.
The UI worker requested a new fresh reviewer, but the7-thread limit rejected that
spawn. The parent's authorized reuse of revisit_s2_s3 is labeled context-retaining
follow-up, not another independent trial. It found and independently reproduced
delayed projection and private response races; the worker added failing tests,
repaired them and requested a contextual recheck. Final review/parent reconciliation
and focused commit are owned by the parent and remain recorded separately.

## Subsequent review and native refinements

Reopened the same subsection methods after the next read-only review. Four new UI
cases failed before repairs: an already displayed lobby proof survived a lobby-to-lobby
identity change; two key issuance requests could compete; an acknowledged suspended
chat draft was restored on reconnect; and the old pending inspector survived recovery.
Bootstrap/recovery identity epochs now purge old proofs/private drafts, close old
instances and recreate the inspector with a captured expectedIdentityId. Authenticated
private POSTs send captured X-House-Identity as a precondition; the server cookie
remains the authority. The parent owns its before/after-body server checks.

Both recovery-key buttons serialize issuance and remain disabled until the request
finishes. A newer identity epoch cancels the old display path. A real native lobby
recovery test verified an existing A proof clears after recovery to B with no home;
a held A reply cannot repopulate either proof output; the fresh B inspector opens.
The first native attempt found a persistent notice intercepting the next ordinary
key button click. This was an application failure, not a reason to force click.
Lobby feedback now stays inline, and the repaired ordinary-click flow passed.

The next contextual review showed that a mocked command hid the real chat failure:
the actual client rejects a late disconnect ACK as STALE_ZONE while retaining its
outbox row, but the UI discarded its corresponding UUID. A calibrated actual-client
plus actual-UI case reproduced two effects. It now observes one effect and one
UUID through initial send, automatic outbox replay and the user's repeated Send.
The UI preserves intent IDs on the client's uncertain scope/closure/identity errors
and INSPECTION_REQUIRED. Only matching scoped text/version is cleared on a successful
receipt; newer text remains. Late old-actor errors cannot clear a newer identity's
draft. Client/backend bytes were unchanged for this repair. The integration fixture
first incorrectly treated the initially hidden lobby as readiness; requiring an
accepted Together, live snapshot then exposed the intended duplicate.

The parent selected the avatar-follow camera variant. Native Overview/Recenter
controls call the renderer API, mirror its callback and hide while a contextual
panel/editor is open. Takeover and camera rectangles join the batched safe-area
selector and ResizeObserver. A DOM missing-control case ran red before integration.
Actual desktop and phone mode/movement checks passed, but both the parent lifecycle
case and the UI worker independently found camera Recenter covering phone takeover.
The CSS now stacks44px takeover above the camera group. Normal native takeover
clicks and nonoverlap checks pass at1920x1080,390x844 and390x520. Reduced-height
rectangles are availability158–198, takeover204–248, camera254–310 and hint323–361.

The client worker normalized Socket.IO middleware error.data.code without replacing
the original message. Two UI cases for LOAD_LIMIT/TAB_LIMIT ran red before explicit
blocked feedback was added. The UI preserves the original accessible message,
instructs closing an unused window and reloading, offers pending inspection and
schedules no automatic retry loop. UNAUTHENTICATED still follows membership refresh.
These budget feedback cases are DOM/client checks, not a claim that a physical device
or deployed budget test ran.

Review provenance needs a caveat: the later reviewer started independently but read
handoff verdicts, so that pass is not perfectly verdict blind. Its new reproductions
remain useful; follow-up of repaired versions is contextual review. The parent owns
final reconciliation and does not count these as independent human trials.

## Frozen-source native recovery diagnosis

The parent retained failures from its isolated lifecycle lane even though required
checks passed. Canonical JS/HTML/CSS remained frozen; transient served-response
logging and unmodified namespace-frame observation were diagnostic variants only.
Live service assets matched their disk hashes. No keys, cookies or identity values
were written to the diagnostic outputs.

A focused standalone probe initially used Playwright's5second default rather than
the maintained10second assertion deadline. It saw a valid controller snapshot and
no namespace/client errors, but its matcher timed out while the final header was
Together, live. This was not enough to label a bootstrap defect or a server ACK
timeout. A subsequent canonical create/join probe passed.

Registered startup-probe-protocol.json before comparing one real recovered renderer
against one no-render recovered world adapter. Both retained real owner/peer worlds,
the same full-house recovery and saved next step,10second assertions/actions,
15second navigation and90second task deadline. Other browser lanes were held;
contexts closed between trials. Canonical files were never changed.

Both trials passed at10seconds, preserving identity/home and retrieving the saved
next step. Real rendering reached observed live readiness in5998ms and spent2945ms
between accepted snapshot and connection completion; the adapter reached998ms and
spent17ms in that interval. This shows renderer startup cost in this software-rendered
diagnostic and explains the5second standalone failure. It does not establish the
cause of the earlier maintained10second lifecycle failures, establish physical-device
performance, or authorize raising timeouts to obtain acceptance. The maintained
isolated lifecycle replay remains the parent's acceptance gate.

Results and the registered protocol are under .local/ui-revisit-browser/. Preserve
camera-ui-native.json as the failed control-collision observation and
camera-ui-native-final.json as its repaired native check. Preserve
identity-followup.json as the native notice obstruction and
identity-followup-final.json as its repaired identity-flow check. The startup trials
are diagnostic, not additional acceptance or human A/B results.

## Final owned-source version

| File | SHA-256 |
| --- | --- |
| public/house-ui.js | 77b6c32f89412b8226d2f63cc603cfd91f6bda98b2a300e11b8029ec039d2984 |
| public/house.html | 8361c5f724311ed2afe17edc8c4dec914f1ac16f36b26ee3ceb4c0cf9b1b64d9 |
| public/house.css | ed3e72cb63b0af4fa6473077f1ace6f7992e64ea2b839f95a48106ab8025c7c1 |
| spec/house-ui.test.ts | 045b799fef86f351bdcfb35d687fe50443b5298119a1f9d09579e4c1ec220027 |
