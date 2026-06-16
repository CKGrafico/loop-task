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
            selected={choice === 1}
            width={12}
            marginRight={1}
          />
          <ConfirmButton
            label={t("board.no")}
            onMouseDown={onNo}
            selected={choice === 0}
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
  selected: boolean;
  width: number;
  marginRight?: number;
}): React.ReactNode {
  const { isHovered, hoverProps } = useHoverState();
  const bg = props.selected ? "#1e3a8a" : isHovered ? HOVER_BG : undefined;
  const borderColor = props.selected ? "#38bdf8" : undefined;
  return (
    <box
      border
      onMouseDown={props.onMouseDown}
      borderColor={borderColor}
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
