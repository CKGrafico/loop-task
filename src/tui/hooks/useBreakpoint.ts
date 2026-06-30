import { useStdout } from "ink";
import { BOARD_BREAKPOINT_WIDTH } from "../../config/constants.js";

export type Breakpoint = "wide" | "narrow";

export function useBreakpoint(): Breakpoint {
  const { stdout } = useStdout();
  const width = stdout?.columns ?? 80;
  return width < BOARD_BREAKPOINT_WIDTH ? "narrow" : "wide";
}
