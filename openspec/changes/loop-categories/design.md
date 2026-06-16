## Context

loop-cli has no concept of grouping or tagging loops. Users with many loops rely solely on status filtering and free-text search across command/id/status fields. The persisted data model (`LoopMeta`) and IPC contract (`IpcRequest`/`IpcResponse`) have no category field. State is stored as individual JSON files per loop (`loops/<id>.json`) with no schema migration system.

## Goals / Non-Goals

**Goals:**
- Each loop can be tagged with zero or more user-defined categories
- Users can create, rename, and delete categories from a dedicated categories page
- Users can filter the loop list by category and sort by category
- Categories are visible in Navigator rows, DetailView, and editable in CreateForm
- Category names are included in text search results
- Backward-compatible: existing loop files without `categories` field work with default `[]`

**Non-Goals:**
- Nested/hierarchical categories (only flat tags)
- Category colors or icons
- Category persistence separate from loops (categories are derived from loop data)
- CLI flags for categories (board-only for now)
- Import/export of categories

## Decisions

### 1. Categories as `string[]` on LoopMeta and LoopOptions

Add `categories: string[]` to both `LoopOptions` (input) and `LoopMeta` (persisted). Default `[]` for backward compat.

**Rationale:** Simple, no new persistence layer. Categories are just strings — no separate entity table needed. The list of all categories is derived by scanning all loops.

**Alternative considered:** Separate `categories.json` file. Rejected — adds a second source of truth that can drift from loop data.

### 2. Categories page derives list from loops (no separate persistence)

The categories page calls `list-categories` IPC which scans all loaded loops, collects unique category names, and returns them sorted. No `categories.json` file. Creating a category = tagging a loop with it. Deleting a category = removing it from all loops. Renaming = replacing the string across all loops.

**Rationale:** Single source of truth. No sync issues. The daemon already has all loops in memory — scanning is O(n) and fast.

### 3. Category filter in FilterBar

Add a `category` filter to the `Filters` type (value: `"all" | string). The FilterBar gets a third badge showing the active category filter, cyclable via `c` key or mouse click. FilterBar receives `onCategoryCycle` prop.

**Rationale:** Consistent with existing status filter pattern.

### 4. Categories in Navigator

Show a truncated list of category badges before the description column. Format: `[cat1,cat2]` truncated to fit.

**Rationale:** Categories should be visible at a glance in the loop list.

### 5. Categories field in CreateForm

Add a `categories` field to `createFields` array. Input is comma-separated text. Parsed to `string[]` by splitting on commas and trimming whitespace.

**Rationale:** Simplest TUI input for multi-value. No multi-select widget in OpenTUI.

### 6. IPC: category operations

Add `list-categories`, `rename-category`, `delete-category` to `IpcRequest`. These are bulk operations best done atomically in the daemon.

## Risks / Trade-offs

- **Category scanning is O(n)** → Fast for hundreds of loops. Can cache if needed.
- **Renaming touches all loop files** → Acceptable for small-to-medium counts.
- **No category validation** → Any string is valid. Empty strings and duplicates are stripped on save.
- **Comma-separated input** → Users may enter inconsistent spacing. Mitigated by trimming.
