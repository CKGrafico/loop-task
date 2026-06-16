## Why

Users with many loops have no way to organize them. As the number of loops grows, finding and managing related loops (e.g., "deploy scripts", "health checks", "data syncs") becomes tedious with only status and text-search filters. Categories provide a lightweight tagging system where each loop can belong to multiple user-defined categories.

## What Changes

- Add `categories: string[]` to `LoopOptions` and `LoopMeta` (default `[]` for backward compat)
- Add a new "Categories" page/view in the board where users can create, rename, and delete categories
- Add category filter to the FilterBar (cycle through known categories like the status filter)
- Add category sort mode (sort by category name)
- Show category badges on Navigator rows
- Add categories field to CreateForm (comma-separated input)
- Show categories in DetailView
- Include category names in the text search haystack
- Add `list-categories` IPC operation to the daemon (derive category list from loop data, no separate persistence)

## Capabilities

### New Capabilities
- `loop-categories`: Multi-category tagging for loops, category management page, and category-based filtering/sorting

### Modified Capabilities

## Impact

- **`src/types.ts`**: `LoopOptions` and `LoopMeta` gain `categories: string[]` field. `IpcRequest` gains `list-categories` type. **BREAKING** for IPC clients that deserialize `LoopMeta` (though the field is optional with default `[]`).
- **`src/daemon/state.ts`**: `loadAllLoops` must handle loops without `categories` (backward compat, default `[]`)
- **`src/daemon/manager.ts`**: `toMeta()` and `init()` must propagate `categories`. New `listCategories` handler.
- **`src/daemon/server.ts`**: Route `list-categories` IPC message
- **`src/board/state.ts`**: `Filters` gains `category` field, `applyLoopFilters` adds category matching, text search includes category names
- **`src/board/App.tsx`**: Add "categories" view routing
- **Board components**: FilterBar (category filter), Navigator (category badges), CreateForm (categories field), DetailView (categories display), new CategoriesView component
- **`src/i18n/en.json`**: New strings for categories UI
- **No cross-platform impact**: Categories are string arrays in JSON, no filesystem or OS differences
