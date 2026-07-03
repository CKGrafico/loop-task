import React from "react";
import { Box, Text } from "ink";
import type { LoopMeta } from "../../types.js";
import { darkTheme as theme, statusColor } from "../theme.js";
import { describeLoop, commandLine, timeAgo, timeUntil } from "../format.js";
import { t } from "../../i18n/index.js";

const LABEL_WIDTH = 11;

function Field(props: { label: string; children: React.ReactNode }): React.ReactNode {
  return (
    <Box>
      <Text bold color={theme.text.muted}>{props.label.padEnd(LABEL_WIDTH)}</Text>
      <Text color={theme.text.primary}>{props.children}</Text>
    </Box>
  );
}

const DIVIDER = "\u2500".repeat(40);

/** Muted-label field for identity block (de-emphasized). */
function MutedField(props: { label: string; children: React.ReactNode }): React.ReactNode {
  return (
    <Box>
      <Text bold color={theme.text.muted}>{props.label.padEnd(LABEL_WIDTH)}</Text>
      <Text color={theme.text.muted}>{props.children}</Text>
    </Box>
  );
}

export function Inspector(props: { loop: LoopMeta | null }): React.ReactNode {
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
  const pid = loop.pid ? String(loop.pid) : t("format.dash");

  // Dedupe: when description matches the full command line, skip Command field
  const fullCmd = commandLine(loop.command, loop.commandArgs);
  const desc = describeLoop(loop);
  const showCommand = desc !== fullCmd;

  return (
    <Box flexDirection="column" paddingY={0}>
      <Box paddingLeft={1}>
        <Text color={theme.text.muted}>{t("board.inspectorTitle")}</Text>
      </Box>
      <Box paddingLeft={1}>
        <Text color={theme.text.muted}>{DIVIDER}</Text>
      </Box>
      <Box flexDirection="column" paddingLeft={1}>
        {/* State block */}
        <Box>
          <Text bold color={theme.text.muted}>{t("board.fieldStatus").padEnd(LABEL_WIDTH)}</Text>
          <Text color={sColor}>{loop.status}</Text>
        </Box>
        <Field label={t("board.fieldLastExit")}><Text color={theme.text.primary}>{lastExit}</Text></Field>
        <Field label={t("board.fieldLastRun")}><Text color={theme.text.primary}>{lastRun}</Text></Field>
        <Field label={t("board.fieldNextRun")}><Text color={theme.text.primary}>{nextRun}</Text></Field>
        <Field label={t("board.fieldRuns")}><Text color={theme.text.primary}>{loop.runCount} / {maxRunsLabel}</Text></Field>
        {/* Schedule block */}
        <Field label={t("board.fieldInterval")}><Text color={theme.text.primary}>{loop.intervalHuman}</Text></Field>
        <Field label={t("board.fieldDir")}><Text color={theme.text.primary}>{loop.cwd}</Text></Field>
        {/* Identity block (muted) */}
        <MutedField label={t("board.fieldId")}>{loop.id}</MutedField>
        <MutedField label={t("board.fieldDesc")}>{desc}</MutedField>
        {showCommand && <MutedField label={t("board.fieldCommand")}>{fullCmd}</MutedField>}
        <MutedField label={t("board.fieldTask")}>{loop.taskId ?? t("format.dash")}</MutedField>
        <MutedField label={t("board.fieldPid")}>{pid}</MutedField>
      </Box>
      <Box paddingLeft={1}>
        <Text color={theme.text.muted}>{DIVIDER}</Text>
      </Box>
    </Box>
  );
}
