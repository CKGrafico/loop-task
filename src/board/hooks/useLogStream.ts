import { useEffect, useRef, useState } from "react";
import type net from "node:net";
import { streamLogs } from "../daemon.js";
import { t } from "../../i18n/index.js";
import { LOG_LINES_MAX } from "../../config/constants.js";
import type { View } from "../types.js";

export function useLogStream(
  selectedId: string | null,
  view: View,
  onError: (error: Error) => void
): { logLines: string[]; destroy: () => void } {
  const [logLines, setLogLines] = useState<string[]>([]);
  const logSocket = useRef<net.Socket | null>(null);

  useEffect(() => {
    logSocket.current?.destroy();
    logSocket.current = null;
    setLogLines([]);

    if (!selectedId || (view !== "board" && view !== "detail")) {
      return;
    }

    setLogLines([t("board.logWaiting")]);
    const socket = streamLogs(
      selectedId,
      (line) =>
        setLogLines((prev) => {
          const next = prev[0] === t("board.logWaiting") ? [] : prev;
          return [...next, line].slice(-LOG_LINES_MAX);
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
  }, [selectedId, view]);

  return {
    logLines,
    destroy: () => logSocket.current?.destroy(),
  };
}
