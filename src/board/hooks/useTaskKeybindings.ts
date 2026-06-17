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
    selectable = true,
  } = params;

  const taskActions: string[] = selectable
    ? ["select", "edit", "delete"]
    : ["edit", "delete"];
  const taskActionCount = taskActions.length;

  useKeyboard((key) => {
    if (view !== "task-list") return;
    const name = key.name;

    if (confirm) return;

    if (taskSearchActive) {
      if (name === "escape") {
        setTaskSearchActive(false);
        setTaskFocusedPanel("tasks");
        return;
      }
      if (name === "return" || name === "enter") {
        setTaskSearchActive(false);
        setTaskFocusedPanel("tasks");
        return;
      }
      if (name === "left") {
        setTaskSearchActive(false);
        setTaskFocusedPanel("actions");
        setTaskSelectedAction(taskActionCount - 1);
        return;
      }
      if (name === "backspace") {
        setTaskQuery((q) => q.slice(0, -1));
        return;
      }
      if (key.sequence && key.sequence.length === 1 && key.sequence >= " " && key.sequence <= "~") {
        setTaskQuery((q) => q + key.sequence);
        return;
      }
      return;
    }

    if (name === "escape") {
      onCancel();
      return;
    }

    if (name === "n") {
      onCreateTask();
      return;
    }

    if (name === "/" && taskFocusedPanel === "tasks") {
      setTaskSearchActive(true);
      return;
    }

    if (name === "tab") {
      setTaskFocusedPanel((p) => nextTaskPanel(p, "right"));
      return;
    }

    if (name === "left" || name === "right") {
      if (taskFocusedPanel === "actions") {
        if (name === "left" && taskSelectedAction === 0) {
          setTaskFocusedPanel((p) => nextTaskPanel(p, "left"));
        } else if (name === "right" && taskSelectedAction === taskActionCount - 1) {
          setTaskFocusedPanel((p) => nextTaskPanel(p, "right"));
        } else {
          setTaskSelectedAction((i) =>
            name === "right"
              ? Math.min(taskActionCount - 1, i + 1)
              : Math.max(0, i - 1)
          );
        }
      } else {
        setTaskFocusedPanel((p) => nextTaskPanel(p, name === "right" ? "right" : "left"));
      }
      return;
    }

    if (taskFocusedPanel === "tasks") {
      if (name === "up" || name === "k") {
        setTaskSelectedIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (name === "down" || name === "j") {
        setTaskSelectedIndex((i) => Math.min(tasks.length - 1, i + 1));
        return;
      }
      if (name === "return" || name === "enter") {
        setTaskFocusedPanel("actions");
        return;
      }
      if (name === "e" && tasks[taskSelectedIndex]) {
        onTaskAction("edit");
        return;
      }
      if (name === "delete" && tasks[taskSelectedIndex]) {
        onTaskAction("delete");
        return;
      }
    }

    if (taskFocusedPanel === "actions") {
      if (name === "up" || name === "k") {
        setTaskSelectedAction((i) => Math.max(0, i - 1));
        return;
      }
      if (name === "down" || name === "j") {
        setTaskSelectedAction((i) => Math.min(taskActionCount - 1, i + 1));
        return;
      }
      if (name === "return" || name === "enter") {
        onTaskAction(taskActions[taskSelectedAction] ?? "select");
        return;
      }
    }
  });
}
