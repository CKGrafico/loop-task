import { describe, it, expect } from "vitest";
import { TelemetryManager } from "../src/daemon/telemetry/telemetry-manager.js";
import type { DaemonSettings } from "../src/types.js";

function makeSettings(overrides: Partial<DaemonSettings> = {}): DaemonSettings {
  return {
    httpApiEnabled: true,
    mcpApiEnabled: true,
    httpApiHost: "0.0.0.0",
    telemetryEnabled: true,
    telemetryEndpoint: undefined,
    telemetryProtocol: "http/protobuf",
    telemetryAutoInstrumentAgents: true,
    telemetryCaptureContent: false,
    telemetryCaptureCommandOutput: false,
    telemetryServiceName: "loop-task",
    ...overrides,
  };
}

describe("TelemetryManager", () => {
  it("uses NoopTelemetryAdapter when telemetry is disabled", () => {
    const mgr = new TelemetryManager(makeSettings({ telemetryEnabled: false }));
    const status = mgr.getStatus();
    expect(status.enabled).toBe(false);
    expect(status.exporterState).toBe("disabled");
  });

  it("uses NoopTelemetryAdapter with enabled-but-no-endpoint", () => {
    const mgr = new TelemetryManager(makeSettings({ telemetryEnabled: true }));
    const status = mgr.getStatus();
    expect(status.enabled).toBe(true);
    expect(status.exporterState).toBe("not-configured");
    expect(status.exporterConfigured).toBe(false);
  });

  it("creates OpenTelemetryAdapter when enabled with endpoint", () => {
    const mgr = new TelemetryManager(makeSettings({
      telemetryEnabled: true,
      telemetryEndpoint: "http://localhost:4318",
    }));
    const status = mgr.getStatus();
    expect(status.enabled).toBe(true);
    expect(status.exporterConfigured).toBe(true);
    expect(status.exporterState).toBe("configured");
  });

  it("getAdapter returns the current adapter", () => {
    const mgr = new TelemetryManager(makeSettings({ telemetryEnabled: false }));
    const adapter = mgr.getAdapter();
    expect(adapter).toBeDefined();
  });

  it("testConnection returns failure when disabled", async () => {
    const mgr = new TelemetryManager(makeSettings({ telemetryEnabled: false }));
    const result = await mgr.testConnection();
    expect(result.success).toBe(false);
    expect(result.message).toContain("disabled");
  });

  it("testConnection returns failure when no endpoint", async () => {
    const mgr = new TelemetryManager(makeSettings({ telemetryEnabled: true }));
    const result = await mgr.testConnection();
    expect(result.success).toBe(false);
    expect(result.message).toContain("endpoint");
  });

  it("onSettingsChanged reconfigures adapter from disabled to enabled", () => {
    const mgr = new TelemetryManager(makeSettings({ telemetryEnabled: false }));
    expect(mgr.getStatus().enabled).toBe(false);

    mgr.onSettingsChanged(makeSettings({
      telemetryEnabled: true,
      telemetryEndpoint: "http://localhost:4318",
    }));
    expect(mgr.getStatus().enabled).toBe(true);
    expect(mgr.getStatus().exporterConfigured).toBe(true);
  });

  it("onSettingsChanged reconfigures adapter from enabled to disabled", () => {
    const mgr = new TelemetryManager(makeSettings({
      telemetryEnabled: true,
      telemetryEndpoint: "http://localhost:4318",
    }));
    expect(mgr.getStatus().enabled).toBe(true);

    mgr.onSettingsChanged(makeSettings({ telemetryEnabled: false }));
    expect(mgr.getStatus().enabled).toBe(false);
    expect(mgr.getStatus().exporterState).toBe("disabled");
  });

  it("onSettingsChanged does not reconfigure for unrelated settings", () => {
    const mgr = new TelemetryManager(makeSettings({ telemetryEnabled: false }));
    const statusBefore = mgr.getStatus();
    mgr.onSettingsChanged(makeSettings({
      telemetryEnabled: false,
      httpApiEnabled: false,
    }));
    const statusAfter = mgr.getStatus();
    expect(statusBefore.enabled).toBe(statusAfter.enabled);
  });

  it("shutdown completes without error", async () => {
    const mgr = new TelemetryManager(makeSettings({ telemetryEnabled: false }));
    await expect(mgr.shutdown()).resolves.toBeUndefined();
  });

  it("flush completes without error", async () => {
    const mgr = new TelemetryManager(makeSettings({ telemetryEnabled: false }));
    await expect(mgr.flush()).resolves.toBeUndefined();
  });
});
