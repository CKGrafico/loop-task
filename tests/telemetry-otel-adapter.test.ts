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

describe("OpenTelemetryAdapter.prepareChildProcess", () => {
  it("returns empty env when telemetry is disabled", () => {
    const adapter = new OpenTelemetryAdapter(makeSettings({ telemetryEnabled: false }));
    const result = adapter.prepareChildProcess(
      { command: "echo", args: ["hello"], cwd: "/tmp" },
      { runId: "run-1", loopId: "loop-1", loopName: "test" },
    );
    expect(Object.keys(result.env).length).toBe(0);
  });

  it("returns empty env when no endpoint is configured", () => {
    const adapter = new OpenTelemetryAdapter(makeSettings({ telemetryEndpoint: undefined }));
    const result = adapter.prepareChildProcess(
      { command: "echo", args: ["hello"], cwd: "/tmp" },
      { runId: "run-1", loopId: "loop-1", loopName: "test" },
    );
    expect(Object.keys(result.env).length).toBe(0);
  });

  it("injects OTLP endpoint and protocol", () => {
    const adapter = new OpenTelemetryAdapter(makeSettings());
    const result = adapter.prepareChildProcess(
      { command: "echo", args: ["hello"], cwd: "/tmp" },
      { runId: "run-1", loopId: "loop-1", loopName: "test" },
    );
    expect(result.env.OTEL_EXPORTER_OTLP_ENDPOINT).toBe("http://localhost:4318");
    expect(result.env.OTEL_EXPORTER_OTLP_PROTOCOL).toBe("http/protobuf");
  });

  it("injects trace context when provided", () => {
    const adapter = new OpenTelemetryAdapter(makeSettings());
    const result = adapter.prepareChildProcess(
      { command: "echo", args: ["hello"], cwd: "/tmp" },
      {
        runId: "run-1",
        loopId: "loop-1",
        loopName: "test",
        traceParent: "00-abc123-def456-01",
        traceState: "key=value",
      },
    );
    expect(result.env.TRACEPARENT).toBe("00-abc123-def456-01");
    expect(result.env.TRACESTATE).toBe("key=value");
  });

  it("injects correlation attributes as OTEL_RESOURCE_ATTRIBUTES", () => {
    const adapter = new OpenTelemetryAdapter(makeSettings());
    const result = adapter.prepareChildProcess(
      { command: "echo", args: ["hello"], cwd: "/tmp" },
      {
        runId: "run-1",
        loopId: "loop-1",
        loopName: "test",
        taskId: "task-1",
        projectId: "proj-1",
      },
    );
    expect(result.env.OTEL_RESOURCE_ATTRIBUTES).toBeDefined();
    const attrs = result.env.OTEL_RESOURCE_ATTRIBUTES!;
    expect(attrs).toContain("loop_task.run.id=run-1");
    expect(attrs).toContain("loop_task.loop.id=loop-1");
    expect(attrs).toContain("loop_task.task.id=task-1");
    expect(attrs).toContain("loop_task.project.id=proj-1");
  });

  it("merges with existing OTEL_RESOURCE_ATTRIBUTES", () => {
    const original = process.env.OTEL_RESOURCE_ATTRIBUTES;
    process.env.OTEL_RESOURCE_ATTRIBUTES = "existing.key=existing.value";
    try {
      const adapter = new OpenTelemetryAdapter(makeSettings());
      const result = adapter.prepareChildProcess(
        { command: "echo", args: ["hello"], cwd: "/tmp" },
        { runId: "run-1", loopId: "loop-1", loopName: "test" },
      );
      const attrs = result.env.OTEL_RESOURCE_ATTRIBUTES!;
      expect(attrs).toContain("existing.key=existing.value");
      expect(attrs).toContain("loop_task.run.id=run-1");
    } finally {
      process.env.OTEL_RESOURCE_ATTRIBUTES = original;
    }
  });

  it("detects opencode and injects activation env", () => {
    const adapter = new OpenTelemetryAdapter(makeSettings());
    const result = adapter.prepareChildProcess(
      { command: "opencode", args: ["run", "implement feature"], cwd: "/tmp" },
      { runId: "run-1", loopId: "loop-1", loopName: "test" },
    );
    expect(result.env.OPENCODE_EXPERIMENTAL_OPEN_TELEMETRY).toBe("true");
    expect(result.integrationId).toBe("opencode");
  });

  it("detects claude and injects activation env", () => {
    const adapter = new OpenTelemetryAdapter(makeSettings());
    const result = adapter.prepareChildProcess(
      { command: "claude", args: ["-p", "implement feature"], cwd: "/tmp" },
      { runId: "run-1", loopId: "loop-1", loopName: "test" },
    );
    expect(result.env.CLAUDE_CODE_ENABLE_TELEMETRY).toBe("1");
    expect(result.integrationId).toBe("claude-code");
  });

  it("does not inject agent-specific vars for generic commands", () => {
    const adapter = new OpenTelemetryAdapter(makeSettings());
    const result = adapter.prepareChildProcess(
      { command: "echo", args: ["hello"], cwd: "/tmp" },
      { runId: "run-1", loopId: "loop-1", loopName: "test" },
    );
    expect(result.env.OPENCODE_EXPERIMENTAL_OPEN_TELEMETRY).toBeUndefined();
    expect(result.env.CLAUDE_CODE_ENABLE_TELEMETRY).toBeUndefined();
    expect(result.integrationId).toBeUndefined();
  });

  it("skips agent integration when autoInstrumentAgents is disabled", () => {
    const adapter = new OpenTelemetryAdapter(makeSettings({ telemetryAutoInstrumentAgents: false }));
    const result = adapter.prepareChildProcess(
      { command: "opencode", args: ["run", "test"], cwd: "/tmp" },
      { runId: "run-1", loopId: "loop-1", loopName: "test" },
    );
    expect(result.env.OPENCODE_EXPERIMENTAL_OPEN_TELEMETRY).toBeUndefined();
    expect(result.integrationId).toBeUndefined();
    // But still injects generic OTLP vars
    expect(result.env.OTEL_EXPORTER_OTLP_ENDPOINT).toBe("http://localhost:4318");
  });
});

describe("OpenTelemetryAdapter.resolveEndpoint", () => {
  it("returns settings endpoint when configured", () => {
    const adapter = new OpenTelemetryAdapter(makeSettings({ telemetryEndpoint: "http://custom:4318" }));
    expect(adapter.resolveEndpoint()).toBe("http://custom:4318");
  });

  it("falls back to env var when setting is not set", () => {
    const original = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://env-fallback:4318";
    try {
      const adapter = new OpenTelemetryAdapter(makeSettings({ telemetryEndpoint: undefined }));
      expect(adapter.resolveEndpoint()).toBe("http://env-fallback:4318");
    } finally {
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = original;
    }
  });
});

describe("OpenTelemetryAdapter.resolveProtocol", () => {
  it("returns settings protocol by default", () => {
    const adapter = new OpenTelemetryAdapter(makeSettings({ telemetryProtocol: "grpc" }));
    expect(adapter.resolveProtocol()).toBe("grpc");
  });

  it("falls back to env var when set", () => {
    const original = process.env.OTEL_EXPORTER_OTLP_PROTOCOL;
    process.env.OTEL_EXPORTER_OTLP_PROTOCOL = "grpc";
    try {
      const adapter = new OpenTelemetryAdapter(makeSettings({ telemetryProtocol: "http/protobuf" }));
      expect(adapter.resolveProtocol()).toBe("grpc");
    } finally {
      process.env.OTEL_EXPORTER_OTLP_PROTOCOL = original;
    }
  });
});

describe("OpenTelemetryAdapter.flush", () => {
  it("surfaces SDK flush errors instead of reporting success", async () => {
    const adapter = new OpenTelemetryAdapter(makeSettings({ telemetryEnabled: false }));
    (adapter as unknown as { sdk: unknown }).sdk = {};

    await expect(adapter.flush()).rejects.toThrow(
      "OpenTelemetry SDK providers do not support forceFlush",
    );
    expect(adapter.getStatus().lastExportError).toContain("do not support forceFlush");
  });
});
