# MCP Server for loop-task

## Summary
Expose an MCP (Model Context Protocol) server alongside the running daemon so that MCP-compatible tools (OpenCode, Claude Code, Cursor, etc.) can discover and manage loops, tasks, and projects through standardized tool calls.

## Motivation
Currently the only ways to interact with loop-task from external tools are:
1. CLI commands (requires spawning subprocess each time)
2. HTTP API (requires knowing endpoint schema and crafting HTTP requests)

Neither integrates naturally with the MCP ecosystem where coding agents discover and call tools through a standard protocol.

## Implementation

### New module: `src/daemon/mcp/`
- `server.ts`, `McpApiServer` class (transport adapter, same pattern as `HttpApiServer`)
- `tools.ts`, MCP tool registration with Zod schemas matching HTTP API
- `openapi-sync.ts`, Tool definitions auto-generated from `buildOpenApiSpec()`
- `index.ts`, Public exports

### Daemon integration (`src/daemon/index.ts`)
- MCP server starts/stops with daemon lifecycle
- Graceful degradation (if MCP init fails, daemon continues with IPC + HTTP only)
- Runtime toggle via `SettingsManager.onChange()`

### Configuration
- `LOOP_CLI_MCP_ENABLED`, enable/disable (default: `true`)
- `LOOP_CLI_MCP_TRANSPORT`, `stdio` or `sse` (default: `stdio`)
- `LOOP_CLI_MCP_PORT`, SSE port (default: `8846`)

### Settings
- `mcpApiEnabled` added to `DaemonSettings`
- Toggle via command palette (`Ctrl+P` → "Toggle MCP server on/off")
- Toggle via HTTP API settings endpoint

### Available Tools
- **Loops**: `list_loops`, `get_loop`, `create_loop`, `update_loop`, `delete_loop`, `pause_loop`, `resume_loop`, `trigger_loop`, `stop_loop`, `stop_all_loops`
- **Tasks**: `list_tasks`, `get_task`, `create_task`, `update_task`, `delete_task`
- **Projects**: `list_projects`, `get_project`, `create_project`, `update_project`, `delete_project`
- **Logs**: `get_loop_logs`, `get_run_log`

### Dependencies
- `@modelcontextprotocol/sdk`, MCP protocol handling
- `zod`, Schema validation (peer dependency of MCP SDK)
