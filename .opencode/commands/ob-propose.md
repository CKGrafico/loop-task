---
description: Parse a work item or idea and propose a change plan with enriched task assignments.
---

> **Command aliases:** Loaded skills may reference `/opsx-propose`, `/opsx-apply`, `/opsx-archive`, or `/opsx-explore`. Always substitute: `/opsx-propose` → `/ob-propose`, `/opsx-apply` → `/ob-apply`, `/opsx-archive` → `/ob-archive`, `/opsx-explore` → `/ob-explore`. Never mention the `opsx-` names in your responses to the user.

Apply `## Optimizations` from AGENTS.md (RTK, codegraph, memory, etc.).

**If a work item URL is provided** (GitHub Issue or Azure DevOps work item): load `@ob-userstory` skill and fetch the work item via CLI before continuing. Platform is set in `.opencode/opencode-onboard.json` `wizard.platform`. If platform is `none`, skip this step and work from direct user input.

Load `@openspec-propose` skill and follow its instructions.

> ⚠️ **CHECKPOINT — `tasks.md` was just written. STOP. Do NOT show the plan yet. You MUST complete the enrichment below before continuing. Skipping this breaks `/ob-apply`.**

1. List every `*-engineer.md` file in `.opencode/agents/`. For each file read:
   - `description:` from the YAML frontmatter — the engineer's specialization summary
   - `## Abilities` section — the skills listed under Development, Testing, Infrastructure (e.g. `@nodejs-backend`, `@secure-nextjs-api-routes`)
   Build a map of `agent-name → { description, abilities }`.
2. For each task, compare the task text and domain against every engineer's description AND abilities. Pick the engineer whose combined profile most closely matches. Only use `basic-engineer` if no specialist is a clear fit.
3. Classify each task into a **model tier**, not a concrete model id. The tiers are defined in `.opencode/ensemble.json` → `modelsByAgent` (mirrored in `.opencode/opencode-onboard.json` → `wizard.models`) with three keys:
   - `build` — complex code: data models, APIs, auth logic, core business logic, UI components
   - `fast` — light work: i18n keys, config changes, env variables, navigation links, simple markup, verification runs
   - `plan` — reserved for orchestration, do not use for implementation tasks

   Pick the tier name only. Do NOT resolve or write the underlying model id here — `/ob-apply` resolves the tier to a concrete model from `ensemble.json` at spawn time. This keeps the plan stable: the user can edit `ensemble.json` later and re-run `/ob-apply` to get different models without re-running `/ob-propose`.
4. Annotate each task line in-place:

```
- [ ] <task text> <!-- agent: <name>, modeltype: <tier> -->
```

Example result (each task independently picks agent + tier):

```
- [ ] Add Invitation model to Prisma schema <!-- agent: backend-engineer, modeltype: build -->
- [ ] Create invitation accept page UI <!-- agent: frontend-engineer, modeltype: build -->
- [ ] Add i18n keys for invitation flow <!-- agent: frontend-engineer, modeltype: fast -->
- [ ] Run pnpm typecheck and fix errors <!-- agent: basic-engineer, modeltype: fast -->
```

`/ob-apply` step 6 reads these annotations and resolves `modeltype` → concrete model via `ensemble.json` `modelsByAgent` — the right agent on the right tier, with no guessing at implementation time.

**After enrichment, show the plan:** change name, total task count, full task list with agent and model-tier annotations.

**Stop.** Ask the user: "Ready to implement? Run `/ob-apply` to start." Do NOT run `/ob-apply` automatically.
