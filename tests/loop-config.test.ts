import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseMaxRuns, parseCommandLine, buildLoopOptions, joinCommandLines } from "../src/loop-config.js";

// ── parseMaxRuns ────────────────────────────────────────────────────────

describe("parseMaxRuns", () => {
  it("returns null for null", () => {
    expect(parseMaxRuns(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(parseMaxRuns(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseMaxRuns("")).toBeNull();
  });

  it("returns the number when given a number", () => {
    expect(parseMaxRuns(5)).toBe(5);
  });

  it("returns 1 when given number 1", () => {
    expect(parseMaxRuns(1)).toBe(1);
  });

  it("parses a string number", () => {
    expect(parseMaxRuns("3")).toBe(3);
  });

  it("parses a string with leading zeros", () => {
    expect(parseMaxRuns("007")).toBe(7);
  });

  it("throws for NaN string", () => {
    expect(() => parseMaxRuns("abc")).toThrow();
  });

  it("throws for negative number", () => {
    expect(() => parseMaxRuns(-1)).toThrow();
  });

  it("throws for zero number", () => {
    expect(() => parseMaxRuns(0)).toThrow();
  });

  it("throws for negative string", () => {
    expect(() => parseMaxRuns("-5")).toThrow();
  });

  it("throws for zero string", () => {
    expect(() => parseMaxRuns("0")).toThrow();
  });

  it("throws for float string that truncates to 0", () => {
    expect(() => parseMaxRuns("0.5")).toThrow();
  });
});

// ── parseCommandLine ────────────────────────────────────────────────────

describe("parseCommandLine", () => {
  it("parses simple tokens", () => {
    expect(parseCommandLine("echo hello world")).toEqual(["echo", "hello", "world"]);
  });

  it("handles double-quoted strings", () => {
    expect(parseCommandLine('echo "hello world"')).toEqual(["echo", "hello world"]);
  });

  it("handles single-quoted strings", () => {
    expect(parseCommandLine("echo 'hello world'")).toEqual(["echo", "hello world"]);
  });

  it("handles escaped characters in double quotes", () => {
    expect(parseCommandLine('echo "hello\\nworld"')).toEqual(["echo", "hellonworld"]);
  });

  it("handles escaped backslash in double quotes", () => {
    expect(parseCommandLine('echo "hello\\\\world"')).toEqual(["echo", "hello\\world"]);
  });

  it("handles escaped quote in double quotes", () => {
    expect(parseCommandLine('echo "hello\\"world"')).toEqual(["echo", "hello\"world"]);
  });

  it("does not interpret escapes in single quotes", () => {
    expect(parseCommandLine("echo 'hello\\nworld'")).toEqual(["echo", "hello\\nworld"]);
  });

  it("throws on unbalanced double quotes", () => {
    expect(() => parseCommandLine('echo "hello')).toThrow();
  });

  it("throws on unbalanced single quotes", () => {
    expect(() => parseCommandLine("echo 'hello")).toThrow();
  });

  it("handles tabs as delimiters", () => {
    expect(parseCommandLine("echo\thello\tworld")).toEqual(["echo", "hello", "world"]);
  });

  it("handles multiple spaces between tokens", () => {
    expect(parseCommandLine("echo   hello    world")).toEqual(["echo", "hello", "world"]);
  });

  it("handles mixed spaces and tabs", () => {
    expect(parseCommandLine("echo \t hello \t\t world")).toEqual(["echo", "hello", "world"]);
  });

  it("handles empty string", () => {
    expect(parseCommandLine("")).toEqual([]);
  });

  it("handles whitespace-only string", () => {
    expect(parseCommandLine("   \t  ")).toEqual([]);
  });

  it("handles leading and trailing whitespace", () => {
    expect(parseCommandLine("  echo hello  ")).toEqual(["echo", "hello"]);
  });

  it("handles adjacent quoted and unquoted parts", () => {
    expect(parseCommandLine('echo "hello"world')).toEqual(["echo", "helloworld"]);
  });

  it("handles empty double-quoted string", () => {
    expect(parseCommandLine('echo ""')).toEqual(["echo", ""]);
  });

  it("handles empty single-quoted string", () => {
    expect(parseCommandLine("echo ''")).toEqual(["echo", ""]);
  });

  it("handles escape at end of double-quoted string (no next char)", () => {
    // Backslash at very end of string within double quotes – no char to escape
    expect(parseCommandLine('echo "hello\\"')).toEqual(["echo", "hello\""]);
  });

  it("handles complex command with args", () => {
    expect(parseCommandLine('git commit -m "fix: update tests"')).toEqual([
      "git",
      "commit",
      "-m",
      "fix: update tests",
    ]);
  });
});

// ── joinCommandLines ────────────────────────────────────────────────────

describe("joinCommandLines", () => {
  it("joins lines with space when no trailing backslash", () => {
    expect(joinCommandLines("line1\nline2")).toBe("line1 line2");
  });

  it("joins lines with no space when trailing backslash", () => {
    expect(joinCommandLines("opencode run \\\n  --model big-pickle")).toBe(
      "opencode run --model big-pickle"
    );
  });

  it("handles the spec example with quoted strings and backslash continuation", () => {
    expect(
      joinCommandLines('opencode run \\\n  "search missing translations" \\\n  --model "big-pickle"')
    ).toBe('opencode run "search missing translations" --model "big-pickle"');
  });

  it("preserves newlines inside quoted strings", () => {
    expect(joinCommandLines('echo "hello\nworld"')).toBe('echo "hello\nworld"');
  });

  it("drops empty lines", () => {
    expect(joinCommandLines("line1\n\nline2")).toBe("line1 line2");
  });

  it("drops whitespace-only lines", () => {
    expect(joinCommandLines("line1\n   \nline2")).toBe("line1 line2");
  });

  it("returns empty string for empty input", () => {
    expect(joinCommandLines("")).toBe("");
  });

  it("returns the line unchanged for a single line", () => {
    expect(joinCommandLines("echo hello")).toBe("echo hello");
  });

  it("handles lines that are only a backslash — consumed to empty join", () => {
    expect(joinCommandLines("\\\n\\")).toBe("");
  });

  it("handles mixed backslash-continuation and normal lines", () => {
    expect(joinCommandLines("cmd \\\narg1\narg2 \\\narg3")).toBe("cmd arg1 arg2 arg3");
  });

  it("drops leading and trailing empty lines", () => {
    expect(joinCommandLines("\nline1\nline2\n")).toBe("line1 line2");
  });

  it("handles trailing backslash on last line (consumed, no extra space)", () => {
    expect(joinCommandLines("echo hello\\")).toBe("echo hello");
  });
});

// ── buildLoopOptions ────────────────────────────────────────────────────

describe("buildLoopOptions", () => {
  it("builds options with valid input", () => {
    const result = buildLoopOptions("1m", {
      command: "echo",
      commandArgs: ["hello"],
      description: "test loop",
    });

    expect(result.intervalHuman).toBe("1m");
    expect(result.options.command).toBe("echo");
    expect(result.options.commandArgs).toEqual(["hello"]);
    expect(result.options.description).toBe("test loop");
    expect(result.options.interval).toBe(60000);
  });

  it("throws when command is empty and no taskId", () => {
    expect(() => buildLoopOptions("1m", { command: "", description: "test" })).toThrow();
  });

  it("throws when command is whitespace-only and no taskId", () => {
    expect(() => buildLoopOptions("1m", { command: "   ", description: "test" })).toThrow();
  });

  it("does not throw when command is empty but taskId is set", () => {
    const result = buildLoopOptions("1m", {
      taskId: "task-1",
      command: "",
      description: "test",
    });
    expect(result.options.taskId).toBe("task-1");
  });

  it("throws when description is empty", () => {
    expect(() => buildLoopOptions("1m", { command: "echo", description: "" })).toThrow();
  });

  it("throws when description is whitespace-only", () => {
    expect(() => buildLoopOptions("1m", { command: "echo", description: "   " })).toThrow();
  });

  it("throws when description is undefined", () => {
    expect(() => buildLoopOptions("1m", { command: "echo" })).toThrow();
  });

  it("applies default values correctly", () => {
    const result = buildLoopOptions("10s", {
      command: "echo",
      description: "desc",
    });

    expect(result.options.now).toBe(false); // defaults to false via `now`
    expect(result.options.immediate).toBe(false);
    expect(result.options.verbose).toBe(false);
    expect(result.options.maxRuns).toBeNull();
    expect(result.options.cwd).toBe("");
    expect(result.options.projectId).toBe("default");
    expect(result.options.offset).toBeNull();
    expect(result.options.taskId).toBeNull();
    expect(result.options.commandArgs).toEqual([]);
  });

  it("passes through all provided options", () => {
    const result = buildLoopOptions("5s", {
      command: "npm",
      commandArgs: ["test"],
      description: "run tests",
      now: true,
      maxRuns: 3,
      verbose: true,
      cwd: "/tmp",
      projectId: "proj-1",
      offset: 500,
    });

    expect(result.options.command).toBe("npm");
    expect(result.options.commandArgs).toEqual(["test"]);
    expect(result.options.immediate).toBe(true);
    expect(result.options.maxRuns).toBe(3);
    expect(result.options.verbose).toBe(true);
    expect(result.options.cwd).toBe("/tmp");
    expect(result.options.projectId).toBe("proj-1");
    expect(result.options.offset).toBe(500);
  });

  it("parses maxRuns string to number", () => {
    const result = buildLoopOptions("1m", {
      command: "echo",
      description: "desc",
      maxRuns: "5",
    });
    expect(result.options.maxRuns).toBe(5);
  });

  it("parses maxRuns null to null", () => {
    const result = buildLoopOptions("1m", {
      command: "echo",
      description: "desc",
      maxRuns: null,
    });
    expect(result.options.maxRuns).toBeNull();
  });
});
