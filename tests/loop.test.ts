import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { runLoop, executeCommandForeground } from "../src/loop.js";
import { Logger } from "../src/logger.js";
import type { LoopOptions } from "../src/types.js";

vi.mock("execa", () => ({
  execa: vi.fn(),
}));

import { execa } from "execa";

const mockedExeca = vi.mocked(execa);

function createLogger(): Logger {
  return new Logger(false);
}

function createAbortController(): AbortController {
  return new AbortController();
}

describe("executeCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns exit code 0 on success", async () => {
    mockedExeca.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "",
      stderr: "",
      failed: false,
    } as never);

    const result = await executeCommandForeground("echo", ["hello"], createLogger());
    expect(result.exitCode).toBe(0);
    expect(result.duration).toBeGreaterThanOrEqual(0);
    expect(result.startedAt).toBeInstanceOf(Date);
    expect(result.endedAt).toBeInstanceOf(Date);
  });

  it("returns non-zero exit code on failure", async () => {
    const error = new Error("command failed") as Error & { exitCode: number };
    error.exitCode = 1;
    mockedExeca.mockRejectedValueOnce(error);

    const result = await executeCommandForeground("exit", ["1"], createLogger());
    expect(result.exitCode).toBe(1);
  });

  it("returns exit code 1 for unknown errors", async () => {
    mockedExeca.mockRejectedValueOnce(new Error("unknown"));

    const result = await executeCommandForeground("bad", [], createLogger());
    expect(result.exitCode).toBe(1);
  });
});

describe("runLoop", () => {
  let logger: Logger;
  let controller: AbortController;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    logger = createLogger();
    controller = createAbortController();
    vi.spyOn(process, "on").mockImplementation(() => process);
    vi.spyOn(process, "removeListener").mockImplementation(() => process);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("executes command and respects max-runs", async () => {
    mockedExeca.mockResolvedValue({
      exitCode: 0,
      stdout: "",
      stderr: "",
      failed: false,
    } as never);

    const options: LoopOptions = {
      interval: 1000,
      command: "echo",
      commandArgs: ["hello"],
      immediate: true,
      maxRuns: 2,
      verbose: false,
    };

    const promise = runLoop(options, logger, controller.signal);

    await vi.runAllTimersAsync();
    await promise;

    expect(mockedExeca).toHaveBeenCalledTimes(2);
  });

  it("waits before first run when not immediate", async () => {
    mockedExeca.mockResolvedValue({
      exitCode: 0,
      stdout: "",
      stderr: "",
      failed: false,
    } as never);

    const options: LoopOptions = {
      interval: 5000,
      command: "echo",
      commandArgs: ["hello"],
      immediate: false,
      maxRuns: 1,
      verbose: false,
    };

    const promise = runLoop(options, logger, controller.signal);

    expect(mockedExeca).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(5000);
    await vi.runAllTimersAsync();
    await promise;

    expect(mockedExeca).toHaveBeenCalledTimes(1);
  });

  it("runs immediately when immediate is true", async () => {
    mockedExeca.mockResolvedValue({
      exitCode: 0,
      stdout: "",
      stderr: "",
      failed: false,
    } as never);

    const options: LoopOptions = {
      interval: 5000,
      command: "echo",
      commandArgs: ["hello"],
      immediate: true,
      maxRuns: 1,
      verbose: false,
    };

    const promise = runLoop(options, logger, controller.signal);

    await vi.runAllTimersAsync();
    await promise;

    expect(mockedExeca).toHaveBeenCalledTimes(1);
  });

  it("continues on command failure", async () => {
    const error = new Error("fail") as Error & { exitCode: number };
    error.exitCode = 1;

    mockedExeca
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: "",
        stderr: "",
        failed: false,
      } as never);

    const options: LoopOptions = {
      interval: 1000,
      command: "might-fail",
      commandArgs: [],
      immediate: true,
      maxRuns: 2,
      verbose: false,
    };

    const promise = runLoop(options, logger, controller.signal);

    await vi.runAllTimersAsync();
    await promise;

    expect(mockedExeca).toHaveBeenCalledTimes(2);
  });

  it("does not overlap executions", async () => {
    let callCount = 0;
    mockedExeca.mockImplementation(async () => {
      callCount++;
      await new Promise((r) => setTimeout(r, 100));
      return {
        exitCode: 0,
        stdout: "",
        stderr: "",
        failed: false,
      } as never;
    });

    const options: LoopOptions = {
      interval: 500,
      command: "slow-cmd",
      commandArgs: [],
      immediate: true,
      maxRuns: 2,
      verbose: false,
    };

    const promise = runLoop(options, logger, controller.signal);

    await vi.runAllTimersAsync();
    await promise;

    expect(callCount).toBe(2);
  });

  it("shuts down on abort signal", async () => {
    mockedExeca.mockResolvedValue({
      exitCode: 0,
      stdout: "",
      stderr: "",
      failed: false,
    } as never);

    const options: LoopOptions = {
      interval: 10000,
      command: "echo",
      commandArgs: ["hello"],
      immediate: true,
      maxRuns: null,
      verbose: false,
    };

    const promise = runLoop(options, logger, controller.signal);

    await vi.advanceTimersByTimeAsync(100);

    controller.abort();

    await vi.runAllTimersAsync();
    await promise;

    expect(mockedExeca).toHaveBeenCalledTimes(1);
  });

  it("exits immediately when maxRuns is 0", async () => {
    const options: LoopOptions = {
      interval: 1000,
      command: "echo",
      commandArgs: ["hello"],
      immediate: true,
      maxRuns: 0,
      verbose: false,
    };

    const promise = runLoop(options, logger, controller.signal);

    await vi.runAllTimersAsync();
    await promise;

    expect(mockedExeca).not.toHaveBeenCalled();
  });

  it("shows verbose output when verbose is true", async () => {
    mockedExeca.mockResolvedValue({
      exitCode: 0,
      stdout: "",
      stderr: "",
      failed: false,
    } as never);

    const verboseLogger = new Logger(true);
    const options: LoopOptions = {
      interval: 1000,
      command: "echo",
      commandArgs: ["hello"],
      immediate: true,
      maxRuns: 1,
      verbose: true,
    };

    const promise = runLoop(options, verboseLogger, controller.signal);

    await vi.runAllTimersAsync();
    await promise;

    expect(mockedExeca).toHaveBeenCalledTimes(1);
  });

  it("aborts during initial wait when not immediate", async () => {
    const options: LoopOptions = {
      interval: 10000,
      command: "echo",
      commandArgs: ["hello"],
      immediate: false,
      maxRuns: 1,
      verbose: false,
    };

    const promise = runLoop(options, logger, controller.signal);

    await vi.advanceTimersByTimeAsync(100);

    controller.abort();

    await vi.runAllTimersAsync();
    await promise;

    expect(mockedExeca).not.toHaveBeenCalled();
  });
});
