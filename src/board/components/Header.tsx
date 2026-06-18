import { useTerminalDimensions } from "@opentui/react";
import { HEADER_COMPACT_WIDTH, ENTITY_COLORS } from "../../config/constants.js";
import { t } from "../../i18n/index.js";
import type { DaemonStatus, View } from "../types.js";
import { useHoverState } from "../hooks/useHoverState.js";
import { HOVER_BG } from "../../config/constants.js";

function ActionButton(props: {
  label: string;
  textColor: string;
  focused?: boolean;
  onMouseDown: () => void;
}): React.ReactNode {
  const { isHovered, hoverProps } = useHoverState();
  const bg = props.focused ? "#1e2a4a" : isHovered ? HOVER_BG : undefined;
  return (
    <box
      onMouseDown={props.onMouseDown}
      style={{ flexGrow: 0, paddingLeft: 1, paddingRight: 1, marginLeft: 1, backgroundColor: bg }}
      {...hoverProps}
    >
      <text fg={props.textColor}>{props.label}</text>
    </box>
  );
}

export function Header(props: {
  daemonStatus: DaemonStatus;
  counts: { total: number; running: number; waiting: number; paused: number; idle: number };
  view: View;
  focusedPanel?: string;
  onViewLoops?: () => void;
  onViewTasks?: () => void;
  onViewProjects?: () => void;
  onAddLoop?: () => void;
  onAddTask?: () => void;
  onAddProject?: () => void;
}): React.ReactNode {
  const { daemonStatus, counts, view, focusedPanel, onViewLoops, onViewTasks, onViewProjects, onAddLoop, onAddTask, onAddProject } = props;
  const { width } = useTerminalDimensions();
  const compact = width < HEADER_COMPACT_WIDTH;
  const color =
    daemonStatus === "connected"
      ? "#4ade80"
      : daemonStatus === "error"
        ? "#f87171"
        : "#facc15";
  const symbol = daemonStatus === "connected" ? "✓" : daemonStatus === "error" ? "✗" : "…";

  // Derive the 3 action buttons based on current view
  type Btn = { label: string; color: string; panel: string; action: (() => void) | undefined };
  let buttons: [Btn, Btn, Btn];

  if (view === "projects") {
    buttons = [
      { label: t("board.viewLoopsLabel"),    color: ENTITY_COLORS.loop,    panel: "header-tasks",    action: onViewLoops },
      { label: t("board.viewTasksLabel"),    color: ENTITY_COLORS.task,    panel: "header-projects", action: onViewTasks },
      { label: t("project.newProjectLabel"), color: ENTITY_COLORS.project, panel: "header-new",      action: onAddProject },
    ];
  } else if (view === "task-list") {
    buttons = [
      { label: t("project.manageLabel"),    color: ENTITY_COLORS.project, panel: "header-tasks",    action: onViewProjects },
      { label: t("board.viewLoopsLabel"),   color: ENTITY_COLORS.loop,    panel: "header-projects", action: onViewLoops },
      { label: t("board.taskActionNew"),    color: ENTITY_COLORS.task,    panel: "header-new",      action: onAddTask },
    ];
  } else {
    // board (default)
    buttons = [
      { label: t("project.manageLabel"),    color: ENTITY_COLORS.project, panel: "header-tasks",    action: onViewProjects },
      { label: t("board.viewTasksLabel"),   color: ENTITY_COLORS.task,    panel: "header-projects", action: onViewTasks },
      { label: t("board.newLoopLabel"),     color: ENTITY_COLORS.loop,    panel: "header-new",      action: onAddLoop },
    ];
  }

  return (
    <box style={{ flexDirection: "column" }}>
      <box style={{ flexDirection: "row", paddingLeft: 1, paddingRight: 1 }}>
        <text>
          <strong fg="#a3e635">{t("board.appName")}</strong>
          {compact ? null : <span fg="#6b7280">{t("board.appTagline")}</span>}
        </text>
      </box>
      <box style={{ flexDirection: "row", paddingLeft: 1, paddingRight: 1, alignItems: "center" }}>
        <box style={{ flexGrow: 1 }}>
          <text>
            <span fg="#6b7280">{t("board.daemonLabel")}</span>
            <span fg={color}>{symbol} {daemonStatus}</span>
            {compact ? null : (
              <>
                <span fg="#6b7280">{t("board.loopsLabel")}</span>
                <span fg="#e5e7eb">{counts.total}</span>
                <span fg="#6b7280">{t("board.runningLabel")}</span>
                <span fg="#4ade80">{counts.running}</span>
                <span fg="#6b7280">{t("board.waitingLabel")}</span>
                <span fg="#38bdf8">{counts.waiting}</span>
                <span fg="#6b7280">{t("board.pausedLabel")}</span>
                <span fg="#facc15">{counts.paused}</span>
                <span fg="#6b7280">{t("board.idleLabel")}</span>
                <span fg="#fb923c">{counts.idle}</span>
              </>
            )}
          </text>
        </box>
        {buttons.map((btn) =>
          btn.action ? (
            <ActionButton
              key={btn.panel}
              label={btn.label}
              textColor={btn.color}
              focused={focusedPanel === btn.panel}
              onMouseDown={btn.action}
            />
          ) : null
        )}
      </box>
      <box style={{ height: 1, paddingLeft: 1, paddingRight: 1 }}>
        <text fg="#374151">{"─".repeat(Math.max(0, width - 2))}</text>
      </box>
    </box>
  );
}
