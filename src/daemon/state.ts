import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import type { LoopMeta } from "../types.js";
import { removeIfExists, writeFileAtomic } from "../shared/fs-utils.js";
import {
  getLoopsDir,
  getLogsDir,
  loopFile,
  logFile,
  getPidFile,
  getSignatureFile,
  getSocketPath,
} from "../config/paths.js";

export { getDataDir, getPidFile, getSocketPath } from "../config/paths.js";

function ensureDirs(): void {
  fs.mkdirSync(getLoopsDir(), { recursive: true });
  fs.mkdirSync(getLogsDir(), { recursive: true });
}

export function saveLoop(meta: LoopMeta): void {
  ensureDirs();
  writeFileAtomic(loopFile(meta.id), JSON.stringify(meta, null, 2));
}

export function loadLoop(id: string): LoopMeta | null {
  const file = loopFile(id);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, "utf-8");
  return JSON.parse(raw) as LoopMeta;
}

export function loadAllLoops(): LoopMeta[] {
  ensureDirs();
  const dir = getLoopsDir();
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  const loops: LoopMeta[] = [];
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(dir, file), "utf-8");
      loops.push(JSON.parse(raw) as LoopMeta);
    } catch {
      // skip corrupted files
    }
  }
  return loops.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function deleteLoop(id: string): void {
  removeIfExists(loopFile(id));
  removeIfExists(logFile(id));
}

export function getLogPath(id: string): string {
  ensureDirs();
  return logFile(id);
}

export function computeCodeSignature(): string {
  const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  let maxMtimeMs = 0;
  let totalSize = 0;
  let count = 0;

  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (/\.(ts|tsx|js|jsx|json)$/.test(entry.name)) {
        const stat = fs.statSync(full);
        maxMtimeMs = Math.max(maxMtimeMs, stat.mtimeMs);
        totalSize += stat.size;
        count += 1;
      }
    }
  };

  try {
    walk(srcDir);
  } catch {
    return "unknown";
  }

  return crypto
    .createHash("sha1")
    .update(`${Math.round(maxMtimeMs)}:${totalSize}:${count}`)
    .digest("hex")
    .slice(0, 16);
}

export function readDaemonSignature(): string | null {
  const file = getSignatureFile();
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, "utf-8").trim() || null;
}

export function writeDaemonSignature(signature: string): void {
  ensureDirs();
  fs.writeFileSync(getSignatureFile(), signature);
}

export function removeDaemonSignature(): void {
  removeIfExists(getSignatureFile());
}

export function removeSocketFile(): void {
  if (process.platform === "win32") {
    return;
  }
  removeIfExists(getSocketPath());
}

export function readDaemonPid(): number | null {
  const file = getPidFile();
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, "utf-8").trim();
  const pid = parseInt(raw, 10);
  return isNaN(pid) ? null : pid;
}

export function writeDaemonPid(pid: number): void {
  ensureDirs();
  fs.writeFileSync(getPidFile(), String(pid));
}

export function removeDaemonPid(): void {
  removeIfExists(getPidFile());
}

export function isDaemonAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
