import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import type { LoopMeta } from "../types.js";

export function getDataDir(): string {
  const override = process.env.LOOP_CLI_HOME;
  const base = override && override.trim() ? override : os.homedir();
  return path.join(base, ".loop-cli");
}

function getLoopsDir(): string {
  return path.join(getDataDir(), "loops");
}

function getLogsDir(): string {
  return path.join(getDataDir(), "logs");
}

function ensureDirs(): void {
  fs.mkdirSync(getLoopsDir(), { recursive: true });
  fs.mkdirSync(getLogsDir(), { recursive: true });
}

function loopFile(id: string): string {
  return path.join(getLoopsDir(), `${id}.json`);
}

export function saveLoop(meta: LoopMeta): void {
  ensureDirs();
  fs.writeFileSync(loopFile(meta.id), JSON.stringify(meta, null, 2));
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
  const stateFile = loopFile(id);
  const logFile = path.join(getLogsDir(), `${id}.log`);
  if (fs.existsSync(stateFile)) fs.unlinkSync(stateFile);
  if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
}

export function getLogPath(id: string): string {
  ensureDirs();
  return path.join(getLogsDir(), `${id}.log`);
}

export function getPidFile(): string {
  return path.join(getDataDir(), "daemon.pid");
}

export function getSocketPath(): string {
  const suffix = crypto
    .createHash("sha1")
    .update(getDataDir())
    .digest("hex")
    .slice(0, 12);

  if (process.platform === "win32") {
    return `\\\\.\\pipe\\loop-cli-${os.userInfo().username}-${suffix}`;
  }
  return path.join(getDataDir(), `daemon-${suffix}.sock`);
}

export function removeSocketFile(): void {
  if (process.platform === "win32") {
    return;
  }

  const socketPath = getSocketPath();
  if (fs.existsSync(socketPath)) {
    fs.unlinkSync(socketPath);
  }
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
  const file = getPidFile();
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

export function isDaemonAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
