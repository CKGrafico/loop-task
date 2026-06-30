export type View = "board" | "create" | "task-create" | "task-edit" | "task-list" | "projects";

export type DaemonStatus = "starting" | "connected" | "error";

export type Mode = "normal" | "search" | "create" | "help" | "confirm" | "task" | "projects";

export interface ConfirmState {
  message: string;
  action: () => Promise<void>;
}
