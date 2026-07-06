import fs from "node:fs";
import { execa, type ResultPromise } from "execa";
import type { ExecutionResult } from "../types.js";
import { Logger } from "../logger.js";
import { formatDuration } from "../duration.js";
import { t } from "../i18n/index.js";
import { MAX_CONTEXT_STDOUT_BYTES } from "../config/constants.js";

function quoteArg(arg: string): string {
  return /[\s"]/.test(arg) ? `"${arg.replace(/"/g, '\\"')}"` : arg;
}

function formatCommandLine(command: string, commandArgs: string[]): string {
  return [command, ...commandArgs.map((a) => quoteArg(a.replace(/[\n\r]/g, " ")))].join(" ").trim();
}

export function extractExitCode(error: unknown): number {
  return error && typeof error === "object" && "exitCode" in error
    ? (error as { exitCode: number }).exitCode
    : 1;
}

export async function executeCommand(
  command: string,
  commandArgs: string[],
  cwd: string,
  logStream: fs.WriteStream,
  signal?: AbortSignal,
  runNumber?: number,
  captureStdout: boolean = false,
  isChain: boolean = false
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

  const child: ResultPromise = execa(command, commandArgs, {
    stdout: "pipe",
    stderr: "pipe",
    stdin: "ignore",
    cwd: cwd || undefined,
    cancelSignal: signal,
    env: process.env,
  });

  const stdoutChunks: string[] = [];
  let stdoutTruncated = false;
  let stdoutBytes = 0;

  child.stdout!.on("data", (chunk: Buffer) => {
    logStream.write(chunk);

    if (captureStdout && !stdoutTruncated) {
      const chunkStr = chunk.toString();
      const chunkLen = Buffer.byteLength(chunkStr, "utf-8");

      if (stdoutBytes + chunkLen > MAX_CONTEXT_STDOUT_BYTES) {
        const remaining = MAX_CONTEXT_STDOUT_BYTES - stdoutBytes;
        stdoutChunks.push(chunkStr.slice(0, remaining));
        stdoutTruncated = true;
        logStream.write(t("context.truncationWarning"));
      } else {
        stdoutChunks.push(chunkStr);
        stdoutBytes += chunkLen;
      }
    }
  });
  child.stderr!.on("data", (chunk: Buffer) => {
    logStream.write(chunk);
  });

  try {
    const result = await child;
    const endedAt = new Date();
    const duration = endedAt.getTime() - startedAt.getTime();
    logStream.write(t("loop.exitMarker", { code: String(result.exitCode), duration: formatDuration(duration) }));
    return {
      exitCode: result.exitCode ?? 0,
      duration,
      startedAt,
      endedAt,
      ...(captureStdout ? { stdout: stdoutChunks.join("") } : {}),
    };
  } catch (error: unknown) {
    const endedAt = new Date();
    const duration = endedAt.getTime() - startedAt.getTime();
    const exitCode = extractExitCode(error);
    logStream.write(t("loop.exitMarker", { code: exitCode, duration: formatDuration(duration) }));
    return {
      exitCode,
      duration,
      startedAt,
      endedAt,
      ...(captureStdout ? { stdout: stdoutChunks.join("") } : {}),
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
