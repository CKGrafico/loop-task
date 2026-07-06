import { EventEmitter } from "node:events";
import fs from "node:fs";
import crypto from "node:crypto";
import type { LoopOptions, LoopStatus, LoopMeta, RunRecord, TaskDefinition } from "../types.js";
import { sleep } from "../shared/sleep.js";
import { SLEEP_CHUNK_MS } from "../config/constants.js";
import { executeCommand } from "./command-runner.js";
import { rotateLogIfNeeded } from "./log-rotator.js";
import { computePhase, alignToPhase } from "./scheduling.js";
import { t } from "../i18n/index.js";
import { parseStdout } from "./context-parser.js";
import { interpolate } from "./template.js";
import { resolveEffectiveCwd } from "./resolve-cwd.js";

export type TaskResolver = (taskId: string) => TaskDefinition | null;

interface LoopControllerState {
  status?: LoopStatus;
  createdAt?: string;
  runCount?: number;
  maxRunsReached?: boolean;
  sessionStartedAt?: string | null;
  lastRunAt?: string | null;
  lastExitCode?: number | null;
  lastDuration?: number | null;
  nextRunAt?: string | null;
  remainingDelayMs?: number | null;
  runHistory?: RunRecord[];
  skippedCount?: number;
}

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
  private readonly taskResolver: TaskResolver;
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
  }

  isMaxRunsReached(): boolean {
    return this._maxRunsReached;
  }

  private async waitForResume(): Promise<void> {
    const savedStatus = this._status;
    this._status = savedStatus === "idle" ? "idle" : "paused";
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
        this._savedRemainingMs = remaining;
        this.remainingDelayMs = null;
        this.nextRunAt = null;
        return true;
      }

      if (this._resetSchedule) {
        this._resetSchedule = false;
        remaining = ms;
        this.remainingDelayMs = remaining;
        announced = false;
      }

      if (this._paused) {
        if (this._status !== "idle") {
          this._status = "paused";
        }
        this.emit("paused");
        await this.waitForResume();
        announced = false;
        if (signal.aborted) {
          this.remainingDelayMs = null;
          return false;
        }
        if (this._resetSchedule) {
          this._resetSchedule = false;
          remaining = ms;
          this.remainingDelayMs = remaining;
        }
      }

      if (!announced) {
        this._status = "waiting";
        this.nextRunAt = new Date(Date.now() + remaining).toISOString();
        this.emit("waiting");
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
          this._maxRunsReached = true;
          this._paused = true;
          this._status = "paused";
          this.emit("paused");
          return;
        }

        if (isFirstRun && this._paused) {
          await this.waitForResume();
          if (signal.aborted) break;
        }

        if (isFirstRun && this.nextRunAt) {
          const delay = Math.max(0, new Date(this.nextRunAt).getTime() - Date.now());
          if (delay > 0) {
            const completed = await this.waitForDelay(delay, signal);
            if (!completed) {
              break;
            }
          }
        } else if (isFirstRun && !this.options.immediate) {
          const phase = this.options.offset !== null
            ? this.options.offset
            : computePhase(this.id, this.options.interval);
          const delay = alignToPhase(Date.now(), this.options.interval, phase);
          if (delay > 0) {
            this.nextRunAt = new Date(Date.now() + delay).toISOString();
          }
          const completed = await this.waitForDelay(delay, signal);
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
        const runStartedAtMs = Date.now();
        if (this.sessionStartedAt === null) {
          this.sessionStartedAt = this.lastRunAt;
        }
        this.nextRunAt = null;
        this.emit("run:start", this.runCount);
        this.logStream = rotateLogIfNeeded(this.logPath, this.logStream);

        this.currentRunStartOffset = fs.existsSync(this.logPath) ? fs.statSync(this.logPath).size : 0;

        this.runHistory.push({
          runNumber: this.runCount,
          startedAt: this.lastRunAt,
          exitCode: -1,
          duration: 0,
          logSize: 0,
          status: "running",
          logOffset: this.currentRunStartOffset,
        });

        this.runAbortController = new AbortController();
        const task = this.options.taskId ? this.taskResolver(this.options.taskId) : null;
        const command = task?.command ?? this.options.command;
        const commandArgs = task?.commandArgs ?? this.options.commandArgs;
        const cwd = resolveEffectiveCwd(this.options.cwd, this.projectDirectory);
        const chainContext: Record<string, unknown> = {};
        const hasChainTasks = !!(task?.onSuccessTaskId || task?.onFailureTaskId);
        const result = await executeCommand(
          command,
          commandArgs,
          cwd,
          this.logStream!,
          AbortSignal.any([signal, this.runAbortController.signal]),
          this.runCount,
          hasChainTasks
        );
        this.runAbortController = null;

        if (hasChainTasks && result.stdout) {
          const parsed = parseStdout(result.stdout);
          if (parsed !== null) {
            Object.assign(chainContext, parsed);
          }
        }

        this.lastExitCode = result.exitCode;
        this.lastDuration = result.duration;

        const logSize = fs.existsSync(this.logPath) ? fs.statSync(this.logPath).size - this.currentRunStartOffset : 0;
        const runningRecord = this.runHistory.find((r) => r.runNumber === this.runCount);
        if (runningRecord) {
          runningRecord.exitCode = result.exitCode;
          runningRecord.duration = result.duration;
          runningRecord.logSize = Math.max(0, logSize);
          runningRecord.status = "completed";
        } else {
          this.runHistory.push({
            runNumber: this.runCount,
            startedAt: this.lastRunAt,
            exitCode: result.exitCode,
            duration: result.duration,
            logSize: Math.max(0, logSize),
            status: "completed",
            logOffset: this.currentRunStartOffset,
          });
        }

        const chainTargetId = result.exitCode === 0 ? task?.onSuccessTaskId : task?.onFailureTaskId;
        if (chainTargetId) {
          const chainGroupId = crypto.randomUUID().slice(0, 8);
          const mainRecord = this.runHistory[this.runHistory.length - 1];
          if (mainRecord) mainRecord.chainGroupId = chainGroupId;

          let currentTargetId: string | null = chainTargetId;
          let prevBranch = result.exitCode === 0 ? "onSuccess" : "onFailure";
          let prevExit = result.exitCode;
          while (currentTargetId) {
            const chainTask = this.taskResolver(currentTargetId);
            if (!chainTask) break;

            if (this.logStream) {
              this.logStream.write(t("loop.chainHeader", { name: chainTask.name, branch: prevBranch, prevExit }));
            }

            const chainStartedAt = new Date().toISOString();
            const chainOffset = fs.existsSync(this.logPath) ? fs.statSync(this.logPath).size : 0;
            this.runHistory.push({
              runNumber: this.runCount,
              startedAt: chainStartedAt,
              exitCode: -1,
              duration: 0,
              logSize: 0,
              status: "running",
              logOffset: chainOffset,
              chainGroupId,
              chainName: chainTask.name,
            });

            const interpolatedCommand = interpolate(chainTask.command, chainContext);
            const interpolatedArgs = chainTask.commandArgs.map(a => interpolate(a, chainContext));
            const chainResult = await executeCommand(
              interpolatedCommand,
              interpolatedArgs,
              cwd,
              this.logStream!,
              signal,
              this.runCount,
              true,
              true
            );

            if (chainResult.stdout) {
              const parsed = parseStdout(chainResult.stdout);
              if (parsed !== null) {
                Object.assign(chainContext, parsed);
              }
            }

            const chainLogSize = fs.existsSync(this.logPath) ? fs.statSync(this.logPath).size - chainOffset : 0;
            const chainRecord = this.runHistory.find((r) => r.chainGroupId === chainGroupId && r.status === "running" && r.chainName === chainTask.name);
            if (chainRecord) {
              chainRecord.exitCode = chainResult.exitCode;
              chainRecord.duration = chainResult.duration;
              chainRecord.logSize = Math.max(0, chainLogSize);
              chainRecord.status = "completed";
            }

            this.lastExitCode = chainResult.exitCode;
            this.lastDuration = (this.lastDuration ?? 0) + chainResult.duration;

            currentTargetId = (chainResult.exitCode === 0 ? chainTask.onSuccessTaskId : chainTask.onFailureTaskId) ?? null;
            prevBranch = chainResult.exitCode === 0 ? "onSuccess" : "onFailure";
            prevExit = chainResult.exitCode;
          }
        }

        if (this.runHistory.length > 50) {
          this.runHistory = this.runHistory.slice(-50);
        }
        this.emit("run:end", result);

        if (signal.aborted) break;

        if (this.options.maxRuns !== null && this.runCount >= this.options.maxRuns) {
          this._maxRunsReached = true;
          this._paused = true;
          this._status = "paused";
          this.remainingDelayMs = null;
          this.nextRunAt = null;
          this.emit("paused");
          return;
        }

        if (this._stopAfterRun) {
          this._stopAfterRun = false;
          this._paused = true;
          this._status = "idle";
          this.remainingDelayMs = null;
          this.nextRunAt = null;
          this.emit("stopped");
          return;
        }

        const saved = this._savedRemainingMs;
        this._savedRemainingMs = null;
        if (saved !== null) {
          const remaining = Math.max(0, saved - result.duration);
          if (remaining > 0) {
            const completed = await this.waitForDelay(remaining, signal);
            if (!completed) break;
          }
        } else {
          const nextSlotMs = runStartedAtMs + this.options.interval;
          const overrunMs = Date.now() - nextSlotMs;
          if (overrunMs >= 0) {
            const missed = Math.floor(overrunMs / this.options.interval) + 1;
            this.skippedCount += missed;
            const adjustedDelay = this.options.interval - (overrunMs % this.options.interval);
            const completed = await this.waitForDelay(adjustedDelay, signal);
            if (!completed) break;
          } else {
            const completed = await this.waitForDelay(this.options.interval, signal);
            if (!completed) break;
          }
        }
      }
    } finally {
      if (this._status !== "stopped" && this._status !== "idle" && this._status !== "paused" && !this._maxRunsReached) {
        this._status = "stopped";
      }
    }
  }
}
