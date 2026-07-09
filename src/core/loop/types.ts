import type { LoopStatus, RunRecord } from "../../types.js";

export type TaskResolver = (taskId: string) => import("../../types.js").TaskDefinition | null;

export interface LoopControllerState {
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
  silentChainCount?: number;
}
