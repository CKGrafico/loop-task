import fs from "node:fs";
import type { LoopOptions, RunRecord, TaskCommand, TaskStep, ExecutionResult } from "../../types.js";
import { executeCommand } from "../command/command-runner.js";
import { rotateLogIfNeeded } from "../logging/log-rotator.js";
import { parseStdout } from "../context/context-parser.js";
import { interpolate } from "../context/template.js";
import { resolveEffectiveCwd } from "../command/resolve-cwd.js";
import type { TaskResolver } from "./types.js";

export interface ExecuteRunAccess {
  _status: import("../../types.js").LoopStatus;
  _forceRun: boolean;
  runCount: number;
  lastRunAt: string | null;
  sessionStartedAt: string | null;
  nextRunAt: string | null;
  logStream: fs.WriteStream | null;
  runAbortController: AbortController | null;
  readonly logPath: string;
  readonly options: LoopOptions;
  readonly taskResolver: TaskResolver;
  readonly projectDirectory: string | undefined;
  currentRunStartOffset: number;
  runHistory: RunRecord[];
  lastExitCode: number | null;
  lastDuration: number | null;
  emit(event: string, ...args: unknown[]): boolean;
}

export async function executeRunImpl(ctrl: ExecuteRunAccess, signal: AbortSignal): Promise<{ exitCode: number; totalDuration: number; chainContext: Record<string, unknown> }> {
  ctrl._status = "running";
  ctrl._forceRun = false;
  ctrl.runCount++;
  ctrl.lastRunAt = new Date().toISOString();
  if (ctrl.sessionStartedAt === null) {
    ctrl.sessionStartedAt = ctrl.lastRunAt;
  }
  ctrl.nextRunAt = null;
  ctrl.emit("run:start", ctrl.runCount);
  ctrl.logStream = rotateLogIfNeeded(ctrl.logPath, ctrl.logStream);

  ctrl.currentRunStartOffset = fs.existsSync(ctrl.logPath) ? fs.statSync(ctrl.logPath).size : 0;

  ctrl.runHistory.push({
    runNumber: ctrl.runCount,
    startedAt: ctrl.lastRunAt,
    exitCode: -1,
    duration: 0,
    logSize: 0,
    status: "running",
    logOffset: ctrl.currentRunStartOffset,
  });

  ctrl.runAbortController = new AbortController();
  const task = ctrl.options.taskId ? ctrl.taskResolver(ctrl.options.taskId) : null;
  const cwd = resolveEffectiveCwd(ctrl.options.cwd, ctrl.projectDirectory);
  const chainContext: Record<string, unknown> = {};
  const hasChainTasks = !!(task?.onSuccessTaskId || task?.onFailureTaskId);

  const singleCommandFallback: TaskCommand = {
    command: task?.command ?? ctrl.options.command,
    commandArgs: task?.commandArgs ?? ctrl.options.commandArgs,
    commandRaw: task?.commandRaw ?? ctrl.options.commandRaw,
  };
  const taskSteps: TaskStep[] = task?.steps?.length
    ? task.steps
    : [{ commands: [singleCommandFallback] }];

  const shouldCaptureStdout = hasChainTasks || taskSteps.length > 1 || taskSteps[0]!.commands.length > 1;

  let exitCode = 0;
  let totalDuration = 0;

  for (const step of taskSteps) {
    const stepResults = await Promise.allSettled(
      step.commands.map((cmd) =>
        executeCommand(
          interpolate(cmd.command, chainContext),
          cmd.commandArgs.map(a => interpolate(a, chainContext)),
          cwd,
          ctrl.logStream!,
          AbortSignal.any([signal, ctrl.runAbortController!.signal]),
          ctrl.runCount,
          shouldCaptureStdout,
        )
      )
    );

    let stepStdout = "";
    for (const r of stepResults) {
      if (r.status === "fulfilled") {
        totalDuration += r.value.duration;
        if (r.value.stdout) stepStdout += (stepStdout ? "\n" : "") + r.value.stdout;
      }
    }

    if (shouldCaptureStdout && stepStdout) {
      const parsed = parseStdout(stepStdout);
      if (parsed !== null) {
        Object.assign(chainContext, parsed);
      }
    }

    const stepFailure = stepResults.some(
      (r) => r.status === "rejected" || (r.status === "fulfilled" && r.value.exitCode !== 0)
    );
    if (stepFailure) {
      const failed = stepResults.find(
        (r): r is PromiseFulfilledResult<ExecutionResult> =>
          r.status === "fulfilled" && r.value.exitCode !== 0
      );
      exitCode = failed ? failed.value.exitCode : 1;
      break;
    }
  }
  ctrl.runAbortController = null;

  ctrl.lastExitCode = exitCode;
  ctrl.lastDuration = totalDuration;

  const logSize = fs.existsSync(ctrl.logPath) ? fs.statSync(ctrl.logPath).size - ctrl.currentRunStartOffset : 0;
  const runningRecord = ctrl.runHistory.find((r) => r.runNumber === ctrl.runCount);
  if (runningRecord) {
    runningRecord.exitCode = exitCode;
    runningRecord.duration = totalDuration;
    runningRecord.logSize = Math.max(0, logSize);
    runningRecord.status = "completed";
  } else {
    ctrl.runHistory.push({
      runNumber: ctrl.runCount,
      startedAt: ctrl.lastRunAt,
      exitCode,
      duration: totalDuration,
      logSize: Math.max(0, logSize),
      status: "completed",
      logOffset: ctrl.currentRunStartOffset,
    });
  }

  return { exitCode, totalDuration, chainContext };
}
