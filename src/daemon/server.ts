import net from "node:net";
import fs from "node:fs";
import type { IpcRequest } from "../types.js";
import { LoopManager } from "./manager.js";
import { TaskManager } from "./task-manager.js";
import { getSocketPath, removeSocketFile } from "./state.js";
import { t } from "../i18n/index.js";
import { LOG_TAIL_DEFAULT } from "../config/constants.js";
import { send } from "../ipc/send.js";
import { tail } from "../shared/tail.js";
import { streamLogFollow } from "../ipc/handlers/logs-stream.js";


export class IpcServer {
  private server: net.Server;
  private manager: LoopManager;
  private taskManager: TaskManager;
  private socketPath: string;
  private clients = new Set<net.Socket>();

  constructor(manager: LoopManager, taskManager: TaskManager) {
    this.manager = manager;
    this.taskManager = taskManager;
    this.socketPath = getSocketPath();
    this.server = net.createServer((socket) => this.handleConnection(socket));
  }

  async listen(): Promise<void> {
    removeSocketFile();
    return new Promise((resolve, reject) => {
      this.server.on("error", reject);
      this.server.listen(this.socketPath, () => {
        this.server.removeListener("error", reject);
        resolve();
      });
    });
  }

  async close(): Promise<void> {
    for (const client of this.clients) {
      client.destroy();
    }
    this.clients.clear();
    return new Promise((resolve) => {
      this.server.close(() => {
        removeSocketFile();
        resolve();
      });
    });
  }

  private handleConnection(socket: net.Socket): void {
    this.clients.add(socket);
    let buffer = "";

    socket.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.trim()) {
          try {
            const request = JSON.parse(line) as IpcRequest;
            this.handleRequest(request, socket);
          } catch {
            send(socket, { type: "error", message: t("errors.invalidJson") });
          }
        }
      }
    });

    socket.on("close", () => {
      this.clients.delete(socket);
    });

    socket.on("error", () => {
      this.clients.delete(socket);
    });
  }

  private respondOk(
    socket: net.Socket,
    ok: boolean,
    id: string,
    data?: unknown
  ): void {
    if (!ok) {
      send(socket, { type: "error", message: t("errors.loopNotFound", { id }) });
    } else if (data !== undefined) {
      send(socket, { type: "ok", data });
    } else {
      send(socket, { type: "ok" });
    }
  }

  private async handleRequest(
    request: IpcRequest,
    socket: net.Socket
  ): Promise<void> {
    switch (request.type) {
      case "start": {
        const { intervalHuman, ...options } = request.payload;
        const id = this.manager.start(options, intervalHuman);
        send(socket, { type: "ok", data: { id } });
        break;
      }

      case "update": {
        const { id, intervalHuman, ...options } = request.payload;
        const ok = await this.manager.update(id, options, intervalHuman);
        this.respondOk(socket, ok, id, ok ? { id } : undefined);
        break;
      }

      case "list": {
        send(socket, { type: "ok", data: this.manager.list() });
        break;
      }

      case "status": {
        const meta = this.manager.status(request.payload.id);
        this.respondOk(socket, meta !== null, request.payload.id, meta ?? undefined);
        break;
      }

      case "pause": {
        this.respondOk(socket, this.manager.pause(request.payload.id), request.payload.id);
        break;
      }

      case "resume": {
        this.respondOk(socket, this.manager.resume(request.payload.id), request.payload.id);
        break;
      }

      case "stop-loop": {
        this.respondOk(socket, this.manager.stopLoop(request.payload.id), request.payload.id);
        break;
      }

      case "play-loop": {
        if (this.manager.isMaxRunsBlocked(request.payload.id)) {
          send(socket, { type: "error", message: t("errors.maxRunsReached") });
          break;
        }
        this.respondOk(socket, this.manager.playLoop(request.payload.id), request.payload.id);
        break;
      }

      case "trigger": {
        if (this.manager.isMaxRunsBlocked(request.payload.id)) {
          send(socket, { type: "error", message: t("errors.maxRunsReached") });
          break;
        }
        if (this.manager.isRunning(request.payload.id)) {
          send(socket, { type: "error", message: t("errors.triggerWhileRunning") });
          break;
        }
        this.respondOk(socket, this.manager.trigger(request.payload.id), request.payload.id);
        break;
      }

      case "delete": {
        const ok = await this.manager.delete(request.payload.id);
        this.respondOk(socket, ok, request.payload.id);
        break;
      }

      case "run-log": {
        this.handleRunLog(request, socket);
        break;
      }

      case "run-log-stream": {
        this.handleRunLogStream(request, socket);
        break;
      }

      case "attach":
      case "logs": {
        this.handleLogs(request, socket);
        break;
      }

      case "task-create": {
        const task = this.taskManager.create(request.payload);
        send(socket, { type: "ok", data: task });
        break;
      }

      case "task-update": {
        const updated = this.taskManager.update(request.payload.id, request.payload);
        this.respondOk(socket, updated !== null, request.payload.id, updated ?? undefined);
        break;
      }

      case "task-list": {
        send(socket, { type: "ok", data: this.taskManager.list() });
        break;
      }

      case "task-get": {
        const task = this.taskManager.get(request.payload.id);
        this.respondOk(socket, task !== null, request.payload.id, task ?? undefined);
        break;
      }

      case "task-delete": {
        const ok = this.taskManager.delete(request.payload.id);
        this.respondOk(socket, ok, request.payload.id);
        break;
      }

      case "project-list": {
        send(socket, { type: "ok", data: this.manager.listProjects() });
        break;
      }

      case "project-create": {
        const { name, color } = request.payload;
        if (!name || !name.trim()) {
          send(socket, { type: "error", message: t("project.error.nameRequired") });
          break;
        }
        const project = this.manager.createProject(name.trim(), color);
        send(socket, { type: "ok", data: project });
        break;
      }

      case "project-update": {
        const { id, name, color } = request.payload;
        if (!name || !name.trim()) {
          send(socket, { type: "error", message: t("project.error.nameEmpty") });
          break;
        }
        try {
          this.manager.updateProject(id, name.trim(), color);
          send(socket, { type: "ok" });
        } catch (err) {
          send(socket, { type: "error", message: err instanceof Error ? err.message : String(err) });
        }
        break;
      }

      case "project-delete": {
        try {
          this.manager.deleteProject(request.payload.id);
          send(socket, { type: "ok" });
        } catch (err) {
          send(socket, { type: "error", message: err instanceof Error ? err.message : String(err) });
        }
        break;
      }

      case "shutdown": {
        send(socket, { type: "ok" });
        await this.manager.shutdown();
        await this.close();
        process.exit(0);
      }
    }
  }

  private handleRunLog(
    request: Extract<IpcRequest, { type: "run-log" }>,
    socket: net.Socket
  ): void {
    const { id, runNumber } = request.payload;
    const logPath = this.manager.getLogPath(id);
    if (!logPath || !fs.existsSync(logPath)) {
      send(socket, { type: "ok", data: "" });
      return;
    }

    const meta = this.manager.status(id);
    if (!meta) {
      send(socket, { type: "ok", data: "" });
      return;
    }

    const records = meta.runHistory
      .filter((r) => r.runNumber === runNumber)
      .sort((a, b) => a.logOffset - b.logOffset);

    if (records.length === 0) {
      send(socket, { type: "ok", data: "" });
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

    send(socket, { type: "ok", data: parts.join("") });
  }

  private handleRunLogStream(
    request: Extract<IpcRequest, { type: "run-log-stream" }>,
    socket: net.Socket
  ): void {
    const { id, runNumber } = request.payload;
    const meta = this.manager.status(id);
    if (!meta) {
      send(socket, { type: "error", message: t("errors.loopNotFound", { id }) });
      return;
    }
    const records = meta.runHistory
      .filter((r) => r.runNumber === runNumber)
      .sort((a, b) => a.logOffset - b.logOffset);
    if (records.length === 0) {
      send(socket, { type: "ok", data: "" });
      return;
    }

    const logPath = this.manager.getLogPath(id);
    if (!logPath || !fs.existsSync(logPath)) {
      send(socket, { type: "ok", data: "" });
      return;
    }

    const firstOffset = records[0].logOffset;
    const stat = fs.statSync(logPath);

    if (stat.size > firstOffset) {
      const fd = fs.openSync(logPath, "r");
      const buf = Buffer.alloc(stat.size - firstOffset);
      fs.readSync(fd, buf, 0, buf.length, firstOffset);
      fs.closeSync(fd);
      for (const line of buf.toString().split("\n")) {
        if (line) {
          send(socket, { type: "data", line });
        }
      }
    }

    const allCompleted = records.every((r) => r.status === "completed");
    if (allCompleted) {
      send(socket, { type: "end" });
      return;
    }

    let fileSize = stat.size;

    const watcher = fs.watch(logPath, (eventType) => {
      if (eventType === "rename" && !fs.existsSync(logPath)) {
        watcher.close();
        send(socket, { type: "end" });
        return;
      }

      if (eventType === "change") {
        try {
          const s = fs.statSync(logPath);
          if (s.size > fileSize) {
            const fd = fs.openSync(logPath, "r");
            const buf = Buffer.alloc(s.size - fileSize);
            fs.readSync(fd, buf, 0, buf.length, fileSize);
            fs.closeSync(fd);
            fileSize = s.size;
            for (const line of buf.toString().split("\n")) {
              if (line) {
                send(socket, { type: "data", line });
              }
            }
          }
        } catch {
          watcher.close();
          send(socket, { type: "end" });
        }
      }
    });

    socket.on("close", () => watcher.close());
    socket.on("error", () => watcher.close());
  }

  private handleLogs(
    request: Extract<IpcRequest, { type: "attach" | "logs" }>,
    socket: net.Socket
  ): void {
    const id = request.payload.id;
    const logPath = this.manager.getLogPath(id);
    if (!logPath) {
      send(socket, { type: "error", message: t("errors.loopNotFound", { id }) });
      return;
    }

    if (!fs.existsSync(logPath)) {
      if (request.type === "logs") {
        send(socket, { type: "ok", data: "" });
      } else {
        send(socket, { type: "error", message: t("errors.noLogsYet") });
      }
      return;
    }

    const follow = request.type === "attach" || (request.type === "logs" && request.payload.follow);
    const tailCount = request.type === "logs" ? (request.payload.tail ?? LOG_TAIL_DEFAULT) : 0;

    if (follow) {
      streamLogFollow(logPath, socket, tailCount);
    } else {
      const content = fs.readFileSync(logPath, "utf-8");
      send(socket, { type: "ok", data: tail(content, tailCount).join("\n") });
    }
  }
}
