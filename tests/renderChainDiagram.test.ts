import { describe, it, expect } from "vitest";
import { renderChainDiagram } from "../src/features/chain-editor/renderChainDiagram.js";
import type { TaskDefinition } from "../src/types.js";

function makeTask(overrides: Partial<TaskDefinition> & { id: string }): TaskDefinition {
  return {
    name: overrides.id,
    command: "echo",
    commandArgs: [],
    onSuccessTaskId: null,
    onFailureTaskId: null,
    maxRuns: 5,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("renderChainDiagram", () => {
  it("renders a single task with no branches", () => {
    const tasks: TaskDefinition[] = [makeTask({ id: "t1", name: "Single Task" })];
    const result = renderChainDiagram("t1", tasks);
    expect(result).toContain("Single Task");
    expect(result).toContain("onSuccess -> (none)");
    expect(result).toContain("onFailure -> (none)");
  });

  it("renders steps when present", () => {
    const tasks: TaskDefinition[] = [
      makeTask({
        id: "t1",
        name: "Step Task",
        steps: [{ commands: [{ command: "gh", commandArgs: ["issue", "list"] }] }],
      }),
    ];
    const result = renderChainDiagram("t1", tasks);
    expect(result).toContain("Step 1: gh issue list");
  });

  it("renders command when no steps", () => {
    const tasks: TaskDefinition[] = [
      makeTask({ id: "t1", name: "Cmd Task", command: "run", commandArgs: ["--flag"] }),
    ];
    const result = renderChainDiagram("t1", tasks);
    expect(result).toContain("run --flag");
  });

  it("renders silent chain marker [s]", () => {
    const tasks: TaskDefinition[] = [makeTask({ id: "t1", name: "Silent", silentChain: true })];
    const result = renderChainDiagram("t1", tasks);
    expect(result).toContain("[s]");
  });

  it("renders chain with onSuccess link", () => {
    const tasks: TaskDefinition[] = [
      makeTask({ id: "t1", name: "First", onSuccessTaskId: "t2" }),
      makeTask({ id: "t2", name: "Second" }),
    ];
    const result = renderChainDiagram("t1", tasks);
    expect(result).toContain("First");
    expect(result).toContain("Second");
    expect(result).toContain("onSuccess -> Second");
  });

  it("shows (cycle) for cyclic chains", () => {
    const tasks: TaskDefinition[] = [
      makeTask({ id: "t1", name: "Task A", onSuccessTaskId: "t2" }),
      makeTask({ id: "t2", name: "Task B", onFailureTaskId: "t1" }),
    ];
    const result = renderChainDiagram("t1", tasks);
    expect(result).toContain("(cycle)");
  });

  it("shows (missing task) for deleted task", () => {
    const tasks: TaskDefinition[] = [makeTask({ id: "t1", name: "Root" })];
    const result = renderChainDiagram("t1", tasks);
    // Root exists, so diagram renders normally — test root missing instead
    expect(result).toContain("Root");
    // Now test truly missing
    const result2 = renderChainDiagram("missing-id", tasks);
    expect(result2).toContain("(missing task)");
  });

  it("renders box borders", () => {
    const tasks: TaskDefinition[] = [makeTask({ id: "t1", name: "Boxed" })];
    const result = renderChainDiagram("t1", tasks);
    expect(result).toMatch(/\+[-]+\+/);
    expect(result).toMatch(/\|.*\|/);
  });

  it("renders connector arrows between linked tasks", () => {
    const tasks: TaskDefinition[] = [
      makeTask({ id: "t1", name: "A", onSuccessTaskId: "t2" }),
      makeTask({ id: "t2", name: "B" }),
    ];
    const result = renderChainDiagram("t1", tasks);
    expect(result).toMatch(/\|/);
    expect(result).toMatch(/v/);
  });
});
