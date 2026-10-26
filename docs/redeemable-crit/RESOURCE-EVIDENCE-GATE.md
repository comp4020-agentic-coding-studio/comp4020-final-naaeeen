# Fast retained resource evidence gate

26 October 2026. `node tools/check-resource-evidence.mjs` checks the retained
qualified source without starting a server, browser or load generator. It validates
both original profiles: `evaluation/board-resource.{protocol,results}.json` (23
named gates) and `docs/spatial-redesign/evidence/resource-mixed.{protocol,results}.json`
(30 named gates). Every expected gate must exist and be exactly true; extra gates,
empty/malformed objects, missing files and non-PASS results fail closed.

Both schema-1 results must meet their registered duration (at least 300 seconds),
finite positive server RSS peak at most 210 MiB, empty error object, registered
Node version, server-only semi12 argument, inbound limit and queue bounds. Exact
protocol bytes, instrument hash, canonical manifest digest and every per-file hash
must agree across the protocol, result and current repository bytes. Source lists
must match the complete registered manifest, with at least 53 files. Canonical
relative source paths and resolved real paths must stay inside this repository;
symlink escapes fail. All registered application and resource instrument files
remain checked when CI wrapper/workflow files change outside that manifest.

This is retained synthetic source qualification. It is not a new runtime, browser,
Fly/cgroup, physical-device or classroom performance result. The frozen historical
protocols and results are read only, including their original limitations.

For an explicitly requested new extended run, generate its result with the existing
instrument and then check that pair directly:

```sh
node tools/check-resource-evidence.mjs --protocol path/to/new.protocol.json --result path/to/new.results.json
```

The explicit pair mode checks the same criteria against current source without
requiring an older retained result to pass first. It does not generate evidence,
relax acceptance or rewrite history. A default check still requires both retained
profiles; changing runtime source therefore requires new qualification and an
explicit evidence update, not a documentation-only CI exemption.

## Verification

The pure negative-control suite is `spec/resource-evidence-binding.test.ts`; normal
`pnpm check` discovers it. An isolated local Vitest configuration omitted service
globalSetup because these checks need no running application. The first behavioral
RED used a deliberately permissive temporary implementation: 24 of 25 tests failed,
showing that vacuous acceptance and corrupted evidence were detected by the tests.
After implementation, all 25 passed in 301 ms. Additional missing-file, foreign-path
and malformed-object controls were added; final verification passed all 27 tests
(in 316 ms). The explicit-pair CLI also passed the actual baseline. TypeScript
`tsc --noEmit` passed. No coverage percentage is claimed for this scoped gate.

The actual read-only no-argument CLI passed both retained profiles:

| Profile | Named gates | Bound source files | Retained duration | Retained RSS peak |
| --- | ---: | ---: | ---: | ---: |
| Baseline | 23 | 53 | 300.001 s | 196.76171875 MiB |
| Mixed | 30 | 53 | 300 s | 198.3828125 MiB |

Shared current source manifest SHA-256:
`887b139aaeb7311c4416743affbf6f15c8d70e4790d872ba74b50a38a6cc4338`.
Instrument SHA-256:
`561336ed460655b4bd32068c3af3f060b93d4b58a29f83c23968dc4929323cde`.
The parent owns independent review and final CI/hosting verification.


Fresh independent review found a future Windows containment gap: a POSIX-only
parent-prefix check did not reject a resolved `..\outside` path. The helper now
checks the first path component using both separators. Its regression failed on
that exact value before the fix; all 28 tests then passed in 289 ms. TypeScript,
both actual retained profiles, and a real Linux symlink escaping to `/etc/hosts`
were checked again; the symlink was rejected and the temporary fixture removed.
No Windows runtime execution is claimed.


Default mixed checks follow the canonical accepted `resource-mixed` aliases,
currently byte-identical to the preserved handoff records. Future qualification
can promote reviewed current aliases while immutable historical files stay intact.
