import { LoopManager } from "./manager.js";
import { TaskManager } from "./task-manager.js";
import { ProjectManager } from "./projects.js";
import { IpcServer } from "./server.js";
import { HttpApiServer } from "./http-server.js";
import { FileWatcher } from "./file-watcher.js";
import {
  writeDaemonPid,
  removeDaemonPid,
  writeDaemonSignature,
  removeDaemonSignature,
  computeCodeSignature,
  migrateTasksToJson,
  migrateLoopsToJson,
} from "./state.js";
import { t } from "../i18n/index.js";
import { daemonLog } from "./daemon-log.js";

async function main(): Promise<void> {
  const taskManager = new TaskManager();
  migrateLoopsToJson();
  migrateTasksToJson();
  taskManager.init();
  const manager = new LoopManager(taskManager);
  const server = new IpcServer(manager, taskManager);
  const projectManager = (manager as unknown as { projectManager: ProjectManager }).projectManager;
  const httpServer = new HttpApiServer(manager, taskManager, projectManager);

  try {
    await server.listen();
  } catch (err) {
    daemonLog(`listen failed (another daemon already holds the socket): ${String(err)}`);
    process.exit(0);
  }

  try {
    const httpPort = parseInt(process.env.LOOP_CLI_HTTP_PORT ?? "", 10);
    await httpServer.listen(Number.isNaN(httpPort) ? undefined : httpPort);
  } catch (err) {
    daemonLog(`HTTP API server failed to start: ${String(err)}`);
  }

  manager.init();
  writeDaemonPid(process.pid);
  writeDaemonSignature(computeCodeSignature());
  daemonLog(`started pid=${process.pid}`);

  const fileWatcher = new FileWatcher();
  fileWatcher.setManagers(manager, taskManager, manager["projectManager"]);
  fileWatcher.start();
  daemonLog(`file watcher started for hot-reloading JSON configs`);

  let shuttingDown = false;
  const cleanup = async () => {
    // Re-entry guard: a persist failure during shutdown must not re-trigger
    // cleanup via uncaughtException, or the daemon crash-loops forever.
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
