import http from "node:http";
import { LoopManager } from "../managers/loop-manager.js";
import { TaskManager } from "../managers/task-manager.js";
import { ProjectManager } from "../managers/project-manager.js";
import { SettingsManager } from "../settings-manager.js";
import { HTTP_API_PORT, HTTP_API_HOST } from "../../shared/config/constants.js";
import { daemonLog } from "../daemon-log.js";
import { sendError, matchRoute, parsePath } from "./helpers.js";
import type { RouteEntry } from "./helpers.js";
import { SseClientSet } from "./sse.js";
import { registerRoutes } from "./routes.js";

export class HttpApiServer {
  private server: http.Server;
  private routes: RouteEntry[] = [];
  private sseClients = new SseClientSet();
  private isListening = false;

  constructor(
    private manager: LoopManager,
    private taskManager: TaskManager,
    private projectManager: ProjectManager,
    private settingsManager: SettingsManager,
  ) {
    this.server = http.createServer((req, res) => this.handleRequest(req, res));
    this.routes = registerRoutes({
      manager: this.manager,
      taskManager: this.taskManager,
      projectManager: this.projectManager,
      sseClients: this.sseClients,
      settingsManager: this.settingsManager,
    });
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
        this.isListening = true;
        daemonLog(`HTTP API server listening on ${host}:${port}`);
        resolve();
      });
    });
  }

  async close(): Promise<void> {
    if (!this.isListening) return;
    this.isListening = false;
    this.sseClients.destroyAll();
    return new Promise((resolve) => {
      this.server.close(() => {
        resolve();
      });
      // Node's server.close() stops accepting new connections but leaves
      // existing keep-alive sockets open, so a browser tab (e.g. Swagger UI)
      // keeps being served on its persistent connection. Force them closed so
      // the port is actually released when the API is toggled off.
      this.server.closeAllConnections?.();
    });
  }

  async restart(port: number = HTTP_API_PORT, host: string = HTTP_API_HOST): Promise<void> {
    await this.close();
    await this.listen(port, host);
  }

  broadcastEvent(event: string, data?: unknown): void {
    this.sseClients.broadcast(event, data);
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
