# Native pending recovery verification

Status: PASS. Parent-authorized bounded native execution completed against the retained local candidate on port 4108 (PID 17979).

## Requirement and method

The route must retain a recent original outbox draft while a real cross-zone subscription advances generation/access authority. Pending drafts must reopen after the actual room arrival or actual game-chair acknowledgement. Only explicit Retry may send the retained UUID and payload.

`tests/e2e/spatial-recovery.spec.ts` declares two native Chromium cases, each under the existing 60-second test budget and sandbox/SwiftShader launch configuration. Each case creates one fresh identity and home through the real UI and uses one active native page. The production `createCommandOutbox(sessionStorage)` API seeds a recent local draft as an explicit synthetic precondition. This does not demonstrate an actual lost acknowledgement and does not fabricate server state, authority or network failure.

- Bedroom chat: start in lounge; use the real owner bedroom ID; Return through the ordinary pending control; observe the real subscription ACK generation/access advancement; check unchanged room messages/sequence and zero command sends before Retry; check exact original command once, matching real receipt/chat ID, one saved message and removed outbox after Retry.
- Game Join: start in own bedroom; use the actual server table revision/current round; Return to the real lounge activity chair; require real chair ACK plus a real snapshot showing that seat before Pending reopens; check no early Join; explicitly Retry once; then seed a held local copy of that genuinely accepted command, Stand through UI, and manually replay it standing. The second receipt must equal the original and must not rejoin or change the standing table state.

Passive native WebSocket frame observation records actual requests, ACKs and snapshots without replacing the client or socket API. Approved attached summaries contain actor labels, command SHA256 hashes, authority numbers and counts. Raw browser output, traces and failure screenshots remain in ignored `.local` output; no raw payload/body dump belongs in tracked evidence. This is technical native browser evidence, not a physical phone or human usability trial.

## Static preparation

- `mise exec -- pnpm exec playwright test tests/e2e/spatial-recovery.spec.ts --list`: PASS; two cases discovered, no browser launched.
- `mise exec -- pnpm typecheck`: PASS.
- Focused `git diff --check`: PASS.

## Comparison and acceptance boundary

A mocked UI snapshot can keep one generation constant and miss cross-module subscription changes. This native route instead accepts actual server-issued subscription generations and actual chair ACKs while exercising the existing production browser modules. The changed factor is the real integrated transport/world lifecycle; the acceptance criterion is observable preserved pending intent followed by one deliberate send and matching persisted result. No artificial A/B or human preference result is claimed. The parent owns source-epoch binding, production fixes, independent review, aggregate verification and final reconciliation.

## Actual native result

`native-recovery-first.txt`: PASS, two cases in 38.4 seconds. Bedroom chat took 13.8 seconds; game Return plus standing receipt reconciliation took 22.7 seconds. No test budget or production source changed for this run.

| Boundary | Observed result |
| --- | --- |
| Lounge to actual owner bedroom | Subscription generation and accessGeneration both advanced 1 to 2; Pending reopened; exact original draft retained with recovery hold. |
| Chat before and after explicit Retry | Command sends 0 then 1; room chat counts and sequence 0, 0, 1; the matching persisted chat ID equals the real receipt result; outbox removed. |
| Bedroom to real activity chair | Subscription generation and accessGeneration both advanced 4 to 5; actual `house.seat` ACK and server snapshot confirm the game chair; Pending reopened without sending Join. |
| Join and standing receipt reconciliation | First explicit Retry saved the exact original Join. After native Stand, manual replay returned the identical accepted receipt without rejoining or changing the table; outbox removed. Table revisions were 0 before Join, 1 after Join, and 2 after Stand. |
| Direct SQLite receipt counts | Read-only access to the explicitly supplied isolated fixture DB: chat 0 before, 0 on arrival, 1 after Retry; game 0 before, 0 on arrival, 1 after Retry, 1 after standing replay. No default or production DB fallback exists. |
| Runtime errors and cleanup | Both cases reported zero page errors. Playwright exited normally and a following socket inspection found no established connection to port 4108. |

`native-recovery-results.json` contains the sanitized actual observations and command hashes. `native-recovery-source-before.json` and `native-recovery-source-after.json` bind 503 files under public/src plus package/lock/Playwright/test/helper files: zero changes during this native run. The retained server launch-record SHA256 also remained unchanged: `90f4d7d239882050c45ffbed8bee7d8d9f08bc08beba1b96aa36b2ee3cec6f58`.

The local HTML report remains ignored at `.local/native-recovery-report-20261023/`; browser output remains ignored at `.local/native-recovery-20261023/`. No failure trace or screenshot was generated because both cases passed. The attachment-extraction script initially treated a data-URL prefix as ZIP bytes; correcting that parser extracted the existing successful report without rerunning browsers or altering test outcomes.

Self-review checked actual Socket.IO framing, actual server ACK shapes and exact payload/receipt comparisons; parent-owned independent review and aggregate verification remain separate gates. Real lost-ACK reproduction, physical phone trials and human usability/utility evaluation were NOT RUN in this lane.
