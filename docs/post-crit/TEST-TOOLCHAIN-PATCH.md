# Scoped test-toolchain patch

22 October 2026. The post-integration audit reported eight advisories: six in
Vite 8.3.0 and two in @vitest/mocker 5.0.1. The initial result is preserved as a
[bounded advisory index](evidence/p7-toolchain-patch/audit-before-index.json);
full downloaded advisory bodies remain in the private audit record.

A fresh Astra review traced these packages through the actual manifest, Docker
stages, test configuration and board build. The production Node dependency stage
and esbuild browser entry do not use Vite/Vitest. Current tests do not enable a
public mocker plugin or browser/API server. This limits the observed exposure; it
does not turn a dependency audit into a whole-application security certification.
The [launch-editor advisory](https://github.com/advisories/GHSA-587h-7wmj-h5pm),
[manual-mock advisory](https://github.com/advisories/GHSA-qxg6-89mg-rqv8) and
[Windows traversal advisory](https://github.com/advisories/GHSA-xp26-3454-mjgp)
identify the affected prerequisites and fixed releases.

We selected exact Vitest/coverage 5.0.3 pins and Vite 8.3.3, the verified fixes in
the existing major versions. The newer Vitest 5.0.5 adds changes unnecessary for
this bounded repair. See the [Vitest release](https://github.com/vitest-dev/vitest/releases/tag/v5.0.3)
and [Vite release](https://github.com/vitejs/vite/releases/tag/v8.3.3).
Node 24.21 and esbuild 0.28.2 satisfy their declared compatibility requirements.

The first proposed indirect Vite refresh exited successfully but left Vite 8.3.0
resolved. Inspecting the installed manifest showed Vite is a required Vitest peer.
We therefore declared that already-used test peer explicitly as a development
dependency, with no Vite application server, new script or override. The manifest
and lock were checked again: all three pins are exact, the actual peer is 8.3.3,
and the old Vite version is absent from the lock. The intermediate refresh also
updated compatible test-only Rolldown/PostCSS/Oxc/nanoid descendants; the real
production and browser-build closures stayed unchanged.

Both full and production-only audits now report zero known advisories. The full
1,071-test suite, typecheck, focused V8 coverage, board build and evidence checks
pass. All 475 public files are byte-identical after rebuilding, and the actual
production dependency listing is identical. The independent lock comparison also
found the 26 production and 282 browser-build closure snapshots unchanged before
the final peer patch; the final build/runtime equivalence supplies the current
boundary. [Exact checks](evidence/p7-toolchain-patch/verification-after.json).

The earlier 13 native browser passes retain their original manifest. This repair
does not relabel them as a run on the new dependency manifest; unchanged application
bytes and runtime graph support that explicit equivalence. Sustained resource
acceptance still receives a fresh binding after this patch. No package, service or
permission setting was changed outside this repository.
