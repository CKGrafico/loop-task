# Tasks

## Completed

- [x] T1: Add `@modelcontextprotocol/sdk` and `zod` dependencies
- [x] T2: Create `src/daemon/mcp/server.ts`, McpApiServer class with stdio and SSE transports
- [x] T3: Create `src/daemon/mcp/tools.ts`, Register all MCP tools with Zod schemas
- [x] T4: Create `src/daemon/mcp/openapi-sync.ts`, Auto-generate tool defs from OpenAPI spec
- [x] T5: Create `src/daemon/mcp/index.ts`, Public exports
- [x] T6: Add `mcpApiEnabled` to `DaemonSettings` interface and defaults
- [x] T7: Integrate MCP server into daemon lifecycle (`src/daemon/index.ts`)
- [x] T8: Add `LOOP_CLI_MCP_ENABLED`, `LOOP_CLI_MCP_TRANSPORT`, `LOOP_CLI_MCP_PORT` env vars
- [x] T9: Add runtime toggle via `SettingsManager.onChange()`
- [x] T10: Add `getMcpApiEnabled`/`setMcpApiEnabled` to SettingsService
- [x] T11: Add MCP toggle commands to command palette and handlers
- [x] T12: Add i18n keys for MCP commands and toasts
- [x] T13: Update OpenAPI spec with `mcpApiEnabled` in settings
- [x] T14: Update settings-manager tests for new `mcpApiEnabled` default
- [x] T15: Create MCP documentation page (`docs/content/docs/mcp-server.mdx`)
- [x] T16: Update configuration docs with MCP env vars
