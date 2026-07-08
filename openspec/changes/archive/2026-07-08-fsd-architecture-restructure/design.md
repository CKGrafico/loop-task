## Context

The project has completed DI container setup (#37), App.tsx decomposition (#36), and board cleanup (#35). The internal code is cleaner, but the directory layout remains flat and ad-hoc. The FSD skill was installed specifically to guide this restructuring.

Current flat structure:
- `src/tui/components/` — 34 files, no grouping
- `src/tui/utils/`, `src/hooks/`, `src/shared/` — overlapping utility locations
- `src/daemon/` — HTTP server (672 lines), IPC server, state, managers, file watcher, spawner all flat
- `src/core/` — loop-controller (599 lines), command-runner, scheduling, logging, context, foreground all flat

No dependency direction is enforced. Business logic leaks into UI and vice-versa.

## Goals / Non-Goals

**Goals:**
- Establish FSD layer structure for the TUI/frontend: `app → widgets → features → entities → shared`
- Enforce one-way dependency flow between FSD layers
- Reorganize `daemon/` and `core/` with domain-grouped subdirectories
- Split oversized files (`http-server.ts` 672 lines, `loop-controller.ts` 599 lines) to ≤300 lines
- Consolidate shared infrastructure into `src/shared/`
- Update project guardrails with new conventions
- All builds/tests pass with zero errors

**Non-Goals:**
- Adding new features or changing behavior
- Applying FSD to `daemon/`, `core/`, or `client/` — those follow their own internal grouping
- Changing the IPC contract (`src/types.ts`)
- Changing persisted state shapes
- Introducing barrel exports or index files beyond what already exists

## Decisions

### 1. FSD layer model for frontend, flat domain grouping for backend

**Decision**: Apply full FSD methodology to `src/tui/` (becomes `app/`, `widgets/`, `features/`, `entities/`, `shared/`). Backend (`daemon/`, `core/`, `client/`) gets domain-grouped subdirectories but NOT FSD layers.

**Rationale**: FSD is a frontend architecture methodology. The daemon and core are Node.js backend modules where domain grouping (by concern) is more natural than UI layering.

**Alternatives considered**:
- Apply FSD to everything — rejected: daemon/core have no UI widgets, features, or entities in the FSD sense
- Keep flat — rejected: files are already too large and finding things is difficult

### 2. Batch migration with git mv, then fix imports

**Decision**: Move all files first using `git mv`, then fix all broken imports in a second pass. Commit after each phase passes `tsc --noEmit`.

**Rationale**: Trying to move and fix imports one file at a time creates an ever-shifting target. Batch moves give a clean snapshot of what needs fixing.

**Alternatives considered**:
- Move one widget at a time — rejected: too many small commits, each with broken intermediate states
- Use codemods for import rewriting — rejected: the import paths are diverse enough that manual/careful rewrite is more reliable

### 3. Splitting http-server.ts by HTTP method groups

**Decision**: Split `http-server.ts` (672 lines) into separate files per route group: loop routes, task routes, project routes, config/health routes, plus a shared server setup file.

**Rationale**: Route-group splitting keeps related handlers together while staying under 300 lines. Each route file is self-contained.

### 4. Splitting loop-controller.ts by concern

**Decision**: Split `loop-controller.ts` (599 lines) into: `LoopController` (orchestrator, ≤300 lines), `ChainExecutor` (chain execution logic), `LoopState` (state management), keeping scheduling separate.

**Rationale**: The three concerns (orchestration, chain execution, state management) are already mixed in the single file.

### 5. `src/shared/` as the bridge layer

**Decision**: `src/shared/` holds: `container/` (DI), `services/` (service interfaces + IPC impls), `ui/` (format, theme, hooks), `utils/` (clipboard, sleep, tail, fs-utils, paste, syntax), `config/` (constants, paths), `i18n/` (en.json).

**Rationale**: These are already partially in `src/shared/`. Consolidating the scattered hooks and utils eliminates the ambiguity of "where does this utility go?"

### 6. No barrel exports

**Decision**: Do not add `index.ts` barrel files to each widget/feature/entity directory. Consumers import directly from the file.

**Rationale**: Barrel exports create circular dependency risks, break tree-shaking, and add maintenance burden. Direct imports are explicit and clear.

## Risks / Trade-offs

- **[Bulk import rewrite risk]** → Mitigate by running `tsc --noEmit` after each phase; never commit with broken TS
- **[Test breakage]** → Mitigate by running `pnpm test` after each phase; test imports need same fixes
- **[Merge conflicts with other branches]** → Mitigate by doing this on a feature branch; others merge main first
- **[Oversized files may not split cleanly to ≤300 lines]** → If a split results in awkward coupling, allow up to 350 lines with a TODO comment
- **[FSD layer rules not enforced by tooling]** → Document in project guardrails; can add eslint import rules later
