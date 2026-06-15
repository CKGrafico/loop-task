import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  readDaemonPid,
  isDaemonAlive,
  removeDaemonPid,
  removeDaemonSignature,
  readDaemonSignature,
  computeCodeSignature,
  getSocketPath,
} from "./state.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let cachedSignature: string | null = null;

function currentCodeSignature(): string {
  if (cachedSignature === null) {
    cachedSignature = computeCodeSignature();
  }
  return cachedSignature;
}

function blockingWait(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function stopDaemon(pid: number): void {
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // already gone
  }

  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (!isDaemonAlive(pid)) {
      break;
    }
    blockingWait(100);
  }

  if (isDaemonAlive(pid)) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // best effort
    }
  }

  removeDaemonPid();
  removeDaemonSignature();
}

export function ensureDaemon(): void {
  const currentSignature = currentCodeSignature();
  const pid = readDaemonPid();

  if (pid !== null && isDaemonAlive(pid)) {
    if (readDaemonSignature() === currentSignature) {
      return;
    }
    stopDaemon(pid);
  } else if (pid !== null) {
    removeDaemonPid();
    removeDaemonSignature();
  }

  const daemonScript = path.resolve(__dirname, "index.ts");
  const child = spawn(process.execPath, [daemonScript], {
    detached: true,
    stdio: "ignore",
  });

  child.unref();

  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const newPid = readDaemonPid();
    if (
      newPid !== null &&
      isDaemonAlive(newPid) &&
      readDaemonSignature() === currentSignature
    ) {
      return;
    }
    blockingWait(100);
  }

  throw new Error("Daemon failed to start within 5 seconds");
}

export function getSocket(): string {
  return getSocketPath();
}
