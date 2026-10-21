# P7 sustained resource closure

22 October 2026. Both authorized single attempts pass at frozen production
manifest1116e2a4… and reviewed instrumentc23f8375… / helper5a5e8b25….
The exact package/lock hashes include the Vitest/coverage5.0.3 and Vite8.3.3 dev
security update. Node24.21.0 and server-only semi-space12 remain unchanged.

| Attempt | Gates | Monotonic workload | Peak server RSS | Board delivery p95 | Retained response-byte growth |
| --- | --- | --- | --- | --- | --- |
| Original |23/23 PASS |300.001s |190.4453125MiB |12.172ms |4,751,202B /4.531099MiB |
| Combined |27/27 PASS |300.001s |193.90625MiB |11.936ms |4,790,319B /4.568404MiB |

Both preserved all original21 gates and saved7188 patches/708 chats with zero
skipped writes, recorded errors or unresolved delivery targets. After each server
exited, all8142 actual board receipts were decoded in at most64-entry read-only
batches and matched the original actor/command-bound ACK digests. Missing, metadata,
decode, digest, duplicate and conflict counts are all zero. Both actual board+house
stored-response growth totals pass the preregistered16MiB target, including tags and
actual SQLite TEXT/BLOB representation. This does not establish a lifetime disk cap,
spare volume or billing improvement.

Combined preserves124 game actions/733 targets; game visibility p95/max are
102.948/114.141ms. The new picture phase completed62 actions/372 targets, with
visibility p95/max104.959/111.539ms and maximum schedule lag1.671ms. Each of six
identities in each house made four actual placements. Both saved tables are at
revision25 with24 correct placements and completed:true; final observed rosters and
private self-consents are clear. Game/picture/all-house new receipt counts are
124/50/174. Invalid/conflicting picture observation counts are zero. Scripted
contribution balance is technical evidence, not human preference or engagement.

`p7-resource-original-digest.json` and `p7-combined-resource-digest.json` contain
all nine main/WAL/SHM baseline, sampled per-file peaks and final-live logical and
allocated byte measurements, plus closed-database stages. A sum of independent
per-file maxima is not labelled a simultaneous total peak. The raw samples/results
remain immutable. Exact measured protocols/results and instrument/helper bytes are
preserved separately; prior resource failures and preimages remain unchanged.

UTC metadata requires a separate limitation. Raw startedAt→finishedAt labels span
296.176s original /296.364s combined. Workload start/end and duration use the fixed
performance.now clock and record300.001s. The field measurementFinishedAtUTC is a
pre-close result-assembly timestamp after recovery, not a separately sampled exact
measurement-end instant. `p7-resource-clock-scope.json` traces assignments and raw
sample ranges. The reason for differing clock observations is NOT ESTABLISHED;
no result was edited and no causal explanation or300s civil-clock claim is made.

No cross-run matched percentage reduction is inferred from the earlier174MiB
fixture. Decoded UTF-8 byte totals were not collected by the frozen instrument.
The two current closed synthetic data directories remain private/ignored for the
parent's optional same-dataset read-only representation analysis; no raw database,
cookie or content is published by this record.

Original PIDs119019/119043 and combined PIDs119213/119238 are closed, with exit0
and zero remaining resource processes. No preview, browser, service, retry or
future workload is scheduled by this lane. Resource ownership is RELEASED. Parent
owns independent final regrading, document integration, local commits and preview
restoration. No commits, pushes, deploys or production changes were made here.
