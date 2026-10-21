# P3 independent review and reconciliation

A fresh-history GPT-6 Astra/high reviewer received factual goals, spatial contract,
exact file scope and verification rubric. It skipped prior handoffs/verdicts.
The reviewer inspected source and ran 112 focused checks. One P2 defect was found:
self fallback used permanent-slot arrival, while peers and observer meshes still
used common spawn, stacking optional-pose avatars. The parent worker reproduced
this with a failing observer/peer absent/null-pose test, then introduced one
arrivalFor resolver for initialization, animation and self fallback. Authoritative
coordinates retain precedence; existing bedroom fallback remains x0,z3.

The same reviewer performed a contextual fix recheck: four focused tests passed
including observer/peer poses, current-layout arrival, actual rendered chair
bounds and six sofa raycasts. Finding resolved, no immediate regression found.
This recheck is contextual, not another independent review. Final source/check
identity is in lounge-source-manifest.json; later tests add conservative mesh-bound
checks rather than repeating the geometry formula.

An initial exact mesh-bound assertion was too strict: legacy chair obstacles
conservatively include up to 0.035m extra rectangle. It was corrected to require
all actual mesh bounds inside the authoritative rectangle with bounded padding,
not to change chair collision geometry. A coverage run exceeded the former 5s
170-route test timeout; the unchanged route assertions now receive 30s, matching
the already bounded 120s all-arrivals comparison. Failed artifacts are preserved.

Native desktop rest-seat-3 stalled in both candidates because the isolated fixture
mutated its accepted snapshot before cloning, hiding its sit-to-stand transition.
Diagnostics recorded local pose at prior cushion centre while synthetic authority
was standing elsewhere; direct approach was then invalid. The fixture now clones
before all mutations. No production geometry or route change was made for this
instrument failure. The immutable harness re-evaluation passes all six cases.
Initial results, diagnostic results and diagnostic runner are preserved separately.

Native fixture acceptance covers rendering/picking/framing. Real Socket.IO
occupancy, room revocation, shell panels, durability and P4 game authority remain
separate parent integration gates. Human preference and physical-phone results
are NOT RUN. No deployment, push or commit was performed by this worker.
