import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { LoopOptions, TaskDefinition } from "../src/types.js";

vi.mock("execa", () => ({
  execa: vi.fn(),
}));

import { execa } from "execa";
import { LoopController } from "../src/core/loop/loop-controller.js";

const mockedExeca = vi.mocked(execa);

function mockExecaSuccess(): void {
  mockedExeca.mockImplementation((() => {
    const child = Promise.resolve({ exitCode: 0, stdout: "", stderr: "", failed: false }) as never;
    (child as { stdout: { on: () => void; pipe: () => void } }).stdout = { on: () => { }, pipe: () => child.stdout };
    (child as { stderr: { on: () => void; pipe: () => void } }).stderr = { on: () => { }, pipe: () => child.stderr };
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
    (child as { stdout: { on: () => void; pipe: () => void } }).stdout = { on: () => { }, pipe: () => child.stdout };
    (child as { stderr: { on: () => void; pipe: () => void } }).stderr = { on: () => { }, pipe: () => child.stderr };
    return child;
  }) as never);
}

function tempLogPath(): string {
  return path.join(os.tmpdir(), `loop-ctrl-${process.pid}-${Math.floor(performance.now())}.log`);
}

const noopTaskResolver = (_taskId: string): TaskDefinition | null => null;

function makeOptions(overrides: Partial<LoopOptions> = {}): LoopOptions {
  return {
    interval: 10000,
    taskId: null,
    command: "echo",
    commandArgs: ["hi"],
    immediate: false,
    maxRuns: null,
    verbose: false,
    cwd: "",
    description: "",
    projectId: "default",
    offset: null,
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
    const controller = new LoopController("aaaaaaaa", makeOptions({ immediate: true, maxRuns: 1 }), logPath, noopTaskResolver);
    controller.start();
    await vi.runAllTimersAsync();

    const meta = controller.getMeta();
    expect(meta.runCount).toBe(1);
    expect(controller.status).toBe("paused");
    expect(meta.lastExitCode).toBe(0);
    await controller.stop();
  });

  it("waits the interval before the first run when not immediate", async () => {
    const controller = new LoopController("bbbbbbbb", makeOptions({ immediate: false, maxRuns: 1, interval: 5000 }), logPath, noopTaskResolver);
    controller.start();

    // Initially, no runs have happened yet
    await vi.advanceTimersByTimeAsync(0);
    const statusBeforeRun = controller.status;
    expect(["waiting", "running"].includes(statusBeforeRun)).toBe(true);

    // Advance past the interval to trigger the first run
    await vi.advanceTimersByTimeAsync(5000);
    await vi.runAllTimersAsync();
    expect(controller.getMeta().runCount).toBe(1);
    await controller.stop();
  });

  it("pause during sleep sets paused status and preserves a positive remaining delay", async () => {
    const controller = new LoopController("cccccccc", makeOptions({ immediate: false, interval: 10000 }), logPath, noopTaskResolver);
    controller.start();

    await vi.advanceTimersByTimeAsync(400);
    // Status should be "waiting" after entering the sleep cycle
    expect(controller.status).toBe("waiting");
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
    const controller = new LoopController("dddddddd", makeOptions({ immediate: false, interval: 4000, maxRuns: 1 }), logPath, noopTaskResolver);
    controller.start();

    await vi.advanceTimersByTimeAsync(400);
    expect(controller.status).toBe("waiting");
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
    const controller = new LoopController("eeeeeeee", makeOptions({ immediate: false, interval: 60000, maxRuns: 1 }), logPath, noopTaskResolver);
    controller.start();

    await vi.advanceTimersByTimeAsync(300);
    expect(controller.status).toBe("waiting");
    expect(controller.getMeta().runCount).toBe(0);

    controller.triggerNow();
    await vi.runAllTimersAsync();

    expect(controller.getMeta().runCount).toBe(1);
    await controller.stop();
  });

  it("pause(true) interrupts an active run and leaves the loop paused", async () => {
    mockExecaAbortableRun();
    const controller = new LoopController("gggggggg", makeOptions({ immediate: true }), logPath, noopTaskResolver);
    controller.start();

    await vi.advanceTimersByTimeAsync(10);
    controller.pause(true);
    await vi.advanceTimersByTimeAsync(10);

    expect(controller.status).toBe("paused");
    expect(controller.getMeta().runCount).toBe(1);
    await controller.stop();
  });

  it("triggerNow returns false when loop is running", async () => {
    mockExecaAbortableRun();
    const controller = new LoopController("hhhhhhhh", makeOptions({ immediate: true }), logPath, noopTaskResolver);
    controller.start();

    await vi.advanceTimersByTimeAsync(10);
    expect(controller.status).toBe("running");

    const result = controller.triggerNow();
    expect(result).toBe(false);
    expect(controller.getMeta().runCount).toBe(1);

    await controller.stop();
  });

  it("triggerNow with maxRuns=1 runs once and pauses", async () => {
    const controller = new LoopController("iiiiiiii", makeOptions({ immediate: false, interval: 60000, maxRuns: 1 }), logPath, noopTaskResolver);
    controller.start();

    await vi.advanceTimersByTimeAsync(300);
    expect(controller.status).toBe("waiting");

    controller.triggerNow();
    await vi.runAllTimersAsync();

    expect(controller.getMeta().runCount).toBe(1);
    expect(controller.status).toBe("paused");
    expect(controller.getMeta().lastExitCode).toBe(0);
    await controller.stop();
  });

  it("triggerNow multiple times produces multiple runs", async () => {
    const controller = new LoopController("jjjjjjjj", makeOptions({ immediate: true, interval: 10000, maxRuns: 3 }), logPath, noopTaskResolver);
    controller.start();

    await vi.advanceTimersByTimeAsync(50);
    expect(controller.getMeta().runCount).toBe(1);

    controller.triggerNow();
    await vi.advanceTimersByTimeAsync(210);
    expect(controller.getMeta().runCount).toBe(2);

    controller.triggerNow();
    await vi.advanceTimersByTimeAsync(210);
    expect(controller.getMeta().runCount).toBe(3);

    expect(controller.getMeta().runHistory.length).toBe(3);
    await controller.stop();
  });

  it("emits waiting at most once per sleep segment", async () => {
    const controller = new LoopController("ffffffff", makeOptions({ immediate: false, interval: 5000, maxRuns: 1 }), logPath, noopTaskResolver);
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


  it("transitions running → paused → resumed → running → stopped", async () => {
    const controller = new LoopController("state01", makeOptions({ immediate: true, interval: 5000 }), logPath, noopTaskResolver);
    controller.start();

    // Run starts immediately → completes quickly → waiting for next interval
    await vi.advanceTimersByTimeAsync(10);
    expect(["running", "waiting"]).toContain(controller.status);

    // Pause → paused
    controller.pause();
    expect(controller.status).toBe("paused");

    // Resume → continues running after next timer tick
    controller.resume();
    await vi.advanceTimersByTimeAsync(5000);
    await vi.runAllTimersAsync();
    expect(["waiting", "running", "paused"]).toContain(controller.status);

    // Stop
    controller.stopLoop();
    expect(controller.status).toBe("idle");
    await controller.stop();
  });

  it("playLoop returns false from running state", () => {
    const controller = new LoopController("play01", makeOptions({ immediate: true, interval: 5000 }), logPath, noopTaskResolver);
    controller.start();
    expect(controller.playLoop()).toBe(false);
  });

  it("playLoop returns false from paused state", async () => {
    const controller = new LoopController("play02", makeOptions({ immediate: true, interval: 5000 }), logPath, noopTaskResolver);
    controller.start();
    await vi.advanceTimersByTimeAsync(10);
    controller.pause();
    expect(controller.playLoop()).toBe(false);
    await controller.stop();
  });

  it("playLoop returns false when maxRunsReached", async () => {
    const controller = new LoopController("play03", makeOptions({ immediate: true, maxRuns: 1, interval: 5000 }), logPath, noopTaskResolver);
    controller.start();
    await vi.runAllTimersAsync();
    expect(controller.isMaxRunsReached()).toBe(true);
    expect(controller.playLoop()).toBe(false);
    await controller.stop();
  });

  it("clearMaxRunsReached resets state and allows playLoop", async () => {
    const controller = new LoopController("clear01", makeOptions({ immediate: true, maxRuns: 1, interval: 5000 }), logPath, noopTaskResolver);
    controller.start();
    await vi.runAllTimersAsync();
    expect(controller.isMaxRunsReached()).toBe(true);

    controller.clearMaxRunsReached();
    expect(controller.isMaxRunsReached()).toBe(false);
    expect(controller.status).toBe("idle");

    // playLoop should work after clearing
    expect(controller.playLoop()).toBe(true);
    await controller.stop();
  });

  it("isMaxRunsReached returns false initially", () => {
    const controller = new LoopController("maxr01", makeOptions({ immediate: true, interval: 5000 }), logPath, noopTaskResolver);
    expect(controller.isMaxRunsReached()).toBe(false);
  });

  it("stopLoop from paused state sets idle", async () => {
    const controller = new LoopController("stop01", makeOptions({ immediate: true, interval: 5000 }), logPath, noopTaskResolver);
    controller.start();
    await vi.advanceTimersByTimeAsync(10);
    controller.pause();
    expect(controller.status).toBe("paused");
    controller.stopLoop();
    expect(controller.status).toBe("idle");
    await controller.stop();
  });

  it("pause(false) does not interrupt a running command", async () => {
    mockExecaAbortableRun();
    const controller = new LoopController("pfil01", makeOptions({ immediate: true, interval: 10000 }), logPath, noopTaskResolver);
    controller.start();
    await vi.advanceTimersByTimeAsync(10);
    expect(controller.status).toBe("running");
    controller.pause(false);
    // Should be paused but runAbortController should NOT be aborted
    expect(controller.status).toBe("paused");
    await controller.stop();
  });

  it("getMeta returns correct values after run", async () => {
    const controller = new LoopController("meta01", makeOptions({ immediate: true, maxRuns: 1, interval: 5000 }), logPath, noopTaskResolver);
    controller.start();
    await vi.runAllTimersAsync();

    const meta = controller.getMeta();
    expect(meta.runCount).toBe(1);
    expect(meta.lastExitCode).toBe(0);
    expect(meta.lastDuration).not.toBeNull();
    expect(meta.maxRunsReached).toBe(true);
    expect(meta.id).toBe("meta01");
    await controller.stop();
  });

  it("triggerNow from idle/stopped state starts a one-shot run", async () => {
    const controller = new LoopController("trigidle", makeOptions({ immediate: false, interval: 10000, maxRuns: 2 }), logPath, noopTaskResolver);
    controller.start();
    await vi.advanceTimersByTimeAsync(100);
    controller.stopLoop();
    await vi.advanceTimersByTimeAsync(10);
    const result = controller.triggerNow();
    expect(result).toBe(true);
    await vi.runAllTimersAsync();
    expect(controller.getMeta().runCount).toBeGreaterThanOrEqual(1);
    await controller.stop();
  });

  describe("manual-only loops (interval === 0)", () => {
    it("start() sets status to idle without scheduling", () => {
      const controller = new LoopController("manual01", makeOptions({ interval: 0, immediate: false }), logPath, noopTaskResolver);
      controller.start();
      expect(controller.status).toBe("idle");
      expect(controller.getMeta().nextRunAt).toBeNull();
    });

    it("triggerNow executes once and returns to idle", async () => {
      const controller = new LoopController("manual02", makeOptions({ interval: 0, immediate: false, maxRuns: 5 }), logPath, noopTaskResolver);
      controller.start();
      expect(controller.status).toBe("idle");

      controller.triggerNow();
      await vi.runAllTimersAsync();
      expect(controller.getMeta().runCount).toBe(1);
      expect(controller.status).toBe("idle");
      await controller.stop();
    });

    it("triggerNow works multiple times on a manual loop", async () => {
      const controller = new LoopController("manual03", makeOptions({ interval: 0, immediate: false, maxRuns: 5 }), logPath, noopTaskResolver);
      controller.start();
      expect(controller.status).toBe("idle");

      controller.triggerNow();
      await vi.runAllTimersAsync();
      expect(controller.getMeta().runCount).toBe(1);
      expect(controller.status).toBe("idle");

      controller.triggerNow();
      await vi.runAllTimersAsync();
      expect(controller.getMeta().runCount).toBe(2);
      expect(controller.status).toBe("idle");

      await controller.stop();
    });

    it("playLoop returns false for manual loops", () => {
      const controller = new LoopController("manual04", makeOptions({ interval: 0 }), logPath, noopTaskResolver);
      controller.start();
      expect(controller.playLoop()).toBe(false);
    });

    it("immediate flag is ignored for manual loops", () => {
      const controller = new LoopController("manual05", makeOptions({ interval: 0, immediate: true }), logPath, noopTaskResolver);
      controller.start();
      expect(controller.status).toBe("idle");
      expect(controller.getMeta().nextRunAt).toBeNull();
    });
  });
});
