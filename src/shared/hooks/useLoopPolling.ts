import { useCallback, useEffect, useRef, useState } from "react";
import type { LoopMeta } from "../../types.js";
import { useInject } from "./useInject.js";
import { TYPES } from "../services/types.js";
import type { LoopService } from "../services/types.js";
import { POLL_MS } from "../config/constants.js";
import type { DaemonStatus } from "../../app/types.js";

export function useLoopPolling(): {
  loops: LoopMeta[];
  daemonStatus: DaemonStatus;
  refresh: () => Promise<void>;
} {
  const loopService = useInject<LoopService>(TYPES.LoopService);
  const [loops, setLoops] = useState<LoopMeta[]>([]);
  const [daemonStatus, setDaemonStatus] = useState<DaemonStatus>("starting");
  const lastSerialized = useRef<string>("");

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const next = await loopService.list();
      const serialized = JSON.stringify(next);
      if (serialized !== lastSerialized.current) {
        lastSerialized.current = serialized;
        setLoops(next);
      }
      setDaemonStatus("connected");
    } catch {
      setDaemonStatus("error");
    }
  }, [loopService]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  return { loops, daemonStatus, refresh };
}
