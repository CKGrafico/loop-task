import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { IncrementalFileWatcher } from "../src/core/logging/bounded-log-reader.js";
import { followLogFile } from "../src/core/logging/log-follower.js";
import { clampLine, clampLines, appendClamped } from "../src/shared/utils/log-lines.js";
import { childEnv } from "../src/core/command/command-runner.js";

let tmpDir: string;
let watchers: IncrementalFileWatcher[];

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "log-streaming-test-"));
  watchers = [];
});

afterEach(() => {
  for (const w of watchers) {
    try { w.close(); } catch { /* */ }
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitFor(cond: () => boolean, timeoutMs = 5000, stepMs = 20): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!cond()) {
    if (Date.now() > deadline) throw new Error("timed out waiting for condition");
    await sleep(stepMs);
  }
}

describe("IncrementalFileWatcher rotation survival", () => {
  it("keeps streaming after the file is rotated (rename + recreate)", async () => {
    const logPath = path.join(tmpDir, "loop.log");
    fs.writeFileSync(logPath, "");

    const received: string[] = [];
    const watcher = new IncrementalFileWatcher({
      logPath,
      initialOffset: 0,
      reattachDelayMs: 10,
      onLines: (lines) => received.push(...lines),
      onEnd: () => {},
      onError: () => {},
    });
    watchers.push(watcher);
    watcher.start();

    fs.appendFileSync(logPath, "before-1\nbefore-2\n");
    await waitFor(() => received.length >= 2);

    fs.renameSync(logPath, `${logPath}.1`);
    fs.writeFileSync(logPath, "");

    await sleep(50);
    fs.appendFileSync(logPath, "after-1\nafter-2\n");

    await waitFor(() => received.includes("after-2"));
    expect(received).toContain("before-1");
    expect(received).toContain("after-1");
    expect(received).toContain("after-2");
  });

  it("survives a transient ENOENT window during rotation", async () => {
    const logPath = path.join(tmpDir, "loop.log");
    fs.writeFileSync(logPath, "");

    const received: string[] = [];
    let ended = false;
    const watcher = new IncrementalFileWatcher({
      logPath,
      initialOffset: 0,
      reattachDelayMs: 10,
      onLines: (lines) => received.push(...lines),
      onEnd: () => { ended = true; },
      onError: () => {},
    });
    watchers.push(watcher);
    watcher.start();

    fs.rmSync(logPath);
    await sleep(30);
    fs.writeFileSync(logPath, "recovered\n");

    await waitFor(() => received.includes("recovered"));
    expect(ended).toBe(false);
  });

  it("ends the stream once the file stays deleted past the grace period", async () => {
    const logPath = path.join(tmpDir, "loop.log");
    fs.writeFileSync(logPath, "");

    let ended = false;
    const watcher = new IncrementalFileWatcher({
      logPath,
      initialOffset: 0,
      reattachDelayMs: 5,
      maxReattachAttempts: 3,
      onLines: () => {},
      onEnd: () => { ended = true; },
      onError: () => {},
    });
    watchers.push(watcher);
    watcher.start();

    fs.rmSync(logPath);
    await waitFor(() => ended);
  });

  it("recovers every generation when multiple rotations happen while blind", async () => {
    const logPath = path.join(tmpDir, "loop.log");
    fs.writeFileSync(logPath, "");

    const received: string[] = [];
    const watcher = new IncrementalFileWatcher({
      logPath,
      initialOffset: 0,
      reattachDelayMs: 10,
      onLines: (lines) => received.push(...lines),
      onEnd: () => {},
      onError: () => {},
    });
    watchers.push(watcher);
    watcher.start();

    fs.appendFileSync(logPath, "gen1-a\ngen1-b\n");
    await waitFor(() => received.length >= 2);

    watcher.pause();
    fs.renameSync(logPath, `${logPath}.1`);
    fs.writeFileSync(logPath, "gen2-a\ngen2-b\n");
    fs.renameSync(`${logPath}.1`, `${logPath}.2`);
    fs.renameSync(logPath, `${logPath}.1`);
    fs.writeFileSync(logPath, "gen3-a\n");
    watcher.resume();

    await waitFor(() => received.includes("gen3-a"));
    expect(received).toEqual(["gen1-a", "gen1-b", "gen2-a", "gen2-b", "gen3-a"]);
  });

  it("does not read while paused and catches up on resume", async () => {
    const logPath = path.join(tmpDir, "loop.log");
    fs.writeFileSync(logPath, "");

    const received: string[] = [];
    const watcher = new IncrementalFileWatcher({
      logPath,
      initialOffset: 0,
      onLines: (lines) => received.push(...lines),
      onEnd: () => {},
      onError: () => {},
    });
    watchers.push(watcher);
    watcher.start();

    watcher.pause();
    fs.appendFileSync(logPath, "while-paused-1\nwhile-paused-2\n");
    await sleep(200);
    expect(received).toHaveLength(0);

    watcher.resume();
    await waitFor(() => received.length >= 2);
    expect(received).toEqual(["while-paused-1", "while-paused-2"]);
  });
});

describe("followLogFile backpressure", () => {
  it("stops reading when the destination buffer is full and resumes on drain", async () => {
    const logPath = path.join(tmpDir, "loop.log");
    fs.writeFileSync(logPath, "");

    const written: string[] = [];
    let drainListener: (() => void) | null = null;
    const dest = {
      write(chunk: string): boolean {
        written.push(chunk);
        return false;
      },
      once(_event: "drain", listener: () => void): void {
        drainListener = listener;
      },
    };

    const watcher = followLogFile({
      logPath,
      initialOffset: 0,
      dest,
      formatLine: (line) => line + "|",
      onEnd: () => {},
      onError: () => {},
    });
    watchers.push(watcher);

    fs.appendFileSync(logPath, "a\nb\n");
    await waitFor(() => written.length >= 2);

    const before = written.length;
    fs.appendFileSync(logPath, "c\nd\n");
    await sleep(300);
    expect(written.length).toBe(before);

    expect(drainListener).not.toBeNull();
    drainListener!();
    await waitFor(() => written.includes("c|") && written.includes("d|"));
  });

  it("delivers every line to a fast destination", async () => {
    const logPath = path.join(tmpDir, "loop.log");
    fs.writeFileSync(logPath, "");

    const written: string[] = [];
    const dest = {
      write(chunk: string): boolean {
        written.push(chunk);
        return true;
      },
      once(): void {},
    };

    const watcher = followLogFile({
      logPath,
      initialOffset: 0,
      dest,
      formatLine: (line) => line,
      onEnd: () => {},
      onError: () => {},
    });
    watchers.push(watcher);

    for (let i = 0; i < 20; i++) {
      fs.appendFileSync(logPath, `line-${i}\n`);
    }
    await waitFor(() => written.length >= 20);
    expect(written).toContain("line-0");
    expect(written).toContain("line-19");
  });
});

describe("log line clamping", () => {
  it("clampLine truncates oversized lines", () => {
    const line = "x".repeat(20_000);
    const clamped = clampLine(line, 100);
    expect(clamped.length).toBeLessThan(200);
    expect(clamped).toContain("truncated");
  });

  it("clampLine leaves normal lines untouched", () => {
    expect(clampLine("hello", 100)).toBe("hello");
  });

  it("clampLines keeps only the newest maxCount lines", () => {
    const lines = Array.from({ length: 100 }, (_, i) => `l${i}`);
    const clamped = clampLines(lines, 10);
    expect(clamped).toHaveLength(10);
    expect(clamped[0]).toBe("l90");
    expect(clamped[9]).toBe("l99");
  });

  it("appendClamped bounds the array length", () => {
    let lines: string[] = [];
    for (let i = 0; i < 50; i++) {
      lines = appendClamped(lines, `l${i}`, 10);
    }
    expect(lines).toHaveLength(10);
    expect(lines[9]).toBe("l49");
  });
});

describe("childEnv NODE_ENV scrubbing", () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    saved.NODE_ENV = process.env.NODE_ENV;
    saved.LOOP_TASK_DEFAULTED_NODE_ENV = process.env.LOOP_TASK_DEFAULTED_NODE_ENV;
  });

  afterEach(() => {
    for (const key of ["NODE_ENV", "LOOP_TASK_DEFAULTED_NODE_ENV"] as const) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  it("passes the environment through when NODE_ENV was set by the user", () => {
    delete process.env.LOOP_TASK_DEFAULTED_NODE_ENV;
    process.env.NODE_ENV = "test";
    const env = childEnv();
    expect(env.NODE_ENV).toBe("test");
  });

  it("removes an injected NODE_ENV so child commands see the original environment", () => {
    process.env.NODE_ENV = "production";
    process.env.LOOP_TASK_DEFAULTED_NODE_ENV = "1";
    const env = childEnv();
    expect(env.NODE_ENV).toBeUndefined();
    expect(env.LOOP_TASK_DEFAULTED_NODE_ENV).toBeUndefined();
    expect(process.env.NODE_ENV).toBe("production");
  });
});
