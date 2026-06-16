import { useTerminalDimensions } from "@opentui/react";
import { t } from "../../i18n/index.js";

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
          <box
            onMouseDown={onYes}
            style={{
              backgroundColor: choice === 1 ? "#4ade80" : "#374151",
              paddingLeft: 3,
              paddingRight: 3,
              marginRight: 3,
            }}
          >
            <text fg={choice === 1 ? "#0b0b0b" : "#e5e7eb"}>
              <strong>{t("board.yes")}</strong>
            </text>
          </box>
          <box
            onMouseDown={onNo}
            style={{
              backgroundColor: choice === 0 ? "#f87171" : "#374151",
              paddingLeft: 3,
              paddingRight: 3,
            }}
          >
            <text fg={choice === 0 ? "#0b0b0b" : "#e5e7eb"}>
              <strong>{t("board.no")}</strong>
            </text>
          </box>
        </box>
      </box>
    </box>
  );
}
