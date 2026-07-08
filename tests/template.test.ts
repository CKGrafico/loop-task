import { describe, it, expect } from "vitest";
import { interpolate } from "../src/core/context/template.js";

describe("interpolate", () => {
  it("replaces existing key with value", () => {
    expect(interpolate("{{number}}", { number: 123 })).toBe("123");
  });

  it("replaces missing key with empty string", () => {
    expect(interpolate("{{missing}}", {})).toBe("");
  });

  it("replaces multiple keys in one string", () => {
    expect(interpolate("{{a}}-{{b}}", { a: 1, b: 2 })).toBe("1-2");
  });

  it("returns unchanged when no patterns present", () => {
    expect(interpolate("hello world", { a: 1 })).toBe("hello world");
  });

  it("handles mixed existing and missing keys", () => {
    expect(interpolate("{{a}}-{{b}}", { a: 1 })).toBe("1-");
  });

  it("handles string values", () => {
    expect(interpolate("{{name}}", { name: "test" })).toBe("test");
  });

  it("handles boolean values", () => {
    expect(interpolate("{{flag}}", { flag: true })).toBe("true");
  });
});
