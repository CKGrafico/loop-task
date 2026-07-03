import React from "react";
import { Box, Text, useInput } from "ink";
import { ScrollList } from "ink-scroll-list";
import type { LoopMeta, RunRecord } from "../../types.js";
import { darkTheme as theme } from "../theme.js";
import { formatRunTime, formatRunDuration, formatFileSize } from "../format.js";
import { t } from "../../i18n/index.js";

function runIcon(run: RunRecord): string {
  if (run.status === "running") return "\u21bb";
  return run.exitCode === 0 ? "\u2713" : "\u2717";
}

function runIconColor(run: RunRecord): string {
  if (run.status === "running") return theme.accent.loop;
  return run.exitCode === 0 ? theme.semantic.success : theme.semantic.danger;
}

const SPARK_CHARS = ["\u2581", "\u2582", "\u2583", "\u2584", "\u2585", "\u2586", "\u2587", "\u2588"];

function sparkline(durations: number[]): string {
  if (durations.length === 0) return "";
  const max = Math.max(...durations, 1);
  const min = Math.min(...durations, 0);
  const range = max - min || 1;
  return durations.map((d) => {
    const level = Math.round(((d - min) / range) * (SPARK_CHARS.length - 1));
    return SPARK_CHARS[level] ?? SPARK_CHARS[0]!;
  }).join("");
}

function computeTrends(runs: RunRecord[]): {
  sparkline: string;
  avgDuration: number;
  successStreak: number;
  failureStreak: number;
  lastFailureAgo: string | null;
} {
  if (runs.length === 0) {
    return { sparkline: "", avgDuration: 0, successStreak: 0, failureStreak: 0, lastFailureAgo: null };
  }

  const recent = runs.slice(-20);
  const durations = recent.map((r) => r.duration).filter((d) => d > 0);
  const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  let successStreak = 0;
  let failureStreak = 0;
  for (let i = runs.length - 1; i >= 0; i--) {
    const r = runs[i]!;
    if (r.exitCode === 0 && failureStreak === 0) successStreak++;
    else if (r.exitCode !== 0 && successStreak === 0) failureStreak++;
    else break;
  }

  let lastFailureAgo: string | null = null;
  for (let i = runs.length - 1; i >= 0; i--) {
    if (runs[i]!.exitCode !== 0) {
      const diff = Date.now() - new Date(runs[i]!.startedAt).getTime();
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor(diff / 60000);
      lastFailureAgo = hours > 0 ? `${hours}h ago` : `${mins}m ago`;
      break;
    }
  }

  return {
    sparkline: sparkline(durations),
    avgDuration: Math.round(avgDuration),
    successStreak,
    failureStreak,
    lastFailureAgo,
  };
}

const LIMIT = 15;

export function RunHistory(props: {
  loop: LoopMeta | null;
  selectedRunIndex: number;
  onSelectRun: (index: number) => void;
  onOpenRun: (run: RunRecord) => void;
  isFocused: boolean;
  navActive?: boolean;
}): React.ReactNode {
  const { loop, selectedRunIndex, onSelectRun, onOpenRun, isFocused, navActive = true } = props;

  const runs = loop?.runHistory ?? [];
  const reversed = [...runs].reverse();
  const n = reversed.length;

  useInput(
    (input, key) => {
      if (n === 0) return;
      if (key.upArrow || input === "k") {
        const next = selectedRunIndex <= 0 ? n - 1 : selectedRunIndex - 1;
        onSelectRun(next);
        return;
      }
      if (key.downArrow || input === "j") {
        const next = selectedRunIndex >= n - 1 ? 0 : selectedRunIndex + 1;
        onSelectRun(next);
        return;
      }
      if (key.ctrl && key.return) {
        const run = reversed[selectedRunIndex];
        if (run) onOpenRun(run);
        return;
      }
    },
    { isActive: isFocused && navActive },
  );

  const title = isFocused ? t("board.runHistoryTitleHint") : t("board.runHistoryTitle");
  const trends = computeTrends(runs);

  function renderRun(run: RunRecord, isSelected: boolean): React.ReactNode {
    const fg = isSelected ? theme.text.inverse : theme.text.primary;
    const time = formatRunTime(run.startedAt);
    const duration = formatRunDuration(run.duration);
    const size = formatFileSize(run.logSize);
    const icon = runIcon(run);
    const iconColor = runIconColor(run);
    const chain = run.chainName ?? "";
    return (
      <>
        <Text color={fg}>{time.padEnd(10)}</Text>
        <Text color={isSelected ? theme.text.inverse : iconColor}>{icon} </Text>
        <Text color={fg}>{duration.padEnd(10)}</Text>
        <Text color={fg}>{size.padEnd(8)}</Text>
        <Text color={fg}>{chain}</Text>
      </>
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box paddingLeft={1}>
        <Text color={theme.text.muted}>{title}</Text>
      </Box>
      {reversed.length === 0 ? (
        <Box paddingLeft={1}>
          <Text color={theme.text.muted}>{t("board.runHistoryEmpty")}</Text>
        </Box>
      ) : (
        <Box flexDirection="column">
          {trends.sparkline ? (
            <Box paddingLeft={1} marginBottom={0}>
              <Text color={theme.text.muted}>Durations: </Text>
              <Text color={theme.accent.loop}>{trends.sparkline}</Text>
              <Text color={theme.text.muted}> avg:{formatRunDuration(trends.avgDuration)} </Text>
              {trends.successStreak > 0 ? (
                <Text color={theme.semantic.success}>streak:{trends.successStreak} ok</Text>
              ) : null}
              {trends.failureStreak > 0 ? (
                <Text color={theme.semantic.danger}>streak:{trends.failureStreak} fail</Text>
              ) : null}
              {trends.lastFailureAgo ? (
                <Text color={theme.semantic.warning}> last fail:{trends.lastFailureAgo}</Text>
              ) : null}
            </Box>
          ) : null}
          <Box paddingLeft={1}>
            <Text color={theme.text.muted}>{t("board.runHistoryTime").padEnd(10)}</Text>
            <Text color={theme.text.muted}>{"  "}</Text>
            <Text color={theme.text.muted}>{t("board.runHistoryDuration").padEnd(10)}</Text>
            <Text color={theme.text.muted}>{t("board.runHistorySize").padEnd(8)}</Text>
            <Text color={theme.text.muted}>{t("board.runHistoryDesc")}</Text>
          </Box>
          <ScrollList selectedIndex={selectedRunIndex} height={LIMIT}>
            {reversed.map((run, i) => {
              const isSelected = i === selectedRunIndex;
              const indicator = isSelected ? "\u203a " : "  ";
              return (
                <Box
                  key={i}
                  backgroundColor={isSelected ? (isFocused && navActive ? theme.bg.active : isFocused ? theme.bg.hover : undefined) : undefined}
                >
                  <Text color={isSelected ? theme.text.inverse : theme.text.primary}>
                    {indicator}
                  </Text>
                  {renderRun(run, isSelected)}
                </Box>
              );
            })}
          </ScrollList>
        </Box>
      )}
    </Box>
  );
}