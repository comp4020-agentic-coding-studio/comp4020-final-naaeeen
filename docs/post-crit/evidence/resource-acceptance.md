# P6 resource acceptance

22 October 2026. The original300s exercise and the separately registered combined
exercise pass at production source manifest
`5abf0f71155ed7648547dda309886f1136caf542fc06b9cd2549941e8236a01b`.
This is local WSL synthetic evidence. No Fly enforcement, sustained WAN/browser
rendering, physical-device, human usability/value or classroom result is claimed.

## Actual attempts and immutable scope

| Attempt | Protocol / instrument | Result | Measured duration | Peak server RSS | Board visibility p95 |
| --- | --- | --- | --- | --- | --- |
| Original |6e8140f8 /7584bce6 | PASS, all21 original gates |300.001s |197.05859375MiB |13.052ms |
| First combined |4af229e0 /7584bce6 | FAIL at first Join: missing houseId in generator | No sustained result | Not acceptance | Not acceptance |
| Repaired combined |741d4783 /8dd77f07 | PASS, all21 original gates plus2 game gates |300.001s |182.6171875MiB |13.023ms |

The exact original measured protocol/result/instrument and failed combined
protocol/result bytes are retained by `resource-attempt-preservation.json`.
`resource-pre-adaptation-manifest.json` separately preserves the earlier canonical
history. The current original protocol has a prospective binding to the repaired
instrument; the accepted original result remains explicitly scoped to6e8140f8 /
7584bce6. A byte-equality test and fresh targeted review establish that the sole
instrument change was the combined-only command houseId field. The parent
explicitly accepted this scope without repeating the unchanged original path.

The first combined FAIL is also retained in the current combined result's history.
Its actual server validation remains intact. `combined-resource-repair.md` records
meaningful RED→GREEN real-authority regression and fresh Astra/high review before
a separate explicit GO. A Python launch-wrapper PATH failure occurred before any
process/workload creation; `resource-launch-infrastructure.json` records that
infrastructure event separately. No failed run became a smoke PASS or automatic
retry; no production source, metric, cadence, duration or limit changed to fit.
The two RSS observations do not establish a causal improvement or comparison win.

## Original load and game visibility

Both completed exercises saved7188 patches and708 chats, with zero skipped
writes, rejected/timed-out normal inputs, unresolved deliveries, unexpected
disconnects or recorded errors. Every source/protocol/instrument guard matched
at exit. Both retained the actual24 independent engines and paired65s TCP pause,
lease expiry, Quiet recovery, exact board contents/assets/tombstones and negative
ACK controls. The original300s/RSS<=210MiB/p95<=1000ms and every other original
threshold remain unchanged.

The repaired combined run completed124 game commands across12 rounds:24 Join,
24 Ready,74 Move and2 Leave, producing10 wins and2 neutral withdrawals. All733
fixed readable root-view targets observed their exact scripted game revision and
matching projection. Game visibility p95 was100.992ms, maximum110.002ms; maximum
schedule lag was1.612ms. House motion ranged9.995–9.997Hz and board pointers
18.226–18.340Hz across individual views. Event-loop p95/p99 were14.164/18.039ms.
Game participants were member1/member2; only the registered paused member0 target
was excluded during30..95s. No extra sockets, navigation or competitive clock.

## Storage measurements and limits

Fourteen live aggregate samples measured house receipts12→136 (+124), with
response payload bytes3144→31418 (+28274). Two final game-table rows retained1044
bytes total,522 maximum in that final sample, and no active current round.
Across all14 storage samples, the maximum was547 bytes per table and1094 total. No consumed receipt was
deleted. A bounded current table therefore does not imply bounded receipt storage.

Across all three SQLite files plus WAL/SHM, live logical bytes grew27303208→
209873624 (+182570416), and allocated bytes grew27312128→209887232. These totals
include the original heavy board pressure and journal/allocation effects.
Read-only post-close attribution found board receipts held170744820 response
bytes; scheduled patch responses account for163102432 and scheduled chat responses
3044804. The board receipt table occupied184365056 bytes of SQLite pages. Current
board content/assets/contributions and retained chat are measured separately.
Post-close board.sqlite was202530816 bytes. The raw SQLite fixtures remain ignored;
only aggregate counts/byte sums are delivered.

Total retained storage is an unresolved budget/retention limitation. No total
persistent-disk limit or long-term stability is established by this registration. It would be incorrect to claim the whole app's disk use is bounded
from the compact game state, or to label every WAL byte permanently retained.
No receipt GC, quota rewrite, manual checkpoint, existing application-database
or user-data deletion
was performed. `combined-resource-storage-analysis.json` records the read-only
attribution; a fresh targeted interpretation review confirms the aggregate attribution; final
review reconciliation is recorded below.

Node was24.21.0, with actual server-only `--max-semi-space-size=12` and an unflagged
generator. Cgroup memory/CPU files and OOM counters were unavailable in this WSL
context; the local child was not constrained to a256MiB Fly machine. These process
RSS passes do not qualify actual Fly sustained memory or host-wide limits.

## Evidence, cleanup and continuation

- `resource-original-digest.json` and `combined-resource-digest.json` record full
  result hashes, exact source identity, independently recomputed counts and exit
  guards. Canonical results are `evaluation/board-resource.results.json` and
  `combined-resource.results.json`.
- Original generator66778/server66811 and revised generator68018/server68042 are
  closed. `resource-runtime-closures.json` records checks. The first combined
  failure exited before numeric PID capture; process inventory and owning tool
  exit confirmed zero remaining resource processes, with that capture gap retained.
- 25 focused tests, typecheck, self/checkpoint controls and scoped diff checks pass
  after the combined field repair. Parent full863 required tests and native lanes
  retain their separately recorded source/scope; the three new resource tests are
  specifically verified in the25-test artifact.

No further resource run is scheduled or needed for these declared gates. Parent
owns final integration/document consistency and any future sustained storage
policy or separately authorized deployment. The fixed Fly shape, existing data,
legacy evidence, secret hooks and publication boundary remain unchanged.


Fresh Astra/high storage interpretation review independently confirmed all23
gates and exact file/source hashes, plus immutable aggregate SQLite reads. It
clarified final versus run-sampled game maxima (522 versus547 bytes) and main-file
versus all-file post-close scope; the digest and analysis now state both precisely.
Empty WAL/SHM bookkeeping can appear during SQLite read access without new saved
application records. Frozen workload baseline/final file measurements remain
unchanged. This review does not introduce a retrospective disk threshold.
