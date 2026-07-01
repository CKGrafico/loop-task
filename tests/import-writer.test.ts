import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { atomicImportWrite } from "../src/cli/import-writer.js";
import type { LoopMeta, TaskDefinition, Project } from "../src/types.js";

let tmpHome: string;
let dataDir: string;
let origDataDir: string | undefined;

function validProject(): Project {
  return {
    id: "proj-1",
    name: "Test",
    color: "#000",
    createdAt: "2024-01-01T00:00:00.000Z",
    isSystem: false,
    isDefault: false,
  };
}

function validTask(): TaskDefinition {
  return {
    id: "task-1",
    name: "Test Task",
    command: "echo",
    commandArgs: [],
    onSuccessTaskId: null,
    onFailureTaskId: null,
    createdAt: "2024-01-01T00:00:00.000Z",
  };
}

function validLoop(): LoopMeta {
  return {
    id: "loop-1",
    taskId: null,
    command: "echo",
    commandArgs: [],
    interval: 60000,
    intervalHuman: "1m",
    immediate: false,
    maxRuns: null,
    verbose: false,
    cwd: "/tmp",
    description: "test",
    status: "idle",
    createdAt: "2024-01-01T00:00:00.000Z",
    sessionStartedAt: null,
    runCount: 0,
    lastRunAt: null,
    lastExitCode: null,
    lastDuration: null,
    nextRunAt: null,
    remainingDelayMs: null,
    pid: 0,
    maxRunsReached: false,
    runHistory: [],
    skippedCount: 0,
    projectId: "proj-1",
    offset: null,
  };
}

beforeEach(() => {
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "import-writer-test-"));
  dataDir = path.join(tmpHome, ".loop-cli");
  fs.mkdirSync(dataDir, { recursive: true });
  origDataDir = process.env.LOOP_CLI_HOME;
  process.env.LOOP_CLI_HOME = tmpHome;
});

afterEach(() => {
  if (origDataDir !== undefined) {
    process.env.LOOP_CLI_HOME = origDataDir;
  } else {
    delete process.env.LOOP_CLI_HOME;
  }
  fs.rmSync(tmpHome, { recursive: true, force: true });
});

describe("atomicImportWrite", () => {
  it("writes all three store files", () => {
    const result = atomicImportWrite([validLoop()], [validTask()], [validProject()]);
    expect(result.success).toBe(true);

    const loopsData = JSON.parse(fs.readFileSync(path.join(dataDir, "loops.json"), "utf-8"));
    const tasksData = JSON.parse(fs.readFileSync(path.join(dataDir, "tasks.json"), "utf-8"));
    const projectsData = JSON.parse(fs.readFileSync(path.join(dataDir, "projects.json"), "utf-8"));

    expect(loopsData).toHaveLength(1);
    expect(tasksData).toHaveLength(1);
    expect(projectsData).toHaveLength(1);
  });

  it("writes empty arrays when no items", () => {
    const result = atomicImportWrite([], [], []);
    expect(result.success).toBe(true);

    const loopsData = JSON.parse(fs.readFileSync(path.join(dataDir, "loops.json"), "utf-8"));
    expect(loopsData).toEqual([]);
  });

  it("overwrites existing store files", () => {
    fs.writeFileSync(path.join(dataDir, "loops.json"), JSON.stringify([{ old: true }]));
    fs.writeFileSync(path.join(dataDir, "tasks.json"), JSON.stringify([{ old: true }]));
    fs.writeFileSync(path.join(dataDir, "projects.json"), JSON.stringify([{ old: true }]));

    const result = atomicImportWrite([validLoop()], [validTask()], [validProject()]);
    expect(result.success).toBe(true);

    const loopsData = JSON.parse(fs.readFileSync(path.join(dataDir, "loops.json"), "utf-8"));
    expect(loopsData[0].id).toBe("loop-1");
  });

  it("handles missing pre-existing store files", () => {
    const result = atomicImportWrite([validLoop()], [validTask()], [validProject()]);
    expect(result.success).toBe(true);
    expect(result.writtenStores).toEqual(["loops.json", "tasks.json", "projects.json"]);
  });

  it("rolls back on partial failure", () => {
    const loopsPath = path.join(dataDir, "loops.json");

    const originalLoops = [{ old: true }];
    fs.writeFileSync(loopsPath, JSON.stringify(originalLoops));

    fs.mkdirSync(path.join(dataDir, "tasks.json"), { recursive: true });

    const result = atomicImportWrite([validLoop()], [validTask()], [validProject()]);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();

    const restoredLoops = JSON.parse(fs.readFileSync(loopsPath, "utf-8"));
    expect(restoredLoops).toEqual(originalLoops);
  });
});
