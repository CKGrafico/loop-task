import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { LoopOptions, TaskDefinition } from "../src/types.js";
import { DEFAULT_TASK_MAX_RUNS } from "../src/types.js";

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

function tempLogPath(): string {
  return path.join(os.tmpdir(), `loop-task-maxruns-${process.pid}-${Math.floor(performance.now())}.log`);
}

function makeTask(overrides: Partial<TaskDefinition> = {}): TaskDefinition {
  return {
    id: "task1",
    name: "Test Task",
    command: "echo",
    commandArgs: ["hello"],
    onSuccessTaskId: null,
    onFailureTaskId: null,
    maxRuns: DEFAULT_TASK_MAX_RUNS,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

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

describe("Per-task maxRuns", () => {
  let logPath: string;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
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

  describe("DEFAULT_TASK_MAX_RUNS", () => {
    it("defaults to 5", () => {
      expect(DEFAULT_TASK_MAX_RUNS).toBe(5);
    });
  });

  describe("LoopController task run counting", () => {
    it("starts with zero run count for unknown tasks", () => {
      const ctrl = new LoopController("loop1", makeOptions(), logPath, () => null);
      expect(ctrl.getTaskRunCount("unknown")).toBe(0);
    });

    it("increments task run count", () => {
      const ctrl = new LoopController("loop1", makeOptions(), logPath, () => null);
      ctrl.incrementTaskRunCount("task1");
      expect(ctrl.getTaskRunCount("task1")).toBe(1);
      ctrl.incrementTaskRunCount("task1");
      expect(ctrl.getTaskRunCount("task1")).toBe(2);
    });

    it("clears task run counts on start", () => {
      const taskMap = new Map<string, TaskDefinition>();
      const task = makeTask();
      taskMap.set("task1", task);

      const ctrl = new LoopController("loop1", makeOptions({ taskId: "task1" }), logPath, (id) => taskMap.get(id) ?? null);
      ctrl.incrementTaskRunCount("task1");
      expect(ctrl.getTaskRunCount("task1")).toBe(1);

      ctrl.start();
      expect(ctrl.getTaskRunCount("task1")).toBe(0);
      ctrl.stop();
    });
  });

  describe("TaskDefinition maxRuns field", () => {
    it("TaskDefinition requires maxRuns", () => {
      const task = makeTask({ maxRuns: 10 });
      expect(task.maxRuns).toBe(10);
    });
  });
});
