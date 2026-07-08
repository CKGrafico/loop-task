import crypto from "node:crypto";
import fs from "node:fs";
import type { ExecutionResult, TaskDefinition } from "../../types.js";
import { executeCommand } from "../command/command-runner.js";
import { t } from "../../shared/i18n/index.js";
import { parseStdout } from "../context/context-parser.js";
import { interpolate } from "../context/template.js";
import type { LoopController } from "./loop-controller.js";

export interface ChainExecuteOptions {
  chainTargetId: string | undefined;
  exitCode: number;
  task: TaskDefinition | null;
  chainContext: Record<string, unknown>;
  cwd: string;
  signal: AbortSignal;
  runCount: number;
  logPath: string;
  runHistory: import("../../types.js").RunRecord[];
  logStream: fs.WriteStream | null;
  controller: LoopController;
}

export interface ChainExecuteResult {
  runHistory: import("../../types.js").RunRecord[];
  lastExitCode: number;
  lastDuration: number;
}

export function executeChain(options: ChainExecuteOptions): Promise<ChainExecuteResult> {
  const { chainTargetId, exitCode, task, chainContext, cwd, signal, runCount, logPath, runHistory, logStream, controller } = options;

  if (!chainTargetId) {
    return Promise.resolve({ runHistory, lastExitCode: exitCode, lastDuration: 0 });
  }

  const chainGroupId = crypto.randomUUID().slice(0, 8);
  const mainRecord = runHistory[runHistory.length - 1];
  if (mainRecord) mainRecord.chainGroupId = chainGroupId;

  let currentTargetId: string | null = chainTargetId;
  let prevBranch = exitCode === 0 ? "onSuccess" : "onFailure";
  let prevExit = exitCode;
  let totalExtraDuration = 0;
  let finalExitCode = exitCode;

  return (async () => {
    while (currentTargetId) {
      const chainTask = controller.taskResolver(currentTargetId);
      if (!chainTask) break;

      if (logStream) {
        logStream.write(t("loop.chainHeader", { name: chainTask.name, branch: prevBranch, prevExit }));
      }

      const chainStartedAt = new Date().toISOString();
      const chainOffset = fs.existsSync(logPath) ? fs.statSync(logPath).size : 0;
      runHistory.push({
        runNumber: runCount,
        startedAt: chainStartedAt,
        exitCode: -1,
        duration: 0,
        logSize: 0,
        status: "running",
        logOffset: chainOffset,
        chainGroupId,
        chainName: chainTask.name,
      });

      const interpolatedCommand = interpolate(chainTask.command, chainContext);
      const interpolatedArgs = chainTask.commandArgs.map(a => interpolate(a, chainContext));
      const chainResult = await executeCommand(
        interpolatedCommand,
        interpolatedArgs,
        cwd,
        logStream!,
        signal,
        runCount,
        true,
        true,
      );

      if (chainResult.stdout) {
        const parsed = parseStdout(chainResult.stdout);
        if (parsed !== null) {
          Object.assign(chainContext, parsed);
        }
      }

      const chainLogSize = fs.existsSync(logPath) ? fs.statSync(logPath).size - chainOffset : 0;
      const chainRecord = runHistory.find(r => r.chainGroupId === chainGroupId && r.status === "running" && r.chainName === chainTask.name);
      if (chainRecord) {
        chainRecord.exitCode = chainResult.exitCode;
        chainRecord.duration = chainResult.duration;
        chainRecord.logSize = Math.max(0, chainLogSize);
        chainRecord.status = "completed";
      }

      totalExtraDuration += chainResult.duration;
      finalExitCode = chainResult.exitCode;

      currentTargetId = (chainResult.exitCode === 0 ? chainTask.onSuccessTaskId : chainTask.onFailureTaskId) ?? null;
      prevBranch = chainResult.exitCode === 0 ? "onSuccess" : "onFailure";
      prevExit = chainResult.exitCode;
    }

    return { runHistory, lastExitCode: finalExitCode, lastDuration: totalExtraDuration };
  })();
}
