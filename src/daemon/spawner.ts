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
import { t } from "../i18n/index.js";
import { DAEMON_POLL_MS, DAEMON_SPAWN_TIMEOUT_MS } from "../config/constants.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  const deadline = Date.now() + DAEMON_SPAWN_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (!isDaemonAlive(pid)) {
      break;
    }
    blockingWait(DAEMON_POLL_MS);
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

  const daemonScript = path.resolve(
    __dirname,
    __filename.endsWith(".ts") ? "index.ts" : "index.js"
  );
  const args = __filename.endsWith(".ts")
    ? ["--import", "tsx", daemonScript]
    : [daemonScript];
  const child = spawn(process.execPath, args, {
    detached: true,
    stdio: "ignore",
  });

  child.unref();

  const deadline = Date.now() + DAEMON_SPAWN_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const newPid = readDaemonPid();
    if (
      newPid !== null &&
      isDaemonAlive(newPid) &&
      readDaemonSignature() === currentSignature
    ) {
      return;
    }
    blockingWait(DAEMON_POLL_MS);
  }

  throw new Error(t("errors.daemonFailedToStart"));
}

export function getSocket(): string {
  return getSocketPath();
}
