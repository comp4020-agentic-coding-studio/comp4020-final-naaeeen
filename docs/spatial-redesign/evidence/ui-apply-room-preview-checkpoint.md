# Whole-room reference continuity and recovery route refinement

23 October 2026. Worker production frozen after the checks below. No browser, service, remote write or commit was performed by this lane. Parent owns fresh review and native acceptance. Source binding: ui-apply-room-preview-source-binding.json.

## Room reference remains part of the room

Requirement: chosen material remains visible on the reference frame and desk after the studio panel closes. The previous modal-owned callback cleared the world's texture when Close stopped the modal/audio. Keeping that ownership would couple room DIY to a foreground tool; the selected alternative is one independent, bounded room-authorized thumbnail loader.

New `public/house-studio-preview.js` reads metadata and canonical PNG bytes with same-origin cookies and captured X-House-Identity. Its scope includes server epoch, identity, house, room, original owner, zone, controller generation/access and door context. Ordinary pose snapshots do not start reads. One15-second permission timer rechecks metadata; an unchanged image keeps its decoded image/object URL and avoids another image fetch/decode. Confirmed upload commit and clear trigger a refresh. Modal Close still stops its own audio and image but no longer owns the world texture.

Zone, access/control/identity/server epoch, hidden page and disposal synchronously clear the texture, abort old requests and revoke allocated URLs. Late metadata/bytes/decode cannot restore an old room. Metadata mismatch, failed read or denied permission clears the thumbnail. Bytes and decoded dimensions are bounded to the canonical PNG limits. An8-second deadline also releases a hung decoder so it cannot block the next permission check; that refinement has its own failing-then-passing regression.

Evidence: ui-apply-room-preview-red.txt records10 failing behavior checks against the new loader skeleton; green records10 passing checks. The separate timeout RED/GREEN adds an11th check. The main UI integration simulates actual image load, opens/closes the studio and verifies the same world image remains; room exit immediately clears it. The world test confirms ordinary room-scene rebuild retains the same texture and access loss disposes it. These are controlled DOM/Three checks; a native screenshot of a real chosen image still belongs to the parent executor.

## Audit item7: original-destination recovery

This section supersedes the earlier checkpoint's pending status for this specific recovery gap. It does not add onboarding or a new identity-recovery scheme.

Pending rows now name Your room, a current resident's room, the shared lounge/activity table, or Your earlier room. Raw original destination IDs remain only inside inspectable original payloads where applicable. Explicit Return routes reuse the existing collision-aware doors/exit and activity-chair navigation; successful authorized arrival reopens Pending drafts and rereads authoritative canRetry. An activity return waits for the actual game-chair ACK/snapshot. A separate Take control action calls the existing takeover method only after the user chooses it. Neither helper retries automatically or creates a replacement command UUID.

Closed friend rooms give a plain reason and retain inspection/export. Missing/earlier-house destinations cannot route through the current house. A seated user is told to Stand before routing; no hidden stand or teleport is introduced. Retry retains the client's authoritative canRetry so a previously accepted receipt can still reconcile while standing; unaccepted fresh activity effects remain server-seat checked. No permission or join-code setting is changed.

Evidence: ui-apply-pending-recovery-red.txt records five new failing route/label/control cases; green has all five plus two existing connection-recovery cases passing. Tests cover named return plus the same original retry UUID, bedroom -> lounge -> real activity chair -> Pending, closed friend feedback/export, explicit takeover without automatic movement/retry, and earlier-house refusal.

## Final verification and limits

- ui-apply-recovery-preview-final.txt:240/240 PASS across main UI, world and new preview suites.
- ui-apply-recovery-preview-typecheck.txt:whole-checkout typecheck PASS.
- ui-apply-room-preview-final-coverage.txt: new loader97.03% statements,92.79% branches,86.95% functions,100% lines. This scope includes11 loader units and the real main-UI image-load/Close integration fixture.
- Final owned-path diff whitespace check PASS. No new application-wide or human usability claim is inferred.
- Native follow-up: select a real PNG in a permitted bedroom; close studio and verify frame/desk still show it in actual screenshots; hide/return, close the visitor's door, change control and exit to confirm actual clearing. Inspect a stale original-room draft, explicitly return, take control if required and retry its same UUID. Parent owns full source-bound browser/resource/review closure.
