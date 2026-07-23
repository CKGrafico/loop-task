import { injectable } from "inversify";
import type { DaemonSettings, TelemetrySettings } from "../../types.js";
import { sendRequest } from "../../client/ipc.js";
import type { SettingsService } from "./types.js";

@injectable()
export class IpcSettingsService implements SettingsService {
  async getSettings(): Promise<DaemonSettings> {
    const response = await sendRequest({ type: "settings-get" });
    if (response.type !== "ok") {
      throw new Error((response as { message?: string }).message ?? "Failed to get settings");
    }
    return response.data as DaemonSettings;
  }

  async getHttpApiEnabled(): Promise<boolean> {
    const response = await sendRequest({ type: "settings-get" });
    if (response.type !== "ok") {
      throw new Error((response as { message?: string }).message ?? "Failed to get settings");
    }
    return (response.data as DaemonSettings).httpApiEnabled;
  }

  async setHttpApiEnabled(enabled: boolean): Promise<DaemonSettings> {
    const response = await sendRequest({ type: "settings-set", settings: { httpApiEnabled: enabled } });
    if (response.type !== "ok") {
      throw new Error((response as { message?: string }).message ?? "Failed to set settings");
    }
    return response.data as DaemonSettings;
  }

  async getMcpApiEnabled(): Promise<boolean> {
    const response = await sendRequest({ type: "settings-get" });
    if (response.type !== "ok") {
      throw new Error((response as { message?: string }).message ?? "Failed to get settings");
    }
    return (response.data as DaemonSettings).mcpApiEnabled;
  }

  async setMcpApiEnabled(enabled: boolean): Promise<DaemonSettings> {
    const response = await sendRequest({ type: "settings-set", settings: { mcpApiEnabled: enabled } });
    if (response.type !== "ok") {
      throw new Error((response as { message?: string }).message ?? "Failed to set settings");
    }
    return response.data as DaemonSettings;
  }

  async getTelemetryEnabled(): Promise<boolean> {
    const response = await sendRequest({ type: "settings-get" });
    if (response.type !== "ok") {
      throw new Error((response as { message?: string }).message ?? "Failed to get settings");
    }
    return (response.data as DaemonSettings).telemetryEnabled;
  }

  async setTelemetryEnabled(enabled: boolean): Promise<DaemonSettings> {
    const response = await sendRequest({ type: "settings-set", settings: { telemetryEnabled: enabled } });
    if (response.type !== "ok") {
      throw new Error((response as { message?: string }).message ?? "Failed to set settings");
    }
    return response.data as DaemonSettings;
  }

  async getTelemetrySettings(): Promise<TelemetrySettings> {
    const response = await sendRequest({ type: "settings-get" });
    if (response.type !== "ok") {
      throw new Error((response as { message?: string }).message ?? "Failed to get settings");
    }
    const s = response.data as DaemonSettings;
    return {
      enabled: s.telemetryEnabled,
      endpoint: s.telemetryEndpoint,
      protocol: s.telemetryProtocol,
      autoInstrumentAgents: s.telemetryAutoInstrumentAgents,
      captureContent: s.telemetryCaptureContent,
      captureCommandOutput: s.telemetryCaptureCommandOutput,
      serviceName: s.telemetryServiceName,
    };
  }

  async setTelemetrySettings(settings: Partial<TelemetrySettings>): Promise<DaemonSettings> {
    const mapping: Record<string, string> = {
      enabled: "telemetryEnabled",
      endpoint: "telemetryEndpoint",
      protocol: "telemetryProtocol",
      autoInstrumentAgents: "telemetryAutoInstrumentAgents",
      captureContent: "telemetryCaptureContent",
      captureCommandOutput: "telemetryCaptureCommandOutput",
      serviceName: "telemetryServiceName",
    };
    const daemonSettings: Partial<DaemonSettings> = {};
    for (const [key, value] of Object.entries(settings)) {
      const daemonKey = mapping[key];
      if (daemonKey) {
        (daemonSettings as Record<string, unknown>)[daemonKey] = value;
      }
    }
    const response = await sendRequest({ type: "settings-set", settings: daemonSettings });
    if (response.type !== "ok") {
      throw new Error((response as { message?: string }).message ?? "Failed to set settings");
    }
    return response.data as DaemonSettings;
  }
}
