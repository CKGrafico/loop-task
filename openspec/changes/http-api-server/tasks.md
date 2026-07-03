## 1. Config Setup

- [ ] 1.1 Add `HTTP_API_PORT` (8845) and `HTTP_API_HOST` (`127.0.0.1`) to `src/config/constants.ts` <!-- agent: basic-engineer.build, depends_on: none, touches: src/config/constants.ts -->

## 2. HttpApiServer Core

- [ ] 2.1 Create `src/daemon/http-server.ts` with `HttpApiServer` class: `listen()`, `close()`, `broadcastEvent()` methods, route matcher (path segments), JSON response envelope helpers (`sendOk`, `sendError`, `sendNotFound`, `sendMethodNotAllowed`) <!-- agent: basic-engineer.build, depends_on: 1.1, touches: src/daemon/http-server.ts -->
- [ ] 2.2 Implement loop REST endpoints in `HttpApiServer`: `GET /api/loops`, `GET /api/loops/:id`, `POST /api/loops`, `PATCH /api/loops/:id`, `DELETE /api/loops/:id`, `POST /api/loops/:id/pause`, `POST /api/loops/:id/resume`, `POST /api/loops/:id/trigger`, `POST /api/loops/:id/stop`, `POST /api/loops/stop-all` — delegating to `LoopManager` <!-- agent: basic-engineer.build, depends_on: 2.1, touches: src/daemon/http-server.ts -->
- [ ] 2.3 Implement task REST endpoints: `GET /api/tasks`, `GET /api/tasks/:id`, `POST /api/tasks`, `PATCH /api/tasks/:id`, `DELETE /api/tasks/:id` — delegating to `TaskManager` <!-- agent: basic-engineer.build, depends_on: 2.1, touches: src/daemon/http-server.ts -->
- [ ] 2.4 Implement project REST endpoints: `GET /api/projects`, `POST /api/projects`, `PATCH /api/projects/:id`, `DELETE /api/projects/:id` — delegating to `ProjectManager` <!-- agent: basic-engineer.build, depends_on: 2.1, touches: src/daemon/http-server.ts -->
- [ ] 2.5 Implement log endpoints: `GET /api/loops/:id/logs?tail=N` and `GET /api/loops/:id/runs/:num` <!-- agent: basic-engineer.build, depends_on: 2.1, touches: src/daemon/http-server.ts -->
- [ ] 2.6 Implement SSE endpoints: `GET /api/loops/:id/logs/stream` (live log tail via `streamLogFollow` pattern) and `GET /api/events` (daemon event push via `broadcastEvent`) <!-- agent: basic-engineer.build, depends_on: 2.1, touches: src/daemon/http-server.ts -->

## 3. Daemon Integration

- [ ] 3.1 Instantiate `HttpApiServer` in `src/daemon/index.ts`, start it alongside `IpcServer`, wire `broadcastEvent` into the push path, handle `EADDRINUSE` gracefully, close on shutdown <!-- agent: basic-engineer.build, depends_on: 2.2,2.3,2.4,2.5,2.6, touches: src/daemon/index.ts -->

## 4. Tests

- [ ] 4.1 Write unit tests for route matcher and JSON response envelope helpers in `tests/http-server.test.ts` <!-- agent: basic-engineer.build, depends_on: 2.1, touches: tests/http-server.test.ts -->
- [ ] 4.2 Write integration tests for loop, task, project, log, and SSE endpoints in `tests/http-api.test.ts` <!-- agent: basic-engineer.build, depends_on: 3.1, touches: tests/http-api.test.ts -->

## 5. Verification

- [ ] 5.1 Run `rtk npx tsc --noEmit`, `rtk pnpm lint`, and `rtk pnpm test` — all must pass <!-- agent: basic-engineer.build, depends_on: 3.1,4.2, touches: none -->
