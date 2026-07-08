import { describe, it, expect } from "vitest";
import { resolveColor } from "../src/client/project-commands.js";
import { PROJECT_COLORS } from "../src/shared/config/constants.js";

describe("resolveColor", () => {
  it("resolves a known color name to its hex value", () => {
    expect(resolveColor("cyan")).toBe(PROJECT_COLORS.cyan);
  });

  it("returns a valid #hex string unchanged", () => {
    expect(resolveColor("#abcdef")).toBe("#abcdef");
  });

  it("throws for an unknown color name", () => {
    expect(() => resolveColor("notacolor")).toThrow();
  });

  it("throws for an invalid hex string", () => {
    expect(() => resolveColor("#xyz")).toThrow();
  });
});
