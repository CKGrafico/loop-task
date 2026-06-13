import { LoopManager } from "./manager.js";
import { IpcServer } from "./server.js";
import { writeDaemonPid, removeDaemonPid } from "./state.js";

async function main(): Promise<void> {
  const manager = new LoopManager();
  manager.init();

  const server = new IpcServer(manager);
  await server.listen();

  writeDaemonPid(process.pid);

  const cleanup = async () => {
    removeDaemonPid();
    await manager.shutdown();
    await server.close();
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  process.on("uncaughtException", (err) => {
    console.error("Daemon uncaught exception:", err);
    cleanup();
  });
}

main().catch((err) => {
  console.error("Daemon failed to start:", err);
  process.exit(1);
});
