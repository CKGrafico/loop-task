import http from "node:http";
import fs from "node:fs";
import { LoopManager } from "./manager.js";
import { TaskManager } from "./task-manager.js";
import { ProjectManager } from "./projects.js";
import { HTTP_API_PORT, HTTP_API_HOST, LOG_TAIL_DEFAULT } from "../config/constants.js";
import { daemonLog } from "./daemon-log.js";
import { tail } from "../shared/tail.js";
import { buildLoopOptions } from "../loop-config.js";
import type { LoopOptions, TaskDefinition } from "../types.js";

interface RouteMatch {
  params: Record<string, string>;
  handler: (req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>) => void | Promise<void>;
}

type RouteHandler = (req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>) => void | Promise<void>;

interface RouteEntry {
  method: string;
  segments: string[];
  handler: RouteHandler;
}

function sendJson(res: http.ServerResponse, status: number, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function sendOk(res: http.ServerResponse, data?: unknown, status = 200): void {
  sendJson(res, status, { ok: true, data: data ?? null });
}

function sendError(res: http.ServerResponse, status: number, message: string): void {
  sendJson(res, status, { ok: false, error: { message } });
}

function sendNotFound(res: http.ServerResponse, id: string): void {
  sendError(res, 404, `Not found: ${id}`);
}

function sendMethodNotAllowed(res: http.ServerResponse): void {
  sendError(res, 405, "Method not allowed");
}

function matchRoute(routes: RouteEntry[], method: string, pathSegments: string[]): RouteMatch | null {
  for (const route of routes) {
    if (route.method !== method) continue;
    if (route.segments.length !== pathSegments.length) continue;

    const params: Record<string, string> = {};
    let matched = true;

    for (let i = 0; i < route.segments.length; i++) {
      const routeSeg = route.segments[i];
      const pathSeg = pathSegments[i];

      if (routeSeg.startsWith(":")) {
        params[routeSeg.slice(1)] = decodeURIComponent(pathSeg);
      } else if (routeSeg !== pathSeg) {
        matched = false;
        break;
      }
    }

    if (matched) {
      return { params, handler: route.handler };
    }
  }
  return null;
}

function parsePath(url: string | undefined): string[] {
  if (!url) return [];
  const pathname = url.split("?")[0] ?? "";
  return pathname.split("/").filter((s) => s.length > 0);
}

function parseQuery(url: string | undefined): URLSearchParams {
  if (!url) return new URLSearchParams();
  const qs = url.split("?")[1] ?? "";
  return new URLSearchParams(qs);
}

async function readBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString();
      if (body.length > 1024 * 1024) {
        reject(new Error("Body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

export class HttpApiServer {
  private server: http.Server;
  private manager: LoopManager;
  private taskManager: TaskManager;
  private projectManager: ProjectManager;
  private routes: RouteEntry[] = [];
  private sseClients = new Set<http.ServerResponse>();

  constructor(manager: LoopManager, taskManager: TaskManager, projectManager: ProjectManager) {
    this.manager = manager;
    this.taskManager = taskManager;
    this.projectManager = projectManager;
    this.server = http.createServer((req, res) => this.handleRequest(req, res));
    this.registerRoutes();
  }

  async listen(port: number = HTTP_API_PORT, host: string = HTTP_API_HOST): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.on("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE") {
          daemonLog(`HTTP API server: port ${port} already in use, skipping HTTP transport`);
          resolve();
        } else {
          reject(err);
        }
      });
      this.server.listen(port, host, () => {
        daemonLog(`HTTP API server listening on ${host}:${port}`);
        resolve();
      });
    });
  }

  async close(): Promise<void> {
    for (const client of this.sseClients) {
      client.destroy();
    }
    this.sseClients.clear();
    return new Promise((resolve) => {
      this.server.close(() => resolve());
    });
  }

  broadcastEvent(event: string, data?: unknown): void {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data ?? {})}\n\n`;
    for (const client of this.sseClients) {
      try {
        client.write(payload);
      } catch {
        this.sseClients.delete(client);
      }
    }
  }

  private registerRoutes(): void {
    const r = (
      method: string,
      path: string,
      handler: RouteHandler
    ): void => {
      const segments = path.split("/").filter((s) => s.length > 0);
      this.routes.push({ method, segments, handler });
    };

    // ── Loops ──────────────────────────────────────────────────────
    r("GET", "/api/loops", (_req, res) => {
      sendOk(res, this.manager.list());
    });

    r("GET", "/api/loops/:id", (_req, res, params) => {
      const meta = this.manager.status(params.id);
      if (!meta) {
        sendNotFound(res, params.id);
        return;
      }
      sendOk(res, meta);
    });

    r("POST", "/api/loops", async (req, res) => {
      try {
        const body = await readBody(req) as Record<string, unknown>;
        const intervalHuman = (body.intervalHuman as string) ?? "5m";
        const { options } = buildLoopOptions(intervalHuman, {
          command: body.command as string | undefined,
          commandArgs: body.commandArgs as string[] | undefined,
          taskId: body.taskId as string | null | undefined,
          cwd: body.cwd as string | undefined,
          now: body.now as boolean | undefined,
          maxRuns: body.maxRuns as number | string | null | undefined,
          verbose: body.verbose as boolean | undefined,
          description: body.description as string | undefined,
          projectId: body.projectId as string | undefined,
          offset: body.offset as number | null | undefined,
        });
        const id = this.manager.start(options, intervalHuman);
        sendOk(res, { id }, 201);
      } catch (err) {
        sendError(res, 400, err instanceof Error ? err.message : String(err));
      }
    });

    r("PATCH", "/api/loops/:id", async (req, res, params) => {
      try {
        const body = await readBody(req) as Record<string, unknown>;
        const intervalHuman = (body.intervalHuman as string) ?? "5m";
        const { options } = buildLoopOptions(intervalHuman, {
          command: body.command as string | undefined,
          commandArgs: body.commandArgs as string[] | undefined,
          taskId: body.taskId as string | null | undefined,
          cwd: body.cwd as string | undefined,
          now: body.now as boolean | undefined,
          maxRuns: body.maxRuns as number | string | null | undefined,
          verbose: body.verbose as boolean | undefined,
          description: body.description as string | undefined,
          projectId: body.projectId as string | undefined,
          offset: body.offset as number | null | undefined,
        });
        const ok = await this.manager.update(params.id, options, intervalHuman);
        if (!ok) {
          sendNotFound(res, params.id);
          return;
        }
        sendOk(res, { id: params.id });
      } catch (err) {
        sendError(res, 400, err instanceof Error ? err.message : String(err));
      }
    });

    r("DELETE", "/api/loops/:id", async (_req, res, params) => {
      const ok = await this.manager.delete(params.id);
      if (!ok) {
        sendNotFound(res, params.id);
        return;
      }
      sendOk(res);
    });

    r("POST", "/api/loops/:id/pause", (_req, res, params) => {
      if (!this.manager.pause(params.id)) {
        sendNotFound(res, params.id);
        return;
      }
      sendOk(res);
    });

    r("POST", "/api/loops/:id/resume", (_req, res, params) => {
      if (!this.manager.resume(params.id)) {
        sendNotFound(res, params.id);
        return;
      }
      sendOk(res);
    });

    r("POST", "/api/loops/:id/trigger", (_req, res, params) => {
      if (this.manager.isMaxRunsBlocked(params.id)) {
        sendError(res, 400, "Max runs reached");
        return;
      }
      if (this.manager.isRunning(params.id)) {
        sendError(res, 409, "Loop is already running");
        return;
      }
      if (!this.manager.trigger(params.id)) {
        sendNotFound(res, params.id);
        return;
      }
      sendOk(res);
    });

    r("POST", "/api/loops/:id/stop", (_req, res, params) => {
      if (!this.manager.stopLoop(params.id)) {
        sendNotFound(res, params.id);
        return;
      }
      sendOk(res);
    });

    r("POST", "/api/loops/stop-all", (_req, res) => {
      const count = this.manager.stopAllLoops();
      sendOk(res, { count });
    });

    // ── Loop logs ─────────────────────────────────────────────────
    r("GET", "/api/loops/:id/logs", (_req, res, params) => {
      const logPath = this.manager.getLogPath(params.id);
      if (!logPath) {
        sendNotFound(res, params.id);
        return;
      }
      const query = parseQuery(_req.url);
      const tailCount = parseInt(query.get("tail") ?? String(LOG_TAIL_DEFAULT), 10);

      if (!fs.existsSync(logPath)) {
        sendOk(res, "");
        return;
      }
      const content = fs.readFileSync(logPath, "utf-8");
      sendOk(res, tail(content, tailCount).join("\n"));
    });

    r("GET", "/api/loops/:id/logs/stream", (_req, res, params) => {
      const logPath = this.manager.getLogPath(params.id);
      if (!logPath) {
        sendNotFound(res, params.id);
        return;
      }

      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      });

      const query = parseQuery(_req.url);
      const tailCount = parseInt(query.get("tail") ?? "0", 10);

      if (fs.existsSync(logPath)) {
        const content = fs.readFileSync(logPath, "utf-8");
        for (const line of tail(content, tailCount)) {
          if (line) {
            res.write(`data: ${line}\n\n`);
          }
        }
      }

      let fileSize = fs.existsSync(logPath) ? fs.statSync(logPath).size : 0;

      const watcher = fs.watch(logPath, (eventType) => {
        if (eventType === "rename" && !fs.existsSync(logPath)) {
          watcher.close();
          res.write("event: end\ndata: {}\n\n");
          res.end();
          return;
        }

        if (eventType === "change") {
          try {
            const stat = fs.statSync(logPath);
            if (stat.size > fileSize) {
              const fd = fs.openSync(logPath, "r");
              const buf = Buffer.alloc(stat.size - fileSize);
              fs.readSync(fd, buf, 0, buf.length, fileSize);
              fs.closeSync(fd);
              fileSize = stat.size;
              for (const line of buf.toString().split("\n")) {
                if (line) {
                  res.write(`data: ${line}\n\n`);
                }
              }
            }
          } catch {
            watcher.close();
            res.end();
          }
        }
      });

      _req.on("close", () => {
        watcher.close();
        res.end();
      });
    });

    r("GET", "/api/loops/:id/runs/:num", (_req, res, params) => {
      const { id, num } = params;
      const logPath = this.manager.getLogPath(id);
      if (!logPath || !fs.existsSync(logPath)) {
        sendOk(res, "");
        return;
      }

      const meta = this.manager.status(id);
      if (!meta) {
        sendNotFound(res, id);
        return;
      }

      const runNumber = parseInt(num, 10);
      const records = meta.runHistory
        .filter((r) => r.runNumber === runNumber)
        .sort((a, b) => a.logOffset - b.logOffset);

      if (records.length === 0) {
        sendOk(res, "");
        return;
      }

      const buffer = fs.readFileSync(logPath);
      const allSorted = meta.runHistory.slice().sort((a, b) => a.logOffset - b.logOffset);

      const parts = records.map((record) => {
        const start = record.logOffset;
        const idx = allSorted.indexOf(record);
        const end = idx < allSorted.length - 1 ? allSorted[idx + 1].logOffset : buffer.length;
        return buffer.toString("utf-8", start, end);
      });

      sendOk(res, parts.join(""));
    });

    // ── Tasks ──────────────────────────────────────────────────────
    r("GET", "/api/tasks", (_req, res) => {
      sendOk(res, this.taskManager.list());
    });

    r("GET", "/api/tasks/:id", (_req, res, params) => {
      const task = this.taskManager.get(params.id);
      if (!task) {
        sendNotFound(res, params.id);
        return;
      }
      sendOk(res, task);
    });

    r("POST", "/api/tasks", async (req, res) => {
      try {
        const body = await readBody(req) as Omit<TaskDefinition, "createdAt">;
        if (!body.name?.trim()) {
          sendError(res, 400, "Task name is required");
          return;
        }
        if (!body.command?.trim()) {
          sendError(res, 400, "Task command is required");
          return;
        }
        const task = this.taskManager.create(body);
        sendOk(res, task, 201);
      } catch (err) {
        sendError(res, 400, err instanceof Error ? err.message : String(err));
      }
    });

    r("PATCH", "/api/tasks/:id", async (req, res, params) => {
      try {
        const body = await readBody(req) as Omit<TaskDefinition, "id" | "createdAt">;
        const updated = this.taskManager.update(params.id, body);
        if (!updated) {
          sendNotFound(res, params.id);
          return;
        }
        sendOk(res, updated);
      } catch (err) {
        sendError(res, 400, err instanceof Error ? err.message : String(err));
      }
    });

    r("DELETE", "/api/tasks/:id", (_req, res, params) => {
      if (!this.taskManager.delete(params.id)) {
        sendNotFound(res, params.id);
        return;
      }
      sendOk(res);
    });

    // ── Projects ───────────────────────────────────────────────────
    r("GET", "/api/projects", (_req, res) => {
      sendOk(res, this.projectManager.getAll());
    });

    r("POST", "/api/projects", async (req, res) => {
      try {
        const body = await readBody(req) as { name?: string; color?: string };
        if (!body.name?.trim()) {
          sendError(res, 400, "Project name is required");
          return;
        }
        const project = this.projectManager.create(body.name.trim(), body.color ?? "#ffffff");
        sendOk(res, project, 201);
      } catch (err) {
        sendError(res, 400, err instanceof Error ? err.message : String(err));
      }
    });

    r("PATCH", "/api/projects/:id", async (req, res, params) => {
      try {
        const body = await readBody(req) as { name?: string; color?: string };
        if (!body.name?.trim()) {
          sendError(res, 400, "Project name is required");
          return;
        }
        this.projectManager.update(params.id, body.name.trim(), body.color);
        sendOk(res);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("not found")) {
          sendNotFound(res, params.id);
        } else {
          sendError(res, 400, msg);
        }
      }
    });

    r("DELETE", "/api/projects/:id", (_req, res, params) => {
      try {
        this.projectManager.delete(params.id);
        sendOk(res);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("not found") || msg.includes("system")) {
          sendError(res, 400, msg);
        } else {
          sendError(res, 500, msg);
        }
      }
    });

    // ── Swagger / OpenAPI ────────────────────────────────────────
    r("GET", "/api/openapi.json", (_req, res) => {
      const spec = this.buildOpenApiSpec();
      const body = JSON.stringify(spec, null, 2);
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      });
      res.end(body);
    });

    r("GET", "/api/docs", (_req, res) => {
      const html = this.buildSwaggerHtml();
      res.writeHead(200, {
        "Content-Type": "text/html",
        "Content-Length": Buffer.byteLength(html),
      });
      res.end(html);
    });

    r("GET", "/", (_req, res) => {
      const html = this.buildSwaggerHtml();
      res.writeHead(200, {
        "Content-Type": "text/html",
        "Content-Length": Buffer.byteLength(html),
      });
      res.end(html);
    });

    // ── SSE Events ────────────────────────────────────────────────
    r("GET", "/api/events", (_req, res) => {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      });
      res.write(": connected\n\n");

      this.sseClients.add(res);

      _req.on("close", () => {
        this.sseClients.delete(res);
      });
    });
  }

  private buildOpenApiSpec(): Record<string, unknown> {
    return {
      openapi: "3.0.3",
      info: {
        title: "loop-task HTTP API",
        version: "1.0.0",
        description: "REST + SSE API for managing loops, tasks, projects, and logs. All endpoints are localhost-only (127.0.0.1).",
      },
      servers: [
        { url: `http://${HTTP_API_HOST}:${HTTP_API_PORT}`, description: "Local daemon" },
      ],
      paths: {
        "/api/loops": {
          get: { summary: "List all loops", tags: ["Loops"], responses: { "200": { description: "Array of loops", content: { "application/json": { schema: { type: "array" } } } } } },
          post: { summary: "Create a new loop", tags: ["Loops"], requestBody: { content: { "application/json": { schema: { type: "object", properties: { command: { type: "string" }, commandArgs: { type: "array", items: { type: "string" } }, intervalHuman: { type: "string", example: "5m" }, cwd: { type: "string" }, description: { type: "string" }, taskId: { type: "string" }, now: { type: "boolean" }, maxRuns: { type: "integer" }, verbose: { type: "boolean" }, projectId: { type: "string" }, offset: { type: "integer" } } } } } }, responses: { "201": { description: "Loop created", content: { "application/json": { schema: { type: "object", properties: { id: { type: "string" } } } } } }, "400": { description: "Validation error" } } },
        },
        "/api/loops/{id}": {
          get: { summary: "Get loop status", tags: ["Loops"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Loop details" }, "404": { description: "Not found" } } },
          patch: { summary: "Update a loop", tags: ["Loops"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { content: { "application/json": { schema: { type: "object" } } } }, responses: { "200": { description: "Updated" }, "400": { description: "Validation error" }, "404": { description: "Not found" } } },
          delete: { summary: "Delete a loop", tags: ["Loops"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Deleted" }, "404": { description: "Not found" } } },
        },
        "/api/loops/{id}/pause": { post: { summary: "Pause a loop", tags: ["Loops"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Paused" }, "404": { description: "Not found" } } } },
        "/api/loops/{id}/resume": { post: { summary: "Resume a loop", tags: ["Loops"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Resumed" }, "404": { description: "Not found" } } } },
        "/api/loops/{id}/trigger": { post: { summary: "Trigger a loop now", tags: ["Loops"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Triggered" }, "404": { description: "Not found" }, "400": { description: "Max runs reached" }, "409": { description: "Already running" } } } },
        "/api/loops/{id}/stop": { post: { summary: "Stop a loop", tags: ["Loops"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Stopped" }, "404": { description: "Not found" } } } },
        "/api/loops/stop-all": { post: { summary: "Stop all loops", tags: ["Loops"], responses: { "200": { description: "All stopped", content: { "application/json": { schema: { type: "object", properties: { count: { type: "integer" } } } } } } } } },
        "/api/loops/{id}/logs": { get: { summary: "Fetch loop logs", tags: ["Logs"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }, { name: "tail", in: "query", schema: { type: "integer", default: 50 } }], responses: { "200": { description: "Log content" }, "404": { description: "Not found" } } } },
        "/api/loops/{id}/logs/stream": { get: { summary: "Stream logs via SSE", tags: ["Logs"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }, { name: "tail", in: "query", schema: { type: "integer" } }], responses: { "200": { description: "SSE stream" }, "404": { description: "Not found" } } } },
        "/api/loops/{id}/runs/{num}": { get: { summary: "Get run-specific log", tags: ["Logs"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }, { name: "num", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Run log content" } } } },
        "/api/tasks": {
          get: { summary: "List all tasks", tags: ["Tasks"], responses: { "200": { description: "Array of tasks" } } },
          post: { summary: "Create a task", tags: ["Tasks"], requestBody: { content: { "application/json": { schema: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, command: { type: "string" }, commandArgs: { type: "array", items: { type: "string" } }, onSuccessTaskId: { type: "string" }, onFailureTaskId: { type: "string" } } } } } }, responses: { "201": { description: "Task created" }, "400": { description: "Validation error" } } },
        },
        "/api/tasks/{id}": {
          get: { summary: "Get a task", tags: ["Tasks"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Task details" }, "404": { description: "Not found" } } },
          patch: { summary: "Update a task", tags: ["Tasks"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { content: { "application/json": { schema: { type: "object" } } } }, responses: { "200": { description: "Updated" }, "404": { description: "Not found" } } },
          delete: { summary: "Delete a task", tags: ["Tasks"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Deleted" }, "404": { description: "Not found" } } },
        },
        "/api/projects": {
          get: { summary: "List all projects", tags: ["Projects"], responses: { "200": { description: "Array of projects" } } },
          post: { summary: "Create a project", tags: ["Projects"], requestBody: { content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, color: { type: "string" } } } } } }, responses: { "201": { description: "Project created" }, "400": { description: "Validation error" } } },
        },
        "/api/projects/{id}": {
          patch: { summary: "Update a project", tags: ["Projects"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, color: { type: "string" } } } } } }, responses: { "200": { description: "Updated" }, "404": { description: "Not found" }, "400": { description: "Validation error" } } },
          delete: { summary: "Delete a project", tags: ["Projects"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Deleted" }, "400": { description: "Cannot delete system project" } } },
        },
        "/api/events": { get: { summary: "Subscribe to daemon events via SSE", tags: ["Events"], responses: { "200": { description: "SSE event stream" } } } },
        "/api/openapi.json": { get: { summary: "OpenAPI 3.0 spec", tags: ["Docs"], responses: { "200": { description: "OpenAPI JSON spec" } } } },
        "/api/docs": { get: { summary: "Swagger UI", tags: ["Docs"], responses: { "200": { description: "HTML page" } } } },
      },
    };
  }

  private buildSwaggerHtml(): string {
    const specUrl = "/api/openapi.json";
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>loop-task API</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
  <style>
    body { margin: 0; }
    .swagger-ui { max-width: 1200px; margin: 0 auto; }
    .header { background: #0d1117; color: #58a6ff; padding: 12px 24px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 14px; }
    .header a { color: #58a6ff; text-decoration: none; }
    .header a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="header">
    <strong>loop-task HTTP API</strong> &mdash;
    <a href="/api/openapi.json">OpenAPI JSON</a> &mdash;
    <a href="/api/docs">Swagger UI</a>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      window.ui = SwaggerUIBundle({
        url: "${specUrl}",
        dom_id: "#swagger-ui",
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis],
        layout: "BaseLayout",
      });
    };
  </script>
</body>
</html>`;
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      const pathSegments = parsePath(req.url);
      const match = matchRoute(this.routes, req.method ?? "GET", pathSegments);

      if (!match) {
        sendError(res, 404, `Not found: ${req.method} ${req.url}`);
        return;
      }

      await match.handler(req, res, match.params);
    } catch (err) {
      if (!res.headersSent) {
        sendError(res, 500, err instanceof Error ? err.message : String(err));
      }
    }
  }
}
