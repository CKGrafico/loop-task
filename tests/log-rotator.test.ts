import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { rotateLogIfNeeded } from "../src/core/logging/log-rotator.js";

const MAX_LOG_BYTES = 1024 * 1024;
const MAX_LOG_GENERATIONS = 3;

let tmpDir: string;

// Track all WriteStreams created by the mock so we don't leak file descriptors
let createdStreams: { end: () => void }[];

// Mock fs.createWriteStream to avoid deferred-open ENOENT issues with temp dirs
vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    default: {
      ...actual,
      createWriteStream: (...args: unknown[]) => {
        const stream = { end: vi.fn(), write: vi.fn(), destroyed: false, closed: false, on: vi.fn() };
        return stream;
      },
    },
  };
});

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "log-rotator-test-"));
  createdStreams = [];
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function logPath(): string {
  return path.join(tmpDir, "test.log");
}

function writeBytes(filePath: string, size: number): void {
  const chunk = "x".repeat(Math.min(size, 65_536));
  let remaining = size;
  const fd = fs.openSync(filePath, "w");
  while (remaining > 0) {
    const toWrite = Math.min(remaining, chunk.length);
    fs.writeFileSync(fd, chunk.slice(0, toWrite));
    remaining -= toWrite;
  }
  fs.closeSync(fd);
}

describe("rotateLogIfNeeded", () => {
  it("returns currentStream when log file does not exist", () => {
    const result = rotateLogIfNeeded(path.join(tmpDir, "nonexistent.log"), null);
    expect(result).toBeNull();
  });

  it("returns currentStream when passed a non-null stream but no file", () => {
    const mockStream = { end: vi.fn() } as unknown as fs.WriteStream;
    const result = rotateLogIfNeeded(path.join(tmpDir, "nonexistent.log"), mockStream);
    expect(result).toBe(mockStream);
  });

  it("returns currentStream when log file is under the size limit", () => {
    const lp = logPath();
    writeBytes(lp, 100);
    const result = rotateLogIfNeeded(lp, null);
    expect(result).toBeNull();
  });

  it("rotates log to .1 when over the size limit", () => {
    const lp = logPath();
    writeBytes(lp, MAX_LOG_BYTES);

    const result = rotateLogIfNeeded(lp, null);

    // A new stream is returned (from mock)
    expect(result).not.toBeNull();
    expect(fs.existsSync(`${lp}.1`)).toBe(true);
  });

  it("rotates .1 → .2, .2 → .3 on second rotation", () => {
    const lp = logPath();

    // First rotation: create .1
    writeBytes(lp, MAX_LOG_BYTES);
    rotateLogIfNeeded(lp, null);

    // Write again to trigger second rotation
    writeBytes(lp, MAX_LOG_BYTES);
    rotateLogIfNeeded(lp, null);

    // The .1 from the first rotation should now be .2
    expect(fs.existsSync(`${lp}.1`)).toBe(true);
    expect(fs.existsSync(`${lp}.2`)).toBe(true);
  });

  it("deletes .3 (MAX_LOG_GENERATIONS) when exceeded", () => {
    const lp = logPath();

    // Perform enough rotations to create .3
    for (let i = 0; i < 3; i++) {
      writeBytes(lp, MAX_LOG_BYTES);
      rotateLogIfNeeded(lp, null);
    }

    expect(fs.existsSync(`${lp}.1`)).toBe(true);
    expect(fs.existsSync(`${lp}.2`)).toBe(true);
    expect(fs.existsSync(`${lp}.3`)).toBe(true);

    // Fourth rotation should delete .3 (the oldest) before renaming .2 → .3
    writeBytes(lp, MAX_LOG_BYTES);
    rotateLogIfNeeded(lp, null);

    // Still have .1, .2, .3 but .3 is the previous .2
    expect(fs.existsSync(`${lp}.1`)).toBe(true);
    expect(fs.existsSync(`${lp}.2`)).toBe(true);
    expect(fs.existsSync(`${lp}.3`)).toBe(true);
  });

  it("returns a new WriteStream after rotation", () => {
    const lp = logPath();
    writeBytes(lp, MAX_LOG_BYTES);

    const result = rotateLogIfNeeded(lp, null);

    expect(result).not.toBeNull();
    expect(typeof (result as fs.WriteStream).write).toBe("function");
  });

  it("ends the current stream before rotation", () => {
    const lp = logPath();
    writeBytes(lp, MAX_LOG_BYTES);

    const mockEnd = vi.fn();
    const mockStream = { end: mockEnd } as unknown as fs.WriteStream;

    rotateLogIfNeeded(lp, mockStream);

    expect(mockEnd).toHaveBeenCalledTimes(1);
  });

  it("skips missing generation files during rotation", () => {
    const lp = logPath();

    // Create .1 and .2
    writeBytes(lp, MAX_LOG_BYTES);
    rotateLogIfNeeded(lp, null);
    writeBytes(lp, MAX_LOG_BYTES);
    rotateLogIfNeeded(lp, null);

    // Delete .1 to test skip
    fs.unlinkSync(`${lp}.1`);

    // Trigger another rotation
    writeBytes(lp, MAX_LOG_BYTES);
    rotateLogIfNeeded(lp, null);

    // .2 should become .3, .1 should exist from the latest rotation
    expect(fs.existsSync(`${lp}.1`)).toBe(true);
    expect(fs.existsSync(`${lp}.2`)).toBe(false);
    expect(fs.existsSync(`${lp}.3`)).toBe(true);
  });

  it("does not end stream when under size limit", () => {
    const lp = logPath();
    writeBytes(lp, 100);

    const mockEnd = vi.fn();
    const mockStream = { end: mockEnd } as unknown as fs.WriteStream;

    rotateLogIfNeeded(lp, mockStream);

    expect(mockEnd).not.toHaveBeenCalled();
  });
});
