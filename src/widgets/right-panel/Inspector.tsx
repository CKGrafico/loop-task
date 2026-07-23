import React from "react";
import { Box, Text } from "ink";
import type { LoopMeta, Project } from "../../types.js";
import { darkTheme as theme, statusColor } from "../../shared/ui/theme.js";
import { describeLoop, commandLine, timeAgo, timeUntil, truncate } from "../../shared/ui/format.js";
import { t } from "../../shared/i18n/index.js";

const LABEL_WIDTH = 11;

function Field(props: { label: string; children: React.ReactNode }): React.ReactNode {
  return (
    <Box overflow="hidden">
      <Text bold color={theme.text.muted}>{props.label.padEnd(LABEL_WIDTH)}</Text>
      <Text color={theme.text.primary} wrap="truncate">{props.children}</Text>
    </Box>
  );
}

const DIVIDER = "\u2500".repeat(40);

function MutedField(props: { label: string; children: React.ReactNode }): React.ReactNode {
  return (
    <Box overflow="hidden">
      <Text bold color={theme.text.muted}>{props.label.padEnd(LABEL_WIDTH)}</Text>
      <Text color={theme.text.muted} wrap="truncate">{props.children}</Text>
    </Box>
  );
}

export function Inspector(props: { loop: LoopMeta | null; projects?: Project[] }): React.ReactNode {
  const { loop } = props;

  if (!loop) {
    return (
      <Box flexDirection="column" paddingY={0}>
        <Box paddingLeft={1}>
          <Text color={theme.text.muted}>{t("board.inspectorTitle")}</Text>
        </Box>
        <Box paddingLeft={1}>
          <Text color={theme.text.muted}>{DIVIDER}</Text>
        </Box>
        <Box paddingLeft={1}>
          <Text color={theme.text.muted}>{t("board.inspectorEmpty")}</Text>
        </Box>
      </Box>
    );
  }

  const sColor = statusColor(loop.status);
  const maxRunsLabel = loop.maxRuns ? String(loop.maxRuns) : t("board.unlimited");
  const lastRun = loop.lastRunAt ? timeAgo(loop.lastRunAt) : t("format.dash");
  const lastExit = loop.lastExitCode !== null ? String(loop.lastExitCode) : t("format.dash");
  const nextRun = loop.nextRunAt ? t("format.timingNext", { timeAgo: timeUntil(loop.nextRunAt) }) : t("format.dash");

  const fullCmd = truncate(commandLine(loop.command, loop.commandArgs), 38);
  const desc = truncate(describeLoop(loop), 38);

  return (
    <Box flexDirection="column" paddingY={0}>
      <Box paddingLeft={1}>
        <Text color={theme.text.muted}>{t("board.inspectorTitle")}</Text>
      </Box>
      <Box paddingLeft={1}>
        <Text color={theme.text.muted}>{DIVIDER}</Text>
      </Box>
      <Box flexDirection="column" paddingLeft={1}>
        {loop.isRecipe ? (
          <Box>
            <Text bold color={theme.semantic.warning}>{"Recipe".padEnd(LABEL_WIDTH)}</Text>
            <Text color={theme.semantic.warning}>{loop.recipeFile ?? ""}</Text>
          </Box>
        ) : null}
        <Box>
          <Text bold color={theme.text.muted}>{t("board.fieldStatus").padEnd(LABEL_WIDTH)}</Text>
          <Text color={sColor}>{loop.status}</Text>
        </Box>
        <Field label={t("board.fieldRuns")}><Text color={theme.text.primary}>{loop.runCount} / {maxRunsLabel}</Text></Field>
        <Field label={t("board.fieldInterval")}><Text color={theme.text.primary}>{loop.intervalHuman}</Text></Field>
        <Field label={t("board.fieldLastExit")}><Text color={theme.text.primary}>{lastExit}</Text></Field>
        <Field label={t("board.fieldLastRun")}><Text color={theme.text.primary}>{lastRun}</Text></Field>
        <Field label={t("board.fieldNextRun")}><Text color={theme.text.primary}>{nextRun}</Text></Field>
        {(loop.silentChainCount ?? 0) > 0 ? (
          <Field label={t("board.fieldSilentChains")}><Text color={theme.text.muted}>{t("board.silentChainCount", { count: (loop.silentChainCount ?? 0).toLocaleString() })}</Text></Field>
        ) : null}
        <MutedField label={t("board.fieldDesc")}>{desc}</MutedField>
        <MutedField label={t("board.fieldCommand")}>{fullCmd}</MutedField>
      </Box>
      <Box paddingLeft={1}>
        <Text color={theme.text.muted}>{DIVIDER}</Text>
      </Box>
    </Box>
  );
}
