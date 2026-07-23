import { useEffect, useState } from "react";
import { useInject } from "./useInject.js";
import { TYPES } from "../services/types.js";
import type { SettingsService } from "../services/types.js";
import { POLL_MS } from "../config/constants.js";

export interface DaemonSettingsState {
  httpApiEnabled: boolean;
  mcpApiEnabled: boolean;
  telemetryEnabled: boolean;
  /** false until the first successful fetch, or after the daemon becomes unreachable */
  reachable: boolean;
}

export function useDaemonSettings(): DaemonSettingsState {
  const settingsService = useInject<SettingsService>(TYPES.SettingsService);
  const [state, setState] = useState<DaemonSettingsState>({
    httpApiEnabled: false,
    mcpApiEnabled: false,
    telemetryEnabled: false,
    reachable: false,
  });

  useEffect(() => {
    let cancelled = false;

    const poll = async (): Promise<void> => {
      try {
        const settings = await settingsService.getSettings();
        if (!cancelled) {
          setState({
            httpApiEnabled: settings.httpApiEnabled,
            mcpApiEnabled: settings.mcpApiEnabled,
            telemetryEnabled: settings.telemetryEnabled,
            reachable: true,
          });
        }
      } catch {
        if (!cancelled) {
          setState((prev) => ({ ...prev, reachable: false }));
        }
      }
    };

    void poll();
    const timer = setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [settingsService]);

  return state;
}
