import { useTerminalDimensions } from "@opentui/react";
import { BOARD_BREAKPOINT_WIDTH } from "../../config/constants.js";

export type Breakpoint = "wide" | "narrow";

export function useBreakpoint(): Breakpoint {
  const { width } = useTerminalDimensions();
  return width < BOARD_BREAKPOINT_WIDTH ? "narrow" : "wide";
}
