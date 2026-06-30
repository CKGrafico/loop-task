import React from "react";
import { Box, Text } from "ink";
import type { LoopMeta } from "../../types.js";
import { darkTheme as theme, statusColor } from "../theme.js";
import { describeLoop, commandLine } from "../format.js";
import { t } from "../../i18n/index.js";

function Field(props: { label: string; children: React.ReactNode }): React.ReactNode {
  return (
    <Box>
      <Text bold color={theme.text.secondary}>{props.label}</Text>
      <Text color={theme.text.primary}>{props.children}</Text>
    </Box>
  );
}

export function Inspector(props: { loop: LoopMeta | null }): React.ReactNode {
  const { loop } = props;

  if (!loop) {
    return (
      <Box borderStyle="single" borderColor={theme.border.default} flexDirection="column">
        <Box paddingLeft={1}>
          <Text color={theme.text.muted}>{t("board.inspectorTitle")}</Text>
        </Box>
        <Box paddingLeft={1}>
          <Text color={theme.text.muted}>{t("board.inspectorEmpty")}</Text>
        </Box>
      </Box>
    );
  }

  const sColor = statusColor(loop.status);
  const maxRuns = loop.maxRuns ?? Infinity;
  const maxRunsLabel = loop.maxRuns ? String(loop.maxRuns) : t("board.unlimited");
  const lastRun = loop.lastRunAt ?? t("format.dash");
  const lastExit = loop.lastExitCode !== null ? String(loop.lastExitCode) : t("format.dash");
  const nextRun = loop.nextRunAt ?? t("format.dash");
  const pid = loop.pid ? String(loop.pid) : t("format.dash");

  return (
    <Box borderStyle="single" borderColor={theme.border.default} flexDirection="column">
      <Box paddingLeft={1}>
        <Text color={theme.text.muted}>{t("board.inspectorTitle")}</Text>
      </Box>
      <Box flexDirection="column" paddingLeft={1}>
        <Field label={t("board.fieldId")}><Text color={theme.text.primary}>{loop.id}</Text></Field>
        <Field label={t("board.fieldDesc")}><Text color={theme.text.primary}>{describeLoop(loop)}</Text></Field>
        <Field label={t("board.fieldCommand")}><Text color={theme.text.primary}>{commandLine(loop.command, loop.commandArgs)}</Text></Field>
        <Field label={t("board.fieldTask")}><Text color={theme.text.primary}>{loop.taskId ?? t("format.dash")}</Text></Field>
        <Field label={t("board.fieldDir")}><Text color={theme.text.primary}>{loop.cwd}</Text></Field>
        <Field label={t("board.fieldInterval")}><Text color={theme.text.primary}>{loop.intervalHuman}</Text></Field>
        <Box>
          <Text bold color={theme.text.secondary}>{t("board.fieldStatus")}</Text>
          <Text color={sColor}>{loop.status}</Text>
        </Box>
        <Field label={t("board.fieldRuns")}><Text color={theme.text.primary}>{loop.runCount} / {maxRunsLabel}</Text></Field>
        <Field label={t("board.fieldLastRun")}><Text color={theme.text.primary}>{lastRun}</Text></Field>
        <Field label={t("board.fieldLastExit")}><Text color={theme.text.primary}>{lastExit}</Text></Field>
        <Field label={t("board.fieldNextRun")}><Text color={theme.text.primary}>{nextRun}</Text></Field>
        <Field label={t("board.fieldPid")}><Text color={theme.text.primary}>{pid}</Text></Field>
      </Box>
    </Box>
  );
}
