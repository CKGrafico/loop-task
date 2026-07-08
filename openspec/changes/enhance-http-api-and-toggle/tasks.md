## 1. Types and Config

- [ ] 1.1 Add `DaemonSettings` interface and `settings-get`/`settings-set` IPC request types to `src/types.ts` <!-- agent: basic-engineer.build, depends_on: [], touches: [src/types.ts] -->
- [ ] 1.2 Add `settingsJson()` path to `src/config/paths.ts` <!-- agent: basic-engineer.fast, depends_on: [], touches: [src/config/paths.ts] -->

## 2. Settings Manager (Daemon)

- [ ] 2.1 Create `src/daemon/settings-manager.ts` with `SettingsManager` class (load/save/get/set/onChange), `settings.json` persistence, corruption fallback to defaults <!-- agent: basic-engineer.build, depends_on: [1.1, 1.2], touches: [src/daemon/settings-manager.ts] -->
- [ ] 2.2 Add `SettingsService` interface to `src/shared/services/types.ts` and `TYPES.SettingsService` symbol <!-- agent: basic-engineer.build, depends_on: [1.1], touches: [src/shared/services/types.ts] -->
- [ ] 2.3 Create `src/shared/services/settings-service.ts` with `IpcSettingsService` implementing `SettingsService` (get/setHttpApiEnabled via IPC) <!-- agent: basic-engineer.build, depends_on: [2.2], touches: [src/shared/services/settings-service.ts] -->
- [ ] 2.4 Register `SettingsService` in DI container at `src/shared/container/index.ts` <!-- agent: basic-engineer.fast, depends_on: [2.3], touches: [src/shared/container/index.ts] -->

## 3. IPC Server (Daemon)

- [ ] 3.1 Wire `SettingsManager` into `LoopManager` (constructor injection or property) so daemon and IPC server can access it <!-- agent: basic-engineer.build, depends_on: [2.1], touches: [src/daemon/manager.ts] -->
- [ ] 3.2 Add `settings-get` and `settings-set` case handlers to `IpcServer.handleRequest` in `src/daemon/server.ts` <!-- agent: basic-engineer.build, depends_on: [2.1, 3.1], touches: [src/daemon/server.ts] -->

## 4. Daemon Bootstrap — Conditional HTTP

- [ ] 4.1 Update `src/daemon/index.ts` to instantiate `SettingsManager`, pass to `HttpApiServer`, and only call `listen()` when `httpApiEnabled` is true <!-- agent: basic-engineer.build, depends_on: [2.1, 3.1], touches: [src/daemon/index.ts] -->
- [ ] 4.2 Add `onChange` subscription in daemon bootstrap to start/stop `HttpApiServer` at runtime when `httpApiEnabled` changes <!-- agent: basic-engineer.build, depends_on: [4.1], touches: [src/daemon/index.ts] -->

## 5. HTTP API Endpoints

- [ ] 5.1 Add `GET /api/loops/:id/runs` endpoint (with `from`/`to` date filter) to `HttpApiServer.registerRoutes` <!-- agent: basic-engineer.build, depends_on: [], touches: [src/daemon/http-server.ts] -->
- [ ] 5.2 Add `GET /api/loops/:id/logs/date?from=...&to=...` endpoint that reads byte ranges from matching `RunRecord` entries <!-- agent: basic-engineer.build, depends_on: [5.1], touches: [src/daemon/http-server.ts] -->
- [ ] 5.3 Add `GET /api/settings` and `PATCH /api/settings` endpoints to `HttpApiServer.registerRoutes` <!-- agent: basic-engineer.build, depends_on: [3.1], touches: [src/daemon/http-server.ts] -->
- [ ] 5.4 Update `buildOpenApiSpec()` to include `runs`, `logs/date`, `settings` endpoints <!-- agent: basic-engineer.fast, depends_on: [5.1, 5.2, 5.3], touches: [src/daemon/http-server.ts] -->

## 6. TUI — Toggle Command

- [ ] 6.1 Add `toggle-api` command to `src/tui/commands.ts` (global tier) <!-- agent: frontend-engineer.fast, depends_on: [], touches: [src/tui/commands.ts] -->
- [ ] 6.2 Add `toggle-api` and `setHttpApiEnabled` handler to `src/tui/features/commands/useCommandHandlers.ts` using `SettingsService` <!-- agent: frontend-engineer.build, depends_on: [2.4, 6.1], touches: [src/tui/features/commands/useCommandHandlers.ts] -->
- [ ] 6.3 Repurpose `Ctrl+G` shortcut from `api` to `toggle-api` in `src/tui/features/shortcuts/useGlobalShortcuts.ts` <!-- agent: frontend-engineer.fast, depends_on: [6.1], touches: [src/tui/features/shortcuts/useGlobalShortcuts.ts] -->

## 7. i18n

- [ ] 7.1 Add i18n keys for `cmd.toggleApi`, `board.toastApiEnabled`, `board.toastApiDisabled`, `board.toastApiToggleError` to `src/i18n/en.json` <!-- agent: frontend-engineer.fast, depends_on: [], touches: [src/i18n/en.json] -->

## 8. Tests

- [ ] 8.1 Create `tests/settings-manager.test.ts` covering load defaults, save, corruption fallback, onChange callback <!-- agent: basic-engineer.build, depends_on: [2.1], touches: [tests/settings-manager.test.ts] -->
- [ ] 8.2 Extend `tests/http-api.test.ts` with tests for `GET /runs`, `GET /logs/date`, `GET/PATCH /settings` endpoints <!-- agent: basic-engineer.build, depends_on: [5.1, 5.2, 5.3], touches: [tests/http-api.test.ts] -->
- [ ] 8.3 Run typecheck, lint, and full test suite to verify no regressions <!-- agent: basic-engineer.fast, depends_on: [8.1, 8.2], touches: [] -->
