import { LoopController } from "../../core/loop/loop-controller.js";
import type { LoopOptions, LoopMeta } from "../../types.js";

export interface StoredLoop {
  controller: LoopController;
  options: LoopOptions;
  intervalHuman: string;
}

export function buildLoopOptions(meta: LoopMeta): LoopOptions {
  return {
    interval: meta.interval,
    taskId: meta.taskId ?? null,
    command: meta.command,
    commandArgs: meta.commandArgs,
    commandRaw: meta.commandRaw,
    cwd: meta.cwd ?? "",
    immediate: false,
    maxRuns: meta.maxRuns,
    verbose: meta.verbose,
    description: meta.description ?? "",
    projectId: meta.projectId ?? "default",
    offset: meta.offset ?? null,
  };
}
