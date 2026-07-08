import type { LoopOptions, LoopState } from "../../types.js";
import { Logger } from "../../logger.js";
import { formatDuration } from "../../duration.js";
import { t } from "../../shared/i18n/index.js";
import { sleep } from "../../shared/sleep.js";
import { executeCommandForeground } from "../command/command-runner.js";

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
    logger.info(t("loop.shuttingDown"));
  };

  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);

  const command = options.command;
  const commandArgs = options.commandArgs;
  const cwd = options.cwd;

  try {
    let isFirstRun = true;

    while (!state.shuttingDown) {
      if (
        options.maxRuns !== null &&
        state.runCount >= options.maxRuns
      ) {
        logger.info(t("loop.completed", { runs: state.runCount }));
        break;
      }

      if (isFirstRun && !options.immediate) {
        logger.info(
          t("loop.waitingFirst", { duration: formatDuration(options.interval) })
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
        t("loop.runSeparator", {
          run: state.runCount,
          maxRuns: options.maxRuns !== null ? `/${options.maxRuns}` : "",
        })
      );

      const result = await executeCommandForeground(command, commandArgs, logger, cwd);
      state.running = false;

      if (result.exitCode !== 0) {
        logger.error(
          t("loop.commandFailed", { code: result.exitCode })
        );
      }

      if (options.verbose) {
        logger.debug(t("loop.debugStartedAt", { timestamp: result.startedAt.toISOString() }));
        logger.debug(t("loop.debugEndedAt", { timestamp: result.endedAt.toISOString() }));
        logger.debug(t("loop.debugExitCode", { code: result.exitCode }));
        logger.debug(t("loop.debugDuration", { duration: formatDuration(result.duration) }));
      }

      if (state.shuttingDown) break;

      if (
        options.maxRuns !== null &&
        state.runCount >= options.maxRuns
      ) {
        logger.info(t("loop.completed", { runs: state.runCount }));
        break;
      }

      const nextRun = new Date(Date.now() + options.interval);
      logger.info(
        t("loop.nextRun", {
          duration: formatDuration(options.interval),
          time: nextRun.toLocaleTimeString(),
        })
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
