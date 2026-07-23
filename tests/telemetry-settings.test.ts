import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { SettingsManager } from "../src/daemon/settings-manager.js";

describe("Telemetry Settings", () => {
  let tmpDir: string;
  let originalHome: string | undefined;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "loop-test-"));
    originalHome = process.env.LOOP_CLI_HOME;
    process.env.LOOP_CLI_HOME = tmpDir;
    fs.mkdirSync(path.join(tmpDir, ".loop-cli"), { recursive: true });
  });

  afterEach(() => {
    if (originalHome !== undefined) {
      process.env.LOOP_CLI_HOME = originalHome;
    } else {
      delete process.env.LOOP_CLI_HOME;
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("telemetry defaults to enabled", () => {
    const sm = new SettingsManager();
    sm.load();
    expect(sm.get().telemetryEnabled).toBe(true);
  });

  it("telemetry endpoint defaults to undefined", () => {
    const sm = new SettingsManager();
    sm.load();
    expect(sm.get().telemetryEndpoint).toBeUndefined();
  });

  it("agent auto-instrumentation defaults to enabled", () => {
    const sm = new SettingsManager();
    sm.load();
    expect(sm.get().telemetryAutoInstrumentAgents).toBe(true);
  });

  it("content capture defaults to disabled", () => {
    const sm = new SettingsManager();
    sm.load();
    expect(sm.get().telemetryCaptureContent).toBe(false);
    expect(sm.get().telemetryCaptureCommandOutput).toBe(false);
  });

  it("old settings files receive new defaults", () => {
    fs.writeFileSync(
      path.join(tmpDir, ".loop-cli", "settings.json"),
      JSON.stringify({ httpApiEnabled: false })
    );
    const sm = new SettingsManager();
    sm.load();
    expect(sm.get().httpApiEnabled).toBe(false);
    expect(sm.get().telemetryEnabled).toBe(true);
    expect(sm.get().telemetryAutoInstrumentAgents).toBe(true);
  });

  it("telemetry settings persist", () => {
    const sm = new SettingsManager();
    sm.load();
    sm.set({ telemetryEnabled: false, telemetryEndpoint: "http://localhost:4318" });
    const sm2 = new SettingsManager();
    sm2.load();
    expect(sm2.get().telemetryEnabled).toBe(false);
    expect(sm2.get().telemetryEndpoint).toBe("http://localhost:4318");
  });

  it("partial updates preserve unrelated settings", () => {
    const sm = new SettingsManager();
    sm.load();
    sm.set({ telemetryEndpoint: "http://localhost:4318" });
    expect(sm.get().telemetryEnabled).toBe(true);
    expect(sm.get().httpApiEnabled).toBe(true);
    expect(sm.get().mcpApiEnabled).toBe(true);
  });

  it("runtime listeners are called on telemetry changes", () => {
    const sm = new SettingsManager();
    sm.load();
    let called = false;
    sm.onChange(() => { called = true; });
    sm.set({ telemetryEnabled: false });
    expect(called).toBe(true);
  });

  it("getTelemetrySettings extracts correct subset", () => {
    const sm = new SettingsManager();
    sm.load();
    sm.set({ telemetryEndpoint: "http://localhost:4318", telemetryEnabled: true });
    const ts = sm.getTelemetrySettings();
    expect(ts.enabled).toBe(true);
    expect(ts.endpoint).toBe("http://localhost:4318");
    expect(ts.protocol).toBe("http/protobuf");
    expect(ts.autoInstrumentAgents).toBe(true);
    expect(ts.captureContent).toBe(false);
    expect(ts.captureCommandOutput).toBe(false);
    expect(ts.serviceName).toBe("loop-task");
  });

  it("protocol can be set to grpc", () => {
    const sm = new SettingsManager();
    sm.load();
    sm.set({ telemetryProtocol: "grpc" });
    expect(sm.get().telemetryProtocol).toBe("grpc");
  });
});
