import type { IpcRequest } from "../../../types.js";
import { send } from "../../ipc/send.js";
import { collectDiagnostics, isDiagnosticsEnabled } from "../../diagnostics.js";
import type { HandlerContext } from "./loop-handlers.js";

export function handleDiagnostics(
  _request: Extract<IpcRequest, { type: "diagnostics" }>,
  socket: import("node:net").Socket,
  ctx: HandlerContext,
): void {
  const extended = isDiagnosticsEnabled();
  const diag = collectDiagnostics(ctx.manager, extended);
  send(socket, { type: "ok", data: diag });
}
