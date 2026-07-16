import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { SettingsManager } from "../src/daemon/settings-manager.js";

describe("SettingsManager", () => {
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

  it("loads defaults when settings.json does not exist", () => {
    const sm = new SettingsManager();
    sm.load();
    expect(sm.get()).toEqual({ httpApiEnabled: true, mcpApiEnabled: true, httpApiHost: "0.0.0.0" });
  });

  it("saves and loads settings", () => {
    const sm = new SettingsManager();
    sm.load();
    sm.set({ httpApiEnabled: false });
    const sm2 = new SettingsManager();
    sm2.load();
    expect(sm2.get()).toEqual({ httpApiEnabled: false, mcpApiEnabled: true, httpApiHost: "0.0.0.0" });
  });

  it("falls back to defaults on corruption", () => {
    fs.writeFileSync(path.join(tmpDir, "settings.json"), "not valid json{{{");
    const sm = new SettingsManager();
    sm.load();
    expect(sm.get()).toEqual({ httpApiEnabled: true, mcpApiEnabled: true, httpApiHost: "0.0.0.0" });
  });

  it("falls back to defaults on non-object JSON", () => {
    fs.writeFileSync(path.join(tmpDir, "settings.json"), "42");
    const sm = new SettingsManager();
    sm.load();
    expect(sm.get()).toEqual({ httpApiEnabled: true, mcpApiEnabled: true, httpApiHost: "0.0.0.0" });
  });

  it("onChange callback fires on set", () => {
    const sm = new SettingsManager();
    sm.load();
    const cb = vi.fn();
    sm.onChange(cb);
    sm.set({ httpApiEnabled: false });
    expect(cb).toHaveBeenCalledWith({ httpApiEnabled: false, mcpApiEnabled: true, httpApiHost: "0.0.0.0" });
  });

  it("set merges partial updates", () => {
    const sm = new SettingsManager();
    sm.load();
    const result = sm.set({ httpApiEnabled: false });
    expect(result.httpApiEnabled).toBe(false);
    expect(sm.get().httpApiEnabled).toBe(false);
  });

  it("get returns a copy", () => {
    const sm = new SettingsManager();
    sm.load();
    const a = sm.get();
    const b = sm.get();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
});
