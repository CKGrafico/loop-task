import { describe, it, expect } from "vitest";
import { remapRecipeIds } from "../src/daemon/recipe/id-remapper.js";
import type { RecipeFile } from "../src/daemon/recipe/validator.js";

const baseRecipe: RecipeFile = {
  version: 2,
  loops: [
    {
      taskId: "select",
      interval: 1800000,
      intervalHuman: "30m",
    },
  ],
  tasks: [
    {
      id: "select",
      name: "Select issue",
      command: "gh",
      commandArgs: ["issue", "list"],
      onSuccessTaskId: "refine",
      onFailureTaskId: "noop",
    },
    {
      id: "refine",
      name: "AI Refinement",
      command: "opencode",
      commandArgs: ["run"],
      onSuccessTaskId: null,
      onFailureTaskId: null,
    },
    {
      id: "noop",
      name: "Terminator",
      command: "echo",
      commandArgs: ["Nothing"],
      silentChain: true,
      onSuccessTaskId: null,
      onFailureTaskId: null,
    },
  ],
  projects: [],
};

describe("remapRecipeIds", () => {
  it("generates 8-char hex IDs for each task", () => {
    const result = remapRecipeIds(baseRecipe);
    for (const task of result.tasks) {
      expect(task.id).toMatch(/^[0-9a-f]{8}$/);
    }
  });

  it("remaps cross-references correctly", () => {
    const result = remapRecipeIds(baseRecipe);
    const selectTask = result.tasks.find(
      (t) => result.remapTable.get("select") === t.id,
    );
    const refineTask = result.tasks.find(
      (t) => result.remapTable.get("refine") === t.id,
    );
    const noopTask = result.tasks.find(
      (t) => result.remapTable.get("noop") === t.id,
    );

    expect(selectTask).toBeDefined();
    expect(refineTask).toBeDefined();
    expect(noopTask).toBeDefined();

    expect(selectTask!.onSuccessTaskId).toBe(refineTask!.id);
    expect(selectTask!.onFailureTaskId).toBe(noopTask!.id);
    expect(refineTask!.onSuccessTaskId).toBeNull();
    expect(refineTask!.onFailureTaskId).toBeNull();
  });

  it("remaps loop taskId", () => {
    const result = remapRecipeIds(baseRecipe);
    const selectHex = result.remapTable.get("select")!;
    expect(result.loop.taskId).toBe(selectHex);
  });

  it("no collisions between two different recipes with same logical IDs", () => {
    const result1 = remapRecipeIds(baseRecipe);
    const result2 = remapRecipeIds(baseRecipe);

    const ids1 = new Set(result1.tasks.map((t) => t.id));
    const ids2 = new Set(result2.tasks.map((t) => t.id));

    // Each recipe generates unique IDs
    for (const id2 of ids2) {
      expect(ids1.has(id2)).toBe(false);
    }
  });

  it("preserves silentChain flag", () => {
    const result = remapRecipeIds(baseRecipe);
    const noopTask = result.tasks.find(
      (t) => result.remapTable.get("noop") === t.id,
    );
    expect(noopTask!.silentChain).toBe(true);
  });

  it("builds complete remap table", () => {
    const result = remapRecipeIds(baseRecipe);
    expect(result.remapTable.size).toBe(3);
    expect(result.remapTable.has("select")).toBe(true);
    expect(result.remapTable.has("refine")).toBe(true);
    expect(result.remapTable.has("noop")).toBe(true);
  });
});
