import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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

  it("falls back to a direct write when rename keeps failing with EPERM", () => {
    const filePath = path.join(tmpDir, "locked.txt");
    const eperm = Object.assign(new Error("EPERM"), { code: "EPERM" });
    const spy = vi.spyOn(fs, "renameSync").mockImplementation(() => {
      throw eperm;
    });

    try {
      writeFileAtomic(filePath, "persisted anyway");
    } finally {
      spy.mockRestore();
    }

    // Content is persisted via the fallback path...
    expect(fs.readFileSync(filePath, "utf-8")).toBe("persisted anyway");
    // ...and the temp file is cleaned up.
    expect(fs.existsSync(`${filePath}.${process.pid}.tmp`)).toBe(false);
  });

  it("retries the rename and succeeds when the lock clears", () => {
    const filePath = path.join(tmpDir, "transient.txt");
    const real = fs.renameSync.bind(fs);
    let calls = 0;
    const spy = vi.spyOn(fs, "renameSync").mockImplementation((from, to) => {
      calls++;
      if (calls < 3) throw Object.assign(new Error("EBUSY"), { code: "EBUSY" });
      return real(from, to);
    });

    try {
      writeFileAtomic(filePath, "eventually written");
    } finally {
      spy.mockRestore();
    }

    expect(calls).toBe(3);
    expect(fs.readFileSync(filePath, "utf-8")).toBe("eventually written");
  });
});
