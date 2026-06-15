import net from "node:net";
import fs from "node:fs";
import type { IpcRequest } from "../types.js";
import { LoopManager } from "./manager.js";
import { getSocketPath, removeSocketFile } from "./state.js";
import { t } from "../i18n/index.js";
import { LOG_TAIL_DEFAULT } from "../config/constants.js";
import { send } from "../ipc/send.js";
import { tail } from "../shared/tail.js";
import { streamLogFollow } from "../ipc/handlers/logs-stream.js";

export class IpcServer {
  private server: net.Server;
  private manager: LoopManager;
  private socketPath: string;
  private clients = new Set<net.Socket>();

  constructor(manager: LoopManager) {
    this.manager = manager;
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

      case "trigger": {
        this.respondOk(socket, this.manager.trigger(request.payload.id), request.payload.id);
        break;
      }

      case "delete": {
        const ok = await this.manager.delete(request.payload.id);
        this.respondOk(socket, ok, request.payload.id);
        break;
      }

      case "attach":
      case "logs": {
        this.handleLogs(request, socket);
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
