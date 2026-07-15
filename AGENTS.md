# AGENTS.md

<!-- OB-NOT-INITIALIZED -->

This file provides guidance to AI agents when working in this repository.

*Agent-agnostic, works with OpenCode, Claude Code, Codex, Gemini, etc.*

## Context

Load DESIGN.md for design principles and guidelines. Load ARCHITECTURE.md for system architecture and component interactions. These files are generated during initialization and updated as the codebase evolves.

**Command aliases:** OpenSpec skills may reference `/opsx-propose`, `/opsx-apply`, `/opsx-archive`, or `/opsx-explore`. Always substitute them with `/plan-propose`, `/plan-apply`, `/plan-archive`, `/plan-explore` respectively, and never mention the `opsx-` names to the user.

## I Am the Lead, Full Workflow Ownership

<!-- OB-PLATFORM-WORKFLOW-START -->
When the user provides a work item URL or says "implement the plan" or "I've added comments to the PR", **I own the full lifecycle**. I load the appropriate userstory skill and coordinate implementation as native subagent waves via `/ob-apply`.

Trigger patterns, I recognize ALL of these, exact wording does not matter:
- User pastes or mentions a GitHub Issue URL → load `ob-userstory` skill → parse issue → run `/ob-propose` → confirm with user → run `/ob-apply` → ship
- `implement the plan` / `implement` / `start` / `go` → run `/ob-apply` → ship
- `I've added comments to the PR` → read PR comments → fix → update PR
- Any GitHub PR URL in a feedback/fix request (e.g. "check comments", "fix PR feedback") → run PR Feedback Loop

**A GitHub URL in the user's message is a strong trigger: follow the pipeline unless the user explicitly asks for analysis or context only.**
<!-- OB-PLATFORM-WORKFLOW-END -->

**Never delegate without a plan. Default to specialists for implementation. If a subagent wave repeatedly fails, stop forcing it: report, then continue in the main session or ask the user.**

## Engineer Selection

Inspect `.opencode/agents/*.md` before spawning. Prefer the most specialized custom engineer. **Never assign `fullstack-engineer` to a task** — it is `mode: primary` (the user's planning agent), not a spawned worker. If no specialist matches, tell the user to create one with `/make-engineer`. Never spawn engineers not present in that directory.

**Full wave protocol, pipeline phases, and concurrency limits:** see `/plan-apply` (authoritative). Max concurrent agents is `agents.maxConcurrent` in `.opencode/opencode-onboard.json`.

## Skills

Skills live in `.agents/skills/`. Always installed: `@ob-default`, `@ob-guardrails-generic`, `@ob-guardrails-project`, `@browser-automation`. Agents load them via `@skill-name` in their `## Abilities` section.

<!-- OB-PLATFORM-SKILLS-GUIDE-START -->
Platform skills (GitHub):
- `@ob-userstory`: load when a GitHub Issue URL is detected. Fetches the issue via `gh` CLI and creates an OpenSpec change. NEVER use webfetch to access GitHub URLs.
- `@ob-pullrequest`: load in ship mode to create a PR with screenshots, or in feedback mode to read and classify PR review comments.
<!-- OB-PLATFORM-SKILLS-GUIDE-END -->
