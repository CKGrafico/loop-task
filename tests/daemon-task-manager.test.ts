import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TaskDefinition } from "../src/types.js";
import { TaskManager } from "../src/daemon/task-manager.js";
import { saveTask, loadAllTasks } from "../src/daemon/state.js";

let tmpDir: string;
let origHome: string | undefined;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "loop-task-mgr-test-"));
  origHome = process.env.LOOP_CLI_HOME;
  process.env.LOOP_CLI_HOME = tmpDir;
});

afterEach(() => {
  if (origHome === undefined) delete process.env.LOOP_CLI_HOME;
  else process.env.LOOP_CLI_HOME = origHome;
  rmSync(tmpDir, { recursive: true, force: true });
});

function makeTaskInput(overrides: Partial<Omit<TaskDefinition, "createdAt">> = {}): Omit<TaskDefinition, "createdAt"> {
  return {
    id: "task1",
    name: "echo hello",
    command: "echo",
    commandArgs: ["hello"],
    onSuccessTaskId: null,
    onFailureTaskId: null,
    ...overrides,
  };
}

describe("TaskManager", () => {
  let manager: TaskManager;

  beforeEach(() => {
    manager = new TaskManager();
  });

  // ── create ────────────────────────────────────────────────────────

  describe("create()", () => {
    it("adds a task to the map and returns it with createdAt", () => {
      const input = makeTaskInput();
      const task = manager.create(input);

      expect(task.id).toBe("task1");
      expect(task.name).toBe("echo hello");
      expect(task.command).toBe("echo");
      expect(task.createdAt).toBeTruthy();
    });

    it("persists the task to disk", () => {
      const input = makeTaskInput();
      manager.create(input);

      // Verify persistence by loading with a fresh manager
      const fresh = new TaskManager();
      fresh.init();
      const loaded = fresh.get("task1");
      expect(loaded).not.toBeNull();
      expect(loaded!.name).toBe("echo hello");
    });

    it("can create multiple tasks", () => {
      manager.create(makeTaskInput({ id: "t1", name: "task one" }));
      manager.create(makeTaskInput({ id: "t2", name: "task two" }));

      const all = manager.list();
      expect(all).toHaveLength(2);
    });
  });

  // ── get ───────────────────────────────────────────────────────────

  describe("get()", () => {
    it("returns the created task", () => {
      const input = makeTaskInput();
      manager.create(input);

      const task = manager.get("task1");
      expect(task).not.toBeNull();
      expect(task!.id).toBe("task1");
    });

    it("returns null for unknown id", () => {
      expect(manager.get("nonexistent")).toBeNull();
    });
  });

  // ── list ──────────────────────────────────────────────────────────

  describe("list()", () => {
    it("returns empty array when no tasks", () => {
      expect(manager.list()).toEqual([]);
    });

    it("returns all created tasks", () => {
      manager.create(makeTaskInput({ id: "t1" }));
      manager.create(makeTaskInput({ id: "t2" }));
      manager.create(makeTaskInput({ id: "t3" }));

      const all = manager.list();
      expect(all).toHaveLength(3);
      const ids = all.map((t) => t.id).sort();
      expect(ids).toEqual(["t1", "t2", "t3"]);
    });
  });

  // ── update ────────────────────────────────────────────────────────

  describe("update()", () => {
    it("modifies an existing task", () => {
      manager.create(makeTaskInput({ id: "t1", name: "original" }));

      const updated = manager.update("t1", {
        name: "updated",
        command: "ls",
        commandArgs: ["-la"],
        onSuccessTaskId: null,
        onFailureTaskId: null,
      });

      expect(updated).not.toBeNull();
      expect(updated!.name).toBe("updated");
      expect(updated!.command).toBe("ls");

      // Verify in-memory
      const task = manager.get("t1");
      expect(task!.name).toBe("updated");
    });

    it("persists the update to disk", () => {
      manager.create(makeTaskInput({ id: "t1", name: "original" }));
      manager.update("t1", {
        name: "updated",
        command: "ls",
        commandArgs: [],
        onSuccessTaskId: null,
        onFailureTaskId: null,
      });

      // Verify via fresh manager
      const fresh = new TaskManager();
      fresh.init();
      const loaded = fresh.get("t1");
      expect(loaded!.name).toBe("updated");
    });

    it("returns null for unknown id", () => {
      const result = manager.update("nonexistent", {
        name: "x",
        command: "x",
        commandArgs: [],
        onSuccessTaskId: null,
        onFailureTaskId: null,
      });
      expect(result).toBeNull();
    });
  });

  // ── delete ────────────────────────────────────────────────────────

  describe("delete()", () => {
    it("removes a task and returns true", () => {
      manager.create(makeTaskInput({ id: "t1" }));
      expect(manager.delete("t1")).toBe(true);
      expect(manager.get("t1")).toBeNull();
    });

    it("returns false for unknown id", () => {
      expect(manager.delete("nonexistent")).toBe(false);
    });

    it("persists deletion to disk", () => {
      manager.create(makeTaskInput({ id: "t1" }));
      manager.create(makeTaskInput({ id: "t2" }));
      manager.delete("t1");

      const fresh = new TaskManager();
      fresh.init();
      expect(fresh.get("t1")).toBeNull();
      expect(fresh.get("t2")).not.toBeNull();
    });
  });

  // ── createInline ──────────────────────────────────────────────────

  describe("createInline()", () => {
    it("auto-generates id and name from command and args", () => {
      const task = manager.createInline("echo", ["hello", "world"]);

      expect(task.id).toBeTruthy();
      expect(task.id.length).toBe(8); // UUID slice(0,8)
      expect(task.name).toContain("echo");
      expect(task.name).toContain("hello");
      expect(task.command).toBe("echo");
      expect(task.commandArgs).toEqual(["hello", "world"]);
      expect(task.onSuccessTaskId).toBeNull();
      expect(task.onFailureTaskId).toBeNull();
      expect(task.createdAt).toBeTruthy();
    });

    it("truncates name to 40 characters", () => {
      const longArgs = Array(20).fill("very-long-argument");
      const task = manager.createInline("echo", longArgs);
      expect(task.name.length).toBeLessThanOrEqual(40);
    });

    it("persists inline task to disk", () => {
      const task = manager.createInline("ls", ["-la"]);

      const fresh = new TaskManager();
      fresh.init();
      const loaded = fresh.get(task.id);
      expect(loaded).not.toBeNull();
      expect(loaded!.command).toBe("ls");
    });
  });

  // ── reload ────────────────────────────────────────────────────────

  describe("reload()", () => {
    it("clears existing tasks and loads from the provided array", () => {
      manager.create(makeTaskInput({ id: "old1" }));
      manager.create(makeTaskInput({ id: "old2" }));
      expect(manager.list()).toHaveLength(2);

      const newTasks: TaskDefinition[] = [
        {
          id: "new1",
          name: "new task 1",
          command: "echo",
          commandArgs: ["new"],
          onSuccessTaskId: null,
          onFailureTaskId: null,
          createdAt: new Date().toISOString(),
        },
        {
          id: "new2",
          name: "new task 2",
          command: "ls",
          commandArgs: [],
          onSuccessTaskId: null,
          onFailureTaskId: null,
          createdAt: new Date().toISOString(),
        },
      ];

      manager.reload(newTasks);

      expect(manager.list()).toHaveLength(2);
      expect(manager.get("old1")).toBeNull();
      expect(manager.get("old2")).toBeNull();
      expect(manager.get("new1")).not.toBeNull();
      expect(manager.get("new2")).not.toBeNull();
    });

    it("can reload with an empty array", () => {
      manager.create(makeTaskInput({ id: "t1" }));
      manager.reload([]);
      expect(manager.list()).toHaveLength(0);
    });
  });

  // ── init ──────────────────────────────────────────────────────────

  describe("init()", () => {
    it("loads persisted tasks from disk", () => {
      // Write a task directly via state layer
      const task: TaskDefinition = {
        id: "persist1",
        name: "persisted task",
        command: "echo",
        commandArgs: ["persisted"],
        onSuccessTaskId: null,
        onFailureTaskId: null,
        createdAt: new Date().toISOString(),
      };
      saveTask(task);

      const fresh = new TaskManager();
      fresh.init();

      const loaded = fresh.get("persist1");
      expect(loaded).not.toBeNull();
      expect(loaded!.name).toBe("persisted task");
    });

    it("loads multiple persisted tasks", () => {
      saveTask({
        id: "p1",
        name: "one",
        command: "echo",
        commandArgs: ["1"],
        onSuccessTaskId: null,
        onFailureTaskId: null,
        createdAt: "2024-01-01T00:00:00.000Z",
      });
      saveTask({
        id: "p2",
        name: "two",
        command: "echo",
        commandArgs: ["2"],
        onSuccessTaskId: null,
        onFailureTaskId: null,
        createdAt: "2024-06-01T00:00:00.000Z",
      });

      const fresh = new TaskManager();
      fresh.init();

      expect(fresh.list()).toHaveLength(2);
      expect(fresh.get("p1")).not.toBeNull();
      expect(fresh.get("p2")).not.toBeNull();
    });

    it("handles no persisted tasks gracefully", () => {
      const fresh = new TaskManager();
      fresh.init();
      expect(fresh.list()).toEqual([]);
    });
  });
});
