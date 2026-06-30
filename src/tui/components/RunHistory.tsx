import React from "react";
import { Box, Text, useInput } from "ink";
import type { LoopMeta, RunRecord } from "../../types.js";
import { darkTheme as theme } from "../theme.js";
import { formatRunTime, formatRunDuration, formatFileSize } from "../format.js";
import { t } from "../../i18n/index.js";

function runIcon(run: RunRecord): string {
  if (run.status === "running") return "\u21bb";
  return run.exitCode === 0 ? "\u2713" : "\u2717";
}

function runIconColor(run: RunRecord): string {
  if (run.status === "running") return theme.semantic.info;
  return run.exitCode === 0 ? theme.semantic.success : theme.semantic.danger;
}

export function RunHistory(props: {
  loop: LoopMeta | null;
  selectedRunIndex: number;
  focused: boolean;
  onSelectRun: (index: number) => void;
  onOpenRun: (run: RunRecord) => void;
}): React.ReactNode {
  const { loop, selectedRunIndex, focused, onSelectRun, onOpenRun } = props;

  const runs = loop?.runHistory ?? [];
  const reversed = [...runs].reverse();

  useInput((_input, key) => {
    if (!focused) return;
    if (reversed.length === 0) return;
    if (key.upArrow) {
      const next = selectedRunIndex <= 0 ? reversed.length - 1 : selectedRunIndex - 1;
      onSelectRun(next);
      return;
    }
    if (key.downArrow) {
      const next = selectedRunIndex >= reversed.length - 1 ? 0 : selectedRunIndex + 1;
      onSelectRun(next);
      return;
    }
    if (key.return) {
      const run = reversed[selectedRunIndex];
      if (run) onOpenRun(run);
      return;
    }
  });

  const title = focused ? t("board.runHistoryTitleHint") : t("board.runHistoryTitle");

  return (
    <Box borderStyle="single" borderColor={focused ? theme.accent.focus : theme.border.default} flexDirection="column">
      <Box paddingLeft={1}>
        <Text color={theme.text.muted}>{title}</Text>
      </Box>
      {reversed.length === 0 ? (
        <Box paddingLeft={1}>
          <Text color={theme.text.muted}>{t("board.runHistoryEmpty")}</Text>
        </Box>
      ) : (
        <Box flexDirection="column">
          <Box paddingLeft={1}>
            <Text color={theme.text.muted}>{t("board.runHistoryTime").padEnd(10)}</Text>
            <Text color={theme.text.muted}>{"  "}</Text>
            <Text color={theme.text.muted}>{t("board.runHistoryDuration").padEnd(10)}</Text>
            <Text color={theme.text.muted}>{t("board.runHistorySize").padEnd(8)}</Text>
            <Text color={theme.text.muted}>{t("board.runHistoryDesc")}</Text>
          </Box>
          {reversed.map((run, i) => {
            const isSelected = i === selectedRunIndex;
            const bg = isSelected ? theme.bg.active : undefined;
            const fg = isSelected ? theme.text.inverse : theme.text.primary;
            const time = formatRunTime(run.startedAt);
            const duration = formatRunDuration(run.duration);
            const size = formatFileSize(run.logSize);
            const icon = runIcon(run);
            const iconColor = runIconColor(run);
            const chain = run.chainName ?? "";

            return (
              <Box key={`${run.runNumber}-${i}`} backgroundColor={bg} paddingLeft={1}>
                <Text color={fg}>{time.padEnd(10)}</Text>
                <Text color={isSelected ? theme.text.inverse : iconColor}>{icon} </Text>
                <Text color={fg}>{duration.padEnd(10)}</Text>
                <Text color={fg}>{size.padEnd(8)}</Text>
                <Text color={fg}>{chain}</Text>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
