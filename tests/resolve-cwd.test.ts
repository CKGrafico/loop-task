import { describe, it, expect } from "vitest";
import path from "node:path";
import { resolveEffectiveCwd } from "../src/core/resolve-cwd.js";

describe("resolveEffectiveCwd", () => {
  it("returns project directory when loop cwd is empty", () => {
    expect(resolveEffectiveCwd("", "/home/user/project")).toBe("/home/user/project");
  });

  it("returns process.cwd() when both are empty", () => {
    expect(resolveEffectiveCwd("", "")).toBe(process.cwd());
  });

  it("returns process.cwd() when loop cwd is empty and project directory is undefined", () => {
    expect(resolveEffectiveCwd("", undefined)).toBe(process.cwd());
  });

  it("returns absolute loop cwd directly, ignoring project directory", () => {
    expect(resolveEffectiveCwd("/home/user/other", "/home/user/project")).toBe("/home/user/other");
  });

  it("concatenates relative loop cwd with project directory", () => {
    const result = resolveEffectiveCwd("subdir", "/home/user/project");
    expect(result).toBe(path.join("/home/user/project", "subdir"));
  });

  it("concatenates relative ./cwd with project directory", () => {
    const result = resolveEffectiveCwd("./logs", "/home/user/project");
    expect(result).toBe(path.join("/home/user/project", "logs"));
  });

  it("concatenates relative ../cwd with project directory", () => {
    const result = resolveEffectiveCwd("../shared", "/home/user/project/src");
    expect(result).toBe(path.join("/home/user/project/src", "../shared"));
  });

  it("resolves relative cwd against process.cwd() when no project directory", () => {
    const result = resolveEffectiveCwd("subdir", "");
    expect(result).toBe(path.join(process.cwd(), "subdir"));
  });

  it("resolves relative cwd against process.cwd() when project directory is undefined", () => {
    const result = resolveEffectiveCwd("subdir", undefined);
    expect(result).toBe(path.join(process.cwd(), "subdir"));
  });
});
