## Context

loop-task currently manages all loops as a flat list. The board displays them without scope or grouping. As users manage more loops (10+), navigation and filtering become unwieldy. The proposal introduces Projects as a lightweight organizational layer—no breaking changes, backward compatible via auto-migration.

Current architecture: client–daemon IPC (JSON-lines over socket), filesystem state (~/.loop-cli). LoopMeta is the persisted loop entity. Board polls `list` RPC every 2s and filters client-side. Create/Edit forms are modal-driven on the board.

## Goals / Non-Goals

**Goals:**
- Partition loops into logical projects without breaking existing functionality
- Enable single-project view with visual project identification (color bullets)
- Provide a dedicated management UI (Navigator + Inspector style) for CRUD
- Auto-migrate existing loops to "Default" project seamlessly
- Support context-aware project pre-selection during loop creation
- Allow flexible project deletion with cascade-to-Default (no orphans)

**Non-Goals:**
- Bulk move or edit operations across loops
- Project permissions, sharing, or multi-user logic
- Nested or hierarchical projects
- Server-side project filtering (client-side sufficient)
- Project-specific hooks, task chaining, or scheduling behavior

## Decisions

### 1. Single-Select Project Filter (not Multi-Select)

**Decision**: Board shows loops from exactly one selected project at a time (radio-button filter, not checkboxes).

**Rationale**: Simpler mental model and UI logic. "Current project" aligns with user context (e.g., "I'm working on Frontend now"). Single view eliminates the need to reason about "which loops are visible right now?" with overlapping selections.

**Alternative Considered**: Multi-select (show loops from multiple projects). More flexible but adds state complexity, filter-AND logic, and a larger modal with dual-focus (search + multi-select). Not needed for v1.

**Implementation**: Projects modal uses OpenTUI `<radio>` (not `<checkbox>`). Board state holds `currentProjectId: string`. Client-side filter: `visible = loops.filter(l => l.projectId === currentProjectId)`.

---

### 2. Project Entity: Fixed Color Palette

**Decision**: Projects have a color field from a fixed palette (white/cyan/orange/green/red/yellow). No color picker input; users select from the list during create.

**Rationale**: Fixed palette is simpler, predictable, and avoids UI complexity of a full color picker in a terminal. Six colors are enough to distinguish 10–20 projects. Color appears as a mini bullet point (●) before loop description on the board—quick visual grouping.

**Alternative Considered**: User-defined colors (HSL picker). Too complex for terminal UI; fixed palette sufficient for v1.

**Implementation**: Color value is a hex string in Project entity. Board displays it via OpenTUI `fg` property on the bullet character.

---

### 3. Cascade Delete: Move Loops to Default (Never Hard Delete)

**Decision**: When a project is deleted, its loops are reassigned to "Default" (cascade-move). No cascade-delete.

**Rationale**: Preserves user data; never silently deletes loops. "Default" is a safe sink for any orphaned loops. Matches user expectation: "I deleted the project, not my loops."

**Alternative Considered**: Refuse delete if loops exist (protect with confirmation). Works, but less friendly. Cascade-delete is too destructive.

**Implementation**: `project-delete` RPC handler: loop through loops, find those with matching `projectId`, update each with `projectId = "default"`, then remove the project.

---

### 4. Default Project: Immutable (no edit, no delete)

**Decision**: "Default" project is marked `isSystem: true`, `isDefault: true`, color is always white. Cannot be renamed, color changed, or deleted.

**Rationale**: "Default" is the sink for orphaned/migrated loops and a safety net. Users should never lose it. Immutability prevents accidents.

**Alternative Considered**: Allow rename/color change on Default. Risk: user renames it and loses mental model of "default bucket."

**Implementation**: In Manage Projects page, Default project's edit/delete buttons are hidden or grayed. Create form always defaults to "Default" if no project is selected.

---

### 5. Persistence: New Directory, Auto-Migration

**Decision**: Projects persisted in `~/.loop-cli/projects/<id>.json` (new directory, one file per project). On first load post-upgrade, migrate: if `projects/` is empty, create "Default" and assign all loops with missing `projectId` to it.

**Rationale**: Follows existing persistence pattern (one JSON file per entity). Migration is one-time, seamless, and reversible (users can downgrade). Auto-recovery: if projects/ is corrupted, recreate "Default" and reassign orphaned loops.

**Alternative Considered**: Store projects inline in a single metadata file. Harder to scale and less modular.

**Implementation**: `daemon/state.ts` adds `loadProjects()`, `saveProject()`, `deleteProject()`. `manager.ts` calls `migrateLoops()` on init if needed.

---

### 6. IPC Changes: New RPC Messages

**Decision**: Add four new RPC request/response types to src/types.ts:
- `project-list` → list all projects
- `project-create` → create new project (name + color)
- `project-update` → rename project (id + name)
- `project-delete` → delete project (id); auto-cascade loops to Default

Existing `list` RPC unchanged—returns all loops (client-side filters by `currentProjectId`).

**Rationale**: Separation of concerns. Loop and project operations are distinct. Client-side filtering reduces server load and keeps server stateless.

**Alternative Considered**: Add `projectId` filter to `list` RPC (server-side filtering). More complex server logic; overkill for current scale.

**Implementation**: src/daemon/server.ts adds handlers for the four new types. src/board/daemon.ts wraps them with typed `async` functions.

---

### 7. UI: Manage Projects as a Separate Page (not Modal)

**Decision**: "Manage Projects" is a full separate page, navigable from the main board via a button (like "View Tasks"). Uses Navigator + Inspector layout (list on left, details on right).

**Rationale**: Matches existing patterns (Task browser). Feels substantial enough to warrant a page vs. a quick modal. More screen real estate for project list if users have many projects.

**Alternative Considered**: Modal overlay on board. Faster access but limited screen space; page is more comfortable for CRUD.

**Implementation**: New `src/board/components/ProjectsPage.tsx`. Board's `view` state gains `"manage-projects"` mode. Navigation via button or keyboard shortcut.

---

### 8. Loop Creation: Context-Aware Project Pre-Selection

**Decision**: Create/Edit Loop form's project dropdown is pre-filled based on context:
- If editing, use the loop's current project
- If creating from the board (when viewing "Frontend"), auto-select "Frontend"
- If creating from CLI or no context, default to "Default"

**Rationale**: Reduces friction. Most loops are created in context (you're working on Frontend, so create a Frontend loop).

**Alternative Considered**: Always default to "Default" (simpler, no context coupling). Less user-friendly.

**Implementation**: Create/Edit form component receives `contextProjectId` prop from App. Dropdown defaultValue uses it if provided.

---

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| **Thousands of projects** → Projects modal becomes slow or confusing | Search bar, scroll, pagination if needed (v2). For v1, assume < 100 projects. |
| **Deleted project file, loops orphaned** | Auto-recovery on daemon load: recreate "Default", reassign orphaned loops, warn user. |
| **User deletes "Default" by accident (UI bug)** | Delete button hidden; RPC handler refuses deletion if `isDefault === true`. |
| **Corrupted project JSON file** | daemon/state.ts skips corrupted projects, logs error, continues. Orphaned loops reassigned to Default. |
| **Color palette too small** → Users want more colors | Defer to v2. Fixed palette is sufficient for MVP. |
| **Single-select filter feels limiting** | Can add multi-select in v2. Single-select keeps v1 simple and focused. |

## Migration Plan

1. **On first daemon load post-upgrade**:
   - Check if `~/.loop-cli/projects/` exists. If not, create it.
   - Create "Default" project: `{ id: "default", name: "Default", color: "#ffffff", isSystem: true, isDefault: true }`.
   - Scan all loops in `~/.loop-cli/loops/*.json`.
   - For each loop without a `projectId`, add `projectId: "default"` and re-save.
   - Daemon logs: "Migrated X loops to Default project."

2. **No downtime or user intervention**. Upgrade is seamless.

3. **Rollback**: Remove projects/ directory, strip `projectId` from loops. Old daemon works as before.

## Open Questions

1. **Search in Projects modal**: Should it be case-insensitive prefix match or full fuzzy search? (Assumption: prefix match, case-insensitive, simpler to implement.)

2. **Empty projects visibility**: Should empty projects appear in the modal and Manage page? (Assumption: yes, show all. Allows users to see and manage the empty state.)

3. **Color bullet style**: Single character (●) or something else? (Assumption: single bullet, compact.)

4. **Default project color immutability**: Should color be locked to white, or just the name? (Assumption: both locked; "Default" is always white, reinforces identity.)
