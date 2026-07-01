import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IpcRequest, IpcResponse, LoopOptions } from "../src/types.js";
import { PROJECT_COLORS } from "../src/config/constants.js";

// ── Mock ipc module (relative to commands.ts which imports "./ipc.js") ──
// Since commands.ts does `import { sendRequest, streamRequest } from "./ipc.js"`,
// we mock the module at the path the test file would import it from.
vi.mock("../src/client/ipc.js", () => ({
  sendRequest: vi.fn(),
  streamRequest: vi.fn(),
}));

// ── Import after mocks are registered ───────────────────────────────────
import { sendRequest, streamRequest } from "../src/client/ipc.js";
import {
  resolveColor,
  createBackgroundLoop,
  listLoops,
  showStatus,
  pauseLoop,
  resumeLoop,
  deleteLoop,
  resolveProjectId,
  startLoop,
  viewLogs,
  attachLoop,
  listProjectsCli,
  createProjectCli,
  renameProjectCli,
  setProjectColorCli,
  deleteProjectCli,
} from "../src/client/commands.js";

// ── Helpers ─────────────────────────────────────────────────────────────

const mockedSendRequest = vi.mocked(sendRequest);
const mockedStreamRequest = vi.mocked(streamRequest);

let processExitSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  processExitSpy = vi
    .spyOn(process, "exit")
    .mockImplementation((() => {
      throw new Error("process.exit");
    }) as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Minimal valid LoopOptions for tests. */
function makeLoopOptions(overrides?: Partial<LoopOptions>): LoopOptions {
  return {
    interval: 1000,
    taskId: null,
    command: "echo",
    commandArgs: ["hello"],
    cwd: "/tmp",
    immediate: false,
    maxRuns: null,
    verbose: false,
    description: "",
    projectId: "default",
    offset: null,
    ...overrides,
  };
}

// ── resolveColor ────────────────────────────────────────────────────────

describe("resolveColor", () => {
  it("resolves a known color name to its hex value", () => {
    for (const [name, hex] of Object.entries(PROJECT_COLORS)) {
      expect(resolveColor(name)).toBe(hex);
    }
  });

  it("resolves cyan to its hex value", () => {
    expect(resolveColor("cyan")).toBe("#06b6d4");
  });

  it("resolves green to its hex value", () => {
    expect(resolveColor("green")).toBe("#4ade80");
  });

  it("returns a valid #hex string unchanged", () => {
    expect(resolveColor("#abcdef")).toBe("#abcdef");
  });

  it("returns uppercase hex unchanged", () => {
    expect(resolveColor("#ABCDEF")).toBe("#ABCDEF");
  });

  it("accepts mixed-case hex", () => {
    expect(resolveColor("#aAbBcC")).toBe("#aAbBcC");
  });

  it("throws for an unknown color name", () => {
    expect(() => resolveColor("notacolor")).toThrow();
  });

  it("throws for an invalid hex string", () => {
    expect(() => resolveColor("#xyz")).toThrow();
  });

  it("throws for hex without # prefix", () => {
    expect(() => resolveColor("abcdef")).toThrow();
  });

  it("throws for short hex like #fff", () => {
    expect(() => resolveColor("#fff")).toThrow();
  });

  it("throws for 5-digit hex", () => {
    expect(() => resolveColor("#abcde")).toThrow();
  });

  it("includes valid color names in the error message", () => {
    try {
      resolveColor("notacolor");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      const message = (err as Error).message;
      // Should list the valid color names
      expect(message).toContain("cyan");
      expect(message).toContain("notacolor");
    }
  });
});

// ── createBackgroundLoop ────────────────────────────────────────────────

describe("createBackgroundLoop", () => {
  it("sends a start request and returns the id", async () => {
    const options = makeLoopOptions();
    const okResponse: IpcResponse = {
      type: "ok",
      data: { id: "abc12345" },
    };
    mockedSendRequest.mockResolvedValue(okResponse);

    const id = await createBackgroundLoop(options, "1s");

    expect(id).toBe("abc12345");
    expect(mockedSendRequest).toHaveBeenCalledOnce();
    const sentRequest = mockedSendRequest.mock.calls[0][0] as IpcRequest;
    expect(sentRequest.type).toBe("start");
    expect((sentRequest as { payload: { intervalHuman: string } }).payload.intervalHuman).toBe("1s");
  });

  it("includes loop options in the payload", async () => {
    const options = makeLoopOptions({ command: "npm", commandArgs: ["test"], interval: 5000 });
    const okResponse: IpcResponse = { type: "ok", data: { id: "def99999" } };
    mockedSendRequest.mockResolvedValue(okResponse);

    await createBackgroundLoop(options, "5s");

    const sentRequest = mockedSendRequest.mock.calls[0][0] as IpcRequest & {
      payload: LoopOptions & { intervalHuman: string };
    };
    expect(sentRequest.payload.command).toBe("npm");
    expect(sentRequest.payload.commandArgs).toEqual(["test"]);
    expect(sentRequest.payload.interval).toBe(5000);
  });

  it("throws on error response", async () => {
    const errorResponse: IpcResponse = {
      type: "error",
      message: "daemon is busy",
    };
    mockedSendRequest.mockResolvedValue(errorResponse);

    await expect(
      createBackgroundLoop(makeLoopOptions(), "1s")
    ).rejects.toThrow("daemon is busy");
  });
});

// ── listLoops ───────────────────────────────────────────────────────────

describe("listLoops", () => {
  it("sends a list request", async () => {
    const okResponse: IpcResponse = { type: "ok", data: [] };
    mockedSendRequest.mockResolvedValue(okResponse);

    try {
      await listLoops();
    } catch {
      // process.exit mock throws
    }

    expect(mockedSendRequest).toHaveBeenCalledOnce();
    const sentRequest = mockedSendRequest.mock.calls[0][0] as IpcRequest;
    expect(sentRequest.type).toBe("list");
  });

  it("calls process.exit(0) on success when loops exist", async () => {
    const okResponse: IpcResponse = {
      type: "ok",
      data: [
        {
          id: "abc",
          command: "echo",
          commandArgs: [],
          interval: 1000,
          intervalHuman: "1s",
          immediate: false,
          maxRuns: null,
          verbose: false,
          cwd: "/tmp",
          description: "",
          status: "running",
          createdAt: "2024-01-01",
          sessionStartedAt: null,
          runCount: 5,
          lastRunAt: null,
          lastExitCode: 0,
          lastDuration: 100,
          nextRunAt: null,
          remainingDelayMs: null,
          pid: 1234,
          maxRunsReached: false,
          runHistory: [],
          skippedCount: 0,
          projectId: "default",
          offset: null,
          taskId: null,
        },
      ],
    };
    mockedSendRequest.mockResolvedValue(okResponse);

    try {
      await listLoops();
    } catch (err) {
      expect((err as Error).message).toBe("process.exit");
    }

    expect(processExitSpy).toHaveBeenCalledWith(0);
  });

  it("prints no loops message when list is empty", async () => {
    const okResponse: IpcResponse = { type: "ok", data: [] };
    mockedSendRequest.mockResolvedValue(okResponse);
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    try {
      await listLoops();
    } catch {
      // may or may not throw depending on code path
    }

    expect(consoleSpy).toHaveBeenCalledWith("No background loops running.");

    consoleSpy.mockRestore();
  });

  it("calls process.exit(1) on error response", async () => {
    const errorResponse: IpcResponse = {
      type: "error",
      message: "daemon error",
    };
    mockedSendRequest.mockResolvedValue(errorResponse);

    try {
      await listLoops();
    } catch (err) {
      expect((err as Error).message).toBe("process.exit");
    }

    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});

// ── showStatus ──────────────────────────────────────────────────────────

describe("showStatus", () => {
  it("sends a status request with id", async () => {
    const okResponse: IpcResponse = {
      type: "ok",
      data: {
        id: "abc12345",
        command: "echo",
        commandArgs: ["hello"],
        interval: 1000,
        intervalHuman: "1s",
        immediate: false,
        maxRuns: null,
        verbose: false,
        cwd: "/tmp",
        description: "",
        status: "running",
        createdAt: "2024-01-01T00:00:00Z",
        sessionStartedAt: null,
        runCount: 1,
        lastRunAt: null,
        lastExitCode: null,
        lastDuration: null,
        nextRunAt: null,
        remainingDelayMs: null,
        pid: 1234,
        maxRunsReached: false,
        runHistory: [],
        skippedCount: 0,
        projectId: "default",
        offset: null,
        taskId: null,
      },
    };
    mockedSendRequest.mockResolvedValue(okResponse);

    try {
      await showStatus("abc12345");
    } catch {
      // process.exit mock
    }

    expect(mockedSendRequest).toHaveBeenCalledOnce();
    const sentRequest = mockedSendRequest.mock.calls[0][0] as IpcRequest;
    expect(sentRequest.type).toBe("status");
    if (sentRequest.type === "status") {
      expect(sentRequest.payload.id).toBe("abc12345");
    }
  });

  it("calls process.exit(0) on success", async () => {
    const okResponse: IpcResponse = {
      type: "ok",
      data: {
        id: "abc12345",
        command: "echo",
        commandArgs: [],
        interval: 1000,
        intervalHuman: "1s",
        immediate: false,
        maxRuns: null,
        verbose: false,
        cwd: "/tmp",
        description: "",
        status: "running",
        createdAt: "2024-01-01T00:00:00Z",
        sessionStartedAt: null,
        runCount: 0,
        lastRunAt: null,
        lastExitCode: null,
        lastDuration: null,
        nextRunAt: null,
        remainingDelayMs: null,
        pid: 1234,
        maxRunsReached: false,
        runHistory: [],
        skippedCount: 0,
        projectId: "default",
        offset: null,
        taskId: null,
      },
    };
    mockedSendRequest.mockResolvedValue(okResponse);

    try {
      await showStatus("abc12345");
    } catch {
      // process.exit mock
    }

    expect(processExitSpy).toHaveBeenCalledWith(0);
  });

  it("calls process.exit(1) on error response", async () => {
    const errorResponse: IpcResponse = {
      type: "error",
      message: "not found",
    };
    mockedSendRequest.mockResolvedValue(errorResponse);

    try {
      await showStatus("nonexistent");
    } catch {
      // process.exit mock
    }

    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});

// ── pauseLoop ───────────────────────────────────────────────────────────

describe("pauseLoop", () => {
  it("sends a pause request with id", async () => {
    const okResponse: IpcResponse = { type: "ok" };
    mockedSendRequest.mockResolvedValue(okResponse);

    try {
      await pauseLoop("abc12345");
    } catch {
      // process.exit mock
    }

    expect(mockedSendRequest).toHaveBeenCalledOnce();
    const sentRequest = mockedSendRequest.mock.calls[0][0] as IpcRequest;
    expect(sentRequest.type).toBe("pause");
    if (sentRequest.type === "pause") {
      expect(sentRequest.payload.id).toBe("abc12345");
    }
  });

  it("calls process.exit(0) on success", async () => {
    const okResponse: IpcResponse = { type: "ok" };
    mockedSendRequest.mockResolvedValue(okResponse);

    try {
      await pauseLoop("abc12345");
    } catch {
      // process.exit mock
    }

    expect(processExitSpy).toHaveBeenCalledWith(0);
  });

  it("calls process.exit(1) on error response", async () => {
    const errorResponse: IpcResponse = {
      type: "error",
      message: "cannot pause",
    };
    mockedSendRequest.mockResolvedValue(errorResponse);

    try {
      await pauseLoop("abc12345");
    } catch {
      // process.exit mock
    }

    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});

// ── resumeLoop ──────────────────────────────────────────────────────────

describe("resumeLoop", () => {
  it("sends a resume request with id", async () => {
    const okResponse: IpcResponse = { type: "ok" };
    mockedSendRequest.mockResolvedValue(okResponse);

    try {
      await resumeLoop("abc12345");
    } catch {
      // process.exit mock
    }

    expect(mockedSendRequest).toHaveBeenCalledOnce();
    const sentRequest = mockedSendRequest.mock.calls[0][0] as IpcRequest;
    expect(sentRequest.type).toBe("resume");
    if (sentRequest.type === "resume") {
      expect(sentRequest.payload.id).toBe("abc12345");
    }
  });

  it("calls process.exit(0) on success", async () => {
    const okResponse: IpcResponse = { type: "ok" };
    mockedSendRequest.mockResolvedValue(okResponse);

    try {
      await resumeLoop("abc12345");
    } catch {
      // process.exit mock
    }

    expect(processExitSpy).toHaveBeenCalledWith(0);
  });

  it("calls process.exit(1) on error response", async () => {
    const errorResponse: IpcResponse = {
      type: "error",
      message: "cannot resume",
    };
    mockedSendRequest.mockResolvedValue(errorResponse);

    try {
      await resumeLoop("abc12345");
    } catch {
      // process.exit mock
    }

    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});

// ── deleteLoop ──────────────────────────────────────────────────────────

describe("deleteLoop", () => {
  it("sends a delete request with id", async () => {
    const okResponse: IpcResponse = { type: "ok" };
    mockedSendRequest.mockResolvedValue(okResponse);

    try {
      await deleteLoop("abc12345");
    } catch {
      // process.exit mock
    }

    expect(mockedSendRequest).toHaveBeenCalledOnce();
    const sentRequest = mockedSendRequest.mock.calls[0][0] as IpcRequest;
    expect(sentRequest.type).toBe("delete");
    if (sentRequest.type === "delete") {
      expect(sentRequest.payload.id).toBe("abc12345");
    }
  });

  it("calls process.exit(0) on success", async () => {
    const okResponse: IpcResponse = { type: "ok" };
    mockedSendRequest.mockResolvedValue(okResponse);

    try {
      await deleteLoop("abc12345");
    } catch {
      // process.exit mock
    }

    expect(processExitSpy).toHaveBeenCalledWith(0);
  });

  it("calls process.exit(1) on error response", async () => {
    const errorResponse: IpcResponse = {
      type: "error",
      message: "not found",
    };
    mockedSendRequest.mockResolvedValue(errorResponse);

    try {
      await deleteLoop("abc12345");
    } catch {
      // process.exit mock
    }

    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});

// ── resolveProjectId ────────────────────────────────────────────────────

describe("resolveProjectId", () => {
  it("resolves by id when project id matches", async () => {
    mockedSendRequest.mockResolvedValue({
      type: "ok",
      data: [
        { id: "proj-1", name: "Alpha", color: "#06b6d4", createdAt: "2024-01-01", isSystem: false, isDefault: false },
        { id: "proj-2", name: "Beta", color: "#4ade80", createdAt: "2024-01-01", isSystem: false, isDefault: false },
      ],
    });

    const result = await resolveProjectId("proj-1");
    expect(result).toBe("proj-1");
  });

  it("resolves by name (case-insensitive) when unique match", async () => {
    mockedSendRequest.mockResolvedValue({
      type: "ok",
      data: [
        { id: "proj-1", name: "Alpha", color: "#06b6d4", createdAt: "2024-01-01", isSystem: false, isDefault: false },
        { id: "proj-2", name: "Beta", color: "#4ade80", createdAt: "2024-01-01", isSystem: false, isDefault: false },
      ],
    });

    const result = await resolveProjectId("alpha");
    expect(result).toBe("proj-1");
  });

  it("throws when no project matches", async () => {
    mockedSendRequest.mockResolvedValue({
      type: "ok",
      data: [
        { id: "proj-1", name: "Alpha", color: "#06b6d4", createdAt: "2024-01-01", isSystem: false, isDefault: false },
      ],
    });

    await expect(resolveProjectId("nonexistent")).rejects.toThrow();
  });

  it("throws when multiple projects match the name", async () => {
    mockedSendRequest.mockResolvedValue({
      type: "ok",
      data: [
        { id: "proj-1", name: "Alpha", color: "#06b6d4", createdAt: "2024-01-01", isSystem: false, isDefault: false },
        { id: "proj-2", name: "alpha", color: "#4ade80", createdAt: "2024-01-01", isSystem: false, isDefault: false },
      ],
    });

    await expect(resolveProjectId("alpha")).rejects.toThrow();
  });

  it("throws when project-list returns an error", async () => {
    mockedSendRequest.mockResolvedValue({
      type: "error",
      message: "daemon failure",
    });

    await expect(resolveProjectId("any")).rejects.toThrow("daemon failure");
  });
});

// ── startLoop ───────────────────────────────────────────────────────────

describe("startLoop", () => {
  it("logs success messages and calls process.exit(0)", async () => {
    mockedSendRequest.mockResolvedValue({ type: "ok", data: { id: "loop1" } });
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    try {
      await startLoop(makeLoopOptions(), "1s");
    } catch {
      // process.exit mock throws
    }

    expect(consoleSpy).toHaveBeenCalled();
    expect(processExitSpy).toHaveBeenCalledWith(0);
    consoleSpy.mockRestore();
  });

  it("calls process.exit(1) on error response", async () => {
    mockedSendRequest.mockResolvedValue({ type: "error", message: "cannot start" });

    try {
      await startLoop(makeLoopOptions(), "1s");
    } catch {
      // process.exit mock
    }

    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});

// ── viewLogs ────────────────────────────────────────────────────────────

describe("viewLogs", () => {
  it("writes log content and exits on non-follow success", async () => {
    mockedSendRequest.mockResolvedValue({ type: "ok", data: "line1\nline2\n" });
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    try {
      await viewLogs("abc", false, 10);
    } catch {
      // process.exit
    }

    expect(stdoutSpy).toHaveBeenCalledWith("line1\nline2\n");
    expect(processExitSpy).toHaveBeenCalledWith(0);
    stdoutSpy.mockRestore();
  });

  it("adds trailing newline when content does not end with one", async () => {
    mockedSendRequest.mockResolvedValue({ type: "ok", data: "line1\nline2" });
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    try {
      await viewLogs("abc", false, 10);
    } catch {
      // process.exit
    }

    expect(stdoutSpy).toHaveBeenCalledWith("\n");
    expect(processExitSpy).toHaveBeenCalledWith(0);
    stdoutSpy.mockRestore();
  });

  it("exits 0 with no output when content is empty", async () => {
    mockedSendRequest.mockResolvedValue({ type: "ok", data: "" });
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    try {
      await viewLogs("abc", false, 10);
    } catch {
      // process.exit
    }

    expect(processExitSpy).toHaveBeenCalledWith(0);
    stdoutSpy.mockRestore();
  });

  it("exits 1 on error response", async () => {
    mockedSendRequest.mockResolvedValue({ type: "error", message: "not found" });

    try {
      await viewLogs("abc", false, 10);
    } catch {
      // process.exit
    }

    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it("sets up stream on follow mode", async () => {
    const fakeSocket = { destroy: vi.fn(), on: vi.fn() } as any;
    mockedStreamRequest.mockReturnValue(fakeSocket);

    // This will not resolve (follow mode keeps running), so wrap in try/catch
    const promise = viewLogs("abc", true, 10);

    // Just check that streamRequest was called
    expect(mockedStreamRequest).toHaveBeenCalled();

    // Clean up - simulate the onEnd callback
    const onEnd = mockedStreamRequest.mock.calls[0][2] as () => void;
    onEnd(); // triggers process.exit(0)
  });
});

// ── attachLoop ──────────────────────────────────────────────────────────

describe("attachLoop", () => {
  it("sets up stream and console.log for attach", async () => {
    const fakeSocket = { destroy: vi.fn(), on: vi.fn() } as any;
    mockedStreamRequest.mockReturnValue(fakeSocket);
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const promise = attachLoop("abc");

    expect(consoleSpy).toHaveBeenCalled(); // "Attaching to..." log
    expect(mockedStreamRequest).toHaveBeenCalled();

    // Clean up - simulate the onEnd callback
    const onEnd = mockedStreamRequest.mock.calls[0][2] as () => void;
    onEnd();
    consoleSpy.mockRestore();
  });
});

// ── listProjectsCli ─────────────────────────────────────────────────────

describe("listProjectsCli", () => {
  it("prints no projects message and exits when empty", async () => {
    mockedSendRequest.mockResolvedValue({ type: "ok", data: [] });
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    try {
      await listProjectsCli();
    } catch {
      // process.exit
    }

    expect(processExitSpy).toHaveBeenCalledWith(0);
    consoleSpy.mockRestore();
  });

  it("prints project table and exits 0 when projects exist", async () => {
    mockedSendRequest
      .mockResolvedValueOnce({
        type: "ok",
        data: [
          { id: "p1", name: "Alpha", color: "#06b6d4", createdAt: "2024-01-01", isSystem: false, isDefault: false },
        ],
      })
      .mockResolvedValueOnce({ type: "ok", data: [] as any[] });
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    try {
      await listProjectsCli();
    } catch {
      // process.exit
    }

    expect(processExitSpy).toHaveBeenCalledWith(0);
    consoleSpy.mockRestore();
  });

  it("exits 1 on fetch error", async () => {
    mockedSendRequest.mockResolvedValue({ type: "error", message: "daemon down" });

    try {
      await listProjectsCli();
    } catch {
      // process.exit
    }

    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});

// ── createProjectCli ────────────────────────────────────────────────────

describe("createProjectCli", () => {
  it("creates project with default cyan color when no color provided", async () => {
    mockedSendRequest.mockResolvedValue({ type: "ok", data: { id: "new1" } });
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    try {
      await createProjectCli("MyProj");
    } catch {
      // process.exit
    }

    expect(mockedSendRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "project-create",
        payload: expect.objectContaining({ color: "#06b6d4" }),
      })
    );
    expect(processExitSpy).toHaveBeenCalledWith(0);
    consoleSpy.mockRestore();
  });

  it("creates project with specified color", async () => {
    mockedSendRequest.mockResolvedValue({ type: "ok", data: { id: "new2" } });
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    try {
      await createProjectCli("MyProj", "green");
    } catch {
      // process.exit
    }

    expect(mockedSendRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "project-create",
        payload: expect.objectContaining({ color: "#4ade80" }),
      })
    );
    consoleSpy.mockRestore();
  });

  it("exits 1 on error response", async () => {
    mockedSendRequest.mockResolvedValue({ type: "error", message: "failed" });

    try {
      await createProjectCli("MyProj");
    } catch {
      // process.exit
    }

    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});

// ── renameProjectCli ────────────────────────────────────────────────────

describe("renameProjectCli", () => {
  it("renames project by resolved id", async () => {
    mockedSendRequest
      .mockResolvedValueOnce({
        type: "ok",
        data: [
          { id: "proj-1", name: "Alpha", color: "#06b6d4", createdAt: "2024-01-01", isSystem: false, isDefault: false },
        ],
      })
      .mockResolvedValueOnce({ type: "ok" });
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    try {
      await renameProjectCli("proj-1", "Beta");
    } catch {
      // process.exit
    }

    expect(mockedSendRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "project-update",
        payload: expect.objectContaining({ id: "proj-1", name: "Beta" }),
      })
    );
    expect(processExitSpy).toHaveBeenCalledWith(0);
    consoleSpy.mockRestore();
  });

  it("exits 1 when resolveProjectId throws", async () => {
    mockedSendRequest.mockResolvedValue({
      type: "ok",
      data: [],
    });

    try {
      await renameProjectCli("nonexistent", "NewName");
    } catch {
      // process.exit
    }

    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});

// ── setProjectColorCli ──────────────────────────────────────────────────

describe("setProjectColorCli", () => {
  it("sets color by project id", async () => {
    mockedSendRequest
      .mockResolvedValueOnce({
        type: "ok",
        data: [
          { id: "p1", name: "Alpha", color: "#06b6d4", createdAt: "2024-01-01", isSystem: false, isDefault: false },
        ],
      })
      .mockResolvedValueOnce({ type: "ok" });
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    try {
      await setProjectColorCli("p1", "green");
    } catch {
      // process.exit
    }

    expect(mockedSendRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "project-update",
        payload: expect.objectContaining({ color: "#4ade80" }),
      })
    );
    expect(processExitSpy).toHaveBeenCalledWith(0);
    consoleSpy.mockRestore();
  });

  it("sets color by project name", async () => {
    mockedSendRequest
      .mockResolvedValueOnce({
        type: "ok",
        data: [
          { id: "p1", name: "Alpha", color: "#06b6d4", createdAt: "2024-01-01", isSystem: false, isDefault: false },
        ],
      })
      .mockResolvedValueOnce({ type: "ok" });
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    try {
      await setProjectColorCli("Alpha", "green");
    } catch {
      // process.exit
    }

    expect(processExitSpy).toHaveBeenCalledWith(0);
    consoleSpy.mockRestore();
  });

  it("exits 1 when project not found", async () => {
    mockedSendRequest.mockResolvedValue({
      type: "ok",
      data: [],
    });

    try {
      await setProjectColorCli("nonexistent", "green");
    } catch {
      // process.exit
    }

    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it("exits 1 when multiple projects match", async () => {
    mockedSendRequest.mockResolvedValue({
      type: "ok",
      data: [
        { id: "p1", name: "Alpha", color: "#06b6d4", createdAt: "2024-01-01", isSystem: false, isDefault: false },
        { id: "p2", name: "alpha", color: "#4ade80", createdAt: "2024-01-01", isSystem: false, isDefault: false },
      ],
    });

    try {
      await setProjectColorCli("alpha", "green");
    } catch {
      // process.exit
    }

    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it("exits 1 when color is invalid", async () => {
    mockedSendRequest.mockResolvedValue({
      type: "ok",
      data: [
        { id: "p1", name: "Alpha", color: "#06b6d4", createdAt: "2024-01-01", isSystem: false, isDefault: false },
      ],
    });

    try {
      await setProjectColorCli("p1", "notacolor");
    } catch {
      // process.exit
    }

    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});

// ── deleteProjectCli ────────────────────────────────────────────────────

describe("deleteProjectCli", () => {
  it("deletes project by resolved id", async () => {
    mockedSendRequest
      .mockResolvedValueOnce({
        type: "ok",
        data: [
          { id: "p1", name: "Alpha", color: "#06b6d4", createdAt: "2024-01-01", isSystem: false, isDefault: false },
        ],
      })
      .mockResolvedValueOnce({ type: "ok" });
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    try {
      await deleteProjectCli("p1");
    } catch {
      // process.exit
    }

    expect(processExitSpy).toHaveBeenCalledWith(0);
    consoleSpy.mockRestore();
  });

  it("exits 1 when resolveProjectId throws", async () => {
    mockedSendRequest.mockResolvedValue({
      type: "ok",
      data: [],
    });

    try {
      await deleteProjectCli("nonexistent");
    } catch {
      // process.exit
    }

    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});
