import { useTerminalDimensions } from "@opentui/react";
import { HEADER_COMPACT_WIDTH } from "../../config/constants.js";
import { t } from "../../i18n/index.js";
import type { DaemonStatus } from "../types.js";

export function Header(props: {
  daemonStatus: DaemonStatus;
  counts: { total: number; running: number; sleeping: number; paused: number };
}): React.ReactNode {
  const { daemonStatus, counts } = props;
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
      <box style={{ flexDirection: "row", paddingLeft: 1, paddingRight: 1 }}>
        <text>
          <span fg="#6b7280">{t("board.daemonLabel")}</span>
          <span fg={color}>{symbol} {daemonStatus}</span>
          {compact ? null : (
            <>
              <span fg="#6b7280">{t("board.loopsLabel")}</span>
              <span fg="#e5e7eb">{counts.total}</span>
              <span fg="#6b7280">{t("board.runningLabel")}</span>
              <span fg="#4ade80">{counts.running}</span>
              <span fg="#6b7280">{t("board.sleepingLabel")}</span>
              <span fg="#38bdf8">{counts.sleeping}</span>
              <span fg="#6b7280">{t("board.pausedLabel")}</span>
              <span fg="#facc15">{counts.paused}</span>
            </>
          )}
        </text>
      </box>
      <box style={{ height: 1, paddingLeft: 1, paddingRight: 1 }}>
        <text fg="#374151">{"─".repeat(Math.max(0, width - 2))}</text>
      </box>
    </box>
  );
}
