import crypto from "node:crypto";
import { LoopController } from "../core/loop-controller.js";
import type { LoopOptions, LoopMeta } from "../types.js";
import {
  saveLoop,
  loadAllLoops,
  deleteLoop as deleteLoopState,
  getLogPath,
} from "./state.js";
import { daemonLog } from "./daemon-log.js";

interface StoredLoop {
  controller: LoopController;
  options: LoopOptions;
  intervalHuman: string;
}

export class LoopManager {
  private loops = new Map<string, StoredLoop>();
  private lastSerialized = new Map<string, string>();

  init(): void {
    const saved = loadAllLoops();
    let restarted = 0;
    for (const meta of saved) {
      if (meta.status === "stopped") continue;
      const options: LoopOptions = {
        interval: meta.interval,
        command: meta.command,
        commandArgs: meta.commandArgs,
        immediate: false,
        maxRuns: meta.maxRuns,
        verbose: meta.verbose,
        cwd: meta.cwd ?? "",
        description: meta.description ?? "",
      };
      const logPath = getLogPath(meta.id);
      const controller = new LoopController(meta.id, options, logPath, {
        status: meta.status,
        createdAt: meta.createdAt,
        runCount: meta.runCount,
        lastRunAt: meta.lastRunAt,
        lastExitCode: meta.lastExitCode,
        lastDuration: meta.lastDuration,
        nextRunAt: meta.nextRunAt,
        remainingDelayMs: meta.remainingDelayMs,
        runHistory: meta.runHistory,
      });
      this.loops.set(meta.id, {
        controller,
        options,
        intervalHuman: meta.intervalHuman,
      });
      this.wireEvents(meta.id, controller, options, meta.intervalHuman);
      controller.start();
      restarted += 1;
    }
    if (restarted > 0) {
      daemonLog(`restarted ${restarted} loop(s) from persisted state`);
    }
  }

  start(options: LoopOptions, intervalHuman: string): string {
    const id = crypto.randomUUID().slice(0, 8);
    const logPath = getLogPath(id);
    const controller = new LoopController(id, options, logPath);
    this.loops.set(id, { controller, options, intervalHuman });
    controller.start();
    this.wireEvents(id, controller, options, intervalHuman);
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
      entry.options.command !== options.command ||
      entry.options.commandArgs.length !== options.commandArgs.length ||
      entry.options.commandArgs.some((arg, index) => arg !== options.commandArgs[index]) ||
      entry.options.immediate !== options.immediate ||
      entry.options.maxRuns !== options.maxRuns ||
      entry.options.verbose !== options.verbose ||
      entry.options.cwd !== options.cwd;

    Object.assign(entry.options, options);
    entry.intervalHuman = intervalHuman;
    if (entry.controller.status === "running") {
      entry.controller.pause(true);
    } else if (executionChanged && entry.controller.status !== "paused") {
      entry.controller.pause();
    }
    this.persist(id, entry.controller, entry.options, entry.intervalHuman);
    return true;
  }

  list(): LoopMeta[] {
    const result: LoopMeta[] = [];
    for (const [id, entry] of this.loops) {
      result.push(this.buildMeta(id, entry));
    }
    return result;
  }

  status(id: string): LoopMeta | null {
    const entry = this.loops.get(id);
    if (!entry) return null;
    return this.buildMeta(id, entry);
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

  trigger(id: string): boolean {
    const entry = this.loops.get(id);
    if (!entry) return false;
    entry.controller.triggerNow(true);
    this.persist(id, entry.controller, entry.options, entry.intervalHuman);
    return true;
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

  private wireEvents(
    id: string,
    controller: LoopController,
    options: LoopOptions,
    intervalHuman: string
  ): void {
    const persist = () => this.persist(id, controller, options, intervalHuman);
    controller.on("run:start", persist);
    controller.on("run:end", persist);
    controller.on("paused", persist);
    controller.on("resumed", persist);
    controller.on("triggered", persist);
    controller.on("waiting", persist);
    controller.on("stopped", persist);
  }

  private persist(
    id: string,
    controller: LoopController,
    options: LoopOptions,
    intervalHuman: string
  ): void {
    const meta = toMeta(controller, options, intervalHuman);
    const serialized = JSON.stringify(meta);
    if (this.lastSerialized.get(id) === serialized) {
      return;
    }
    this.lastSerialized.set(id, serialized);
    saveLoop(meta);
  }

  private buildMeta(id: string, entry: StoredLoop): LoopMeta {
    return toMeta(entry.controller, entry.options, entry.intervalHuman);
  }
}

function toMeta(
  controller: LoopController,
  options: LoopOptions,
  intervalHuman: string
): LoopMeta {
  const runtime = controller.getMeta();
  return {
    ...runtime,
    command: options.command,
    commandArgs: options.commandArgs,
    interval: options.interval,
    intervalHuman,
    immediate: options.immediate,
    maxRuns: options.maxRuns,
    verbose: options.verbose,
    cwd: options.cwd,
    description: options.description,
    remainingDelayMs: runtime.remainingDelayMs,
    pid: process.pid,
  };
}
