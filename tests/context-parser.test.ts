import { describe, it, expect } from "vitest";
import { parseStdout } from "../src/core/context-parser.js";

describe("parseStdout", () => {
  it("returns null for empty string", () => {
    expect(parseStdout("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(parseStdout("   \n\t  ")).toBeNull();
  });

  it("parses JSON object and returns its keys", () => {
    expect(parseStdout('{"number": 123, "title": "Fix"}')).toEqual({
      number: 123,
      title: "Fix",
    });
  });

  it("wraps JSON string primitive under output key", () => {
    expect(parseStdout('"hello"')).toEqual({ output: "hello" });
  });

  it("wraps JSON number primitive under output key", () => {
    expect(parseStdout("42")).toEqual({ output: "42" });
  });

  it("wraps JSON boolean primitive under output key", () => {
    expect(parseStdout("true")).toEqual({ output: "true" });
  });

  it("falls back to plain text for JSON array", () => {
    expect(parseStdout("[1,2,3]")).toEqual({ output: "[1,2,3]" });
  });

  it("merges JSONL lines as separate keys", () => {
    expect(parseStdout('{"a": 1}\n{"b": 2}')).toEqual({ a: 1, b: 2 });
  });

  it("merges JSONL with primitive line under output key", () => {
    expect(parseStdout('{"a": 1}\n"hello"')).toEqual({ a: 1, output: "hello" });
  });

  it("stores plain text under output key", () => {
    expect(parseStdout("hello world")).toEqual({ output: "hello world" });
  });

  it("stores multi-line non-JSON under output key (trimmed)", () => {
    expect(parseStdout("line1\nline2")).toEqual({ output: "line1\nline2" });
  });
});
