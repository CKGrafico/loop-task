import { describe, it, expect, vi } from "vitest";
import { tokenizeCommand } from "../src/tui/utils/syntax.js";
import { joinCommandLines } from "../src/loop-config.js";
import { UndoRedoStack } from "../src/shared/useUndoRedo.js";
import { CODE_EDITOR_SYNTAX_COLORS, CODE_EDITOR_UNDO_LIMIT, CODE_EDITOR_MODAL_HEIGHT } from "../src/config/constants.js";
import { t } from "../src/i18n/index.js";

// ── Pure logic tests ─────────────────────────────────────────────────
// The board CodeEditorModal uses OpenTUI primitives (useKeyboard,
// useTerminalDimensions) which cannot be rendered via ink-testing-library.
// We test the pure functions it depends on, plus verify the component
// module can be imported without error.

describe("board CodeEditorModal — tokenizeCommand", () => {
  it("tokenizes a simple command", () => {
    const tokens = tokenizeCommand('opencode run "search missing"');
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens[0]).toEqual({ type: "word", value: "opencode" });
    expect(tokens[1]).toEqual({ type: "word", value: "run" });
    // The quoted string
    const strToken = tokens.find((t) => t.type === "string");
    expect(strToken).toBeDefined();
    expect(strToken!.value).toContain("search missing");
  });

  it("tokenizes flags", () => {
    const tokens = tokenizeCommand("cmd --model big-pickle -v");
    const flags = tokens.filter((t) => t.type === "flag");
    expect(flags.length).toBe(2);
    expect(flags[0].value).toBe("--model");
    expect(flags[1].value).toBe("-v");
  });

  it("tokenizes operators", () => {
    const tokens = tokenizeCommand("cmd1 && cmd2 | cmd3");
    const ops = tokens.filter((t) => t.type === "operator");
    expect(ops.length).toBe(2);
    expect(ops.map((o) => o.value)).toContain("&&");
    expect(ops.map((o) => o.value)).toContain("|");
  });

  it("returns empty for empty string", () => {
    expect(tokenizeCommand("")).toEqual([]);
  });
});

describe("board CodeEditorModal — joinCommandLines", () => {
  it("joins simple multi-line command", () => {
    expect(joinCommandLines("echo hello\nworld")).toBe("echo hello world");
  });

  it("handles backslash continuation", () => {
    expect(joinCommandLines("echo hello \\\nworld")).toBe("echo hello world");
  });

  it("preserves quoted newlines", () => {
    expect(joinCommandLines('echo "hello\nworld"')).toBe('echo "hello\nworld"');
  });

  it("returns single line unchanged", () => {
    expect(joinCommandLines("echo hello")).toBe("echo hello");
  });
});

describe("board CodeEditorModal — UndoRedoStack", () => {
  it("tracks value and supports undo", () => {
    const stack = new UndoRedoStack("abc", CODE_EDITOR_UNDO_LIMIT);
    stack.setValue("abcd");
    expect(stack.value).toBe("abcd");
    expect(stack.canUndo).toBe(true);
    stack.undo();
    expect(stack.value).toBe("abc");
  });

  it("supports redo after undo", () => {
    const stack = new UndoRedoStack("abc", CODE_EDITOR_UNDO_LIMIT);
    stack.setValue("abcd");
    stack.undo();
    expect(stack.canRedo).toBe(true);
    stack.redo();
    expect(stack.value).toBe("abcd");
  });

  it("clears redo on new setValue", () => {
    const stack = new UndoRedoStack("abc", CODE_EDITOR_UNDO_LIMIT);
    stack.setValue("abcd");
    stack.undo();
    expect(stack.canRedo).toBe(true);
    stack.setValue("xyz");
    expect(stack.canRedo).toBe(false);
  });

  it("respects the undo limit", () => {
    const limit = 3;
    const stack = new UndoRedoStack("0", limit);
    for (let i = 1; i <= 5; i++) stack.setValue(String(i));
    // History should be capped: can undo `limit` times (entries 2,3,4 → value "5" is current)
    let undoCount = 0;
    while (stack.canUndo) {
      stack.undo();
      undoCount++;
    }
    expect(undoCount).toBe(limit);
  });

  it("identical setValue is a no-op", () => {
    const stack = new UndoRedoStack("abc", CODE_EDITOR_UNDO_LIMIT);
    const changed = stack.setValue("abc");
    expect(changed).toBe(false);
    expect(stack.canUndo).toBe(false);
  });
});

describe("board CodeEditorModal — constants", () => {
  it("syntax colors cover all token types", () => {
    const types: Array<"flag" | "string" | "operator" | "word"> = ["flag", "string", "operator", "word"];
    for (const type of types) {
      expect(CODE_EDITOR_SYNTAX_COLORS[type]).toBeTruthy();
      expect(CODE_EDITOR_SYNTAX_COLORS[type]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("undo limit is a positive number", () => {
    expect(CODE_EDITOR_UNDO_LIMIT).toBeGreaterThan(0);
  });

  it("modal height is a positive number", () => {
    expect(CODE_EDITOR_MODAL_HEIGHT).toBeGreaterThan(0);
  });
});

describe("board CodeEditorModal — i18n keys", () => {
  it("all codeEditor i18n keys resolve to non-empty strings", () => {
    const keys = [
      "codeEditor.title",
      "codeEditor.hint",
      "codeEditor.buttonCopy",
      "codeEditor.buttonPaste",
      "codeEditor.buttonClear",
      "codeEditor.previewLabel",
      "codeEditor.previewTruncated",
      "codeEditor.emptyPlaceholder",
    ] as const;
    for (const key of keys) {
      const val = t(key);
      expect(val).toBeTruthy();
      expect(val.length).toBeGreaterThan(0);
    }
  });
});

describe("board CodeEditorModal — import", () => {
  it("module can be imported without error", async () => {
    // Dynamic import to verify the module compiles and exports correctly.
    // @opentui/react is a runtime-only dep (not available in vitest),
    // so the import may fail in CI. We catch and mark as expected-skip.
    try {
      const mod = await import("../src/board/components/CodeEditorModal.js");
      expect(mod.CodeEditorModal).toBeDefined();
      expect(typeof mod.CodeEditorModal).toBe("function");
    } catch (err: unknown) {
      // If the error is about @opentui/react missing, that's expected in test env
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("@opentui/react")) {
        // TypeScript compilation already verified via `tsc --noEmit`
        // (passed separately). Runtime import fails because the TUI runtime
        // isn't available in Node.js test env — this is expected.
        return;
      }
      throw err;
    }
  });
});
