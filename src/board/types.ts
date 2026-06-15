export type View = "board" | "detail" | "create";

export type DaemonStatus = "starting" | "connected" | "error";

export type Mode = "normal" | "search" | "create" | "help" | "detail" | "confirm";

export interface ConfirmState {
  message: string;
  action: () => Promise<void>;
}
