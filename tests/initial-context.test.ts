import { describe, it, expect } from "vitest";
import { validateContext } from "../src/core/context/validate-context.js";
import { interpolate } from "../src/core/context/template.js";
import { buildLoopOptions } from "../src/loop-config.js";

describe("initial context seeding", () => {
  it("seeds chainContext from task context and loop context", () => {
    const taskContext = { environment: "staging", targetId: "abc123" };
    const loopContext = { region: "us-east" };

    const chainContext: Record<string, unknown> = {
      ...taskContext,
      ...loopContext,
    };

    expect(chainContext).toEqual({
      environment: "staging",
      targetId: "abc123",
      region: "us-east",
    });
  });

  it("loop context overrides task context for same keys", () => {
    const taskContext = { env: "staging" };
    const loopContext = { env: "production" };

    const chainContext: Record<string, unknown> = {
      ...taskContext,
      ...loopContext,
    };

    expect(chainContext.env).toBe("production");
  });

  it("empty contexts produce empty chainContext", () => {
    const chainContext: Record<string, unknown> = {
      ...({} as Record<string, unknown>),
      ...({} as Record<string, unknown>),
    };
    expect(chainContext).toEqual({});
  });

  it("interpolate works with seeded context values", () => {
    const chainContext: Record<string, unknown> = {
      environment: "staging",
      targetId: "abc123",
    };

    const result = interpolate("deploy --env {{environment}} --target {{targetId}}", chainContext);
    expect(result).toBe("deploy --env staging --target abc123");
  });

  it("interpolate returns empty string for missing context key", () => {
    const chainContext: Record<string, unknown> = { env: "staging" };
    const result = interpolate("deploy {{env}} {{missing}}", chainContext);
    expect(result).toBe("deploy staging ");
  });

  it("Object.assign merges stdout output onto seeded context", () => {
    const chainContext: Record<string, unknown> = {
      environment: "staging",
    };

    Object.assign(chainContext, { output: "build succeeded", buildId: "42" });

    expect(chainContext).toEqual({
      environment: "staging",
      output: "build succeeded",
      buildId: "42",
    });
  });

  it("stdout output can overwrite seeded context key", () => {
    const chainContext: Record<string, unknown> = {
      environment: "staging",
    };

    Object.assign(chainContext, { environment: "production" });

    expect(chainContext.environment).toBe("production");
  });
});

describe("buildLoopOptions with context", () => {
  it("passes context through to options", () => {
    const result = buildLoopOptions("1m", {
      command: "echo",
      description: "test",
      context: { env: "staging" },
    });

    expect(result.options.context).toEqual({ env: "staging" });
  });

  it("defaults context to undefined when not provided", () => {
    const result = buildLoopOptions("1m", {
      command: "echo",
      description: "test",
    });

    expect(result.options.context).toBeUndefined();
  });

  it("passes empty context object", () => {
    const result = buildLoopOptions("1m", {
      command: "echo",
      description: "test",
      context: {},
    });

    expect(result.options.context).toEqual({});
  });
});

describe("validateContext with initial context inputs", () => {
  it("accepts valid flat context with string values", () => {
    const result = validateContext({ environment: "staging", targetId: "abc123", dryRun: "true" });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.context).toEqual({ environment: "staging", targetId: "abc123", dryRun: "true" });
    }
  });

  it("accepts context with number and boolean values", () => {
    const result = validateContext({ count: 5, enabled: true });
    expect(result.valid).toBe(true);
  });

  it("rejects nested objects", () => {
    const result = validateContext({ nested: { key: "value" } });
    expect(result.valid).toBe(false);
  });

  it("rejects arrays as values", () => {
    const result = validateContext({ list: [1, 2, 3] });
    expect(result.valid).toBe(false);
  });

  it("returns empty context for undefined", () => {
    const result = validateContext(undefined);
    expect(result).toEqual({ valid: true, context: {} });
  });

  it("returns empty context for null", () => {
    const result = validateContext(null);
    expect(result).toEqual({ valid: true, context: {} });
  });
});
