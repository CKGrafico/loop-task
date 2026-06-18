## Why

Users manage growing numbers of loops across different areas (Frontend, Backend, Infrastructure, etc.). Without project scoping, the board becomes a flat list that's hard to navigate and filter. Projects enable users to focus on one area at a time, reducing cognitive load and improving usability for teams and power users managing 10+ loops.

## What Changes

- **Projects entity**: New first-class entity (Project) with name and color metadata, persisted alongside loops
- **Single-project view**: Board displays loops from only one selected project (single-select radio filter, key `c`). Default project is "Default" (white, immutable)
- **Project-scoped loop creation**: New loops automatically assigned to the currently viewed project; users can reassign via dropdown during create/edit
- **Project management page**: New page (navigable from board) for CRUD operations on projects: create, rename (Default excluded), delete (with cascade to Default)
- **Color coding**: Projects have a fixed color palette (white/cyan/orange/green/red/yellow); a mini bullet point precedes loop descriptions on the board for visual project identification
- **Migration**: Existing loops (v1.2) auto-assigned to "Default" project on first load; seamless upgrade

## Capabilities

### New Capabilities
- `project-entity`: Project model (id, name, color, createdAt, isSystem flag) with persistence and CRUD operations
- `project-filtering`: Single-select project filter modal on board (key `c`) with live search and loop count display
- `project-scoped-loops`: Loops belong to exactly one project; assignment during creation with context-aware defaults
- `project-management-ui`: Separate management page for project CRUD (list, create, edit name, delete with cascade)
- `project-color-system`: Fixed palette of colors with visual representation (bullets) on board rows

### Modified Capabilities
- `loop-entity`: LoopMeta gains `projectId` field (FK to Project.id); defaults to "default" on creation
- `loop-persistence`: ~/.loop-cli/loops/ state includes projectId; migration adds it to existing loops
- `loop-creation`: Create/Edit Loop form adds project dropdown (required field, auto-filled from current context)
- `ipc-protocol`: New RPC messages for project operations (list, create, update, delete)

## Impact

- **Data model**: `LoopMeta` + new `Project` entity; persisted state shape change (non-breaking, migration included)
- **IPC contract** (src/types.ts): New discriminated union members for project RPC requests/responses
- **Board UI**: New "Projects" filter button/modal; color bullets in Navigator rows; board title updated to show selected project
- **Forms**: Create/Edit Loop form gains required project dropdown; Manage Projects page added to main nav
- **i18n**: ~50 new keys (project modal labels, CRUD dialogs, menu items)
- **Cross-platform**: No platform-specific behavior; works on POSIX and Windows
- **Backward compatible**: Auto-migration; all existing loops work without user action

## Non-Goals

- Bulk move of loops between projects (v2)
- Project permissions/sharing (local single-user tool)
- Nested or hierarchical projects (v2)
- Project archives or soft-delete (v1)
- Server-side project filtering (client-side filtering sufficient for current scale)
- Project-specific hooks or chaining logic (separate concern)
