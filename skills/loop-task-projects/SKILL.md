---
name: loop-task-projects
description: >
  Understand and design Loop Task Projects: organisational scope for Loops,
  default-project semantics, membership, colour branding, deletion with
  reassignment, and safe multi-tenant automation patterns. Load this skill
  when creating, reviewing, or modifying Projects or reasoning about how
  Loops are grouped, isolated, and reassigned.
---

# Loop Task Projects

A Project is an organisational scope for Loops.
A Project groups related Loops together.
It provides a working directory, a visual identity, and a namespace.
It does not affect execution semantics.

## What a Project Is

A Project is a named, coloured grouping for Loops. It provides:

- **Organisational scope**: Loops are grouped by Project for display and management.
- **Working directory**: A Project has a `directory` property that serves as the default working directory for its Loops' Tasks.
- **Visual identity**: A Project has a `color` and a `name` used in listings and logs.
- **A home for orphaned Loops**: When a Project is deleted, its Loops are reassigned to the default Project.

A Project is **not** an execution boundary. Loops in different Projects can still modify the same external resources. Project membership does not provide isolation of side effects.

A Project is **not** a security boundary. There is no access control at the Project level. All Loops are accessible regardless of their Project.

A Project is **not** a namespace for Tasks. Tasks exist independently from Projects. They are not scoped to a Project.

A Project is **not** a variable or credential store. Loop Task does not provide per-Project environment variables or secrets.

## Project Properties

| Property | Domain Meaning |
|---|---|
| name | Human-readable label for the Project |
| color | Visual identifier: a hex colour code |
| directory | Default working directory for the Project's Loops' Tasks |
| isSystem | Whether this is a system-managed Project (cannot be renamed or deleted) |

For exhaustive detail on every property, see [references/domain-reference.md](references/domain-reference.md).

## The Default Project

Every Loop Task installation has exactly one **default Project** with these properties:

| Property | Value |
|---|---|
| id | `"default"` |
| name | `"Default"` |
| color | `"#ffffff"` (white) |
| isSystem | `true` |

The default Project **cannot** be renamed, recolored, or deleted. It always exists.

### Purpose

- It serves as the initial home for Loops that are not explicitly assigned to a Project.
- It receives orphaned Loops when their Project is deleted.
- It provides a working "inbox" for rapid prototyping before Projects are set up.

### When Loops end up in the default Project

- A Loop is created without specifying a `projectId`. It is assigned to the default Project.
- A Loop's Project is deleted. The Loop is reassigned to the default Project.

## Project Membership

### Loops belong to one Project

Each Loop belongs to exactly one Project, identified by its `projectId`. A Loop cannot belong to multiple Projects.

### Tasks do not belong to Projects

Tasks are global entities. They are not scoped to a Project. The same Task can be the initial Task of Loops in different Projects.

### Working directory resolution

When a Loop's `cwd` is not set, the Project's `directory` serves as the default working directory for the Loop's Tasks. When a Loop's `cwd` is set, it overrides the Project's directory.

Resolution order:
1. If the Loop has an explicit `cwd`, use it.
2. If the Loop has no `cwd`, use the Project's `directory`.
3. If the Project's `directory` is not set, use the runtime's process working directory.

### No execution isolation

Project membership does **not** isolate:
- File system access (all Loops' Tasks can access the same filesystem)
- Environment variables (all Loops' Tasks share the same process environment)
- External state (all Loops' Tasks can modify the same external resources)
- Concurrency (Loops in different Projects execute independently and concurrently)

## Project Colors

Project colors are drawn from a predefined palette:

```
# PROJECT_COLORS:
# "#ef4444" (red), "#f97316" (orange), "#eab308" (yellow), "#22c55e" (green),
# "#06b6d4" (cyan), "#3b82f6" (blue), "#8b5cf6" (violet), "#ec4899" (pink),
# "#6b7280" (gray), "#ffffff" (white)
```

The color is a visual identifier for listings and logs. It has no execution effect.

## Creation and Deletion

### Creating a Project

A Project is created with a `name`, a `color` (from the predefined palette), and optionally a `directory`. The `id` is auto-generated.

### Deleting a Project

When a non-system Project is deleted:

1. All Loops that belong to the deleted Project are **reassigned to the default Project**.
2. The reassigned Loops retain all their properties, including `cwd`. If the deleted Project was providing the working directory and the Loop had no explicit `cwd`, the Loop now falls back to the default Project's directory (or the process cwd).
3. The deletion is permanent. The Project cannot be restored.
4. Tasks are **not** affected by Project deletion. Tasks are global and not scoped to Projects.

### What is not deleted

- Loops (reassigned, not deleted)
- Tasks (unaffected — not scoped to Projects)
- Run history (preserved on the reassigned Loops)

## Project Design Patterns

### 1. Domain-Based Projects

Group Loops by the domain or service they operate on:

```yaml
# Conceptual representation — not a real configuration format
projects:
  - name: Backend API
    color: "#3b82f6"
    directory: /projects/backend-api

  - name: Frontend App
    color: "#22c55e"
    directory: /projects/frontend-app

  - name: Data Pipeline
    color: "#8b5cf6"
    directory: /projects/data-pipeline
```

Each Project's Loops operate on resources within that domain.

### 2. Environment-Based Projects

Group Loops by deployment environment:

```yaml
# Conceptual representation — not a real configuration format
projects:
  - name: Production
    color: "#ef4444"
    directory: /envs/production

  - name: Staging
    color: "#eab308"
    directory: /envs/staging

  - name: Development
    color: "#22c55e"
    directory: /envs/development
```

Each Project's Loops target the corresponding environment.

### 3. Team-Based Projects

Group Loops by the team responsible for them:

```yaml
# Conceptual representation — not a real configuration format
projects:
  - name: SRE Team
    color: "#f97316"
    directory: /teams/sre

  - name: Platform Team
    color: "#06b6d4"
    directory: /teams/platform
```

Each team manages its own Loops.

### 4. Product-Based Projects

Group Loops by the product or feature they support:

```yaml
# Conceptual representation — not a real configuration format
projects:
  - name: User Authentication
    color: "#3b82f6"
    directory: /products/auth

  - name: Billing System
    color: "#22c55e"
    directory: /products/billing
```

## Project Antipatterns

- **Over-fragmentation.** Creating a Project for every single Loop adds management overhead without benefit. Group Loops that share a domain, environment, or team.
- **Using Projects as a security boundary.** Project membership does not isolate execution or access. If you need isolation, use separate Loop Task installations.
- **Using Projects for variable storage.** Loop Task does not provide per-Project environment variables or credentials. Use the Task's context or external secret management.
- **Relying on the default Project for production Loops.** The default Project is intended for prototyping. Production Loops should be in a dedicated Project for clarity and organization.
- **Deleting a Project without considering working directory fallout.** When a Project is deleted, its Loops lose the Project's directory. If Loops relied on it without an explicit `cwd`, they may execute in an unexpected directory after reassignment.
- **Assuming Project deletion deletes Loops.** Loops are reassigned, not deleted. If you want Loops to stop, stop them before deleting the Project.
- **Assuming Project deletion affects Tasks.** Tasks are global and unaffected by Project changes.
- **Expecting Project-scoped isolation of side effects.** Two Loops in different Projects can still interfere through shared external state.

## Cross-Skill References

- For Loop cadence, iteration scheduling, and chain execution, load **`loop-task-loops`**.
- For Task execution, chaining, context, and conditions, load **`loop-task-tasks`**.
- For Project-specific examples and edge cases, see [references/examples.md](references/examples.md).
