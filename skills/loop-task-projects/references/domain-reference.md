# Project Domain Reference

Exhaustive reference for every meaningful Project property and behaviour.

## Core Properties

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

| Property | Value |
|---|---|
| id | `"default"` |
| name | `"Default"` |
| color | `"#ffffff"` (white) |
| isSystem | `true` |
| directory | `""` (falls through to process cwd) |

### Invariants

- It always exists and cannot be deleted.
- Its `name` and `color` cannot be changed.
- Its `directory` can be changed.
- It receives Loops from deleted Projects through reassignment.

## Project Color Palette

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

1. If the Loop has an explicit `cwd`, use it.
2. If the Loop has no `cwd`, use the Project's `directory`.
3. If the Project's `directory` is empty, use the runtime's process working directory.

Resolution happens at **Task execution time**. Changing a Project's `directory` affects all Loops in that Project that lack an explicit `cwd`.

## Deletion and Reassignment

When a non-system Project is deleted:

| Affected entity | Behaviour |
|---|---|
| Loops in the deleted Project | `projectId` changed to `"default"` |
| Loops' `cwd` | Unchanged (if explicit; otherwise falls back to default Project's directory) |
| Tasks | Unaffected (not scoped to Projects) |
| Run history | Preserved on reassigned Loops |
| The deleted Project | Permanently removed; cannot be restored |

### Side effect on working directory

If a Loop relied on the deleted Project's `directory` without an explicit `cwd`, it now falls back to the default Project's directory (or process cwd). This may cause Tasks to execute in an unexpected directory.

## What Projects Do Not Provide

| Capability | Does not exist |
|---|---|
| Per-Project variables or environment variables | Use Task `context` or external secret management |
| Per-Project credentials or secrets | Use external secret management |
| Project-scoped access control | All Loops are accessible regardless of Project |
| Execution isolation between Projects | Loops in different Projects can access the same resources |
| Project-scoped Task namespaces | Tasks are global |
| Project hierarchy or nesting | Projects are flat |
| Project-level concurrency limits | Concurrency is per-Loop |
