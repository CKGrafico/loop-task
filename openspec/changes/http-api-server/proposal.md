## Why

The daemon already owns all loop, task, and project state, but only the CLI and TUI board can reach it — both via local IPC. External tools (web dashboards, automation scripts, CI pipelines) cannot query or manage loops without shelling out to the CLI. Adding an HTTP transport alongside the existing IPC server opens the daemon to any HTTP client with zero new business logic.

## What Changes

- **New `HttpApiServer`** — a lightweight HTTP server (`node:http`, no Express/Fastify) that binds to `localhost:8845` and delegates to the same `LoopManager`, `TaskManager`, and `ProjectManager` instances the IPC server already uses.
- **REST API surface** — ~20 endpoints covering loops (CRUD + lifecycle actions), tasks (CRUD), projects (CRUD), logs (fetch + stream), and events (SSE push). 1:1 mapping to the existing `IpcRequest` union.
- **Server-Sent Events** for live updates: `GET /api/events` (loop status changes) and `GET /api/loops/:id/logs/stream` (log tailing), mirroring the IPC `subscribe` and `attach` mechanisms.
- **Configurable port** via `LOOP_CLI_HTTP_PORT` env var (default `8845`); binds to `127.0.0.1` only.
- **Graceful degradation** — if the port is already in use, the daemon logs a warning and continues without the HTTP server (IPC still works).
- **No new dependencies** — implemented entirely with Node's built-in `http` module.
- **Lifecycle integration** — the HTTP server starts and stops alongside the IPC server inside the daemon process.

## Non-goals

- WebSocket support (SSE covers streaming needs and is simpler).
- Authentication / authorization (localhost-only binding is the security boundary; token auth can be a follow-up).
- A web dashboard UI (this change only provides the API; a dashboard would be a separate change).
- Changes to the IPC transport, the daemon IPC protocol, or the `IpcRequest`/`IpcResponse` types in `src/types.ts`.
- Changes to `LoopMeta` or any persisted state shape.
- Cross-platform transport changes beyond what `127.0.0.1` already provides uniformly.

## Capabilities

### New Capabilities
- `http-api`: REST + SSE HTTP server that exposes the daemon's loop, task, project, log, and event management to any HTTP client on localhost.

### Modified Capabilities
<!-- No existing spec-level requirements are changing. The HTTP server is purely additive. -->

## Impact

- **New file:** `src/daemon/http-server.ts` — the `HttpApiServer` class (~300 lines).
- **Modified:** `src/daemon/index.ts` — instantiate and start `HttpApiServer` alongside `IpcServer`, wire into `cleanup()`.
- **Modified:** `src/config/constants.ts` — add `HTTP_API_PORT` default (8845) and `HTTP_API_HOST` (`127.0.0.1`).
- **No changes** to `src/types.ts`, `src/daemon/server.ts` (IPC), `src/daemon/manager.ts`, `src/daemon/task-manager.ts`, `src/daemon/projects.ts`, or any persisted state shape — the HTTP server reads the same manager methods the IPC server calls.
- **No new npm dependencies.**
- **No IPC contract changes** — the HTTP server is a parallel transport, not a modification to IPC.
- **Cross-platform:** binding to `127.0.0.1` works identically on Windows (named pipe) and POSIX (Unix socket). The HTTP server is independent of the IPC transport layer.
