## Context

The project has a flat, ad-hoc directory structure. `src/tui/components/` is 35 files with no grouping. `src/daemon/http-server.ts` is 672 lines mixing route definitions with server setup. `src/core/loop-controller.ts` is 599 lines mixing chain execution, scheduling, and state management. Shared utilities are scattered across `src/hooks/`, `src/tui/utils/`, `src/tui/hooks/`, and `src/shared/`. After issues #35-#37 resolve DI and decomposition, the directory structure remains the final unprincipled area.

The Feature-Sliced Design (FSD) methodology provides a layered architecture for frontend applications with strict one-way dependency rules. This project adapts FSD for its TUI frontend while keeping daemon/core/client as separate backend layers with their own internal organization.

## Goals / Non-Goals

**Goals:**
- Adopt FSD layers (app, widgets, features, entities, shared) for all TUI/frontend code
- Reorganize daemon/ into subdirectories (server, http, state, managers, watcher, spawner)
- Reorganize core/ into subdirectories (loop, command, scheduling, logging, context, foreground)
- No file over 300 lines (except types.ts and en.json)
- Split http-server.ts and loop-controller.ts into focused modules
- All tests continue to pass, tsc --noEmit passes, pnpm build passes
- Update project guardrails with new structure and import conventions

**Non-Goals:**
- No new features or behavior changes
- No changes to the IPC contract (src/types.ts)
- No changes to persisted state shape (LoopMeta, TaskDefinition, Project)
- No changes to the DI container or its interface (that was issue #37)
- No FSD layers for daemon/core/client - they are Node.js backend modules

## Decisions

### 1. FSD layers for TUI only, not daemon/core
**Decision**: Apply FSD (app, widgets, features, entities, shared) only to the TUI/frontend code. Daemon, core, and client follow their own internal subdirectory structure.
**Rationale**: FSD is a frontend architecture methodology. Daemon and core are Node.js backend modules - forcing them into app/widgets/features/entities/shared would be awkward and misleading.
**Alternative**: Apply FSD to everything - rejected because daemon processes don't have "widgets" or "features".

### 2. Strict one-way dependency: app -> widgets -> features -> entities -> shared
**Decision**: Enforce the standard FSD dependency direction. app can import from all layers. widgets can import from features, entities, shared. features can import from entities, shared. entities can import from shared. shared imports nothing from the app.
**Rationale**: This is the core FSD principle. It prevents circular dependencies and makes the dependency graph predictable.
**Enforcement**: Code review + guardrails skill documentation. No automated eslint rule initially (future improvement).

### 3. Public API via index.ts for each slice
**Decision**: Each widget/feature/entity slice exports its public API through an index.ts file. Internal files are not imported directly by other slices.
**Rationale**: Standard FSD practice. Encapsulates implementation details and makes refactoring within a slice safe.

### 4. Entity extraction from state.ts
**Decision**: Extract filter/sort functions and type definitions from `src/tui/state.ts` into `src/entities/loops/`, `src/entities/tasks/`, `src/entities/projects/`. Each entity slice holds its domain types, filter predicates, and sort comparators.
**Rationale**: state.ts mixes UI state management with domain logic. FSD entities are the right place for business domain models.

### 5. Widget grouping by UI section
**Decision**: Group TUI components into widgets by UI section: header, left-panel, right-panel, command-input, log-modal, task-form, loop-form, project-form, commands-browser, etc.
**Rationale**: Widgets in FSD are composed UI blocks. Each panel or major UI section is a natural widget boundary.

### 6. Feature extraction for interactions
**Decision**: Move command handlers, keyboard shortcuts, overlay management, form routing, code-editor, and chain-editor into `src/features/<name>/`.
**Rationale**: Features in FSD represent user interactions. Command dispatch, overlay stack, and form routing are interaction logic, not UI composition.

### 7. http-server.ts split strategy
**Decision**: Extract route handlers from http-server.ts into separate files under `src/daemon/http/routes/`. Keep `src/daemon/http/server.ts` as the server setup + middleware. Route files: `loops.ts`, `tasks.ts`, `projects.ts`, `health.ts`, `ws.ts`.
**Rationale**: 672-line file is a maintenance burden. Route handlers are independently testable. Server setup is ~100 lines.
**Alternative**: Keep as single file with better internal organization - rejected, doesn't meet 300-line limit.

### 8. loop-controller.ts split strategy
**Decision**: Split into `src/core/loop/controller.ts` (main class, ~200 lines), `src/core/loop/chain-executor.ts` (chain execution logic), `src/core/loop/state-manager.ts` (lifecycle state transitions), keeping the public API identical.
**Rationale**: loop-controller.ts mixes three concerns: chain execution orchestration, state transitions, and the main control loop. Each is independently testable.
**Alternative**: Split by method - rejected, methods share state; better to split by concern with the controller orchestrating.

## Risks / Trade-offs

- **[Massive import path changes]** -> Every file in tui/, daemon/, core/ gets new imports. Mitigation:机械的 (mechanical) changes, verified by tsc --noEmit. Do in one PR to avoid partial states.
- **[No automated FSD dependency enforcement]** -> Could accidentally violate layer rules. Mitigation: document in guardrails skill; future eslint-plugin-eslint-fsd rule.
- **[Large PR]** -> Single restructuring PR will touch 100+ files. Mitigation: pure file moves + import updates, no logic changes, easy to review with `git diff --stat` and individual file diffs.
- **[Test path updates]** -> All test imports change. Mitigation: search-and-replace is mechanical, verified by pnpm test.
