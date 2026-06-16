import { EventEmitter } from "node:events";
import fs from "node:fs";
import type { LoopOptions, LoopStatus, LoopMeta, RunRecord } from "../types.js";
import { sleep } from "../shared/sleep.js";
import { SLEEP_CHUNK_MS } from "../config/constants.js";
import { executeCommand } from "./command-runner.js";
import { rotateLogIfNeeded } from "./log-rotator.js";

interface LoopControllerState {
  status?: LoopStatus;
  createdAt?: string;
  runCount?: number;
  lastRunAt?: string | null;
  lastExitCode?: number | null;
  lastDuration?: number | null;
  nextRunAt?: string | null;
  remainingDelayMs?: number | null;
  runHistory?: RunRecord[];
}

export class LoopController extends EventEmitter {
  private abortController: AbortController;
  private runAbortController: AbortController | null = null;
  private _paused = false;
  private _forceRun = false;
  private interruptedForForceRun = false;
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
  private remainingDelayMs: number | null = null;
  private logStream: fs.WriteStream | null = null;
  private loopPromise: Promise<void> | null = null;
  private runHistory: RunRecord[] = [];
  private currentRunStartOffset: number = 0;

  constructor(
    id: string,
    options: LoopOptions,
    logPath: string,
    state?: LoopControllerState
  ) {
    super();
    this.id = id;
    this.options = options;
    this.logPath = logPath;
    this.abortController = new AbortController();
    this.createdAt = state?.createdAt ?? new Date().toISOString();
    this.runCount = state?.runCount ?? 0;
    this.lastRunAt = state?.lastRunAt ?? null;
    this.lastExitCode = state?.lastExitCode ?? null;
    this.lastDuration = state?.lastDuration ?? null;
    this.nextRunAt = state?.nextRunAt ?? null;
    this.remainingDelayMs = state?.remainingDelayMs ?? null;
    this._status = state?.status ?? "running";
    this._paused = state?.status === "paused";
    this.runHistory = state?.runHistory ?? [];
  }

  get status(): LoopStatus {
    return this._status;
  }

  start(): void {
    this.logStream = fs.createWriteStream(this.logPath, { flags: "a" });
    this.loopPromise = this.run();
  }

  pause(interruptCurrentRun = false): void {
    if (this._status === "running" || this._status === "sleeping") {
      this._paused = true;
      this._status = "paused";
      if (interruptCurrentRun && this._status === "paused") {
        this.runAbortController?.abort();
      }
      this.emit("paused");
    }
  }

  resume(): void {
    if (this._paused && this.resumeResolve) {
      this._paused = false;
      if (this.remainingDelayMs !== null) {
        this._status = "sleeping";
        this.nextRunAt = new Date(Date.now() + this.remainingDelayMs).toISOString();
      }
      this.resumeResolve();
      this.resumeResolve = null;
      this.emit("resumed");
    }
  }

  triggerNow(interruptCurrentRun = false): boolean {
    if (this._status === "stopped") {
      return false;
    }
    this._forceRun = true;
    this.remainingDelayMs = null;
    this.nextRunAt = null;
    if (interruptCurrentRun) {
      this.interruptedForForceRun = true;
      this.runAbortController?.abort();
    }
    if (this._paused) {
      this.resume();
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

  getMeta(): Omit<LoopMeta, "command" | "commandArgs" | "interval" | "intervalHuman" | "immediate" | "maxRuns" | "verbose" | "cwd" | "description" | "pid"> {
    return {
      id: this.id,
      status: this._status,
      createdAt: this.createdAt,
      runCount: this.runCount,
      lastRunAt: this.lastRunAt,
      lastExitCode: this.lastExitCode,
      lastDuration: this.lastDuration,
      nextRunAt: this.nextRunAt,
      remainingDelayMs: this.remainingDelayMs,
      runHistory: this.runHistory,
    };
  }

  private async waitForResume(): Promise<void> {
    this._status = "paused";
    return new Promise<void>((resolve) => {
      this.resumeResolve = resolve;
    });
  }

  private async waitForDelay(ms: number, signal: AbortSignal): Promise<boolean> {
    let remaining = ms;
    this.remainingDelayMs = remaining;
    let announced = false;

    while (remaining > 0) {
      if (this._forceRun) {
        this.remainingDelayMs = null;
        this.nextRunAt = null;
        return true;
      }

      if (this._paused) {
        this._status = "paused";
        this.emit("paused");
        await this.waitForResume();
        announced = false;
        if (signal.aborted) {
          this.remainingDelayMs = null;
          return false;
        }
      }

      if (!announced) {
        this._status = "sleeping";
        this.nextRunAt = new Date(Date.now() + remaining).toISOString();
        this.emit("sleeping");
        announced = true;
      }

      const chunk = Math.min(remaining, SLEEP_CHUNK_MS);
      const startedAt = Date.now();

      try {
        await sleep(chunk, signal);
      } catch {
        this.remainingDelayMs = null;
        return false;
      }

      remaining = Math.max(0, remaining - (Date.now() - startedAt));
      this.remainingDelayMs = remaining;
    }

    this.remainingDelayMs = null;
    this.nextRunAt = null;
    return true;
  }

  private async run(): Promise<void> {
    const signal = this.abortController.signal;
    let isFirstRun = true;

    try {
      while (!signal.aborted) {
        if (this.options.maxRuns !== null && this.runCount >= this.options.maxRuns) {
          this._status = "stopped";
          this.emit("stopped");
          return;
        }

        if (isFirstRun && this._paused) {
          await this.waitForResume();
          if (signal.aborted) break;
        }

        if (isFirstRun && this.nextRunAt) {
          const delay = this.remainingDelayMs ?? (new Date(this.nextRunAt).getTime() - Date.now());
          if (delay > 0) {
            const completed = await this.waitForDelay(delay, signal);
            if (!completed) {
              break;
            }
          }
        } else if (isFirstRun && !this.options.immediate) {
          const completed = await this.waitForDelay(this.options.interval, signal);
          if (!completed) {
            break;
          }
        }

        isFirstRun = false;

        if (this._paused) {
          await this.waitForResume();
          if (signal.aborted) break;
        }

        this._status = "running";
        this._forceRun = false;
        this.runCount++;
        this.lastRunAt = new Date().toISOString();
        this.nextRunAt = null;
        this.emit("run:start", this.runCount);
        this.logStream = rotateLogIfNeeded(this.logPath, this.logStream);

        this.currentRunStartOffset = fs.existsSync(this.logPath) ? fs.statSync(this.logPath).size : 0;

        this.runAbortController = new AbortController();
        const result = await executeCommand(
          this.options.command,
          this.options.commandArgs,
          this.options.cwd,
          this.logStream!,
          AbortSignal.any([signal, this.runAbortController.signal])
        );
        this.runAbortController = null;

        this.lastExitCode = result.exitCode;
        this.lastDuration = result.duration;

        if (!this.interruptedForForceRun) {
          const logSize = fs.existsSync(this.logPath) ? fs.statSync(this.logPath).size - this.currentRunStartOffset : 0;
          this.runHistory.push({
            runNumber: this.runCount,
            startedAt: this.lastRunAt,
            exitCode: result.exitCode,
            duration: result.duration,
            logSize: Math.max(0, logSize),
          });
          if (this.runHistory.length > 50) {
            this.runHistory = this.runHistory.slice(-50);
          }
        }

        if (this.interruptedForForceRun) {
          this.runCount = Math.max(0, this.runCount - 1);
          this.interruptedForForceRun = false;
        }
        this.emit("run:end", result);

        if (signal.aborted) break;

        if (this.options.maxRuns !== null && this.runCount >= this.options.maxRuns) {
          this._status = "stopped";
          this.emit("stopped");
          return;
        }

        const completed = await this.waitForDelay(this.options.interval, signal);
        if (!completed) {
          break;
        }
      }
    } finally {
      if (this._status !== "stopped") {
        this._status = "stopped";
      }
    }
  }
}
