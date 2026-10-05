# COMP4020 Assignment 2 harness

This repository builds a Slop University course website for COMP4020
Assignment 2. The deployed page is the marked artefact; the repository is the
evidence trail for how it was directed, tested and corrected.

Read the live brief and spec before changing scope:

- https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/assessments/assignment-2/
- https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/topics/assessment/#marking-environment

## Instruction map

- The published brief and spec are the fixed contract.
- This file contains stable repository rules that should load every session.
- `README.md` documents the fixed platform (Slop branding, content model, base
  path, decks, generated API) --- do not restate or contradict it here.
- `spec/` turns mechanical promises into automatic backpressure.
- Browser play at the marking viewports covers coherence and judgement that
  source and content tests cannot.
- `PROCESS.md` records evidence after the work is real; there is no separate
  reflection file for this assignment.
- `AGENTS.md` points non-Claude agents at this same canonical harness.

Do not copy session-specific tasks or course facts into this file. Link to
their source so the standing harness stays short and does not drift.

## Working loop

1. Inspect the brief, `git status`, the relevant files and existing checks.
2. Write or update a working plan file before a multi-file or structural
   change (new collection, navigation change, cross-page content pass).
3. Run the baseline before editing. Record unfinished acceptance checks
   separately from regressions; expected red content checks do not block setup.
4. For a new behavior or bug, reproduce the missing behavior with a focused
   test, implement the smallest correction, then verify it. A check protecting
   behavior the starter already satisfies may begin green; do not manufacture
   failures just to demonstrate a sequence.
5. Run the built site and browse it as a prospective student would; code
   review is not a substitute for reading the pages.
6. Commit coherent checkpoints with descriptive messages. Preserve checks
   already passing, and document intentionally red acceptance tests and why
   they remain red. All required checks must pass before submission.

When a manual check exposes a mechanical bug, reproduce it with a failing test
before fixing it. When the same correction recurs, promote it into this
harness or an automatic check instead of relying on another prompt.

## Toolchain and commands

Use the versions pinned in `mise.toml`. The non-interactive WSL shell may
expose an older system Node, so run project commands through `mise exec -- ...`.

- `mise exec -- pnpm dev` - serve the working tree at its base path.
- `mise exec -- pnpm test` - fast Vitest loop (builds first; there is only one
  ordering).
- `mise exec -- pnpm build` - create the actual `dist/` artefact and API.
- `mise exec -- pnpm check` - typecheck, build and the course spec suite.
- `mise exec -- pnpm check:evidence` - validate assessed process files; the
  final gate before shipping.

Read a failed command's output before editing. Never weaken a check merely to
make it green.

## Architecture guardrails

- The platform is fixed: Slop branding and palette, the four content
  collections and their keys (`sessions`, `assessments`, `lectures`, `people`),
  the `astro.config.ts` build pipeline and the generated API stay as they
  arrived. Do not modify these without a concrete, stated reason.
- Everything else --- course design, pages, components, navigation, styling,
  decks, and every word of content --- is mine to design.
- A collection key, its URL and its JSON ref agree by construction; renaming
  one means renaming all of them.
- `related:` refs must resolve --- the build fails on a dangling ref, and that
  failure is a real signal, not a false positive to work around.
- Never hand-edit generated `dist/api` JSON; it's build output.
- No hand-written root-absolute links (`href="/sessions/"`) in `.astro`
  files --- they skip the base-path rewrite and 404 on the live site. Use
  markdown links or the theme's components.
- Keep dated content (sessions, lectures, assessments) inside the course's
  declared teaching period; `spec/data-integrity.test.ts` checks this.

## Verification boundary

Before accepting an implementation checkpoint:

- run the focused test and `mise exec -- pnpm check`;
- run `mise exec -- pnpm build && mise exec -- pnpm preview`, not only the
  dev server;
- exercise `1920x1080` and `390x844` in Chrome-compatible tooling;
- inspect the browser console for errors or warnings;
- read a few non-adjacent weeks, an assessment and the deck cold, the way a
  marker will.

Whether the curriculum holds together and would attract a real student is a
human judgement. Do not pretend a passing check proves it.

## Git and safety

- Preserve unrelated user changes and inspect the diff before every commit.
- Never use destructive Git commands on an ambiguous target.
- Never commit keys, tokens or `.claude/` credentials.
- Commit locally in small checkpoints with their actual verification status.
- Do not push, publish, make the repository public or run the course ship
  skill unless the user explicitly asks.
