import React from "react";
import { Box, Text, useInput } from "ink";
import type { LoopMeta, Project } from "../../types.js";
import { darkTheme as theme, statusColor } from "../theme.js";
import { describeLoop, sinceLabel, statusLabel, timingLabel, truncate } from "../format.js";
import { t } from "../../i18n/index.js";

const MAX_VISIBLE = 15;
const DESC_WIDTH = 32;
const SINCE_WIDTH = 13;
const RUNS_WIDTH = 4;
const SKIPPED_WIDTH = 3;
const STATUS_WIDTH = 8;

export function Navigator(props: {
  visible: LoopMeta[];
  total: number;
  selectedIndex: number;
  filters: { status?: string };
  sort: string;
  breakpoint?: string;
  focused: boolean;
  projects: Project[];
  onSelect: (index: number) => void;
  onActivate: (index: number) => void;
}): React.ReactNode {
  const { visible, total, selectedIndex, filters, sort, focused, projects, onSelect, onActivate } = props;

  useInput((_input, key) => {
    if (!focused) return;
    if (key.upArrow) {
      if (selectedIndex > 0) onSelect(selectedIndex - 1);
      return;
    }
    if (key.downArrow) {
      if (selectedIndex < visible.length - 1) onSelect(selectedIndex + 1);
      return;
    }
    if (key.return) {
      if (visible[selectedIndex]) onActivate(selectedIndex);
      return;
    }
  });

  const statusFilter = filters?.status ?? "all";
  const title = t("board.navigatorTitle", {
    visible: String(visible.length),
    total: String(total),
    sort,
    status: statusFilter,
  });

  let start = 0;
  if (visible.length > MAX_VISIBLE) {
    const half = Math.floor(MAX_VISIBLE / 2);
    if (selectedIndex <= half) {
      start = 0;
    } else if (selectedIndex >= visible.length - half) {
      start = visible.length - MAX_VISIBLE;
    } else {
      start = selectedIndex - half;
    }
  }
  const end = Math.min(start + MAX_VISIBLE, visible.length);
  const rows = visible.slice(start, end);

  function projectColor(loop: LoopMeta): string {
    const proj = projects.find((p) => p.id === loop.projectId);
    return proj?.color ?? theme.text.muted;
  }

  return (
    <Box flexDirection="column" borderStyle="single" borderColor={focused ? theme.accent.loop : theme.border.default}>
      <Box paddingLeft={1}>
        <Text color={theme.text.muted}>{title}</Text>
      </Box>
      {visible.length === 0 ? (
        <Box paddingLeft={1}>
          <Text color={theme.text.muted}>{t("board.noMatch")}</Text>
        </Box>
      ) : (
        <Box flexDirection="column">
          <Box paddingLeft={1}>
            <Text color={theme.text.muted}>{"  "}</Text>
            <Text color={theme.text.muted}>{"  "}</Text>
            <Text color={theme.text.muted}>{t("board.headerDescription").padEnd(DESC_WIDTH)}</Text>
            <Text color={theme.text.muted}>{t("board.headerSince").padEnd(SINCE_WIDTH)}</Text>
            <Text color={theme.text.muted}>{t("board.headerRuns").padEnd(RUNS_WIDTH)}</Text>
            <Text color={theme.text.muted}>{t("board.headerSkipped").padEnd(SKIPPED_WIDTH)}</Text>
            <Text color={theme.text.muted}>{t("board.headerStatus").padEnd(STATUS_WIDTH)}</Text>
            <Text color={theme.text.muted}>{t("board.headerTiming")}</Text>
          </Box>
          {rows.map((loop, i) => {
            const realIndex = start + i;
            const isSelected = realIndex === selectedIndex;
            const indicator = isSelected ? "\u203a " : "  ";
            const desc = truncate(describeLoop(loop), DESC_WIDTH);
            const since = sinceLabel(loop);
            const timing = timingLabel(loop);
            const sColor = statusColor(loop.status);
            const sLabel = statusLabel(loop.status);
            const bg = isSelected ? theme.bg.active : undefined;
            const fg = isSelected ? theme.text.inverse : theme.text.primary;

            return (
              <Box key={loop.id} backgroundColor={bg} paddingLeft={1}>
                <Text color={isSelected ? theme.text.inverse : theme.text.secondary}>{indicator}</Text>
                <Text color={isSelected ? theme.text.inverse : projectColor(loop)}>{"\u25cf "}</Text>
                <Text color={fg}>{desc.padEnd(DESC_WIDTH)}</Text>
                <Text color={fg}>{since.padEnd(SINCE_WIDTH)}</Text>
                <Text color={fg}>{String(loop.runCount).padEnd(RUNS_WIDTH)}</Text>
                <Text color={fg}>{String(loop.skippedCount).padEnd(SKIPPED_WIDTH)}</Text>
                <Text color={isSelected ? theme.text.inverse : sColor}>{sLabel.padEnd(STATUS_WIDTH)}</Text>
                <Text color={fg}>{timing}</Text>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
