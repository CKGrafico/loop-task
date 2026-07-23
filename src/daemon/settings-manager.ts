import fs from "node:fs";
import type { DaemonSettings, TelemetrySettings } from "../types.js";
import { settingsJson } from "../shared/config/paths.js";
import { daemonLog } from "./daemon-log.js";

const DEFAULTS: DaemonSettings = {
  httpApiEnabled: true,
  mcpApiEnabled: true,
  // Binds to all interfaces by default: the daemon is meant to be reachable
  // (e.g. over SSH/Tailscale/LAN). The API is unauthenticated, so securing
  // access is the operator's job at the network layer; restrict the bind with
  // `loop-task http-host <ip|local>` when you want loopback-only.
  httpApiHost: "0.0.0.0",
  telemetryEnabled: true,
  telemetryEndpoint: undefined,
  telemetryProtocol: "http/protobuf",
  telemetryAutoInstrumentAgents: true,
  telemetryCaptureContent: false,
  telemetryCaptureCommandOutput: false,
  telemetryServiceName: "loop-task",
};

export class SettingsManager {
  private settings: DaemonSettings = { ...DEFAULTS };
  private listeners: Array<(settings: DaemonSettings) => void> = [];

  load(): void {
    try {
      const raw = fs.readFileSync(settingsJson(), "utf-8");
      const parsed = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null) {
        this.settings = { ...DEFAULTS, ...parsed };
      }
    } catch {
      this.settings = { ...DEFAULTS };
    }
  }

  save(): void {
    const tmp = settingsJson() + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(this.settings, null, 2));
    fs.renameSync(tmp, settingsJson());
  }

  get(): DaemonSettings {
    return { ...this.settings };
  }

  set(partial: Partial<DaemonSettings>): DaemonSettings {
    this.settings = { ...this.settings, ...partial };
    this.save();
    for (const cb of this.listeners) {
      try {
        cb(this.get());
      } catch (err) {
        daemonLog(`settings onChange error: ${String(err)}`);
      }
    }
    return this.get();
  }

  getTelemetrySettings(): TelemetrySettings {
    const s = this.settings;
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

  onChange(callback: (settings: DaemonSettings) => void): void {
    this.listeners.push(callback);
  }
}
