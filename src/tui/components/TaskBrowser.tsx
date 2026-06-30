import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import type { TaskDefinition } from "../../types.js";
import { darkTheme as theme } from "../theme.js";
import { commandLine } from "../format.js";
import { t } from "../../i18n/index.js";

const MAX_VISIBLE = 15;
const NAME_WIDTH = 24;
const COMMAND_WIDTH = 32;

export function TaskNavigator(props: {
  visible: TaskDefinition[];
  total: number;
  selectedIndex: number;
  focused: boolean;
  query: string;
  onSelect: (index: number) => void;
  onActivate: (index: number) => void;
}): React.ReactNode {
  const { visible, total, selectedIndex, focused, onSelect, onActivate } = props;

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

  const title = t("board.taskBrowserTitle", {
    visible: String(visible.length),
    total: String(total),
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

  function chainsLabel(task: TaskDefinition): string {
    const hasSuccess = task.onSuccessTaskId !== null;
    const hasFailure = task.onFailureTaskId !== null;
    if (!hasSuccess && !hasFailure) return t("board.taskChainsNone");
    return t("board.taskChainsFormat", {
      success: hasSuccess ? "\u2713" : "-",
      failure: hasFailure ? "\u2717" : "-",
    });
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={focused ? theme.accent.task : theme.border.default}
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
          {rows.map((task, i) => {
            const realIndex = start + i;
            const isSelected = realIndex === selectedIndex;
            const indicator = isSelected ? "\u203a " : "  ";
            const name = task.name.length > NAME_WIDTH
              ? task.name.slice(0, NAME_WIDTH - 3) + "..."
              : task.name.padEnd(NAME_WIDTH);
            const cmd = commandLine(task.command, task.commandArgs);
            const cmdDisplay = cmd.length > COMMAND_WIDTH
              ? cmd.slice(0, COMMAND_WIDTH - 3) + "..."
              : cmd.padEnd(COMMAND_WIDTH);
            const chains = chainsLabel(task);
            const bg = isSelected ? theme.bg.active : undefined;
            const fg = isSelected ? theme.text.inverse : theme.text.primary;

            return (
              <Box key={task.id} backgroundColor={bg} paddingLeft={1}>
                <Text color={isSelected ? theme.text.inverse : theme.text.secondary}>{indicator}</Text>
                <Text color={fg}>{name}</Text>
                <Text color={fg}>{cmdDisplay}</Text>
                <Text color={fg}>{chains}</Text>
              </Box>
            );
          })}
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
  focused: boolean;
  selectedAction: number;
  selectable: boolean;
  onAction: (action: string) => void;
}): React.ReactNode {
  const { task, focused, selectedAction, selectable, onAction } = props;

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

  const [cursor, setCursor] = useState(Math.min(selectedAction, Math.max(0, actions.length - 1)));

  useEffect(() => {
    setCursor(Math.min(selectedAction, Math.max(0, actions.length - 1)));
  }, [selectedAction, actions.length]);

  useInput((_input, key) => {
    if (!focused || !task) return;
    if (actions.length === 0) return;
    if (key.upArrow || key.downArrow) {
      const dir = key.upArrow ? -1 : 1;
      const next = (cursor + dir + actions.length) % actions.length;
      setCursor(next);
      return;
    }
    if (key.return) {
      const action = actions[cursor];
      if (action) onAction(action.key);
      return;
    }
  });

  const activeIndex = Math.min(cursor, Math.max(0, actions.length - 1));

  if (!task) {
    return (
      <Box
        borderStyle="single"
        borderColor={focused ? theme.accent.focus : theme.border.default}
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
      borderColor={focused ? theme.accent.focus : theme.border.default}
      flexDirection="row"
      height={3}
      backgroundColor={theme.bg.surface}
    >
      {actions.map((action, i) => {
        const isSelected = focused && activeIndex === i;
        const bg = isSelected ? theme.bg.active : undefined;
        const fg = isSelected ? theme.text.inverse : theme.text.secondary;
        return (
          <Box
            key={action.key}
            borderStyle="single"
            borderColor={isSelected ? theme.accent.focus : theme.border.dim}
            backgroundColor={bg}
            paddingX={1}
            marginRight={1}
          >
            <Text bold color={fg}>{action.label}</Text>
          </Box>
        );
      })}
    </Box>
  );
}
