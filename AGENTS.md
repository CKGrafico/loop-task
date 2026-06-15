# AGENTS.md

## loop-task

A cross-platform CLI that repeatedly runs a shell command at a human-readable interval. TypeScript/ESM, Bun runtime (>=1.2), OpenTUI + React board interface.

### Quick start

```bash
bun install
bun run typecheck
bun run lint
bun run test
```

Gate order: `typecheck` → `lint` → `test`.

### Commands

| Script | Effect |
|--------|--------|
| `bun run dev` | Watch mode with auto-reload (`bun --watch src/cli.ts`) |
| `bun run test` | `vitest run` |
| `bun run test:watch` | `vitest` (watch mode) |
| `bun run test:coverage` | Coverage with v8 (90% threshold, excludes `cli.ts`, `types.ts`, `daemon/index.ts`, `tui/**`) |
| `bun run lint` | `eslint src/ tests/` |
| `bun run release` | `bun publish` (no build step — ships `src/` directly) |

### Architecture

- `src/cli.ts` — Commander entry point (Bun shebang, no build step)
- `src/daemon/` — Background daemon, IPC server, loop manager, state persistence (atomic writes)
- `src/client/` — IPC client consumed by CLI and board
- `src/board/` — OpenTUI + React TUI (`index.tsx`, `App.tsx` container + `components/`, `hooks/`)
- `src/core/` — LoopController (state machine), foreground-loop, command-runner, log-rotator
- `src/config/constants.ts` — Magic numbers (POLL_MS, TOAST_TIMEOUT, etc.)
- `src/i18n/en.json` — All user-facing strings via `t(key, params?)` with typed key union
- `src/shared/` — `sleep()`, `tail()`, `writeFileAtomic`, `removeIfExists`

### Key quirks

- **No build step.** Bun runs `.ts`/`.tsx` directly.
- `bun link` / `bun run src/cli.ts` for local testing. CLI: `start` (background daemon), `run` (foreground), `board` (TUI, default).
- `LOOP_CLI_HOME` env var isolates daemon state directory (used by test suite).
- Pre-existing test issues:
  - `tests/cli.test.ts`: version assertion (`1.1.0`) out of sync with package (`1.2.0`).
  - `tests/background-cli.test.ts`: timeouts on Windows (daemon IPC, green on other platforms).
- Daemon single-flight guard: socket binds before `manager.init`; losing racers exit(0) cleanly.
- All IPC operations driven by the board; CLI only exposes `start` and `run`.
- RTK prefix required for shell commands (see below).

### Agents

Custom engineers live in `.opencode/agents/`. Spawned by the lead during `/ob-apply`.

| Agent | File | Role |
|-------|------|------|
| `development-engineer` | `.opencode/agents/development-engineer.md` | Full-stack engineer for this project: OpenTUI/React board, Commander CLI, daemon/IPC, Bun/TS core, vitest suite. |
| `basic-engineer` | `.opencode/agents/basic-engineer.md` | Fallback implementation worker when no specialist fits. |

<!-- OB-PLATFORM-WORKFLOW-START -->
When the user gives a task directly in the conversation, **I own the full lifecycle**. I work from the user request and local repository context. I may use OpenSpec when structured planning helps, but I do not depend on issue links or PR workflows.

Trigger patterns, I recognize ALL of these, exact wording does not matter:
- User describes a feature, bug, or refactor directly → clarify if needed → optionally run `/ob-propose` → implement in the main session or `/ob-apply` as appropriate
- `implement the plan` / `implement` / `start` / `go` → run `/ob-apply` against the current OpenSpec change when one exists
- `just do it` / `quick fix` / `raw conversation` → work directly in the main session without PR or work-item automation

**GitHub Issue URLs, Azure DevOps work item URLs, and PR URLs are NOT automatic triggers in this mode.** Only use platform-specific flows if onboarding is later reconfigured for GitHub or Azure DevOps.
<!-- OB-PLATFORM-WORKFLOW-END -->

**Never delegate without a plan. Default to specialists for implementation. If ensemble is clearly non-functional in the current session (idle teammate, no claim, or repeated spawn failure after one retry), stop forcing it: report the failure, then continue in the main session or ask the user whether to retry later.**

<!-- OB-PLATFORM-PIPELINE-START -->
```
lead (main session)
  → /ob-propose (propose + enrich tasks)
        ↓
  [confirm when scope needs it]
        ↓
basic-engineer + *-engineer (parallel via /ob-apply)
  → claim tasks + implement
        ↓
lead verifies and reports to user
```

### Phase 1, Clarify & Plan

```
1. Understand the task from the conversation and local repo context.
2. If the work benefits from explicit specs/tasks, run /ob-propose.
   Enrich tasks.md: for each task assign best matching engineer and model from opencode-onboard.json wizard.models.
3. Show the plan or intended scope when non-trivial.
4. If the request is small, implement directly in the main session.
```

### Phase 2, Implement

```
0. Run /quota before spawning, when available.
1. If using OpenSpec tasks, run /ob-apply.
   - Classify cost tier, confirm if ≥4 tasks.
   - Lead adds all tasks to board, discovers engineers, spawns initial batch.
   - Each engineer claims, implements, commits, messages lead.
   - Lead merges each engineer branch, marks tasks done.
2. If task is small, implement directly in the main session.
3. Verify with tests/build/lint.
```

There is no PR shipping phase in `none` mode. Report completion directly to the user.
<!-- OB-PLATFORM-PIPELINE-END -->

<!-- OB-PLATFORM-SKILLS-GUIDE-START -->
No platform skills installed (platform: none). Work from direct user instructions and local OpenSpec artifacts only.
<!-- OB-PLATFORM-SKILLS-GUIDE-END -->

<!-- OB-RTK-START -->
## RTK, MANDATORY

RTK has NO automatic hook in OpenCode. You MUST explicitly prefix every CLI command with `rtk`. It does not happen automatically.

Prefix ALL shell commands with `rtk`:
- `rtk git diff` NOT `git diff`
- `rtk git log` NOT `git log`
- `rtk gh` NOT `gh`
- `rtk az` NOT `az`
- `rtk openspec` NOT `openspec`
- `rtk npx tsc --noEmit` NOT `npx tsc --noEmit`
- `rtk pnpm build` NOT `pnpm build`
- `rtk pnpm test` NOT `pnpm test`
- `rtk pnpm lint` NOT `pnpm lint`
- `rtk dotnet build` NOT `dotnet build`

Light read-only commands that produce minimal output (e.g. `cat`, `ls`, `Get-Content`, `Select-String`) do not need `rtk`.

If `rtk` is not available, report blocker and stop CLI execution.
<!-- OB-RTK-END -->

<!-- OB-CAVEMAN-START -->
## Caveman

Caveman mode active. Apply to every response. No revert unless user says "stop caveman" or "normal mode".

The `@caveman` skill is installed at `.agents/skills/caveman/`. Load it for full guidance if needed.
<!-- OB-CAVEMAN-END -->

<!-- OB-CODEGRAPH-START -->
## CodeGraph

This project has CodeGraph initialized (`.codegraph/` exists). Use it for all code exploration.

**NEVER call `codegraph_explore` or `codegraph_context` directly in the main session** — these return large source payloads that fill context. Instead, ALWAYS spawn an Explore sub-agent for exploration questions ("how does X work?", "where is Y implemented?").

When spawning Explore agents, include in the prompt:
> This project has CodeGraph initialized. Use `codegraph_explore` as your PRIMARY tool. Do NOT re-read files that codegraph_explore already returned. Only fall back to grep/glob/read for files listed under "Additional relevant files".

**The main session may only use these lightweight tools directly** (targeted lookups before edits):
- `codegraph_search` — find symbols by name
- `codegraph_callers` / `codegraph_callees` — trace call flow
- `codegraph_impact` — check what's affected before editing
- `codegraph_node` — get a single symbol's details
<!-- OB-CODEGRAPH-END -->

<!-- OB-MEMORY-START -->
## Basic Memory

Persistent knowledge graph active (`uvx basic-memory mcp`, stdio MCP). Notes stored as plain Markdown files — readable by both agents and humans.

Key tools:
- `write_note` / `edit_note` — store a decision, architectural note, or finding
- `search` — find relevant notes by semantic search
- `build_context` — navigate related notes via wikilinks
- `recent_activity` — see what was written recently in this session

Store: architecture decisions, resolved ambiguities, cross-agent context, discovered constraints.
Query before implementing unfamiliar areas or picking up a long-running task.
<!-- OB-MEMORY-END -->

<!-- CODEGRAPH_START -->
## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tools** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them. `codegraph_node` returns one symbol's source + callers, or reads a whole file with line numbers. If the tools are listed but deferred, load them by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` and `codegraph node <symbol-or-file>` print the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->
