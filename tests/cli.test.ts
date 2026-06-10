import { describe, it, expect } from "vitest";
import { execa } from "execa";

const cliPath = "dist/cli.js";

describe("cli", () => {
  it("shows help output", async () => {
    const result = await execa("node", [cliPath, "--help"]);
    expect(result.stdout).toContain("loop-task [options] <interval> <command>");
    expect(result.stdout).toContain("--now");
    expect(result.stdout).toContain("--max-runs");
    expect(result.stdout).toContain("--verbose");
    expect(result.stdout).toContain("Examples:");
  });

  it("shows version", async () => {
    const result = await execa("node", [cliPath, "--version"]);
    expect(result.stdout.trim()).toBe("1.0.0");
  });

  it("fails with invalid duration", async () => {
    try {
      await execa("node", [cliPath, "abc", "echo", "hello"]);
      expect.unreachable("should have thrown");
    } catch (error: unknown) {
      const e = error as { stderr: string; exitCode: number };
      expect(e.exitCode).not.toBe(0);
      expect(e.stderr).toContain("Invalid duration");
    }
  });

  it("fails with negative duration", async () => {
    try {
      await execa("node", [cliPath, "-1h", "echo", "hello"]);
      expect.unreachable("should have thrown");
    } catch (error: unknown) {
      const e = error as { stderr: string; exitCode: number };
      expect(e.exitCode).not.toBe(0);
    }
  });

  it("fails with missing arguments", async () => {
    try {
      await execa("node", [cliPath]);
      expect.unreachable("should have thrown");
    } catch (error: unknown) {
      const e = error as { exitCode: number };
      expect(e.exitCode).not.toBe(0);
    }
  });

  it("runs with max-runs 1 and now", async () => {
    const result = await execa("node", [
      cliPath,
      "--now",
      "--max-runs",
      "1",
      "1s",
      "echo",
      "loop-test",
    ]);
    expect(result.stdout).toContain("loop-test");
    expect(result.stdout).toContain("Run 1/1");
    expect(result.stdout).toContain("Completed 1 run(s)");
  });

  it("runs with verbose mode", async () => {
    const result = await execa("node", [
      cliPath,
      "--verbose",
      "--now",
      "--max-runs",
      "1",
      "1s",
      "echo",
      "verbose-test",
    ]);
    expect(result.stdout).toContain("verbose-test");
    expect(result.stdout).toContain("Started at:");
    expect(result.stdout).toContain("Ended at:");
    expect(result.stdout).toContain("Exit code:");
    expect(result.stdout).toContain("Duration:");
  });
});
