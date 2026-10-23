# Physical-seat arrival handoff: round-2 refinement

23 October 2026. Round 2 is frozen for parent contextual review. The first
candidate, its P2/calibration findings and its original scope claims remain
unchanged in [the round-1 archive](seat-arrival-round1/manifest.json). This report
supersedes round-1 candidate readiness; it does not relabel that review clear.

## Exactly three bounded refinements

1. The exported client now rejects claimSeat before emission while the current
   self head is seated, with ALREADY_SEATED and a message to Stand and wait until
   the avatar is standing. The source change from round 1 is recorded in
   [the refinement diff](seat-arrival-round2-refinement.diff). No server ACK,
   geometry, World, UI, pacing or subscription behavior changes.

   The new ordering regression was first run against the exact archived round-1
   client and failed: the replacement claim resolved successfully instead of
   being refused. It uses two real sofa seats within the server's 1.5-unit claim
   range. It covers seated A/gen2 -> Stand ACK -> attempted B before standing
   projection -> queued earlier standing/gen3 -> B ACK. After the guard, B cannot
   start until the standing head is current. A deliberate B claim then captures
   gen3, so another old gen3 head cannot release its latch while B's committed
   gen4 head is withheld. Explicit Stand and subsequent standing remain usable.
   This closes an exported API ordering hole; it was not a native UI permission
   bypass. The original Places-to-study race remains the primary reproduced bug.

2. The old generation-only release fixtures are now named synthetic same-scope
   lease-release/client-receipt contracts. Their room-edit attribution in the
   first report was incorrect. Actual realtime room-edit reconciliation calls
   resetZone and advances controller generation at src/house-realtime.ts:238;
   resetZone updates pose and release advances an occupied seat's generation.
   Two additional fixtures mirror those producer fields in both ACK/head orders:
   a real bedroom chair is removed, room revision changes, pose resets to the
   source-calibrated valid arrival and controller generation changes. The client
   resumes using that authoritative generation. These are transport fixtures,
   not a live server/native DIY flow.

3. The original two-unit late-motion fixture proves client receipt shape/anchor
   handling only. It did not prove an otherwise-current World flight settled.
   A new coupled fixture imports real UI, World and client. It holds an actual
   motion ACK, delivers a synthetic same-scope lease-generation head with a
   0.1-unit pose correction (below World's 1.15-unit reset threshold), and checks
   that the snapshot leaves World prediction unchanged. The real client receipt
   then recovers World to the current authoritative anchor, and another held-input
   movement is emitted. This supports the retained seat-generation-aware receipt
   branch. The producer is deliberately synthetic exported-client contract data;
   it is not labelled native Places or actual room-edit behavior.

## Frozen verification

The final focused run passes all 350 tests with process exit 0 and no skipped
cases: existing client79, UI138, World105 and handoff28. Seven handoff cases couple
actual UI/World/client through stubbed renderer/socket/HTTP boundaries and a manual
DOM RAF clock; 21 isolate actual client callback contracts. Typecheck exits 0.
Canonical LF, no trailing whitespace and the client diff check are confirmed.
World, UI and server source hashes are unchanged; no existing spec was edited.

Whole-client V8 coverage is 81.17% lines, 77.74% statements, 81.81% functions and
66.32% branches. Whole-module statement/branch coverage remains below80%. Explicit
added-source-line mapping measures33/34 executable starts,60/61 statements,
45/47 mapped branch alternatives and16/17 function declarations. The module has
155 unmapped branch alternatives, which are not attributed to this patch. Exact
mapping, raw local coverage identity and totals are in
[round-2 coverage](seat-arrival-round2-coverage.json).

Client SHA256:
3d90ee2a2fd4bca9226ccdc22911dd0f62cae8680339783e8de3a9b65a8386da

Spec SHA256:
f0a186465dec09394b7ea02cc1f8be5b871d5ca95625699ba7219810fd4cef17

[Source freeze](seat-arrival-round2-source-freeze.json),
[commands and actual outcomes](seat-arrival-round2-verification.json),
[P2 RED](seat-arrival-round2-p2-red.json), and
[complete client diff](seat-arrival-round2-fix.diff) identify this round. All eight
round-1 archived files still match their original SHA256 values, including the
743c08c6 client, e9a53b15 spec and original review/report/coverage/diff.

## Remaining scope

No additional hypotheses were implemented or extra checks started after these
bounded refinements. Parent contextual review, full required checks, the selected
native/whole-visit rerun and resource qualification remain pending. This worker
launched no native browser, service, full suite, resource workload, commit, push
or deployment. Local fixture success does not establish live/native or human
acceptance.
