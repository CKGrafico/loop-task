import fs from "node:fs";
import type { LoopManager } from "./managers/loop-manager.js";
import type { getActivePids } from "../core/command/command-runner.js";

export interface MemoryDiagnostics {
  process: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
  };
  loops: {
    total: number;
    running: number;
    paused: number;
    idle: number;
    totalRunHistory: number;
  };
  activeExecutions: number;
  timestamp: string;
  extended?: {
    eventListenerCounts: Record<string, number>;
    activeFileDescriptors: number | null;
    activeChildPids: number[];
  };
}

let activePidsGetter: typeof getActivePids | null = null;

export function setActivePidsGetter(getter: typeof getActivePids): void {
  activePidsGetter = getter;
}

export function collectDiagnostics(loopManager: LoopManager, extended: boolean = false): MemoryDiagnostics {
  const usage = process.memoryUsage();
  const loops = loopManager.list();

  let running = 0;
  let paused = 0;
  let idle = 0;
  let totalRunHistory = 0;

  for (const loop of loops) {
    switch (loop.status) {
      case "running":
      case "waiting":
        running++;
        break;
      case "paused":
        paused++;
        break;
      default:
        idle++;
        break;
    }
    totalRunHistory += loop.runHistory.length;
  }

  const result: MemoryDiagnostics = {
    process: {
      rss: usage.rss,
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      arrayBuffers: usage.arrayBuffers,
    },
    loops: {
      total: loops.length,
      running,
      paused,
      idle,
      totalRunHistory,
    },
    activeExecutions: running,
    timestamp: new Date().toISOString(),
  };

  if (extended) {
    const eventListenerCounts: Record<string, number> = {};
    try {
      const counts = (process as unknown as { _getActiveRequests?: () => unknown[] })._getActiveRequests;
      if (typeof counts === "function") {
        eventListenerCounts.activeRequests = counts().length;
      }
    } catch { /* not available */ }

    try {
      const handles = (process as unknown as { _getActiveHandles?: () => unknown[] })._getActiveHandles;
      if (typeof handles === "function") {
        eventListenerCounts.activeHandles = handles().length;
      }
    } catch { /* not available */ }

    let activeFileDescriptors: number | null = null;
    try {
      activeFileDescriptors = fs.readdirSync("/proc/self/fd").length;
    } catch { /* not available on non-Linux */ }

    let activeChildPids: number[] = [];
    try {
      if (activePidsGetter) {
        activeChildPids = [...activePidsGetter()];
      }
    } catch { /* not available */ }

    result.extended = {
      eventListenerCounts,
      activeFileDescriptors,
      activeChildPids,
    };
  }

  return result;
}

const DIAGNOSTICS_ENV_VAR = "LOOP_TASK_DIAGNOSTICS";

export function isDiagnosticsEnabled(): boolean {
  return process.env[DIAGNOSTICS_ENV_VAR] === "1" || process.env[DIAGNOSTICS_ENV_VAR] === "true";
}
