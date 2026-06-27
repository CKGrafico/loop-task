import { useKeyboard } from "@opentui/react";
import type { ConfirmState, View } from "../types.js";
import type { TaskDefinition } from "../../types.js";
import type { TaskPanelFocus } from "../components/TaskBrowser.js";
import { nextTaskPanel } from "../components/TaskBrowser.js";

export interface TaskKeybindingParams {
  confirm: ConfirmState | null;
  view: View;
  tasks: TaskDefinition[];
  taskSelectedIndex: number;
  setTaskSelectedIndex: React.Dispatch<React.SetStateAction<number>>;
  taskSelectedAction: number;
  setTaskSelectedAction: React.Dispatch<React.SetStateAction<number>>;
  taskFocusedPanel: TaskPanelFocus;
  setTaskFocusedPanel: React.Dispatch<React.SetStateAction<TaskPanelFocus>>;
  taskSearchActive: boolean;
  setTaskSearchActive: React.Dispatch<React.SetStateAction<boolean>>;
  taskQuery: string;
  setTaskQuery: React.Dispatch<React.SetStateAction<string>>;
  onTaskAction: (action: string) => void;
  onCancel: () => void;
  onCreateTask: () => void;
  onToggleContextHelp: () => void;
  headerFocused: boolean;
  selectable?: boolean;
}

export function useTaskKeybindings(params: TaskKeybindingParams): void {
  const {
    confirm,
    view,
    tasks,
    taskSelectedIndex,
    setTaskSelectedIndex,
    taskSelectedAction,
    setTaskSelectedAction,
    taskFocusedPanel,
    setTaskFocusedPanel,
    taskSearchActive,
    setTaskSearchActive,
    taskQuery,
    setTaskQuery,
    onTaskAction,
    onCancel,
    onCreateTask,
    onToggleContextHelp,
    headerFocused = false,
    selectable = true,
  } = params;

  const taskActions: string[] = selectable
    ? ["select", "edit", "delete"]
    : ["edit", "delete"];
  const taskActionCount = taskActions.length;

  useKeyboard((key) => {
    if (view !== "task-list") return;
    if (headerFocused) return;
    const name = key.name;

    if (confirm) return;

    if (taskSearchActive) {
      if (name === "escape") {
        setTaskSearchActive(false);
        setTaskFocusedPanel("tasks");
        key.preventDefault();
        return;
      }
      if (name === "up" || name === "k") {
        setTaskSelectedIndex((i) => Math.max(0, i - 1));
        key.preventDefault();
        return;
      }
      if (name === "down" || name === "j") {
        setTaskSelectedIndex((i) => Math.min(tasks.length - 1, i + 1));
        key.preventDefault();
        return;
      }
      return;
    }

    if (name === "escape") {
      onCancel();
      key.preventDefault();
      return;
    }

    if (name === "?") {
      onToggleContextHelp();
      key.preventDefault();
      return;
    }

    if (name === "n") {
      onCreateTask();
      key.preventDefault();
      return;
    }

    if (name === "/" && taskFocusedPanel === "tasks") {
      setTaskSearchActive(true);
      key.preventDefault();
      return;
    }

    if (taskFocusedPanel === "tasks") {
      if (name === "up" || name === "k") {
        setTaskSelectedIndex((i) => Math.max(0, i - 1));
        key.preventDefault();
        return;
      }
      if (name === "down" || name === "j") {
        setTaskSelectedIndex((i) => Math.min(tasks.length - 1, i + 1));
        key.preventDefault();
        return;
      }
      if (name === "return" || name === "enter") {
        setTaskFocusedPanel("actions");
        key.preventDefault();
        return;
      }
      if (name === "e" && tasks[taskSelectedIndex]) {
        onTaskAction("edit");
        key.preventDefault();
        return;
      }
      if (name === "d" && tasks[taskSelectedIndex]) {
        onTaskAction("delete");
        key.preventDefault();
        return;
      }
      if (name === "delete" && tasks[taskSelectedIndex]) {
        onTaskAction("delete");
        key.preventDefault();
        return;
      }
      if (selectable && name === "s" && tasks[taskSelectedIndex]) {
        onTaskAction("select");
        key.preventDefault();
        return;
      }
    }

    if (taskFocusedPanel === "actions") {
      if (name === "up" || name === "k") {
        setTaskSelectedAction((i) => Math.max(0, i - 1));
        key.preventDefault();
        return;
      }
      if (name === "down" || name === "j") {
        setTaskSelectedAction((i) => Math.min(taskActionCount - 1, i + 1));
        key.preventDefault();
        return;
      }
      if (name === "return" || name === "enter") {
        onTaskAction(taskActions[taskSelectedAction] ?? "select");
        key.preventDefault();
        return;
      }
      if (name === "d") {
        onTaskAction("delete");
        key.preventDefault();
        return;
      }
      if (selectable && name === "s") {
        onTaskAction("select");
        key.preventDefault();
        return;
      }
    }
  });
}
