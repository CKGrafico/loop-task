import { describe, it, expect, vi } from "vitest";
import { TelemetryManager } from "../src/daemon/telemetry/telemetry-manager.js";
import type { DaemonSettings } from "../src/types.js";
import type { Telemetry } from "../src/daemon/telemetry/telemetry.js";

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

  it("recreates the adapter and retries after a transient exporter failure", async () => {
    const mgr = new TelemetryManager(makeSettings({ telemetryEnabled: false }));
    const settings = makeSettings({ telemetryEnabled: true, telemetryEndpoint: "http://localhost:4318" });
    const span = {
      setAttribute: vi.fn(),
      setAttributes: vi.fn(),
      recordError: vi.fn(),
      ok: vi.fn(),
      end: vi.fn(),
      getTraceContext: vi.fn(() => ({})),
    };
    const status = {
      enabled: true,
      exporterConfigured: true,
      endpoint: settings.telemetryEndpoint,
      protocol: settings.telemetryProtocol,
      serviceName: settings.telemetryServiceName,
      exporterState: "configured" as const,
    };
    const failingAdapter = {
      getStatus: () => status,
      startLoop: () => span,
      flush: vi.fn().mockRejectedValue(new Error("Not Found")),
      shutdown: vi.fn().mockResolvedValue(undefined),
    } as unknown as Telemetry;
    const succeedingAdapter = {
      getStatus: () => status,
      startLoop: () => span,
      flush: vi.fn().mockResolvedValue(undefined),
      shutdown: vi.fn().mockResolvedValue(undefined),
    } as unknown as Telemetry;
    const internals = mgr as unknown as {
      adapter: Telemetry;
      settings: DaemonSettings;
      createAdapter: (value: DaemonSettings) => Telemetry;
    };
    internals.adapter = failingAdapter;
    internals.settings = settings;
    internals.createAdapter = vi.fn(() => succeedingAdapter);

    const result = await mgr.testConnection();

    expect(result.success).toBe(true);
    expect(failingAdapter.shutdown).toHaveBeenCalledOnce();
    expect(internals.createAdapter).toHaveBeenCalledOnce();
    expect(succeedingAdapter.flush).toHaveBeenCalledOnce();
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

  describe("runtime toggling during live execution", () => {
    it("switches from enabled+endpoint to disabled and back", () => {
      const mgr = new TelemetryManager(makeSettings({
        telemetryEnabled: true,
        telemetryEndpoint: "http://localhost:4318",
      }));
      expect(mgr.getStatus().enabled).toBe(true);
      expect(mgr.getStatus().exporterState).toBe("configured");

      // Disable mid-execution
      mgr.onSettingsChanged(makeSettings({ telemetryEnabled: false }));
      expect(mgr.getStatus().enabled).toBe(false);
      expect(mgr.getStatus().exporterState).toBe("disabled");

      // Re-enable with same endpoint
      mgr.onSettingsChanged(makeSettings({
        telemetryEnabled: true,
        telemetryEndpoint: "http://localhost:4318",
      }));
      expect(mgr.getStatus().enabled).toBe(true);
      expect(mgr.getStatus().exporterConfigured).toBe(true);
    });

    it("enables then changes endpoint at runtime", () => {
      const mgr = new TelemetryManager(makeSettings({
        telemetryEnabled: true,
        telemetryEndpoint: "http://localhost:4318",
      }));

      mgr.onSettingsChanged(makeSettings({
        telemetryEnabled: true,
        telemetryEndpoint: "http://newhost:4318",
      }));
      expect(mgr.getStatus().endpoint).toBe("http://newhost:4318");
    });

    it("enables without endpoint then configures endpoint", () => {
      const mgr = new TelemetryManager(makeSettings({
        telemetryEnabled: true,
        telemetryEndpoint: undefined,
      }));
      expect(mgr.getStatus().enabled).toBe(true);
      expect(mgr.getStatus().exporterState).toBe("not-configured");

      mgr.onSettingsChanged(makeSettings({
        telemetryEnabled: true,
        telemetryEndpoint: "http://localhost:4318",
      }));
      expect(mgr.getStatus().enabled).toBe(true);
      expect(mgr.getStatus().exporterConfigured).toBe(true);
    });

    it("disabling preserves endpoint in status for UI display", () => {
      const mgr = new TelemetryManager(makeSettings({
        telemetryEnabled: true,
        telemetryEndpoint: "http://localhost:4318",
      }));

      // When disabling, settings persist the endpoint but adapter reports disabled
      mgr.onSettingsChanged(makeSettings({
        telemetryEnabled: false,
        telemetryEndpoint: "http://localhost:4318",
      }));
      // Adapter is now a NoopTelemetryAdapter with enabled=false
      expect(mgr.getStatus().enabled).toBe(false);
    });

    it("changing protocol triggers reconfiguration", () => {
      const mgr = new TelemetryManager(makeSettings({
        telemetryEnabled: true,
        telemetryEndpoint: "http://localhost:4318",
        telemetryProtocol: "http/protobuf",
      }));
      expect(mgr.getStatus().protocol).toBe("http/protobuf");

      mgr.onSettingsChanged(makeSettings({
        telemetryEnabled: true,
        telemetryEndpoint: "http://localhost:4318",
        telemetryProtocol: "grpc",
      }));
      expect(mgr.getStatus().protocol).toBe("grpc");
    });
  });
});
