import { EventEmitter } from "node:events";
import fs from "node:fs";
import { execa, type ResultPromise } from "execa";
import type {
  LoopOptions,
  ExecutionResult,
  LoopStatus,
  LoopMeta,
  LoopState,
} from "./types.js";
import { Logger } from "./logger.js";
import { formatDuration } from "./duration.js";

const MAX_LOG_BYTES = 1024 * 1024;
const MAX_LOG_GENERATIONS = 3;

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

async function executeCommand(
  command: string,
  commandArgs: string[],
  cwd: string,
  logStream: fs.WriteStream
): Promise<ExecutionResult> {
  const startedAt = new Date();
  const header = `\n--- Run at ${startedAt.toISOString()} ---\n`;
  logStream.write(header);

  if (cwd && !fs.existsSync(cwd)) {
    const endedAt = new Date();
    logStream.write(`[error] working directory does not exist: ${cwd}\n`);
    logStream.write(`[exit 1 | ${formatDuration(0)}]\n`);
    return { exitCode: 1, duration: 0, startedAt, endedAt };
  }

  const child: ResultPromise = execa(command, commandArgs, {
    stdout: "pipe",
    stderr: "pipe",
    stdin: "ignore",
    cwd: cwd || undefined,
  });

  child.stdout!.on("data", (chunk: Buffer) => {
    logStream.write(chunk);
  });
  child.stderr!.on("data", (chunk: Buffer) => {
    logStream.write(chunk);
  });

  try {
    const result = await child;
    const endedAt = new Date();
    const duration = endedAt.getTime() - startedAt.getTime();
    logStream.write(`[exit ${result.exitCode} | ${formatDuration(duration)}]\n`);
    return { exitCode: result.exitCode ?? 0, duration, startedAt, endedAt };
  } catch (error: unknown) {
    const endedAt = new Date();
    const duration = endedAt.getTime() - startedAt.getTime();
    const exitCode =
      error && typeof error === "object" && "exitCode" in error
        ? (error as { exitCode: number }).exitCode
        : 1;
    logStream.write(`[exit ${exitCode} | ${formatDuration(duration)}]\n`);
    return { exitCode, duration, startedAt, endedAt };
  }
}

interface LoopControllerState {
  status?: LoopStatus;
  createdAt?: string;
  runCount?: number;
  lastRunAt?: string | null;
  lastExitCode?: number | null;
  lastDuration?: number | null;
  nextRunAt?: string | null;
  remainingDelayMs?: number | null;
}

export class LoopController extends EventEmitter {
  private abortController: AbortController;
  private _paused = false;
  private _forceRun = false;
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
  }

  get status(): LoopStatus {
    return this._status;
  }

  start(): void {
    this.logStream = fs.createWriteStream(this.logPath, { flags: "a" });
    this.loopPromise = this.run();
  }

  private rotateLogIfNeeded(): void {
    if (!fs.existsSync(this.logPath)) {
      return;
    }

    const size = fs.statSync(this.logPath).size;
    if (size < MAX_LOG_BYTES) {
      return;
    }

    this.logStream?.end();

    for (let index = MAX_LOG_GENERATIONS; index >= 1; index--) {
      const currentPath = `${this.logPath}.${index}`;
      if (!fs.existsSync(currentPath)) {
        continue;
      }

      if (index === MAX_LOG_GENERATIONS) {
        fs.unlinkSync(currentPath);
        continue;
      }

      fs.renameSync(currentPath, `${this.logPath}.${index + 1}`);
    }

    fs.renameSync(this.logPath, `${this.logPath}.1`);
    this.logStream = fs.createWriteStream(this.logPath, { flags: "a" });
  }

  pause(): void {
    if (this._status === "running" || this._status === "sleeping") {
      this._paused = true;
      this._status = "paused";
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

  triggerNow(): boolean {
    if (this._status === "stopped") {
      return false;
    }
    this._forceRun = true;
    this.remainingDelayMs = null;
    this.nextRunAt = null;
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
        if (signal.aborted) {
          this.remainingDelayMs = null;
          return false;
        }
      }

      this._status = "sleeping";
      this.nextRunAt = new Date(Date.now() + remaining).toISOString();
      this.emit("sleeping");

      const chunk = Math.min(remaining, 200);
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
        this.rotateLogIfNeeded();

        const result = await executeCommand(
          this.options.command,
          this.options.commandArgs,
          this.options.cwd,
          this.logStream!
        );

        this.lastExitCode = result.exitCode;
        this.lastDuration = result.duration;
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

export async function executeCommandForeground(
  command: string,
  commandArgs: string[],
  logger: Logger,
  cwd = ""
): Promise<ExecutionResult> {
  const startedAt = new Date();
  logger.debug(`Executing: ${command} ${commandArgs.join(" ")}`);

  if (cwd && !fs.existsSync(cwd)) {
    logger.error(`Working directory does not exist: ${cwd}`);
    const endedAt = new Date();
    return { exitCode: 1, duration: 0, startedAt, endedAt };
  }

  try {
    const result = await execa(command, commandArgs, {
      stdout: "inherit",
      stderr: "inherit",
      stdin: "inherit",
      cwd: cwd || undefined,
    });

    const endedAt = new Date();
    return {
      exitCode: result.exitCode ?? 0,
      duration: endedAt.getTime() - startedAt.getTime(),
      startedAt,
      endedAt,
    };
  } catch (error: unknown) {
    const endedAt = new Date();
    const exitCode =
      error && typeof error === "object" && "exitCode" in error
        ? (error as { exitCode: number }).exitCode
        : 1;

    return {
      exitCode,
      duration: endedAt.getTime() - startedAt.getTime(),
      startedAt,
      endedAt,
    };
  }
}

export async function runLoop(
  options: LoopOptions,
  logger: Logger,
  signal: AbortSignal
): Promise<void> {
  const state: LoopState = {
    running: false,
    runCount: 0,
    shuttingDown: false,
  };

  const onSignal = () => {
    state.shuttingDown = true;
    logger.info("\nShutting down gracefully...");
  };

  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);

  try {
    let isFirstRun = true;

    while (!state.shuttingDown) {
      if (
        options.maxRuns !== null &&
        state.runCount >= options.maxRuns
      ) {
        logger.info(`Completed ${state.runCount} run(s). Exiting.`);
        break;
      }

      if (isFirstRun && !options.immediate) {
        logger.info(
          `Waiting ${formatDuration(options.interval)} before first run...`
        );
        try {
          await sleep(options.interval, signal);
        } catch {
          break;
        }
        if (state.shuttingDown) break;
      }

      isFirstRun = false;

      state.running = true;
      state.runCount++;

      logger.info(
        `\n--- Run ${state.runCount}${options.maxRuns !== null ? `/${options.maxRuns}` : ""} ---`
      );

      const result = await executeCommandForeground(options.command, options.commandArgs, logger, options.cwd);
      state.running = false;

      if (result.exitCode !== 0) {
        logger.error(
          `Command failed with exit code ${result.exitCode}`
        );
      }

      if (options.verbose) {
        logger.debug(`Started at:  ${result.startedAt.toISOString()}`);
        logger.debug(`Ended at:    ${result.endedAt.toISOString()}`);
        logger.debug(`Exit code:   ${result.exitCode}`);
        logger.debug(`Duration:    ${formatDuration(result.duration)}`);
      }

      if (state.shuttingDown) break;

      if (
        options.maxRuns !== null &&
        state.runCount >= options.maxRuns
      ) {
        logger.info(`Completed ${state.runCount} run(s). Exiting.`);
        break;
      }

      const nextRun = new Date(Date.now() + options.interval);
      logger.info(
        `Next run in ${formatDuration(options.interval)} (at ${nextRun.toLocaleTimeString()})`
      );

      try {
        await sleep(options.interval, signal);
      } catch {
        break;
      }
    }
  } finally {
    process.removeListener("SIGINT", onSignal);
    process.removeListener("SIGTERM", onSignal);
  }
}
