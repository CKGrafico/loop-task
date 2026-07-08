## Why

The HTTP API is missing several methods users need to fully manage loops over REST: fetching logs by date, listing run history, and stopping/resuming individual run cycles. Additionally, the HTTP API always starts when the daemon boots — there is no way for a user to turn it off from the board if they do not use it. Users who never call the REST endpoints have an open localhost listener they cannot control.

## What Changes

- **New endpoint**: `GET /api/loops/:id/runs` — list run history records for a loop (filtered by date range via `from`/`to` query params).
- **New endpoint**: `GET /api/loops/:id/logs/date?from=...&to=...` — fetch log output produced between two timestamps, computed from `RunRecord.startedAt` and offset ranges.
- **New endpoint**: `GET /api/settings` — return daemon settings including `httpApiEnabled`.
- **New endpoint**: `PATCH /api/settings` — update daemon settings (toggle `httpApiEnabled`).
- **New config file**: `~/.loop-cli/settings.json` — persisted daemon settings (`httpApiEnabled: boolean`, defaults to `true`).
- **Daemon bootstrap**: `HttpApiServer` only starts when `settings.httpApiEnabled` is `true`; toggling at runtime restarts/stops the server.
- **TUI board**: new `toggle-api` command (and `Ctrl+G` shortcut repurposed) to toggle the HTTP API on/off from the board, with toast feedback and i18n strings.
- **OpenAPI spec**: updated to include new endpoints and the settings schema.

## Non-goals

- Adding authentication or TLS to the HTTP API (remains localhost-only).
- Remote/network-accessible API (still bound to `127.0.0.1`).
- Per-loop API enable/disable (global setting only).
- Rate limiting or API key management.

## Capabilities

### New Capabilities
- `daemon-settings`: Persisted daemon settings (`~/.loop-cli/settings.json`) with `httpApiEnabled` flag, load/save logic, and a settings manager service.
- `api-toggle-command`: TUI board command (`toggle-api`) + `Ctrl+G` shortcut to flip the HTTP API on/off, with toast feedback and live daemon-side start/stop.

### Modified Capabilities
- `http-api`: Add run-history and date-filtered log endpoints; server start/stop is now conditional on `httpApiEnabled` setting.

## Impact

- **IPC contract** (`src/types.ts`): New `IpcRequest` variants for settings get/set (`settings-get`, `settings-set`). New `IpcResponse` passthrough.
- **Persisted state**: New file `~/.loop-cli/settings.json` alongside existing `loops.json`, `tasks.json`, `projects.json`.
- **Daemon bootstrap** (`src/daemon/index.ts`): Reads settings before starting `HttpApiServer`; subscribes to setting changes for live start/stop.
- **HTTP server** (`src/daemon/http-server.ts`): New routes; new `close()`/`listen()` lifecycle that supports being re-started after close.
- **TUI** (`src/tui/`): New command, shortcut, i18n keys, IPC service method for settings toggle.
- **Tests**: New `tests/settings.test.ts`, extensions to `tests/http-api.test.ts` for new endpoints.
