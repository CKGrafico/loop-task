## Context

The daemon (`src/daemon/index.ts`) currently starts one `IpcServer` that listens on a local socket (Unix domain / Windows named pipe). All loop, task, and project management lives in `LoopManager`, `TaskManager`, and `ProjectManager` — shared instances that the IPC server calls directly. The `IpcRequest` union in `src/types.ts` defines the full operation surface (~22 request types).

An HTTP transport would expose the same operations to any HTTP client (curl, browser, automation scripts) without introducing new business logic — it is a transport adapter, not a new system.

## Goals / Non-Goals

**Goals:**
- Expose all existing daemon operations (loops, tasks, projects, logs, events) over HTTP on `localhost:8845`.
- Use only Node built-in modules (`node:http`) — zero new npm dependencies.
- Support Server-Sent Events (SSE) for live log streaming and push events.
- Graceful degradation: if the port is taken, the daemon still works via IPC.
- Clean lifecycle: HTTP server starts/stops alongside the IPC server.

**Non-Goals:**
- WebSocket support (SSE covers streaming; simpler and curl-friendly).
- Authentication or TLS (localhost binding is the security boundary).
- A web dashboard UI (API only; UI is a separate concern).
- Changes to the IPC contract, persisted state shapes, or manager logic.

## Decisions

### 1. HTTP server lives inside the daemon process

**Decision:** `HttpApiServer` is instantiated in `daemon/index.ts` alongside `IpcServer`, sharing the same `LoopManager` / `TaskManager` / `ProjectManager` instances.

**Why not a separate gateway process?** A gateway would double-hop (HTTP → IPC → manager), adding latency and a second process to manage. The daemon already owns the state — a parallel listener is ~300 lines of adapter code with zero new state.

**Alternative considered:** Standalone HTTP-to-IPC proxy. Rejected because it introduces a failure mode (proxy down while daemon up) and duplicates request routing logic.

### 2. Built-in `node:http` instead of Express/Fastify

**Decision:** Use Node's built-in `http.createServer()` with a minimal route matcher.

**Rationale:**
- ~20 endpoints, all simple path patterns (`/api/loops/:id`, `/api/tasks`, etc.).
- No middleware needs (no auth, no CORS, no body parsing beyond `JSON.parse`).
- Keeps the dependency tree clean (matching the project's zero-runtime-dep HTTP stance).
- Express would add ~5MB of transitive deps for a router we can write in 30 lines.

**Route matching:** Split `url.pathname` by `/`, match segments against a route table. Parameterized segments (`:id`) captured into a `params` map. No regex needed.

### 3. REST conventions: HTTP method + path maps to IPC action

**Decision:** Map HTTP verbs to operations, not IPC action names:

| HTTP | Path | Maps to |
|------|------|---------|
| GET | `/api/loops` | `manager.list()` |
| GET | `/api/loops/:id` | `manager.status(id)` |
| POST | `/api/loops` | `manager.start(options)` |
| PATCH | `/api/loops/:id` | `manager.update(id, options)` |
| DELETE | `/api/loops/:id` | `manager.delete(id)` |
| POST | `/api/loops/:id/pause` | `manager.pause(id)` |
| POST | `/api/loops/:id/resume` | `manager.resume(id)` |
| POST | `/api/loops/:id/trigger` | `manager.trigger(id)` |
| POST | `/api/loops/:id/stop` | `manager.stopLoop(id)` |
| POST | `/api/loops/stop-all` | `manager.stopAllLoops()` |
| GET | `/api/loops/:id/logs` | log fetch (`?tail=N`) |
| GET | `/api/loops/:id/logs/stream` | SSE log stream |
| GET | `/api/loops/:id/runs/:num` | run-specific log |
| GET | `/api/tasks` | `taskManager.list()` |
| POST | `/api/tasks` | `taskManager.create()` |
| GET | `/api/tasks/:id` | `taskManager.get(id)` |
| PATCH | `/api/tasks/:id` | `taskManager.update(id, ...)` |
| DELETE | `/api/tasks/:id` | `taskManager.delete(id)` |
| GET | `/api/projects` | `projectManager.list()` |
| POST | `/api/projects` | `projectManager.create()` |
| PATCH | `/api/projects/:id` | `projectManager.update()` |
| DELETE | `/api/projects/:id` | `projectManager.delete()` |
| GET | `/api/events` | SSE event stream |

**Why REST over JSON-RPC?** HTTP clients (curl, fetch, Postman) expect REST conventions. The operations map naturally to CRUD verbs. Explorability is better — `curl localhost:8845/api/loops` "just works."

### 4. SSE for streaming (not WebSocket)

**Decision:** Use Server-Sent Events (`text/event-stream`) for both event push and log streaming.

**Why not WebSocket?**
- SSE is unidirectional (server→client), which is exactly what we need.
- Works with `curl -N` out of the box — zero client setup.
- No `ws` npm dependency.
- Auto-reconnect is built into the EventSource browser API.

**Implementation:** For events, piggyback on `IpcServer.pushEvent()` — the `HttpApiServer` maintains its own SSE subscriber set, and the daemon calls `httpServer.broadcastEvent(event, data)` alongside `ipcServer.pushEvent(event, data)`. For log streaming, reuse `streamLogFollow()` logic with SSE framing.

### 5. Request/response shape

**Decision:** All responses are JSON with a consistent envelope:

```json
// Success
{ "ok": true, "data": <result> }

// Error
{ "ok": false, "error": { "message": "Loop not found: abc" } }
```

**HTTP status codes:** 200 (success), 201 (created), 400 (bad request / validation), 404 (not found), 405 (method not allowed), 500 (internal error).

### 6. Graceful degradation on port conflict

**Decision:** If `http.createServer().listen(port)` fails with `EADDRINUSE`, log a warning via `daemonLog()` and continue. The daemon remains fully functional via IPC.

**Alternative considered:** Fail the daemon startup. Rejected — the HTTP API is additive, not critical. IPC is the primary transport.

### 7. No changes to `src/types.ts`

**Decision:** The `IpcRequest` / `IpcResponse` types remain untouched. The HTTP server defines its own request/response types internally. The two transports are fully decoupled — they just happen to call the same manager methods.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Port 8845 already in use | Graceful degradation: warn + skip HTTP, IPC still works |
| Accidental network exposure | Bind to `127.0.0.1` only (not `0.0.0.0`) |
| SSE connection leaks (client never disconnects) | Track SSE connections in a `Set`, destroy all on `server.close()` |
| Body parsing edge cases (malformed JSON) | Wrap `JSON.parse` in try/catch, return 400 on failure |
| Concurrent writes from HTTP + IPC + FileWatcher | Already handled — all paths converge at `manager.method()` which is synchronous for state mutations |
| No auth = any local process can manage loops | Accepted: localhost-only is the trust boundary. Token auth is a follow-up. |

## Migration Plan

No migration needed — the HTTP server is purely additive. Existing IPC clients (CLI, TUI) are unaffected. The daemon process gains an additional listener but its behavior is identical if the HTTP port is unavailable.

**Rollback:** Remove the `HttpApiServer` instantiation from `daemon/index.ts` and delete `src/daemon/http-server.ts`. Zero side effects.

## Open Questions

None — all decisions are resolved. Port is configurable via `LOOP_CLI_HTTP_PORT`, defaulting to `8845`.
