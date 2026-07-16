import { useEffect, useRef, useState } from "react";
import type net from "node:net";
import { useInject } from "./useInject.js";
import { TYPES } from "../services/types.js";
import type { LogService } from "../services/types.js";
import { t } from "../i18n/index.js";
import { LOG_LINES_MAX } from "../config/constants.js";
import { appendClamped } from "../utils/log-lines.js";
import type { View } from "../../app/types.js";

export function useLogStream(
  selectedId: string | null,
  view: View,
  onError: (error: Error) => void
): { logLines: string[]; destroy: () => void } {
  const injectedLogService = useInject<LogService>(TYPES.LogService);
  const logServiceRef = useRef(injectedLogService);
  const logService = logServiceRef.current;
  const [logLines, setLogLines] = useState<string[]>([]);
  const logSocket = useRef<net.Socket | null>(null);

  useEffect(() => {
    logSocket.current?.destroy();
    logSocket.current = null;
    setLogLines([]);

    if (!selectedId || view !== "board") {
      return;
    }

    setLogLines([t("board.logWaiting")]);
    const socket = logService.streamLogs(
      selectedId,
      (line) =>
        setLogLines((prev) => {
          const next = prev[0] === t("board.logWaiting") ? [] : prev;
          return appendClamped(next, line, LOG_LINES_MAX);
        }),
      onError
    );
    logSocket.current = socket;

    return () => {
      socket.destroy();
      if (logSocket.current === socket) {
        logSocket.current = null;
      }
    };
  }, [selectedId, view, logService]);

  return {
    logLines,
    destroy: () => logSocket.current?.destroy(),
  };
}
