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
  private mcpServer: McpServer;
  private transport: StdioServerTransport | SSEServerTransport | null = null;
  private httpServer: http.Server | null = null;
  private _isListening = false;
  private transportType: "stdio" | "sse";

  constructor(
    private manager: LoopManager,
    private taskManager: TaskManager,
    private projectManager: ProjectManager,
    transport?: "stdio" | "sse",
  ) {
    this.transportType = transport ?? "stdio";
    this.mcpServer = new McpServer(
      { name: "loop-task", version: "1.0.0" },
      { capabilities: { tools: {} } },
    );
    registerMcpTools(this.mcpServer, { manager, taskManager, projectManager });
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

    try {
      await this.mcpServer.close();
    } catch {
      // ignore close errors
    }

    if (this.httpServer) {
      await new Promise<void>((resolve) => {
        this.httpServer!.close(() => resolve());
        this.httpServer!.closeAllConnections?.();
      });
      this.httpServer = null;
    }

    this.transport = null;
    daemonLog("MCP server stopped");
  }

  private async startStdio(): Promise<void> {
    if (!process.stdin || !process.stdout) {
      daemonLog("MCP stdio transport: stdin/stdout not available, skipping");
      return;
    }

    const transport = new StdioServerTransport();
    this.transport = transport;
    await this.mcpServer.connect(transport);
    this._isListening = true;
    daemonLog("MCP server listening on stdio");

    transport.onclose = () => {
      this._isListening = false;
      daemonLog("MCP stdio transport closed");
    };
  }

  private async startSse(): Promise<void> {
    const port = parseInt(process.env.LOOP_CLI_MCP_PORT ?? "", 10) || MCP_DEFAULT_PORT;

    this.httpServer = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);

        if (req.method === "GET" && url.pathname === "/sse") {
          const transport = new SSEServerTransport("/message", res);
          this.transport = transport;
          await this.mcpServer.connect(transport);
          this._isListening = true;
          daemonLog(`MCP SSE client connected (session: ${transport.sessionId})`);

          transport.onclose = () => {
            daemonLog(`MCP SSE client disconnected (session: ${transport.sessionId})`);
          };
        } else if (req.method === "POST" && url.pathname === "/message") {
          const body = await this.readBody(req);
          if (this.transport && this.transport instanceof SSEServerTransport) {
            await (this.transport as SSEServerTransport).handlePostMessage(req, res, body);
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
