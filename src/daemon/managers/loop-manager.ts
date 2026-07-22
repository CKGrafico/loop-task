import crypto from "node:crypto";
import { LoopController } from "../../core/loop/loop-controller.js";
import type { LoopOptions, LoopMeta } from "../../types.js";
import type { Project } from "../../types.js";
import { TaskManager } from "./task-manager.js";
import { ProjectManager } from "./project-manager.js";
import {
  saveLoop,
  loadAllLoops,
  deleteLoop as deleteLoopState,
  getLogPath,
} from "../state/index.js";
import { daemonLog } from "../daemon-log.js";
import { type StoredLoop } from "./loop-options.js";
import { createLoopEntry, metaToState } from "./loop-entry.js";
import { wireEvents, persistLoop, buildMeta } from "./loop-serialization.js";

export class LoopManager {
  private loops = new Map<string, StoredLoop>();
  private lastSerialized = new Map<string, string>();
  private taskManager: TaskManager;
  private projectManager: ProjectManager;

  constructor(taskManager: TaskManager, projectManager?: ProjectManager) {
    this.taskManager = taskManager;
    this.projectManager = projectManager || new ProjectManager();
  }

  private taskResolver = (taskId: string) => this.taskManager.get(taskId);

  private getProjectDirectory(projectId: string): string | undefined {
    return this.projectManager.get(projectId)?.directory;
  }

  private persist(id: string, controller: LoopController, options: LoopOptions, intervalHuman: string): void {
    persistLoop(id, controller, options, intervalHuman, this.taskManager, this.lastSerialized);
  }

  private wireUp(id: string, entry: StoredLoop): void {
    wireEvents(id, entry.controller, entry.options, entry.intervalHuman, () =>
      this.persist(id, entry.controller, entry.options, entry.intervalHuman));
  }

  init(): void {
    this.projectManager.init();

    const saved = loadAllLoops();
    let restarted = 0;
    const shouldAutoStart = (s: string) => s !== "idle";
    for (const meta of saved) {
      if (!meta.projectId) {
        meta.projectId = "default";
        saveLoop(meta);
      }

      const entry = createLoopEntry(meta, this.taskResolver, this.getProjectDirectory.bind(this), metaToState(meta));
      this.loops.set(meta.id, entry);
      this.wireUp(meta.id, entry);
      if (shouldAutoStart(meta.status)) {
        entry.controller.start();
        restarted += 1;
      }
    }
    if (restarted > 0) {
      daemonLog(`restarted ${restarted} loop(s) from persisted state`);
    }
  }

  start(options: LoopOptions, intervalHuman: string): string {
    const id = crypto.randomUUID().slice(0, 8);
    const logPath = getLogPath(id);
    const projectDir = this.getProjectDirectory(options.projectId ?? "default");
    const controller = new LoopController(id, options, logPath, this.taskResolver, undefined, projectDir);
    const entry: StoredLoop = { controller, options, intervalHuman };
    this.loops.set(id, entry);
    controller.start();
    this.wireUp(id, entry);
    this.persist(id, controller, options, intervalHuman);
    return id;
  }

  async update(
    id: string,
    options: LoopOptions,
    intervalHuman: string
  ): Promise<boolean> {
    const entry = this.loops.get(id);
    if (!entry) return false;

    const executionChanged =
      entry.options.interval !== options.interval ||
      entry.options.taskId !== options.taskId ||
      entry.options.command !== options.command ||
      entry.options.commandArgs.join(" ") !== options.commandArgs.join(" ") ||
      entry.options.immediate !== options.immediate ||
      entry.options.maxRuns !== options.maxRuns ||
      entry.options.verbose !== options.verbose;

    const maxRunsChanged = entry.options.maxRuns !== options.maxRuns;

    Object.assign(entry.options, options);
    entry.intervalHuman = intervalHuman;

    if (maxRunsChanged) {
      entry.controller.clearMaxRunsReached();
    }
    if (entry.controller.status === "running") {
      entry.controller.pause(true);
    } else if (executionChanged && entry.controller.status !== "paused" && entry.controller.status !== "idle") {
      entry.controller.pause();
    }
    this.persist(id, entry.controller, entry.options, entry.intervalHuman);
    return true;
  }

  list(): LoopMeta[] {
    const result: LoopMeta[] = [];
    for (const [id, entry] of this.loops) {
      result.push(buildMeta(id, entry, this.taskManager));
    }
    return result;
  }

  listProjects(): Project[] {
    return this.projectManager.getAll();
  }

  createProject(name: string, color: string, directory?: string, githubSource?: string): Project {
    return this.projectManager.create(name, color, directory, githubSource);
  }

  updateProject(id: string, name: string, color?: string, directory?: string, githubSource?: string): void {
    this.projectManager.update(id, name, color, directory, githubSource);
  }

  deleteProject(id: string): void {
    for (const [loopId, entry] of this.loops) {
      if (entry.options.projectId === id) {
        entry.options.projectId = "default";
        this.persist(loopId, entry.controller, entry.options, entry.intervalHuman);
      }
    }
    this.projectManager.delete(id);
  }

  status(id: string): LoopMeta | null {
    const entry = this.loops.get(id);
    if (!entry) return null;
    return buildMeta(id, entry, this.taskManager);
  }

  pause(id: string): boolean {
    const entry = this.loops.get(id);
    if (!entry) return false;
    entry.controller.pause();
    this.persist(id, entry.controller, entry.options, entry.intervalHuman);
    return true;
  }

  resume(id: string): boolean {
    const entry = this.loops.get(id);
    if (!entry) return false;
    entry.controller.resume();
    this.persist(id, entry.controller, entry.options, entry.intervalHuman);
    return true;
  }

  stopLoop(id: string): boolean {
    const entry = this.loops.get(id);
    if (!entry) return false;
    entry.controller.stopLoop(true);
    this.persist(id, entry.controller, entry.options, entry.intervalHuman);
    return true;
  }

  stopAllLoops(): number {
    let count = 0;
    for (const [id, entry] of this.loops) {
      entry.controller.stopLoop(true);
      this.persist(id, entry.controller, entry.options, entry.intervalHuman);
      count++;
    }
    return count;
  }

  playLoop(id: string): boolean {
    const entry = this.loops.get(id);
    if (!entry) return false;
    const ok = entry.controller.playLoop();
    if (ok) {
      this.persist(id, entry.controller, entry.options, entry.intervalHuman);
    }
    return ok;
  }

  trigger(id: string): boolean {
    const entry = this.loops.get(id);
    if (!entry) return false;
    const ok = entry.controller.triggerNow();
    if (ok) {
      this.persist(id, entry.controller, entry.options, entry.intervalHuman);
    }
    return ok;
  }

  isMaxRunsBlocked(id: string): boolean {
    const entry = this.loops.get(id);
    return !!entry?.controller.isMaxRunsReached();
  }

  isRunning(id: string): boolean {
    const entry = this.loops.get(id);
    return entry?.controller.status === "running";
  }

  async delete(id: string): Promise<boolean> {
    const entry = this.loops.get(id);
    if (!entry) return false;
    await entry.controller.stop();
    this.loops.delete(id);
    this.lastSerialized.delete(id);
    deleteLoopState(id);
    return true;
  }

  getLogPath(id: string): string | null {
    if (!this.loops.has(id)) return null;
    return getLogPath(id);
  }

  async shutdown(): Promise<void> {
    const stops: Promise<void>[] = [];
    for (const [, entry] of this.loops) {
      stops.push(entry.controller.stop());
    }
    await Promise.all(stops);
    this.loops.clear();
  }

  reconcile(newLoops: LoopMeta[]): void {
    const newIds = new Set(newLoops.map((l) => l.id));
    const shouldAutoStart = (s: string) => s !== "idle";

    for (const [existingId, entry] of this.loops) {
      if (!newIds.has(existingId)) {
        void entry.controller.stop().then(() => {
          this.loops.delete(existingId);
          this.lastSerialized.delete(existingId);
          deleteLoopState(existingId);
        });
      }
    }

    for (const meta of newLoops) {
      const existing = this.loops.get(meta.id);
      if (existing) {
        const configChanged =
          existing.options.interval !== meta.interval ||
          existing.options.command !== meta.command ||
          existing.options.cwd !== (meta.cwd ?? "");
        if (configChanged) {
          void existing.controller.stop().then(() => {
            const entry = createLoopEntry(meta, this.taskResolver, this.getProjectDirectory.bind(this), metaToState(meta));
            this.loops.set(meta.id, entry);
            this.wireUp(meta.id, entry);
            if (shouldAutoStart(meta.status)) {
              entry.controller.start();
            }
          });
        }
      } else {
        const entry = createLoopEntry(meta, this.taskResolver, this.getProjectDirectory.bind(this), metaToState(meta));
        this.loops.set(meta.id, entry);
        this.wireUp(meta.id, entry);
        if (shouldAutoStart(meta.status)) {
          entry.controller.start();
        }
      }
    }
  }
}
