# OpenTelemetry Unified Daemon-Managed Instrumentation

## Change ID
`opentelemetry-unified`

## Summary
Add first-class, daemon-managed OpenTelemetry support to `loop-task` that follows the same product pattern as HTTP API and MCP server features.

## Motivation
OpenTelemetry must behave like existing daemon features: managed centrally, enabled by default, persisted in settings, visible through the command palette, toggleable at runtime, and automatically propagated to supported external coding agents. Users should configure telemetry once in `loop-task` and have it unified across all agents.

## Design

### Settings
Extend `DaemonSettings` with telemetry fields (enabled, endpoint, protocol, autoInstrumentAgents, captureContent, captureCommandOutput, serviceName). Defaults: enabled=true, endpoint=undefined, protocol=http/protobuf, autoInstrumentAgents=true, captureContent=false.

### Telemetry Abstraction
- `Telemetry` interface with `startLoop`, `startTask`, `startCommand`, `recordRetry`, `recordFailure`, `recordAgentUsage`, `prepareChildProcess`, `getStatus`, `flush`, `shutdown`
- `NoopTelemetryAdapter` for disabled/not-configured states
- `OpenTelemetryAdapter` wrapping `@opentelemetry/sdk-node`

### Span Model
Stable span names: `loop_task.loop.run`, `loop_task.task.execute`, `loop_task.command.execute`. Correlation attributes: `loop_task.run.id`, `loop_task.loop.id`, `loop_task.task.id`, etc.

### Agent Integrations
- `OpenCodeTelemetryIntegration` detects `opencode run` and enables native OTel
- `ClaudeCodeTelemetryIntegration` detects `claude -p`/`claude --print` and enables telemetry
- Both inject OTEL_* environment variables into the child process

### CLI
`loop-task telemetry` subcommand with status/on/off/endpoint/protocol/test operations.

### Command Palette
Ctrl+P commands: telemetry (info), toggle-telemetry, telemetry-diagnostics.

### Privacy
Content capture disabled by default. No prompts, responses, source code, secrets, or auth headers exported. Command args sanitized.

### Error Isolation
Telemetry failures never fail a loop or task. All errors logged to daemon log.

## Tasks
1. ✅ Extend DaemonSettings with telemetry fields
2. ✅ Create TelemetrySettings interface and settings manager methods
3. ✅ Create telemetry type definitions (span names, correlation keys, metrics)
4. ✅ Create Telemetry/TelemetrySpan interfaces
5. ✅ Implement NoopTelemetryAdapter
6. ✅ Implement OpenTelemetryAdapter with @opentelemetry/sdk-node
7. ✅ Create agent integration system (detect + prepare)
8. ✅ Create TelemetryManager with lifecycle + settings listener
9. ✅ Wire telemetry into daemon index and IPC server
10. ✅ Add telemetry-test IPC handler
11. ✅ Add CLI telemetry subcommands
12. ✅ Add command palette commands
13. ✅ Add i18n strings
14. ✅ Create redaction utilities
15. ✅ Write tests (settings, manager, detection, redaction, child env)
16. ✅ Write documentation

## References
- GitHub Issue #63
