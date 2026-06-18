import { useTerminalDimensions } from "@opentui/react";
import { HEADER_COMPACT_WIDTH } from "../../config/constants.js";
import { t } from "../../i18n/index.js";
import type { DaemonStatus } from "../types.js";
import { useHoverState } from "../hooks/useHoverState.js";
import { HOVER_BG } from "../../config/constants.js";

function ActionButton(props: {
  label: string;
  textColor: string;
  onMouseDown: () => void;
}): React.ReactNode {
  const { isHovered, hoverProps } = useHoverState();
  return (
    <box
      border
      onMouseDown={props.onMouseDown}
      style={{ flexGrow: 0, height: 3, paddingLeft: 1, paddingRight: 1, marginLeft: 1, backgroundColor: isHovered ? HOVER_BG : "#0b0b0b" }}
      {...hoverProps}
    >
      <text fg={props.textColor}>{props.label}</text>
    </box>
  );
}

export function Header(props: {
  daemonStatus: DaemonStatus;
  counts: { total: number; running: number; waiting: number; paused: number; idle: number };
  onViewTasks?: () => void;
  onViewProjects?: () => void;
  onAddLoop?: () => void;
}): React.ReactNode {
  const { daemonStatus, counts, onViewTasks, onViewProjects, onAddLoop } = props;
  const { width } = useTerminalDimensions();
  const compact = width < HEADER_COMPACT_WIDTH;
  const color =
    daemonStatus === "connected"
      ? "#4ade80"
      : daemonStatus === "error"
        ? "#f87171"
        : "#facc15";
  const symbol = daemonStatus === "connected" ? "✓" : daemonStatus === "error" ? "✗" : "…";

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
        {onViewTasks ? <ActionButton label={t("board.viewTasksLabel")} textColor="#a78bfa" onMouseDown={onViewTasks} /> : null}
        {onViewProjects ? <ActionButton label={t("project.manageLabel")} textColor="#34d399" onMouseDown={onViewProjects} /> : null}
        {onAddLoop ? <ActionButton label={t("board.newLoopLabel")} textColor="#4ade80" onMouseDown={onAddLoop} /> : null}
      </box>
      <box style={{ height: 1, paddingLeft: 1, paddingRight: 1 }}>
        <text fg="#374151">{"─".repeat(Math.max(0, width - 2))}</text>
      </box>
    </box>
  );
}
