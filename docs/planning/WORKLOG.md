# Shared-house planning worklog

6 October 2026. Research/planning goal completed locally. This file is the compact
handoff; root PLAN.md is the only master plan.

## Objective and decisions

Original owner requirements are preserved in docs/product/OWNER-BRIEF-2026-10-06.md.
Core:2-6 permanent members,unique house code,owned DIY bedrooms/doors/lounge,
controllable avatars,actual dialogue,truthful presence,shared study and useful board.
Recommended existing stack+Socket.IO event channel; bounded DOM/SVG board;
rear doors2/3,split doors4-6; project-lifetime active-house receipt metadata;
access-generation revocation barriers; single finite work/break clock.
All detailed defaults remain proposed production choices.

## Local milestones

-47ba76b: owner brief,predeclared comparison protocol,old plan archival,current
 harness routing and earlier feasibility research.
-7e30d0b: isolated network/layout prototypes and meaningful regression fixes.
-Final planning commit: this worklog,source/contract/experience/architecture,
 actual comparison results,screenshots and verified review refinements.

No push/deploy/paid service/global memory update. Frozen crit-8 remains6dc79c5.
src/public/spec/root package and lock/CI/Fly configuration are unchanged from
the release. Docker context additionally excludes prototypes/evaluation.

## Verification and failures

Root typecheck/spec32PASS using isolated baseline4093 after an initial default8080
setup failure. check:evidence PASS.
Network final parent run:17checks and both transport processes exit0;
1200moves/7200observations per candidate. Final raw JSON and previous cleanup-failed
raw JSON retained; original instrumentation/rate-limit trial rejected with reasons.
Final network coverage98.27%lines/83.84%branches; CLI branch40%explicit gap.
Layout parent model/HTTP16PASS; scoped100%lines/87.50%branches; no app.js coverage.
Actual native browser verified all2-6 counts,matched eight2/6capacity viewport
samples,no horizontal overflow and listed local interactions. Same-direction typing
did not change displayed position. Initial header occlusion fixed symmetrically.
Final reload after PCFShadowMap correction: no new warn/error entries.

Two root reviewers forked with no conversation history: product7issues and
technical5issues. Parent verified/revised,followups report all originalissues
resolved in plan. Prototype independent review/refinement caught snapshot race,
measurement-window contamination,response-after-end cleanup,geometry and input
takeover errors. See COMPARISON-AND-REVIEW.md for evidence boundaries.

## Remaining implementation and judgement

All production house features remain future. Local simulated layout and synthetic
transport fixture are separate; P1 must integrate two real browsers.
NOT RUN: real Fly256MB30minute L1/L2 loads,real-phone IME/GPU,
uncoached friends/next-day use,production migration/restore and new privacy logic.

Next: P1 create/join+basic identity recovery+single world moving/text loop with
meaningful failing domain/integration tests. Use one shared authority; preserve
current state until a tested migration and authorised release. Optional image,
catalogue and cosmetics follow their gates rather than precede core interaction.
