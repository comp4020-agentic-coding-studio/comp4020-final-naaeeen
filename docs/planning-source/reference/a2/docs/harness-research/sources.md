# Source register

Checked 2026-09-27. This is research evidence, not another instruction file.
Official documentation describes product behavior; vendor engineering articles are
experience reports; the practitioner repository is not a controlled benchmark.

## Primary documentation and engineering reports

- [Claude Code best practices](https://code.claude.com/docs/en/best-practices): task-scaled planning, concise project guidance, verifiable outcomes.
- [Claude memory and instruction files](https://code.claude.com/docs/en/memory): instruction loading, imports, conflicts and current AGENTS support; under-200-lines advice is not an experimentally optimal threshold.
- [Claude prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices): model-specific overthinking, emphatic prompts and unnecessary defensive code.
- [Claude subagents](https://code.claude.com/docs/en/sub-agents): independent scope versus shared-context work.
- [Effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents), 2025-09-29: selective context and appropriate abstraction.
- [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents), 2025-11-26: durable progress and observed verification failures.
- [Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps), 2026-03-24: model-dependent harness choices, evaluator calibration and iteration tradeoffs.
- [Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents), 2026-01-09: tasks, independent trials, outcome grading and reliability definitions.
- [Anthropic Advanced Patterns webinar slides](https://resources.anthropic.com/hubfs/Claude%20Code%20Advanced%20Patterns_%20Subagents,%20MCP,%20and%20Scaling%20to%20Real%20Codebases.pdf), 2026-03-24: original slide text reviewed; no claim of watching the recording.
- [OpenAI guidance on skills and prompts (original source record)](https://github.com/comp4020-agentic-coding-studio/comp4020-ass2-Naaeeen/blob/2b885c8c9529b744c0c5b4dace351fa5299e72a6/docs/harness-research/sources.md), Eric Provencher, 2026-09-11: narrower triggers, relevant context and task completion.
- [GPT-6 guide](https://developers.openai.com/api/docs/guides/latest-model): current model-specific prompting and verification guidance.
- [Codex AGENTS discovery](https://learn.chatgpt.com/docs/agent-configuration/agents-md): root-to-working-directory discovery and fallback rules.
- [Codex prompting](https://learn.chatgpt.com/docs/prompting), [skills](https://learn.chatgpt.com/docs/build-skills), [import](https://learn.chatgpt.com/docs/import), [hooks](https://learn.chatgpt.com/docs/hooks): current capabilities, requiring installed-version checks.
- [Run long-horizon tasks with Codex](https://developers.openai.com/blog/run-long-horizon-tasks-with-codex), 2026-02-23: durable milestones, not universal file templates or reset percentages.
- [Evaluating skills](https://developers.openai.com/blog/eval-skills), 2026-01-22: evaluate artifacts and traces rather than prompt appearance.

## Original empirical papers

- Gloaguen et al., [Evaluating AGENTS.md, v2](https://arxiv.org/html/2602.11988v2), 2026-06-23. CTXbench plus SWE-bench; inspect revised significance results, not earlier headlines.
- Lulla et al., [On the Impact of AGENTS.md Files on the Efficiency of AI Coding Agents, v2](https://arxiv.org/html/2601.20404v2), 2026-03-30. Paired small changes with one model; efficiency is not a complete correctness result.
- Xia et al., [Agentless, v2](https://arxiv.org/html/2407.01489v2), 2024-10-29. Test-based candidate selection; a test failing on old code is not sufficient proof it tests the right behavior.
- Liu et al., [Lost in the Middle, v3](https://arxiv.org/html/2307.03172v3), 2023-11-20. Older-model retrieval experiments, not a present-day agent-file length study.

## Requested practitioner source

[shanraisshan/claude-code-best-practice](https://github.com/shanraisshan/claude-code-best-practice/tree/b70072cc2fed48b710ddb555b66c3d0ad7c40641),
fixed commit b70072cc2fed48b710ddb555b66c3d0ad7c40641 (2026-09-26 06:45:43 UTC).
Read README, CLAUDE and settings through GitHub. Per-file commits, fixed compaction
thresholds, broad permissions and automatic MCP activation are not adopted.
A linked original Boris X thread was inaccessible (403); indirect summaries are
not treated as verified original testimony.

## Project authority

[A2 brief](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/assessments/assignment-2/)
and [assessment rules](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/topics/assessment/),
the actual repository README, package scripts, mise configuration, tests and Git
state. Local facts were inspected directly. Research suggestions cannot relax
course requirements or authorize external actions.

- [Course AI integrity policy](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/topics/ai-use-and-integrity/): re-read to distinguish honest human accountability from a blanket ban on AI-assisted drafting.
