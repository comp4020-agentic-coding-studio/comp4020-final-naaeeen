# Detailed redesign checkpoints

7 October 2026. Active R0–R4 extension after the owner tried the baseline and
rejected its interaction quality. Read [owner brief](../product/OWNER-REDESIGN-2026-10-07.md),
[plan](../implementation/REDESIGN-PLAN.md) and [methods](../harness/REPORT.md).
The earlier 43-row register remains historical; these checkpoints cover the new
scope separately. Each links requirements, comparisons/reproductions, actual checks,
findings, refinement and remaining acceptance. Counts are evidence scopes, not grades.

| ID | User outcome / important boundary | Method and recorded refinement | Current status / evidence |
| --- | --- | --- | --- |
| R0.1 | Reuse a complete editor legally and maintainably | Current package/licence/source comparison; real React peer failure and full dependency audit; compatible pins | ACCEPTED stack; [research](../research/2026-10-07-game-and-board-redesign.md) |
| R0.2 | Bound the expanded product and integration | Saved owner requirements, phase/subsection criteria and exact endpoint/epoch/assets contract; contextual review gaps resolved | ACCEPTED plan; [phases](../implementation/REDESIGN-PLAN.md) |
| R1.1 | Create/join/Continue as a game | Title/admission/connection/focus tests and native independent identities/reload | ACCEPTED LOCAL; [shell](../implementation/GAME-SHELL-EVIDENCE.md) |
| R1.2 | Read/write long text without covering the world | Separate movable/collapsible chat; typing/wheel/drag/resize/draft/scroll/unread cases; pause unread defect reproduced and repaired | ACCEPTED LOCAL; [shell](../implementation/GAME-SHELL-EVIDENCE.md) |
| R1.3 | Options and board modes own input clearly | Pause/focus/suspension and exact source/origin iframe checks; native keyboard entry/return | LOCAL; camera integration refinement tracked R2.2 |
| R1.4 | Personal rooms remain editable and private | Existing ownership/draft barriers preserved; native seats/door/DIY/reload/revocation tasks retained | ACCEPTED LOCAL; [shell](../implementation/GAME-SHELL-EVIDENCE.md) and maintained journeys |
| R2.1 | More circulation and room for content | Matched old/new geometry, unchanged transforms/avatar; 90 routes and ten-piece placement checks; meshes match authoritative footprint | ACCEPTED LOCAL geometry; [spatial](../implementation/SPATIAL-REDESIGN-EVIDENCE.md) |
| R2.2 | Follow/Overview/pan/zoom remain predictable | Matched camera paths and HUD drag; combined native Options revealed cached sliver framing; actual red/green predicate repair | ACCEPTED LOCAL final strict3/3PASS; [spatial](../implementation/SPATIAL-REDESIGN-EVIDENCE.md) |
| R2.3 | Whole posed avatar and text stay visible | Actual posed mesh/upright envelope and finite pixel grader; sustained portrait/landscape failures preserved, not waived as stale metadata | ACCEPTED LOCAL final strict3/3PASS; [spatial](../implementation/SPATIAL-REDESIGN-EVIDENCE.md) |
| R3.1 | A full independent canvas is useful | Native sticky/draw/text/PNG paste/export/pan/zoom and direct route without Three; contrast/tool labels refined | ACCEPTED LOCAL; [workspace](../implementation/BOARD-WORKSPACE-EVIDENCE.md) |
| R3.2 | Concurrent work and undo survive | Element versions/lower nonce/canonical winners/tombstones/receipts; real authority and peer-safe native undo; recoverable conflict drafts | ACCEPTED LOCAL; [authority](../implementation/BOARD-AUTHORITY-EVIDENCE.md), [workspace](../implementation/BOARD-WORKSPACE-EVIDENCE.md) |
| R3.3 | Images save/read safely without bloating snapshots | Separate authenticated binary, magic/dimensions/PNG structure/CRC/quotas; near-2MiB wire/restart and negative controls | ACCEPTED LOCAL; JPEG/WebP pixel decoding not claimed |
| R3.4 | Chat/presence/pending status reflect reality | Expired replay and bounded-ACK repairs; native shortcut/peer presence; missing image swallowed adjacent text then callback feedback loop exposed/repaired | ACCEPTED LOCAL source/native; [workspace](../implementation/BOARD-WORKSPACE-EVIDENCE.md) |
| R3.5 | Standalone identity recovery works privately | Captured actor/serialized issuance/current-cookie check/generation fences; six red regressions; actual full two-member cold recovery; proofs never captured/logged | ACCEPTED LOCAL; [workspace](../implementation/BOARD-WORKSPACE-EVIDENCE.md) |
| R4.1 | Old data and new assets survive restart/backup | Additive third SQLite file; actual createService/restart, three quiescent WAL backups and unsupported-schema descriptor cleanup | ACCEPTED LOCAL; spec/board-integration.test.ts |
| R4.2 | Valid full state and all permitted views fit | Near-limit bootstrap exposed duplicate snapshot close, repaired; registered 24-engine/300s/slow-reader workload and calibrated grader | Original and two subsequent resource FAILs retained; current registered CI attempt pending; [protocol](../../evaluation/board-resource.protocol.json) |
| R4.3 | Tests/reviews are trustworthy and maintained | Fresh initial reviews, labelled contextual rechecks, actual-module/native reproductions; current finite-frame negative controls; failed fixtures/infra retained | Local411/checks, scoped native7+title2+strictgame and honest coverage recorded; CI9/production pending; no human A/B claim |
| R4.4 | The result can be extended and released responsibly | Local focused commits, self-hosted editor/assets/licences, explicit quotas/layout/backup/epoch contracts | LOCAL preparation; Docker/Fly/phone/human value/student reflections NOT RUN |

Return to the relevant checkpoint after source/assumption/findings change. Stop
resolved lanes; open gaps need actual evidence. The required gate's earlier 335
PASS checkpoint precedes later repairs and is not relabelled as final acceptance.
