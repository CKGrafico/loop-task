## ADDED Requirements

### Requirement: toggle-api command in the command palette
The TUI board SHALL register a `toggle-api` command in the command palette (global tier) that flips the `httpApiEnabled` setting via IPC and shows a toast confirming the new state.

#### Scenario: Toggle API off
- **WHEN** the HTTP API is currently enabled and the user runs `toggle-api`
- **THEN** the TUI sends `settings-set` with `httpApiEnabled: false` via IPC and shows a toast: "HTTP API disabled"

#### Scenario: Toggle API on
- **WHEN** the HTTP API is currently disabled and the user runs `toggle-api`
- **THEN** the TUI sends `settings-set` with `httpApiEnabled: true` via IPC and shows a toast: "HTTP API enabled on port 8845"

#### Scenario: Toggle fails
- **WHEN** the IPC request fails (daemon unreachable)
- **THEN** the TUI shows an error toast with the failure message

---

### Requirement: Ctrl+G shortcut toggles the API
The `Ctrl+G` keyboard shortcut SHALL trigger the `toggle-api` command instead of showing API info. The existing `api` command (show URL toast) SHALL remain available via the command palette.

#### Scenario: Ctrl+G when API is on
- **WHEN** the user presses `Ctrl+G` and the API is enabled
- **THEN** the API is disabled and a toast confirms

#### Scenario: Ctrl+G when API is off
- **WHEN** the user presses `Ctrl+G` and the API is disabled
- **THEN** the API is enabled and a toast confirms

---

### Requirement: SettingsService via dependency injection
A `SettingsService` interface SHALL be registered in the DI container with `get()` and `setHttpApiEnabled(enabled: boolean)` methods. The TUI SHALL use this service (not raw IPC calls) to interact with settings.

#### Scenario: Inject SettingsService
- **WHEN** a TUI component calls `useInject<SettingsService>(TYPES.SettingsService)`
- **THEN** it receives an `IpcSettingsService` instance that delegates to the daemon via IPC
