import fs from "node:fs";
import path from "node:path";
import { writeFileAtomic } from "../shared/fs-utils.js";
import { getDataDir } from "../config/paths.js";
import type { LoopMeta, TaskDefinition, Project } from "../types.js";

const STORE_FILES = ["loops.json", "tasks.json", "projects.json"] as const;

export interface ImportWriteResult {
  success: boolean;
  error?: string;
  writtenStores: string[];
}

function backupFilePath(filePath: string): string {
  return `${filePath}.bak`;
}

export function atomicImportWrite(
  loops: LoopMeta[],
  tasks: TaskDefinition[],
  projects: Project[],
): ImportWriteResult {
  const dataDir = getDataDir();
  fs.mkdirSync(dataDir, { recursive: true });
  const contents: Record<string, string> = {
    "loops.json": JSON.stringify(loops, null, 2),
    "tasks.json": JSON.stringify(tasks, null, 2),
    "projects.json": JSON.stringify(projects, null, 2),
  };

  const backups: Map<string, string | null> = new Map();
  for (const store of STORE_FILES) {
    const storePath = path.join(dataDir, store);
    if (fs.existsSync(storePath) && fs.statSync(storePath).isFile()) {
      backups.set(store, fs.readFileSync(storePath, "utf-8"));
    } else {
      backups.set(store, null);
    }
  }

  const writtenStores: string[] = [];

  try {
    for (const store of STORE_FILES) {
      const storePath = path.join(dataDir, store);
      writeFileAtomic(storePath, contents[store]);
      writtenStores.push(store);
    }
  } catch (err: unknown) {
    const writeError = err as Error;
    for (const store of STORE_FILES) {
      const storePath = path.join(dataDir, store);
      const backup = backups.get(store) ?? null;
      if (backup !== null) {
        try {
          writeFileAtomic(storePath, backup);
        } catch {
          // best-effort restore
        }
      } else {
        try {
          if (fs.existsSync(storePath) && fs.statSync(storePath).isFile()) {
            fs.unlinkSync(storePath);
          }
        } catch {
          // best-effort cleanup
        }
      }
    }
    return {
      success: false,
      error: writeError.message,
      writtenStores,
    };
  }

  for (const store of STORE_FILES) {
    const bakPath = backupFilePath(path.join(dataDir, store));
    try {
      if (fs.existsSync(bakPath)) {
        fs.unlinkSync(bakPath);
      }
    } catch {
      // best-effort cleanup
    }
  }

  return { success: true, writtenStores: [...STORE_FILES] };
}
