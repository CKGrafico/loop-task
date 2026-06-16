import { useHoverState } from "../hooks/useHoverState.js";

const PRIMARY_REST = "#1e3a5f";
const PRIMARY_HOVER = "#2a4f7a";
const PRIMARY_FOCUSED = "#1e3a8a";
const DEFAULT_HOVER = "#334155";
const DEFAULT_FOCUSED = "#374151";

export function BoardButton(props: {
  label: string;
  onMouseDown: () => void;
  focused?: boolean;
  variant?: "primary" | "danger" | "default";
  marginRight?: number;
}): React.ReactNode {
  const { label, onMouseDown, focused, variant = "default", marginRight } = props;
  const { isHovered, hoverProps } = useHoverState();

  let bg: string;
  const fg = "#e5e7eb";
  let border: string | undefined;

  if (variant === "primary") {
    if (focused) {
      bg = PRIMARY_FOCUSED;
      border = "#38bdf8";
    } else if (isHovered) {
      bg = PRIMARY_HOVER;
    } else {
      bg = PRIMARY_REST;
    }
  } else if (variant === "danger") {
    if (focused) {
      bg = "#7f1d1d";
      border = "#f87171";
    } else if (isHovered) {
      bg = "#7f1d1d";
    } else {
      bg = "#0b0b0b";
    }
  } else {
    if (focused) {
      bg = DEFAULT_FOCUSED;
      border = "#38bdf8";
    } else if (isHovered) {
      bg = DEFAULT_HOVER;
    } else {
      bg = "#0b0b0b";
    }
  }

  return (
    <box
      border
      onMouseDown={onMouseDown}
      borderColor={border}
      style={{
        paddingLeft: 2,
        paddingRight: 2,
        marginRight,
        backgroundColor: bg,
        justifyContent: "center",
        alignItems: "center",
      }}
      {...hoverProps}
    >
      <text fg={fg}><strong>{label}</strong></text>
    </box>
  );
}
