import fs from "node:fs";
import { LoopManager } from "../managers/loop-manager.js";
import { LOG_TAIL_DEFAULT } from "../../shared/config/constants.js";
import { tailFileBounded, readByteRange } from "../../core/logging/bounded-log-reader.js";
import { followLogFile } from "../../core/logging/log-follower.js";
import { buildLoopOptions } from "../../loop-config.js";
import { validateContext } from "../../core/context/validate-context.js";
import { sendOk, sendError, sendNotFound, parseQuery, readBody } from "./helpers.js";
import type { RouteHandler, RouteEntry } from "./helpers.js";

export function registerLoopRoutes(manager: LoopManager, routes: RouteEntry[], r: (method: string, path: string, handler: RouteHandler) => void): void {
  r("GET", "/api/loops", (_req, res) => {
    sendOk(res, manager.list());
  });

  r("GET", "/api/loops/:id", (_req, res, params) => {
    const meta = manager.status(params.id);
    if (!meta) {
      sendNotFound(res, params.id);
      return;
    }
    sendOk(res, meta);
  });

  r("POST", "/api/loops", async (req, res) => {
    try {
      const body = await readBody(req) as Record<string, unknown>;
      let context: Record<string, unknown> | undefined;
      if (body.context !== undefined) {
        const result = validateContext(body.context);
        if (!result.valid) {
          sendError(res, 400, result.error);
          return;
        }
        context = result.context;
      }
      const intervalHuman = (body.intervalHuman as string) ?? "5m";
      const { options } = buildLoopOptions(intervalHuman, {
        command: body.command as string | undefined,
        commandArgs: body.commandArgs as string[] | undefined,
        taskId: body.taskId as string | null | undefined,
        cwd: body.cwd as string | undefined,
        now: body.now as boolean | undefined,
        maxRuns: body.maxRuns as number | string | null | undefined,
        verbose: body.verbose as boolean | undefined,
        description: body.description as string | undefined,
        projectId: body.projectId as string | undefined,
        offset: body.offset as number | null | undefined,
        context,
      });
      const id = manager.start(options, intervalHuman);
      sendOk(res, { id }, 201);
    } catch (err) {
      sendError(res, 400, err instanceof Error ? err.message : String(err));
    }
  });

  r("PATCH", "/api/loops/:id", async (req, res, params) => {
    try {
      const body = await readBody(req) as Record<string, unknown>;
      let context: Record<string, unknown> | undefined;
      if (body.context !== undefined) {
        const result = validateContext(body.context);
        if (!result.valid) {
          sendError(res, 400, result.error);
          return;
        }
        context = result.context;
      }
      const intervalHuman = (body.intervalHuman as string) ?? "5m";
      const { options } = buildLoopOptions(intervalHuman, {
        command: body.command as string | undefined,
        commandArgs: body.commandArgs as string[] | undefined,
        taskId: body.taskId as string | null | undefined,
        cwd: body.cwd as string | undefined,
        now: body.now as boolean | undefined,
        maxRuns: body.maxRuns as number | string | null | undefined,
        verbose: body.verbose as boolean | undefined,
        description: body.description as string | undefined,
        projectId: body.projectId as string | undefined,
        offset: body.offset as number | null | undefined,
        context,
      });
      const ok = await manager.update(params.id, options, intervalHuman);
      if (!ok) {
        sendNotFound(res, params.id);
        return;
      }
      sendOk(res, { id: params.id });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isRecipeRestriction = message.includes("Recipe loops");
      sendError(res, isRecipeRestriction ? 403 : 400, message);
    }
  });

  r("DELETE", "/api/loops/:id", async (_req, res, params) => {
    if (manager.isRecipeLoop(params.id)) {
      sendError(res, 403, "Recipe loops cannot be deleted; remove the recipe file instead");
      return;
    }
    const ok = await manager.delete(params.id);
    if (!ok) {
      sendNotFound(res, params.id);
      return;
    }
    sendOk(res);
  });

  r("POST", "/api/loops/:id/pause", (_req, res, params) => {
    if (!manager.pause(params.id)) {
      sendNotFound(res, params.id);
      return;
    }
    sendOk(res);
  });

  r("POST", "/api/loops/:id/resume", (_req, res, params) => {
    if (!manager.resume(params.id)) {
      sendNotFound(res, params.id);
      return;
    }
    sendOk(res);
  });

  r("POST", "/api/loops/:id/play", (_req, res, params) => {
    if (manager.isMaxRunsBlocked(params.id)) {
      sendError(res, 409, "Max runs reached");
      return;
    }
    if (manager.isRunning(params.id)) {
      sendError(res, 409, "Loop is already running");
      return;
    }
    if (!manager.playLoop(params.id)) {
      sendNotFound(res, params.id);
      return;
    }
    const meta = manager.status(params.id);
    sendOk(res, meta);
  });

  r("POST", "/api/loops/:id/trigger", (_req, res, params) => {
    if (manager.isMaxRunsBlocked(params.id)) {
      sendError(res, 400, "Max runs reached");
      return;
    }
    if (manager.isRunning(params.id)) {
      sendError(res, 409, "Loop is already running");
      return;
    }
    if (!manager.trigger(params.id)) {
      sendNotFound(res, params.id);
      return;
    }
    sendOk(res);
  });

  r("POST", "/api/loops/:id/stop", (_req, res, params) => {
    if (!manager.stopLoop(params.id)) {
      sendNotFound(res, params.id);
      return;
    }
    sendOk(res);
  });

  r("POST", "/api/loops/stop-all", (_req, res) => {
    const count = manager.stopAllLoops();
    sendOk(res, { count });
  });

  r("GET", "/api/loops/:id/runs", (_req, res, params) => {
    const meta = manager.status(params.id);
    if (!meta) {
      sendNotFound(res, params.id);
      return;
    }
    const query = parseQuery(_req.url);
    const fromStr = query.get("from");
    const toStr = query.get("to");
    let runs = meta.runHistory;
    if (fromStr) {
      const fromMs = new Date(fromStr).getTime();
      if (!Number.isNaN(fromMs)) {
        runs = runs.filter((r) => new Date(r.startedAt).getTime() >= fromMs);
      }
    }
    if (toStr) {
      const toMs = new Date(toStr).getTime();
      if (!Number.isNaN(toMs)) {
        runs = runs.filter((r) => new Date(r.startedAt).getTime() <= toMs);
      }
    }
    sendOk(res, runs);
  });

  r("GET", "/api/loops/:id/logs/date", (_req, res, params) => {
    const meta = manager.status(params.id);
    if (!meta) {
      sendNotFound(res, params.id);
      return;
    }
    const query = parseQuery(_req.url);
    const fromStr = query.get("from");
    const toStr = query.get("to");
    if (!fromStr || !toStr) {
      sendError(res, 400, "Both 'from' and 'to' query parameters are required (ISO 8601)");
      return;
    }
    const fromMs = new Date(fromStr).getTime();
    const toMs = new Date(toStr).getTime();
    if (Number.isNaN(fromMs) || Number.isNaN(toMs)) {
      sendError(res, 400, "Invalid date format for 'from' or 'to' (use ISO 8601)");
      return;
    }
    const logPath = manager.getLogPath(params.id);
    if (!logPath || !fs.existsSync(logPath)) {
      sendOk(res, "");
      return;
    }
    const matching = meta.runHistory.filter((r) => {
      const t = new Date(r.startedAt).getTime();
      return t >= fromMs && t <= toMs;
    });
    if (matching.length === 0) {
      sendOk(res, "");
      return;
    }
    matching.sort((a, b) => a.logOffset - b.logOffset);
    const allSorted = meta.runHistory.slice().sort((a, b) => a.logOffset - b.logOffset);
    const parts = matching.map((record) => {
      const start = record.logOffset;
      const idx = allSorted.indexOf(record);
      const end = idx < allSorted.length - 1 ? allSorted[idx + 1].logOffset : undefined;
      return readByteRange(logPath, start, end);
    });
    sendOk(res, parts.join(""));
  });

  r("GET", "/api/loops/:id/logs", (_req, res, params) => {
    const logPath = manager.getLogPath(params.id);
    if (!logPath) {
      sendNotFound(res, params.id);
      return;
    }
    const query = parseQuery(_req.url);
    const tailCount = parseInt(query.get("tail") ?? String(LOG_TAIL_DEFAULT), 10);

    if (!fs.existsSync(logPath)) {
      sendOk(res, "");
      return;
    }
    const lines = tailFileBounded(logPath, tailCount);
    sendOk(res, lines.join("\n"));
  });

  r("GET", "/api/loops/:id/logs/stream", (_req, res, params) => {
    const logPath = manager.getLogPath(params.id);
    if (!logPath) {
      sendNotFound(res, params.id);
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    });

    const query = parseQuery(_req.url);
    const tailCount = parseInt(query.get("tail") ?? "0", 10);

    let initialOffset = 0;

    if (fs.existsSync(logPath)) {
      const lines = tailFileBounded(logPath, tailCount);
      for (const line of lines) {
        if (line) {
          res.write(`data: ${line}\n\n`);
        }
      }
      initialOffset = fs.statSync(logPath).size;
    }

    const watcher = followLogFile({
      logPath,
      initialOffset,
      dest: res,
      formatLine: (line) => `data: ${line}\n\n`,
      onEnd: () => {
        res.write("event: end\ndata: {}\n\n");
        res.end();
      },
      onError: () => {
        res.end();
      },
    });

    _req.on("close", () => {
      watcher.close();
      res.end();
    });
  });

  r("GET", "/api/loops/:id/runs/:num", (_req, res, params) => {
    const { id, num } = params;
    const logPath = manager.getLogPath(id);
    if (!logPath || !fs.existsSync(logPath)) {
      sendOk(res, "");
      return;
    }

    const meta = manager.status(id);
    if (!meta) {
      sendNotFound(res, id);
      return;
    }

    const runNumber = parseInt(num, 10);
    const records = meta.runHistory
      .filter((r) => r.runNumber === runNumber)
      .sort((a, b) => a.logOffset - b.logOffset);

    if (records.length === 0) {
      sendOk(res, "");
      return;
    }

    const allSorted = meta.runHistory.slice().sort((a, b) => a.logOffset - b.logOffset);

    const parts = records.map((record) => {
      const start = record.logOffset;
      const idx = allSorted.indexOf(record);
      const end = idx < allSorted.length - 1 ? allSorted[idx + 1].logOffset : undefined;
      return readByteRange(logPath, start, end);
    });

    sendOk(res, parts.join(""));
  });
}
