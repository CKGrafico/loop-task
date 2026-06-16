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
            activeBg={choice === 1 ? "#4ade80" : undefined}
            activeFg={choice === 1 ? "#0b0b0b" : "#e5e7eb"}
            inactiveBg="#0b0b0b"
            marginRight={3}
          />
          <ConfirmButton
            label={t("board.no")}
            onMouseDown={onNo}
            activeBg={choice === 0 ? "#f87171" : undefined}
            activeFg={choice === 0 ? "#0b0b0b" : "#e5e7eb"}
            inactiveBg="#0b0b0b"
          />
        </box>
      </box>
    </box>
  );
}

function ConfirmButton(props: {
  label: string;
  onMouseDown: () => void;
  activeBg?: string;
  activeFg: string;
  inactiveBg: string;
  marginRight?: number;
}): React.ReactNode {
  const { isHovered, hoverProps } = useHoverState();
  const bg = props.activeBg ?? (isHovered ? HOVER_BG : props.inactiveBg);
  return (
    <box
      onMouseDown={props.onMouseDown}
      style={{
        backgroundColor: bg,
        paddingLeft: 3,
        paddingRight: 3,
        marginRight: props.marginRight,
      }}
      {...hoverProps}
    >
      <text fg={props.activeFg}>
        <strong>{props.label}</strong>
      </text>
    </box>
  );
}
