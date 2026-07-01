import { describe, it, expect } from "vitest";
import { tail } from "../src/shared/tail.js";

describe("tail", () => {
  it("returns last N lines from content", () => {
    const result = tail("a\nb\nc\nd\ne", 3);
    expect(result).toEqual(["c", "d", "e"]);
  });

  it("returns all lines when count is 0", () => {
    const content = "line1\nline2\nline3";
    expect(tail(content, 0)).toEqual(["line1", "line2", "line3"]);
  });

  it("returns all lines when count is negative", () => {
    const content = "a\nb\nc";
    expect(tail(content, -1)).toEqual(["a", "b", "c"]);
    expect(tail(content, -100)).toEqual(["a", "b", "c"]);
  });

  it("returns empty array for empty content", () => {
    expect(tail("", 5)).toEqual([""]);
  });

  it("returns fewer lines when content has fewer lines than N", () => {
    const result = tail("a\nb", 10);
    expect(result).toEqual(["a", "b"]);
  });

  it("handles single line content", () => {
    expect(tail("only line", 1)).toEqual(["only line"]);
    expect(tail("only line", 5)).toEqual(["only line"]);
  });

  it("returns exact count for single line request", () => {
    const result = tail("a\nb\nc\nd", 1);
    expect(result).toEqual(["d"]);
  });

  it("handles content with trailing newline", () => {
    // "a\nb\n".split("\n") === ["a", "b", ""]
    const result = tail("a\nb\n", 2);
    expect(result).toEqual(["b", ""]);
  });

  it("handles count equal to total lines", () => {
    const content = "x\ny\nz";
    expect(tail(content, 3)).toEqual(["x", "y", "z"]);
  });
});
