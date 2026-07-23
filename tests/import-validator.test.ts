import { describe, it, expect } from "vitest";
import { validateExportFile } from "../src/cli/import-validator.js";
import type { LoopMeta, TaskDefinition, Project } from "../src/types.js";

function validProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "proj-1",
    name: "Test Project",
    color: "#ff0000",
    createdAt: "2024-01-01T00:00:00.000Z",
    isSystem: false,
    isDefault: false,
    ...overrides,
  };
}

function validTask(overrides: Partial<TaskDefinition> = {}): TaskDefinition {
  return {
    id: "task-1",
    name: "Test Task",
    command: "echo hello",
    commandArgs: [],
    onSuccessTaskId: null,
    onFailureTaskId: null,
    maxRuns: 5,
    createdAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function validLoop(overrides: Partial<LoopMeta> = {}): LoopMeta {
  return {
    id: "loop-1",
    taskId: null,
    command: "echo hello",
    commandArgs: [],
    interval: 60000,
    intervalHuman: "1m",
    immediate: false,
    maxRuns: null,
    verbose: false,
    cwd: "/tmp",
    description: "test loop",
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
    ...overrides,
  };
}

const validExport = {
  version: 2,
  exportedAt: "2024-01-01T00:00:00.000Z",
  loops: [validLoop()],
  tasks: [validTask()],
  projects: [validProject()],
};

describe("validateExportFile", () => {
  it("accepts a valid export file", () => {
    const result = validateExportFile(validExport);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.data).toBeDefined();
    expect(result.data!.loops).toHaveLength(1);
    expect(result.data!.tasks).toHaveLength(1);
    expect(result.data!.projects).toHaveLength(1);
  });

  it("rejects non-object input", () => {
    expect(validateExportFile("string").valid).toBe(false);
    expect(validateExportFile(null).valid).toBe(false);
    expect(validateExportFile([1, 2, 3]).valid).toBe(false);
  });

  it("rejects missing version", () => {
    const { version: _, ...noVersion } = validExport;
    const result = validateExportFile(noVersion);
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain("Missing export version");
  });

  it("rejects unsupported version", () => {
    const result = validateExportFile({ ...validExport, version: 1 });
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain("Unsupported export version: 1");
    expect(result.errors[0].message).toContain("Expected: 2");
  });

  it("rejects missing required keys", () => {
    const { loops: _loops, tasks: _tasks, projects: _projects, ...rest } = validExport;
    const result = validateExportFile({ ...rest });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("Missing required keys"))).toBe(true);
  });

  it("reports which keys are missing", () => {
    const { tasks: _tasks, projects: _projects, ...rest } = validExport;
    const result = validateExportFile(rest);
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain("tasks");
    expect(result.errors[0].message).toContain("projects");
  });

  it("rejects non-array top-level keys", () => {
    const result = validateExportFile({ ...validExport, loops: { a: 1 } });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("field 'loops' must be an array"))).toBe(true);
  });

  it("reports per-item validation errors for loops", () => {
    const badLoop = { ...validLoop(), id: undefined };
    const result = validateExportFile({ ...validExport, loops: [badLoop] });
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain("loops[0]");
    expect(result.errors[0].message).toContain("missing field 'id'");
  });

  it("reports type mismatch errors for loop fields", () => {
    const badLoop = { ...validLoop(), interval: "not-a-number" };
    const result = validateExportFile({ ...validExport, loops: [badLoop] });
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain("loops[0]");
    expect(result.errors[0].message).toContain("'interval' must be a number");
  });

  it("reports per-item validation errors for tasks", () => {
    const badTask = { ...validTask(), command: undefined };
    const result = validateExportFile({ ...validExport, tasks: [badTask] });
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain("tasks[0]");
    expect(result.errors[0].message).toContain("missing field 'command'");
  });

  it("reports per-item validation errors for projects", () => {
    const badProject = { ...validProject(), name: 123 };
    const result = validateExportFile({ ...validExport, projects: [badProject] });
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain("projects[0]");
    expect(result.errors[0].message).toContain("'name' must be a string");
  });

  it("rejects non-object items in arrays", () => {
    const result = validateExportFile({ ...validExport, loops: ["not-an-object"] });
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain("loops[0]: must be an object");
  });

  it("allows nullable fields to be null", () => {
    const loopWithNulls = { ...validLoop(), taskId: null, maxRuns: null, lastRunAt: null };
    const result = validateExportFile({ ...validExport, loops: [loopWithNulls] });
    expect(result.valid).toBe(true);
  });

  it("accepts loops with runHistory omitted (optional in export format)", () => {
    const { runHistory: _ignored, ...loopWithoutHistory } = validLoop();
    const result = validateExportFile({ ...validExport, loops: [loopWithoutHistory] });
    expect(result.valid).toBe(true);
    expect(result.data!.loops).toHaveLength(1);
  });

  it("accepts loops with runHistory set to null", () => {
    const loopWithNullHistory = { ...validLoop(), runHistory: null };
    const result = validateExportFile({ ...validExport, loops: [loopWithNullHistory] });
    expect(result.valid).toBe(true);
  });

  it("reports multiple item errors", () => {
    const badLoop0 = { ...validLoop(), id: undefined };
    const badLoop1 = { ...validLoop({ id: "loop-2" }), interval: "bad" };
    const result = validateExportFile({ ...validExport, loops: [badLoop0, badLoop1] });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  it("accepts empty arrays", () => {
    const result = validateExportFile({ ...validExport, loops: [], tasks: [], projects: [] });
    expect(result.valid).toBe(true);
  });
});
