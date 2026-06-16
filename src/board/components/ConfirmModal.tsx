import { useTerminalDimensions } from "@opentui/react";
import { t } from "../../i18n/index.js";
import { useHoverState } from "../hooks/useHoverState.js";
import { HOVER_BG } from "../../config/constants.js";

export function ConfirmModal(props: { message: string; choice: number; onYes: () => void; onNo: () => void }): React.ReactNode {
  const { message, choice, onYes, onNo } = props;
  const { width } = useTerminalDimensions();

  return (
    <box
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 100,
      }}
    >
      <box
        title={t("board.confirmTitle")}
        border
        style={{
          flexDirection: "column",
          padding: 1,
          minWidth: Math.min(44, width - 4),
          backgroundColor: "#111827",
        }}
      >
        <text>{message}</text>
        <text> </text>
        <box style={{ flexDirection: "row", justifyContent: "center" }}>
          <ConfirmButton
            label={t("board.yes")}
            onMouseDown={onYes}
            borderColor={choice === 1 ? "#38bdf8" : undefined}
            bgColor={choice === 1 ? "#1e3a8a" : undefined}
            restBg="#1e3a5f"
            width={12}
            marginRight={1}
          />
          <ConfirmButton
            label={t("board.no")}
            onMouseDown={onNo}
            borderColor={choice === 0 ? "#38bdf8" : undefined}
            bgColor={choice === 0 ? "#374151" : undefined}
            width={12}
          />
        </box>
      </box>
    </box>
  );
}

function ConfirmButton(props: {
  label: string;
  onMouseDown: () => void;
  borderColor?: string;
  bgColor?: string;
  restBg?: string;
  width: number;
  marginRight?: number;
}): React.ReactNode {
  const { isHovered, hoverProps } = useHoverState();
  const bg = props.bgColor ?? (isHovered ? HOVER_BG : props.restBg ?? "#0b0b0b");
  return (
    <box
      border
      onMouseDown={props.onMouseDown}
      borderColor={props.borderColor}
      style={{
        width: props.width,
        backgroundColor: bg,
        justifyContent: "center",
        alignItems: "center",
        marginRight: props.marginRight,
      }}
      {...hoverProps}
    >
      <text fg="#e5e7eb">
        <strong>{props.label}</strong>
      </text>
    </box>
  );
}
