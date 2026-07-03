import React from "react";
import { Box, Text, useInput } from "ink";
import Spinner from "ink-spinner";
import { ScrollList } from "ink-scroll-list";
import type { LoopMeta, Project } from "../../types.js";
import { darkTheme as theme, statusColor } from "../theme.js";
import { describeLoop, sinceLabel, statusLabel, timingLabel, truncate } from "../format.js";
import { t } from "../../i18n/index.js";

const DESC_WIDTH = 32;
const SINCE_WIDTH = 13;
const RUNS_WIDTH = 4;
const SKIPPED_WIDTH = 3;
const STATUS_WIDTH = 8;
const COL_GAP = 1;
const LIMIT = 15;

export function Navigator(props: {
  visible: LoopMeta[];
  total: number;
  selectedIndex: number;
  filters: { status?: string };
  sort: string;
  breakpoint?: string;
  projects: Project[];
  onSelect: (index: number) => void;
  onActivate: (index: number) => void;
  isFocused: boolean;
  navActive?: boolean;
}): React.ReactNode {
  const { visible, total, selectedIndex, filters, sort, projects, onSelect, onActivate, isFocused, navActive = true } = props;

  const n = visible.length;

  useInput(
    (input, key) => {
      if (n === 0) return;
      if (key.upArrow || input === "k") {
        const next = selectedIndex <= 0 ? n - 1 : selectedIndex - 1;
        onSelect(next);
        return;
      }
      if (key.downArrow || input === "j") {
        const next = selectedIndex >= n - 1 ? 0 : selectedIndex + 1;
        onSelect(next);
        return;
      }
      if (key.ctrl && key.return) {
        onActivate(selectedIndex);
        return;
      }
    },
    { isActive: isFocused && navActive },
  );

  const statusFilter = filters?.status ?? "all";
  const title = t("board.navigatorTitle", {
    visible: String(visible.length),
    total: String(total),
    sort,
    status: statusFilter,
  });

  function projectColor(loop: LoopMeta): string {
    const proj = projects.find((p) => p.id === loop.projectId);
    return proj?.color ?? theme.text.muted;
  }

  function renderLoop(loop: LoopMeta, isSelected: boolean): React.ReactNode {
    const desc = truncate(describeLoop(loop), DESC_WIDTH);
    const since = sinceLabel(loop);
    const timing = timingLabel(loop);
    const sColor = statusColor(loop.status);
    const sLabel = statusLabel(loop.status);
    const fg = isSelected ? theme.text.inverse : theme.text.primary;
    return (
      <>
        <Text color={isSelected ? theme.text.inverse : projectColor(loop)}>{"\u25cf "}</Text>
        <Text color={fg}>{desc.padEnd(DESC_WIDTH + COL_GAP)}</Text>
        <Text color={fg}>{since.padEnd(SINCE_WIDTH + COL_GAP)}</Text>
        <Text color={fg}>{String(loop.runCount).padEnd(RUNS_WIDTH + COL_GAP)}</Text>
        <Text color={fg}>{String(loop.skippedCount).padEnd(SKIPPED_WIDTH + COL_GAP)}</Text>
        <Text color={isSelected ? theme.text.inverse : sColor}>{sLabel.padEnd(STATUS_WIDTH + COL_GAP)}</Text>
        <Text color={fg}>{timing}</Text>
        {loop.status === "running" ? (
          <Text color={theme.semantic.success}>{" "}<Spinner type="dots" /></Text>
        ) : null}
      </>
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1}>
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
            <Text color={theme.text.muted}>{t("board.headerDescription").padEnd(DESC_WIDTH + COL_GAP)}</Text>
            <Text color={theme.text.muted}>{t("board.headerSince").padEnd(SINCE_WIDTH + COL_GAP)}</Text>
            <Text color={theme.text.muted}>{t("board.headerRuns").padEnd(RUNS_WIDTH + COL_GAP)}</Text>
            <Text color={theme.text.muted}>{t("board.headerSkipped").padEnd(SKIPPED_WIDTH + COL_GAP)}</Text>
            <Text color={theme.text.muted}>{t("board.headerStatus").padEnd(STATUS_WIDTH + COL_GAP)}</Text>
            <Text color={theme.text.muted}>{t("board.headerTiming")}</Text>
          </Box>
          <Box paddingLeft={1}>
            <ScrollList selectedIndex={selectedIndex} height={LIMIT}>
              {visible.map((loop, i) => {
                const isSelected = i === selectedIndex;
                const indicator = isSelected ? "\u203a " : "  ";
                return (
                  <Box
                    key={i}
                    backgroundColor={isSelected ? theme.bg.active : undefined}
                  >
                    <Text color={isSelected ? theme.text.inverse : theme.text.primary}>
                      {indicator}
                    </Text>
                    {renderLoop(loop, isSelected)}
                  </Box>
                );
              })}
            </ScrollList>
          </Box>
        </Box>
      )}
    </Box>
  );
}
