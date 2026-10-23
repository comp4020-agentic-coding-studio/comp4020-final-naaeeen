# Purposeful-house implementation acceptance

23 October 2026. **Local technical acceptance COMPLETE.** Work is in the
canonical Ubuntu checkout on `post-crit-improvements`. The current purpose is an
after-class house for two to six familiar friends who may work, explain material,
take a short break or visit one another. Publication is outside this local task.

## What each place now does

| User task | Applied design and evidence |
| --- | --- |
| Make a room worth returning to | One owner-selected reference image, saved inspection crop and persistent world wall/desk display. It can be useful material or personal artwork. The [room decision](ROOM-DECISION.md) compares this with another form, timer and general media host. |
| Host a visit | Named room visits, a pickable exit, the owner's material rather than the visitor's unrelated work card, visitor-local inspection and current door checks. Only the owner changes the saved reference/view. |
| Choose atmosphere and expression | Existing different furnished starter arrangements, furniture/palette/light settings and optional original procedural rain/fire/night sound. Listening is local and stops when the studio closes. Decorative objects provide character and orientation. |
| Explain something together | Real study chairs, voluntary huddle and the independent full Excalidraw board with drawing, notes, images and movable companion chat. Each person controls their canvas view. |
| Share a short look | A sofa gathering deliberately publishes one house-visible image copy. Presenter/follow/pointer, departure freeze and explicit successor make shared attention voluntary and recoverable. Phone Pan controls preserve the viewed crop. |
| Take a group break | One genuine game chair per house resident, separate Watch/Join, cooperative picture table for up to six and existing two-player Four-in-a-row. Six-person phone controls expose self, count, roster, tray pages and recovery. |
| Move between intentions | Places navigation, occupied/reserved chair feedback, explicit Stand, scoped chat drafts and pending Retry only after real room/chair acknowledgement. Closing a panel and leaving a seat have distinct meanings. |
| Retain earlier authored work | Saved work and exports remain accessible. Original private databases are preserved; the preview uses a checked copy with additive studio tables. |

[Implementation](IMPLEMENTATION.md), [initial review reconciliation](evidence/implementation-reviews.md)
and the [subsection register](../revisit/REGISTER.md) retain decisions and refinements.
[Try it](TRY-IT.md) gives the actual controls.

## Current source verification

Client handoff repair is committed at `e800f4e`; motion-pacer repair at `afd4fd7`.
The current resource source is registered as the53-file manifest887b139a. Results
are committed at `fc99a55`. Results below belong to their stated source, rather than any earlier pass.

- Full required12 passes build, TypeScript and **73 files / 1,575 tests** in43.206s.
  All510 bound runtime/build files stayed unchanged.
  [Record](evidence/required-handoff-pass.json) and
  [lossless serialization/source summary](evidence/required-handoff-serialization.json).
- The original native seat-arrival test reproduced a successful seat ACK followed
  by one idle movement before the seated head. The server correctly rejected it.
  The client now blocks motion during that handoff and refuses a new chair while
  its current head still says seated.350focused checks pass, including28new cases.
  [Round2 verification](evidence/seat-arrival-round2-verification.json),
  [contextual independent recheck](evidence/seat-arrival-review-round2.md).
- Fresh review corrected two test claims: a same-control seat-generation fixture
  is synthetic, while actual room editing also changes controller generation;
  a client-only receipt test is different from a coupled World-flight test.
  Both corrections and a real0.1-unit coupled-flight control are preserved. The
  first candidate/P2 and all eight archive hashes remain unchanged.
- Whole-client line/statement/branch coverage is81.17%/77.74%/66.32%.
  Mapped changed-code coverage is separately documented; it does not replace the
  whole-module values. [Coverage](evidence/seat-arrival-round2-coverage.json).
- All **10 current-source native cases pass**: motion1, spatial4, recovery2,
  picture2 and break1. Original60s/300s/zero-retry bounds remain unchanged.
  Source648 and launch35 hashes stay unchanged; every selection closes its owned
  processes/browser executables. [Motion](evidence/native-handoff-motion-after.json),
  [spatial four](evidence/native-handoff-four-after.json),
  [maintained five](evidence/native-handoff-maintained-after.json).
- The parent viewed all seven distinct spatial PNGs and the maintained phone PNG
  at original resolution; curated copies are byte-identical. Separate pixel records
  preserve the raw pending markers: [spatial](evidence/native-handoff-four-pixel-approval.json)
  / [phone game](evidence/native-handoff-maintained-pixel-approval.json).
- The current six-person whole visit passes32checks in165.824s/240s: six real
  authenticated contexts, six physical chairs and24placements/four per author.
  Leave/Stand/reseat/reload and actual phone return to the owned room pass.
  Allsix contexts close with browser disconnected and no owned processes left.
  [Mechanical result](evidence/native-handoff-six-after.json) retains its original
  pending visual marker; [separate parent approval](evidence/native-handoff-six-pixel-approval.json)
  records inspection of allsix original frames. Inactive renderers are managed;
  this does not establish six simultaneous physical-device renderers.
- The previous actual picture-HUD comparison covers desktop,390x844 and844x390,
  roster/menu reachability, focus, scrolling and44px primary controls. This is a
  technical comparison; it does not measure player preference.

## Resource qualification and observed repairs

The original fixed hosting shape is256MiB; the resource gate remains210MiB sampled
service RSS. No image-quality, connection-cap, server-guard or workload relaxation
is part of the repair.

The previous complete reuse candidate passed baseline23/23 at300s and191.3516MiB.
Its mixed run completed300.001s with29/30gates passing,193.4414MiB sampled RSS,
all24media checks and game/picture/recovery success. Only ordinary movement input
failed, with two RATE_LIMITED ACKs whose exact categories were not retained.
[Preserved baseline](evidence/resource-reuse-baseline-closure.json) /
[mixed](evidence/resource-reuse-mixed-closure.json).

A controlled real-handler comparison exposed fixed-deadline send bunching and
transition-clock resets. Actual-dispatch pacing and bounded safe diagnostics retain
all server guards, rates and grading.19focused tests and independent review pass.
The two historical rejection causes remain unknown.

The new source-bound pair, preregistered at `1e1ba14`, completes both unchanged
profiles: **baseline23/23 at300.001s,196.7617MiB** and **mixed30/30 at300s,
198.3828MiB** sampled service RSS. Each verifies8,142receipts; normal movement has
zero rejection/timeouts. Mixed also passes all24media checks, games, picture,
reconnect and persistence. Both diagnostics are VALID, with zero invalid samples.
Both generators/services close; all53source hashes and protocol bytes stay fixed.
[Baseline closure](evidence/resource-handoff-baseline-closure.json) /
[mixed closure](evidence/resource-handoff-mixed-closure.json).

Only after both passes were the three canonical result aliases promoted, using
already-frozen preimages: [promotion proof](evidence/resource-handoff-result-promotion.json).
Earlier failures remain unchanged. Current14baseline/11mixed condition groups,
24views, image bytes, flags, connection cap and210MiB/256MiB limits are unchanged.

The HTTP asset cache holds at most8MiB of backing allocations/32entries, repeats
current authorization on every request and retains exact original image bytes.
The matched24-read trial reduced SQLite materializations/backing allocations24→4.
Earlier missing-zone-header, allocation, clock and diagnostic failures remain
preserved with their own source and endpoint limitations. The cache is an
allocation repair, not a reason to lower image quality or weaken permission checks.

## Data, preview and ongoing evaluation

The [existing-data rehearsal](evidence/preview-copy-migration.json) preserved every
original table digest, integrity, foreign keys and schema versions while adding
four studio tables. A new verified backup preceded the final restart. All498startup source hashes,
three liveJS hashes and health200 match; the in-app browser title at
[http://localhost:4093](http://localhost:4093) was reloaded and retained for the owner.
[Backup](evidence/preview-final-handoff-backup.json) /
[preview readback](evidence/user-preview-final-handoff.json).

The [independent whole-house review](evidence/final-product-purpose-review.md)
checked capacity, place roles, consent and privacy. Its suspected missing board
chat was withdrawn after the parent traced the actual independent app.

Three useful next friend tasks are a return/visit with real detailed material,
coordinating an explanation across house/board chats, and choosing a second picture
game visit. Physical-phone feel, acoustic quality and contribution balance also
need people/devices. Technical comparisons and model reviews are not human A/B
results. WSL process RSS is separate from an actual Fly cgroup measurement.
Final evidence validation passes and all seven PROCESS commit references resolve.
Production dependency audit reports zero advisories at every severity.
[Final checks](evidence/final-checks.json). The temporary4108test service is closed;
the checked4093user preview remains running. No new deployment, classmate activity
or grade is claimed by this local acceptance.
