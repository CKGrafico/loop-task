import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { removeIfExists, writeFileAtomic } from "../src/shared/fs-utils.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fs-utils-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("removeIfExists", () => {
  it("deletes an existing file", () => {
    const filePath = path.join(tmpDir, "target.txt");
    fs.writeFileSync(filePath, "hello");

    expect(fs.existsSync(filePath)).toBe(true);
    removeIfExists(filePath);
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it("does nothing for a non-existent file", () => {
    const filePath = path.join(tmpDir, "nonexistent.txt");
    expect(fs.existsSync(filePath)).toBe(false);

    // Should not throw
    expect(() => removeIfExists(filePath)).not.toThrow();
    expect(fs.existsSync(filePath)).toBe(false);
  });
});

describe("writeFileAtomic", () => {
  it("writes content to a new file", () => {
    const filePath = path.join(tmpDir, "output.txt");
    writeFileAtomic(filePath, "hello world");

    expect(fs.readFileSync(filePath, "utf-8")).toBe("hello world");
  });

  it("overwrites an existing file", () => {
    const filePath = path.join(tmpDir, "output.txt");
    fs.writeFileSync(filePath, "old content");

    writeFileAtomic(filePath, "new content");

    expect(fs.readFileSync(filePath, "utf-8")).toBe("new content");
  });

  it("does not leave a temp file on success", () => {
    const filePath = path.join(tmpDir, "output.txt");
    writeFileAtomic(filePath, "data");

    const tmpPath = `${filePath}.${process.pid}.tmp`;
    expect(fs.existsSync(tmpPath)).toBe(false);
  });

  it("writes empty string successfully", () => {
    const filePath = path.join(tmpDir, "empty.txt");
    writeFileAtomic(filePath, "");

    expect(fs.readFileSync(filePath, "utf-8")).toBe("");
  });

  it("writes multi-line content correctly", () => {
    const filePath = path.join(tmpDir, "multi.txt");
    const content = "line1\nline2\nline3";
    writeFileAtomic(filePath, content);

    expect(fs.readFileSync(filePath, "utf-8")).toBe(content);
  });
});
