# Crit 9 source and code evidence

Checked 12 October 2026 in Ubuntu WSL. Baseline dea0b7a2.
Line references identify that baseline; consult the pinned commit if code moves.

## Course evidence

| Primary source | Reading | Consequence and limit |
| --- | --- | --- |
| [Crit 9: All at once](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/crits/09-all-at-once/) | One multiuser behavior, alternatives/costs and rationale from README. Realtime deployed interaction and this week's process/reflection remain required. | Select behavior authority rather than transport alone; packet is preparation, not submission readiness. |
| [Final Project](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/assessments/final-project/) | README argument, CLAUDE rules, spec checks and artifact should agree. Some value needs judgement. PROCESS is rewritten as the project changes. | Inspect the complete chain; separate enforceable authorship from untested learning value. Student drafts submission writing. |
| [Assessment rubric](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/topics/assessment/#marking-rubric) | Process rewards corroborated decisions, rejected alternatives and harness corrections; response rewards one scoped idea. | Evidence supports an argument, not an automated HD prediction. |

## Research weighed against the recommendation

### Dourish and Bellotti, CSCW 1992

[Awareness and Coordination in Shared Workspaces](https://www.dourish.com/publications/1992/cscw92-awareness.pdf),
DOI 10.1145/143457.143468. Relevant full sections: 4.2–5.1.
Four groups of three designers used a shared text editor with audio/video.
Groups negotiated authorship and sometimes used individually authored public
windows plus a common window. Crucially, the authors favor flexible coordination
and warn against rigid predefined roles. This warrants examining contributions
versus a group offering, but supplies a countercase to hard ACLs. Our narrow
card boundary is contextual judgement, not their experimental conclusion.
Designers/text editing are not students/learning.

### Gutwin and Greenberg: workspace awareness

Parent read the author-hosted
[1999 manuscript](https://www.cs.usask.ca/faculty/gutwin/1999/WA-theory/Theory-submitted-TR.html),
especially sections 4–6; a separate researcher read the later
[2002 JCSCW article](https://grouplab.cpsc.ucalgary.ca/grouplab/uploads/Publications/Publications/2002-DescriptiveFramework.JCSCW.pdf),
DOI 10.1023/A:1021271517844. Parent access to that PDF failed; the versions
are not silently equated. The framework distinguishes identity, action, location
and authorship, with awareness serving a primary task. It informs separating
“who is here” from “whose statement this is”. It is descriptive, not proof of
our permission policy, consent model or interface quality.

### Stewen and Kleppmann, PaPoC 2024

[Undo and Redo Support for Replicated Registers](https://arxiv.org/html/2404.11308v1),
DOI 10.1145/3642976.3653029. Relevant sections 1–2 and discussion.
The paper distinguishes global/local undo and shows that restoring an earlier
state can remove intervening peer changes. Its register design is not implemented
here. It helps reject the inference that convergence or “local undo” necessarily
preserves everyone's intention. Actual canvas reconciliation is whole-element
version/nonce based, not their operation-history CRDT; no universal peer-safe
undo claim is made.

The primary-source researcher also explored Dabbish and Kraut's 2004
awareness-display experiment for candidate B. Parent PDF access was inconsistent,
so it is not decisive evidence for C and no productivity effect is imported.

## Meaning -> rule -> check -> behavior

| Meaning / invariant | Source at baseline | Check and scope | Limit / refinement |
| --- | --- | --- | --- |
| Learner controls their own stated goal and closure. | README 38–39; CLAUDE current shared-house corrections; src/house-store.ts 370–393. | spec/house-store.test.ts cross-author save/close, wrong-house and revision checks. | Lounge cards are readable by housemates; authority is not confidentiality. |
| Save a next step without declaring completion. | house-store.ts 382; public/house-ui.js 403–418. | Store test for author-owned active next step and persistence. | Closure records author choice, not understanding. |
| Peer may alter shared explanation. | src/board-store.ts 196–238; src/board-contract.ts 303–310. | Higher-version peer change and distinct-object checks; new comparison in both delivery orders. | Whole-element winner may lose an intention; no semantic merge. |
| Outdated own-card updates are rejected. | house-store.ts 380/389, requireRevision. | Revision tests; registered same-author AB/BA drafts. | Author authority does not eliminate multi-tab conflicts. |
| Denial preserves content and receipts. | Store transaction boundaries. | Comparison snapshots full logical tables before/after denied actions. | Store-level evidence, not all session/transport boundaries. |
| Missing ACK is not saved. | board/client.js 172–202; board-store.ts 178–194; board-service.ts 454–470. | Existing receipt/draft tests. | Supporting reliability, not a second main argument; session storage is not cross-device durability. |
| Labels avoid false resolution. | public/house-ui.js 225–245. | Active/closed/ownerLeft lifecycle checks. | Human interpretation NOT RUN. |
| Read and write authority differ. | house-store.ts snapshot 242–249, command 378/388. | Authorized lounge reads and denied peer mutations. | Study cards are not private notes. |

## Historical implementation evidence

Actual commits resolved with git show:

- [52ce8ee](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/commit/52ce8ee8e812d3a0744c6027cb22fcf925654880): 6 October, purpose narrowed toward voluntary peer help and an authored next step.
- [a7f596a](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/commit/a7f596adeccd359141b2924479e324e903f2c971): 6 October, durable house ownership/revisions/receipts.
- [ea60440](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/commit/ea604400634acfbcd5be87de5e7c01e901b5596d): 7 October, playable house/shared-study UI.
- [321e27c](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/commit/321e27cc8f609714f771a03cab53c9a534937b2f): 7 October, shared-board store.
- [f5a25f2](https://github.com/comp4020-agentic-coding-studio/comp4020-final-naaeeen/commit/f5a25f2bbfc00af43791dd8c88905dd45320c0c4): 7 October, standalone canvas/chat/recovery.

These locate implementation, not a clean before/after human experiment. Today's
research is reconsideration/additional verification, not the basis for earlier commits.

## Checks actually executed this task

Native mise Node24.21.0/pnpm11.9.0 and current baseline source:

- pnpm exec vitest run --config vitest.house.config.ts spec/house-store.test.ts:
  22 passed, exit 0.
- pnpm exec vitest run --config vitest.board.config.ts spec/board-store.test.ts
  spec/board-client.test.ts: 57 passed, exit 0.
- Frozen policy comparison: 43 records, zero expectation mismatches, exit 0,
  native SQLite3.53.4.
- Browser/document checks: see [verification](VERIFICATION.md).

Counts show execution scope only. No new coverage percentage, full-suite pass,
current deployment, human usability or learning effect is inferred.

## Confirmed wording gap for student revision

Baseline README 35–36 broadly promises recoverable text conflicts. Actual
client.js 185–193 records a draft when a submitted receipt reports a losing
element. An accepted edit overwritten later need not appear in that list.

Factual correction applied after final independent review:

“When a submitted edit loses in its reply, its local draft can be recovered.
This is whole-element reconciliation, not character-level co-editing; a later
peer overwrite does not guarantee recovery of the earlier accepted edit.”

Only the inaccurate recoverability statement was corrected in README; no student
reflection or full README argument was drafted. The original baseline overclaim
and its replacement are visible in the commit diff. Student source integration
and the wider C9 submission remain separate.

## Attribution

Owner direction supplied the warm game-like house, rooms, real movement/
conversation, shared study and full standalone board. Card authority is traced in
planning/code without an unrecorded inventor. The retrospective ADR records timing.
Discuss human-directed or agent-proposed choices by explaining the student's
actual judgement, not claiming unaided authorship.
