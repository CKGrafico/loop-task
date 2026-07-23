import net from "node:net";
import type { IpcRequest } from "../../types.js";
import { LoopManager } from "../managers/loop-manager.js";
import { TaskManager } from "../managers/task-manager.js";
import { SettingsManager } from "../settings-manager.js";
import type { TelemetryManager } from "../telemetry/telemetry-manager.js";
import { getSocketPath, removeSocketFile } from "../state/index.js";
import { t } from "../../shared/i18n/index.js";
import { send } from "../ipc/send.js";
import { dispatch } from "./handlers/index.js";


export class IpcServer {
  private server: net.Server;
  private manager: LoopManager;
  private taskManager: TaskManager;
  private settingsManager: SettingsManager;
  private telemetryManager: TelemetryManager;
  private socketPath: string;
  private clients = new Set<net.Socket>();
  private subscribers = new Set<net.Socket>();

  constructor(manager: LoopManager, taskManager: TaskManager, settingsManager: SettingsManager, telemetryManager: TelemetryManager) {
    this.manager = manager;
    this.taskManager = taskManager;
    this.settingsManager = settingsManager;
    this.telemetryManager = telemetryManager;
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
    this.subscribers.clear();
    return new Promise((resolve) => {
      this.server.close(() => {
        removeSocketFile();
        resolve();
      });
    });
  }

  pushEvent(event: string, data?: unknown): void {
    for (const socket of this.subscribers) {
      try {
        send(socket, { type: "event", event, data });
      } catch {
        this.subscribers.delete(socket);
      }
    }
  }

  private handleConnection(socket: net.Socket): void {
    this.clients.add(socket);
    socket.on("close", () => {
      this.clients.delete(socket);
      this.subscribers.delete(socket);
    });
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
    // Dispatch to extracted handlers
    const handled = await dispatch(request, socket, {
      manager: this.manager,
      taskManager: this.taskManager,
      settingsManager: this.settingsManager,
      telemetryManager: this.telemetryManager,
      respondOk: (s: import("node:net").Socket, ok: boolean, id: string, data?: unknown) => this.respondOk(s, ok, id, data),
    });

    if (!handled) {
      // Handle non-dispatchable cases inline
      switch (request.type) {
        case "subscribe": {
          this.subscribers.add(socket);
          send(socket, { type: "ok" });
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
  }
}
