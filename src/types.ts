export interface LoopOptions {
  interval: number;
  command: string;
  commandArgs: string[];
  immediate: boolean;
  maxRuns: number | null;
  verbose: boolean;
}

export interface ExecutionResult {
  exitCode: number;
  duration: number;
  startedAt: Date;
  endedAt: Date;
}

export interface LoopState {
  running: boolean;
  runCount: number;
  shuttingDown: boolean;
}

export type LoopStatus = "running" | "paused" | "stopped" | "sleeping";

export interface LoopMeta {
  id: string;
  command: string;
  commandArgs: string[];
  interval: number;
  intervalHuman: string;
  immediate: boolean;
  maxRuns: number | null;
  verbose: boolean;
  status: LoopStatus;
  createdAt: string;
  runCount: number;
  lastRunAt: string | null;
  lastExitCode: number | null;
  lastDuration: number | null;
  nextRunAt: string | null;
  pid: number;
}

export type IpcRequest =
  | { type: "start"; payload: LoopOptions & { intervalHuman: string } }
  | { type: "list" }
  | { type: "status"; payload: { id: string } }
  | { type: "pause"; payload: { id: string } }
  | { type: "resume"; payload: { id: string } }
  | { type: "delete"; payload: { id: string } }
  | { type: "attach"; payload: { id: string } }
  | { type: "logs"; payload: { id: string; follow: boolean; tail?: number } }
  | { type: "shutdown" };

export type IpcResponse =
  | { type: "ok"; data?: unknown }
  | { type: "error"; message: string }
  | { type: "data"; line: string }
  | { type: "end" };
