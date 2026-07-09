# MCP Server Design

## Architecture

```
src/daemon/mcp/
  server.ts       → McpApiServer class (transport adapter)
  tools.ts        → registerMcpTools() — Zod schemas + handler callbacks
  openapi-sync.ts → buildMcpToolDefsFromOpenApi() — auto-generate from OpenAPI
  index.ts        → Public exports
```

The MCP server is a **transport adapter** (like `HttpApiServer`):
- Receives `LoopManager`, `TaskManager`, `ProjectManager` instances
- Calls the same manager methods as HTTP routes
- `src/core/` remains runtime-agnostic, never imports MCP code

## Transport Selection

### stdio (default)
- Daemon communicates over stdin/stdout
- MCP client launches daemon as child process
- Most common pattern for local MCP servers

### SSE
- HTTP server on configurable port (default 8846)
- Client connects to `/sse` for event stream, POSTs to `/message`
- Requires daemon already running

## Lifecycle

1. Daemon starts → reads `LOOP_CLI_MCP_ENABLED` and `LOOP_CLI_MCP_TRANSPORT`
2. If enabled, `McpApiServer.start()` is called
3. If start fails → graceful degradation, daemon continues with IPC + HTTP
4. `SettingsManager.onChange()` watches `mcpApiEnabled` for runtime toggle
5. On daemon shutdown → `McpApiServer.close()` called in cleanup sequence

## Tool Schema Alignment

MCP tool schemas mirror the HTTP API exactly:
- `create_loop` takes `command`, `intervalHuman`, `description`, `taskId`, `now`, `maxRuns`, `projectId`, `offset`, `context` — same as `POST /api/loops`
- Output follows `{ ok: true, data: ... }` envelope — same as HTTP API
- `buildMcpToolDefsFromOpenApi()` in `openapi-sync.ts` reads the OpenAPI spec and validates tool coverage
