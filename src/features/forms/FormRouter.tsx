import React from "react";
import { CreateView } from "../../widgets/loop-form/CreateForm.js";
import { TaskForm } from "../../widgets/task-form/TaskForm.js";
import { ProjectFormView } from "../../widgets/project-form/ProjectForm.js";
import type { FormRouterProps, View } from "../../app/types.js";

const TASK_FORM_VIEWS = new Set<View>(["task-create", "task-edit"]);

function createInitialValues(editTarget: FormRouterProps["editTarget"], currentProjectId: string): Record<string, string> {
  if (!editTarget) {
    return {
      interval: "30m",
      taskMode: "inline",
      command: "",
      cwd: process.cwd(),
      taskId: "",
      description: "",
      runNow: "y",
      maxRuns: "",
      project: currentProjectId,
    };
  }
  return {
    interval: editTarget.intervalHuman ?? "30m",
    taskMode: editTarget.taskId ? "existing" : "inline",
    command: editTarget.commandRaw ?? [editTarget.command, ...editTarget.commandArgs].join(" "),
    cwd: editTarget.cwd ?? "",
    taskId: editTarget.taskId ?? "",
    description: editTarget.description,
    runNow: "y",
    maxRuns: editTarget.maxRuns?.toString() ?? "",
    project: editTarget.projectId ?? "default",
  };
}

export function FormRouter(props: FormRouterProps): React.ReactNode | null {
  const { view, editTarget, cloneMode, editTask, editProject,
    pendingTaskSelection, tasks, projects, currentProjectId,
    cancelCreate, onCreateDone, handleChooseTask,
    cancelTask, onTaskDone, cancelProject, onProjectDone } = props;

  if (view === "create") {
    return (
      <CreateView
        mode={editTarget && !cloneMode ? "edit" : "create"}
        editId={editTarget && !cloneMode ? editTarget.id : null}
        initial={createInitialValues(editTarget, currentProjectId)}
        selectedTaskId={pendingTaskSelection?.id ?? null}
        selectedTaskName={pendingTaskSelection?.name ?? null}
        tasks={tasks}
        projects={projects}
        currentProjectId={currentProjectId}
        onCancel={cancelCreate}
        onDone={onCreateDone}
        onChooseTask={handleChooseTask}
      />
    );
  }

  if (TASK_FORM_VIEWS.has(view)) {
    return (
      <TaskForm
        mode={view === "task-edit" ? "edit" : "create"}
        editTask={editTask}
        onCancel={cancelTask}
        onDone={onTaskDone}
      />
    );
  }

  if (view === "project-create" || view === "project-edit") {
    return (
      <ProjectFormView
        mode={view === "project-edit" ? "edit" : "create"}
        editProject={view === "project-edit" ? editProject : null}
        onCancel={cancelProject}
        onDone={onProjectDone}
      />
    );
  }

  return null;
}
