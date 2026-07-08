## Why

The project's directory layout is ad-hoc: `src/tui/components/` has 36 flat files, `src/daemon/` mixes HTTP server (672 lines) with IPC/state/managers, `src/core/` is flat with a 599-line `loop-controller.ts`, and shared utilities are scattered across `src/hooks/`, `src/tui/utils/`, and `src/shared/`. After issues #35-#37 clean up the internals, the directory structure itself remains unprincipled. Adopting Feature-Sliced Design layers for the TUI frontend and reorganizing daemon/core into subdirectories gives a scalable, navigable architecture.

## What Changes

- Adopt FSD layer structure (app, widgets, features, entities, shared) for `src/tui/` files
- Move `src/tui/components/*` into `src/widgets/<name>/` directories (header, left-panel, right-panel, command-input, log-modal, task-form, loop-form, project-form, commands-browser, etc.)
- Move command handlers, shortcuts, overlays, forms, code-editor into `src/features/<name>/`
- Extract entity types/filters/sort from `src/tui/state.ts` into `src/entities/<loops|tasks|projects>/`
- Relocate `src/hooks/useLoopFormValidation.ts`, `src/tui/utils/*`, `src/tui/format.ts`, `src/tui/theme.ts`, `src/tui/hooks/*` into `src/shared/` subdirectories
- Move `src/tui/index.tsx` + App composition root to `src/app/`
- Split `src/daemon/http-server.ts` (672 lines) into `src/daemon/http/` with route handlers in separate files
- Split `src/core/loop-controller.ts` (599 lines) into `src/core/loop/` subdirectory
- Reorganize `src/daemon/` into subdirs: `server/`, `http/`, `state/`, `managers/`, `watcher/`, `spawner/`
- Reorganize `src/core/` into subdirs: `loop/`, `command/`, `scheduling/`, `logging/`, `context/`, `foreground/`
- Update project guardrails skill with new structure, FSD dependency rules, import conventions, 300-line file limit

## Capabilities

### New Capabilities
- `fsd-layers`: FSD layer structure (app, widgets, features, entities, shared) for the TUI frontend with strict one-way dependency rules
- `daemon-reorg`: Daemon subdirectory structure (server, http, state, managers, watcher, spawner) with http-server split into route handlers
- `core-reorg`: Core subdirectory structure (loop, command, scheduling, logging, context, foreground) with loop-controller split into smaller modules

### Modified Capabilities
- (None - this is a structural refactor with no spec-level behavior changes)

## Impact

- **All import paths change**: Every file in `src/tui/`, `src/daemon/`, `src/core/` will have updated imports
- **No IPC contract changes**: `src/types.ts` stays at root, untouched
- **No persisted state changes**: LoopMeta, TaskDefinition, Project shapes unchanged
- **No cross-platform impact**: Socket/pipe behavior unchanged
- **Build config**: `tsconfig.build.json` may need path updates if includes/excludes reference old paths
- **Test imports**: All test files importing from moved modules need updated paths
- **Guardrails skill**: Must be updated to reflect new directory structure and rules
