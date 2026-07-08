import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import http from "node:http";
import { HttpApiServer } from "../src/daemon/http/server.js";
import type { LoopManager } from "../src/daemon/managers/loop-manager.js";
import type { TaskManager } from "../src/daemon/managers/task-manager.js";
import type { ProjectManager } from "../src/daemon/managers/project-manager.js";
import type { LoopMeta, TaskDefinition, Project } from "../src/types.js";



const fakeLoopMeta: LoopMeta = {
  id: "abc123",
  taskId: null,
  command: "echo hello",
  commandArgs: ["hello"],
  commandRaw: "echo hello",
  interval: 300_000,
  intervalHuman: "5m",
  immediate: false,
  maxRuns: null,
  verbose: false,
  cwd: "",
  description: "test loop",
  status: "running",
  createdAt: new Date().toISOString(),
  sessionStartedAt: null,
  runCount: 0,
  lastRunAt: null,
  lastExitCode: null,
  lastDuration: null,
  nextRunAt: null,
  remainingDelayMs: null,
  pid: 0,
  maxRunsReached: false,
  runHistory: [],
  skippedCount: 0,
  projectId: "default",
  offset: null,
};

const fakeTask: TaskDefinition = {
  id: "task-1",
  name: "My Task",
  command: "echo",
  commandArgs: [],
  onSuccessTaskId: null,
  onFailureTaskId: null,
  createdAt: new Date().toISOString(),
};

const fakeProject: Project = {
  id: "proj-1",
  name: "My Project",
  color: "#ff0000",
  createdAt: new Date().toISOString(),
  isSystem: false,
  isDefault: false,
};


//
// vi.fn() lets us both assert calls and override return values per test
// with mockReturnValueOnce / mockReturnValue.

const mockManager = {
  list: vi.fn().mockReturnValue([fakeLoopMeta]),
  status: vi.fn().mockReturnValue(fakeLoopMeta),
  start: vi.fn().mockReturnValue("new-id"),
  update: vi.fn().mockResolvedValue(true),
  delete: vi.fn().mockResolvedValue(true),
  pause: vi.fn().mockReturnValue(true),
  resume: vi.fn().mockReturnValue(true),
  stopLoop: vi.fn().mockReturnValue(true),
  stopAllLoops: vi.fn().mockReturnValue(0),
  trigger: vi.fn().mockReturnValue(true),
  isMaxRunsBlocked: vi.fn().mockReturnValue(false),
  isRunning: vi.fn().mockReturnValue(false),
  getLogPath: vi.fn().mockReturnValue(null),
};

const mockTaskManager = {
  list: vi.fn().mockReturnValue([fakeTask]),
  get: vi.fn().mockReturnValue(fakeTask),
  create: vi.fn().mockImplementation((input: Omit<TaskDefinition, "createdAt">) => ({
    ...input,
    createdAt: new Date().toISOString(),
  })),
  update: vi.fn().mockReturnValue(null),
  delete: vi.fn().mockReturnValue(false),
};

const mockProjectManager = {
  getAll: vi.fn().mockReturnValue([fakeProject]),
  create: vi.fn().mockImplementation((name: string, color: string) => ({
    id: "new-project",
    name,
    color,
    createdAt: new Date().toISOString(),
    isSystem: false,
    isDefault: false,
  })),
  update: vi.fn(),
  delete: vi.fn(),
};



function httpRequest(
  port: number,
  method: string,
  path: string,
  body?: unknown,
): Promise<http.IncomingMessage> {
  return new Promise((resolve, reject) => {
    const data = body !== undefined ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        method,
        path,
        headers: {
          Connection: "close",
          ...(data
            ? {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(data),
            }
            : {}),
        },
      },
      resolve,
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

function readBody(res: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    res.on("data", (chunk: Buffer) => {
      data += chunk.toString();
    });
    res.on("end", () => resolve(data));
    res.on("error", reject);
  });
}



describe("HttpApiServer — route matching & JSON envelope", () => {
  let httpServer: HttpApiServer;
  let port: number;

  beforeAll(async () => {
    httpServer = new HttpApiServer(
      mockManager as unknown as LoopManager,
      mockTaskManager as unknown as TaskManager,
      mockProjectManager as unknown as ProjectManager,
    );
    await httpServer.listen(0); // port 0 → OS picks a free port
    const server = (httpServer as unknown as { server: { address: () => { port: number } | null } }).server;
    const addr = server.address();
    if (!addr) throw new Error("Server not listening");
    port = addr.port;
  });

  beforeEach(() => {
    // Clear call history (for toHaveBeenCalledWith assertions) while
    // keeping persistent mockReturnValue implementations.
    vi.clearAllMocks();

    // Re-establish default return values (safe even though clearAllMocks
    // doesn't reset mockReturnValue — ensures no stale override leaks).
    mockManager.list.mockReturnValue([fakeLoopMeta]);
    mockManager.status.mockReturnValue(fakeLoopMeta);
    mockManager.start.mockReturnValue("new-id");
    mockManager.update.mockResolvedValue(true);
    mockManager.delete.mockResolvedValue(true);
    mockManager.pause.mockReturnValue(true);
    mockManager.resume.mockReturnValue(true);
    mockManager.stopLoop.mockReturnValue(true);
    mockManager.stopAllLoops.mockReturnValue(0);
    mockManager.trigger.mockReturnValue(true);
    mockManager.isMaxRunsBlocked.mockReturnValue(false);
    mockManager.isRunning.mockReturnValue(false);
    mockManager.getLogPath.mockReturnValue(null);

    mockTaskManager.list.mockReturnValue([fakeTask]);
    mockTaskManager.get.mockReturnValue(fakeTask);
    mockTaskManager.create.mockImplementation(
      (input: Omit<TaskDefinition, "createdAt">) => ({
        ...input,
        createdAt: new Date().toISOString(),
      }),
    );
    mockTaskManager.update.mockReturnValue(null);
    mockTaskManager.delete.mockReturnValue(false);

    mockProjectManager.getAll.mockReturnValue([fakeProject]);
    mockProjectManager.create.mockImplementation((name: string, color: string) => ({
      id: "new-project",
      name,
      color,
      createdAt: new Date().toISOString(),
      isSystem: false,
      isDefault: false,
    }));
  });

  afterAll(async () => {
    await httpServer.close();
  });



  it("GET /api/loops returns 200 with array in success envelope", async () => {
    const res = await httpRequest(port, "GET", "/api/loops");
    const body = JSON.parse(await readBody(res));

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("application/json");
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe("abc123");
    expect(mockManager.list).toHaveBeenCalledOnce();
  });



  it("GET /api/loops/:id returns 200 with object when found", async () => {
    const res = await httpRequest(port, "GET", "/api/loops/abc123");
    const body = JSON.parse(await readBody(res));

    expect(res.statusCode).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.id).toBe("abc123");
    expect(mockManager.status).toHaveBeenCalledWith("abc123");
  });

  it("GET /api/loops/:id returns 404 error envelope when not found", async () => {
    mockManager.status.mockReturnValue(null);

    const res = await httpRequest(port, "GET", "/api/loops/missing");
    const body = JSON.parse(await readBody(res));

    expect(res.statusCode).toBe(404);
    expect(body.ok).toBe(false);
    expect(body.error.message).toContain("missing");
  });



  it("POST /api/loops returns 201 with id when body is valid", async () => {
    const res = await httpRequest(port, "POST", "/api/loops", {
      command: "echo hi",
      description: "a loop",
      intervalHuman: "5m",
    });
    const body = JSON.parse(await readBody(res));

    expect(res.statusCode).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.data.id).toBe("new-id");
    expect(mockManager.start).toHaveBeenCalled();
  });

  it("POST /api/loops returns 400 error envelope when command is missing", async () => {
    const res = await httpRequest(port, "POST", "/api/loops", {
      description: "a loop",
    });
    const body = JSON.parse(await readBody(res));

    expect(res.statusCode).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error.message).toBeTruthy();
  });

  it("POST /api/loops returns 400 when description is missing", async () => {
    const res = await httpRequest(port, "POST", "/api/loops", {
      command: "echo hi",
    });
    const body = JSON.parse(await readBody(res));

    expect(res.statusCode).toBe(400);
    expect(body.ok).toBe(false);
  });



  it("DELETE /api/loops/:id returns 200 when deleted", async () => {
    mockManager.delete.mockResolvedValue(true);

    const res = await httpRequest(port, "DELETE", "/api/loops/abc123");
    const body = JSON.parse(await readBody(res));

    expect(res.statusCode).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data).toBeNull();
    expect(mockManager.delete).toHaveBeenCalledWith("abc123");
  });

  it("DELETE /api/loops/:id returns 404 when not found", async () => {
    mockManager.delete.mockResolvedValue(false);

    const res = await httpRequest(port, "DELETE", "/api/loops/missing");
    const body = JSON.parse(await readBody(res));

    expect(res.statusCode).toBe(404);
    expect(body.ok).toBe(false);
  });



  it("PATCH /api/loops/:id returns 200 with id when updated", async () => {
    mockManager.update.mockResolvedValue(true);

    const res = await httpRequest(port, "PATCH", "/api/loops/abc123", {
      command: "echo updated",
      description: "updated loop",
      intervalHuman: "10m",
    });
    const body = JSON.parse(await readBody(res));

    expect(res.statusCode).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.id).toBe("abc123");
    expect(mockManager.update).toHaveBeenCalledWith(
      "abc123",
      expect.any(Object),
      "10m",
    );
  });

  it("PATCH /api/loops/:id returns 404 when not found", async () => {
    mockManager.update.mockResolvedValue(false);

    const res = await httpRequest(port, "PATCH", "/api/loops/missing", {
      command: "echo updated",
      description: "updated loop",
      intervalHuman: "10m",
    });
    const body = JSON.parse(await readBody(res));

    expect(res.statusCode).toBe(404);
    expect(body.ok).toBe(false);
  });



  it("POST /api/loops/:id/pause returns 200 when loop exists", async () => {
    mockManager.pause.mockReturnValue(true);

    const res = await httpRequest(port, "POST", "/api/loops/abc123/pause");
    const body = JSON.parse(await readBody(res));

    expect(res.statusCode).toBe(200);
    expect(body.ok).toBe(true);
    expect(mockManager.pause).toHaveBeenCalledWith("abc123");
  });

  it("POST /api/loops/:id/pause returns 404 when loop not found", async () => {
    mockManager.pause.mockReturnValue(false);

    const res = await httpRequest(port, "POST", "/api/loops/missing/pause");
    const body = JSON.parse(await readBody(res));

    expect(res.statusCode).toBe(404);
    expect(body.ok).toBe(false);
  });



  it("GET /api/tasks returns 200 with array", async () => {
    const res = await httpRequest(port, "GET", "/api/tasks");
    const body = JSON.parse(await readBody(res));

    expect(res.statusCode).toBe(200);
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(mockTaskManager.list).toHaveBeenCalledOnce();
  });



  it("GET /api/projects returns 200 with array", async () => {
    const res = await httpRequest(port, "GET", "/api/projects");
    const body = JSON.parse(await readBody(res));

    expect(res.statusCode).toBe(200);
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(mockProjectManager.getAll).toHaveBeenCalledOnce();
  });



  it("GET /api/events returns text/event-stream content-type", async () => {
    const res = await httpRequest(port, "GET", "/api/events");

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/event-stream");
    expect(res.headers["cache-control"]).toContain("no-cache");

    // SSE streams never end — destroy to clean up the connection.
    res.destroy();
  });



  it("GET /api/docs returns HTML content-type", async () => {
    const res = await httpRequest(port, "GET", "/api/docs");
    const body = await readBody(res);

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(body).toContain("<html");
  });



  it("GET /api/openapi.json returns JSON with openapi field", async () => {
    const res = await httpRequest(port, "GET", "/api/openapi.json");
    const body = JSON.parse(await readBody(res));

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("application/json");
    expect(body.openapi).toBe("3.0.3");
    expect(body.info).toBeDefined();
    expect(body.paths).toBeDefined();
  });



  it("GET / returns HTML (Swagger UI)", async () => {
    const res = await httpRequest(port, "GET", "/");
    const body = await readBody(res);

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(body).toContain("<html");
  });



  it("unknown route returns 404 error envelope", async () => {
    const res = await httpRequest(port, "GET", "/api/nonexistent");
    const body = JSON.parse(await readBody(res));

    expect(res.statusCode).toBe(404);
    expect(body.ok).toBe(false);
    expect(body.error.message).toBeTruthy();
  });

  it("unsupported method on known path returns 404", async () => {
    // PUT /api/loops is not registered — matchRoute requires exact method.
    const res = await httpRequest(port, "PUT", "/api/loops");
    const body = JSON.parse(await readBody(res));

    expect(res.statusCode).toBe(404);
    expect(body.ok).toBe(false);
  });



  it("all success responses use { ok: true, data } structure", async () => {
    const res = await httpRequest(port, "GET", "/api/loops");
    const body = JSON.parse(await readBody(res));

    expect(body).toEqual({
      ok: true,
      data: expect.any(Array),
    });
  });

  it("all error responses use { ok: false, error: { message } } structure", async () => {
    mockManager.status.mockReturnValue(null);

    const res = await httpRequest(port, "GET", "/api/loops/missing");
    const body = JSON.parse(await readBody(res));

    expect(body).toEqual({
      ok: false,
      error: {
        message: expect.any(String),
      },
    });
  });
});
