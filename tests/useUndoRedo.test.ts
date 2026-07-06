import { describe, it, expect } from "vitest";
import { UndoRedoStack } from "../src/shared/useUndoRedo.js";

describe("UndoRedoStack", () => {
  it("initial state: canUndo=false, canRedo=false, value=initial", () => {
    const s = new UndoRedoStack("init");
    expect(s.value).toBe("init");
    expect(s.canUndo).toBe(false);
    expect(s.canRedo).toBe(false);
  });

  it("after setValue: canUndo=true, canRedo=false", () => {
    const s = new UndoRedoStack("init");
    s.setValue("a");
    expect(s.value).toBe("a");
    expect(s.canUndo).toBe(true);
    expect(s.canRedo).toBe(false);
  });

  it("undo returns to previous value, canRedo=true", () => {
    const s = new UndoRedoStack("init");
    s.setValue("a");
    s.undo();
    expect(s.value).toBe("init");
    expect(s.canUndo).toBe(false);
    expect(s.canRedo).toBe(true);
  });

  it("redo restores undone value, canUndo=true", () => {
    const s = new UndoRedoStack("init");
    s.setValue("a");
    s.undo();
    s.redo();
    expect(s.value).toBe("a");
    expect(s.canUndo).toBe(true);
    expect(s.canRedo).toBe(false);
  });

  it("setValue after undo clears future stack", () => {
    const s = new UndoRedoStack("init");
    s.setValue("a");
    s.setValue("b");
    s.undo();
    expect(s.canRedo).toBe(true);
    s.setValue("c");
    expect(s.value).toBe("c");
    expect(s.canRedo).toBe(false);
  });

  it("duplicate value is a no-op (no new history entry)", () => {
    const s = new UndoRedoStack("same");
    const changed = s.setValue("same");
    expect(changed).toBe(false);
    expect(s.value).toBe("same");
    expect(s.canUndo).toBe(false);
  });

  it("history cap: exceeding limit drops oldest", () => {
    const s = new UndoRedoStack("0", 3);
    s.setValue("1");
    s.setValue("2");
    s.setValue("3");
    // history: ["0","1","2"], value: "3" — at cap
    s.setValue("4");
    // history: ["1","2","3"], value: "4" — oldest "0" dropped
    expect(s.value).toBe("4");
    expect(s.undo()).toBe(true);
    expect(s.value).toBe("3");
    expect(s.undo()).toBe(true);
    expect(s.value).toBe("2");
    expect(s.undo()).toBe(true);
    expect(s.value).toBe("1");
    expect(s.canUndo).toBe(false);
  });

  it("undo when no history is a no-op", () => {
    const s = new UndoRedoStack("init");
    expect(s.undo()).toBe(false);
    expect(s.value).toBe("init");
    expect(s.canUndo).toBe(false);
  });

  it("redo when no future is a no-op", () => {
    const s = new UndoRedoStack("init");
    expect(s.redo()).toBe(false);
    expect(s.value).toBe("init");
  });

  it("multiple undo/redo cycles work correctly", () => {
    const s = new UndoRedoStack("0");
    s.setValue("1");
    s.setValue("2");
    s.setValue("3");
    s.undo();
    expect(s.value).toBe("2");
    s.undo();
    expect(s.value).toBe("1");
    s.redo();
    expect(s.value).toBe("2");
    s.undo();
    s.undo();
    expect(s.value).toBe("0");
    expect(s.canUndo).toBe(false);
  });

  it("default limit is 50", () => {
    const s = new UndoRedoStack("0");
    for (let i = 1; i <= 51; i++) s.setValue(String(i));
    // history capped at 50, oldest "0" dropped
    expect(s.canUndo).toBe(true);
    for (let i = 0; i < 50; i++) s.undo();
    expect(s.value).toBe("1");
    expect(s.canUndo).toBe(false);
  });
});
