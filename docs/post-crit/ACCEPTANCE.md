# Post-Crit local acceptance, 22 October 2026

This is the current acceptance index for the post-Crit improvement branch.
The eight feedback items and later group-participation requirement are preserved
in [OWNER-FEEDBACK](OWNER-FEEDBACK.md). [PLAN](PLAN.md) defines scope; individual
contracts, raw results and source manifests establish each narrower result.
The product is a small study house for familiar friends: work together, take a
voluntary shared break, and return to a useful next step.

## Delivered interaction and evidence

| Requirement | Implemented behavior | Evidence and remaining boundary |
| --- | --- | --- |
| Camera follow | Intentional walking resumes temporary inspection; deliberate Look and Overview remain deliberate. Follow/Recenter is reachable; actual avatar bodies and labels are considered. | [Camera record](evidence/P1-CAMERA.md), [readability](evidence/P1-B-READABILITY.md). Matched technical/design trials and scoped observer repairs; human comfort unmeasured. |
| Different default bedrooms | Six versioned layouts vary arrangement, quantities and palette. New members receive a furnished room. Existing rooms are preserved; an owner can explicitly preview/apply a starter. | [Room UI](evidence/P2-ROOM-UI.md), [plan and migration contract](PLAN.md). Collision, arrival and desk/chair approach checks accompany native use. |
| Useful personal rooms | Desk/My work opens the resident's existing authored study card. Break -> Return to my room -> Open my work makes the room a place to resume a next step. Newer drafts and Quiet survive. | [Group UI](GROUP-UI-NOTES.md). The card remains house-visible and author-owned; the bedroom does not invent a separate private notebook. |
| Furniture interaction | Sit/stand at real seats, open work at a desk, change owner-controlled saved lighting, use the shared board and activity table. | [Room](evidence/P2-ROOM-UI.md), [lounge](LOUNGE-CONTRACT.md), [group contract](GROUP-ACTIVITY-CONTRACT.md). Decorative objects are still identified as decoration. |
| Voice option | The owner can save a validated Discord destination; residents explicitly open it. | [Voice contract](VOICE-CONTRACT.md), maintained two-context break/voice journey. This is an external voice route, not in-app capture or verified Discord call participation. |
| Larger furnished lounge | Expanded 20x14 layout separates study, rest and activity areas. Places supports navigation while Follow preserves avatar scale. | [Matched layout comparison](evidence/lounge-comparison.md). Both candidates passed the task; extra circulation has a walking-distance cost. |
| Shared breaks | Four-in-a-row supports two players. A separate 24-piece picture table supports three to six actual contributors, with explicit Join, immediate Leave, shared progress and author attribution. | [Game decision](GAME-CONTRACT.md), [group API](GROUP-API.md), [six-context proof](evidence/picture-group-native-acceptance.md). One original illustration and paged tray keep the content/implementation bounded. |
| Resource fit and preservation | Board receipts use a bounded lossless representation with legacy TEXT support; saved response meaning, UUID identity and author exports are retained. Existing assets and procedural furniture are reused. | [Storage contract](STORAGE-CONTRACT.md), [resource decision](RESOURCE-DECISION.md). Current final workload closure is recorded below; disk and RAM are separate measurements. |

## Native interaction acceptance

The maintained local selection passed **13/13** cases, with zero skipped,
unexpected or flaky results, in 149.938 seconds under its unchanged 300-second
budget. [Raw report](evidence/p7-maintained-browser/result.json),
[status](evidence/p7-maintained-browser/status.json) and
[export provenance](evidence/p7-maintained-browser/export-provenance.json) retain
the original run. It covers core identity/work, board, first-night recovery, title dialogs,
break/voice, three contributors, solo picture completion and receipt recovery.
This used native sandboxed Chromium through Playwright 1.63. It is the maintained
CI selection executed locally, not a GitHub Actions or Docker run.

The source-bound six-context task passed 30 checks: three initial contributors,
three late arrivals, voluntary departure, peer continuation, reload into Watch,
fresh Join and all 24 placements. All six identities contributed four pieces
because the driver allocated them that way; the app has no such quota. Inactive
worlds were paused through ordinary controls. This establishes six active game
contributors, not six continuously smooth world renderers or balanced human play.
One unattributed console 404 is retained in the raw result.

The six-context run predates a two-expression completed-round UI repair. Its
original source binding is retained. The current maintained solo-completion case
checks that the finished picture has Watching/0 active, no Join/Leave controls,
and an enabled Return action. No server authority or client ordering behavior changed in that fix.

A separate fresh reviewer checked the current-editor receipt recovery evidence.
A real committed HTTP reply was lost, another author added a note, and retrying
the original UUID returned the same parsed receipt without another sequence
increment. My contributions retained only the original author's objects. After
reload, the ordinary canvas download contained both authors' objects from the
current editor scene. The screenshot has overlapping notes and does not show
both texts simultaneously. This is not a same-object concurrent-edit test or raw
HTTP-byte equality claim.

## Checks and dependency maintenance

Current full required verification passes **1,071/1,071** tests, typecheck, build
and evidence checks. Focused picture component coverage passes 23 tests with
83.33% branch coverage; that number is not whole-application coverage.
[Toolchain patch](TEST-TOOLCHAIN-PATCH.md) records the verified Vitest/coverage 5.0.3
and required Vite 8.3.3 peer update. Both full and production-only audits report
zero known advisories. All 475 public files are byte-identical after rebuild,
and the production dependency listing is unchanged. Earlier native evidence
keeps its own manifest; this equivalence is not a new browser run.

## Resource acceptance

Both fixed 300-second workloads pass. The original 21 gates remain intact; the
current original run adds exact-receipt replay and a 16 MiB retained-response-growth
ceiling. The combined run adds the registered game and picture checks.

| Workload | Gates | Peak sampled server RSS | Board delivery p95 | Board + house retained response growth |
| --- | --- | --- | --- | --- |
| [Original raw result](evidence/p7-resource-original.results.json) |23/23 |190.4453125 MiB |12.172 ms |4,751,202 B /4.531099 MiB |
| [Combined raw result](evidence/p7-combined-accepted.results.json) |27/27 |193.90625 MiB |11.936 ms |4,790,319 B /4.568404 MiB |

Each saved 7,188 patches and 708 chats with zero skips, recorded errors or pending
commands. All 8,142 board receipts matched accepted responses after each measured
server exited. Combined game actions/targets were 124/733; picture actions/targets
were 62/372, with two completed 24-piece tables and six contributors per table.
[Closure](evidence/p7-resource-closure.md) and the two digest files record every
main/WAL/SHM file's logical and allocated measurements. These WSL process results
do not enforce Fly's actual 256 MB cgroup or establish a lifetime disk cap.

A separate [same-dataset byte comparison](evidence/p7-receipt-byte-comparison.json)
reads the closed combined fixture without changing its main database. Its 8,142
retained response values occupy 4,854,559 bytes, versus 170,744,820 bytes for the
same decoded UTF-8 JSON: a 97.1568% reduction in this response representation.
This excludes current scenes, indexes, assets, WAL, filesystem overhead and RAM;
it is not a cross-run sustained performance percentage. Correctness comes from
the accepted-ACK ledger and native recovery, not compression size alone.

The workload clock is monotonic and records 300.001 seconds in each run. Raw UTC
labels span 296.176/296.364 seconds; their disagreement has no established causal
diagnosis. [Clock record](evidence/p7-resource-clock-scope.json) preserves the
assignments and samples. UTC labels are not used to reconstruct workload duration.
All measured and validation services are closed before the restored preview starts.

## Reviews, refinements and method evidence

[REVIEW-AND-REFINEMENT](REVIEW-AND-REFINEMENT.md) and the
[detailed register](../revisit/REGISTER.md) retain separate findings and repairs.
Fresh Astra reviews inspected persistence, authority, client ordering, return
races, modals, workload grading and toolchain changes. The parent checked findings
against source and actual counterexamples before accepting fixes. Contextual
rechecks are identified separately; the resource review's incidental exposure to
historical verdict metadata is disclosed.

[Company-method research](../harness/COMPANY-METHODS-2026-10-22.md) compares Google
Harness2, Anthropic, OpenAI and Microsoft. Four matched fresh-agent diagnostic
responses provided no added correctness from an extra contradiction instruction
on the two fixtures, so that instruction did not become mandatory. This is a
small agent-method comparison, not human A/B or a general efficiency result.

## Preservation and continuation

Preview restoration uses a verified migrated copy of the existing three databases;
the original and its backup remain unchanged. The schema-only control preserves
all original rows/fields. Ordinary startup in the real-clock copy applies the
existing seven-day chat retention and removes 245 expired messages there; the
backup retains them. See [migration record](evidence/p7-preview-copy-migration.json).

The local preview is restored at http://localhost:4093/ using the verified copy.
[Preview record](evidence/p7-local-preview.json) verifies its process, data path,
health and six served asset hashes; Windows health and page requests succeeded.
The Codex panel opening was queued, so a visible browser tab is not asserted.

[Parent acceptance](evidence/p7-parent-acceptance.json) records both fresh reviews,
source/hash reconciliation and the completion-UI wording correction. The verified
public locale-module basename has reversible JSON-only serialization in four
artifacts; [provenance](evidence/p7-evidence-serialization.json) reconstructs exact
original hashes and preserves parsed content. The secret hook remains intact.

Local implementation milestones are committed through `c55d5e0`; final native,
resource and preservation evidence is committed at `ea37a0f`. The following
[documentation handoff](../implementation/CURRENT-HANDOFF.md) changes no runtime
source. No new
push, deployment or paid voice service occurred. Real friends, physical phones,
WAN/media behavior and actual Fly enforcement remain distinct follow-up work.
