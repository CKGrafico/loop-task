import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { StdoutCaptureTransform } from "../src/core/command/stdout-capture-transform.js";
import { RotatingWriteStream } from "../src/core/logging/rotating-log-stream.js";
import { tailFileBounded, readByteRange, readIncremental, IncrementalFileWatcher } from "../src/core/logging/bounded-log-reader.js";
import { collectDiagnostics } from "../src/daemon/diagnostics.js";
import type { LoopManager } from "../src/daemon/managers/loop-manager.js";

let tmpDir: string;
let watchers: IncrementalFileWatcher[];

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "memory-fix-test-"));
  watchers = [];
});

afterEach(() => {
  for (const w of watchers) {
    try { w.close(); } catch { /* */ }
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("StdoutCaptureTransform", () => {
  it("captures output within byte limit", () => {
    const transform = new StdoutCaptureTransform(100);
    transform.write(Buffer.from("hello"));
    transform.end();
    expect(transform.getCaptured()).toBe("hello");
    expect(transform.isTruncated()).toBe(false);
  });

  it("truncates output when exceeding byte limit", () => {
    const transform = new StdoutCaptureTransform(10);
    transform.write(Buffer.from("0123456789"));
    transform.write(Buffer.from("more data"));
    transform.end();
    expect(transform.getCaptured().length).toBeLessThanOrEqual(10);
    expect(transform.isTruncated()).toBe(true);
  });

  it("uses byte-safe truncation for multibyte UTF-8", () => {
    const transform = new StdoutCaptureTransform(5);
    const multibyte = "a\u00e9\u00e9";
    transform.write(Buffer.from(multibyte, "utf-8"));
    transform.end();
    const captured = transform.getCaptured();
    expect(Buffer.byteLength(captured, "utf-8")).toBeLessThanOrEqual(5);
  });

  it("extracts KEY=VALUE pairs incrementally", () => {
    const transform = new StdoutCaptureTransform(1024);
    transform.write(Buffer.from("FOO=bar\nBAZ=qux\n"));
    transform.end();
    const kv = transform.getKvPairs();
    expect(kv.FOO).toBe("bar");
    expect(kv.BAZ).toBe("qux");
  });

  it("handles partial lines across chunks", () => {
    const transform = new StdoutCaptureTransform(1024);
    transform.write(Buffer.from("FOO=bar"));
    transform.write(Buffer.from("\nBAZ=qux\n"));
    transform.end();
    const kv = transform.getKvPairs();
    expect(kv.FOO).toBe("bar");
    expect(kv.BAZ).toBe("qux");
  });

  it("forwards all data through the stream", () => {
    const transform = new StdoutCaptureTransform(1024);
    const chunks: Buffer[] = [];
    transform.on("data", (chunk: Buffer) => chunks.push(chunk));
    transform.write(Buffer.from("hello world\n"));
    transform.end();
    const forwarded = Buffer.concat(chunks).toString();
    expect(forwarded).toBe("hello world\n");
  });

  it("does not retain unbounded memory for output beyond limit", () => {
    const transform = new StdoutCaptureTransform(100);
    const chunks: Buffer[] = [];
    transform.on("data", (chunk: Buffer) => chunks.push(chunk));

    const iterations = 100;
    for (let i = 0; i < iterations; i++) {
      transform.write(Buffer.from("x".repeat(1024) + "\n"));
    }
    transform.end();

    const allForwarded = Buffer.concat(chunks).toString();
    const lineCount = allForwarded.split("\n").filter(Boolean).length;
    expect(lineCount).toBe(iterations);
    expect(transform.isTruncated()).toBe(true);
    expect(Buffer.byteLength(transform.getCaptured(), "utf-8")).toBeLessThanOrEqual(100);
  });
});

describe("RotatingWriteStream", () => {
  it("writes data to file", async () => {
    const filePath = path.join(tmpDir, "rotating.log");
    fs.writeFileSync(filePath, "");
    const stream = RotatingWriteStream.create(filePath, 1024, 3);
    stream.write("hello");
    stream.end();
    await new Promise<void>((resolve) => { stream.on("finish", resolve); });
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toBe("hello");
  });

  it("tracks bytesWritten", () => {
    const filePath = path.join(tmpDir, "rotating.log");
    fs.writeFileSync(filePath, "");
    const stream = RotatingWriteStream.create(filePath, 1024, 3);
    stream.write("hello");
    expect(stream.bytesWritten).toBe(5);
    stream.end();
  });

  it("rotates when exceeding max bytes", async () => {
    const filePath = path.join(tmpDir, "rotating.log");
    fs.writeFileSync(filePath, "");
    const stream = RotatingWriteStream.create(filePath, 20, 3);
    stream.write("012345678901234567890123456789");
    expect(stream.rotateIfNeeded()).toBe(true);
    stream.end();
    await new Promise<void>((resolve) => { stream.on("finish", resolve); });
    expect(fs.existsSync(`${filePath}.1`)).toBe(true);
  });

  it("does not rotate when under max bytes", () => {
    const filePath = path.join(tmpDir, "rotating.log");
    fs.writeFileSync(filePath, "");
    const stream = RotatingWriteStream.create(filePath, 1024, 3);
    stream.write("hello");
    expect(stream.rotateIfNeeded()).toBe(false);
    stream.end();
  });

  it("respects backpressure from inner stream", async () => {
    const filePath = path.join(tmpDir, "backpressure.log");
    fs.writeFileSync(filePath, "");
    const maxBytes = 1024 * 1024;
    const stream = RotatingWriteStream.create(filePath, maxBytes, 3);

    for (let i = 0; i < 10; i++) {
      stream.write(Buffer.alloc(1024, "x"));
    }
    stream.end();

    await new Promise<void>((resolve) => {
      stream.on("finish", resolve);
    });

    const stat = fs.statSync(filePath);
    expect(stat.size).toBe(10 * 1024);
  });

  it("auto-rotates during writes when exceeding limit", async () => {
    const filePath = path.join(tmpDir, "auto-rotate.log");
    fs.writeFileSync(filePath, "");
    const stream = RotatingWriteStream.create(filePath, 50, 3);

    for (let i = 0; i < 10; i++) {
      stream.write(Buffer.alloc(20, "x"));
    }
    stream.end();

    await new Promise<void>((resolve) => { stream.on("finish", resolve); });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(fs.existsSync(`${filePath}.1`)).toBe(true);
  });
});

describe("tailFileBounded", () => {
  it("returns last N lines from a file", () => {
    const filePath = path.join(tmpDir, "tail.log");
    fs.writeFileSync(filePath, "line1\nline2\nline3\nline4\nline5\n");
    const lines = tailFileBounded(filePath, 3);
    expect(lines).toEqual(["line3", "line4", "line5"]);
  });

  it("returns all lines if file is small and count is 0", () => {
    const filePath = path.join(tmpDir, "tail.log");
    fs.writeFileSync(filePath, "a\nb\n");
    const lines = tailFileBounded(filePath, 0);
    expect(lines).toEqual(["a", "b"]);
  });

  it("returns empty array for nonexistent file", () => {
    const lines = tailFileBounded(path.join(tmpDir, "nonexistent.log"), 10);
    expect(lines).toEqual([]);
  });

  it("uses bounded tail window for large files", () => {
    const filePath = path.join(tmpDir, "large.log");
    const lineCount = 10000;
    const lines = Array.from({ length: lineCount }, (_, i) => `line${i}`);
    fs.writeFileSync(filePath, lines.join("\n") + "\n");
    const result = tailFileBounded(filePath, 5, 1024);
    expect(result.length).toBe(5);
    expect(result[result.length - 1]).toBe(`line${lineCount - 1}`);
  });
});

describe("readByteRange", () => {
  it("reads a byte range from a file", () => {
    const filePath = path.join(tmpDir, "range.log");
    fs.writeFileSync(filePath, "0123456789");
    const content = readByteRange(filePath, 3, 7);
    expect(content).toBe("3456");
  });

  it("reads to end if end is undefined", () => {
    const filePath = path.join(tmpDir, "range.log");
    fs.writeFileSync(filePath, "0123456789");
    const content = readByteRange(filePath, 5, undefined);
    expect(content).toBe("56789");
  });

  it("returns empty string for nonexistent file", () => {
    const content = readByteRange(path.join(tmpDir, "nonexistent.log"), 0, 10);
    expect(content).toBe("");
  });
});

describe("readIncremental", () => {
  it("reads new data from an offset", () => {
    const filePath = path.join(tmpDir, "incremental.log");
    fs.writeFileSync(filePath, "line1\nline2\nline3\n");
    const result = readIncremental(filePath, 0);
    expect(result.lines).toEqual(["line1", "line2", "line3"]);
    expect(result.newOffset).toBe(18);
  });

  it("returns empty when no new data", () => {
    const filePath = path.join(tmpDir, "incremental.log");
    fs.writeFileSync(filePath, "hello");
    const result = readIncremental(filePath, 5);
    expect(result.lines).toEqual([]);
    expect(result.newOffset).toBe(5);
  });

  it("reads incrementally in chunks for data larger than highWaterMark", () => {
    const filePath = path.join(tmpDir, "large-incremental.log");
    const chunkSize = 64 * 1024;
    const totalSize = chunkSize * 3;
    const data = Buffer.alloc(totalSize, 0x41);
    fs.writeFileSync(filePath, data);
    const result = readIncremental(filePath, 0, chunkSize);
    expect(result.lines.length).toBeGreaterThan(0);
    expect(result.newOffset).toBe(totalSize);
  });

  it("reads incrementally from mid-file offset", () => {
    const filePath = path.join(tmpDir, "partial-incremental.log");
    fs.writeFileSync(filePath, "line1\nline2\nline3\nline4\n");
    const result = readIncremental(filePath, 6);
    expect(result.lines).toContain("line2");
    expect(result.newOffset).toBeGreaterThan(6);
  });
});

describe("IncrementalFileWatcher", () => {
  it("watches for file changes and emits lines", async () => {
    const filePath = path.join(tmpDir, "watch.log");
    fs.writeFileSync(filePath, "existing\n");

    const receivedLines: string[] = [];
    const watcher = new IncrementalFileWatcher({
      logPath: filePath,
      initialOffset: fs.statSync(filePath).size,
      onLines: (lines) => receivedLines.push(...lines),
      onEnd: () => {},
      onError: () => {},
    });
    watchers.push(watcher);

    watcher.start();

    await new Promise((resolve) => setTimeout(resolve, 100));
    fs.appendFileSync(filePath, "new line\n");
    await new Promise((resolve) => setTimeout(resolve, 300));

    watcher.close();
    expect(receivedLines).toContain("new line");
  });

  it("closes cleanly when file is deleted", async () => {
    const filePath = path.join(tmpDir, "watch-del.log");
    fs.writeFileSync(filePath, "data\n");

    const watcher = new IncrementalFileWatcher({
      logPath: filePath,
      initialOffset: 0,
      onLines: () => {},
      onEnd: () => {},
      onError: () => {},
    });
    watchers.push(watcher);

    watcher.start();
    await new Promise((resolve) => setTimeout(resolve, 200));
    fs.unlinkSync(filePath);
    await new Promise((resolve) => setTimeout(resolve, 800));

    watcher.close();
  });

  it("resets offset when file is truncated (rotation)", async () => {
    const filePath = path.join(tmpDir, "watch-truncate.log");
    const original = "old data that is quite long to ensure offset\n";
    fs.writeFileSync(filePath, original);

    const receivedLines: string[] = [];
    const watcher = new IncrementalFileWatcher({
      logPath: filePath,
      initialOffset: fs.statSync(filePath).size,
      onLines: (lines) => receivedLines.push(...lines),
      onEnd: () => {},
      onError: () => {},
    });
    watchers.push(watcher);

    watcher.start();
    await new Promise((resolve) => setTimeout(resolve, 150));

    fs.writeFileSync(filePath, "new line after truncation\n");
    await new Promise((resolve) => setTimeout(resolve, 500));

    watcher.close();
    expect(receivedLines.length).toBeGreaterThanOrEqual(1);
    expect(receivedLines).toContain("new line after truncation");
  });
});

describe("collectDiagnostics", () => {
  it("returns process memory metrics", () => {
    const mockManager = {
      list: () => [],
    } as unknown as LoopManager;
    const diag = collectDiagnostics(mockManager);
    expect(diag.process.rss).toBeGreaterThan(0);
    expect(diag.process.heapUsed).toBeGreaterThan(0);
    expect(diag.process.heapTotal).toBeGreaterThan(0);
    expect(diag.loops.total).toBe(0);
    expect(diag.timestamp).toBeTruthy();
  });

  it("returns extended metrics when enabled", () => {
    const mockManager = {
      list: () => [],
    } as unknown as LoopManager;
    const diag = collectDiagnostics(mockManager, true);
    expect(diag.extended).toBeDefined();
    expect(diag.extended!.eventListenerCounts).toBeDefined();
    expect(diag.extended!.activeChildPids).toBeDefined();
  });

  it("does not return extended metrics when not enabled", () => {
    const mockManager = {
      list: () => [],
    } as unknown as LoopManager;
    const diag = collectDiagnostics(mockManager, false);
    expect(diag.extended).toBeUndefined();
  });
});

describe("Backpressure regression", () => {
  it("RotatingWriteStream does not lose data under fast writes", async () => {
    const filePath = path.join(tmpDir, "fast-write.log");
    fs.writeFileSync(filePath, "");
    const maxBytes = 1024 * 1024;
    const stream = RotatingWriteStream.create(filePath, maxBytes, 3);

    const totalWrites = 100;
    const dataPerWrite = "x".repeat(1024) + "\n";

    for (let i = 0; i < totalWrites; i++) {
      stream.write(dataPerWrite);
    }
    stream.end();

    await new Promise<void>((resolve) => {
      stream.on("finish", resolve);
    });

    const content = fs.readFileSync(filePath, "utf-8");
    const lineCount = content.split("\n").filter(Boolean).length;
    expect(lineCount).toBe(totalWrites);
  });

  it("StdoutCaptureTransform passes through data even after capture limit", () => {
    const transform = new StdoutCaptureTransform(50);
    const chunks: Buffer[] = [];
    transform.on("data", (chunk: Buffer) => chunks.push(chunk));

    for (let i = 0; i < 10; i++) {
      transform.write(Buffer.from("x".repeat(100) + "\n"));
    }
    transform.end();

    const forwarded = Buffer.concat(chunks).toString();
    const lines = forwarded.split("\n").filter(Boolean);
    expect(lines.length).toBe(10);
  });
});

describe("Memory-bounded reading regression", () => {
  it("readIncremental uses bounded chunks for large data", () => {
    const filePath = path.join(tmpDir, "large-inc.log");
    const lineCount = 10000;
    const lines = Array.from({ length: lineCount }, (_, i) => `line${i}`);
    fs.writeFileSync(filePath, lines.join("\n") + "\n");

    const result = readIncremental(filePath, 0, 64 * 1024);
    expect(result.lines.length).toBeGreaterThan(0);
    expect(result.newOffset).toBeGreaterThan(0);
  });

  it("tailFileBounded does not load entire large file", () => {
    const filePath = path.join(tmpDir, "huge-tail.log");
    const lineCount = 50000;
    const lines = Array.from({ length: lineCount }, (_, i) => `line${i}`);
    fs.writeFileSync(filePath, lines.join("\n") + "\n");

    const result = tailFileBounded(filePath, 5, 1024);
    expect(result.length).toBe(5);
    expect(result[result.length - 1]).toBe(`line${lineCount - 1}`);
  });
});
