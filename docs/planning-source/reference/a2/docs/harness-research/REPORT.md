# A2 CLAUDE.md Research, Comparison and Improvement Record

> Historical record of the 27 September study, translated into English on 28 September. Installation and verification statements describe that checkpoint. Later work is recorded in [PLAN.md](../../PLAN.md) and [implementation research](../IMPLEMENTATION-RESEARCH.md).

Research date: 2026-09-27. Status: research, independent review, 18 runs arranged in pairs across two rounds, and the final file update are complete. The results are exploratory evidence for this project, not proof of universal optimality or statistical superiority.

## Decision Goal and Scope

The goal is to improve the agent's actual behavior in this Ubuntu / Astro course website project: complete authorized tasks, respect the fixed platform, verify effectively, record evidence honestly, and reduce excessive research, repeated checks, irrelevant defensive wording and speculative code. Quality cannot be judged solely by a shorter file, more rules or a more popular community project.

Changes are limited to project instructions and the research/evaluation records for this work. Course content, the student's PROCESS.md, personal credentials, global model settings, the sandbox, approval mechanisms, plugins and remote state are outside the scope of these changes.

Locally verified: the source version was `148cd779e18c365957c343f7e54f4e3671951896`; Codex CLI was 0.157.1, using the same Codex model configuration throughout, ultra effort, and workspace-write/on-request; Claude Code in Ubuntu was 2.1.283. These are facts about the environment used for this work, not recommended settings for every project.

## How the Evidence Is Used

The course's original requirements and the actual repository determine the project requirements. Official product documentation establishes loading, command and configuration behavior; original experiments inform conclusions within the scope of what they measured; vendor engineering articles and authors' practices suggest testable hypotheses. Research papers cannot override explicit course requirements either.

See [sources.md](sources.md) for the full sources and versions. Inaccessible social posts were not treated as verified original sources, and reading official presentation slides was not described as watching the full recording.

## Original Research and the Conclusions It Supports

| Study | Method and main results | What cannot be concluded from it |
| --- | --- | --- |
| [Evaluating AGENTS.md v2](https://arxiv.org/html/2602.11988v2), 2026-06-23 | SWE-bench Lite: 300 tasks / 11 Python repositories; CTXbench: 138 tasks / 12 repositories; four agent/model combinations. Compared with no file, success-rate differences for LLM-generated files were not significant (p=.87/.37), nor was the difference between developer-written files and no file (p=.21). Average costs with LLM-generated files increased by approximately 20%/23%. | The earlier version's headline claim of a "significant reduction in success rate" cannot be carried forward; a non-significant result does not establish strict equivalence. Length/category ablations did not establish a fixed optimal length either. All tasks were in Python, so they do not directly represent our Astro content-authoring work. |
| [Efficiency of AI Coding Agents v2](https://arxiv.org/html/2601.20404v2), 2026-03-30 | 124 PRs across 10 repositories, using only GPT-5.2-Codex, comparing runs with and without a root instruction file. Median time fell by 28.64% and output tokens by 16.58%, but median total tokens increased by 1.29%. | Only 50 tasks received a manual sanity check; there was no comprehensive functional-correctness evaluation. This does not support a claim of "fewer total tokens at the same quality." |
| [Agentless v2](https://arxiv.org/html/2407.01489v2), 2024-10-29 | GPT-4o and 300 SWE-bench Lite tasks. Candidate selection produced 77 successes with majority voting, 81 after adding regression tests, and 96 after also adding reproduction tests. | Of 213 reproduction tests that failed on the old code, only 94 were confirmed as fixed by the reference patch. A failing test alone does not prove the test is correct. Candidate counts used with an older model should not be copied directly. |
| [Lost in the Middle v3](https://arxiv.org/html/2307.03172v3), 2023-11-20 | Multi-document question-answering and key-value retrieval experiments on older models showed that information position can affect retrieval performance, with differences across tasks and models. | This was not an experiment on instruction length or compaction settings in current Codex/Claude. It does not support rules such as "clear the context at 50%" or "repeat rules at both the beginning and end." |

The conservative conclusion supported by these studies is to retain the constraints this project actually needs and test their effects. There is not enough evidence to establish a best CLAUDE.md across models and tasks.

## How Official Guidance Becomes Project Rules

- **Use context as needed.** [Claude Code best practices](https://code.claude.com/docs/en/best-practices) and the [OpenAI prompting article recorded in the original source register](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-Naaeeen/blob/2b885c8c9529b744c0c5b4dace351fa5299e72a6/docs/harness-research/sources.md) both support scaling planning and reading to the task. We retain constraints and entry points, with README holding platform facts and PLAN holding current state; small changes do not require rereading every document.
- **Make completion boundaries clear.** The [current GPT-6 guide](https://developers.openai.com/api/docs/guides/latest-model) supports completing authorized work and then reporting actual verification and remaining limitations. Permission to publish externally still depends on the user's authorization.
- **Verification should establish cause and effect.** This repository's `check → test → build` chain already includes a build, so running build again would duplicate it. A fix should reproduce the problem and confirm that its checks accept legitimate solutions as well as reject violations; actual UI changes still require browser evidence.
- **Set a stopping condition for iteration.** [Anthropic's long-running harness case study](https://www.anthropic.com/engineering/harness-design-long-running-apps) notes that changes in model capabilities change what a harness needs, and more iterations are not always better. Use independent review and address evidence-backed findings rather than adding complexity to reach an arbitrary iteration count.
- **Instruction files do not enforce themselves.** [Claude memory](https://code.claude.com/docs/en/memory) and [Codex discovery](https://learn.chatgpt.com/docs/agent-configuration/agents-md) have different loading mechanisms. Retain the same AGENTS bridge and check what is actually read; written rules do not replace runtime permissions or tests.

## Evaluate "Defensive Writing" Separately

1. **Expression:** State conclusions clearly, use concrete language, and avoid unnecessary disclaimers, stock phrases, exaggerated marketing and repeated explanations. Real limitations must still be stated.
2. **Knowledge claims:** Distinguish official requirements, repository facts, design proposals and unverified judgments. Do not invent sources to appear decisive or describe a successful build as successful browser verification.
3. **Code:** Use existing schemas, validate real external boundaries, and retain errors that support diagnosis; avoid adding silent fallbacks, broad catches or new abstractions for nonexistent scenarios. This is engineering guidance to be tested locally, not a ban on error handling.

[Claude prompting guidance](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) explicitly addresses over-triggering, excessive thoroughness and defensive code for certain Claude versions, but it cannot be treated as a completed causal experiment on GPT-6.

Writing quality is assessed through independent scoring of anonymized outputs for factual preservation, natural clarity and necessary qualifications; it is not scored by counting prohibited words or simply measuring length.

## Choices Among Common Methods

| Method | How it is used |
| --- | --- |
| Explore → Plan → Implement → Verify | Plan first when there is uncertainty or an effect across files; complete small, clear tasks directly. |
| Independent reviewer / parallel research | Use for research and review with clear boundaries. Course objectives, assessment and the twelve-week narrative depend on each other, so the default is not to split the work among twelve independent authors. See the [official presentation materials](https://resources.anthropic.com/hubfs/Claude%20Code%20Advanced%20Patterns_%20Subagents,%20MCP,%20and%20Scaling%20to%20Real%20Codebases.pdf). |
| Command → Agent → Skill | Draw on the division of responsibilities in the [author's original example](https://github.com/shanraisshan/claude-code-best-practice/blob/b70072cc2fed48b710ddb555b66c3d0ad7c40641/orchestration-workflow/orchestration-workflow.md); do not add three wrapper layers around existing course scripts. |
| Ralph continuous loop | Do not use as the default workflow. The [official version](https://github.com/anthropics/claude-plugins-official/tree/fa59bc9037741ecfa131aa27938272605710d7b2/plugins/ralph-loop) resends the prompt through a Stop hook; matching a promise is not independent acceptance. An endless loop cannot resolve A2's unfinished content or produce the student's own process account. |

Ralph's default script has no positive iteration limit, but the client has a separate mechanism to prevent Stop from blocking without progress, so it would also be inaccurate to say it "must run forever." No loop was installed or enabled.

## Audit of the Practice Repository Specified by the User

The audit was pinned to [b70072cc2fed48b710ddb555b66c3d0ad7c40641](https://github.com/shanraisshan/claude-code-best-practice/tree/b70072cc2fed48b710ddb555b66c3d0ad7c40641), rather than mixing versions from search caches.

It is a useful index of practices and examples. Its own rules include committing each file separately and manually compacting at approximately 50%; its configuration includes broad tool allowlists, automatic enablement of project MCP servers and sound hooks. These features are not evidence that their effectiveness has been established by controlled experiments, and copying the whole package into A2 would not be appropriate. Retain coherent commits, task-relevant tools and the existing authorization boundaries.

## Settings Decisions

| Setting | Decision and reason for this work |
| --- | --- |
| Model and reasoning effort | Keep the existing Codex model configuration and ultra effort as fixed A/B conditions. Effort levels were not compared, and no claim is made that ultra is optimal. |
| sandbox / approvals | Keep the existing settings; no bypass, ignore-rules or new automatic authorization. |
| context / compaction | Do not change the window or percentage. Use PLAN handoffs at phase boundaries; there is no evidence for a universally optimal restart threshold. |
| plugins / MCP / hooks | Do not add or automatically import any. Existing scripts and tools are sufficient for the current work. |
| CLAUDE / AGENTS | Retain the CLAUDE body required by the course and the short AGENTS entry point. Observe default loading separately rather than conflating it with the effect of the text. |
| Verification frequency | Trigger verification through actual changes, failures or unresolved questions; do not manufacture application unit tests for small documentation edits. |

## Controlled Experiment Protocol

Hold the model, effort, global rules, dependencies and initial source version fixed. Each run uses a new, independent fixture and an ephemeral session; only the CLAUDE content changes. Both groups first explicitly read AGENTS at the same location and their respective CLAUDE files, measuring the effect of guidance once loaded; this differs from measuring default-loading reliability.

There are six development cases: correct an overly strict deck check, give a read-only explanation of known failures, make a small metadata change, change a display label, prepare factual material for the student's own PROCESS, and write brief student-facing copy. Two held-out cases are reserved for confirmation of the final version; the author knew their broad types, so they cannot be described as fully unseen blind tests.

The original plan was 28 runs. After the user requested a faster process, the first round retained A/B runs for all six cases, totaling 12 runs; the final draft was retested only on D6 writing and the held-out H1/H2 cases, totaling another 6 runs. The overall total was 18 runs. This adjustment was recorded before the held-out task results were available, and the criteria were unchanged. Each trial had a 480-second limit, with at most two case pairs running in parallel; paired order alternated and was reversed in the second round. Shared hardware and service caches can affect timing, so these records are not a rigorous speed benchmark.

The scorer was first checked to accept correct outcomes and reject plausible incorrect outcomes, then frozen. The scorer and criteria were kept outside the tested agent's workspace, with hashes checked. Objective properties were judged from final files and actual tests; subjective results received a separate independent anonymized review. Infrastructure failures, timeouts and model-behavior failures were recorded separately rather than silently excluded. Raw traces were retained only locally, with reasoning text discarded.

## Static Review and Versions

- A: the existing file, 810 whitespace-separated words and 106 lines.
- v1: the first draft, 906 words and 58 lines. Fewer lines do not mean a shorter context.
- v2: three wording issues were fixed after independent review, producing 953 words and 58 lines as the first candidate used in runs. The fixes addressed protecting incorrect assertions, triggering writes for read-only tasks, and a ban on fabrication that inadvertently restricted design proposals.
- These numbers are descriptive measures, not quality scores. See [review-01.md](review-01.md) for details.

## Experimental Results and Final Selection

Installed v3: 844 words and 103 lines. Repeated wording was removed relative to v2's 953 words, but it remains slightly longer than the original 810 words. The added material concerns source judgment, writing and authorization boundaries; length alone cannot assess its quality. Independent content review found no blocking issues.

| Comparison | Scope | Automated acceptance |
| --- | --- | --- |
| Original A vs v2 B | D1–D6, six pairs | 12/12 passed |
| Original A vs final v3 B | D6, H1, H2, three pairs | 6/6 passed |

Final v3 was retested only on the latter three task types; it cannot be described as having undergone a complete repeat evaluation across all six. See the [results summary](results-summary.json), [first-round anonymized review](blind-review-r1.json) and [final anonymized review](blind-review-final.json).

The first independent anonymized review found a P2 issue missed by the automated scorer: a regular expression produced under the original-file condition treated href text within another HTML attribute as a real link. The parent agent reproduced this extraction error using the exact regular expression. The corresponding artifact under the candidate condition included this counterexample and handled it correctly. This single observation supports retaining independent review; it cannot establish that the candidate is better at all coding tasks, and all-green automated checks must not be equated with complete correctness.

The final six anonymized artifacts showed no substantive fabrication, overstated verification or source-hierarchy errors. Necessary, honest qualifications were not penalized as poor defensive writing. Some masked/omitted records could not be reconstructed independently, so the review retained uncertain items.

First-round timings were mixed and do not support a claim that "the new version is faster across the board." Input tokens, cached input tokens, output tokens and command counts measured by the client are stored in the summary; they are not combined into a single quality score or monetary cost.

Only 2 tasks started in the initial controlled batch; another 10 did not start. Codex automatically registered temporary repositories in its configuration, triggering an overly strict raw-hash check. Removing only those two registration blocks from an in-memory copy exactly restored the original hash. The model, effort, sandbox, approvals and all other configuration content were unchanged. Subsequent checks excluded only normal trusted registrations for this round's exact, predeclared paths, while also recording the raw hash. The actual personal configuration was not edited manually. See the [environment-control amendment](environment-control-amendment.md) for details.

Another early scoring error silently prohibited reasonable helper/tests additions and PLAN entries in D1; independent review corrected this and the scorer was recalibrated. The original records were retained, and the error was not presented as a defect in the original instruction file. See the [scope-control amendment](scope-control-amendment.md).

Some tested agents' pnpm commands triggered automatic dependency installation and encountered sandbox restrictions. The independent scorer verified the final artifacts using already installed, fixed-version Astro/Vitest entry points. This establishes the artifact-check results, not that the agents themselves successfully executed every command. Whether agents honestly reported the limitations was assessed separately through anonymized review.

The model runs used Codex CLI; this was not a cross-provider comparison with a Claude model. The Claude-related discussion draws on its official documentation, original engineering materials and the locally installed version. Both A/B conditions explicitly read the instructions, testing the behavior of loaded text; no additional claim was made that the current desktop chat or ordinary web ChatGPT automatically synchronizes Ubuntu files.

Finally, after rechecking the [course AI policy](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/topics/ai-use-and-integrity/), wording that excessively restricted PROCESS assistance was corrected: the course permits AI drafting with human responsibility and prohibits false process accounts. Our application is that, when requested, the agent may faithfully organize, draft or edit the user's supplied factual notes; it must not invent experiences, motivations or verification results, or fill the template autonomously. This reconciles the two course documents rather than inventing an additional prohibition.

v3 was selected because its constraints and triggers are clearer, it removes duplicate verification, retains real feedback and necessary qualifications, and passed independent review and focused regression checks. There is no evidence that it is the best file for all models and tasks.

## Application and Verification Scope

The actual root CLAUDE.md was byte-for-byte identical to the tested v3. The AGENTS entry point was unchanged; course source, specs, package configuration and PROCESS.md were not modified. Markdown diff and consistency checks passed. Existing failures for missing weeks and starter evidence remain course-content work to be completed.

Raw run traces are stored only locally and ignored by Git; committable documents retain sources, the protocol, evaluator, candidate history, reviews and sanitized summaries. Nothing was published or pushed, and no new tools were enabled.
