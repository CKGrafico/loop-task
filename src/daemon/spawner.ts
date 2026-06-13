import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  readDaemonPid,
  isDaemonAlive,
  removeDaemonPid,
  getSocketPath,
} from "./state.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function ensureDaemon(): void {
  const pid = readDaemonPid();
  if (pid !== null && isDaemonAlive(pid)) {
    return;
  }

  if (pid !== null) {
    removeDaemonPid();
  }

  const daemonScript = path.resolve(__dirname, "index.js");
  const child = spawn(process.execPath, [daemonScript], {
    detached: true,
    stdio: "ignore",
  });

  child.unref();

  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const newPid = readDaemonPid();
    if (newPid !== null && isDaemonAlive(newPid)) {
      return;
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
  }

  throw new Error("Daemon failed to start within 5 seconds");
}

export function getSocket(): string {
  return getSocketPath();
}
