## ADDED Requirements

### Requirement: HTTP server starts alongside the daemon
The daemon SHALL start an HTTP server bound to `127.0.0.1` on port `8845` (configurable via `LOOP_CLI_HTTP_PORT` env var) when it starts. If the port is already in use, the daemon SHALL log a warning and continue without the HTTP server, IPC transport remains functional.

#### Scenario: HTTP server starts successfully
- **WHEN** the daemon starts and port 8845 is free
- **THEN** the HTTP server listens on `127.0.0.1:8845` and accepts requests

#### Scenario: Port already in use
- **WHEN** the daemon starts and port 8845 is already bound
- **THEN** the daemon logs a warning and continues running with IPC only

#### Scenario: Custom port via environment variable
- **WHEN** `LOOP_CLI_HTTP_PORT=9000` is set and the daemon starts
- **THEN** the HTTP server listens on port 9000 instead of 8845

#### Scenario: HTTP server stops with daemon
- **WHEN** the daemon shuts down (SIGINT/SIGTERM)
- **THEN** the HTTP server closes all connections and stops listening

---

### Requirement: Loops REST endpoints
The HTTP API SHALL expose loop management via REST endpoints that delegate to the same `LoopManager` methods used by IPC.

#### Scenario: List all loops
- **WHEN** `GET /api/loops` is received
- **THEN** the server responds with `200` and a JSON array of all `LoopMeta` objects

#### Scenario: Get single loop status
- **WHEN** `GET /api/loops/:id` is received with a valid loop ID
- **THEN** the server responds with `200` and the `LoopMeta` for that loop

#### Scenario: Get non-existent loop
- **WHEN** `GET /api/loops/:id` is received with an unknown ID
- **THEN** the server responds with `404` and an error message

#### Scenario: Create a new loop
- **WHEN** `POST /api/loops` is received with a JSON body containing `LoopOptions` fields
- **THEN** the server creates the loop via `manager.start()` and responds with `201` and `{ "id": "<loopId>" }`

#### Scenario: Create loop with missing required fields
- **WHEN** `POST /api/loops` is received with a body missing `command` or `interval`
- **THEN** the server responds with `400` and a validation error message

#### Scenario: Update an existing loop
- **WHEN** `PATCH /api/loops/:id` is received with updated `LoopOptions` fields
- **THEN** the server updates the loop via `manager.update()` and responds with `200`

#### Scenario: Delete a loop
- **WHEN** `DELETE /api/loops/:id` is received
- **THEN** the server deletes the loop via `manager.delete()` and responds with `200`

#### Scenario: Pause a loop
- **WHEN** `POST /api/loops/:id/pause` is received
- **THEN** the server pauses the loop via `manager.pause()` and responds with `200`

#### Scenario: Resume a loop
- **WHEN** `POST /api/loops/:id/resume` is received
- **THEN** the server resumes the loop via `manager.resume()` and responds with `200`

#### Scenario: Trigger a loop
- **WHEN** `POST /api/loops/:id/trigger` is received
- **THEN** the server triggers the loop via `manager.trigger()` and responds with `200`

#### Scenario: Stop a loop
- **WHEN** `POST /api/loops/:id/stop` is received
- **THEN** the server stops the loop via `manager.stopLoop()` and responds with `200`

#### Scenario: Stop all loops
- **WHEN** `POST /api/loops/stop-all` is received
- **THEN** the server stops all loops via `manager.stopAllLoops()` and responds with `200` and the count

---

### Requirement: Tasks REST endpoints
The HTTP API SHALL expose task management via REST endpoints that delegate to the same `TaskManager` methods used by IPC.

#### Scenario: List all tasks
- **WHEN** `GET /api/tasks` is received
- **THEN** the server responds with `200` and a JSON array of all `TaskDefinition` objects

#### Scenario: Get a single task
- **WHEN** `GET /api/tasks/:id` is received with a valid task ID
- **THEN** the server responds with `200` and the `TaskDefinition`

#### Scenario: Create a task
- **WHEN** `POST /api/tasks` is received with `name`, `command`, and `commandArgs`
- **THEN** the server creates the task via `taskManager.create()` and responds with `201` and the new task

#### Scenario: Update a task
- **WHEN** `PATCH /api/tasks/:id` is received with updated fields
- **THEN** the server updates the task via `taskManager.update()` and responds with `200`

#### Scenario: Delete a task
- **WHEN** `DELETE /api/tasks/:id` is received
- **THEN** the server deletes the task via `taskManager.delete()` and responds with `200`

---

### Requirement: Projects REST endpoints
The HTTP API SHALL expose project management via REST endpoints that delegate to the same `ProjectManager` methods used by IPC.

#### Scenario: List all projects
- **WHEN** `GET /api/projects` is received
- **THEN** the server responds with `200` and a JSON array of all `Project` objects

#### Scenario: Create a project
- **WHEN** `POST /api/projects` is received with `name` and `color`
- **THEN** the server creates the project and responds with `201` and the new project

#### Scenario: Create project with empty name
- **WHEN** `POST /api/projects` is received with an empty `name`
- **THEN** the server responds with `400` and a validation error

#### Scenario: Update a project
- **WHEN** `PATCH /api/projects/:id` is received with `name` and optional `color`
- **THEN** the server updates the project and responds with `200`

#### Scenario: Delete a project
- **WHEN** `DELETE /api/projects/:id` is received
- **THEN** the server deletes the project and responds with `200`

#### Scenario: Delete the default project
- **WHEN** `DELETE /api/projects/:id` is received for the system default project
- **THEN** the server responds with `400` and an error message stating it cannot be deleted

---

### Requirement: Log retrieval endpoints
The HTTP API SHALL expose loop log retrieval via REST endpoints.

#### Scenario: Fetch loop logs with tail
- **WHEN** `GET /api/loops/:id/logs?tail=50` is received
- **THEN** the server responds with `200` and the last 50 log lines as a JSON string

#### Scenario: Fetch all loop logs
- **WHEN** `GET /api/loops/:id/logs` is received without a `tail` parameter
- **THEN** the server responds with `200` and the full log content (or default tail)

#### Scenario: Fetch logs for non-existent loop
- **WHEN** `GET /api/loops/:id/logs` is received with an unknown ID
- **THEN** the server responds with `404` and an error message

#### Scenario: Fetch specific run log
- **WHEN** `GET /api/loops/:id/runs/:num` is received
- **THEN** the server responds with `200` and the log content for that specific run

---

### Requirement: SSE log streaming
The HTTP API SHALL provide a Server-Sent Events endpoint for live log streaming, mirroring the IPC `attach` behavior.

#### Scenario: Stream logs via SSE
- **WHEN** `GET /api/loops/:id/logs/stream` is received
- **THEN** the server responds with `text/event-stream` content type and streams new log lines as SSE `data:` events

#### Scenario: Stream logs for non-existent loop
- **WHEN** `GET /api/loops/:id/logs/stream` is received with an unknown ID
- **THEN** the server responds with `404` and an error message

#### Scenario: Client disconnects from log stream
- **WHEN** the client closes the connection during log streaming
- **THEN** the server cleans up the file watcher and stops sending events

---

### Requirement: SSE event push
The HTTP API SHALL provide a Server-Sent Events endpoint for daemon events (loop state changes, etc.), mirroring the IPC `subscribe` mechanism.

#### Scenario: Subscribe to events via SSE
- **WHEN** `GET /api/events` is received
- **THEN** the server responds with `text/event-stream` and pushes subsequent daemon events as SSE events with `event:` type and `data:` JSON payload

#### Scenario: Event broadcast to multiple SSE clients
- **WHEN** two clients are connected to `/api/events` and a loop state changes
- **THEN** both clients receive the SSE event

#### Scenario: Client disconnects from event stream
- **WHEN** an SSE client closes the connection
- **THEN** the server removes it from the subscriber set without affecting other clients

---

### Requirement: Consistent JSON response envelope
All HTTP responses (except SSE streams) SHALL use a consistent JSON envelope: `{ "ok": true, "data": <result> }` for success and `{ "ok": false, "error": { "message": "..." } }` for errors, with appropriate HTTP status codes (200, 201, 400, 404, 405, 500).

#### Scenario: Successful response
- **WHEN** any successful request completes
- **THEN** the response body is `{ "ok": true, "data": <result> }` with status 200 (or 201 for creates)

#### Scenario: Error response
- **WHEN** any request fails (not found, validation, internal)
- **THEN** the response body is `{ "ok": false, "error": { "message": "<details>" } }` with the appropriate HTTP status code

#### Scenario: Method not allowed
- **WHEN** a request uses an HTTP method not defined for the path
- **THEN** the server responds with `405` and an error message

#### Scenario: Malformed JSON body
- **WHEN** a `POST` or `PATCH` request body is not valid JSON
- **THEN** the server responds with `400` and an error message "Invalid JSON body"
