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
