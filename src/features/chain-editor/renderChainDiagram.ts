import type { TaskDefinition } from "../../types.js";
import { commandLine } from "../../shared/ui/format.js";

/**
 * Render a task chain as ASCII art, starting from a root task.
 * Handles cycles (shows "(cycle to TaskName)"), missing tasks
 * (shows "(missing task)"), and silent chain markers ("[s]").
 */
export function renderChainDiagram(rootTaskId: string, tasks: TaskDefinition[]): string {
  const taskMap = new Map<string, TaskDefinition>();
  for (const task of tasks) {
    taskMap.set(task.id, task);
  }

  const rootTask = taskMap.get(rootTaskId);
  if (!rootTask) {
    return renderMissingTaskBox(rootTaskId);
  }

  const visited = new Set<string>();

  function renderTask(task: TaskDefinition, _branch: "success" | "failure" | null): string {
    if (visited.has(task.id)) {
      const name = task.name || task.id;
      return `(cycle to ${name})`;
    }
    visited.add(task.id);

    const lines: string[] = [];
    const silent = task.silentChain ? " [s]" : "";

    // Name line
    lines.push(`${task.name}${silent}`);

    // Steps or command
    if (task.steps && task.steps.length > 0) {
      for (let i = 0; i < task.steps.length; i++) {
        const step = task.steps[i]!;
        for (const cmd of step.commands) {
          lines.push(`  Step ${i + 1}: ${commandLine(cmd.command, cmd.commandArgs)}`);
        }
      }
    } else {
      lines.push(`  ${commandLine(task.command, task.commandArgs)}`);
    }

    // Branch annotations
    const successTarget = task.onSuccessTaskId
      ? resolveBranchLabel(task.onSuccessTaskId, taskMap, visited)
      : "(none)";
    const failureTarget = task.onFailureTaskId
      ? resolveBranchLabel(task.onFailureTaskId, taskMap, visited)
      : "(none)";

    lines.push(`  onSuccess -> ${successTarget}`);
    lines.push(`  onFailure -> ${failureTarget}`);

    // Build box
    const box = renderBox(lines);

    // Recurse into children that haven't been visited yet
    const children: string[] = [];
    if (task.onSuccessTaskId) {
      const child = taskMap.get(task.onSuccessTaskId);
      if (child && !visited.has(child.id)) {
        children.push(renderTask(child, "success"));
      }
    }
    if (task.onFailureTaskId) {
      const child = taskMap.get(task.onFailureTaskId);
      if (child && !visited.has(child.id)) {
        children.push(renderTask(child, "failure"));
      }
    }

    if (children.length > 0) {
      return box + "\n" + children.map((c) => connector() + "\n" + c).join("\n");
    }
    return box;
  }

  const result = renderTask(rootTask, null);
  return result;
}

function resolveBranchLabel(
  targetId: string,
  taskMap: Map<string, TaskDefinition>,
  visited: Set<string>,
): string {
  const target = taskMap.get(targetId);
  if (!target) return `${targetId} (missing task)`;
  if (visited.has(targetId)) return `${target.name || targetId} (cycle)`;
  const silent = target.silentChain ? " (silent)" : "";
  return `${target.name || targetId}${silent}`;
}

function renderBox(lines: string[]): string {
  const maxWidth = Math.max(3, ...lines.map((l) => stripAnsi(l).length)) + 4;
  const border = "+" + "-".repeat(maxWidth) + "+";
  const boxed = [border];
  for (const line of lines) {
    const displayLen = stripAnsi(line).length;
    const padding = maxWidth - displayLen - 2;
    boxed.push(`|  ${line}${" ".repeat(Math.max(0, padding))}  |`);
  }
  boxed.push(border);
  return boxed.join("\n");
}

function renderMissingTaskBox(taskId: string): string {
  const lines = [taskId, "  (missing task)"];
  return renderBox(lines);
}

function connector(): string {
  return "               |               \n               v";
}

/**
 * Strip ANSI escape codes for length calculation.
 * Safe no-op for plain strings.
 */
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}
