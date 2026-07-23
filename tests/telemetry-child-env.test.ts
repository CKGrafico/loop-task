import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NoopTelemetryAdapter } from "../src/daemon/telemetry/noop-telemetry-adapter.js";

describe("Child Environment Preparation", () => {
  let envBackup: NodeJS.ProcessEnv;

  beforeEach(() => {
    envBackup = { ...process.env };
  });

  afterEach(() => {
    process.env = envBackup;
  });

  it("NoopAdapter returns empty env when disabled", () => {
    const adapter = new NoopTelemetryAdapter({ enabled: false, exporterState: "disabled" });
    const result = adapter.prepareChildProcess(
      { command: "test", args: [], cwd: "/tmp" },
      { runId: "r1", loopId: "l1", loopName: "test" },
    );
    expect(result.env).toEqual({});
  });

  it("NoopAdapter does not mutate global process.env", () => {
    const adapter = new NoopTelemetryAdapter({ enabled: false, exporterState: "disabled" });
    const before = { ...process.env };
    adapter.prepareChildProcess(
      { command: "test", args: [], cwd: "/tmp" },
      { runId: "r1", loopId: "l1", loopName: "test" },
    );
    expect(process.env).toEqual(before);
  });

  it("NoopAdapter does not inject telemetry variables when disabled", () => {
    const adapter = new NoopTelemetryAdapter({ enabled: false, exporterState: "disabled" });
    const result = adapter.prepareChildProcess(
      { command: "test", args: [], cwd: "/tmp" },
      { runId: "r1", loopId: "l1", loopName: "test" },
    );
    expect(result.env.OTEL_EXPORTER_OTLP_ENDPOINT).toBeUndefined();
  });
});
