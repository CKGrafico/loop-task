## Context

The daemon currently starts an `HttpApiServer` unconditionally on boot (`src/daemon/index.ts:37-41`). Users who never use the REST API have no way to turn it off. Additionally, the API lacks endpoints for browsing run history by date and fetching log output between two timestamps — both common operational queries for loop monitoring.

The existing log model: each loop writes to `<logPath>.log`, rotated at `MAX_LOG_BYTES` into `.1`, `.2`, `.3`. Each `RunRecord` stores `logOffset`, `logSize`, `startedAt`, `runNumber`, and chain fields (`chainGroupId`, `chainName`). Runs within a chain share the same `runNumber`.

Settings persistence already follows a pattern: `loops.json`, `tasks.json`, `projects.json` in `getDataDir()`. A `settings.json` file fits the same mold.

## Goals / Non-Goals

**Goals:**
- Add `GET /api/loops/:id/runs` endpoint returning run history filtered by optional `from`/`to` ISO date params.
- Add `GET /api/loops/:id/logs/date?from=...&to=...` endpoint returning all log bytes from runs that started within the date range.
- Add `GET /api/settings` and `PATCH /api/settings` endpoints for reading/toggling `httpApiEnabled`.
- Persist settings to `~/.loop-cli/settings.json` with `httpApiEnabled: true` default.
- Daemon only starts HTTP server when enabled; toggling at runtime stops/starts it live.
- TUI board `toggle-api` command + `Ctrl+G` shortcut to flip the setting.

**Non-Goals:**
- Authentication, TLS, or non-localhost binding.
- Per-loop API enable/disable.
- API key management or rate limiting.

## Decisions

### D1: Settings as a separate `SettingsManager` class (not in `LoopManager`)

**Decision**: Create `src/daemon/settings-manager.ts` with a `SettingsManager` class that owns `settings.json` load/save and exposes `get()`, `set()`, and an `onChange` callback.

**Rationale**: `LoopManager` already manages loops; mixing settings there violates SRP. The file pattern matches `ProjectManager` for projects.json.

**Alternative considered**: Putting settings inside `LoopManager.getMeta()` — rejected because settings are daemon-global, not per-loop.

### D2: Settings model: `{ httpApiEnabled: boolean }` with forward-compatible shape

**Decision**: `DaemonSettings` interface in `src/types.ts`:
```typescript
export interface DaemonSettings {
  httpApiEnabled: boolean;
}
```

**Rationale**: Start with one field. Future settings (log level, poll interval) can be added without migration. `settings.json` missing file → default `{ httpApiEnabled: true }`.

### D3: Runtime toggle restarts the HTTP server

**Decision**: When `httpApiEnabled` changes from `true → false`, call `httpServer.close()`. When `false → true`, call `httpServer.listen()`. The `HttpApiServer` already supports `close()` + `listen()` as a lifecycle pair.

**Rationale**: Simpler than rejecting requests when disabled. No zombie listeners.

### D4: Date-filtered log endpoint uses `RunRecord.startedAt` + `logOffset` ranges

**Decision**: `GET /api/loops/:id/logs/date?from=ISO&to=ISO` filters `runHistory` where `new Date(r.startedAt)` falls in `[from, to]`. Then reads the log file byte ranges using the same offset/sort algorithm as `handleRunLog` in `server.ts:293-330`.

**Rationale**: Reuses the existing `logOffset` → `logSize` model. No need to parse log timestamps from file content (expensive and fragile). Chain records that share `runNumber` are already covered since each has its own `logOffset`.

### D5: IPC contract additions: `settings-get` and `settings-set`

**Decision**: Add to `IpcRequest`:
```typescript
| { type: "settings-get" }
| { type: "settings-set"; payload: { httpApiEnabled?: boolean } }
```

**Rationale**: TUI needs IPC to reach the daemon's `SettingsManager`. HTTP API endpoints read `SettingsManager` directly (same process), no IPC needed.

### D6: TUI command `toggle-api` + `Ctrl+G` repurposed

**Decision**: The existing `api` command (shows API URL toast) stays. New `toggle-api` command flips `httpApiEnabled` via IPC. `Ctrl+G` changes from "show API info" to "toggle API". The `api` command remains accessible via the command palette.

**Alternative considered**: Keeping `Ctrl+G` as "show info" and binding toggle to a different key — rejected because showing a URL is low-value; toggling is the actionable operation users want.

### D7: Settings service via DI for TUI

**Decision**: Add `SettingsService` interface to `src/shared/services/types.ts` with `get()` and `setHttpApiEnabled()` methods. `IpcSettingsService` implementation sends IPC requests. Inject via inversify like other services.

**Rationale**: Consistent with `LoopService`, `TaskService`, etc. TUI never touches filesystem settings directly.

## Risks / Trade-offs

- **[Risk] Toggle while SSE clients connected** → `httpServer.close()` destroys all SSE connections gracefully (already does for `sseClients` set in `close()`).
- **[Risk] `settings.json` corruption** → `SettingsManager.load()` catches parse errors and falls back to defaults, same pattern as `ProjectManager.loadProjects()`.
- **[Risk] Date filter returns huge log payload** → Acceptable for localhost; future enhancement could add pagination, but out of scope.
- **[Trade-off] `Ctrl+G` behavior changes** → Users who relied on the old "show URL" toast will see a toggle toast instead. The `api` command still shows the URL.
