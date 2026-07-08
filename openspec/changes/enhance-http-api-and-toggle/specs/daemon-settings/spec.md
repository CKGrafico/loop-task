## ADDED Requirements

### Requirement: Settings file persistence
The daemon SHALL persist settings to `~/.loop-cli/settings.json`. The file SHALL contain a JSON object with at minimum `{ "httpApiEnabled": <boolean> }`. If the file does not exist on daemon startup, the daemon SHALL create it with `{ "httpApiEnabled": true }`.

#### Scenario: Settings file does not exist on first start
- **WHEN** the daemon starts and `settings.json` does not exist in `getDataDir()`
- **THEN** the daemon creates `settings.json` with `{ "httpApiEnabled": true }` and uses those defaults

#### Scenario: Settings file exists and is valid
- **WHEN** the daemon starts and `settings.json` contains `{ "httpApiEnabled": false }`
- **THEN** the daemon loads `httpApiEnabled: false` and does NOT start the HTTP server

#### Scenario: Settings file is corrupted
- **WHEN** the daemon starts and `settings.json` contains invalid JSON
- **THEN** the daemon falls back to defaults `{ "httpApiEnabled": true }`, overwrites the file with valid content, and logs a warning

---

### Requirement: SettingsManager provides get and set
A `SettingsManager` class SHALL provide `get(): DaemonSettings` and `set(partial: Partial<DaemonSettings>): void` methods. `set()` SHALL immediately persist to disk and emit a change event to registered listeners.

#### Scenario: Read default settings
- **WHEN** `get()` is called before any `set()`
- **THEN** it returns `{ "httpApiEnabled": true }`

#### Scenario: Update a setting
- **WHEN** `set({ httpApiEnabled: false })` is called
- **THEN** `settings.json` is written with the new value and registered `onChange` callbacks are invoked with the new settings object

---

### Requirement: IPC settings-get and settings-set
The IPC server SHALL handle `settings-get` requests by returning the current `DaemonSettings` and `settings-set` requests by updating settings via `SettingsManager`.

#### Scenario: Get settings via IPC
- **WHEN** the TUI sends `{ type: "settings-get" }`
- **THEN** the daemon responds with `{ type: "ok", data: { httpApiEnabled: true } }`

#### Scenario: Set settings via IPC
- **WHEN** the TUI sends `{ type: "settings-set", payload: { httpApiEnabled: false } }`
- **THEN** the daemon updates settings, persists to disk, and responds with `{ type: "ok", data: { httpApiEnabled: false } }`

---

### Requirement: HTTP server start is conditional on settings
The daemon SHALL only start the `HttpApiServer` when `settings.httpApiEnabled` is `true` at boot time. When the setting changes at runtime, the daemon SHALL start or stop the HTTP server accordingly.

#### Scenario: Daemon boots with API disabled
- **WHEN** the daemon starts and `settings.json` has `httpApiEnabled: false`
- **THEN** the HTTP server does NOT listen and the daemon logs that the API is disabled

#### Scenario: API toggled on at runtime
- **WHEN** `settings-set` sets `httpApiEnabled: true` while the daemon is running
- **THEN** the daemon starts the HTTP server on the configured port

#### Scenario: API toggled off at runtime
- **WHEN** `settings-set` sets `httpApiEnabled: false` while the HTTP server is running
- **THEN** the daemon closes the HTTP server, destroying all SSE connections, and stops listening
