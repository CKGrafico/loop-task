import { LoopManager } from "./manager.js";
import { IpcServer } from "./server.js";
import {
  writeDaemonPid,
  removeDaemonPid,
  writeDaemonSignature,
  removeDaemonSignature,
  computeCodeSignature,
} from "./state.js";
import { t } from "../i18n/index.js";
import { daemonLog } from "./daemon-log.js";

async function main(): Promise<void> {
  const manager = new LoopManager();
  const server = new IpcServer(manager);

  try {
    await server.listen();
  } catch (err) {
    daemonLog(`listen failed (another daemon already holds the socket): ${String(err)}`);
    process.exit(0);
  }

  manager.init();
  writeDaemonPid(process.pid);
  writeDaemonSignature(computeCodeSignature());
  daemonLog(`started pid=${process.pid}`);

  const cleanup = async () => {
    daemonLog(`shutting down pid=${process.pid}`);
    removeDaemonPid();
    removeDaemonSignature();
    await manager.shutdown();
    await server.close();
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  process.on("uncaughtException", (err) => {
    daemonLog(`uncaught exception: ${String(err)}`);
    console.error(t("errors.daemonUncaught"), err);
    cleanup();
  });
}

main().catch((err) => {
  daemonLog(`failed to start: ${String(err)}`);
  console.error(t("errors.daemonFailed"), err);
  process.exit(1);
});
