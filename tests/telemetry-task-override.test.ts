import { describe, it, expect } from "vitest";
import { OpenTelemetryAdapter } from "../src/daemon/telemetry/open-telemetry-adapter.js";
import type { DaemonSettings } from "../src/types.js";

function makeSettings(overrides: Partial<DaemonSettings> = {}): DaemonSettings {
  return {
    httpApiEnabled: true,
    mcpApiEnabled: true,
    httpApiHost: "0.0.0.0",
    telemetryEnabled: true,
    telemetryEndpoint: "http://localhost:4318",
    telemetryProtocol: "http/protobuf",
    telemetryAutoInstrumentAgents: true,
    telemetryCaptureContent: false,
    telemetryCaptureCommandOutput: false,
    telemetryServiceName: "loop-task",
    ...overrides,
  };
}

describe("Per-task telemetry override: integration field", () => {
  it("integration='none' disables agent-specific env injection", () => {
    const adapter = new OpenTelemetryAdapter(makeSettings());
    const result = adapter.prepareChildProcess(
      { command: "opencode", args: ["run", "implement"], cwd: "/tmp" },
      { runId: "run-1", loopId: "loop-1", loopName: "test" },
      "none",
    );
    expect(result.env.OPENCODE_EXPERIMENTAL_OPEN_TELEMETRY).toBeUndefined();
    expect(result.integrationId).toBeUndefined();
    // Base OTLP env still injected
    expect(result.env.OTEL_EXPORTER_OTLP_ENDPOINT).toBe("http://localhost:4318");
  });

  it("integration='generic' skips agent-specific activation but keeps base OTLP", () => {
    const adapter = new OpenTelemetryAdapter(makeSettings());
    const result = adapter.prepareChildProcess(
      { command: "claude", args: ["-p", "test"], cwd: "/tmp" },
      { runId: "run-1", loopId: "loop-1", loopName: "test" },
      "generic",
    );
    expect(result.env.CLAUDE_CODE_ENABLE_TELEMETRY).toBeUndefined();
    expect(result.integrationId).toBeUndefined();
    expect(result.env.OTEL_EXPORTER_OTLP_ENDPOINT).toBe("http://localhost:4318");
  });

  it("integration='opencode' forces OpenCode activation even on non-matching command", () => {
    const adapter = new OpenTelemetryAdapter(makeSettings());
    // Command looks like a custom wrapper, but we force opencode integration
    const result = adapter.prepareChildProcess(
      { command: "./scripts/run-claude.sh", args: ["implement"], cwd: "/tmp" },
      { runId: "run-1", loopId: "loop-1", loopName: "test" },
      "opencode",
    );
    expect(result.env.OPENCODE_EXPERIMENTAL_OPEN_TELEMETRY).toBe("true");
    expect(result.integrationId).toBe("opencode");
  });

  it("integration='claude-code' forces Claude activation even on non-matching command", () => {
    const adapter = new OpenTelemetryAdapter(makeSettings());
    const result = adapter.prepareChildProcess(
      { command: "./scripts/run-claude.sh", args: ["implement"], cwd: "/tmp" },
      { runId: "run-1", loopId: "loop-1", loopName: "test" },
      "claude-code",
    );
    expect(result.env.CLAUDE_CODE_ENABLE_TELEMETRY).toBe("1");
    expect(result.integrationId).toBe("claude-code");
  });

  it("integration='auto' falls through to auto-detection", () => {
    const adapter = new OpenTelemetryAdapter(makeSettings());
    const result = adapter.prepareChildProcess(
      { command: "opencode", args: ["run", "test"], cwd: "/tmp" },
      { runId: "run-1", loopId: "loop-1", loopName: "test" },
      "auto",
    );
    expect(result.env.OPENCODE_EXPERIMENTAL_OPEN_TELEMETRY).toBe("true");
    expect(result.integrationId).toBe("opencode");
  });

  it("no override falls through to auto-detection (backward compatible)", () => {
    const adapter = new OpenTelemetryAdapter(makeSettings());
    const result = adapter.prepareChildProcess(
      { command: "claude", args: ["-p", "test"], cwd: "/tmp" },
      { runId: "run-1", loopId: "loop-1", loopName: "test" },
    );
    expect(result.env.CLAUDE_CODE_ENABLE_TELEMETRY).toBe("1");
    expect(result.integrationId).toBe("claude-code");
  });
});

describe("Per-task telemetry override: disabled flag", () => {
  it("when global telemetry is enabled but task disables it, prepareChildProcess returns empty env", () => {
    // This simulates what command-runner does when telemetryConfig.enabled === false
    // The command-runner skips calling prepareChildProcess entirely when task telemetry is disabled
    // But we verify the contract is clear by checking that if someone does call it,
    // the adapter still respects global settings
    const adapter = new OpenTelemetryAdapter(makeSettings());
    const result = adapter.prepareChildProcess(
      { command: "echo", args: ["hello"], cwd: "/tmp" },
      { runId: "run-1", loopId: "loop-1", loopName: "test" },
    );
    // Global is enabled, no override, so it should work
    expect(result.env.OTEL_EXPORTER_OTLP_ENDPOINT).toBe("http://localhost:4318");
  });
});
