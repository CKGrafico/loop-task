import { describe, it, expect } from "vitest";
import { execa } from "execa";

const cliPath = "src/cli.ts";
const runtime = "bun";

describe("cli", () => {
  it("shows help output", async () => {
    const result = await execa(runtime, [cliPath, "--help"]);
    expect(result.stdout).toContain("loop-task");
    expect(result.stdout).toContain("start");
    expect(result.stdout).toContain("run");
    expect(result.stdout).toContain("Open the loop board");

    const startHelp = await execa(runtime, [cliPath, "start", "--help"]);
    expect(startHelp.stdout).toContain("--now");
    expect(startHelp.stdout).toContain("--max-runs");
    expect(startHelp.stdout).toContain("--verbose");
  });

  it("shows version", async () => {
    const result = await execa(runtime, [cliPath, "--version"]);
    expect(result.stdout.trim()).toBe("1.1.0");
  });

  it("fails with invalid duration", async () => {
    try {
      await execa(runtime, [cliPath, "run", "abc", "echo", "hello"]);
      expect.unreachable("should have thrown");
    } catch (error: unknown) {
      const e = error as { stderr: string; exitCode: number };
      expect(e.exitCode).not.toBe(0);
      expect(e.stderr).toContain("Invalid duration");
    }
  });

  it("fails with negative duration", async () => {
    try {
      await execa(runtime, [cliPath, "run", "--", "-1h", "echo", "hello"]);
      expect.unreachable("should have thrown");
    } catch (error: unknown) {
      const e = error as { stderr: string; exitCode: number };
      expect(e.exitCode).not.toBe(0);
      expect(e.stderr).toContain("Duration must be positive");
    }
  });

  it("fails with missing arguments", async () => {
    try {
      await execa(runtime, [cliPath, "run"]);
      expect.unreachable("should have thrown");
    } catch (error: unknown) {
      const e = error as { exitCode: number; stderr: string };
      expect(e.exitCode).not.toBe(0);
      expect(e.stderr).toContain("missing required argument");
    }
  });

  it("runs with max-runs 1 and now", async () => {
    const result = await execa(runtime, [
      cliPath,
      "run",
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
    const result = await execa(runtime, [
      cliPath,
      "run",
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
