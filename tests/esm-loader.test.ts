import { describe, it, expect, vi } from "vitest";
// @ts-expect-error - plain JS ESM module, no type declarations
import { resolve } from "../src/esm-loader.js";

const ctx = { parentURL: undefined };

describe("esm-loader resolve", () => {
  it("adds .js to an extensionless react-reconciler/constants import", () => {
    const next = vi.fn((s: string) => s);
    resolve("react-reconciler/constants", ctx, next);
    expect(next).toHaveBeenCalledWith("react-reconciler/constants.js", ctx);
  });

  it("does NOT double-append .js when the specifier already ends in .js (regression: constants.js.js)", () => {
    const next = vi.fn((s: string) => s);
    const spec = "/pkg/node_modules/react-reconciler/constants.js";
    resolve(spec, ctx, next);
    expect(next).toHaveBeenCalledWith(spec, ctx);
  });

  it("passes unrelated specifiers through unchanged", () => {
    const next = vi.fn((s: string) => s);
    resolve("node:path", ctx, next);
    expect(next).toHaveBeenCalledWith("node:path", ctx);
  });
});
