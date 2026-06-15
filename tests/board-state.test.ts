import { describe, expect, it } from "vitest";
import type { LoopMeta } from "../src/types.js";
import {
  applyLoopFilters,
  cycleSortMode,
  cycleStatusFilter,
  defaultFilters,
} from "../src/board/state.js";

function loop(id: string, values: Partial<LoopMeta> = {}): LoopMeta {
  return {
    id,
    command: "echo",
    commandArgs: [id],
    interval: 1000,
    intervalHuman: "1s",
    immediate: false,
    maxRuns: null,
    verbose: false,
    cwd: "",
    description: "",
    status: "sleeping",
    createdAt: "2026-06-14T10:00:00.000Z",
    runCount: 0,
    lastRunAt: null,
    lastExitCode: null,
    lastDuration: null,
    nextRunAt: null,
    remainingDelayMs: null,
    pid: 123,
    ...values,
  };
}

describe("board state", () => {
  it("filters loops by status", () => {
    const loops = [
      loop("a1", { status: "running", commandArgs: ["alpha"] }),
      loop("b2", { status: "paused", commandArgs: ["beta"] }),
    ];

    const result = applyLoopFilters(
      loops,
      { ...defaultFilters, status: "paused" },
      "status"
    );

    expect(result.map((item) => item.id)).toEqual(["b2"]);
  });

  it("filters loops by query across command and args", () => {
    const loops = [
      loop("a1", { status: "running", commandArgs: ["alpha"] }),
      loop("b2", { status: "paused", commandArgs: ["beta"] }),
    ];

    const result = applyLoopFilters(
      loops,
      { ...defaultFilters, query: "alpha" },
      "status"
    );

    expect(result.map((item) => item.id)).toEqual(["a1"]);
  });

  it("sorts by status order then created recency", () => {
    const loops = [
      loop("paused", { status: "paused" }),
      loop("running", { status: "running" }),
    ];

    const result = applyLoopFilters(loops, defaultFilters, "status");
    expect(result[0]?.id).toBe("running");
  });

  it("sorts by created mode newest first", () => {
    const loops = [
      loop("old", { createdAt: "2026-06-14T10:00:00.000Z" }),
      loop("new", { createdAt: "2026-06-14T11:00:00.000Z" }),
    ];

    const result = applyLoopFilters(loops, defaultFilters, "created");
    expect(result[0]?.id).toBe("new");
  });

  it("cycles sort modes", () => {
    expect(cycleSortMode("status")).toBe("recent");
    expect(cycleSortMode("recent")).toBe("created");
    expect(cycleSortMode("created")).toBe("status");
  });

  it("cycles status filters through every value", () => {
    expect(cycleStatusFilter("all")).toBe("running");
    expect(cycleStatusFilter("running")).toBe("sleeping");
    expect(cycleStatusFilter("sleeping")).toBe("paused");
    expect(cycleStatusFilter("paused")).toBe("stopped");
    expect(cycleStatusFilter("stopped")).toBe("all");
  });
});
