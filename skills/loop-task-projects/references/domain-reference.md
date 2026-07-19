# Project Domain Reference

Exhaustive reference for every meaningful Project property and behaviour.

## Core Project Properties

| Property | Meaning | Valid Values | Default | Lifecycle Impact | Edge Cases | Design Guidance |
|---|---|---|---|---|---|---|
| id | Unique identifier | `"default"` for the system project, 8-char hex for others | Auto-generated | Immutable | The `id` `"default"` is reserved | Never create a Project with id "default" manually |
| name | Human-readable label | Non-empty string | Required | Display only; no execution effect | Must be unique across all Projects | Use concise, descriptive names |
| color | Visual identifier for listings and logs | Hex colour string from the predefined palette | `"#ffffff"` for default; must be selected for new Projects | Display only; no execution effect | Invalid hex values should be rejected | Choose distinct colours for frequently viewed Projects |
| directory | Default working directory for the Project's Loops' Tasks | Absolute or relative path string, or empty string | `""` (empty) | Serves as the fallback `cwd` for Loops that do not set their own | If the directory does not exist, Tasks may fail at execution time | Set to the root of the project's repository or workspace |
| isSystem | Whether this is a system-managed Project | true or false | `false` for user-created Projects; `true` for the default Project | System Projects cannot be renamed or deleted | Only the default Project has `isSystem: true` | Do not attempt to create system Projects |
| createdAt | When the Project was created | ISO 8601 string | Auto-generated | Display only | Immutable | None |
| updatedAt | When the Project was last modified | ISO 8601 string | Auto-generated | Display only | Updated on rename, recolor, directory change | None |

## The Default Project

| Property | Value | Meaning |
|---|---|---|
| id | `"default"` | Reserved identifier |
| name | `"Default"` | Fixed name |
| color | `"#ffffff"` | White |
| isSystem | `true` | Cannot be renamed or deleted |
| directory | `""` | No default directory (falls through to process cwd) |

### Invariants of the default Project

- It **always** exists. It cannot be deleted.
- Its `name` **cannot** be changed.
- Its `color` **cannot** be changed.
- Its `isSystem` flag is always `true`.
- Its `directory` can be changed.
- It receives Loops from deleted Projects through reassignment.

## Project Color Palette

The predefined color palette for Projects:

| Hex Code | Colour Name |
|---|---|
| `#ef4444` | Red |
| `#f97316` | Orange |
| `#eab308` | Yellow |
| `#22c55e` | Green |
| `#06b6d4` | Cyan |
| `#3b82f6` | Blue |
| `#8b5cf6` | Violet |
| `#ec4899` | Pink |
| `#6b7280` | Gray |
| `#ffffff` | White |

## Working Directory Resolution

When a Task executes, the working directory is resolved in this order:

1. If the Loop has an explicit `cwd` property, use it.
2. If the Loop has no `cwd`, use the Project's `directory` property.
3. If the Project's `directory` is empty, use the runtime's process working directory.

This resolution happens at **Task execution time**, not at Project or Loop creation time. Changing a Project's `directory` affects all Loops in that Project that do not have an explicit `cwd`.

## Deletion and Reassignment

When a non-system Project is deleted:

| Affected entity | Behaviour |
|---|---|
| Loops in the deleted Project | `projectId` is changed to `"default"` |
| Loops' `cwd` | Unchanged (if it was set, it remains; if it was relying on the Project's directory, the Loop now falls back to the default Project's directory) |
| Tasks | Unaffected (not scoped to Projects) |
| Run history | Preserved on the reassigned Loops |
| The deleted Project | Permanently removed; cannot be restored |

### Side effect of reassignment on working directory

If a Loop in the deleted Project had no explicit `cwd` and relied on the Project's `directory`, the Loop now falls back to the default Project's `directory` (or the process cwd). This may cause Tasks to execute in a different directory than expected.

**Recommendation**: Either set an explicit `cwd` on Loops that depend on a specific directory, or ensure the default Project's `directory` is set appropriately before deleting Projects.

## What Projects Do Not Provide

| Capability | Does not exist in Loop Task |
|---|---|
| Per-Project variables or environment variables | Use Task `context` or the runtime environment |
| Per-Project credentials or secrets | Use external secret management |
| Project-scoped access control | All Loops are accessible regardless of Project |
| Execution isolation between Projects | Loops in different Projects can access the same resources |
| Project-scoped Task namespaces | Tasks are global, not scoped to Projects |
| Project hierarchy or nesting | Projects are flat; no parent-child relationships |
| Project-level concurrency limits | Concurrency is managed per-Loop, not per-Project |
