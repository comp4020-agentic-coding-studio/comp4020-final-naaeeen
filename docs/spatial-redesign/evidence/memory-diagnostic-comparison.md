# Fixed ABBA bootstrap observations

**STOPPED at B2 under the predeclared functional-failure rule.** Three slots were attempted; two completed. A2 was not started. No retry, replacement, source/protocol/flag/threshold change or sustained workload followed.

| Order | Outcome | Gate RSS peak MiB | Whole sampled peak MiB | Separate OS maxRSS MiB | Boundary await count / total ms |
| --- | --- | ---: | ---: | ---: | ---: |
| A1 baseline | CALIBRATION; RSS gate true | 194.578125 | 194.578125 | 196.953125 | 22 / 23.358 |
| B1 mixed | CALIBRATION; RSS gate true | 191.69140625 | 191.69140625 | 193.94140625 | 24 / 21.681 |
| B2 mixed | FAIL, RATE_LIMITED | Not constructed | 191.9375 (partial) | 194.1875 | 21 / 19.874 (partial) |
| A2 baseline | NOT RUN, stop rule | — | — | — | — |

A1 and B1 have VALID complete compact artifacts. Their gated recovery.after endpoints are sequences54 and111, with terminal55 and112 respectively. Each exact prefix peak matches the original gate value. Shutdown/lifetime sampled maxima and OSmaxRSS are separately reported, without replacing the210MiB gate.

Both completed sampled maxima occur in phase bootstrap, between subscriptions.before and subscriptions.after. Exact peak rows and immediate neighboring rows:

| Slot / row | RSS | heapUsed | heapTotal | external | ArrayBuffers | House / board / engines |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| A1 seq35 | 194.429688 | 47.940651 | 66.402344 | 15.102715 | 10.528290 | 8 / 8 / 16 |
| A1 seq36 | 194.578125 | 43.760300 | 66.402344 | 15.071942 | 3.965070 | 11 / 10 / 21 |
| A1 seq37 | 192.656250 | 38.161354 | 64.222656 | 15.070876 | 3.964004 | 12 / 12 / 24 |
| B1 seq35 | 178.566406 | 20.114151 | 53.074219 | 15.190901 | 10.583074 | 8 / 8 / 16 |
| B1 seq36 | 191.691406 | 43.772980 | 66.152344 | 15.160068 | 4.053195 | 11 / 10 / 21 |
| B1 seq37 | 189.675781 | 38.277924 | 64.472656 | 15.159062 | 4.052190 | 12 / 12 / 24 |
| B2 partial seq35 | 191.890625 | 47.980034 | 66.152344 | 15.102715 | 10.528290 | 8 / 8 / 16 |
| B2 partial seq36 | 191.937500 | 43.763893 | 66.152344 | 15.071942 | 3.965070 | 11 / 10 / 21 |
| B2 partial seq37 | 189.917969 | 38.148994 | 64.472656 | 15.070876 | 3.964004 | 12 / 12 / 24 |

All memory values in that table are MiB. Numeric traces and exact unrounded rows are retained in memory-diagnostic-comparison.json and each first compact artifact; phase and boundary names come from the fixed allowlists.

B2 first failure is RATE_LIMITED in the existing invalid-ack-negative phase, after spatial.prepare.before and before any of the four chair claims completed. Its75/75 terminal stream is complete with zero malformed samples. The compact artifact is INVALID/MEMORY_DIAGNOSTIC_MEASUREMENT_END because that earlier application rejection prevented the recovery.after endpoint/gate construction; this does not replace the primary failure. No cause for RATE_LIMITED is inferred here.

A1 generator32825/server32849, B1 generator32888/server32912, and B2 generator32948/server32972 all closed; server exits were0 and post-checks found none alive. Both successful calibrations and the failed B2 retain their first logs/results/compact artifacts/closures. All53bound source hashes and protocol bytes stayed unchanged.

This is an incomplete diagnostic comparison, not a memory optimization result. The prior215.26953125MiB observation remains valid for its own source/instrument. These two completed instrumented bootstraps do not identify that cause, establish sustained hosting fit, or enforce the actual Fly256MBcgroup.
