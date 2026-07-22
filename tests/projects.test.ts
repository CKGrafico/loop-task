import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ProjectManager } from "../src/daemon/managers/project-manager.js";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), "loop-projects-test-"));
}

describe("ProjectManager", () => {
  let tmpDir: string;
  let origHome: string | undefined;
  let manager: ProjectManager;

  beforeEach(() => {
    tmpDir = makeTempDir();
    origHome = process.env.LOOP_CLI_HOME;
    process.env.LOOP_CLI_HOME = tmpDir;
    manager = new ProjectManager();
  });

  afterEach(() => {
    if (origHome === undefined) {
      delete process.env.LOOP_CLI_HOME;
    } else {
      process.env.LOOP_CLI_HOME = origHome;
    }
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("B1: init creates Default project when projects dir is empty", () => {
    manager.init();
    const projects = manager.getAll();
    expect(projects).toHaveLength(1);
    const def = projects[0];
    expect(def).toBeDefined();
    expect(def!.id).toBe("default");
    expect(def!.name).toBe("Default");
    expect(def!.isDefault).toBe(true);
    expect(def!.isSystem).toBe(true);
    expect(def!.color).toBe("#ffffff");
  });

  it("B1: init does not duplicate Default if called twice", () => {
    manager.init();
    manager.init();
    const projects = manager.getAll();
    const defaults = projects.filter((p) => p.id === "default");
    expect(defaults).toHaveLength(1);
  });

  it("B2: create returns project with correct fields and persists to disk", () => {
    manager.init();
    const project = manager.create("Work", "#00bcd4");
    expect(project.name).toBe("Work");
    expect(project.color).toBe("#00bcd4");
    expect(project.id).toBeTruthy();
    expect(project.isDefault).toBe(false);
    expect(project.isSystem).toBe(false);
    expect(project.createdAt).toBeTruthy();

    const freshManager = new ProjectManager();
    freshManager.init();
    const all = freshManager.getAll();
    const found = all.find((p) => p.id === project.id);
    expect(found).toBeDefined();
    expect(found!.name).toBe("Work");
    expect(found!.color).toBe("#00bcd4");
  });

  it("B3: update renames a project and persists", () => {
    manager.init();
    const project = manager.create("OldName", "#ff5722");
    manager.update(project.id, "NewName");

    const freshManager = new ProjectManager();
    freshManager.init();
    const found = freshManager.get(project.id);
    expect(found).toBeDefined();
    expect(found!.name).toBe("NewName");
  });

  it("B3: update throws when trying to rename the Default project", () => {
    manager.init();
    expect(() => manager.update("default", "Renamed")).toThrow();
  });

  it("B4: delete removes a project from disk", () => {
    manager.init();
    const project = manager.create("Temp", "#4caf50");
    manager.delete(project.id);

    const freshManager = new ProjectManager();
    freshManager.init();
    const found = freshManager.get(project.id);
    expect(found).toBeUndefined();
  });

  it("B4: delete throws when trying to delete the Default project", () => {
    manager.init();
    expect(() => manager.delete("default")).toThrow();
  });
});

describe("ProjectManager migration", () => {
  let tmpDir: string;
  let origHome: string | undefined;

  beforeEach(() => {
    tmpDir = makeTempDir();
    origHome = process.env.LOOP_CLI_HOME;
    process.env.LOOP_CLI_HOME = tmpDir;
  });

  afterEach(() => {
    if (origHome === undefined) {
      delete process.env.LOOP_CLI_HOME;
    } else {
      process.env.LOOP_CLI_HOME = origHome;
    }
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("B5: LoopManager.init migrates loops missing projectId to default", { timeout: 20000 }, async () => {
    const loopsDir = join(tmpDir, ".loop-cli", "loops");
    const logsDir = join(tmpDir, ".loop-cli", "logs");
    mkdirSync(loopsDir, { recursive: true });
    mkdirSync(logsDir, { recursive: true });

    const loopWithoutProject = {
      id: "test1234",
      taskId: null,
      command: "echo",
      commandArgs: ["hello"],
      interval: 60000,
      intervalHuman: "1m",
      immediate: false,
      maxRuns: null,
      verbose: false,
      cwd: "",
      description: "test loop",
      status: "idle",
      createdAt: new Date().toISOString(),
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
      offset: null,
    };

    // Write as individual .json file in the old loops/ directory format
    writeFileSync(join(loopsDir, "test1234.json"), JSON.stringify(loopWithoutProject, null, 2));

    const { LoopManager } = await import("../src/daemon/managers/loop-manager.js");
    const { TaskManager } = await import("../src/daemon/managers/task-manager.js");
    const { ProjectManager } = await import("../src/daemon/managers/project-manager.js");
    const { migrateLoopsToJson, migrateTasksToJson } = await import("../src/daemon/state/index.js");

    // Migrate old per-file format to loops.json
    migrateLoopsToJson();
    migrateTasksToJson();

    const projectManager = new ProjectManager();
    const taskManager = new TaskManager();
    const loopManager = new LoopManager(taskManager, projectManager);
    loopManager.init();

    const { loadAllLoops } = await import("../src/daemon/state/index.js");
    const loops = loadAllLoops();
    const migrated = loops.find((l) => l.id === "test1234");
    expect(migrated).toBeDefined();
    expect(migrated!.projectId).toBe("default");
  });
});
