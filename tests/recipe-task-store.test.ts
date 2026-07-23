import { describe, it, expect, beforeEach } from "vitest";
import { RecipeTaskStore } from "../src/daemon/recipe/task-store.js";
import type { TaskDefinition } from "../src/types.js";

function makeTask(id: string): TaskDefinition {
  return {
    id,
    name: `Task ${id}`,
    command: "echo",
    commandArgs: [id],
    onSuccessTaskId: null,
    onFailureTaskId: null,
    createdAt: new Date().toISOString(),
  };
}

describe("RecipeTaskStore", () => {
  let store: RecipeTaskStore;

  beforeEach(() => {
    store = new RecipeTaskStore();
  });

  it("stores and retrieves tasks", () => {
    const task = makeTask("abc12345");
    store.set(task);
    expect(store.get("abc12345")).toEqual(task);
  });

  it("returns null for unknown task", () => {
    expect(store.get("unknown")).toBeNull();
  });

  it("lists all tasks", () => {
    const t1 = makeTask("aaa11111");
    const t2 = makeTask("bbb22222");
    store.setMany([t1, t2]);
    const list = store.list();
    expect(list).toHaveLength(2);
    expect(list.map((t) => t.id).sort()).toEqual(["aaa11111", "bbb22222"]);
  });

  it("deletes a task", () => {
    const task = makeTask("ccc33333");
    store.set(task);
    expect(store.delete("ccc33333")).toBe(true);
    expect(store.get("ccc33333")).toBeNull();
  });

  it("delete returns false for missing task", () => {
    expect(store.delete("missing")).toBe(false);
  });

  it("deletes many tasks", () => {
    store.setMany([makeTask("d1"), makeTask("d2"), makeTask("d3")]);
    store.deleteMany(["d1", "d3"]);
    expect(store.list()).toHaveLength(1);
    expect(store.get("d2")).not.toBeNull();
  });

  it("clears all tasks", () => {
    store.setMany([makeTask("e1"), makeTask("e2")]);
    store.clear();
    expect(store.list()).toHaveLength(0);
  });

  it("has returns true for existing task", () => {
    store.set(makeTask("f1"));
    expect(store.has("f1")).toBe(true);
    expect(store.has("missing")).toBe(false);
  });
});
