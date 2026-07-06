import { useEffect, useRef, useState } from "react";
import type net from "node:net";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import type { ScrollBoxRenderable } from "@opentui/core";
import type { RunRecord } from "../../types.js";
import { t } from "../../i18n/index.js";
import { formatRunDuration, formatRunTime } from "../format.js";
import { streamRunLog } from "../daemon.js";
import { LOG_LINES_MAX } from "../../config/constants.js";
import { copyToClipboard } from "../../shared/clipboard.js";

function colorizeLine(line: string): React.ReactNode {
  if (/^\[Run #/.test(line)) {
    return <text fg="#38bdf8"><strong>{line}</strong></text>;
  }
  if (/^\$ /.test(line)) {
    return <text fg="#f0abfc">{line}</text>;
  }
  if (/^  cwd:/.test(line)) {
    return <text fg="#6b7280">{line}</text>;
  }
  if (/^--- Chain:/.test(line)) {
    return <text fg="#a78bfa"><strong>{line}</strong></text>;
  }
  if (/^\[exit 0/.test(line)) {
    return <text fg="#4ade80">{line}</text>;
  }
  if (/^\[exit /.test(line)) {
    return <text fg="#f87171">{line}</text>;
  }
  if (/^\[error\]/.test(line)) {
    return <text fg="#f87171">{line}</text>;
  }
  return <text fg="#e5e7eb">{line}</text>;
}

export function LogModal(props: {
  loopId: string | null;
  run: RunRecord;
  logLines: string[];
  loading: boolean;
  onClose: () => void;
}): React.ReactNode {
  const { loopId, run, logLines: staticLines, loading } = props;
  const { width, height } = useTerminalDimensions();
  const isRunning = run.status === "running";

  const [streamLines, setStreamLines] = useState<string[]>([]);
  const socketRef = useRef<net.Socket | null>(null);
  const scrollRef = useRef<ScrollBoxRenderable | null>(null);

  useEffect(() => {
    if (!isRunning || !loopId) return;
    setStreamLines([t("board.logWaiting")]);
    const socket = streamRunLog(
      loopId,
      run.runNumber,
      (line) =>
        setStreamLines((prev) => {
          const next = prev[0] === t("board.logWaiting") ? [] : prev;
          return [...next, line].slice(-LOG_LINES_MAX);
        }),
      () => {},
      () => {}
    );
    socketRef.current = socket;
    return () => {
      socket.destroy();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [isRunning, loopId, run.runNumber]);

  const logLines = isRunning ? streamLines : staticLines;

  useEffect(() => {
    if (logLines.length > 0) {
      scrollRef.current?.scrollChildIntoView(`log-line-${logLines.length - 1}`);
    }
  }, [logLines]);

  useKeyboard((key) => {
    if (key.ctrl && key.name === "c") {
      const all = logLines.join("\n");
      copyToClipboard(all);
    }
  });

  const success = isRunning ? true : run.exitCode === 0;
  const icon = isRunning ? "⟳" : success ? "✓" : "✗";
  const iconColor = isRunning ? "#facc15" : success ? "#4ade80" : "#f87171";
  const chainLabel = run.chainName ? ` → ${run.chainName}` : "";

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
        title={`${t("board.logModalTitle", { icon, time: formatRunTime(run.startedAt) })}${chainLabel}`}
        border
        style={{
          flexDirection: "column",
          minWidth: Math.min(60, width - 4),
          width: Math.min(width - 4, 100),
          height: Math.min(height - 4, 30),
          backgroundColor: "#111827",
        }}
      >
        <scrollbox ref={scrollRef} style={{ flexGrow: 1, backgroundColor: "#0b0b0b" }}>
          {loading && !isRunning ? (
            <text fg="#9ca3af">{t("board.logModalLoading")}</text>
          ) : logLines.length === 0 ? (
            <text fg="#9ca3af">{t("board.logModalEmpty")}</text>
          ) : (
            logLines.map((line, i) => (
              <box key={i} id={`log-line-${i}`}>{colorizeLine(line)}</box>
            ))
          )}
        </scrollbox>
        <box style={{ flexDirection: "row", justifyContent: "space-between", backgroundColor: "#111827" }}>
          <text>
            <span fg={iconColor}>{icon}</span>{" "}
            {isRunning ? (
              <span fg="#facc15">{t("board.logModalRunning")}</span>
            ) : (
              <>
                <span fg="#9ca3af">{formatRunDuration(run.duration)}</span>{" "}
                <span fg={success ? "#4ade80" : "#f87171"}>exit {run.exitCode}</span>
              </>
            )}
          </text>
          <text fg="#6b7280">{t("board.logModalEscClose")}</text>
        </box>
      </box>
    </box>
  );
}
