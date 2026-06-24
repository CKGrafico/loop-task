import { useTerminalDimensions } from "@opentui/react";
import { t } from "../../i18n/index.js";
import type { View } from "../types.js";

export function HelpModal(props: { view: View }): React.ReactNode {
  const { view } = props;
  const { width } = useTerminalDimensions();

  const loopRows: [string, string][] = [
    ["e", "edit loop"],
    ["d/del", "delete loop"],
    ["c", "clone loop"],
    ["f", "force run"],
    ["p", "pause/play (contextual)"],
    ["s", "stop loop (resets schedule)"],
    [t("board.helpKeyEnter"), t("board.helpEdit")],
    ["n", t("board.helpCreate")],
    ["t", t("board.helpCreateTask")],
    ["o", t("board.helpCycleSort")],
    ["x", "cycle status filter"],
    ["r", "project filter"],
    ["←/→", t("board.helpSwitchPanel")],
    ["/", t("board.helpSearch")],
    ["h", t("board.helpToggleHelp")],
    ["esc", t("board.helpQuit")],
  ];

  const taskRows: [string, string][] = [
    ["e", "edit task"],
    ["d/del", "delete task"],
    ["s", "select task (when creating/editing a loop)"],
    ["enter", "focus actions panel"],
    ["n", t("board.helpCreateTask")],
    ["←/→", t("board.helpSwitchPanel")],
    ["/", t("board.helpSearch")],
    ["h", t("board.helpToggleHelp")],
    ["esc", t("board.helpQuit")],
  ];

  const projectRows: [string, string][] = [
    ["enter", "focus actions"],
    ["n", "new project"],
    ["e", "edit project"],
    ["d", "delete project"],
    ["←/→", "switch panel (list/actions)"],
    ["h", t("board.helpToggleHelp")],
    ["esc", t("board.helpQuit")],
  ];

  const rows = view === "task-list" ? taskRows : view === "projects" ? projectRows : loopRows;
  const title = view === "task-list" ? "Task List Shortcuts" : view === "projects" ? "Projects Shortcuts" : t("board.helpTitle");

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
        title={title}
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
