import { execa } from "execa";
import type { LoopOptions, ExecutionResult, LoopState } from "./types.js";
import { Logger } from "./logger.js";
import { formatDuration } from "./duration.js";

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

export async function executeCommand(
  command: string,
  commandArgs: string[],
  logger: Logger
): Promise<ExecutionResult> {
  const startedAt = new Date();

  logger.debug(`Executing: ${command} ${commandArgs.join(" ")}`);

  try {
    const result = await execa(command, commandArgs, {
      stdout: "inherit",
      stderr: "inherit",
      stdin: "inherit",
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

      const result = await executeCommand(options.command, options.commandArgs, logger);
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
