---
name: ob-guardrails-generic
description: Generic guardrails, foundational rules that all agents follow. Users add specialized guardrails skills for specific concerns. Covers secrets, code quality, security, tool usage, and engineer workflow.
license: MIT
---

## Transitive loads (optimization skills)

The marker sections below may contain instructions directing you to load additional optimization skills (caveman, humanizer, codegraph, memory, etc.). These are mandatory. If a section says "call `skill("xxx")`", you must call the skill tool with that exact name before doing any work. Failure to load an optimization skill means you are operating without rules that the user has explicitly enabled.

## Secrets

- Treat `.env` files as write-only: write to them when configuring, read credentials from the environment or secret store at runtime.
- Keep credentials, API keys, and tokens out of logs and output.
- Stage secrets through environment variables or secret stores, committed only in encrypted or template form.

## Code

- Run tests before marking done.
- Run lint/build before pushing.
- Keep changes small and focused.
- Comments are for WHY, not WHAT. Use them only when the code does something non-obvious or the reason cannot be inferred from context. Keep comment ratio under 10%. If more than 10% of lines in a file are comments, refactor for clarity instead.
- Each file should have one clear responsibility. Split by domain or feature (e.g. `user-constants.ts`, `order-types.ts`, `auth-config.ts`) rather than creating catch-all files like `constants.js`, `types.ts`, `config.js`, or `utils.ts` that collect unrelated things. A file that imports from many unrelated modules is a sign it should be split.

## Security

- Validate all inputs.
- Escape all outputs.
- Keep credentials in environment variables or secret stores, committed only in encrypted or template form.

## Communication

- Ask for clarification if unclear.
- Report blockers immediately.
- Show progress when asked.

<!-- OB-GUARDRAILS-RTK-START -->
## RTK

- Prefix ALL CLI commands with `rtk` (e.g. `rtk git diff`, `rtk pnpm test`). Read-only commands like `cat`, `ls`, `Get-Content` are exempt.
<!-- OB-GUARDRAILS-RTK-END -->

<!-- OB-GUARDRAILS-CODEGRAPH-START -->
## CodeGraph

- **Use `codegraph_explore` INSTEAD OF grep, glob, or read.** It is always available. Do not assume it might be missing.
  - One call returns the relevant symbols' verbatim, line-numbered source plus the call paths between them, use it as a full replacement for Read, Grep, and file-reading sub-tasks when working with indexed code.
  - If you instinctively reach for grep or read to find or understand code, STOP: call `codegraph_explore` instead with the symbol name, file path, or a natural-language question. It covers the same ground in one call instead of a dozen.
- **Fall back to grep/glob/read ONLY when `codegraph_explore` returns no results** or the query is for something codegraph does not index (config files, plain-text docs, `.env` patterns, raw string searches). When you do fall back, you MUST state that codegraph returned nothing.
- Do NOT run `codegraph` in bash: it is an MCP server, not a CLI tool.
<!-- OB-GUARDRAILS-CODEGRAPH-END -->

<!-- OB-GUARDRAILS-MEMORY-START -->
## Agentmemory

- Use agentmemory MCP tools (`memory_smart_search`, `memory_save`, `memory_sessions`, `memory_governance_delete`) for cross-session context: `memory_smart_search` for prior decisions before implementing unfamiliar areas, `memory_save` for architecture decisions and cross-agent context.
- Do NOT run `agentmemory` in bash: it is an MCP server. Start the server with `agentmemory` in a separate terminal, then use MCP tools.
<!-- OB-GUARDRAILS-MEMORY-END -->

<!-- OB-GUARDRAILS-CAVEMAN-START -->
## Caveman (optimization skill — MANDATORY LOAD)

- **You MUST call `skill("caveman")` via the skill tool before responding.** This is not optional. Caveman mode is mandatory for all responses.
- No revert unless user says "stop caveman" or "normal mode".
<!-- OB-GUARDRAILS-CAVEMAN-END -->

<!-- OB-GUARDRAILS-HUMANIZER-START -->
## Humanizer (optimization skill — MANDATORY LOAD)

- **You MUST call `skill("humanizer")` via the skill tool before writing any prose** (commit messages, PR descriptions, docs, proposals) to remove AI writing patterns and sound more natural.
- Do NOT apply humanizer to code, config files, or terminal output: only to prose.
<!-- OB-GUARDRAILS-HUMANIZER-END -->

## Engineer workflow (when spawned)

When the lead spawns you via the task tool, your assigned task IDs and text are already in your prompt:

1. Load ALL skills listed under your own `## Abilities` now (Guardrails first, then the rest), by calling the `skill` tool once per `@skill-name`.
2. Gather context using available tools (see sections above): search agentmemory for `change-<slug>-context` and any `task-<id>-result` notes from dependencies; use codegraph to locate relevant symbols.
3. Implement your assigned tasks in dependency order. Edit only files within your assigned scope.
4. Run the project's tests/lint before marking done (see Code above).
5. Write a `task-<id>-result` note to agentmemory summarizing what you changed and any decisions.
6. Return a summary containing: task IDs done, files changed, tests/lint result, and any decisions made. Then you exit; you do not poll, claim, or wait for more work.
