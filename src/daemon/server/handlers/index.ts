import type net from "node:net";
import type { IpcRequest } from "../../../types.js";
import type { TaskManager } from "../../managers/task-manager.js";
import type { SettingsManager } from "../../settings-manager.js";
import type { HandlerContext } from "./loop-handlers.js";

export type { HandlerContext } from "./loop-handlers.js";
export type { TaskHandlerContext } from "./task-handlers.js";

import {
  handleStart,
  handleUpdate,
  handleList,
  handleStatus,
  handlePause,
  handleResume,
  handleStopLoop,
  handleStopAll,
  handlePlayLoop,
  handleTrigger,
  handleDelete,
} from "./loop-handlers.js";

import {
  handleRunLog,
  handleRunLogStream,
  handleLogs,
} from "./log-handlers.js";

import {
  handleTaskCreate,
  handleTaskUpdate,
  handleTaskList,
  handleTaskGet,
  handleTaskDelete,
} from "./task-handlers.js";

import {
  handleProjectList,
  handleProjectCreate,
  handleProjectUpdate,
  handleProjectDelete,
} from "./project-handlers.js";

import {
  handleSettingsGet,
  handleSettingsSet,
} from "./settings-handlers.js";

import { handleDiagnostics } from "./diagnostics-handlers.js";
import { handleTelemetryTest } from "./telemetry-handlers.js";

export {
  handleStart,
  handleUpdate,
  handleList,
  handleStatus,
  handlePause,
  handleResume,
  handleStopLoop,
  handleStopAll,
  handlePlayLoop,
  handleTrigger,
  handleDelete,
  handleRunLog,
  handleRunLogStream,
  handleLogs,
  handleTaskCreate,
  handleTaskUpdate,
  handleTaskList,
  handleTaskGet,
  handleTaskDelete,
  handleProjectList,
  handleProjectCreate,
  handleProjectUpdate,
  handleProjectDelete,
  handleSettingsGet,
  handleSettingsSet,
  handleDiagnostics,
  handleTelemetryTest,
};

/**
 * Dispatch an incoming IPC request to the appropriate handler.
 * Returns true if the request was handled, false otherwise.
 */
export async function dispatch(
  request: IpcRequest,
  socket: net.Socket,
  ctx: HandlerContext & { taskManager: TaskManager; settingsManager: SettingsManager }
): Promise<boolean> {
  switch (request.type) {
    case "start":
      handleStart(request, socket, ctx);
      break;

    case "update":
      await handleUpdate(request, socket, ctx);
      break;

    case "list":
      handleList(request, socket, ctx);
      break;

    case "status":
      handleStatus(request, socket, ctx);
      break;

    case "pause":
      handlePause(request, socket, ctx);
      break;

    case "resume":
      handleResume(request, socket, ctx);
      break;

    case "stop-loop":
      await handleStopLoop(request, socket, ctx);
      break;

    case "stop-all":
      await handleStopAll(request, socket, ctx);
      break;

    case "play-loop":
      handlePlayLoop(request, socket, ctx);
      break;

    case "trigger":
      handleTrigger(request, socket, ctx);
      break;

    case "delete":
      await handleDelete(request, socket, ctx);
      break;

    case "run-log":
      handleRunLog(request, socket, ctx);
      break;

    case "run-log-stream":
      handleRunLogStream(request, socket, ctx);
      break;

    case "attach":
    case "logs":
      handleLogs(request, socket, ctx);
      break;

    case "task-create":
      handleTaskCreate(request, socket, ctx);
      break;

    case "task-update":
      handleTaskUpdate(request, socket, ctx);
      break;

    case "task-list":
      handleTaskList(request, socket, ctx);
      break;

    case "task-get":
      handleTaskGet(request, socket, ctx);
      break;

    case "task-delete":
      handleTaskDelete(request, socket, ctx);
      break;

    case "project-list":
      handleProjectList(request, socket, ctx);
      break;

    case "project-create":
      handleProjectCreate(request, socket, ctx);
      break;

    case "project-update":
      handleProjectUpdate(request, socket, ctx);
      break;

    case "project-delete":
      handleProjectDelete(request, socket, ctx);
      break;

    case "settings-get":
      await handleSettingsGet(request, socket, ctx.settingsManager);
      break;

    case "settings-set":
      await handleSettingsSet(request, socket, ctx.settingsManager);
      break;

    case "diagnostics":
      handleDiagnostics(request, socket, ctx);
      break;

    case "telemetry-test":
      handleTelemetryTest(request, socket, ctx.telemetryManager);
      break;

    default:
      return false;
  }
  return true;
}
