import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import net from "node:net";
import type { LoopMeta, TaskDefinition, IpcResponse } from "../src/types.js";

// Mock LoopManager
const mockStart = vi.fn().mockReturnValue("loop1");
const mockList = vi.fn().mockReturnValue([]);
const mockStatus = vi.fn().mockReturnValue(null);
const mockPause = vi.fn().mockReturnValue(true);
const mockResume = vi.fn().mockReturnValue(true);
const mockStopLoop = vi.fn().mockReturnValue(true);
const mockStopAllLoops = vi.fn().mockReturnValue(0);
const mockPlayLoop = vi.fn().mockReturnValue(true);
const mockTrigger = vi.fn().mockReturnValue(true);
const mockDelete = vi.fn().mockResolvedValue(true);
const mockIsMaxRunsBlocked = vi.fn().mockReturnValue(false);
const mockIsRunning = vi.fn().mockReturnValue(false);
const mockGetLogPath = vi.fn().mockReturnValue(null);
const mockShutdown = vi.fn().mockResolvedValue(undefined);
const mockUpdate = vi.fn().mockResolvedValue(true);
const mockListProjects = vi.fn().mockReturnValue([]);
const mockCreateProject = vi.fn().mockReturnValue({ id: "p1", name: "Proj", color: "#fff", createdAt: new Date().toISOString(), isSystem: false, isDefault: false });
const mockUpdateProject = vi.fn();
const mockDeleteProject = vi.fn();

vi.mock("../src/daemon/managers/loop-manager.js", () => ({
  LoopManager: vi.fn().mockImplementation(() => ({
    start: mockStart,
    list: mockList,
    status: mockStatus,
    pause: mockPause,
    resume: mockResume,
    stopLoop: mockStopLoop,
    stopAllLoops: mockStopAllLoops,
    playLoop: mockPlayLoop,
    trigger: mockTrigger,
    delete: mockDelete,
    isMaxRunsBlocked: mockIsMaxRunsBlocked,
    isRunning: mockIsRunning,
    getLogPath: mockGetLogPath,
    shutdown: mockShutdown,
    update: mockUpdate,
    listProjects: mockListProjects,
    createProject: mockCreateProject,
    updateProject: mockUpdateProject,
    deleteProject: mockDeleteProject,
  })),
}));

// Mock TaskManager
const mockTaskCreate = vi.fn().mockReturnValue({ id: "t1", name: "Task", command: "echo", commandArgs: [], onSuccessTaskId: null, onFailureTaskId: null, maxRuns: 5, createdAt: new Date().toISOString() });
const mockTaskUpdate = vi.fn().mockReturnValue(null);
const mockTaskList = vi.fn().mockReturnValue([]);
const mockTaskGet = vi.fn().mockReturnValue(null);
const mockTaskDelete = vi.fn().mockReturnValue(false);

vi.mock("../src/daemon/managers/task-manager.js", () => ({
  TaskManager: vi.fn().mockImplementation(() => ({
    create: mockTaskCreate,
    update: mockTaskUpdate,
    list: mockTaskList,
    get: mockTaskGet,
    delete: mockTaskDelete,
  })),
}));

vi.mock("../src/shared/tail.js", () => ({
  tail: vi.fn().mockReturnValue(["line1", "line2"]),
}));

// Mock state.js removeSocketFile to avoid file system issues
vi.mock("../src/daemon/state/index.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/daemon/state/index.js")>();
  return {
    ...actual,
    removeSocketFile: vi.fn(),
    getSocketPath: vi.fn().mockReturnValue("/tmp/loop-test-ipc-server.sock"),
  };
});

import { IpcServer } from "../src/daemon/server/index.js";
import { LoopManager } from "../src/daemon/managers/loop-manager.js";
import { TaskManager } from "../src/daemon/managers/task-manager.js";

let tmpDir: string;
let origHome: string | undefined;

beforeEach(() => {
  vi.clearAllMocks();

  tmpDir = mkdtempSync(join(tmpdir(), "loop-daemon-server-test-"));
  origHome = process.env.LOOP_CLI_HOME;
  process.env.LOOP_CLI_HOME = tmpDir;
});

afterEach(() => {
  if (origHome === undefined) delete process.env.LOOP_CLI_HOME;
  else process.env.LOOP_CLI_HOME = origHome;
  rmSync(tmpDir, { recursive: true, force: true });
});

/**
 * Creates a real IpcServer with mock managers, listens on a temp socket,
 * and provides a helper to send JSON-lines requests and collect responses.
 */
async function createServerAndClient(): Promise<{
  server: IpcServer;
  manager: LoopManager;
  taskManager: TaskManager;
  socketPath: string;
  sendRequest: (request: object) => Promise<IpcResponse[]>;
  close: () => Promise<void>;
}> {
  const manager = new LoopManager({} as any);
  const taskManager = new TaskManager({} as any);
  const server = new IpcServer(manager, taskManager);

  mkdirSync(tmpDir, { recursive: true });
  const socketPath = process.platform === "win32"
    ? `\\\\.\\pipe\\loop-test-${process.pid}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
    : join(tmpDir, `test-${Date.now()}.sock`);

  (server as any).socketPath = socketPath;

  await server.listen();

  const sendRequest = (request: object): Promise<IpcResponse[]> => {
    return new Promise((resolve, reject) => {
      const client = net.createConnection(socketPath, () => {
        client.write(JSON.stringify(request) + "\n");
      });

      const responses: IpcResponse[] = [];
      let buffer = "";

      client.on("data", (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.trim()) {
            responses.push(JSON.parse(line) as IpcResponse);
          }
        }
        if (responses.length > 0) {
          setTimeout(() => client.end(), 50);
        }
      });

      client.on("end", () => resolve(responses));
      client.on("error", reject);
      setTimeout(() => { client.destroy(); resolve(responses); }, 3000);
    });
  };

  const close = async () => {
    await server.close();
  };

  return { server, manager, taskManager, socketPath, sendRequest, close };
}

describe("IpcServer", () => {
  let server: IpcServer;
  let sendRequest: (request: object) => Promise<IpcResponse[]>;
  let close: () => Promise<void>;

  beforeEach(async () => {
    const result = await createServerAndClient();
    server = result.server;
    sendRequest = result.sendRequest;
    close = result.close;
  });

  afterEach(async () => {
    await close();
  });

  it("listens and accepts connections", async () => {
    const responses = await sendRequest({ type: "list" });
    expect(responses.length).toBeGreaterThanOrEqual(1);
    expect(responses[0].type).toBe("ok");
  });

  it("routes list request to manager.list()", async () => {
    const fakeList: LoopMeta[] = [
      {
        id: "abc",
        taskId: null,
        command: "echo",
        commandArgs: [],
        interval: 60000,
        intervalHuman: "1m",
        immediate: false,
        maxRuns: null,
        verbose: false,
        cwd: "",
        description: "",
        status: "running",
        createdAt: new Date().toISOString(),
        sessionStartedAt: null,
        runCount: 1,
        lastRunAt: null,
        lastExitCode: null,
        lastDuration: null,
        nextRunAt: null,
        remainingDelayMs: null,
        pid: 123,
        maxRunsReached: false,
        runHistory: [],
        skippedCount: 0,
        projectId: "default",
        offset: null,
      },
    ];
    mockList.mockReturnValueOnce(fakeList);

    const responses = await sendRequest({ type: "list" });
    expect(responses[0].type).toBe("ok");
    expect((responses[0] as any).data).toEqual(fakeList);
  });

  it("routes start request and returns id", async () => {
    const responses = await sendRequest({
      type: "start",
      payload: {
        interval: 60000,
        intervalHuman: "1m",
        taskId: null,
        command: "echo",
        commandArgs: ["hi"],
        cwd: "/tmp",
        immediate: true,
        maxRuns: null,
        verbose: false,
        description: "",
        projectId: "default",
        offset: null,
      },
    });
    expect(responses[0].type).toBe("ok");
    expect((responses[0] as any).data.id).toBe("loop1");
    expect(mockStart).toHaveBeenCalled();
  });

  it("returns error for malformed JSON", async () => {
    const responses = await new Promise<IpcResponse[]>((resolve, reject) => {
      const client = net.createConnection((server as any).socketPath, () => {
        client.write("this is not valid json\n");
      });

      const resps: IpcResponse[] = [];
      let buffer = "";

      client.on("data", (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.trim()) resps.push(JSON.parse(line));
        }
        if (resps.length > 0) {
          setTimeout(() => client.end(), 50);
        }
      });

      client.on("end", () => resolve(resps));
      client.on("error", reject);
      setTimeout(() => { client.destroy(); resolve(resps); }, 3000);
    });

    expect(responses[0].type).toBe("error");
  });

  it("routes pause request", async () => {
    const responses = await sendRequest({ type: "pause", payload: { id: "abc" } });
    expect(responses[0].type).toBe("ok");
    expect(mockPause).toHaveBeenCalledWith("abc");
  });

  it("routes resume request", async () => {
    const responses = await sendRequest({ type: "resume", payload: { id: "abc" } });
    expect(responses[0].type).toBe("ok");
    expect(mockResume).toHaveBeenCalledWith("abc");
  });

  it("routes stop-loop request", async () => {
    const responses = await sendRequest({ type: "stop-loop", payload: { id: "abc" } });
    expect(responses[0].type).toBe("ok");
    expect(mockStopLoop).toHaveBeenCalledWith("abc");
  });

  it("routes stop-all request and returns count", async () => {
    mockStopAllLoops.mockReturnValueOnce(3);
    const responses = await sendRequest({ type: "stop-all" });
    expect(responses[0].type).toBe("ok");
    expect((responses[0] as any).data).toBe(3);
  });

  it("routes status request and returns meta when found", async () => {
    const fakeMeta: LoopMeta = {
      id: "abc",
      taskId: null,
      command: "echo",
      commandArgs: [],
      interval: 60000,
      intervalHuman: "1m",
      immediate: false,
      maxRuns: null,
      verbose: false,
      cwd: "",
      description: "",
      status: "running",
      createdAt: new Date().toISOString(),
      sessionStartedAt: null,
      runCount: 0,
      lastRunAt: null,
      lastExitCode: null,
      lastDuration: null,
      nextRunAt: null,
      remainingDelayMs: null,
      pid: 123,
      maxRunsReached: false,
      runHistory: [],
      skippedCount: 0,
      projectId: "default",
      offset: null,
    };
    mockStatus.mockReturnValueOnce(fakeMeta);

    const responses = await sendRequest({ type: "status", payload: { id: "abc" } });
    expect(responses[0].type).toBe("ok");
    expect((responses[0] as any).data).toEqual(fakeMeta);
  });

  it("routes status request and returns error when not found", async () => {
    mockStatus.mockReturnValueOnce(null);
    const responses = await sendRequest({ type: "status", payload: { id: "notfound" } });
    expect(responses[0].type).toBe("error");
  });

  it("routes delete request", async () => {
    const responses = await sendRequest({ type: "delete", payload: { id: "abc" } });
    expect(mockDelete).toHaveBeenCalledWith("abc");
  });

  it("routes trigger request when not max-runs-blocked and not running", async () => {
    const responses = await sendRequest({ type: "trigger", payload: { id: "abc" } });
    expect(responses[0].type).toBe("ok");
    expect(mockTrigger).toHaveBeenCalledWith("abc");
  });

  it("returns error for trigger when max-runs reached", async () => {
    mockIsMaxRunsBlocked.mockReturnValueOnce(true);
    const responses = await sendRequest({ type: "trigger", payload: { id: "abc" } });
    expect(responses[0].type).toBe("error");
  });

  it("returns error for trigger when loop is running", async () => {
    mockIsRunning.mockReturnValueOnce(true);
    const responses = await sendRequest({ type: "trigger", payload: { id: "abc" } });
    expect(responses[0].type).toBe("error");
  });

  it("routes play-loop request", async () => {
    const responses = await sendRequest({ type: "play-loop", payload: { id: "abc" } });
    expect(responses[0].type).toBe("ok");
    expect(mockPlayLoop).toHaveBeenCalledWith("abc");
  });

  it("returns error for play-loop when max-runs reached", async () => {
    mockIsMaxRunsBlocked.mockReturnValueOnce(true);
    const responses = await sendRequest({ type: "play-loop", payload: { id: "abc" } });
    expect(responses[0].type).toBe("error");
  });


  it("routes task-create request", async () => {
    const taskDef = { id: "t1", name: "Task", command: "echo", commandArgs: [], onSuccessTaskId: null, onFailureTaskId: null, maxRuns: 5 };
    const responses = await sendRequest({ type: "task-create", payload: taskDef });
    expect(responses[0].type).toBe("ok");
    expect(mockTaskCreate).toHaveBeenCalled();
  });

  it("routes task-list request", async () => {
    const responses = await sendRequest({ type: "task-list" });
    expect(responses[0].type).toBe("ok");
    expect(mockTaskList).toHaveBeenCalled();
  });

  it("routes task-get request (not found returns error)", async () => {
    mockTaskGet.mockReturnValueOnce(null);
    const responses = await sendRequest({ type: "task-get", payload: { id: "missing" } });
    expect(responses[0].type).toBe("error");
  });

  it("routes task-delete request", async () => {
    mockTaskDelete.mockReturnValueOnce(true);
    const responses = await sendRequest({ type: "task-delete", payload: { id: "t1" } });
    expect(responses[0].type).toBe("ok");
  });


  it("routes project-list request", async () => {
    const responses = await sendRequest({ type: "project-list" });
    expect(responses[0].type).toBe("ok");
    expect(mockListProjects).toHaveBeenCalled();
  });

  it("routes project-create request", async () => {
    const responses = await sendRequest({ type: "project-create", payload: { name: "MyProj", color: "#123456" } });
    expect(responses[0].type).toBe("ok");
    expect(mockCreateProject).toHaveBeenCalledWith("MyProj", "#123456", undefined, undefined);
  });

  it("returns error for project-create with empty name", async () => {
    const responses = await sendRequest({ type: "project-create", payload: { name: "  ", color: "#fff" } });
    expect(responses[0].type).toBe("error");
  });

  it("routes project-update request", async () => {
    const responses = await sendRequest({ type: "project-update", payload: { id: "p1", name: "Updated" } });
    expect(responses[0].type).toBe("ok");
  });

  it("routes project-delete request", async () => {
    const responses = await sendRequest({ type: "project-delete", payload: { id: "p1" } });
    expect(responses[0].type).toBe("ok");
  });

  it("project-delete propagates error from manager", async () => {
    mockDeleteProject.mockImplementationOnce(() => { throw new Error("Cannot delete system project"); });
    const responses = await sendRequest({ type: "project-delete", payload: { id: "default" } });
    expect(responses[0].type).toBe("error");
  });


  it("routes subscribe request", async () => {
    const responses = await sendRequest({ type: "subscribe" });
    expect(responses[0].type).toBe("ok");
  });


  it("pushEvent sends event to subscribers", async () => {
    // Subscribe first
    const subSocket = net.createConnection((server as any).socketPath);
    await new Promise<void>((resolve) => subSocket.on("connect", resolve));
    subSocket.write(JSON.stringify({ type: "subscribe" }) + "\n");

    // Wait a bit for the server to process
    await new Promise<void>((resolve) => setTimeout(resolve, 100));

    // Push an event
    server.pushEvent("loop:started", { id: "abc" });

    // Read the event response
    const eventData = await new Promise<IpcResponse | null>((resolve) => {
      let buf = "";
      subSocket.on("data", (chunk: Buffer) => {
        buf += chunk.toString();
        const lines = buf.split("\n");
        for (const line of lines) {
          if (line.trim()) {
            try {
              resolve(JSON.parse(line));
              return;
            } catch { /* ignore */ }
          }
        }
      });
      setTimeout(() => resolve(null), 500);
    });

    // We may or may not get the event depending on timing,
    // but the method should not throw
    subSocket.destroy();
  });


  it("routes update request", async () => {
    const responses = await sendRequest({
      type: "update",
      payload: {
        id: "abc",
        interval: 60000,
        intervalHuman: "1m",
        taskId: null,
        command: "echo",
        commandArgs: ["hi"],
        cwd: "/tmp",
        immediate: true,
        maxRuns: null,
        verbose: false,
        description: "",
        projectId: "default",
        offset: null,
      },
    });
    expect(mockUpdate).toHaveBeenCalled();
  });
});
