import { useCallback, useEffect, useRef, useState } from "react";
import type { LoopMeta } from "../../types.js";
import { listLoops } from "../daemon.js";
import { POLL_MS } from "../../config/constants.js";
import type { DaemonStatus } from "../types.js";

export function useLoopPolling(): {
  loops: LoopMeta[];
  daemonStatus: DaemonStatus;
  refresh: () => Promise<void>;
} {
  const [loops, setLoops] = useState<LoopMeta[]>([]);
  const [daemonStatus, setDaemonStatus] = useState<DaemonStatus>("starting");
  const lastSerialized = useRef<string>("");

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const next = await listLoops();
      const serialized = JSON.stringify(next);
      if (serialized !== lastSerialized.current) {
        lastSerialized.current = serialized;
        setLoops(next);
      }
      setDaemonStatus("connected");
    } catch {
      setDaemonStatus("error");
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  return { loops, daemonStatus, refresh };
}
