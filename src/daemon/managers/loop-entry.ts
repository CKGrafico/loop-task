import { LoopController } from "../../core/loop/loop-controller.js";
import type { LoopControllerState } from "../../core/loop/types.js";
import type { LoopMeta, TaskDefinition } from "../../types.js";
import { getLogPath } from "../state/index.js";
import { buildLoopOptions, type StoredLoop } from "./loop-options.js";

export type TaskResolverFn = (taskId: string) => TaskDefinition | null;
export type ProjectDirFn = (projectId: string) => string | undefined;

export function createLoopEntry(
  meta: LoopMeta,
  taskResolver: TaskResolverFn,
  getProjectDirectory: ProjectDirFn,
  state?: LoopControllerState,
): StoredLoop {
  const options = buildLoopOptions(meta);
  const logPath = getLogPath(meta.id);
  const projectDir = getProjectDirectory(options.projectId ?? "default");
  const controller = new LoopController(
    meta.id,
    options,
    logPath,
    taskResolver,
    state,
    projectDir,
  );
  return { controller, options, intervalHuman: meta.intervalHuman };
}

export function metaToState(meta: LoopMeta): LoopControllerState {
  return {
    status: meta.status,
    createdAt: meta.createdAt,
    runCount: meta.runCount,
    sessionStartedAt: meta.sessionStartedAt,
    lastRunAt: meta.lastRunAt,
    lastExitCode: meta.lastExitCode,
    lastDuration: meta.lastDuration,
    nextRunAt: meta.nextRunAt,
    remainingDelayMs: meta.remainingDelayMs,
    runHistory: meta.runHistory,
  };
}
