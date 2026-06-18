import { useTerminalDimensions } from "@opentui/react";
import { t } from "../../i18n/index.js";

export function HelpModal(): React.ReactNode {
  const { width } = useTerminalDimensions();
  const rows: [string, string][] = [
    ["e", "edit loop"],
    ["d/del", "delete loop"],
    ["f", "force run"],
    ["p", "pause/play (contextual)"],
    ["s", "stop loop (resets schedule)"],
    [t("board.helpKeyEnter"), t("board.helpEdit")],
    ["n", t("board.helpCreate")],
    ["t", t("board.helpCreateTask")],
    ["o", t("board.helpCycleSort")],
    ["←/→", t("board.helpSwitchPanel")],
    ["/", t("board.helpSearch")],
    ["h", t("board.helpToggleHelp")],
    ["esc", t("board.helpQuit")],
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
