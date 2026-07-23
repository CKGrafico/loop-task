import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { LoopMeta, TaskDefinition } from "../src/types.js";

import {
  saveLoop,
  loadLoop,
  loadAllLoops,
  deleteLoop,
  saveTask,
  loadTask,
  loadAllTasks,
  deleteTask,
  getLogPath,
  readDaemonPid,
  writeDaemonPid,
  removeDaemonPid,
  readDaemonSignature,
  writeDaemonSignature,
  removeDaemonSignature,
  removeSocketFile,
  migrateLoopsToJson,
  migrateTasksToJson,
} from "../src/daemon/state/index.js";
import { loopsJson, tasksJson, getLoopsDir, getTasksDir } from "../src/shared/config/paths.js";

let tmpDir: string;
let origHome: string | undefined;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "loop-daemon-state-test-"));
  origHome = process.env.LOOP_CLI_HOME;
  process.env.LOOP_CLI_HOME = tmpDir;
});

afterEach(() => {
  if (origHome === undefined) delete process.env.LOOP_CLI_HOME;
  else process.env.LOOP_CLI_HOME = origHome;
  rmSync(tmpDir, { recursive: true, force: true });
});

function makeLoopMeta(overrides: Partial<LoopMeta> = {}): LoopMeta {
  return {
    id: "abc12345",
    taskId: null,
    command: "echo",
    commandArgs: ["hello"],
    interval: 60000,
    intervalHuman: "1m",
    immediate: false,
    maxRuns: null,
    verbose: false,
    cwd: "/tmp",
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
    pid: 12345,
    maxRunsReached: false,
    runHistory: [],
    skippedCount: 0,
    projectId: "default",
    offset: null,
    ...overrides,
  };
}

function makeTaskDef(overrides: Partial<TaskDefinition> = {}): TaskDefinition {
  return {
    id: "task001",
    name: "echo hello",
    command: "echo",
    commandArgs: ["hello"],
    onSuccessTaskId: null,
    onFailureTaskId: null,
    maxRuns: 5,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}



describe("saveLoop / loadLoop / loadAllLoops / deleteLoop", () => {
  it("saveLoop persists a loop that loadLoop can retrieve", () => {
    const meta = makeLoopMeta();
    saveLoop(meta);

    const loaded = loadLoop(meta.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe(meta.id);
    expect(loaded!.command).toBe("echo");
    expect(loaded!.commandArgs).toEqual(["hello"]);
  });

  it("loadLoop returns null for unknown id", () => {
    expect(loadLoop("nonexistent")).toBeNull();
  });

  it("loadAllLoops returns empty array when no loops saved", () => {
    expect(loadAllLoops()).toEqual([]);
  });

  it("saveLoop updates an existing loop with the same id", () => {
    const meta = makeLoopMeta({ id: "loop1" });
    saveLoop(meta);

    const updated = makeLoopMeta({ id: "loop1", command: "ls", status: "paused" });
    saveLoop(updated);

    const loaded = loadLoop("loop1");
    expect(loaded!.command).toBe("ls");
    expect(loaded!.status).toBe("paused");
    expect(loadAllLoops()).toHaveLength(1);
  });

  it("saveLoop adds multiple loops and loadAllLoops returns them sorted by createdAt", () => {
    const older = makeLoopMeta({ id: "older", createdAt: "2024-01-01T00:00:00.000Z" });
    const newer = makeLoopMeta({ id: "newer", createdAt: "2024-06-15T00:00:00.000Z" });

    saveLoop(newer);
    saveLoop(older);

    const all = loadAllLoops();
    expect(all).toHaveLength(2);
    expect(all[0].id).toBe("older");
    expect(all[1].id).toBe("newer");
  });

  it("deleteLoop removes the loop from persistence", () => {
    const meta = makeLoopMeta({ id: "d1" });
    saveLoop(meta);
    expect(loadLoop("d1")).not.toBeNull();

    deleteLoop("d1");
    expect(loadLoop("d1")).toBeNull();
  });

  it("deleteLoop for non-existent id does not throw and does not corrupt", () => {
    const meta = makeLoopMeta({ id: "keep" });
    saveLoop(meta);

    deleteLoop("nonexistent"); // should not throw
    expect(loadLoop("keep")).not.toBeNull();
  });

  it("deleteLoop removes the associated log file", () => {
    const meta = makeLoopMeta({ id: "logdel" });
    saveLoop(meta);

    const logPath = getLogPath("logdel");
    mkdirSync(path.dirname(logPath), { recursive: true });
    writeFileSync(logPath, "some log content");

    expect(existsSync(logPath)).toBe(true);
    deleteLoop("logdel");
    expect(existsSync(logPath)).toBe(false);
  });
});



describe("saveTask / loadTask / loadAllTasks / deleteTask", () => {
  it("saveTask persists a task that loadTask can retrieve", () => {
    const task = makeTaskDef();
    saveTask(task);

    const loaded = loadTask(task.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe(task.id);
    expect(loaded!.name).toBe("echo hello");
    expect(loaded!.command).toBe("echo");
  });

  it("loadTask returns null for unknown id", () => {
    expect(loadTask("nonexistent")).toBeNull();
  });

  it("loadAllTasks returns empty array when no tasks saved", () => {
    expect(loadAllTasks()).toEqual([]);
  });

  it("saveTask updates an existing task with the same id", () => {
    const task = makeTaskDef({ id: "t1" });
    saveTask(task);

    const updated = makeTaskDef({ id: "t1", name: "ls files", command: "ls" });
    saveTask(updated);

    const loaded = loadTask("t1");
    expect(loaded!.name).toBe("ls files");
    expect(loaded!.command).toBe("ls");
    expect(loadAllTasks()).toHaveLength(1);
  });

  it("saveTask adds multiple tasks and loadAllTasks returns them sorted by createdAt", () => {
    const older = makeTaskDef({ id: "t1", createdAt: "2024-01-01T00:00:00.000Z" });
    const newer = makeTaskDef({ id: "t2", createdAt: "2024-06-15T00:00:00.000Z" });

    saveTask(newer);
    saveTask(older);

    const all = loadAllTasks();
    expect(all).toHaveLength(2);
    expect(all[0].id).toBe("t1");
    expect(all[1].id).toBe("t2");
  });

  it("deleteTask removes the task from persistence", () => {
    const task = makeTaskDef({ id: "d1" });
    saveTask(task);
    expect(loadTask("d1")).not.toBeNull();

    deleteTask("d1");
    expect(loadTask("d1")).toBeNull();
  });

  it("deleteTask for non-existent id does not throw and does not corrupt", () => {
    const task = makeTaskDef({ id: "keep" });
    saveTask(task);

    deleteTask("nonexistent");
    expect(loadTask("keep")).not.toBeNull();
  });
});



describe("writeDaemonPid / readDaemonPid / removeDaemonPid", () => {
  it("writeDaemonPid writes and readDaemonPid reads", () => {
    writeDaemonPid(12345);
    expect(readDaemonPid()).toBe(12345);
  });

  it("readDaemonPid returns null when no pid file exists", () => {
    expect(readDaemonPid()).toBeNull();
  });

  it("removeDaemonPid deletes the pid file", () => {
    writeDaemonPid(9999);
    expect(readDaemonPid()).toBe(9999);

    removeDaemonPid();
    expect(readDaemonPid()).toBeNull();
  });

  it("removeDaemonPid does not throw when no pid file", () => {
    expect(() => removeDaemonPid()).not.toThrow();
  });

  it("readDaemonPid returns null for non-numeric content", () => {
    const dataDir = join(tmpDir, ".loop-cli");
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(join(dataDir, "daemon.pid"), "not-a-number");

    expect(readDaemonPid()).toBeNull();
  });
});



describe("writeDaemonSignature / readDaemonSignature / removeDaemonSignature", () => {
  it("writeDaemonSignature writes and readDaemonSignature reads", () => {
    writeDaemonSignature("abc123def456");
    expect(readDaemonSignature()).toBe("abc123def456");
  });

  it("readDaemonSignature returns null when no sig file exists", () => {
    expect(readDaemonSignature()).toBeNull();
  });

  it("removeDaemonSignature deletes the sig file", () => {
    writeDaemonSignature("sig123");
    expect(readDaemonSignature()).toBe("sig123");

    removeDaemonSignature();
    expect(readDaemonSignature()).toBeNull();
  });

  it("removeDaemonSignature does not throw when no sig file", () => {
    expect(() => removeDaemonSignature()).not.toThrow();
  });

  it("readDaemonSignature returns null for empty file", () => {
    const dataDir = join(tmpDir, ".loop-cli");
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(join(dataDir, "daemon.sig"), "   ");

    expect(readDaemonSignature()).toBeNull();
  });
});



describe("getLogPath", () => {
  it("returns a path under logs directory", () => {
    const logPath = getLogPath("testid");
    expect(logPath).toContain(".loop-cli");
    expect(logPath).toContain("logs");
    expect(logPath).toMatch(/testid\.log$/);
  });

  it("creates the logs directory if it does not exist", () => {
    const dataDir = join(tmpDir, ".loop-cli");
    expect(existsSync(join(dataDir, "logs"))).toBe(false);

    getLogPath("x");
    expect(existsSync(join(dataDir, "logs"))).toBe(true);
  });
});



describe("removeSocketFile", () => {
  it("does not throw when socket file does not exist", () => {
    expect(() => removeSocketFile()).not.toThrow();
  });
});



describe("migrateLoopsToJson", () => {
  it("migrates individual loop JSON files to loops.json array", () => {
    const dir = getLoopsDir();
    mkdirSync(dir, { recursive: true });

    const loop1 = makeLoopMeta({ id: "loop1", createdAt: "2024-01-01T00:00:00.000Z" });
    const loop2 = makeLoopMeta({ id: "loop2", createdAt: "2024-06-01T00:00:00.000Z" });

    writeFileSync(join(dir, "loop1.json"), JSON.stringify(loop1));
    writeFileSync(join(dir, "loop2.json"), JSON.stringify(loop2));

    migrateLoopsToJson();

    const all = loadAllLoops();
    expect(all).toHaveLength(2);
    expect(all[0].id).toBe("loop1");
    expect(all[1].id).toBe("loop2");
  });

  it("does not overwrite if loops.json already exists", () => {
    const dir = getLoopsDir();
    mkdirSync(dir, { recursive: true });

    // Write existing loops.json with one loop
    const existing = makeLoopMeta({ id: "existing" });
    const jsonFile = loopsJson();
    mkdirSync(path.dirname(jsonFile), { recursive: true });
    writeFileSync(jsonFile, JSON.stringify([existing], null, 2));

    // Also write an old-format file that should NOT be migrated
    writeFileSync(join(dir, "old.json"), JSON.stringify(makeLoopMeta({ id: "old" })));

    migrateLoopsToJson();

    const all = loadAllLoops();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe("existing");
  });

  it("handles corrupted individual files gracefully", () => {
    const dir = getLoopsDir();
    mkdirSync(dir, { recursive: true });

    const good = makeLoopMeta({ id: "good" });
    writeFileSync(join(dir, "good.json"), JSON.stringify(good));
    writeFileSync(join(dir, "bad.json"), "not valid json {{{");

    migrateLoopsToJson();

    const all = loadAllLoops();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe("good");
  });

  it("does nothing when loops directory does not exist", () => {
    // No loops/ dir created
    migrateLoopsToJson();
    expect(loadAllLoops()).toEqual([]);
  });

  it("does nothing when loops directory is empty", () => {
    mkdirSync(getLoopsDir(), { recursive: true });
    migrateLoopsToJson();
    expect(loadAllLoops()).toEqual([]);
  });

  it("sorts migrated loops by createdAt", () => {
    const dir = getLoopsDir();
    mkdirSync(dir, { recursive: true });

    const newer = makeLoopMeta({ id: "newer", createdAt: "2024-12-01T00:00:00.000Z" });
    const older = makeLoopMeta({ id: "older", createdAt: "2024-01-01T00:00:00.000Z" });

    writeFileSync(join(dir, "newer.json"), JSON.stringify(newer));
    writeFileSync(join(dir, "older.json"), JSON.stringify(older));

    migrateLoopsToJson();

    const all = loadAllLoops();
    expect(all[0].id).toBe("older");
    expect(all[1].id).toBe("newer");
  });
});



describe("migrateTasksToJson", () => {
  it("migrates individual task JSON files to tasks.json array", () => {
    const dir = getTasksDir();
    mkdirSync(dir, { recursive: true });

    const task1 = makeTaskDef({ id: "task1", createdAt: "2024-01-01T00:00:00.000Z" });
    const task2 = makeTaskDef({ id: "task2", createdAt: "2024-06-01T00:00:00.000Z" });

    writeFileSync(join(dir, "task1.json"), JSON.stringify(task1));
    writeFileSync(join(dir, "task2.json"), JSON.stringify(task2));

    migrateTasksToJson();

    const all = loadAllTasks();
    expect(all).toHaveLength(2);
    expect(all[0].id).toBe("task1");
    expect(all[1].id).toBe("task2");
  });

  it("does not overwrite if tasks.json already exists", () => {
    const dir = getTasksDir();
    mkdirSync(dir, { recursive: true });

    const existing = makeTaskDef({ id: "existing" });
    const jsonFile = tasksJson();
    mkdirSync(path.dirname(jsonFile), { recursive: true });
    writeFileSync(jsonFile, JSON.stringify([existing], null, 2));

    writeFileSync(join(dir, "old.json"), JSON.stringify(makeTaskDef({ id: "old" })));

    migrateTasksToJson();

    const all = loadAllTasks();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe("existing");
  });

  it("handles corrupted individual files gracefully", () => {
    const dir = getTasksDir();
    mkdirSync(dir, { recursive: true });

    const good = makeTaskDef({ id: "good" });
    writeFileSync(join(dir, "good.json"), JSON.stringify(good));
    writeFileSync(join(dir, "bad.json"), "not valid json {{{");

    migrateTasksToJson();

    const all = loadAllTasks();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe("good");
  });

  it("does nothing when tasks directory does not exist", () => {
    migrateTasksToJson();
    expect(loadAllTasks()).toEqual([]);
  });

  it("does nothing when tasks directory is empty", () => {
    mkdirSync(getTasksDir(), { recursive: true });
    migrateTasksToJson();
    expect(loadAllTasks()).toEqual([]);
  });

  it("sorts migrated tasks by createdAt", () => {
    const dir = getTasksDir();
    mkdirSync(dir, { recursive: true });

    const newer = makeTaskDef({ id: "newer", createdAt: "2024-12-01T00:00:00.000Z" });
    const older = makeTaskDef({ id: "older", createdAt: "2024-01-01T00:00:00.000Z" });

    writeFileSync(join(dir, "newer.json"), JSON.stringify(newer));
    writeFileSync(join(dir, "older.json"), JSON.stringify(older));

    migrateTasksToJson();

    const all = loadAllTasks();
    expect(all[0].id).toBe("older");
    expect(all[1].id).toBe("newer");
  });
});
