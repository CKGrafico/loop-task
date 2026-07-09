import { LoopManager } from "./managers/loop-manager.js";
import { TaskManager } from "./managers/task-manager.js";
import { ProjectManager } from "./managers/project-manager.js";
import { IpcServer } from "./server/index.js";
import { HttpApiServer } from "./http/server.js";
import { McpApiServer } from "./mcp/index.js";
import { FileWatcher } from "./watcher/index.js";
import { SettingsManager } from "./settings-manager.js";
import {
  writeDaemonPid,
  removeDaemonPid,
  writeDaemonSignature,
  removeDaemonSignature,
  computeCodeSignature,
  migrateTasksToJson,
  migrateLoopsToJson,
  setSelfWriteNotifier,
} from "./state/index.js";
import { setProjectSelfWriteNotifier } from "./managers/project-manager.js";
import { t } from "../shared/i18n/index.js";
import { daemonLog } from "./daemon-log.js";

async function main(): Promise<void> {
  const mcpEnabled = (process.env.LOOP_CLI_MCP_ENABLED ?? "true") !== "false";
  const mcpTransport = process.env.LOOP_CLI_MCP_TRANSPORT === "stdio" ? "stdio" : "sse";

  const taskManager = new TaskManager();
  migrateLoopsToJson();
  migrateTasksToJson();
  taskManager.init();
  const manager = new LoopManager(taskManager);
  const settingsManager = new SettingsManager();
  settingsManager.load();
  const server = new IpcServer(manager, taskManager, settingsManager);
  const projectManager = (manager as unknown as { projectManager: ProjectManager }).projectManager;
  const httpServer = new HttpApiServer(manager, taskManager, projectManager, settingsManager);
  const mcpServer = new McpApiServer(manager, taskManager, projectManager, mcpTransport);

  try {
    await server.listen();
  } catch (err) {
    daemonLog(`listen failed (another daemon already holds the socket): ${String(err)}`);
    process.exit(0);
  }

  const httpPort = parseInt(process.env.LOOP_CLI_HTTP_PORT ?? "", 10);
  const resolvedHttpPort = Number.isNaN(httpPort) ? undefined : httpPort;

  if (settingsManager.get().httpApiEnabled) {
    try {
      await httpServer.listen(resolvedHttpPort);
    } catch (err) {
      daemonLog(`HTTP API server failed to start: ${String(err)}`);
    }
  }

  if (mcpEnabled) {
    try {
      await mcpServer.start();
    } catch (err) {
      daemonLog(`MCP server failed to start: ${String(err)}`);
    }
  }

  settingsManager.onChange((settings) => {
    if (settings.httpApiEnabled && !httpServer["isListening"]) {
      httpServer.listen(resolvedHttpPort).catch((err) => {
        daemonLog(`HTTP API server failed to restart: ${String(err)}`);
      });
    } else if (!settings.httpApiEnabled && httpServer["isListening"]) {
      httpServer.close().catch((err) => {
        daemonLog(`HTTP API server failed to stop: ${String(err)}`);
      });
    }

    if (settings.mcpApiEnabled && !mcpServer.isListening) {
      mcpServer.start().catch((err) => {
        daemonLog(`MCP server failed to restart: ${String(err)}`);
      });
    } else if (!settings.mcpApiEnabled && mcpServer.isListening) {
      mcpServer.close().catch((err) => {
        daemonLog(`MCP server failed to stop: ${String(err)}`);
      });
    }
  });

  manager.init();
  writeDaemonPid(process.pid);
  writeDaemonSignature(computeCodeSignature());
  daemonLog(`started pid=${process.pid}`);

  const fileWatcher = new FileWatcher();
  fileWatcher.setManagers(manager, taskManager, manager["projectManager"]);
  fileWatcher.start();
  daemonLog(`file watcher started for hot-reloading JSON configs`);

  setSelfWriteNotifier((filePath, content) => fileWatcher.registerSelfWrite(filePath, content));
  setProjectSelfWriteNotifier((filePath, content) => fileWatcher.registerSelfWrite(filePath, content));

  let shuttingDown = false;
  const cleanup = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    daemonLog(`shutting down pid=${process.pid}`);
    try {
      fileWatcher.stop();
      removeDaemonPid();
      removeDaemonSignature();
      await manager.shutdown();
      await server.close();
      await httpServer.close();
      await mcpServer.close();
    } catch (err) {
      daemonLog(`error during shutdown: ${String(err)}`);
    } finally {
      process.exit(0);
    }
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  process.on("uncaughtException", (err) => {
    daemonLog(`uncaught exception: ${String(err)}`);
    console.error(t("errors.daemonUncaught"), err);
    void cleanup();
  });
}

main().catch((err) => {
  daemonLog(`failed to start: ${String(err)}`);
  console.error(t("errors.daemonFailed"), err);
  process.exit(1);
});
