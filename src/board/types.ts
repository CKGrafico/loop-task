export type View = "board" | "create" | "task-create" | "task-edit" | "task-list" | "projects" | "project-create" | "project-edit";

export type DaemonStatus = "starting" | "connected" | "error";

export type Mode = "normal" | "search" | "create" | "help" | "confirm" | "task" | "projects";

export type PanelFocus = "search" | "project-filter" | "status" | "sort" | "header-tasks" | "header-projects" | "header-new" | "loops" | "runs" | "actions" | "projects";

export interface ConfirmState {
  message: string;
  action: () => Promise<void>;
}
