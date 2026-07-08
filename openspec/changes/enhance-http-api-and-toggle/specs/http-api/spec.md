## ADDED Requirements

### Requirement: Run history endpoint
The HTTP API SHALL expose a `GET /api/loops/:id/runs` endpoint that returns the loop's `runHistory` array, optionally filtered by `from` and `to` ISO 8601 date query parameters.

#### Scenario: List all run history
- **WHEN** `GET /api/loops/:id/runs` is received without date params
- **THEN** the server responds with `200` and the full `runHistory` array

#### Scenario: Filter runs by date range
- **WHEN** `GET /api/loops/:id/runs?from=2026-01-01T00:00:00Z&to=2026-01-02T00:00:00Z` is received
- **THEN** the server responds with `200` and only `RunRecord` entries whose `startedAt` falls within the `[from, to]` range

#### Scenario: Filter runs with only from
- **WHEN** `GET /api/loops/:id/runs?from=2026-01-01T00:00:00Z` is received
- **THEN** the server responds with runs where `startedAt >= from`

#### Scenario: Run history for non-existent loop
- **WHEN** `GET /api/loops/:id/runs` is received with an unknown ID
- **THEN** the server responds with `404` and an error message

---

### Requirement: Date-filtered log endpoint
The HTTP API SHALL expose a `GET /api/loops/:id/logs/date` endpoint that returns log output from runs whose `startedAt` falls within a `from`/`to` date range. The endpoint SHALL read byte ranges from the log file using each matching `RunRecord`'s `logOffset` and `logSize`.

#### Scenario: Fetch logs by date range
- **WHEN** `GET /api/loops/:id/logs/date?from=2026-01-01T00:00:00Z&to=2026-01-02T00:00:00Z` is received
- **THEN** the server responds with `200` and the concatenated log bytes from all runs in the date range

#### Scenario: No runs in date range
- **WHEN** `GET /api/loops/:id/logs/date?from=...&to=...` matches no runs
- **THEN** the server responds with `200` and an empty string

#### Scenario: Missing date params
- **WHEN** `GET /api/loops/:id/logs/date` is received without `from` or `to`
- **THEN** the server responds with `400` and an error message "from and to query parameters are required"

#### Scenario: Date-filtered logs for non-existent loop
- **WHEN** `GET /api/loops/:id/logs/date` is received with an unknown ID
- **THEN** the server responds with `404` and an error message

---

### Requirement: Settings REST endpoints
The HTTP API SHALL expose `GET /api/settings` and `PATCH /api/settings` endpoints for reading and updating daemon settings.

#### Scenario: Get current settings
- **WHEN** `GET /api/settings` is received
- **THEN** the server responds with `200` and `{ "ok": true, "data": { "httpApiEnabled": true } }`

#### Scenario: Update httpApiEnabled
- **WHEN** `PATCH /api/settings` is received with body `{ "httpApiEnabled": false }`
- **THEN** the server updates settings via `SettingsManager.set()`, and responds with `200` and the updated settings object

#### Scenario: Update with invalid field
- **WHEN** `PATCH /api/settings` is received with an unrecognized field
- **THEN** the server responds with `400` and an error message

---

## MODIFIED Requirements

### Requirement: HTTP server starts alongside the daemon
The daemon SHALL start an HTTP server bound to `127.0.0.1` on port `8845` (configurable via `LOOP_CLI_HTTP_PORT` env var) when it starts AND when `settings.httpApiEnabled` is `true`. If the port is already in use, the daemon SHALL log a warning and continue without the HTTP server — IPC transport remains functional. If `httpApiEnabled` is `false`, the daemon SHALL NOT start the HTTP server.

#### Scenario: HTTP server starts successfully
- **WHEN** the daemon starts, `httpApiEnabled` is `true`, and port 8845 is free
- **THEN** the HTTP server listens on `127.0.0.1:8845` and accepts requests

#### Scenario: Port already in use
- **WHEN** the daemon starts with `httpApiEnabled: true` and port 8845 is already bound
- **THEN** the daemon logs a warning and continues running with IPC only

#### Scenario: Custom port via environment variable
- **WHEN** `LOOP_CLI_HTTP_PORT=9000` is set and the daemon starts with `httpApiEnabled: true`
- **THEN** the HTTP server listens on port 9000 instead of 8845

#### Scenario: HTTP server stops with daemon
- **WHEN** the daemon shuts down (SIGINT/SIGTERM)
- **THEN** the HTTP server closes all connections and stops listening

#### Scenario: HTTP server does not start when disabled
- **WHEN** the daemon starts and `settings.httpApiEnabled` is `false`
- **THEN** the HTTP server does NOT listen and the daemon logs "HTTP API disabled by settings"

#### Scenario: HTTP server starts when toggled on at runtime
- **WHEN** `httpApiEnabled` changes from `false` to `true` while the daemon is running
- **THEN** the daemon starts the HTTP server on the configured port

#### Scenario: HTTP server stops when toggled off at runtime
- **WHEN** `httpApiEnabled` changes from `true` to `false` while the HTTP server is running
- **THEN** the daemon closes the HTTP server, destroys all SSE connections, and stops listening
