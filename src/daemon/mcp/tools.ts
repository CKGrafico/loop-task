import { z } from "zod";
import type { LoopManager } from "../managers/loop-manager.js";
import type { TaskManager } from "../managers/task-manager.js";
import type { ProjectManager } from "../managers/project-manager.js";
import type { TaskDefinition } from "../../types.js";
import { buildLoopOptions } from "../../loop-config.js";
import { validateContext } from "../../core/context/validate-context.js";
import { LOG_TAIL_DEFAULT } from "../../shared/config/constants.js";
import { tail } from "../../shared/tail.js";
import fs from "node:fs";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export interface McpToolDeps {
  manager: LoopManager;
  taskManager: TaskManager;
  projectManager: ProjectManager;
}

function ok(data?: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify({ ok: true, data }) }] };
}

function err(message: string) {
  return { content: [{ type: "text" as const, text: JSON.stringify({ ok: false, error: { message } }) }], isError: true as const };
}

export function registerMcpTools(server: McpServer, deps: McpToolDeps): void {
  const { manager, taskManager, projectManager } = deps;

  server.registerTool("list_loops", { description: "List all loops" }, async () => {
    return ok(manager.list());
  });

  server.registerTool("get_loop", { description: "Get loop status by ID", inputSchema: { id: z.string().describe("Loop ID") } }, async (args) => {
    const meta = manager.status(args.id as string);
    if (!meta) return err(`Loop not found: ${args.id}`);
    return ok(meta);
  });

  server.registerTool(
    "create_loop",
    {
      description: "Create a new loop",
      inputSchema: {
        command: z.string().optional().describe("Command to run"),
        commandArgs: z.array(z.string()).optional().describe("Command arguments"),
        intervalHuman: z.string().default("5m").describe("Interval like 30s, 5m, 1h, or 'manual' for trigger-only loops"),
        cwd: z.string().optional().describe("Working directory"),
        description: z.string().optional().describe("Loop description"),
        taskId: z.string().nullable().optional().describe("Task ID to use instead of command"),
        now: z.boolean().optional().describe("Run immediately on start"),
        maxRuns: z.number().nullable().optional().describe("Maximum number of runs"),
        verbose: z.boolean().optional().describe("Verbose output"),
        projectId: z.string().optional().describe("Project ID"),
        offset: z.number().nullable().optional().describe("Offset in ms from interval boundary"),
        context: z.record(z.string(), z.unknown()).optional().describe("Initial context for chain interpolation"),
      },
    },
    async (args) => {
      try {
        let context: Record<string, unknown> | undefined;
        if (args.context !== undefined) {
          const result = validateContext(args.context);
          if (!result.valid) return err(result.error);
          context = result.context;
        }
        const intervalHuman = (args.intervalHuman as string) ?? "5m";
        const { options } = buildLoopOptions(intervalHuman, {
          command: args.command as string | undefined,
          commandArgs: args.commandArgs as string[] | undefined,
          taskId: args.taskId as string | null | undefined,
          cwd: args.cwd as string | undefined,
          now: args.now as boolean | undefined,
          maxRuns: args.maxRuns as number | string | null | undefined,
          verbose: args.verbose as boolean | undefined,
          description: args.description as string | undefined,
          projectId: args.projectId as string | undefined,
          offset: args.offset as number | null | undefined,
          context,
        });
        const id = manager.start(options, intervalHuman);
        return ok({ id });
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.registerTool(
    "update_loop",
    {
      description: "Update an existing loop",
      inputSchema: {
        id: z.string().describe("Loop ID"),
        command: z.string().optional().describe("Command to run"),
        commandArgs: z.array(z.string()).optional().describe("Command arguments"),
        intervalHuman: z.string().default("5m").describe("Interval like 30s, 5m, 1h, or 'manual'"),
        cwd: z.string().optional().describe("Working directory"),
        description: z.string().optional().describe("Loop description"),
        taskId: z.string().nullable().optional().describe("Task ID"),
        now: z.boolean().optional().describe("Run immediately"),
        maxRuns: z.number().nullable().optional().describe("Maximum runs"),
        verbose: z.boolean().optional().describe("Verbose output"),
        projectId: z.string().optional().describe("Project ID"),
        offset: z.number().nullable().optional().describe("Offset in ms"),
        context: z.record(z.string(), z.unknown()).optional().describe("Context for chain interpolation"),
      },
    },
    async (args) => {
      try {
        const id = args.id as string;
        let context: Record<string, unknown> | undefined;
        if (args.context !== undefined) {
          const result = validateContext(args.context);
          if (!result.valid) return err(result.error);
          context = result.context;
        }
        const intervalHuman = (args.intervalHuman as string) ?? "5m";
        const { options } = buildLoopOptions(intervalHuman, {
          command: args.command as string | undefined,
          commandArgs: args.commandArgs as string[] | undefined,
          taskId: args.taskId as string | null | undefined,
          cwd: args.cwd as string | undefined,
          now: args.now as boolean | undefined,
          maxRuns: args.maxRuns as number | string | null | undefined,
          verbose: args.verbose as boolean | undefined,
          description: args.description as string | undefined,
          projectId: args.projectId as string | undefined,
          offset: args.offset as number | null | undefined,
          context,
        });
        const updated = await manager.update(id, options, intervalHuman);
        if (!updated) return err(`Loop not found: ${id}`);
        return ok({ id });
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.registerTool("delete_loop", { description: "Delete a loop by ID", inputSchema: { id: z.string().describe("Loop ID") } }, async (args) => {
    const deleted = await manager.delete(args.id as string);
    if (!deleted) return err(`Loop not found: ${args.id}`);
    return ok();
  });

  server.registerTool("pause_loop", { description: "Pause a loop", inputSchema: { id: z.string().describe("Loop ID") } }, async (args) => {
    if (!manager.pause(args.id as string)) return err(`Loop not found or cannot pause: ${args.id}`);
    return ok();
  });

  server.registerTool("resume_loop", { description: "Resume a paused loop", inputSchema: { id: z.string().describe("Loop ID") } }, async (args) => {
    if (!manager.resume(args.id as string)) return err(`Loop not found or cannot resume: ${args.id}`);
    return ok();
  });

  server.registerTool("trigger_loop", { description: "Trigger a loop to run immediately", inputSchema: { id: z.string().describe("Loop ID") } }, async (args) => {
    const id = args.id as string;
    if (manager.isMaxRunsBlocked(id)) return err("Max runs reached");
    if (manager.isRunning(id)) return err("Loop is already running");
    if (!manager.trigger(id)) return err(`Loop not found: ${id}`);
    return ok();
  });

  server.registerTool("stop_loop", { description: "Stop a running loop", inputSchema: { id: z.string().describe("Loop ID") } }, async (args) => {
    if (!manager.stopLoop(args.id as string)) return err(`Loop not found or cannot stop: ${args.id}`);
    return ok();
  });

  server.registerTool("stop_all_loops", { description: "Stop all running loops" }, async () => {
    const count = manager.stopAllLoops();
    return ok({ count });
  });

  server.registerTool("list_tasks", { description: "List all tasks" }, async () => {
    return ok(taskManager.list());
  });

  server.registerTool("get_task", { description: "Get a task by ID", inputSchema: { id: z.string().describe("Task ID") } }, async (args) => {
    const task = taskManager.get(args.id as string);
    if (!task) return err(`Task not found: ${args.id}`);
    return ok(task);
  });

  server.registerTool(
    "create_task",
    {
      description: "Create a new task",
      inputSchema: {
        id: z.string().optional().describe("Task ID (auto-generated if omitted)"),
        name: z.string().describe("Task name"),
        command: z.string().describe("Command to run"),
        commandArgs: z.array(z.string()).optional().describe("Command arguments"),
        commandRaw: z.string().optional().describe("Raw command string"),
        steps: z.array(z.object({ commands: z.array(z.object({ command: z.string(), commandArgs: z.array(z.string()) })) })).optional().describe("Task steps"),
        onSuccessTaskId: z.string().nullable().optional().describe("Task to run on success"),
        onFailureTaskId: z.string().nullable().optional().describe("Task to run on failure"),
        maxRuns: z.number().optional().describe("Maximum number of runs"),
        silentChain: z.boolean().optional().describe("Suppress chain output"),
        context: z.record(z.string(), z.unknown()).optional().describe("Context for chain interpolation"),
      },
    },
    async (args) => {
      try {
        const name = args.name as string;
        const command = args.command as string;
        if (!name?.trim()) return err("Task name is required");
        if (!command?.trim()) return err("Task command is required");
        const input = {
          id: (args.id as string) ?? "",
          name,
          command,
          commandArgs: (args.commandArgs as string[]) ?? [],
          commandRaw: args.commandRaw as string | undefined,
          steps: args.steps as TaskDefinition["steps"],
          onSuccessTaskId: (args.onSuccessTaskId as string | null) ?? null,
          onFailureTaskId: (args.onFailureTaskId as string | null) ?? null,
          maxRuns: args.maxRuns as number | undefined,
          silentChain: args.silentChain as boolean | undefined,
          context: args.context as Record<string, unknown> | undefined,
        };
        if (input.context !== undefined) {
          const result = validateContext(input.context);
          if (!result.valid) return err(result.error);
          input.context = result.context;
        }
        const task = taskManager.create(input as Omit<TaskDefinition, "createdAt">);
        return ok(task);
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.registerTool(
    "update_task",
    {
      description: "Update an existing task",
      inputSchema: {
        id: z.string().describe("Task ID"),
        name: z.string().describe("Task name"),
        command: z.string().describe("Command to run"),
        commandArgs: z.array(z.string()).optional().describe("Command arguments"),
        commandRaw: z.string().optional().describe("Raw command string"),
        steps: z.array(z.object({ commands: z.array(z.object({ command: z.string(), commandArgs: z.array(z.string()) })) })).optional().describe("Task steps"),
        onSuccessTaskId: z.string().nullable().optional().describe("Task to run on success"),
        onFailureTaskId: z.string().nullable().optional().describe("Task to run on failure"),
        maxRuns: z.number().optional().describe("Maximum number of runs"),
        silentChain: z.boolean().optional().describe("Suppress chain output"),
        context: z.record(z.string(), z.unknown()).optional().describe("Context for chain interpolation"),
      },
    },
    async (args) => {
      try {
        const id = args.id as string;
        const name = args.name as string;
        const command = args.command as string;
        if (!name?.trim()) return err("Task name is required");
        if (!command?.trim()) return err("Task command is required");
        const input = {
          name,
          command,
          commandArgs: (args.commandArgs as string[]) ?? [],
          commandRaw: args.commandRaw as string | undefined,
          steps: args.steps as TaskDefinition["steps"],
          onSuccessTaskId: (args.onSuccessTaskId as string | null) ?? null,
          onFailureTaskId: (args.onFailureTaskId as string | null) ?? null,
          maxRuns: args.maxRuns as number | undefined,
          silentChain: args.silentChain as boolean | undefined,
          context: args.context as Record<string, unknown> | undefined,
        };
        if (input.context !== undefined) {
          const result = validateContext(input.context);
          if (!result.valid) return err(result.error);
          input.context = result.context;
        }
        const updated = taskManager.update(id, input as Omit<TaskDefinition, "id" | "createdAt">);
        if (!updated) return err(`Task not found: ${id}`);
        return ok(updated);
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.registerTool("delete_task", { description: "Delete a task by ID", inputSchema: { id: z.string().describe("Task ID") } }, async (args) => {
    if (!taskManager.delete(args.id as string)) return err(`Task not found: ${args.id}`);
    return ok();
  });

  server.registerTool("list_projects", { description: "List all projects" }, async () => {
    return ok(projectManager.getAll());
  });

  server.registerTool("get_project", { description: "Get a project by ID", inputSchema: { id: z.string().describe("Project ID") } }, async (args) => {
    const project = projectManager.get(args.id as string);
    if (!project) return err(`Project not found: ${args.id}`);
    return ok(project);
  });

  server.registerTool(
    "create_project",
    {
      description: "Create a new project",
      inputSchema: {
        name: z.string().describe("Project name"),
        color: z.string().default("#ffffff").describe("Project color (hex)"),
        directory: z.string().optional().describe("Local working directory for loops"),
        githubSource: z.string().optional().describe("GitHub repository in owner/repo format"),
      },
    },
    async (args) => {
      try {
        const name = args.name as string;
        if (!name?.trim()) return err("Project name is required");
        const project = projectManager.create(name.trim(), (args.color as string) ?? "#ffffff", args.directory as string | undefined, args.githubSource as string | undefined);
        return ok(project);
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.registerTool(
    "update_project",
    {
      description: "Update an existing project",
      inputSchema: {
        id: z.string().describe("Project ID"),
        name: z.string().describe("Project name"),
        color: z.string().optional().describe("Project color (hex)"),
        directory: z.string().optional().describe("Local working directory"),
        githubSource: z.string().optional().describe("GitHub repository in owner/repo format"),
      },
    },
    async (args) => {
      try {
        const name = args.name as string;
        if (!name?.trim()) return err("Project name is required");
        projectManager.update(args.id as string, name.trim(), args.color as string | undefined, args.directory as string | undefined, args.githubSource as string | undefined);
        return ok();
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.registerTool("delete_project", { description: "Delete a project by ID", inputSchema: { id: z.string().describe("Project ID") } }, async (args) => {
    try {
      projectManager.delete(args.id as string);
      return ok();
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  });

  server.registerTool(
    "get_loop_logs",
    {
      description: "Fetch loop log snapshot (last N lines)",
      inputSchema: {
        id: z.string().describe("Loop ID"),
        tail: z.number().default(LOG_TAIL_DEFAULT).describe("Number of lines from the end"),
      },
    },
    async (args) => {
      const id = args.id as string;
      const logPath = manager.getLogPath(id);
      if (!logPath) return err(`Loop not found: ${id}`);
      if (!fs.existsSync(logPath)) return ok("");
      const content = fs.readFileSync(logPath, "utf-8");
      return ok(tail(content, (args.tail as number) ?? LOG_TAIL_DEFAULT).join("\n"));
    },
  );

  server.registerTool(
    "get_run_log",
    {
      description: "Get run-specific log for a loop",
      inputSchema: {
        id: z.string().describe("Loop ID"),
        runNumber: z.number().describe("Run number"),
      },
    },
    async (args) => {
      const id = args.id as string;
      const runNumber = args.runNumber as number;
      const logPath = manager.getLogPath(id);
      if (!logPath || !fs.existsSync(logPath)) return ok("");
      const meta = manager.status(id);
      if (!meta) return err(`Loop not found: ${id}`);
      const records = meta.runHistory.filter((r) => r.runNumber === runNumber).sort((a, b) => a.logOffset - b.logOffset);
      if (records.length === 0) return ok("");
      const buffer = fs.readFileSync(logPath);
      const allSorted = meta.runHistory.slice().sort((a, b) => a.logOffset - b.logOffset);
      const parts = records.map((record) => {
        const start = record.logOffset;
        const idx = allSorted.indexOf(record);
        const end = idx < allSorted.length - 1 ? allSorted[idx + 1]!.logOffset : buffer.length;
        return buffer.toString("utf-8", start, end);
      });
      return ok(parts.join(""));
    },
  );
}
