import React from "react";
import { Box, Text, useFocus } from "ink";
import type { TaskDefinition } from "../../types.js";
import { darkTheme as theme } from "../theme.js";
import { commandLine } from "../format.js";
import { t } from "../../i18n/index.js";
import { FocusableList } from "./FocusableList.js";
import { FocusableButton } from "./FocusableButton.js";

const NAME_WIDTH = 24;
const COMMAND_WIDTH = 32;
const LIMIT = 15;

export function TaskNavigator(props: {
  visible: TaskDefinition[];
  total: number;
  selectedIndex: number;
  query: string;
  onSelect: (index: number) => void;
  onActivate: (index: number) => void;
}): React.ReactNode {
  const { visible, total, selectedIndex, onSelect, onActivate } = props;
  const { isFocused } = useFocus();

  const title = t("board.taskBrowserTitle", {
    visible: String(visible.length),
    total: String(total),
  });

  function chainsLabel(task: TaskDefinition): string {
    const hasSuccess = task.onSuccessTaskId !== null;
    const hasFailure = task.onFailureTaskId !== null;
    if (!hasSuccess && !hasFailure) return t("board.taskChainsNone");
    return t("board.taskChainsFormat", {
      success: hasSuccess ? "\u2713" : "-",
      failure: hasFailure ? "\u2717" : "-",
    });
  }

  function renderTask(task: TaskDefinition, isSelected: boolean): React.ReactNode {
    const name = task.name.length > NAME_WIDTH
      ? task.name.slice(0, NAME_WIDTH - 3) + "..."
      : task.name.padEnd(NAME_WIDTH);
    const cmd = commandLine(task.command, task.commandArgs);
    const cmdDisplay = cmd.length > COMMAND_WIDTH
      ? cmd.slice(0, COMMAND_WIDTH - 3) + "..."
      : cmd.padEnd(COMMAND_WIDTH);
    const chains = chainsLabel(task);
    const fg = isSelected ? theme.text.inverse : theme.text.primary;
    return (
      <>
        <Text color={fg}>{name}</Text>
        <Text color={fg}>{cmdDisplay}</Text>
        <Text color={fg}>{chains}</Text>
      </>
    );
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={isFocused ? theme.accent.task : theme.border.default}
    >
      <Box paddingLeft={1}>
        <Text color={theme.text.muted}>{title}</Text>
      </Box>
      {visible.length === 0 ? (
        <Box paddingLeft={1}>
          <Text color={theme.text.muted}>{t("board.taskBrowserEmpty")}</Text>
        </Box>
      ) : (
        <Box flexDirection="column">
          <Box paddingLeft={1}>
            <Text color={theme.text.muted}>{"  "}</Text>
            <Text color={theme.text.muted}>{t("board.taskHeaderName").padEnd(NAME_WIDTH)}</Text>
            <Text color={theme.text.muted}>{t("board.taskHeaderCommand").padEnd(COMMAND_WIDTH)}</Text>
            <Text color={theme.text.muted}>{t("board.taskHeaderChains")}</Text>
          </Box>
          <Box paddingLeft={1}>
            <FocusableList
              items={visible}
              selectedIndex={selectedIndex}
              isFocused={isFocused}
              limit={LIMIT}
              onSelect={onSelect}
              onActivate={onActivate}
              renderItem={renderTask}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
}

function InspectorField(props: { label: string; children: React.ReactNode }): React.ReactNode {
  return (
    <Box>
      <Text bold color={theme.text.secondary}>{props.label}</Text>
      <Text color={theme.text.primary}>{props.children}</Text>
    </Box>
  );
}

export function TaskInspector(props: { task: TaskDefinition | null }): React.ReactNode {
  const { task } = props;

  if (!task) {
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

  const cmd = commandLine(task.command, task.commandArgs);
  const onSuccess = task.onSuccessTaskId ?? t("board.taskNone");
  const onFailure = task.onFailureTaskId ?? t("board.taskNone");

  return (
    <Box borderStyle="single" borderColor={theme.border.default} flexDirection="column">
      <Box paddingLeft={1}>
        <Text color={theme.text.muted}>{t("board.inspectorTitle")}</Text>
      </Box>
      <Box flexDirection="column" paddingLeft={1}>
        <InspectorField label={t("board.fieldId")}>
          <Text color={theme.text.primary}>{task.id}</Text>
        </InspectorField>
        <InspectorField label={t("board.taskLabelName") + ": "}>
          <Text color={theme.text.primary}>{task.name}</Text>
        </InspectorField>
        <InspectorField label={t("board.taskLabelCommand") + ": "}>
          <Text color={theme.text.primary}>{cmd}</Text>
        </InspectorField>
        <InspectorField label={t("board.taskLabelOnSuccess") + ": "}>
          <Text color={theme.text.primary}>{onSuccess}</Text>
        </InspectorField>
        <InspectorField label={t("board.taskLabelOnFailure") + ": "}>
          <Text color={theme.text.primary}>{onFailure}</Text>
        </InspectorField>
      </Box>
    </Box>
  );
}

export function TaskActionButtons(props: {
  task: TaskDefinition | null;
  selectable: boolean;
  onAction: (action: string) => void;
}): React.ReactNode {
  const { task, selectable, onAction } = props;

  const actions = selectable
    ? [
        { key: "select", label: t("board.taskActionSelect") },
        { key: "edit", label: t("board.taskActionEdit") },
        { key: "delete", label: t("board.taskActionDelete") },
      ]
    : [
        { key: "edit", label: t("board.taskActionEdit") },
        { key: "delete", label: t("board.taskActionDelete") },
      ];

  if (!task) {
    return (
      <Box
        borderStyle="single"
        borderColor={theme.border.default}
        flexDirection="row"
        height={3}
        backgroundColor={theme.bg.surface}
      >
        <Text color={theme.text.muted}>{t("board.noActions")}</Text>
      </Box>
    );
  }

  return (
    <Box
      borderStyle="single"
      borderColor={theme.border.default}
      flexDirection="row"
      height={3}
      backgroundColor={theme.bg.surface}
    >
      {actions.map((action) => (
        <FocusableButton
          key={action.key}
          label={action.label}
          color={action.key === "delete" ? theme.semantic.danger : theme.text.secondary}
          variant={action.key === "delete" ? "danger" : "default"}
          onPress={() => onAction(action.key)}
        />
      ))}
    </Box>
  );
}
