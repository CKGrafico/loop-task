import { useTerminalDimensions } from "@opentui/react";
import { t } from "../../i18n/index.js";

export function HelpModal(): React.ReactNode {
  const { width } = useTerminalDimensions();
  const rows: [string, string][] = [
    [t("board.helpKeyMove"), t("board.helpMoveSelection")],
    [t("board.helpKeyEnter"), t("board.helpEdit")],
    [t("board.helpKeyN"), t("board.helpCreate")],
    ["p", t("board.helpPauseResume")],
    ["r", t("board.helpForceRun")],
    ["del", t("board.helpDelete")],
    ["←/→", t("board.helpSwitchPanel")],
    [t("board.helpKeySlash"), t("board.helpSearch")],
    [t("board.helpKeyF"), t("board.helpCycleFilter")],
    [t("board.helpKeyS"), t("board.helpCycleSort")],
    [t("board.helpKeyH"), t("board.helpToggleHelp")],
    [t("board.helpKeyEsc"), t("board.helpQuit")],
  ];

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
        zIndex: 90,
      }}
    >
      <box
        title={t("board.helpTitle")}
        border
        style={{
          flexDirection: "column",
          padding: 1,
          minWidth: Math.min(52, width - 4),
          backgroundColor: "#111827",
        }}
      >
        {rows.map(([keys, desc]) => (
          <text key={keys}>
            <span fg="#38bdf8">{keys.padEnd(16)}</span>
            {desc}
          </text>
        ))}
      </box>
    </box>
  );
}
