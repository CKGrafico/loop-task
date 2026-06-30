import React from "react";
import { Box, Text, useStdout } from "ink";
import { darkTheme as theme } from "../theme.js";
import type { DaemonStatus, View } from "../types.js";
import { ENTITY_COLORS, HEADER_COMPACT_WIDTH } from "../../config/constants.js";
import { t } from "../../i18n/index.js";

interface HeaderProps {
  daemonStatus: DaemonStatus;
  counts: { total: number; running: number; waiting: number; paused: number; idle: number };
  view: View;
  onViewLoops: () => void;
  onViewTasks: () => void;
  onViewProjects: () => void;
  onAddLoop: () => void;
  onAddTask: () => void;
  onAddProject: () => void;
}

interface ActionButton {
  label: string;
  color: string;
  onPress: () => void;
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

function actionButtons(view: View, props: HeaderProps): ActionButton[] {
  const manageLabel = t("project.manageLabel");
  const viewLoopsLabel = t("board.viewLoopsLabel");
  const viewTasksLabel = t("board.viewTasksLabel");
  const newLoopLabel = t("board.newLoopLabel");
  const taskActionNew = t("board.taskActionNew");
  const newProjectLabel = t("project.newProjectLabel");

  switch (view) {
    case "board":
      return [
        { label: manageLabel, color: ENTITY_COLORS.project, onPress: props.onViewProjects },
        { label: viewTasksLabel, color: ENTITY_COLORS.task, onPress: props.onViewTasks },
        { label: newLoopLabel, color: ENTITY_COLORS.loop, onPress: props.onAddLoop },
      ];
    case "task-list":
      return [
        { label: manageLabel, color: ENTITY_COLORS.project, onPress: props.onViewProjects },
        { label: viewLoopsLabel, color: ENTITY_COLORS.loop, onPress: props.onViewLoops },
        { label: taskActionNew, color: ENTITY_COLORS.task, onPress: props.onAddTask },
      ];
    case "projects":
      return [
        { label: viewLoopsLabel, color: ENTITY_COLORS.loop, onPress: props.onViewLoops },
        { label: viewTasksLabel, color: ENTITY_COLORS.task, onPress: props.onViewTasks },
        { label: newProjectLabel, color: ENTITY_COLORS.project, onPress: props.onAddProject },
      ];
    default:
      return [
        { label: manageLabel, color: ENTITY_COLORS.project, onPress: props.onViewProjects },
        { label: viewTasksLabel, color: ENTITY_COLORS.task, onPress: props.onViewTasks },
        { label: newLoopLabel, color: ENTITY_COLORS.loop, onPress: props.onAddLoop },
      ];
  }
}

function HeaderButton(props: { btn: ActionButton }): React.ReactNode {
  const { label, color, onPress } = props.btn;
  return (
    <Box
      borderStyle="single"
      borderColor={color}
      paddingX={1}
      >
      <Text color={color} bold>{label}</Text>
    </Box>
  );
}

export function Header(props: HeaderProps): React.ReactNode {
  const { stdout } = useStdout();
  const width = stdout?.columns ?? 80;
  const compact = width < HEADER_COMPACT_WIDTH;
  const buttons = actionButtons(props.view, props);

  return (
    <Box flexDirection="column">
      <Box>
        <Text color="#a3e635" bold>{t("board.appName")}</Text>
        <Text color={theme.text.muted}>{t("board.appTagline")}</Text>
      </Box>

      <Box justifyContent="space-between">
        <Box>
          <Text color={daemonColor(props.daemonStatus)}>{daemonSymbol(props.daemonStatus)}</Text>
          <Text color={theme.text.secondary}> {daemonText(props.daemonStatus)}</Text>
          {!compact && (
            <>
              <Text color={theme.text.muted}>{t("board.loopsLabel")}</Text>
              <Text color={theme.text.primary}>{props.counts.total}</Text>
              <Text color={theme.text.muted}>{t("board.runningLabel")}</Text>
              <Text color={theme.semantic.success}>{props.counts.running}</Text>
              <Text color={theme.text.muted}>{t("board.waitingLabel")}</Text>
              <Text color={theme.semantic.info}>{props.counts.waiting}</Text>
              <Text color={theme.text.muted}>{t("board.pausedLabel")}</Text>
              <Text color={theme.semantic.warning}>{props.counts.paused}</Text>
              <Text color={theme.text.muted}>{t("board.idleLabel")}</Text>
              <Text color={theme.semantic.idle}>{props.counts.idle}</Text>
            </>
          )}
        </Box>

        <Box>
          {buttons.map((btn, i) => (
            <Box key={i} marginRight={i < buttons.length - 1 ? 1 : 0}>
              <HeaderButton btn={btn} />
            </Box>
          ))}
        </Box>
      </Box>

      <Box>
        <Text color={theme.border.default}>{"\u2500".repeat(width)}</Text>
      </Box>
    </Box>
  );
}
