import { describe, expect, it } from "vitest";
import type { LoopMeta } from "../src/types.js";
import {
  applyLoopFilters,
  cycleSortMode,
  cycleStatusFilter,
  defaultFilters,
  resolveInputOwner,
  type InputOwnerState,
} from "../src/shared/ui/state.js";

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
    status: "waiting",
    createdAt: "2026-06-14T10:00:00.000Z",
    runCount: 0,
    sessionStartedAt: null,
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
    expect(cycleSortMode("description")).toBe("status");
    expect(cycleSortMode("status")).toBe("recent");
    expect(cycleSortMode("recent")).toBe("created");
    expect(cycleSortMode("created")).toBe("description");
  });

  it("cycles status filters through every value", () => {
    expect(cycleStatusFilter("all")).toBe("running");
    expect(cycleStatusFilter("running")).toBe("waiting");
    expect(cycleStatusFilter("waiting")).toBe("paused");
    expect(cycleStatusFilter("paused")).toBe("idle");
    expect(cycleStatusFilter("idle")).toBe("stopped");
    expect(cycleStatusFilter("stopped")).toBe("all");
  });
});

describe("resolveInputOwner", () => {
  it("returns modal when modal is open", () => {
    const state: InputOwnerState = { modalOpen: true, commandBarHasText: false, commandBarDropdownOpen: false };
    expect(resolveInputOwner(state)).toBe("modal");
  });

  it("returns commandBar when bar has text and no modal", () => {
    const state: InputOwnerState = { modalOpen: false, commandBarHasText: true, commandBarDropdownOpen: false };
    expect(resolveInputOwner(state)).toBe("commandBar");
  });

  it("returns commandBar when dropdown is open with no text and no modal", () => {
    const state: InputOwnerState = { modalOpen: false, commandBarHasText: false, commandBarDropdownOpen: true };
    expect(resolveInputOwner(state)).toBe("commandBar");
  });

  it("returns panel when bar is empty, no dropdown, no modal", () => {
    const state: InputOwnerState = { modalOpen: false, commandBarHasText: false, commandBarDropdownOpen: false };
    expect(resolveInputOwner(state)).toBe("panel");
  });

  it("modal wins over bar text and dropdown", () => {
    const state: InputOwnerState = { modalOpen: true, commandBarHasText: true, commandBarDropdownOpen: true };
    expect(resolveInputOwner(state)).toBe("modal");
  });
});
