## Why

`src/board/` is excluded from both `tsconfig.json` and `tsconfig.build.json`, yet it is NOT dead code, `cli.ts:227` imports `./board/format.js` at runtime. 43 files (5,677 lines) are maintained in parallel without type-checking, and ~425 lines are 100% identical copies between `src/tui/` and `src/board/`. This duplication has already caused wasted effort (dual fixes for CodeEditorModal, LogModal, etc.) and will continue to diverge.

## What Changes

- Extract shared UI utilities (`format.ts`, `state.ts`, `router.ts`, `useBreakpoint.ts`, `useHoverState.ts`, `useLogStream.ts`, `useLoopPolling.ts`) from both `tui/` and `board/` into `src/shared/ui/`
- Create `src/shared/format.ts` for format functions used by both TUI and CLI (`describeLoop`, `statusLabel`, `commandLine`, `formatCmd`, `truncate`, `quoteArg`, `unescapeCommand`)
- Fix `cli.ts` import from `./board/format.js` to the new shared location
- Delete `src/board/` entirely
- Remove `src/board` from tsconfig excludes
- Update project guardrails to remove "board is dead code" section

## Capabilities

### New Capabilities
- `shared-ui-layer`: Shared UI utilities and format functions extracted from tui/ and board/ into src/shared/ui/, providing a single source of truth for format helpers, state utilities, router, and hooks used by both TUI and CLI

### Modified Capabilities
- `code-editor`: CodeEditorModal and CodeEditorPreview will import from src/shared/ui/ instead of local copies; board duplicate deleted

## Non-goals

- Refactoring the TUI components themselves (only moving shared code out)
- Changing the IPC contract or persisted state shape
- Adding new features or changing behavior

## Impact

- All files in `src/tui/` that import the shared utilities will update their import paths
- `cli.ts` changes its format import from `./board/format.js` to `./shared/format.js`
- `src/board/` directory deleted entirely (~43 files, 5,677 lines removed)
- `tsconfig.json` and `tsconfig.build.json` excludes updated
- Project guardrails skill updated
- No API, IPC, or persistence changes
