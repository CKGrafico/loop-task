export type View = "board" | "create";

export type DaemonStatus = "starting" | "connected" | "error";

export type Mode = "normal" | "search" | "create" | "help" | "confirm";

export type PanelFocus = "search" | "status" | "sort" | "new" | "loops" | "runs" | "actions";

export interface ConfirmState {
  message: string;
  action: () => Promise<void>;
}
