import React from "react";
import { Box, Text, useStdout } from "ink";
import { darkTheme as theme } from "../theme.js";
import type { DaemonStatus, TabName } from "../types.js";
import { HEADER_COMPACT_WIDTH } from "../../config/constants.js";
import { t } from "../../i18n/index.js";
import { TabBar } from "./TabBar.js";

interface HeaderProps {
  daemonStatus: DaemonStatus;
  counts: { total: number; running: number; waiting: number; paused: number; idle: number };
  activeTab: TabName;
  onTabChange: (tab: TabName) => void;
  tabCounts?: Partial<Record<TabName, number>>;
}

function daemonSymbol(status: DaemonStatus): string {
  switch (status) {
    case "connected": return "\u25CF";
    case "starting": return "\u25CB";
    case "error": return "\u2717";
  }
}

function daemonColor(status: DaemonStatus): string {
  switch (status) {
    case "connected": return theme.semantic.success;
    case "starting": return theme.semantic.warning;
    case "error": return theme.semantic.danger;
  }
}

function daemonText(status: DaemonStatus): string {
  switch (status) {
    case "connected": return "connected";
    case "starting": return "starting";
    case "error": return "offline";
  }
}

export function Header(props: HeaderProps): React.ReactNode {
  const { stdout } = useStdout();
  const width = stdout?.columns ?? 80;
  const compact = width < HEADER_COMPACT_WIDTH;

  const entries: Array<{ label: string; value: number; color: string }> = [
    { label: t("board.runningLabel"), value: props.counts.running, color: theme.semantic.success },
    { label: t("board.waitingLabel"), value: props.counts.waiting, color: theme.accent.loop },
    { label: t("board.pausedLabel"), value: props.counts.paused, color: theme.semantic.warning },
    { label: t("board.idleLabel"), value: props.counts.idle, color: theme.semantic.idle },
  ];

  return (
    <Box flexDirection="column">
      <Box justifyContent="space-between">
        <Box gap={1}>
          <Text color={theme.accent.brand} bold>{t("board.appName")}</Text>
          <Text color={daemonColor(props.daemonStatus)}>{daemonSymbol(props.daemonStatus)}</Text>
          <Text color={theme.text.secondary}>{daemonText(props.daemonStatus)}</Text>
          {!compact && entries.map((e) =>
            e.value > 0 ? (
              <React.Fragment key={e.label}>
                <Text color={theme.text.muted}>{e.label}</Text>
                <Text color={e.color}>{e.value}</Text>
              </React.Fragment>
            ) : null,
          )}
        </Box>

        <TabBar
          activeTab={props.activeTab}
          onTabChange={props.onTabChange}
          counts={props.tabCounts}
        />
      </Box>

      <Box>
        <Text color={theme.border.default}>{"\u2500".repeat(width)}</Text>
      </Box>
    </Box>
  );
}
