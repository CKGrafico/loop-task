import type { LoopStatus } from "../../types.js";
import { sleep } from "../../shared/sleep.js";
import { SLEEP_CHUNK_MS } from "../../shared/config/constants.js";

export interface DelayAccess {
  _paused: boolean;
  _forceRun: boolean;
  _savedRemainingMs: number | null;
  _resetSchedule: boolean;
  _status: LoopStatus;
  resumeResolve: (() => void) | null;
  remainingDelayMs: number | null;
  nextRunAt: string | null;
  emit(event: string, ...args: unknown[]): boolean;
}

export function waitForResume(ctrl: DelayAccess): Promise<void> {
  const savedStatus = ctrl._status;
  ctrl._status = savedStatus === "idle" ? "idle" : "paused";
  return new Promise<void>((resolve) => {
    ctrl.resumeResolve = resolve;
  });
}

export async function waitForDelay(ctrl: DelayAccess, ms: number, signal: AbortSignal): Promise<boolean> {
  let remaining = ms;
  ctrl.remainingDelayMs = remaining;
  let announced = false;

  while (remaining > 0) {
    if (ctrl._forceRun) {
      ctrl._savedRemainingMs = remaining;
      ctrl.remainingDelayMs = null;
      ctrl.nextRunAt = null;
      return true;
    }

    if (ctrl._resetSchedule) {
      ctrl._resetSchedule = false;
      remaining = ms;
      ctrl.remainingDelayMs = remaining;
      announced = false;
    }

    if (ctrl._paused) {
      if (ctrl._status !== "idle") {
        ctrl._status = "paused";
      }
      ctrl.emit("paused");
      await waitForResume(ctrl);
      announced = false;
      if (signal.aborted) {
        ctrl.remainingDelayMs = null;
        return false;
      }
      if (ctrl._resetSchedule) {
        ctrl._resetSchedule = false;
        remaining = ms;
        ctrl.remainingDelayMs = remaining;
      }
    }

    if (!announced) {
      ctrl._status = "waiting";
      ctrl.nextRunAt = new Date(Date.now() + remaining).toISOString();
      ctrl.emit("waiting");
      announced = true;
    }

    const chunk = Math.min(remaining, SLEEP_CHUNK_MS);
    const startedAt = Date.now();

    try {
      await sleep(chunk, signal);
    } catch {
      ctrl.remainingDelayMs = null;
      return false;
    }

    remaining = Math.max(0, remaining - (Date.now() - startedAt));
    ctrl.remainingDelayMs = remaining;
  }

  ctrl.remainingDelayMs = null;
  ctrl.nextRunAt = null;
  return true;
}
