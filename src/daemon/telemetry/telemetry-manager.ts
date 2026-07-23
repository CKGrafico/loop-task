import type { Telemetry } from "./telemetry.js";
import type { TelemetryStatus } from "./telemetry-types.js";
import type { DaemonSettings } from "../../types.js";
import { NoopTelemetryAdapter } from "./noop-telemetry-adapter.js";
import { OpenTelemetryAdapter } from "./open-telemetry-adapter.js";
import { daemonLog } from "../daemon-log.js";

/**
 * Manages the lifecycle of the telemetry system.
 * Responds to runtime settings changes by switching between
 * NoopTelemetryAdapter and OpenTelemetryAdapter.
 *
 * This is the single entry point the daemon uses for telemetry.
 */
export class TelemetryManager {
  private adapter: Telemetry;
  private settings: DaemonSettings;

  constructor(settings: DaemonSettings) {
    this.settings = settings;
    this.adapter = this.createAdapter(settings);
  }

  private createAdapter(settings: DaemonSettings): Telemetry {
    if (!settings.telemetryEnabled) {
      return new NoopTelemetryAdapter({
        enabled: false,
        exporterState: "disabled",
        protocol: settings.telemetryProtocol,
        serviceName: settings.telemetryServiceName,
      });
    }

    if (!settings.telemetryEndpoint) {
      // Enabled but no endpoint: no-op that reports "not-configured"
      return new NoopTelemetryAdapter({
        enabled: true,
        exporterConfigured: false,
        exporterState: "not-configured",
        protocol: settings.telemetryProtocol,
        serviceName: settings.telemetryServiceName,
        autoInstrumentAgents: settings.telemetryAutoInstrumentAgents,
        captureContent: settings.telemetryCaptureContent,
        captureCommandOutput: settings.telemetryCaptureCommandOutput,
      });
    }

    return new OpenTelemetryAdapter(settings);
  }

  /**
   * Called when daemon settings change at runtime.
   * May replace the adapter if telemetry settings changed.
   */
  onSettingsChanged(newSettings: DaemonSettings): void {
    const oldSettings = this.settings;
    this.settings = newSettings;

    const telemetryChanged =
      oldSettings.telemetryEnabled !== newSettings.telemetryEnabled ||
      oldSettings.telemetryEndpoint !== newSettings.telemetryEndpoint ||
      oldSettings.telemetryProtocol !== newSettings.telemetryProtocol ||
      oldSettings.telemetryServiceName !== newSettings.telemetryServiceName;

    if (!telemetryChanged) return;

    daemonLog(`telemetry: settings changed, reconfiguring adapter`);

    // Flush and shutdown old adapter before creating new one
    const oldAdapter = this.adapter;
    (async () => {
      try {
        await oldAdapter.flush();
        await oldAdapter.shutdown();
      } catch (err) {
        daemonLog(`telemetry: flush/shutdown during reconfigure failed: ${String(err)}`);
      }
    })();

    // Create new adapter with updated settings
    this.adapter = this.createAdapter(newSettings);
  }

  /** Get the current telemetry adapter */
  getAdapter(): Telemetry {
    return this.adapter;
  }

  /** Get telemetry status */
  getStatus(): TelemetryStatus {
    return this.adapter.getStatus();
  }

  /**
   * Test the telemetry connection by emitting a diagnostic span
   * and attempting a flush. Returns success or error message.
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    const status = this.adapter.getStatus();

    if (!status.enabled) {
      return { success: false, message: "OpenTelemetry is disabled" };
    }

    if (!status.endpoint) {
      return { success: false, message: "No endpoint configured" };
    }

    try {
      // Start and end a diagnostic span
      const span = this.adapter.startLoop({
        loopId: "diagnostic",
        loopName: "connection-test",
        runId: `test-${Date.now()}`,
      });
      span.setAttribute("loop_task.diagnostic", true);
      span.ok();

      // Attempt a bounded flush
      await Promise.race([
        this.adapter.flush(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("flush timeout")), 5000),
        ),
      ]);

      return { success: true, message: status.endpoint };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: msg };
    }
  }

  /** Flush pending telemetry */
  async flush(): Promise<void> {
    await this.adapter.flush();
  }

  /** Shutdown telemetry gracefully */
  async shutdown(): Promise<void> {
    try {
      await Promise.race([
        this.adapter.flush(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("flush timeout")), 5000),
        ),
      ]);
    } catch (err) {
      daemonLog(`telemetry: flush during shutdown failed: ${String(err)}`);
    }
    await this.adapter.shutdown();
  }
}
