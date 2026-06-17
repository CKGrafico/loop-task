export type View = "board" | "create" | "task-create" | "task-edit" | "task-list";

export type DaemonStatus = "starting" | "connected" | "error";

export type Mode = "normal" | "search" | "create" | "help" | "confirm" | "task";

export type PanelFocus = "search" | "status" | "sort" | "tasks" | "new" | "loops" | "runs" | "actions";

export interface ConfirmState {
  message: string;
  action: () => Promise<void>;
}
