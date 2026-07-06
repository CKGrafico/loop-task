import { describe, it, expect } from "vitest";
import { tokenizeCommand } from "../src/tui/utils/syntax.js";

describe("tokenizeCommand", () => {
  it("returns empty array for empty string", () => {
    expect(tokenizeCommand("")).toEqual([]);
  });

  it("returns empty array for whitespace-only string", () => {
    expect(tokenizeCommand("   ")).toEqual([]);
  });

  it("classifies simple words", () => {
    expect(tokenizeCommand("hello world")).toEqual([
      { type: "word", value: "hello" },
      { type: "word", value: "world" },
    ]);
  });

  it("classifies long flags (--model)", () => {
    expect(tokenizeCommand("--model")).toEqual([
      { type: "flag", value: "--model" },
    ]);
  });

  it("classifies short flags (-v)", () => {
    expect(tokenizeCommand("-v")).toEqual([{ type: "flag", value: "-v" }]);
  });

  it("classifies combined short flags (-abc)", () => {
    expect(tokenizeCommand("-abc")).toEqual([
      { type: "flag", value: "-abc" },
    ]);
  });

  it("does not classify negative numbers as flags (-1)", () => {
    expect(tokenizeCommand("-1")).toEqual([{ type: "word", value: "-1" }]);
  });

  it("does not classify bare -- as a flag", () => {
    expect(tokenizeCommand("--")).toEqual([{ type: "word", value: "--" }]);
  });

  it("classifies double-quoted strings", () => {
    expect(tokenizeCommand('"search things"')).toEqual([
      { type: "string", value: '"search things"' },
    ]);
  });

  it("classifies single-quoted strings", () => {
    expect(tokenizeCommand("'hello world'")).toEqual([
      { type: "string", value: "'hello world'" },
    ]);
  });

  it("classifies pipe operator", () => {
    expect(tokenizeCommand("|")).toEqual([
      { type: "operator", value: "|" },
    ]);
  });

  it("classifies && operator", () => {
    expect(tokenizeCommand("&&")).toEqual([
      { type: "operator", value: "&&" },
    ]);
  });

  it("classifies || operator", () => {
    expect(tokenizeCommand("||")).toEqual([
      { type: "operator", value: "||" },
    ]);
  });

  it("classifies semicolon operator", () => {
    expect(tokenizeCommand(";")).toEqual([
      { type: "operator", value: ";" },
    ]);
  });

  it("classifies > operator", () => {
    expect(tokenizeCommand(">")).toEqual([
      { type: "operator", value: ">" },
    ]);
  });

  it("classifies >> operator", () => {
    expect(tokenizeCommand(">>")).toEqual([
      { type: "operator", value: ">>" },
    ]);
  });

  it("classifies < operator", () => {
    expect(tokenizeCommand("<")).toEqual([
      { type: "operator", value: "<" },
    ]);
  });

  it("handles piped commands", () => {
    expect(tokenizeCommand("cat file | grep foo && echo done")).toEqual([
      { type: "word", value: "cat" },
      { type: "word", value: "file" },
      { type: "operator", value: "|" },
      { type: "word", value: "grep" },
      { type: "word", value: "foo" },
      { type: "operator", value: "&&" },
      { type: "word", value: "echo" },
      { type: "word", value: "done" },
    ]);
  });

  it("handles flags, strings, and words mixed", () => {
    expect(tokenizeCommand('opencode run "search things" --model big-pickle -v')).toEqual([
      { type: "word", value: "opencode" },
      { type: "word", value: "run" },
      { type: "string", value: '"search things"' },
      { type: "flag", value: "--model" },
      { type: "word", value: "big-pickle" },
      { type: "flag", value: "-v" },
    ]);
  });

  it("handles adjacent operators without spaces", () => {
    expect(tokenizeCommand("echo hi;cat file")).toEqual([
      { type: "word", value: "echo" },
      { type: "word", value: "hi" },
      { type: "operator", value: ";" },
      { type: "word", value: "cat" },
      { type: "word", value: "file" },
    ]);
  });

  it("handles redirect operators", () => {
    expect(tokenizeCommand("echo hello > out.txt")).toEqual([
      { type: "word", value: "echo" },
      { type: "word", value: "hello" },
      { type: "operator", value: ">" },
      { type: "word", value: "out.txt" },
    ]);
  });

  it("handles append redirect >>", () => {
    expect(tokenizeCommand("echo hello >> log.txt")).toEqual([
      { type: "word", value: "echo" },
      { type: "word", value: "hello" },
      { type: "operator", value: ">>" },
      { type: "word", value: "log.txt" },
    ]);
  });

  it("handles input redirect <", () => {
    expect(tokenizeCommand("sort < data.txt")).toEqual([
      { type: "word", value: "sort" },
      { type: "operator", value: "<" },
      { type: "word", value: "data.txt" },
    ]);
  });

  it("handles escaped quotes inside double-quoted strings", () => {
    expect(tokenizeCommand('"say \\"hello\\""')).toEqual([
      { type: "string", value: '"say \\"hello\\""' },
    ]);
  });

  it("handles unmatched opening quote as string", () => {
    expect(tokenizeCommand('"unmatched')).toEqual([
      { type: "string", value: '"unmatched' },
    ]);
  });

  it("handles multiple quoted strings", () => {
    expect(tokenizeCommand('"first" \'second\'')).toEqual([
      { type: "string", value: '"first"' },
      { type: "string", value: "'second'" },
    ]);
  });

  it("handles || operator", () => {
    expect(tokenizeCommand("false || echo fallback")).toEqual([
      { type: "word", value: "false" },
      { type: "operator", value: "||" },
      { type: "word", value: "echo" },
      { type: "word", value: "fallback" },
    ]);
  });

  it("handles tabs as whitespace separator", () => {
    expect(tokenizeCommand("foo\tbar")).toEqual([
      { type: "word", value: "foo" },
      { type: "word", value: "bar" },
    ]);
  });

  it("handles flag with equals sign", () => {
    expect(tokenizeCommand("--model=gpt-4")).toEqual([
      { type: "flag", value: "--model=gpt-4" },
    ]);
  });
});
