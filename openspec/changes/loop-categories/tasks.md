## 1. Data Model & IPC

- [ ] 1.1 Add `categories: string[]` to `LoopOptions` and `LoopMeta` in `src/types.ts`, default `[]` in backward-compat <!-- agent: development-engineer, modeltype: build -->
- [ ] 1.2 Add `list-categories`, `rename-category`, `delete-category` to `IpcRequest` discriminated union in `src/types.ts` <!-- agent: development-engineer, modeltype: build -->
- [ ] 1.3 Update `src/daemon/manager.ts` — propagate `categories` in `toMeta()` and `init()`, add `listCategories()`, `renameCategory()`, `deleteCategory()` methods <!-- agent: development-engineer, modeltype: build -->
- [ ] 1.4 Update `src/daemon/server.ts` — route `list-categories`, `rename-category`, `delete-category` IPC messages to manager methods <!-- agent: development-engineer, modeltype: build -->
- [ ] 1.5 Update `src/daemon/state.ts` — handle missing `categories` field in `loadAllLoops()` with default `[]` <!-- agent: development-engineer, modeltype: fast -->
- [ ] 1.6 Update `src/board/daemon.ts` — add `listCategories()`, `renameCategory()`, `deleteCategory()` IPC client wrappers <!-- agent: development-engineer, modeltype: build -->

## 2. Board State & Filtering

- [ ] 2.1 Add `category: string` to `Filters` type in `src/board/state.ts`, default `"all"` <!-- agent: development-engineer, modeltype: fast -->
- [ ] 2.2 Update `applyLoopFilters` in `src/board/state.ts` — add category matching (loop must contain the filter category), include category names in text search haystack <!-- agent: development-engineer, modeltype: build -->
- [ ] 2.3 Add `"category"` to `SortMode` union and implement category sort in `cycleSortMode` and `applyLoopFilters` (sort by first category, uncategorized last) <!-- agent: development-engineer, modeltype: build -->

## 3. Board UI — Existing Components

- [ ] 3.1 Update `src/board/components/FilterBar.tsx` — add category filter badge, `onCategoryCycle` prop, mouse click support <!-- agent: development-engineer, modeltype: build -->
- [ ] 3.2 Update `src/board/components/Navigator.tsx` — show category badges `[cat1,cat2]` before description, truncate to fit <!-- agent: development-engineer, modeltype: build -->
- [ ] 3.3 Update `src/board/components/CreateForm.tsx` — add `categories` field to `createFields`, comma-separated input, parse on submit <!-- agent: development-engineer, modeltype: build -->
- [ ] 3.4 Update `src/board/components/DetailView.tsx` — display categories as comma-separated list <!-- agent: development-engineer, modeltype: fast -->
- [ ] 3.5 Update `src/board/App.tsx` — wire category filter, sort, add `"categories"` view routing, pass `onCategoryCycle` to FilterBar <!-- agent: development-engineer, modeltype: build -->

## 4. Board UI — Categories Page

- [ ] 4.1 Create `src/board/components/CategoriesView.tsx` — list categories with loop counts, rename and delete actions, Escape to return <!-- agent: development-engineer, modeltype: build -->
- [ ] 4.2 Add `g` keybinding for categories page in `src/board/hooks/useBoardKeybindings.ts` <!-- agent: development-engineer, modeltype: fast -->

## 5. i18n

- [ ] 5.1 Add all category-related strings to `src/i18n/en.json` (labels, hints, placeholders, page title, confirm messages) <!-- agent: development-engineer, modeltype: fast -->

## 6. Verification
- [ ] 6.1 Run `npm run typecheck` and fix any errors <!-- agent: development-engineer, modeltype: fast -->

- [ ] 6.2 Run `npm run lint` and fix any errors <!-- agent: development-engineer, modeltype: fast -->

- [ ] 6.3 Run `npm run test` and fix any failures <!-- agent: development-engineer, modeltype: fast -->