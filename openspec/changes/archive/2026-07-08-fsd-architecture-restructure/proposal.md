## Why

The source tree is flat and ad-hoc: 34 components in a single `src/tui/components/` dir, shared utilities scattered across `src/tui/utils/`, `src/hooks/`, and `src/shared/`, and no enforced dependency direction. This makes it hard for new contributors to navigate, easy for business logic to leak into UI, and impossible to enforce layering constraints. Feature-Sliced Design (FSD) gives a principled layer model (`app → widgets → features → entities → shared`) with one-way dependency flow — exactly what the project needs after the recent DI and decomposition work.

## What Changes

- **BREAKING**: All import paths under `src/tui/` change — `src/tui/` directory is removed entirely; files move to FSD layers (`app/`, `widgets/`, `features/`, `entities/`, `shared/`)
- **BREAKING**: `src/daemon/` internal structure changes — flat files move to subdirectories (`server/`, `http/`, `state/`, `managers/`, `watcher/`, `spawner/`)
- **BREAKING**: `src/core/` internal structure changes — flat files move to subdirectories (`loop/`, `command/`, `scheduling/`, `logging/`, `context/`, `foreground/`)
- `http-server.ts` (672 lines) splits into route handler files under `src/daemon/http/`
- `loop-controller.ts` (599 lines) splits into smaller modules under `src/core/loop/`
- `src/hooks/useLoopFormValidation.ts` → `src/shared/hooks/`
- `src/tui/utils/paste.ts`, `syntax.ts`, `validation.ts` → `src/shared/utils/`
- `src/tui/format.ts`, `src/tui/theme.ts` → `src/shared/ui/`
- TUI hooks (`useLoopPolling`, `useLogStream`, `useHoverState`, `useBreakpoint`) → `src/shared/hooks/`
- `src/tui/state.ts` filter/sort functions → entity layers
- `src/tui/router.ts` → `src/app/router/`
- New entity layers: `src/entities/loops/`, `src/entities/tasks/`, `src/entities/projects/`
- New widget layers under `src/widgets/<name>/` for each TUI component group
- New feature layers under `src/features/<name>/` (commands, overlays, forms, code-editor)
- New `src/app/` layer for composition root + providers
- Project guardrails skill updated with new directory structure and FSD rules

## Capabilities

### New Capabilities
- `fsd-layers`: Feature-Sliced Design directory structure with app/widgets/features/entities/shared layers, one-way dependency enforcement, and file size limits (≤300 lines in widgets/features/entities)
- `daemon-reorg`: Daemon internal reorganization into server/http/state/managers/watcher/spawner subdirectories with http-server.ts split
- `core-reorg`: Core internal reorganization into loop/command/scheduling/logging/context/foreground subdirectories with loop-controller.ts split

### Modified Capabilities
- None — this is purely structural; no spec-level behavior changes

## Impact

- **All internal imports change**: every file that imports from `src/tui/`, `src/daemon/`, `src/core/`, `src/hooks/` needs updated paths
- **Build pipeline**: `tsc`, `vitest`, `pnpm build` must all pass with zero errors after migration
- **IPC contract** (`src/types.ts`): unchanged — stays at `src/types.ts` root
- **Persisted state** (`LoopMeta`): unchanged — no state shape changes
- **Cross-platform** behavior: unchanged — no functional changes
- **No new dependencies**: purely a directory restructure
