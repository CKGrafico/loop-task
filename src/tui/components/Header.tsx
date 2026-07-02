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
  tabAlerts?: Partial<Record<TabName, boolean>>;
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

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={theme.accent.brand} bold>{t("board.appName")}</Text>
        <Text> </Text>
        <Text color={theme.text.muted}>{t("board.appTagline")}</Text>
      </Box>

      <Box justifyContent="space-between">
        <Box gap={1}>
          <Text color={daemonColor(props.daemonStatus)}>{daemonSymbol(props.daemonStatus)}</Text>
          <Text color={theme.text.secondary}>{daemonText(props.daemonStatus)}</Text>
          {!compact && (
            <>
              <Text color={theme.text.muted}>{t("board.loopsLabel")}</Text>
              <Text color={theme.text.primary}>{props.counts.total}</Text>
              <Text color={theme.text.muted}>{t("board.runningLabel")}</Text>
              <Text color={theme.semantic.success}>{props.counts.running}</Text>
              <Text color={theme.text.muted}>{t("board.waitingLabel")}</Text>
              <Text color={theme.accent.loop}>{props.counts.waiting}</Text>
              <Text color={theme.text.muted}>{t("board.pausedLabel")}</Text>
              <Text color={theme.semantic.warning}>{props.counts.paused}</Text>
              <Text color={theme.text.muted}>{t("board.idleLabel")}</Text>
              <Text color={theme.semantic.idle}>{props.counts.idle}</Text>
            </>
          )}
        </Box>

        <TabBar
          activeTab={props.activeTab}
          onTabChange={props.onTabChange}
          counts={props.tabCounts}
          alerts={props.tabAlerts}
        />
      </Box>

      <Box>
        <Text color={theme.border.default}>{"\u2500".repeat(width)}</Text>
      </Box>
    </Box>
  );
}
