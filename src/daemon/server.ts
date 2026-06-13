import net from "node:net";
import fs from "node:fs";
import type { IpcRequest, IpcResponse } from "../types.js";
import { LoopManager } from "./manager.js";
import { getSocketPath, removeSocketFile } from "./state.js";

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
            this.send(socket, { type: "error", message: "Invalid JSON" });
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

  private async handleRequest(
    request: IpcRequest,
    socket: net.Socket
  ): Promise<void> {
    switch (request.type) {
      case "start": {
        const { intervalHuman, ...options } = request.payload;
        const id = this.manager.start(options, intervalHuman);
        this.send(socket, { type: "ok", data: { id } });
        break;
      }

      case "list": {
        const loops = this.manager.list();
        this.send(socket, { type: "ok", data: loops });
        break;
      }

      case "status": {
        const meta = this.manager.status(request.payload.id);
        if (!meta) {
          this.send(socket, { type: "error", message: `Loop ${request.payload.id} not found` });
        } else {
          this.send(socket, { type: "ok", data: meta });
        }
        break;
      }

      case "pause": {
        const ok = this.manager.pause(request.payload.id);
        if (!ok) {
          this.send(socket, { type: "error", message: `Loop ${request.payload.id} not found` });
        } else {
          this.send(socket, { type: "ok" });
        }
        break;
      }

      case "resume": {
        const ok = this.manager.resume(request.payload.id);
        if (!ok) {
          this.send(socket, { type: "error", message: `Loop ${request.payload.id} not found` });
        } else {
          this.send(socket, { type: "ok" });
        }
        break;
      }

      case "delete": {
        const ok = await this.manager.delete(request.payload.id);
        if (!ok) {
          this.send(socket, { type: "error", message: `Loop ${request.payload.id} not found` });
        } else {
          this.send(socket, { type: "ok" });
        }
        break;
      }

      case "attach":
      case "logs": {
        const id = request.payload.id;
        const logPath = this.manager.getLogPath(id);
        if (!logPath) {
          this.send(socket, { type: "error", message: `Loop ${id} not found` });
          return;
        }

        if (!fs.existsSync(logPath)) {
          if (request.type === "logs") {
            this.send(socket, { type: "ok", data: "" });
          } else {
            this.send(socket, { type: "error", message: "No logs yet" });
          }
          return;
        }

        const follow = request.type === "attach" || (request.type === "logs" && request.payload.follow);
        const tail = request.type === "logs" ? (request.payload.tail ?? 50) : 0;

        if (follow) {
          this.streamLogFollow(logPath, socket, tail);
        } else {
          const content = fs.readFileSync(logPath, "utf-8");
          const lines = content.split("\n");
          const tailLines = tail > 0 ? lines.slice(-tail) : lines;
          this.send(socket, { type: "ok", data: tailLines.join("\n") });
        }
        break;
      }

      case "shutdown": {
        this.send(socket, { type: "ok" });
        await this.manager.shutdown();
        await this.close();
        process.exit(0);
      }
    }
  }

  private streamLogFollow(
    logPath: string,
    socket: net.Socket,
    tailCount: number
  ): void {
    if (fs.existsSync(logPath)) {
      const content = fs.readFileSync(logPath, "utf-8");
      const lines = content.split("\n");
      const tailLines = tailCount > 0 ? lines.slice(-tailCount) : lines;
      for (const line of tailLines) {
        if (line) {
          this.send(socket, { type: "data", line });
        }
      }
    }

    let fileSize = fs.existsSync(logPath) ? fs.statSync(logPath).size : 0;

    const watcher = fs.watch(logPath, (eventType) => {
      if (eventType === "change") {
        try {
          const stat = fs.statSync(logPath);
          if (stat.size > fileSize) {
            const fd = fs.openSync(logPath, "r");
            const buf = Buffer.alloc(stat.size - fileSize);
            fs.readSync(fd, buf, 0, buf.length, fileSize);
            fs.closeSync(fd);
            fileSize = stat.size;
            const newContent = buf.toString();
            for (const line of newContent.split("\n")) {
              if (line) {
                this.send(socket, { type: "data", line });
              }
            }
          }
        } catch {
          // file may have been deleted
        }
      }
    });

    socket.on("close", () => {
      watcher.close();
    });

    socket.on("error", () => {
      watcher.close();
    });
  }

  private send(socket: net.Socket, message: IpcResponse): void {
    if (!socket.destroyed) {
      socket.write(JSON.stringify(message) + "\n");
    }
  }
}
