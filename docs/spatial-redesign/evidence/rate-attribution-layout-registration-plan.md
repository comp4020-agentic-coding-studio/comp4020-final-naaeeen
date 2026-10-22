# Final-layout attribution registration preparation

Status: PREPARATION ONLY. Required check #6 failed one fixture; registration and
execution remain held. V5's mechanical component result is separate from the
required suite and from integrated six-person or hosting acceptance.

Prepare one new `rate-attribution-final-layout.protocol.json` from the immutable
`rate-attribution-reviewed-final.protocol.json` (SHA256
`6e0e195716a18a57655a94a0f31d1101eb9cc75e4f422156a79b3a43d8668259`).
Keep the earlier 519/e2 and a108/e2 unrun registrations, the stopped ABBA plan and
all first results untouched. Registration creates no resource result and grants
no execution permission. The parent owns any later execution.

The helper defaults to read-only preflight. Its write branch requires a distinct
parent registration GO, a hash-confirmed completed required-check record with
exitCode 0 and sourceUnchanged true, and confirmation of the candidate manifest.
The required-check source maps must match all 48 covered members of the 53-file
resource allowlist; the five omitted configuration/instrument files are verified
directly against the reviewed source binding. Never inspect local configuration,
environment or credential files. Only the named project files are hashed.

Preserve these 11 mixed condition groups exactly: configuration, fixture,
workload, slowReader, negativeControls, bounds, measurement, storageAcceptance,
gameScenario, pictureScenario and spatialScenario. Also require equality of all
other non-registration fields. Thus duration 300, 24 views, original fixtures,
routes, 100 ms movement wait, 5000 ms ACK deadline, action limits, RSS bounds,
failure controls and grading stay as declared in the mixed profile. This one
bootstrap does not execute its 300-second timed phase.

The historical registration-key allowlist is commands, instrumentSHA256,
memoryDiagnosticRegistration, registeredAtUTC, sourceBinding, sourceFiles,
sourceHashes, sourceManifestSHA256 and status. For this preparation, propose only
two additional nested metadata changes:
`rateAttributionRegistration.sourceReview` and
`rateAttributionRegistration.priorReviewedFinalProtocolSHA256`. The parent must
approve this narrow extension with the registration GO. Preserve all other
rateAttributionRegistration fields, including maximumExecutions 1 and retry false.
Preserve memoryDiagnosticRegistration and rateAttribution entirely.

Require the complete immutable 53-file allowlist, both reviewed instruments, all
17 unchanged backend files, LF bytes and no ignored source. Compared with the
a108/e2 source binding, only the three parent-owned layout files may change:

| File | Prepared current SHA256 |
| --- | --- |
| public/house-puzzle-ui.js | 8cd1edc8449ba10009094534b2de1387e3d74bf665871e00e2f3f06e213540f8 |
| public/house.css | 57eb2039f0a55fe0530b91d9784a8c91466297f552fb9e93f5fb1f693474cce9 |
| public/house-ui.js | 2541507c8998719b22da2f4312e1a75ee3aa1eb1e53f1765c2ecf6f6a4f40d2a |

These hashes describe this preparation; they do not freeze a new protocol. Source
drift stops the helper and needs parent review rather than automatic rebinding.
The exact four routes stay actors 2/4/14/16 with 41/54/41/54 moves and one seat
each, totaling 194 trace rows; preserve each route digest and geometry digest.

Before registration require these new paths absent, including dangling symlinks:
the protocol, registration record, inspect record, results, memory diagnostic,
rate attribution trace, log and closure record, all under the new final-layout
stem. Use exclusive creation. Hash the existing resource/diagnostic/attribution
evidence and default evaluation files before and after; any drift is a failure,
with the first new registration/inspection artifacts retained. Never repair or
overwrite an earlier attempt automatically.

Read-only preparation command:

```sh
python3 docs/spatial-redesign/evidence/rate-attribution-layout-register.py
```

After the parent confirms final V5 acceptance, a green required check and distinct
registration-only GO, use the helper's printed manifest and the SHA256 of the
exact green completion record:

```sh
python3 docs/spatial-redesign/evidence/rate-attribution-layout-register.py \
  --bind --parent-registration-go --approve-narrow-metadata \
  --confirm-source-manifest <prepared-manifest-sha256> \
  --required-completion .local/spatial-apply/required-current-N.json \
  --required-completion-sha256 <exact-green-record-sha256>
```

The write branch runs only the existing `--inspect` CLI after registering and
retains its first output. It never invokes bootstrap, timed load, browser, suite,
service launch, source edits or commits. Stop on any gate, drift, output collision
or inspection failure. Later execution, if separately authorized, is exactly:

```sh
mise exec -- node tools/board-resource.mjs --protocol-file docs/spatial-redesign/evidence/rate-attribution-final-layout.protocol.json --bootstrap-calibration
```

The helper and its pure regression checks receive independent read-only review
before registration readiness. No new application or resource result is asserted
by this preparation.
