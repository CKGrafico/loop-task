import { describe, it, expect } from "vitest";
import { validateContext } from "../src/core/context/validate-context.js";

describe("validateContext", () => {
  it("returns empty context for undefined", () => {
    const result = validateContext(undefined);
    expect(result).toEqual({ valid: true, context: {} });
  });

  it("returns empty context for null", () => {
    const result = validateContext(null);
    expect(result).toEqual({ valid: true, context: {} });
  });

  it("accepts a flat object with string values", () => {
    const result = validateContext({ environment: "staging", targetId: "abc123", dryRun: "true" });
    expect(result).toEqual({ valid: true, context: { environment: "staging", targetId: "abc123", dryRun: "true" } });
  });

  it("accepts a flat object with non-string primitive values", () => {
    const result = validateContext({ count: 5, enabled: true });
    expect(result.valid).toBe(true);
  });

  it("rejects arrays", () => {
    const result = validateContext([1, 2, 3]);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("JSON object");
    }
  });

  it("rejects nested objects", () => {
    const result = validateContext({ nested: { key: "value" } });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("nested");
    }
  });

  it("rejects arrays as values", () => {
    const result = validateContext({ list: [1, 2, 3] });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("array");
    }
  });

  it("rejects primitive values", () => {
    const result = validateContext("not an object");
    expect(result.valid).toBe(false);
  });
});
