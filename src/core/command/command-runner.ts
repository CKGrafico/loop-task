import fs from "node:fs";
import { Writable } from "node:stream";
import { execa, type ResultPromise } from "execa";
import type { ExecutionResult } from "../../types.js";
import { Logger } from "../../logger.js";
import { formatDuration } from "../../duration.js";
import { t } from "../../shared/i18n/index.js";
import { MAX_CONTEXT_STDOUT_BYTES } from "../../shared/config/constants.js";
import { StdoutCaptureTransform } from "./stdout-capture-transform.js";
import { killProcessTree } from "./process-tree.js";
import type { Telemetry, TelemetrySpan } from "../../daemon/telemetry/index.js";
import type { CommandResult } from "../../daemon/telemetry/telemetry-types.js";
import { getAgentIntegrations } from "../../daemon/telemetry/agent-integrations/index.js";

function quoteArg(arg: string): string {
  if (arg.length === 0) return "''";
  if (/^[A-Za-z0-9_\-=:./,@]+$/.test(arg)) return arg;
  const cleaned = arg.replace(/[\n\r]/g, " ");
  return "'" + cleaned.replace(/'/g, "'\\''") + "'";
}

function formatCommandLine(command: string, commandArgs: string[]): string {
  return [command, ...commandArgs.map(quoteArg)].join(" ").trim();
}

export function extractExitCode(error: unknown): number {
  return error && typeof error === "object" && "exitCode" in error
    ? (error as { exitCode: number }).exitCode
    : 1;
}

export interface WritableLogStream {
  write(chunk: string | Buffer, cb?: (err?: Error | null) => void): boolean;
  end(cb?: () => void): unknown;
}

export function childEnv(): NodeJS.ProcessEnv {
  if (process.env.LOOP_TASK_DEFAULTED_NODE_ENV !== "1") {
    return process.env;
  }
  return {
    ...process.env,
    NODE_ENV: undefined,
    LOOP_TASK_DEFAULTED_NODE_ENV: undefined,
  };
}

const activePids = new Set<number>();

export function getActivePids(): ReadonlySet<number> {
  return activePids;
}

export function killAllActiveProcesses(): void {
  for (const pid of activePids) {
    killProcessTree(pid, "SIGTERM").catch(() => {});
  }
}

export interface TelemetryCommandContext {
  telemetry: Telemetry;
  loopSpan?: TelemetrySpan;
  taskSpan?: TelemetrySpan;
  runId: string;
  loopId: string;
  loopName: string;
  taskId?: string;
  taskName?: string;
  projectId?: string;
  projectName?: string;
  /** Per-task telemetry override from TaskDefinition */
  telemetryConfig?: import("../../types.js").TaskTelemetryConfig;
}

export async function executeCommand(
  command: string,
  commandArgs: string[],
  cwd: string,
  logStream: Writable,
  signal?: AbortSignal,
  runNumber?: number,
  captureStdout: boolean = false,
  isChain: boolean = false,
  telemetryCtx?: TelemetryCommandContext,
): Promise<ExecutionResult> {
  const startedAt = new Date();
  if (!isChain) {
    const header = t("loop.runHeader", { timestamp: startedAt.toLocaleString(), runNumber: runNumber ?? 0 });
    logStream.write(header);
  }
  logStream.write(t("loop.commandLine", { command: formatCommandLine(command, commandArgs) }));
  if (cwd) {
    logStream.write(t("loop.cwdLine", { cwd }));
  }

  if (cwd && !fs.existsSync(cwd)) {
    const endedAt = new Date();
    logStream.write(t("loop.cwdMissingLog", { cwd }));
    logStream.write(t("loop.exitMarker", { code: 1, duration: formatDuration(0) }));
    return { exitCode: 1, duration: 0, startedAt, endedAt };
  }

  const shellCommand = formatCommandLine(command, commandArgs);
  const needShell = /(\$\(|`|&&|\|\||;|>|<|\|)/.test(shellCommand);

  // Per-task telemetry override: skip telemetry for this command entirely
  const taskTelemetryDisabled = telemetryCtx?.telemetryConfig?.enabled === false;

  // Telemetry: create command span and prepare child env
  const commandSpan = (telemetryCtx && !taskTelemetryDisabled)
    ? telemetryCtx.telemetry.startCommand(
      {
        command,
        argumentCount: commandArgs.length,
        cwd,
        runId: telemetryCtx.runId,
        loopId: telemetryCtx.loopId,
        taskId: telemetryCtx.taskId,
        taskName: telemetryCtx.taskName,
      },
      telemetryCtx.taskSpan ?? telemetryCtx.loopSpan,
    )
    : undefined;

  let telemetryEnv: Record<string, string> = {};
  let detectedIntegrationId: string | undefined;

  if (telemetryCtx && telemetryCtx.telemetry.getStatus().enabled && !taskTelemetryDisabled) {
    const traceCtx = (telemetryCtx.taskSpan ?? telemetryCtx.loopSpan)?.getTraceContext() ?? {};
    const integrationOverride = telemetryCtx.telemetryConfig?.integration;
    const prepared = telemetryCtx.telemetry.prepareChildProcess(
      { command, args: commandArgs, cwd },
      {
        runId: telemetryCtx.runId,
        loopId: telemetryCtx.loopId,
        loopName: telemetryCtx.loopName,
        taskId: telemetryCtx.taskId,
        taskName: telemetryCtx.taskName,
        projectId: telemetryCtx.projectId,
        projectName: telemetryCtx.projectName,
        traceParent: traceCtx.traceParent,
        traceState: traceCtx.traceState,
      },
      integrationOverride,
    );
    telemetryEnv = prepared.env;
    detectedIntegrationId = prepared.integrationId;
  }

  const baseEnv = childEnv();
  const mergedEnv: Record<string, string> = {
    ...(baseEnv as Record<string, string>),
    ...telemetryEnv,
  };

  const detachedOpt = process.platform !== "win32" ? { detached: true as const } : {};
  const child: ResultPromise = needShell
    ? execa(shellCommand, {
      stdout: "pipe",
      stderr: "pipe",
      stdin: "ignore",
      buffer: false,
      cwd: cwd || undefined,
      cancelSignal: signal,
      shell: true,
      env: mergedEnv,
      killSignal: "SIGTERM",
      ...detachedOpt,
    })
    : execa(command, commandArgs, {
      stdout: "pipe",
      stderr: "pipe",
      stdin: "ignore",
      buffer: false,
      cwd: cwd || undefined,
      cancelSignal: signal,
      env: mergedEnv,
      killSignal: "SIGTERM",
      ...detachedOpt,
    });

  if (child.pid) {
    activePids.add(child.pid);
  }

  const stdoutCapture = captureStdout
    ? new StdoutCaptureTransform(MAX_CONTEXT_STDOUT_BYTES)
    : null;

  if (stdoutCapture) {
    child.stdout!.pipe(stdoutCapture).pipe(logStream, { end: false });
  } else {
    child.stdout!.pipe(logStream, { end: false });
  }
  child.stderr!.pipe(logStream, { end: false });

  try {
    const result = await child;
    const endedAt = new Date();
    const duration = endedAt.getTime() - startedAt.getTime();
    if (child.pid) activePids.delete(child.pid);
    if (stdoutCapture?.isTruncated()) {
      logStream.write(t("context.truncationWarning"));
    }
    logStream.write(t("loop.exitMarker", { code: String(result.exitCode), duration: formatDuration(duration) }));

    if (commandSpan) {
      commandSpan.ok();
    }

    // Attempt to parse agent usage from output
    if (detectedIntegrationId && stdoutCapture) {
      tryParseAgentUsage(
        telemetryCtx!.telemetry,
        detectedIntegrationId,
        { exitCode: result.exitCode ?? 0, stdout: stdoutCapture.getCaptured(), duration },
      );
    }

    return {
      exitCode: result.exitCode ?? 0,
      duration,
      startedAt,
      endedAt,
      ...(captureStdout && stdoutCapture ? { stdout: stdoutCapture.getCaptured() } : {}),
    };
  } catch (error: unknown) {
    const endedAt = new Date();
    const duration = endedAt.getTime() - startedAt.getTime();
    const exitCode = extractExitCode(error);
    if (child.pid) {
      activePids.delete(child.pid);
      if (signal?.aborted) {
        await killProcessTree(child.pid);
      }
    }
    if (stdoutCapture?.isTruncated()) {
      logStream.write(t("context.truncationWarning"));
    }
    logStream.write(t("loop.exitMarker", { code: exitCode, duration: formatDuration(duration) }));

    if (commandSpan) {
      commandSpan.end(signal?.aborted ? "cancelled" : "error");
    }

    // Attempt to parse agent usage from output even on failure
    if (detectedIntegrationId && stdoutCapture) {
      tryParseAgentUsage(
        telemetryCtx!.telemetry,
        detectedIntegrationId,
        { exitCode, stdout: stdoutCapture.getCaptured(), duration },
      );
    }

    return {
      exitCode,
      duration,
      startedAt,
      endedAt,
      ...(captureStdout && stdoutCapture ? { stdout: stdoutCapture.getCaptured() } : {}),
    };
  }
}

export async function executeCommandForeground(
  command: string,
  commandArgs: string[],
  logger: Logger,
  cwd = ""
): Promise<ExecutionResult> {
  const startedAt = new Date();
  logger.debug(t("loop.executing", { command: `${command} ${commandArgs.join(" ")}` }));

  if (cwd && !fs.existsSync(cwd)) {
    logger.error(t("loop.cwdMissing", { cwd }));
    const endedAt = new Date();
    return { exitCode: 1, duration: 0, startedAt, endedAt };
  }

  try {
    const result = await execa(command, commandArgs, {
      stdout: "inherit",
      stderr: "inherit",
      stdin: "inherit",
      cwd: cwd || undefined,
      shell: true,
      env: childEnv(),
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
    return {
      exitCode: extractExitCode(error),
      duration: endedAt.getTime() - startedAt.getTime(),
      startedAt,
      endedAt,
    };
  }
}

function tryParseAgentUsage(
  telemetry: Telemetry,
  integrationId: string,
  result: CommandResult,
): void {
  try {
    const integrations = getAgentIntegrations();
    const match = integrations.find((i) => i.id === integrationId);
    if (!match?.parseUsage) return;
    const usage = match.parseUsage(result);
    if (usage) {
      usage.integration = integrationId;
      telemetry.recordAgentUsage(usage);
    }
  } catch {
    // Telemetry must never fail execution
  }
}
