import fs from "node:fs";
import { computePhase, alignToPhase } from "../scheduling/index.js";
import { resolveEffectiveCwd } from "../command/resolve-cwd.js";
import { executeChain } from "./chain-executor.js";
import { executeRunImpl } from "./run-executor.js";
import { waitForResume, waitForDelay } from "./delay-utils.js";
import { MAX_INMEMORY_RUN_HISTORY } from "../../shared/config/constants.js";
import type { DelayAccess } from "./delay-utils.js";
import type { ExecuteRunAccess } from "./run-executor.js";

export interface RunAccess extends DelayAccess, ExecuteRunAccess {
  abortController: AbortController;
  _stopAfterRun: boolean;
  _maxRunsReached: boolean;
  _savedRemainingMs: number | null;
  _resetSchedule: boolean;
  runCount: number;
  skippedCount: number;
  readonly id: string;
  readonly options: import("../../types.js").LoopOptions;
  taskResolver: import("./types.js").TaskResolver;
  readonly logPath: string;
  readonly projectDirectory: string | undefined;
  runHistory: import("../../types.js").RunRecord[];
  logStream: import("node:stream").Writable | null;
  lastExitCode: number | null;
  lastDuration: number | null;
  remainingDelayMs: number | null;
  nextRunAt: string | null;
  sessionStartedAt: string | null;
  emit(event: string, ...args: unknown[]): boolean;
  checkLogRotation(): void;
}

export async function runLoop(ctrl: RunAccess): Promise<void> {
  const signal = ctrl.abortController.signal;
  let isFirstRun = true;

  try {
    while (!signal.aborted) {
      if (ctrl.options.maxRuns !== null && ctrl.runCount >= ctrl.options.maxRuns) {
        ctrl._maxRunsReached = true;
        ctrl._paused = true;
        ctrl._status = "paused";
        ctrl.emit("paused");
        return;
      }

      if (isFirstRun && ctrl._paused) {
        await waitForResume(ctrl);
        if (signal.aborted) break;
      }

      if (isFirstRun && ctrl.nextRunAt) {
        const delay = Math.max(0, new Date(ctrl.nextRunAt).getTime() - Date.now());
        if (delay > 0) {
          const completed = await waitForDelay(ctrl, delay, signal);
          if (!completed) break;
        }
      } else if (isFirstRun && !ctrl.options.immediate) {
        const phase = ctrl.options.offset !== null
          ? ctrl.options.offset
          : computePhase(ctrl.id, ctrl.options.interval);
        const delay = alignToPhase(Date.now(), ctrl.options.interval, phase);
        if (delay > 0) {
          ctrl.nextRunAt = new Date(Date.now() + delay).toISOString();
        }
        const completed = await waitForDelay(ctrl, delay, signal);
        if (!completed) break;
      }

      isFirstRun = false;

      if (ctrl._paused) {
        await waitForResume(ctrl);
        if (signal.aborted) break;
      }

      const runStartedAtMs = Date.now();
      const { exitCode, totalDuration, chainContext } = await executeRunImpl(ctrl, signal);

      const chainTargetId = exitCode === 0
        ? (ctrl.options.taskId ? ctrl.taskResolver(ctrl.options.taskId)?.onSuccessTaskId : undefined)
        : (ctrl.options.taskId ? ctrl.taskResolver(ctrl.options.taskId)?.onFailureTaskId : undefined);

      if (chainTargetId && !signal.aborted) {
        const task = ctrl.options.taskId ? ctrl.taskResolver(ctrl.options.taskId) : null;
        const cwd = resolveEffectiveCwd(ctrl.options.cwd, ctrl.projectDirectory);
        const chainResult = await executeChain({
          chainTargetId,
          exitCode,
          task,
          chainContext,
          cwd,
          signal,
          runCount: ctrl.runCount,
          logPath: ctrl.logPath,
          runHistory: ctrl.runHistory,
          logStream: ctrl.logStream,
          controller: ctrl as unknown as import("./loop-controller.js").LoopController,
        });
        ctrl.runHistory = chainResult.runHistory;
        ctrl.lastExitCode = chainResult.lastExitCode;
        ctrl.lastDuration = (ctrl.lastDuration ?? 0) + chainResult.lastDuration;
      }

      if (ctrl.runHistory.length > MAX_INMEMORY_RUN_HISTORY) {
        ctrl.runHistory = ctrl.runHistory.slice(-MAX_INMEMORY_RUN_HISTORY);
      }
      ctrl.emit("run:end", { exitCode, duration: totalDuration });

      if (signal.aborted) break;

      if (ctrl.options.maxRuns !== null && ctrl.runCount >= ctrl.options.maxRuns) {
        ctrl._maxRunsReached = true;
        ctrl._paused = true;
        ctrl._status = "paused";
        ctrl.remainingDelayMs = null;
        ctrl.nextRunAt = null;
        ctrl.emit("paused");
        return;
      }

      if (ctrl._stopAfterRun) {
        ctrl._stopAfterRun = false;
        ctrl._paused = true;
        ctrl._status = "idle";
        ctrl.remainingDelayMs = null;
        ctrl.nextRunAt = null;
        ctrl.emit("stopped");
        return;
      }

      const saved = ctrl._savedRemainingMs;
      ctrl._savedRemainingMs = null;
      if (saved !== null) {
        const remaining = Math.max(0, saved - totalDuration);
        if (remaining > 0) {
          const completed = await waitForDelay(ctrl, remaining, signal);
          if (!completed) break;
        }
      } else {
        if (ctrl.options.interval === 0) {
          ctrl._paused = true;
          ctrl._status = "idle";
          ctrl.remainingDelayMs = null;
          ctrl.nextRunAt = null;
          ctrl.emit("stopped");
          return;
        }
        const nextSlotMs = runStartedAtMs + ctrl.options.interval;
        const overrunMs = Date.now() - nextSlotMs;
        if (overrunMs >= 0) {
          const missed = Math.floor(overrunMs / ctrl.options.interval) + 1;
          ctrl.skippedCount += missed;
          const adjustedDelay = ctrl.options.interval - (overrunMs % ctrl.options.interval);
          const completed = await waitForDelay(ctrl, adjustedDelay, signal);
          if (!completed) break;
        } else {
          const completed = await waitForDelay(ctrl, ctrl.options.interval, signal);
          if (!completed) break;
        }
      }
    }
  } finally {
    if (ctrl._status !== "idle" && ctrl._status !== "paused" && !ctrl._maxRunsReached) {
      ctrl._status = "idle";
    }
  }
}
