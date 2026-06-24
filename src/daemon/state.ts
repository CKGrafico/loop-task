import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import type { LoopMeta, TaskDefinition } from "../types.js";
import { removeIfExists, writeFileAtomic } from "../shared/fs-utils.js";
import {
  getLoopsDir,
  getTasksDir,
  getLogsDir,
  loopFile,
  taskFile,
  logFile,
  getPidFile,
  getSignatureFile,
  getSocketPath,
  loopsJson,
  tasksJson,
  getDataDir,
} from "../config/paths.js";

export { getDataDir, getPidFile, getSocketPath } from "../config/paths.js";

function ensureDirs(): void {
  fs.mkdirSync(getDataDir(), { recursive: true });
  fs.mkdirSync(getLogsDir(), { recursive: true });
}

function readJsonArray<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeJsonArray<T>(filePath: string, items: T[]): void {
  ensureDirs();
  writeFileAtomic(filePath, JSON.stringify(items, null, 2));
}

export function migrateLoopsToJson(): void {
  ensureDirs();
  const jsonFile = loopsJson();
  if (fs.existsSync(jsonFile)) return;
  const dir = getLoopsDir();
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  if (files.length === 0) return;
  const loops: LoopMeta[] = [];
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(dir, file), "utf-8");
      loops.push(JSON.parse(raw) as LoopMeta);
    } catch {
      // skip corrupted files
    }
  }
  loops.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  writeJsonArray(jsonFile, loops);
}

export function migrateTasksToJson(): void {
  ensureDirs();
  const jsonFile = tasksJson();
  if (fs.existsSync(jsonFile)) return;
  const dir = getTasksDir();
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  if (files.length === 0) return;
  const tasks: TaskDefinition[] = [];
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(dir, file), "utf-8");
      tasks.push(JSON.parse(raw) as TaskDefinition);
    } catch {
      // skip corrupted files
    }
  }
  tasks.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  writeJsonArray(jsonFile, tasks);
}

export function saveLoop(meta: LoopMeta): void {
  const loops = readJsonArray<LoopMeta>(loopsJson());
  const idx = loops.findIndex((l) => l.id === meta.id);
  if (idx >= 0) loops[idx] = meta;
  else loops.push(meta);
  writeJsonArray(loopsJson(), loops);
}

export function loadLoop(id: string): LoopMeta | null {
  const loops = readJsonArray<LoopMeta>(loopsJson());
  return loops.find((l) => l.id === id) ?? null;
}

export function loadAllLoops(): LoopMeta[] {
  const loops = readJsonArray<LoopMeta>(loopsJson());
  return loops.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function deleteLoop(id: string): void {
  const loops = readJsonArray<LoopMeta>(loopsJson());
  const filtered = loops.filter((l) => l.id !== id);
  if (filtered.length !== loops.length) {
    writeJsonArray(loopsJson(), filtered);
  }
  removeIfExists(logFile(id));
}

export function saveTask(task: TaskDefinition): void {
  const tasks = readJsonArray<TaskDefinition>(tasksJson());
  const idx = tasks.findIndex((t) => t.id === task.id);
  if (idx >= 0) tasks[idx] = task;
  else tasks.push(task);
  writeJsonArray(tasksJson(), tasks);
}

export function loadTask(id: string): TaskDefinition | null {
  const tasks = readJsonArray<TaskDefinition>(tasksJson());
  return tasks.find((t) => t.id === id) ?? null;
}

export function loadAllTasks(): TaskDefinition[] {
  const tasks = readJsonArray<TaskDefinition>(tasksJson());
  return tasks.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function deleteTask(id: string): void {
  const tasks = readJsonArray<TaskDefinition>(tasksJson());
  const filtered = tasks.filter((t) => t.id !== id);
  if (filtered.length !== tasks.length) {
    writeJsonArray(tasksJson(), filtered);
  }
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
