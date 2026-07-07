import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("clipboard", () => {
  let originalEnv: NodeJS.ProcessEnv;
  let originalStdout: typeof process.stdout;

  beforeEach(() => {
    originalEnv = { ...process.env };
    originalStdout = process.stdout;
    delete process.env.TMUX;
  });

  afterEach(() => {
    process.env = originalEnv;
    Object.defineProperty(process, "stdout", {
      configurable: true,
      value: originalStdout,
    });
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("copyToClipboard never throws on Linux without xclip/xsel — falls back to OSC 52", async () => {
    vi.resetModules();
    vi.doMock("node:os", () => ({ platform: () => "linux" }));
    vi.doMock("node:child_process", () => ({
      execFileSync: vi.fn(() => {
        throw new Error("spawn xclip ENOENT");
      }),
    }));
    const stdoutWrite = vi.fn();
    Object.defineProperty(process, "stdout", {
      configurable: true,
      value: { write: stdoutWrite, isTTY: false },
    });

    const { copyToClipboard } = await import("../src/shared/clipboard.js");
    let result: boolean | undefined;
    let threw = false;
    try {
      result = copyToClipboard("hello");
    } catch {
      threw = true;
    }
    // Must never throw — this is the regression that crashed modals over SSH.
    expect(threw).toBe(false);
    expect(result).toBe(true);
    // OSC 52 fallback should have written a \x1b]52;c;<base64>\x07 escape.
    expect(stdoutWrite).toHaveBeenCalled();
    const written: string = stdoutWrite.mock.calls[0]?.[0] ?? "";
    expect(written.startsWith("\x1b]52;c;")).toBe(true);
    expect(written.endsWith("\x07")).toBe(true);
  });

  it("copyToClipboard returns false when stdout.write throws (no terminal)", async () => {
    vi.resetModules();
    vi.doMock("node:os", () => ({ platform: () => "linux" }));
    vi.doMock("node:child_process", () => ({
      execFileSync: vi.fn(() => {
        throw new Error("spawn ENOENT");
      }),
    }));
    Object.defineProperty(process, "stdout", {
      configurable: true,
      value: {
        write: () => {
          throw new Error("EPIPE");
        },
        isTTY: false,
      },
    });

    const { copyToClipboard } = await import("../src/shared/clipboard.js");
    let result: boolean | undefined;
    let threw = false;
    try {
      result = copyToClipboard("hello");
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
    expect(result).toBe(false);
  });

  it("copyToClipboard returns true on Linux when xclip is available", async () => {
    vi.resetModules();
    const execFileSyncMock = vi.fn(() => undefined);
    vi.doMock("node:os", () => ({ platform: () => "linux" }));
    vi.doMock("node:child_process", () => ({ execFileSync: execFileSyncMock }));
    Object.defineProperty(process, "stdout", {
      configurable: true,
      value: { write: vi.fn(), isTTY: false },
    });

    const { copyToClipboard } = await import("../src/shared/clipboard.js");
    const result = copyToClipboard("hello");
    expect(result).toBe(true);
    expect(execFileSyncMock).toHaveBeenCalledWith(
      "xclip",
      ["-selection", "clipboard"],
      { input: "hello" },
    );
  });

  it("copyToClipboard falls back to xsel when xclip throws", async () => {
    vi.resetModules();
    const execFileSyncMock = vi
      .fn(() => {
        throw new Error("xclip ENOENT");
      })
      .mockImplementationOnce(() => {
        throw new Error("xclip ENOENT");
      })
      .mockImplementationOnce(() => undefined);
    vi.doMock("node:os", () => ({ platform: () => "linux" }));
    vi.doMock("node:child_process", () => ({ execFileSync: execFileSyncMock }));
    Object.defineProperty(process, "stdout", {
      configurable: true,
      value: { write: vi.fn(), isTTY: false },
    });

    const { copyToClipboard } = await import("../src/shared/clipboard.js");
    const result = copyToClipboard("hello");
    expect(result).toBe(true);
    // xclip attempted first, then xsel
    expect(execFileSyncMock).toHaveBeenNthCalledWith(
      1,
      "xclip",
      ["-selection", "clipboard"],
      { input: "hello" },
    );
    expect(execFileSyncMock).toHaveBeenNthCalledWith(
      2,
      "xsel",
      ["--clipboard", "--input"],
      { input: "hello" },
    );
  });

  it("readFromClipboard returns '' on Linux without tools (no throw)", async () => {
    vi.resetModules();
    vi.doMock("node:os", () => ({ platform: () => "linux" }));
    vi.doMock("node:child_process", () => ({
      execFileSync: vi.fn(() => {
        throw new Error("spawn ENOENT");
      }),
    }));

    const { readFromClipboard } = await import("../src/shared/clipboard.js");
    let result = "<sentinel>";
    let threw = false;
    try {
      result = readFromClipboard();
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
    expect(result).toBe("");
  });

  it("copyToClipboard on macOS uses pbcopy", async () => {
    vi.resetModules();
    const execFileSyncMock = vi.fn(() => undefined);
    vi.doMock("node:os", () => ({ platform: () => "darwin" }));
    vi.doMock("node:child_process", () => ({ execFileSync: execFileSyncMock }));

    const { copyToClipboard } = await import("../src/shared/clipboard.js");
    const result = copyToClipboard("hello");
    expect(result).toBe(true);
    expect(execFileSyncMock).toHaveBeenCalledWith("pbcopy", { input: "hello" });
  });
});