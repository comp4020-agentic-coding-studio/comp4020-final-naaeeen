# HTTP spatial ingress checkpoint

23 October 2026. Worker scope: spec/house-spatial-http.test.ts and these http-apply evidence files. Parent owns runtime integration, fresh review, final acceptance and commits. Commands run from Windows through WSL Ubuntu/lizhi in the canonical checkout, using mise Node 24.21.0 and pnpm 11.9.0. Every service uses a generated temporary directory and ephemeral port; test cleanup closes sockets/listeners/databases and deletes only its own fixture. No persistent preview or load test was launched.

## Requirements and evidence

| Requirement | Observable check |
| --- | --- |
| Trusted identity and request boundary | Cookie absent, mismatched X-House-Identity and foreign Origin denied across studio writes, gathering writes and studio export. A valid JSON body padded to exactly 16384 bytes succeeds; 16385 bytes is rejected without another revision. |
| Studio write authority | Exact-bedroom owner control succeeds. Observer token, stale secret, lounge context and nonowner guest cannot mutate saved studio state. |
| Door and byte privacy | Guest metadata/PNG preview succeeds while open; closing the door separately denies metadata and PNG retrieval. Owner bytes remain available; unauthenticated image access fails. |
| Original ownership after departure | Three archived room rows export in sorted pages of two and one; integrated identity export contains the same first page; selected canonical PNG bytes remain exportable to their original author; another identity cannot export that room. |
| Physical study/rest roles and explicit consent | Real Socket.IO movement/seat claims are used. Standing and rest seats cannot join a study huddle; a study seat still requires explicit Join before Share; Leave succeeds after standing. |
| Intentional sofa publication | A real seated guest cannot publish another owner's room image. Original-owner Share produces a credited public PNG copy, still readable by the house guest after the source door closes; Clear revokes the public image URL. |
| Late arrival authority | Real HTTP requests are paused one byte before body completion, after their handler starts. Session recovery and token takeover before completion deny both studio and gathering writes. |
| Connection/seat ABA | A never-accepted Join paused before Stand/re-sit or same-token reconnect cannot enroll into the later physical context. Missing/invalid epoch headers fail. An already accepted Join replay remains inert and returns the original receipt plus current membership. |
| Static assets | New public spatial modules/styles load; an allowlisted module absent from an intentionally empty public directory returns 404. |

## Actual iteration

- `http-apply-integration-first.txt`: integration-first check after the parent's initial route adapter existed, not a fabricated preimplementation RED. Eleven tests: five passed, six failed. Failures exposed test assumptions: PNG normalization re-encodes compression; takeover is HTTP 409; the configured fixture data directory must exist; movement needs the actual seated/standing snapshot before choosing its next route.
- `http-apply-refinement.txt`: ten passed, one remaining movement-fixture failure. Waiting for the authoritative seated snapshot resolved the stale-start-position race.
- `http-apply-green.txt`: original eleven tests passed. This result predates the additional epoch-header contract and is not current final acceptance.
- `http-apply-typecheck.txt`: preserved TypeScript 6 CLI invocation failure TS5112. Explicit input files require `--ignoreConfig`.
- `http-apply-typecheck-refinement.txt`: corrected scoped strict TypeScript command passed; the inferred replacement-header union was explicitly typed.
- `http-apply-aba-red.txt`: eleven passed and both newly added delayed never-accepted Join tests failed meaningfully: the old handler returned 200 after Stand/re-sit and after same-token reconnect, where 409 was required. This is a real runtime RED for the generation/token-only alternative. The parent's epoch adapter and counterpart guards are the selected refinement; acceptance waits for the complete counterpart.

The technical comparison uses the same held-body task and observable consent outcome. It is an integration regression comparison, not an isolated agent A/B experiment or human evaluation. No browser/phone, deployment, full-suite, resource or human-value acceptance is claimed here. Independent review remains the parent's gate.

## Epoch refinement completed

After the parent and counterpart workers added required positive access/seat headers, Player.seatGeneration, the room access precondition and the gathering request epoch guard, `http-apply-epoch-first.txt` passed all 16 tests. Both previously failing never-accepted Join bodies now return 409 after their physical context changes. An accepted Join replay with its original captured headers returns 200 and its original receipt while current selfJoined remains false. Missing/invalid epochs are denied. A supplied mismatched identity precondition on GET studio is also denied with IDENTITY_CHANGED.

`http-apply-epoch-typecheck.txt` passed the scoped strict TypeScript command below. The scoped final whitespace check passed. `http-apply-epoch-source-sha256.txt` records the spec and relevant adapter/module/contract source hashes at this checkpoint; later parent edits require affected rechecks. No additional runtime defect was observed in this focused final pass. The newer preview-world module, browser/phone acceptance, full suite, resource lane, fresh independent review and final commits remain parent-owned gates.

```sh
mise exec -- pnpm exec vitest run --config vitest.house.config.ts spec/house-spatial-http.test.ts
mise exec -- pnpm exec tsc --ignoreConfig --noEmit --target ES2023 --module ESNext --moduleResolution bundler --allowImportingTsExtensions --lib ES2023,DOM,DOM.Iterable --types node --strict --allowJs --skipLibCheck --verbatimModuleSyntax spec/house-spatial-http.test.ts
```
