/**
 * openspec-resolver.ts — Locate an OpenSpec change by ID.
 *
 * Looks in openspec/changes/<id>/ (active) then
 * openspec/changes/archive/*<id>/ (archived, prefers newest).
 * Refuses to guess between multiple active changes.
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export interface ChangeContext {
  changeId: string;
  changeDir: string;
  proposal: string;
  tasks: string;
  affectedFiles: string[];
}

export function resolveChange(changeId: string): ChangeContext {
  const activeDir = join("openspec", "changes", changeId);

  if (existsSync(activeDir) && statSync(activeDir).isDirectory()) {
    return readChangeDir(changeId, activeDir);
  }

  // Check archive
  const archiveDir = join("openspec", "changes", "archive");
  if (!existsSync(archiveDir)) {
    throw new Error(`Change "${changeId}" not found (no active or archived)`);
  }

  const archived = readdirSync(archiveDir)
    .filter((d) => d.includes(changeId))
    .map((d) => ({ name: d, mtime: statSync(join(archiveDir, d)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  if (archived.length === 0) {
    throw new Error(`Change "${changeId}" not found`);
  }

  const newest = join(archiveDir, archived[0].name);
  return readChangeDir(changeId, newest);
}

function readChangeDir(changeId: string, dir: string): ChangeContext {
  const proposalPath = join(dir, "proposal.md");
  const tasksPath = join(dir, "tasks.md");

  const proposal = existsSync(proposalPath)
    ? readFileSync(proposalPath, "utf-8")
    : "";
  const tasks = existsSync(tasksPath) ? readFileSync(tasksPath, "utf-8") : "";

  // Extract affected files from proposal
  const filePattern = /`([^`]+\.(?:ts|tsx|js|json|css|md))`/g;
  const affectedFiles: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = filePattern.exec(proposal)) !== null) {
    affectedFiles.push(match[1]);
  }

  return { changeId, changeDir: dir, proposal, tasks, affectedFiles };
}
