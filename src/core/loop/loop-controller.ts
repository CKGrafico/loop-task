import { EventEmitter } from "node:events";
import fs from "node:fs";
import type { LoopOptions, LoopStatus, LoopMeta, RunRecord } from "../../types.js";
import { computePhase, alignToPhase } from "../scheduling/index.js";
import type { TaskResolver, LoopControllerState } from "./types.js";
import { runLoop } from "./loop-runner.js";
import type { RunAccess } from "./loop-runner.js";

export type { TaskResolver } from "./types.js";
export type { LoopControllerState } from "./types.js";

export class LoopController extends EventEmitter {
  private abortController: AbortController;
  private runAbortController: AbortController | null = null;
  private _paused = false;
  private _forceRun = false;
  private _savedRemainingMs: number | null = null;
  private _resetSchedule = false;
  private _stopAfterRun = false;
  private _maxRunsReached = false;
  private _status: LoopStatus = "running";
  private resumeResolve: (() => void) | null = null;
  private runCount = 0;
  private lastRunAt: string | null = null;
  private lastExitCode: number | null = null;
  private lastDuration: number | null = null;
  private nextRunAt: string | null = null;
  private readonly createdAt: string;
  private readonly id: string;
  private readonly options: LoopOptions;
  private readonly logPath: string;
  readonly taskResolver: TaskResolver;
  private readonly projectDirectory: string | undefined;
  private remainingDelayMs: number | null = null;
  private logStream: fs.WriteStream | null = null;
  private loopPromise: Promise<void> | null = null;
  private sessionStartedAt: string | null = null;
  private runHistory: RunRecord[] = [];
  private currentRunStartOffset: number = 0;
  private skippedCount = 0;

  constructor(
    id: string,
    options: LoopOptions,
    logPath: string,
    taskResolver: TaskResolver,
    state?: LoopControllerState,
    projectDirectory?: string,
  ) {
    super();
    this.id = id;
    this.options = options;
    this.logPath = logPath;
    this.taskResolver = taskResolver;
    this.projectDirectory = projectDirectory;
    this.abortController = new AbortController();
    this.createdAt = state?.createdAt ?? new Date().toISOString();
    this.runCount = state?.runCount ?? 0;
    this._maxRunsReached = state?.maxRunsReached ?? false;
    this.sessionStartedAt = state?.sessionStartedAt ?? null;
    this.lastRunAt = state?.lastRunAt ?? null;
    this.lastExitCode = state?.lastExitCode ?? null;
    this.lastDuration = state?.lastDuration ?? null;
    this.nextRunAt = state?.nextRunAt ?? null;
    this.remainingDelayMs = state?.remainingDelayMs ?? null;
    this._status = state?.status ?? "running";
    this._paused = state?.status === "paused" || state?.status === "idle";
    this.runHistory = (state?.runHistory ?? []).map((r) =>
      r.status === "running" ? { ...r, status: "completed" as const } : r
    ).map((r) => ({ ...r, logOffset: r.logOffset ?? 0 }));
    this.skippedCount = state?.skippedCount ?? 0;
  }

  get status(): LoopStatus {
    return this._status;
  }

  start(): void {
    this.skippedCount = 0;
    this.logStream?.end();
    this.abortController = new AbortController();
    this.logStream = fs.createWriteStream(this.logPath, { flags: "a" });
    this.loopPromise = this.run();
    if (this.sessionStartedAt === null) {
      this.sessionStartedAt = new Date().toISOString();
    }
  }

  pause(interruptCurrentRun = false): void {
    if (this._status === "running" || this._status === "waiting") {
      this._paused = true;
      this._status = "paused";
      if (interruptCurrentRun && this._status === "paused") {
        this.runAbortController?.abort();
      }
      this.emit("paused");
    }
  }

  stopLoop(interruptCurrentRun = false): void {
    if (this._status === "running" || this._status === "waiting" || this._status === "paused") {
      this._paused = true;
      this._status = "idle";
      this.sessionStartedAt = null;
      this.remainingDelayMs = null;
      this.nextRunAt = null;
      if (interruptCurrentRun) {
        this.runAbortController?.abort();
      }
      this.abortController.abort();
      if (this.resumeResolve) {
        this.resumeResolve();
        this.resumeResolve = null;
      }
      this.emit("stopped");
    }
  }

  resume(): void {
    if (this._status === "paused" && this._paused && this.resumeResolve) {
      this._paused = false;
      if (this.remainingDelayMs !== null) {
        this._status = "waiting";
        this.nextRunAt = new Date(Date.now() + this.remainingDelayMs).toISOString();
      }
      this.resumeResolve();
      this.resumeResolve = null;
      this.emit("resumed");
    }
  }

  playLoop(): boolean {
    if (this._status !== "idle" && this._status !== "stopped") return false;
    if (this._maxRunsReached) return false;
    if (this.options.maxRuns !== null && this.runCount >= this.options.maxRuns) {
      this._maxRunsReached = true;
      return false;
    }
    this.sessionStartedAt = new Date().toISOString();
    this._resetSchedule = true;
    this._paused = false;
    this._status = "waiting";
    const phase = this.options.offset !== null
      ? this.options.offset
      : computePhase(this.id, this.options.interval);
    const delay = alignToPhase(Date.now(), this.options.interval, phase);
    this.nextRunAt = new Date(Date.now() + delay).toISOString();
    if (this.resumeResolve) {
      this.resumeResolve();
      this.resumeResolve = null;
    }
    this.start();
    this.emit("resumed");
    return true;
  }

  triggerNow(): boolean {
    if (this._status === "running") return false;
    if (this._maxRunsReached) return false;
    const needsStart = this._status === "stopped" || this._status === "idle";
    this._savedRemainingMs = this.remainingDelayMs;
    this._forceRun = true;
    if (needsStart) {
      this._stopAfterRun = true;
      this._paused = false;
      this._status = "running";
      this.start();
    } else {
      if (this._paused) this.resume();
    }
    this.emit("triggered");
    return true;
  }

  async stop(): Promise<void> {
    this.abortController.abort();
    if (this._paused) this.resume();
    if (this.loopPromise) {
      await this.loopPromise;
    }
    this.logStream?.end();
    this.logStream = null;
  }

  getMeta(): Omit<LoopMeta, "command" | "commandArgs" | "interval" | "intervalHuman" | "immediate" | "maxRuns" | "verbose" | "cwd" | "description" | "pid" | "projectId" | "offset"> {
    return {
      id: this.id,
      taskId: this.options.taskId,
      status: this._status,
      createdAt: this.createdAt,
      maxRunsReached: this._maxRunsReached,
      sessionStartedAt: this.sessionStartedAt,
      runCount: this.runCount,
      lastRunAt: this.lastRunAt,
      lastExitCode: this.lastExitCode,
      lastDuration: this.lastDuration,
      nextRunAt: this.nextRunAt,
      remainingDelayMs: this.remainingDelayMs,
      runHistory: this.runHistory,
      skippedCount: this.skippedCount,
    };
  }

  clearMaxRunsReached(): void {
    this._maxRunsReached = false;
    this._paused = false;
    this._status = "idle";
    this.remainingDelayMs = null;
    this.nextRunAt = null;
    this.runCount = 0;
  }

  isMaxRunsReached(): boolean {
    return this._maxRunsReached;
  }

  private run(): Promise<void> {
    return runLoop(this as unknown as RunAccess);
  }
}
