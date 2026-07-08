# AGENTS.md

This file provides guidance to AI agents when working in this repository.

*Agent-agnostic, works with OpenCode, Claude Code, Codex, Gemini, etc.*

## Project Overview

This is the agent orchestration layer for your project. It provides:
- Universal agent team for development workflow
- OpenSpec change management
- Skills for platform and task-specific knowledge

## Context

Load DESIGN.md for design principles and guidelines. Load ARCHITECTURE.md for system architecture and component interactions. These files are generated during initialization and updated as the codebase evolves.

**Command aliases:** OpenSpec skills may reference `/opsx-propose`, `/opsx-apply`, `/opsx-archive`, or `/opsx-explore`. Always substitute them with `/ob-propose`, `/ob-apply`, `/ob-archive`, `/ob-explore` respectively, and never mention the `opsx-` names to the user.

## I Am the Lead, Full Workflow Ownership

<!-- OB-PLATFORM-WORKFLOW-START -->
When the user provides a work item URL or says "implement the plan" or "I've added comments to the PR", **I own the full lifecycle**. I load the appropriate userstory skill and coordinate implementation as native subagent waves via `/ob-apply`.

Trigger patterns, I recognize ALL of these, exact wording does not matter:
- User pastes or mentions a GitHub Issue URL → load `ob-userstory` skill → parse issue → run `/ob-propose` → confirm with user → run `/ob-apply` → ship
- `implement the plan` / `implement` / `start` / `go` → run `/ob-apply` → ship
- `I've added comments to the PR` → read PR comments → fix → update PR
- Any GitHub PR URL in a feedback/fix request (e.g. "check comments", "fix PR feedback") → run PR Feedback Loop

**A GitHub URL in the user's message is a strong trigger — follow the pipeline unless the user explicitly asks for analysis or context only.**
<!-- OB-PLATFORM-WORKFLOW-END -->

**Never delegate without a plan. Default to specialists for implementation. If a subagent wave repeatedly fails (a group errors after one retry, or a full wave makes zero progress), stop forcing it: report the failure, then continue in the main session or ask the user whether to retry later.**

## Engineer Selection

Before spawning implementation workers:
- Inspect `.opencode/agents/*.md` and build the list of engineers that actually exist in this project.
- Prefer the most specialized custom engineer whose description and abilities clearly match the task domain.
- Use `basic-engineer` only when no custom engineer is a clear fit or as a recovery fallback.
- Never spawn engineer names that are not present in `.opencode/agents/`.
- When multiple engineers could fit, choose the narrower specialist before the generalist.

## Multi-Agent Execution, native subagent waves

Parallel execution uses OpenCode's native `task` tool — no external plugin, no worktrees. The lead spawns subagents in **waves**: a set of foreground `task()` calls in a single turn that run concurrently and return their results to the lead. Subagents are navigable (`ctrl+x ↓`, `←`/`→`) and ephemeral (one batch, then they exit).

**The full wave protocol is defined in `/ob-apply` — that command is authoritative during implementation.** Key mechanics:
- **Push assignment.** Each subagent's task IDs + text go in its spawn prompt — there is no claim step, so a worker can never sit idle waiting for work.
- **Per-agent model.** Tasks name a tier-suffixed agent (e.g. `backend-engineer.build`); the `ob-subagent-tiers` plugin injects those variants at startup with models from `wizard.models`. If a variant is missing, fall back to the plain template agent (strip the `.<tier>` suffix).

**Hard limits (always apply):**
- **Max 4 concurrent subagents per wave.** The authoritative value is `wizard.maxConcurrentAgents` in `.opencode/opencode-onboard.json` — re-read it before each run. The lead enforces the cap; overflow queues to the next wave.
- **Non-overlapping file domains.** Two concurrent subagents must NEVER touch the same file. Same-file tasks are packed into one worker and run sequentially.
- **Explicit stalls.** If tasks remain but none are eligible (a dependency failed), or a full wave makes zero progress, STOP and report — never spin.
- **Retry limit.** One retry per failed group, then surface to the user. Never retry indefinitely.

**Live view:** the lead's native Todo list is the board; a **Subagents** panel (TUI plugin) also renders each subagent's agent · model · status live in the session sidebar, backed by `.opencode/.ob-run.json` (written by the `ob-subagent-monitor` server plugin). Navigate into any running subagent with `ctrl+x ↓` then `←`/`→`.

**Recovery:** re-run `/ob-apply` — it rebuilds state from `tasks.md` + git + basic-memory + `.opencode/.ob-run.json` and continues. State is on disk, not in the session.

**MCP degradation:** if codegraph or basic-memory is unavailable, fall back to `touches` + `git diff` for disjointness and inline result-passing, and tell the user.

---

## Pipeline

<!-- OB-PLATFORM-PIPELINE-START -->
```
lead (main session)
  → /ob-propose (parse work item + propose + enrich tasks)
        ↓
  [confirm with user]
        ↓
basic-engineer + *-engineer (parallel via /ob-apply)
  → implement assigned tasks (parallel waves)
        ↓
lead runs /ob-pullrequest → commit + push + create PR
```

### Phase 1, Parse & Propose

```
1. If a work item URL is provided, load @ob-userstory skill.
2. Run /ob-propose → fetches work item, generates proposal.md, specs/, tasks.md, enriches tasks with agent + dependencies.
3. Show the plan: change name, total tasks, task list with agent assignments.
4. STOP. Ask user: "Ready to implement? (yes/no)", DO NOT proceed until confirmed.
```

### Phase 2, Implement

```
0. Run /quota to check remaining budget before spawning.
1. Run /ob-apply.
   - Classify cost tier, announce scope, ask user to confirm if ≥4 tasks.
   - Lead discovers available engineers from .opencode/agents/*.md, prefers matching custom engineers.
   - Lead builds dependency- and file-disjoint waves, then spawns each wave as parallel subagents (by agent name; each engineer carries its own model).
   - Each subagent implements its assigned tasks and returns; the lead commits each group and marks tasks done in tasks.md.
2. Verify with tests/build/lint according to task scope.
3. Run /quota after all waves complete.
```

### Phase 3, Ship

```
1. Run /ob-pullrequest to create the PR.
2. Done — report PR URL to user.
```

### Handling PR Feedback

```
When user says "I've added comments to the PR" or shares a PR URL:
1. Run /ob-pullrequest — loads @ob-pullrequest skill in feedback mode — reads and classifies comments.
2. Fix items by running /ob-apply for the required tasks.
3. Run /ob-pullrequest again to push updates and reply to PR threads.
```
<!-- OB-PLATFORM-PIPELINE-END -->

---

## Tools

**OpenSpec** manages the change lifecycle. Each work item becomes a change with a `proposal.md`, specs, and a `tasks.md` task board. Commands: `openspec new change`, `openspec status`, `openspec instructions apply`. Agents never implement without an active change — OpenSpec is the single source of truth for what is planned and what is done.

**Native subagent waves** handle parallel execution via the OpenCode `task` tool — no external plugin or worktrees. The lead spawns concurrent foreground subagents per wave; each implements its assigned tasks and returns its result, and the lead commits per group. Live board in the Todo pane; subagent state mirrored to `.opencode/.ob-run.json` by the `ob-subagent-monitor` plugin.

---

## Agents

Agent files live in `.opencode/agents/`. The set is dynamic — users add specialists over time via `/ob-create-engineer`.

| Agent | File | Role |
|-------|------|------|
| `basic-engineer` | `.opencode/agents/basic-engineer.md` | Fallback implementation worker. Used when no custom engineer matches the task domain. |
| `docs-ui-engineer` | `.opencode/agents/docs-ui-engineer.md` | Docs website specialist — HTML/CSS/JS landing page in `docs/`, design taste, web design guidelines. |
| `*-engineer` | `.opencode/agents/*-engineer.md` | User-created specialists. Preferred over `basic-engineer` when their domain matches the task. |

Before spawning, inspect `.opencode/agents/` to build the actual list — never assume which custom engineers exist.

---

## Abilities

Every agent file declares an `## Abilities` section that maps roles to `@skill-name` references. This is how agents know what to load — skills deliver the rules, guardrails, and platform knowledge for each domain.

```markdown
## Abilities
- Guardrails: @ob-generic-guardrails, @ob-default
- Development: @ob-default
- Testing: @ob-default
- Infrastructure: @ob-default
```

`@ob-generic-guardrails` is mandatory in every agent's Guardrails line. Custom engineers replace `@ob-default` with real installed skills.

---

## Skills

Skills live in `.agents/skills/`. Agents load them via `@skill-name` in their `## Abilities` section.

Always installed: `@ob-default`, `@ob-generic-guardrails`, `@browser-automation`.

<!-- OB-PLATFORM-SKILLS-GUIDE-START -->
Platform skills (GitHub):
- `@ob-userstory` — load when a GitHub Issue URL is detected. Fetches the issue via `gh` CLI and creates an OpenSpec change. NEVER use webfetch to access GitHub URLs.
- `@ob-pullrequest` — load in ship mode to create a PR with screenshots, or in feedback mode to read and classify PR review comments.
<!-- OB-PLATFORM-SKILLS-GUIDE-END -->

---

## Optimizations

Active tools injected during onboarding. Empty sections mean that tool was not selected.

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
- `rtk pnpm build` NOT `pnpm build` or `npm run build`
- `rtk pnpm test` NOT `pnpm test` or `npm test`
- `rtk pnpm lint` NOT `pnpm lint` or `npm run lint`
- `rtk pnpm run dev` NOT `npm run dev`
- `rtk dotnet build` NOT `dotnet build`

**Package manager: `pnpm` ONLY.** Never use `npm` or `yarn` for any command. `pnpm-lock.yaml` is committed. Always use `pnpm` for installs (`rtk pnpm install`), running scripts (`rtk pnpm run <script>`), and adding dependencies (`rtk pnpm add <pkg>`).

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

**IMPORTANT: CodeGraph is an MCP server, NOT a CLI tool.** Do NOT run `codegraph` as a bash command. Use the MCP tools directly:
- `codegraph_search` — find symbols by name
- `codegraph_callers` / `codegraph_callees` — trace call flow
- `codegraph_impact` — check what's affected before editing
- `codegraph_node` — get a single symbol's details
- `codegraph_explore` — broader codebase exploration (heavier, prefer spawning an Explore sub-agent for this)

**NEVER call `codegraph_explore` or `codegraph_context` directly in the main session** — these return large source payloads that fill context. Instead, ALWAYS spawn an Explore sub-agent for exploration questions ("how does X work?", "where is Y implemented?").

**MANDATORY: When spawning ANY Explore sub-agent, you MUST include this exact text in the spawn prompt:**

> This project has CodeGraph MCP tools available. Use `codegraph_explore` as your PRIMARY exploration tool — it is faster and more accurate than grep/glob/read. Call `codegraph_explore` with a descriptive query about what you're looking for. Do NOT re-read files that codegraph_explore already returned. Only fall back to grep/glob/read for files listed under "Additional relevant files" in the codegraph output, or if codegraph returns no results.

Without this instruction, the Explore sub-agent will not know codegraph exists and will waste time with slow grep/glob/read calls.

**The main session may only use these lightweight tools directly** (targeted lookups before edits):
- `codegraph_search` — find symbols by name
- `codegraph_callers` / `codegraph_callees` — trace call flow
- `codegraph_impact` — check what's affected before editing
- `codegraph_node` — get a single symbol's details
<!-- OB-CODEGRAPH-END -->

<!-- OB-MEMORY-START -->
## Basic Memory

Persistent knowledge graph active (`basic-memory mcp`, stdio MCP server).

**IMPORTANT: basic-memory is an MCP server, NOT a CLI tool.** Do NOT run `basic-memory` as a bash command. Use the MCP tools directly:
- `write_note` / `edit_note` — store a decision, architectural note, or finding
- `search` — find relevant notes by semantic search
- `build_context` — navigate related notes via wikilinks
- `recent_activity` — see what was written recently in this session

Notes stored as plain Markdown files — readable by both agents and humans.

Store: architecture decisions, resolved ambiguities, cross-agent context, discovered constraints.
Query before implementing unfamiliar areas or picking up a long-running task.

**When spawning Explore or engineer sub-agents, include this in the prompt if they need context:**

> This project has basic-memory MCP tools available. Use `search` to find prior decisions, architecture notes, or context relevant to your task before starting. After finishing, use `write_note` to store a summary of what you found or decided (title: `task-<id>-result` or `exploration-<topic>`).

Without this instruction, sub-agents will not know basic-memory exists and will miss prior context.
<!-- OB-MEMORY-END -->


