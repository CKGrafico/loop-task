import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { LoopOptions } from "../src/types.js";

vi.mock("execa", () => ({
  execa: vi.fn(),
}));

import { execa } from "execa";
import { LoopController } from "../src/core/loop-controller.js";

const mockedExeca = vi.mocked(execa);

function mockExecaSuccess(): void {
  mockedExeca.mockImplementation((() => {
    const child = Promise.resolve({ exitCode: 0, stdout: "", stderr: "", failed: false }) as never;
    (child as { stdout: { on: () => void } }).stdout = { on: () => { } };
    (child as { stderr: { on: () => void } }).stderr = { on: () => { } };
    return child;
  }) as never);
}

function mockExecaAbortableRun(): void {
  mockedExeca.mockImplementationOnce(((_command: string, _args: string[], options?: { cancelSignal?: AbortSignal }) => {
    const child = new Promise((_, reject) => {
      options?.cancelSignal?.addEventListener("abort", () => {
        reject({ exitCode: 1 });
      });
    }) as never;
    (child as { stdout: { on: () => void } }).stdout = { on: () => { } };
    (child as { stderr: { on: () => void } }).stderr = { on: () => { } };
    return child;
  }) as never);
}

function tempLogPath(): string {
  return path.join(os.tmpdir(), `loop-ctrl-${process.pid}-${Math.floor(performance.now())}.log`);
}

function makeOptions(overrides: Partial<LoopOptions> = {}): LoopOptions {
  return {
    interval: 10000,
    command: "echo",
    commandArgs: ["hi"],
    immediate: false,
    maxRuns: null,
    verbose: false,
    cwd: "",
    description: "",
    ...overrides,
  };
}

describe("LoopController", () => {
  let logPath: string;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockExecaSuccess();
    logPath = tempLogPath();
  });

  afterEach(async () => {
    vi.useRealTimers();
    try {
      fs.unlinkSync(logPath);
    } catch {
      // ignore
    }
  });

  it("runs immediately and stops at maxRuns", async () => {
    const controller = new LoopController("aaaaaaaa", makeOptions({ immediate: true, maxRuns: 1 }), logPath);
    controller.start();
    await vi.runAllTimersAsync();

    const meta = controller.getMeta();
    expect(meta.runCount).toBe(1);
    expect(controller.status).toBe("stopped");
    expect(meta.lastExitCode).toBe(0);
    await controller.stop();
  });

  it("waits the interval before the first run when not immediate", async () => {
    const controller = new LoopController("bbbbbbbb", makeOptions({ immediate: false, maxRuns: 1, interval: 5000 }), logPath);
    controller.start();

    await vi.advanceTimersByTimeAsync(100);
    expect(controller.getMeta().runCount).toBe(0);
    expect(controller.status).toBe("waiting");

    await vi.advanceTimersByTimeAsync(5000);
    await vi.runAllTimersAsync();
    expect(controller.getMeta().runCount).toBe(1);
    await controller.stop();
  });

  it("pause during sleep sets paused status and preserves a positive remaining delay", async () => {
    const controller = new LoopController("cccccccc", makeOptions({ immediate: false, interval: 10000 }), logPath);
    controller.start();

    await vi.advanceTimersByTimeAsync(400);
    controller.pause();

    expect(controller.status).toBe("paused");
    const meta = controller.getMeta();
    expect(meta.remainingDelayMs).not.toBeNull();
    expect(meta.remainingDelayMs!).toBeGreaterThan(0);
    expect(meta.remainingDelayMs!).toBeLessThanOrEqual(10000);
    expect(controller.getMeta().runCount).toBe(0);
    await controller.stop();
  });

  it("resume after pause continues to a run", async () => {
    const controller = new LoopController("dddddddd", makeOptions({ immediate: false, interval: 4000, maxRuns: 1 }), logPath);
    controller.start();

    await vi.advanceTimersByTimeAsync(400);
    controller.pause();
    await vi.advanceTimersByTimeAsync(300);
    expect(controller.status).toBe("paused");

    controller.resume();
    await vi.advanceTimersByTimeAsync(4000);
    await vi.runAllTimersAsync();

    expect(controller.getMeta().runCount).toBe(1);
    await controller.stop();
  });

  it("triggerNow runs immediately, interrupting the sleep", async () => {
    const controller = new LoopController("eeeeeeee", makeOptions({ immediate: false, interval: 60000, maxRuns: 1 }), logPath);
    controller.start();

    await vi.advanceTimersByTimeAsync(300);
    expect(controller.getMeta().runCount).toBe(0);

    controller.triggerNow();
    await vi.runAllTimersAsync();

    expect(controller.getMeta().runCount).toBe(1);
    await controller.stop();
  });

  it("pause(true) interrupts an active run and leaves the loop paused", async () => {
    mockExecaAbortableRun();
    const controller = new LoopController("gggggggg", makeOptions({ immediate: true }), logPath);
    controller.start();

    await Promise.resolve();
    controller.pause(true);
    await Promise.resolve();

    expect(controller.status).toBe("paused");
    expect(controller.getMeta().runCount).toBe(1);
    await controller.stop();
  });

  it("triggerNow(true) interrupts an active run and starts the next run immediately", async () => {
    mockExecaAbortableRun();
    mockExecaSuccess();
    const controller = new LoopController("hhhhhhhh", makeOptions({ immediate: true, maxRuns: 2 }), logPath);
    controller.start();

    await Promise.resolve();
    controller.triggerNow(true);
    await vi.runAllTimersAsync();

    expect(controller.getMeta().runCount).toBe(2);
    expect(controller.status).toBe("stopped");
    await controller.stop();
  });

  it("triggerNow(true) does not consume the forced rerun when maxRuns would otherwise be exhausted", async () => {
    mockExecaAbortableRun();
    mockExecaSuccess();
    const controller = new LoopController("iiiiiiii", makeOptions({ immediate: true, maxRuns: 1 }), logPath);
    controller.start();

    await Promise.resolve();
    controller.triggerNow(true);
    await vi.runAllTimersAsync();

    expect(controller.getMeta().runCount).toBe(1);
    expect(controller.status).toBe("stopped");
    expect(controller.getMeta().lastExitCode).toBe(0);
    await controller.stop();
  });

  it("emits waiting at most once per sleep segment", async () => {
    const controller = new LoopController("ffffffff", makeOptions({ immediate: false, interval: 5000, maxRuns: 1 }), logPath);
    let waitingCount = 0;
    controller.on("waiting", () => {
      waitingCount += 1;
    });
    controller.start();

    await vi.advanceTimersByTimeAsync(5000);
    await vi.runAllTimersAsync();

    expect(waitingCount).toBe(1);
    await controller.stop();
  });
});
