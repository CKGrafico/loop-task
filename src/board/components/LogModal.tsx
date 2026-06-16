import { useTerminalDimensions } from "@opentui/react";
import type { RunRecord } from "../../types.js";
import { t } from "../../i18n/index.js";
import { formatRunDuration, formatRunTime } from "../format.js";

export function LogModal(props: {
  run: RunRecord;
  logLines: string[];
  loading: boolean;
  onClose: () => void;
}): React.ReactNode {
  const { run, logLines, loading } = props;
  const { width, height } = useTerminalDimensions();

  const success = run.exitCode === 0;
  const icon = success ? "✓" : "✗";
  const iconColor = success ? "#4ade80" : "#f87171";

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
        title={t("board.logModalTitle", { icon, time: formatRunTime(run.startedAt) })}
        border
        style={{
          flexDirection: "column",
          minWidth: Math.min(70, width - 4),
          width: Math.min(width - 4, 100),
          height: Math.min(height - 4, 30),
          backgroundColor: "#111827",
        }}
      >
        <box style={{ flexDirection: "row", backgroundColor: "#111827" }}>
          <text>
            <span fg={iconColor}>{icon}</span>{" "}
            <span fg="#9ca3af">{formatRunTime(run.startedAt)}</span>
            {"  "}
            <span fg="#9ca3af">{formatRunDuration(run.duration)}</span>
            {"  "}
            <span fg={success ? "#4ade80" : "#f87171"}>exit {run.exitCode}</span>
          </text>
        </box>
        <scrollbox style={{ flexGrow: 1, backgroundColor: "#0b0b0b" }}>
          {loading ? (
            <text fg="#9ca3af">{t("board.logModalLoading")}</text>
          ) : logLines.length === 0 ? (
            <text fg="#9ca3af">{t("board.logModalEmpty")}</text>
          ) : (
            logLines.map((line, i) => <text key={i}>{line}</text>)
          )}
        </scrollbox>
        <box style={{ flexDirection: "row", justifyContent: "center", backgroundColor: "#111827" }}>
          <text fg="#6b7280">{t("board.logModalEscClose")}</text>
        </box>
      </box>
    </box>
  );
}
