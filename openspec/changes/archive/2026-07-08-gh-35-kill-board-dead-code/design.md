## Context

`src/board/` (43 files, 5,677 lines) is excluded from both tsconfig files yet `cli.ts` imports `./board/format.js` at runtime. Six files are 100% identical copies between `tui/` and `board/`. The TUI and CLI both depend on format functions (`describeLoop`, `statusLabel`, etc.) but import them from different locations.

## Goals / Non-Goals

**Goals:**
- Single source of truth for shared UI utilities and format functions
- Delete `src/board/` entirely
- Fix `cli.ts` to import from shared location
- `tsc --noEmit`, `pnpm test`, `pnpm build` all pass

**Non-Goals:**
- Refactoring TUI component internals
- Changing IPC contract or persisted state
- Adding new features or behavioral changes

## Decisions

### 1. Shared location: `src/shared/` (FSD-aligned)

Place shared code in `src/shared/` per Feature-Sliced Design conventions:
- `src/shared/format.ts` — format functions used by both CLI and TUI
- `src/shared/ui/` — UI utilities: `state.ts`, `router.ts`, hooks (`useBreakpoint.ts`, `useHoverState.ts`, `useLogStream.ts`, `useLoopPolling.ts`), `format.ts` (UI-specific format helpers if any differ from CLI format)

**Rationale**: FSD places shared, reusable code in the `shared` layer. Format functions are used by CLI (non-React) and TUI (React), so they belong in `shared/` not `shared/ui/`. UI-specific state/hooks belong in `shared/ui/`.

**Alternative considered**: Keep format in `src/shared/ui/format.ts` — rejected because CLI does not import UI code.

### 2. TUI format.ts split

`tui/format.ts` contains both pure formatting functions (used by CLI) and potentially TUI-specific formatting. The pure formatting functions move to `src/shared/format.ts`. Any TUI-only formatting stays in `tui/format.ts` and re-exports from `shared/format.ts` if needed.

### 3. Re-export strategy

TUI files that previously imported from `./format`, `./state`, `./router`, `./hooks/*` will update imports to `@/shared/format`, `@/shared/ui/state`, etc. No re-export shims — direct import updates only.

### 4. Board deletion order

1. Extract shared code first
2. Update all tui/ imports to shared
3. Fix cli.ts import
4. Delete src/board/
5. Remove tsconfig excludes
6. Update guardrails

This order ensures the build never breaks mid-refactor.

## Risks / Trade-offs

- **Missed board consumer** → grep for all `from.*board` imports before deletion; `tsc --noEmit` will catch any missed ones
- **Circular dependency in shared/** → shared/ must not import from tui/ or any higher FSD layer; enforce via review
- **Test breakage** → run `pnpm test` after each phase; shared code is pure functions, low risk
