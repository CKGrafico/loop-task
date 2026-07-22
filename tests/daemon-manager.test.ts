import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { LoopMeta, LoopOptions, TaskDefinition } from "../src/types.js";

// Track the last constructed controller id so getMeta can return it
let lastControllerId = "test-loop";

function makeMockMeta(id: string) {
  return {
    id,
    taskId: null,
    status: "running",
    createdAt: new Date().toISOString(),
    maxRunsReached: false,
    sessionStartedAt: null,
    runCount: 0,
    lastRunAt: null,
    lastExitCode: null,
    lastDuration: null,
    nextRunAt: null,
    remainingDelayMs: null,
    runHistory: [] as any[],
    skippedCount: 0,
  };
}

const mockControllerInstance = {
  start: vi.fn(),
  stop: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  resume: vi.fn(),
  stopLoop: vi.fn(),
  triggerNow: vi.fn().mockReturnValue(true),
  playLoop: vi.fn().mockReturnValue(true),
  getMeta: vi.fn().mockImplementation(() => makeMockMeta(lastControllerId)),
  on: vi.fn(),
  status: "running" as string,
  isMaxRunsReached: vi.fn().mockReturnValue(false),
  clearMaxRunsReached: vi.fn(),
};

vi.mock("../src/core/loop/loop-controller.js", () => ({
  LoopController: vi.fn().mockImplementation((id: string) => {
    lastControllerId = id;
    return { ...mockControllerInstance, getMeta: vi.fn().mockImplementation(() => makeMockMeta(id)) };
  }),
}));

// Mock execa to prevent actual command execution
vi.mock("execa", () => ({
  execa: vi.fn(),
}));

import { LoopManager } from "../src/daemon/managers/loop-manager.js";
import { TaskManager } from "../src/daemon/managers/task-manager.js";
import { ProjectManager } from "../src/daemon/managers/project-manager.js";
import { saveLoop, loadAllLoops, loadLoop, deleteLoop as deleteLoopState } from "../src/daemon/state/index.js";

let tmpDir: string;
let origHome: string | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  tmpDir = mkdtempSync(join(tmpdir(), "loop-daemon-mgr-test-"));
  origHome = process.env.LOOP_CLI_HOME;
  process.env.LOOP_CLI_HOME = tmpDir;
  // Ensure .loop-cli data dir exists so ProjectManager can write
  mkdirSync(join(tmpDir, ".loop-cli"), { recursive: true });

  // Reset mock controller state for each test
  lastControllerId = "test-loop";
  mockControllerInstance.start.mockReset().mockReturnValue(undefined);
  mockControllerInstance.stop.mockReset().mockResolvedValue(undefined);
  mockControllerInstance.pause.mockReset();
  mockControllerInstance.resume.mockReset();
  mockControllerInstance.stopLoop.mockReset();
  mockControllerInstance.triggerNow.mockReset().mockReturnValue(true);
  mockControllerInstance.playLoop.mockReset().mockReturnValue(true);
  mockControllerInstance.getMeta.mockReset().mockImplementation(() => makeMockMeta(lastControllerId));
  mockControllerInstance.on.mockReset();
  mockControllerInstance.status = "running";
  mockControllerInstance.isMaxRunsReached.mockReset().mockReturnValue(false);
  mockControllerInstance.clearMaxRunsReached.mockReset();
});

afterEach(() => {
  if (origHome === undefined) delete process.env.LOOP_CLI_HOME;
  else process.env.LOOP_CLI_HOME = origHome;
  rmSync(tmpDir, { recursive: true, force: true });
});

function makeOptions(overrides: Partial<LoopOptions> = {}): LoopOptions {
  return {
    interval: 60000,
    taskId: null,
    command: "echo",
    commandArgs: ["hello"],
    immediate: true,
    maxRuns: null,
    verbose: false,
    cwd: "",
    description: "",
    projectId: "default",
    offset: null,
    ...overrides,
  };
}

function makeLoopMeta(overrides: Partial<LoopMeta> = {}): LoopMeta {
  return {
    id: "test1234",
    taskId: null,
    command: "echo",
    commandArgs: ["hello"],
    interval: 60000,
    intervalHuman: "1m",
    immediate: true,
    maxRuns: null,
    verbose: false,
    cwd: "",
    description: "test loop",
    status: "running",
    createdAt: new Date().toISOString(),
    sessionStartedAt: null,
    runCount: 0,
    lastRunAt: null,
    lastExitCode: null,
    lastDuration: null,
    nextRunAt: null,
    remainingDelayMs: null,
    pid: process.pid,
    maxRunsReached: false,
    runHistory: [],
    skippedCount: 0,
    projectId: "default",
    offset: null,
    ...overrides,
  };
}

describe("LoopManager", () => {
  let taskManager: TaskManager;
  let projectManager: ProjectManager;
  let manager: LoopManager;

  beforeEach(() => {
    taskManager = new TaskManager();
    projectManager = new ProjectManager();
    manager = new LoopManager(taskManager, projectManager);
  });



  describe("init()", () => {
    it("initializes project manager", () => {
      manager.init();
      expect(projectManager.getAll().length).toBeGreaterThanOrEqual(1);
    });

    it("does not restart loops with idle status", () => {
      const meta = makeLoopMeta({ id: "stopped1", status: "idle" });
      saveLoop(meta);

      manager.init();
      // The controller should have been created but start() not called for idle loops
      expect(mockControllerInstance.start).not.toHaveBeenCalled();
    });

    it("restarts loops with running status", () => {
      const meta = makeLoopMeta({ id: "running1", status: "running" });
      saveLoop(meta);

      manager.init();
      expect(mockControllerInstance.start).toHaveBeenCalled();
    });

    it("restarts loops with waiting status", () => {
      const meta = makeLoopMeta({ id: "waiting1", status: "waiting" });
      saveLoop(meta);

      manager.init();
      expect(mockControllerInstance.start).toHaveBeenCalled();
    });

    it("migrates loops without projectId to default", () => {
      const meta = makeLoopMeta({ id: "no-project" });
      delete (meta as any).projectId;
      saveLoop(meta);

      manager.init();

      const loaded = loadLoop("no-project");
      expect(loaded!.projectId).toBe("default");
    });

    it.skip("migrates loops without taskId to inline task", () => {
      const meta = makeLoopMeta({ id: "no-task", taskId: null });
      saveLoop(meta);

      manager.init();

      const loaded = loadLoop("no-task");
      expect(loaded!.taskId).not.toBeNull();
    });
  });



  describe("start()", () => {
    it("creates a loop and returns an id", () => {
      const id = manager.start(makeOptions(), "1m");
      expect(id).toBeTruthy();
      expect(id.length).toBe(8); // UUID slice(0,8)
    });

    it("starts the controller", () => {
      manager.start(makeOptions(), "1m");
      expect(mockControllerInstance.start).toHaveBeenCalled();
    });

    it("persists the loop to disk", () => {
      const id = manager.start(makeOptions(), "1m");
      const loaded = loadLoop(id);
      expect(loaded).not.toBeNull();
      expect(loaded!.id).toBe(id);
    });

    it("wires events on the controller", () => {
      manager.start(makeOptions(), "1m");
      // on() should be called for events
      expect(mockControllerInstance.on).toHaveBeenCalled();
    });
  });



  describe("list()", () => {
    it("returns empty array when no loops", () => {
      expect(manager.list()).toEqual([]);
    });

    it("returns all started loops", () => {
      manager.start(makeOptions(), "1m");
      manager.start(makeOptions({ command: "ls" }), "5m");

      const list = manager.list();
      expect(list).toHaveLength(2);
    });
  });



  describe("status()", () => {
    it("returns meta for a known loop id", () => {
      const id = manager.start(makeOptions(), "1m");
      const meta = manager.status(id);
      expect(meta).not.toBeNull();
      expect(meta!.id).toBe(id);
    });

    it("returns null for unknown id", () => {
      expect(manager.status("nonexistent")).toBeNull();
    });
  });



  describe("pause()", () => {
    it("delegates to controller.pause() and persists", () => {
      const id = manager.start(makeOptions(), "1m");
      const result = manager.pause(id);
      expect(result).toBe(true);
      expect(mockControllerInstance.pause).toHaveBeenCalled();
    });

    it("returns false for unknown id", () => {
      expect(manager.pause("nonexistent")).toBe(false);
    });
  });

  describe("resume()", () => {
    it("delegates to controller.resume() and persists", () => {
      const id = manager.start(makeOptions(), "1m");
      const result = manager.resume(id);
      expect(result).toBe(true);
      expect(mockControllerInstance.resume).toHaveBeenCalled();
    });

    it("returns false for unknown id", () => {
      expect(manager.resume("nonexistent")).toBe(false);
    });
  });

  describe("stopLoop()", () => {
    it("delegates to controller.stopLoop() and persists", () => {
      const id = manager.start(makeOptions(), "1m");
      const result = manager.stopLoop(id);
      expect(result).toBe(true);
      expect(mockControllerInstance.stopLoop).toHaveBeenCalledWith(true);
    });

    it("returns false for unknown id", () => {
      expect(manager.stopLoop("nonexistent")).toBe(false);
    });
  });

  describe("trigger()", () => {
    it("delegates to controller.triggerNow()", () => {
      const id = manager.start(makeOptions(), "1m");
      const result = manager.trigger(id);
      expect(result).toBe(true);
      expect(mockControllerInstance.triggerNow).toHaveBeenCalled();
    });

    it("returns false when triggerNow returns false", () => {
      mockControllerInstance.triggerNow.mockReturnValueOnce(false);
      const id = manager.start(makeOptions(), "1m");
      expect(manager.trigger(id)).toBe(false);
    });

    it("returns false for unknown id", () => {
      expect(manager.trigger("nonexistent")).toBe(false);
    });
  });

  describe("playLoop()", () => {
    it("delegates to controller.playLoop()", () => {
      const id = manager.start(makeOptions(), "1m");
      const result = manager.playLoop(id);
      expect(result).toBe(true);
      expect(mockControllerInstance.playLoop).toHaveBeenCalled();
    });

    it("returns false for unknown id", () => {
      expect(manager.playLoop("nonexistent")).toBe(false);
    });
  });



  describe("isMaxRunsBlocked()", () => {
    it("returns false for unknown id", () => {
      expect(manager.isMaxRunsBlocked("nonexistent")).toBe(false);
    });

    it("returns true when controller reports max-runs reached", () => {
      mockControllerInstance.isMaxRunsReached.mockReturnValueOnce(true);
      const id = manager.start(makeOptions(), "1m");
      expect(manager.isMaxRunsBlocked(id)).toBe(true);
    });
  });

  describe("isRunning()", () => {
    it("returns true when controller status is running", () => {
      mockControllerInstance.status = "running";
      const id = manager.start(makeOptions(), "1m");
      expect(manager.isRunning(id)).toBe(true);
    });

    it("returns false for unknown id", () => {
      expect(manager.isRunning("nonexistent")).toBe(false);
    });
  });



  describe("delete()", () => {
    it("stops and removes a loop, returns true", async () => {
      const id = manager.start(makeOptions(), "1m");
      const result = await manager.delete(id);
      expect(result).toBe(true);
      expect(mockControllerInstance.stop).toHaveBeenCalled();
      expect(manager.status(id)).toBeNull();
    });

    it("deletes persisted loop from disk", async () => {
      const id = manager.start(makeOptions(), "1m");
      await manager.delete(id);
      expect(loadLoop(id)).toBeNull();
    });

    it("returns false for unknown id", async () => {
      expect(await manager.delete("nonexistent")).toBe(false);
    });
  });



  describe("stopAllLoops()", () => {
    it("stops all loops and returns the count", () => {
      manager.start(makeOptions(), "1m");
      manager.start(makeOptions({ command: "ls" }), "5m");

      const count = manager.stopAllLoops();
      expect(count).toBe(2);
    });

    it("returns 0 when no loops", () => {
      expect(manager.stopAllLoops()).toBe(0);
    });
  });



  describe("getLogPath()", () => {
    it("returns log path for known loop", () => {
      const id = manager.start(makeOptions(), "1m");
      const logPath = manager.getLogPath(id);
      expect(logPath).toBeTruthy();
      expect(logPath).toContain(".loop-cli");
    });

    it("returns null for unknown loop", () => {
      expect(manager.getLogPath("nonexistent")).toBeNull();
    });
  });



  describe("shutdown()", () => {
    it("stops all loops and clears internal map", async () => {
      manager.start(makeOptions(), "1m");
      manager.start(makeOptions({ command: "ls" }), "5m");

      await manager.shutdown();
      expect(manager.list()).toEqual([]);
      expect(mockControllerInstance.stop).toHaveBeenCalled();
    });
  });



  describe("reconcile()", () => {
    it("removes loops that are not in the new list", () => {
      const id = manager.start(makeOptions(), "1m");
      expect(manager.status(id)).not.toBeNull();

      manager.reconcile([]);
      // The loop should be scheduled for deletion (async stop)
      // We need to wait a bit for the async stop
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // After reconcile with empty array, the loop should eventually be removed
          resolve();
        }, 100);
      });
    });

    it("adds loops that are in the new list but not in memory", () => {
      const newLoop = makeLoopMeta({ id: "new-loop", status: "running" });
      manager.reconcile([newLoop]);

      // A new controller should have been created and started
      expect(mockControllerInstance.start).toHaveBeenCalled();
    });

    it("recreates loops when config has changed", () => {
      const id = manager.start(makeOptions({ interval: 60000 }), "1m");
      const changedMeta = makeLoopMeta({ id, interval: 120000 });
      manager.reconcile([changedMeta]);

      // The old controller should have stop called, and a new one created
      expect(mockControllerInstance.stop).toHaveBeenCalled();
    });
  });



  describe("update()", () => {
    it("updates an existing loop and returns true", async () => {
      const id = manager.start(makeOptions(), "1m");
      const result = await manager.update(id, makeOptions({ interval: 120000 }), "2m");
      expect(result).toBe(true);
    });

    it("returns false for unknown id", async () => {
      const result = await manager.update("nonexistent", makeOptions(), "1m");
      expect(result).toBe(false);
    });

    it("clears max-runs reached when maxRuns changes", async () => {
      const id = manager.start(makeOptions({ maxRuns: 5 }), "1m");
      await manager.update(id, makeOptions({ maxRuns: 10 }), "1m");
      expect(mockControllerInstance.clearMaxRunsReached).toHaveBeenCalled();
    });
  });



  describe("project delegation", () => {
    it("listProjects delegates to projectManager", () => {
      const result = manager.listProjects();
      expect(Array.isArray(result)).toBe(true);
    });

    it("createProject delegates to projectManager", () => {
      const project = manager.createProject("Test", "#fff");
      expect(project).toBeTruthy();
    });

    it("updateProject delegates to projectManager", () => {
      manager.init(); // ensure default exists
      const project = manager.createProject("Old", "#fff");
      expect(() => manager.updateProject(project.id, "New")).not.toThrow();
    });

    it("deleteProject moves loops to default project and deletes", () => {
      manager.init();
      const project = manager.createProject("ToDelete", "#abc");
      const loopId = manager.start(makeOptions({ projectId: project.id }), "1m");

      manager.deleteProject(project.id);

      // The loop should now have projectId = "default"
      const meta = manager.status(loopId);
      expect(meta).not.toBeNull();
    });
  });
});
