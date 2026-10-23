# Spatial redesign implementation checkpoint

23 October 2026. Local branch `post-crit-improvements`, canonical Ubuntu checkout.
The owner explicitly authorized applying the refined design, including other
journey defects discovered during the audit. This is a new implementation gate;
`93f8cfa` is its research baseline. No push, deployment or paid provider change is
part of this gate. All product and repository writing remains English.

## Required outcomes and ownership

| Slice | Concrete purpose | Implementation and proof |
| --- | --- | --- |
| Activity table | Two to six real seats enable explicit cooperative participation | Seat core: geometry, server authority, receipt replay, consent and reconnect epochs; meaningful unit/integration contracts and fresh authority review |
| Bedroom studio | Owner resumes a selected reference and hosts a visit around their material | Bounded canonical PNG, saved inspection position, local procedural soundscape, owner write/current-door reads, archived owner export; SQLite/codec/UI/HTTP/native checks |
| Study table | Willing seated friends coordinate around the existing independent board | Explicit opt-in huddle and board launch, present members, no claim of synchronized Excalidraw viewport |
| Sofa | Voluntary short shared look with pointing | One explicitly house-visible selected reference, consent, presenter/follow, loss and cleanup contracts |
| Whole visit | Clear routes and predictable recovery across modes | Named visits, clickable exits, real seat navigation, scoped chat drafts/readability, authority-bound UI and preview cleanup |

Each executor owns its narrow files and records RED/GREEN and limits. The parent
owns `src/server.ts`, integration, final checks, docs reconciliation and commits.
Fresh reviews start without prior chat, with factual goals/contracts and source,
without earlier verdicts. Initial review dispatch was held by the seven-slot
capacity while execution lanes were active; reviews run as lanes finish.

## Product and resource decisions

The room comparison selected a real reference desk with atmosphere rather than
another task card or timer. The owner's material remains useful alone and is a
shared subject when a visitor arrives. It is not a general file host: one PNG,
maximum256 KiB/1,048,576 pixels, saved crop, and three optional original procedural
soundscapes. A visitor inspects locally; no synchronized bedroom viewport claim.
Sound starts only after that visitor chooses Listen here and stops on leaving.

The SQLite studio tables use the existing house database with their own schema
metadata. Read/write callbacks check current room access before a synchronous
transaction. Owner archive export is separate from current visitor access. Eight
MiB per author across active and archived images prevents silent loss and
unbounded growth; paginated export avoids materializing all images at once.
Studio payloads remain within the existing16 KiB command limit using bounded
chunks. No additional runtime dependency or external content service is added.

Sofa images are intentional public copies for current house members. Closing the
source bedroom does not recall a previously published copy. Every shared action
uses server-derived controller, reconnect-access and seat epochs. Sitting alone
never grants interaction consent. A late Join must not undo a newer Leave.

## Verification gates

1. Focused behavior and negative controls, followed by independent fresh review.
2. Full project native checks and affected real HTTP/socket ingress tests.
3. Real browser journeys across separate identities, including owner/visitor,
   seat loss, presentation/follow, export, mobile layout and cleanup.
4. Existing resource gates on unchanged workload definitions, plus a separately
   identified workload for new seated/media activity. No inherited acceptance.
5. Diff/secret review, evidence/plan/handoff reconciliation and logical local
   commits. Preview is restarted only against a checked copy of existing data.

Passing technical checks does not establish that friends find the room useful.
Human task comparison remains separate and must not be described as completed.

## Current status

Product slices and independent reviews are complete. Current full required12
passes build/types and **73 files / 1,575 tests**, with all510 runtime/build hashes
stable. The client seat handoff and tool-only pacing repairs have their own
RED/GREEN and review records; all10affected native cases and the whole-six visit pass. Both300s resource
profiles pass23/23 and30/30, with a highest sampled RSS of198.3828MiB. [Acceptance](ACCEPTANCE.md) records source-specific outcomes.

The room's saved reference, study huddle, sofa presentation and six-person picture
flow are implemented. Earlier native successes retain their recorded source;
final source verification is not inherited from them. The checked local preview is restored; publication remains
outside this task.

## Historical first integration and fresh-review cycle

- `397e3f5` commits the room comparison and implementation gates before acceptance.
- The first `pnpm check` stopped at a new HTTP test's TypeScript header-union
  typing error; the fixture was corrected. It is not an application acceptance run.
- A separate first full suite completed1,287/1,294 tests. Seven failures comprised
  four deliberate new epoch-boundary regressions, two old geometry assumptions
  about exactly two game chairs, and the old resource fixture attempting games
  while standing. Each is assigned for source/fixture correction, not skipped.
- Fresh Astra seat review found Stand and historical replay still ran unrelated
  database maintenance first. Parent checked those source paths and assigned
  meaningful fault regressions before repair.
- Real held-body HTTP tests reproduced late never-accepted Join after reseating
  and same-token reconnect: both returned200 instead of409. Captured request
  access/seat epochs must prevent this while exact historical receipts remain
  inert. Server-derived current facts alone are insufficient for old intent.
- Fresh UI review reproduced cancellation during an uncertain upload and rapid
  presenter zoom divergence. Repairs require matched deferred-response tests.
- The first detached WSL preview disappeared after its launcher ended. It was
  rechecked through `/proc` and HTTP (connection refused), then replaced by a
  retained foreground exec session. This was an environment lifecycle failure,
  not an inferred application crash or a reason to change product code.

This first-integration checkpoint observed creation of a six-person house, six physical
activity places, ordinary My room -> studio arrival, and a furnished bedroom in
the actual in-app browser. At that point, image upload,
visits, shared sessions, authority loss, phone and sustained resource acceptance
were still pending; current acceptance above now closes those technical gates.


## Existing-data rehearsal

A read-only per-file backup copied the existing4093preview's three SQLite files
into a new ignored local directory. All original table content digests matched.
The actual current service opened and closed those copies successfully; every
original table still matched afterward, all integrity/foreign-key checks passed,
and all user_version values stayed unchanged. Only the four namespaced studio
tables were added to house.sqlite. [Aggregate record](evidence/preview-copy-migration.json)
contains no private database contents, credentials or raw identity identifiers.
The original files were not opened for writing. The checked copy is now served at http://localhost:4093/. The original data
remains untouched; the current launch and later live-served CSS have separate
hash records.

Current implementation acceptance and open gates: [acceptance record](ACCEPTANCE.md).
