# Motion-handoff qualification preparation

PREPARATION ONLY while the separate client round2 lane completes. Do not register,
inspect, test, build, start a service or execute resource load. No client source or
metadata-spec alias is owned here. Await final client acceptance, committed source,
green required #12/current runtime maps, and explicit parent registration GO.

Adapt the reviewed reuse binder with fresh `resource-handoff-baseline` and
`resource-handoff-mixed` entrypoints. Preserve the actual reuse49fe first baseline
PASS and mixed normal-input FAIL and every historical artifact unchanged. The two
historical rejected ACK causes remain UNKNOWN.

Against the prior 53-file manifest
`49fe9a2ffe0dd025414ca9ad502000151c6ecd469556598b79d4ae2def8cff84`,
the fixed changes are:

- tools/board-resource.mjs:
  `561336ed460655b4bd32068c3af3f060b93d4b58a29f83c23968dc4929323cde`
- tools/spatial-resource.mjs:
  `23751e362bab901c8a28870f2fd982d8c067a77b6505afbcda1828e632d1527d`

The only pending source is `public/house-client.js`. Its current work-in-progress
hash is not approved or frozen by this preparation. All other 50 hashes, the
complete allowlist, workload and runtime flags remain fixed.

The default helper operation validates the known 52 sources, pinned histories,
the three reused result preimages and exclusive fresh paths, then reports HELD.
After final client freeze, pass its explicit SHA256 to read-only full preflight.
The helper derives the complete source manifest from the pinned prior map plus
these three approved replacements and rejects any other difference. Binding also
requires explicit confirmation of that printed manifest, all 53 files matching
GitHEAD, and exact green required-current-12.json proof with48 covered source
hashes and the five independently pinned omissions. #11 is not accepted.

Keep all14 baseline/11 mixed groups and every non-registration field equal. Change
only the existing nine registration metadata keys. No relaxed limits, changed
quality/roles/standing denominator/schedule/gates, trace opt-in or bootstrap.
Default/documentation/fresh baseline and canonical/fresh mixed copies must match.

Create only three new exclusive canonical protocol preimages. Reuse exactly the
same hash-proven read-only result files under `resource-final-prebinding-*` after
their hashes match current canonical old results; record paths/hashes, never copy
or rewrite large results again. Fresh handoff outputs remain unused/exclusive.

```sh
# Preparation only, no final client hash accepted:
python3 docs/spatial-redesign/evidence/resource-handoff-bind.py
# After parent announces the final client SHA, still read-only:
python3 docs/spatial-redesign/evidence/resource-handoff-bind.py --client-sha256 <approved-client-sha>
# Only after separate binding GO:
python3 docs/spatial-redesign/evidence/resource-handoff-bind.py \
  --bind --parent-binding-go --client-sha256 <approved-client-sha> \
  --confirm-source-manifest <verified-full-manifest> \
  --required-completion .local/spatial-apply/required-current-12.json \
  --required-completion-sha256 <exact-green-12-record-sha>
```

Authorized binding would inspect each profile once and retain first outputs. It
does not authorize a resource run; parent owns later execution/idle coordination.
Stop on drift, collision or failure without an automatic rerun or replacement.
