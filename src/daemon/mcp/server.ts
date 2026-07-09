import http from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import type { LoopManager } from "../managers/loop-manager.js";
import type { TaskManager } from "../managers/task-manager.js";
import type { ProjectManager } from "../managers/project-manager.js";
import { daemonLog } from "../daemon-log.js";
import { registerMcpTools } from "./tools.js";

const MCP_DEFAULT_PORT = 8846;

export class McpApiServer {
  private mcpServer: McpServer | null = null;
  private activeTransport: StdioServerTransport | SSEServerTransport | null = null;
  private httpServer: http.Server | null = null;
  private _isListening = false;
  private transportType: "stdio" | "sse";

  constructor(
    private manager: LoopManager,
    private taskManager: TaskManager,
    private projectManager: ProjectManager,
    transport?: "stdio" | "sse",
  ) {
    this.transportType = transport ?? "sse";
  }

  private createServer(): McpServer {
    const server = new McpServer(
      { name: "loop-task", version: "1.0.0" },
      { capabilities: { tools: {} } },
    );
    registerMcpTools(server, { manager: this.manager, taskManager: this.taskManager, projectManager: this.projectManager });
    return server;
  }

  get isListening(): boolean {
    return this._isListening;
  }

  async start(): Promise<void> {
    if (this._isListening) return;

    try {
      if (this.transportType === "stdio") {
        await this.startStdio();
      } else {
        await this.startSse();
      }
    } catch (err) {
      daemonLog(`MCP server failed to start: ${String(err)}`);
    }
  }

  async close(): Promise<void> {
    if (!this._isListening) return;
    this._isListening = false;

    if (this.mcpServer) {
      try {
        await this.mcpServer.close();
      } catch {
        // ignore close errors
      }
      this.mcpServer = null;
    }

    if (this.httpServer) {
      await new Promise<void>((resolve) => {
        this.httpServer!.close(() => resolve());
        this.httpServer!.closeAllConnections?.();
      });
      this.httpServer = null;
    }

    this.activeTransport = null;
    daemonLog("MCP server stopped");
  }

  private async startStdio(): Promise<void> {
    if (!process.stdin || !process.stdout) {
      daemonLog("MCP stdio transport: stdin/stdout not available, skipping");
      return;
    }

    const server = this.createServer();
    const transport = new StdioServerTransport();
    this.mcpServer = server;
    this.activeTransport = transport;
    await server.connect(transport);
    this._isListening = true;
    daemonLog("MCP server listening on stdio");

    transport.onclose = () => {
      this._isListening = false;
      daemonLog("MCP stdio transport closed");
    };
  }

  private async startSse(): Promise<void> {
    const port = parseInt(process.env.LOOP_CLI_MCP_PORT ?? "", 10) || MCP_DEFAULT_PORT;

    // Map session ID → transport for POST routing
    const sessions = new Map<string, SSEServerTransport>();

    this.httpServer = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);

        if (req.method === "GET" && url.pathname === "/sse") {
          // Create a fresh McpServer per SSE connection — the SDK only allows
          // one transport per McpServer instance, so reusing one would cause
          // "Already connected to a transport" errors on reconnect.
          const server = this.createServer();
          const transport = new SSEServerTransport("/message", res);
          sessions.set(transport.sessionId, transport);
          await server.connect(transport);
          if (!this.mcpServer) this.mcpServer = server;
          this._isListening = true;
          daemonLog(`MCP SSE client connected (session: ${transport.sessionId})`);

          transport.onclose = () => {
            sessions.delete(transport.sessionId);
            daemonLog(`MCP SSE client disconnected (session: ${transport.sessionId})`);
          };
        } else if (req.method === "POST" && url.pathname === "/message") {
          const body = await this.readBody(req);
          // Route the POST to the correct transport by session ID
          const sessionId = url.searchParams.get("sessionId");
          const transport = sessionId ? sessions.get(sessionId) : sessions.values().next().value;
          if (transport) {
            await transport.handlePostMessage(req, res, body);
          } else {
            res.writeHead(400).end("No active SSE connection");
          }
        } else {
          res.writeHead(404).end("Not found");
        }
      } catch (err) {
        daemonLog(`MCP SSE request error: ${String(err)}`);
        if (!res.headersSent) {
          res.writeHead(500).end("Internal error");
        }
      }
    });

    return new Promise((resolve) => {
      this.httpServer!.on("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE") {
          daemonLog(`MCP SSE server: port ${port} already in use, skipping SSE transport`);
        } else {
          daemonLog(`MCP SSE server error: ${String(err)}`);
        }
        resolve();
      });

      this.httpServer!.listen(port, "127.0.0.1", () => {
        daemonLog(`MCP SSE server listening on 127.0.0.1:${port}`);
        this._isListening = true;
        resolve();
      });
    });
  }

  private readBody(req: http.IncomingMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => {
        try {
          const raw = Buffer.concat(chunks).toString("utf-8");
          resolve(raw ? JSON.parse(raw) : {});
        } catch {
          resolve({});
        }
      });
      req.on("error", reject);
    });
  }
}
