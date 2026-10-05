# Environment-control amendment before complete A/B comparison

The first attempted round started two native tasks; ten other slots never ran.
Both completed tasks were marked INFRA by the original byte-hash guard. Their
outputs, grades and usage are preserved in the local results/r1 folder and are
not silently converted into comparative wins.

Exact cause: Codex CLI added trusted project registrations for its two new
scratch workspaces. Removing only those two blocks in memory and normalizing
extra blank lines exactly restored the pre-round config SHA. The global agent
instructions, model, effort, sandbox, approvals and other config content did
not change. No real config file was edited to perform this diagnosis.

The corrected control freezes a canonical parsed config, excluding only normal
{trust_level: trusted} entries for the exact predeclared paths of the current
round. Any other field or unexpected registration remains a drift. Both raw
config hashes and the excluded registrations are recorded. Personal AGENTS and
AGENTS.override hashes remain frozen. This is an observed client metadata
behavior, not a permission bypass or a model-setting change.

A fresh complete round r1b will run both variants under this declared control.
The incomplete first batch remains an environment-control pilot, including its
adverse results. We report executed versus never-started slots separately.
