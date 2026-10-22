# Diagnose the first final mixed run before another qualification

23 October 2026. Source candidate1c041d3 /53-file manifestb3808448 remains unchanged.
The baseline completed300 seconds, all23 gates PASS, sampledRSS194.28125MiB and
8,142 exact receipts. The first mixed run stopped early with
SPATIAL_HTTP_409_STALE_ZONE, categoryOTHER. All child processes closed. Its memory
diagnostic has no final measurement endpoint; no completed mixed gate is claimed.
Keep both first results and their protocols immutable. No unchanged retry.

## A. Repair the actual workload's room-configure request

Two independent read-only traces and parent source inspection find that the
actual request helper omits X-House-Zone. The first room.configure POST reaches
executeHttp with undefined; it requires the current controlled zone. Two image
uploads and the historical receipt replay already passed, ending at the expected
closed-door denial. This locates the next request without weakening server checks.

Common task: one authenticated controller enters its owned bedroom and configures
its door through the workload's actual header builder. Acceptance: missing/wrong
zone receives409 and changes neither room revision nor receipt count; current
zone succeeds200 and creates exactly one effect. Extract the existing header
construction only as needed to exercise it directly against real HTTP. Record RED
before adding the current snapshot's zone header, then GREEN. Preserve schedule,
expected statuses, actors, limits and every existing activity assertion. Fresh
review the diff. No product authority or client change is authorized by this fix.

## B. Reduce repeated immutable asset allocations without changing images

The early lifetime sampled peak219.1328125MiB occurs at sequence48/rejoin.after,
not during the later studio operation. Heap45.029MiB and external57.661MiB include
46.554MiB of ArrayBuffers. At rejoin.before heap was34.066MiB; the added reconnect
snapshot coincides with ~10.96MiB more heap while external remains retained.
The successful baseline had already released most asset buffers by that boundary.
This is a bounded allocation hypothesis, not proof of a leak or STALE_ZONE cause.

Compare: existing per-GET owned SQLite BLOB, response-lifetime sharing, bounded
immutable byte reuse, and streamed storage reads. Do not alter scene/image quality,
server flags, HTTP scheduling, view counts, cadence, sampling or210MiB/256MiB limits.
The existing Buffer view already avoids an extra JavaScript copy; repeating it is
not a new optimization. A fresh Astra decision is checking lifecycle, ownership
and API semantics before production mutation. Public BoardStore.getAsset currently
returns independently owned mutable bytes and must retain that behavior.

If bounded HTTP-only reuse is selected, check current authorization on every GET,
retain house/file scoping and immutable-ID rules, bound retained backing-store
bytes, clear on service close, and preserve exact content/headers. Validate equal
bytes and HTTP behavior across repeated/foreign-house/denied/revoked reads, eviction
and shutdown. A matched allocation comparison must count actual unique backing
stores/SQLite reads under the same24-read task; it cannot replace a full RSS run.

Pinned primary documentation checked: Node24.21.0 [SQLite](https://raw.githubusercontent.com/nodejs/node/v24.21.0/doc/api/sqlite.md)
returns BLOBs as Uint8Array; [Buffer](https://raw.githubusercontent.com/nodejs/node/v24.21.0/doc/api/buffer.md)
ArrayBuffer views share storage; [HTTP](https://raw.githubusercontent.com/nodejs/node/v24.21.0/doc/api/http.md)
finish means handoff to the OS rather than peer receipt. Later latest-v24 docs are
24.22.1 and are not substituted for the installed version.

## Requalification and stopping rule

After deterministic checks, independent review and an applicable full check, bind
new source/protocol paths preserving this failed candidate. Requalify unchanged
baseline and mixed300s sequentially once with idle acknowledgements. Preserve any
new failure and investigate its actual category; no loop of unchanged retries or
post-hoc relaxed gates. Existing native source acceptance retains its actual
scope; rerun affected board HTTP/browser boundaries if production serving changes.

## Independent memory decision and authorized candidate

Fresh-context GPT-6 Astra max checked the immutable asset table/insert rules,
pruning, departure, fresh-buffer tests and shutdown paths. It selected a bounded
HTTP-only LRU as the smallest credible allocation candidate. This is a hypothesis
pending measured comparison and qualification. Keep BoardStore.getAsset semantics.

Cache at most8MiB of retained backing stores and32entries, keyed by house and file.
Charge bytes.buffer.byteLength, not only the slice length. A cache cap does not
bound all in-flight responses or prove a process-RSS outcome. Never mutate/zero
an evicted buffer while an HTTP response could retain it. Cache content only,
never authorization; retain every current per-request identity/member/own-export
check and no-store headers. Clear the cache on board-service close. Do not alter
PNG quality, SQL persistence, resource flags or the registered client workload.

Required evidence: RED/GREEN byte/count/lifecycle and actualHTTP authority tests;
a matched24-read old/new comparison of actual SQLite BLOB materializations and
unique backing stores with exact byte digests. Validate house/file separation,
byte and entry bounds, eviction, clear, mutable store-return independence, cache
miss404, revocation and own-export behavior. Then fresh independent source review,
affected complete board browser flow, fullcheck and new fixed-budget qualification.
Stop on a new defect rather than accepting an allocation-count result as RSS proof.
