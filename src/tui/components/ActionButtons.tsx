import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import type { LoopMeta, LoopStatus } from "../../types.js";
import { darkTheme as theme } from "../theme.js";
import { t } from "../../i18n/index.js";

export interface ActionDef {
  key: string;
  label: string;
}

const STOP_ACTION: ActionDef = { key: "stop", label: t("board.actionStop") };
const PAUSE_ACTION: ActionDef = { key: "pause", label: t("board.actionPause") };
const PLAY_ACTION: ActionDef = { key: "play", label: t("board.actionPlay") };

const STATUS_ACTIONS: Record<LoopStatus, ActionDef[]> = {
  running: [STOP_ACTION],
  waiting: [PAUSE_ACTION, STOP_ACTION],
  paused: [STOP_ACTION, PLAY_ACTION],
  idle: [PLAY_ACTION],
  stopped: [PLAY_ACTION],
};

export function getActions(status: LoopStatus): ActionDef[] {
  const actions: ActionDef[] = [
    { key: "edit", label: t("board.actionEdit") },
    { key: "delete", label: t("board.actionDelete") },
  ];
  actions.push(...STATUS_ACTIONS[status]);
  if (status !== "running") {
    actions.push({ key: "clone", label: t("board.actionClone") });
    actions.push({ key: "trigger", label: t("board.actionTrigger") });
  }
  return actions;
}

export function getActionKeys(status: LoopStatus): readonly string[] {
  return getActions(status).map((a) => a.key);
}

export function getActionCount(status: LoopStatus): number {
  return getActions(status).length;
}

export function ActionButtons(props: {
  loop: LoopMeta | null;
  focused: boolean;
  selectedAction: number;
  onAction: (action: string) => void;
}): React.ReactNode {
  const { loop, focused, selectedAction, onAction } = props;

  const actions = loop ? getActions(loop.status) : [];
  const [cursor, setCursor] = useState(selectedAction);

  useEffect(() => {
    setCursor(Math.min(selectedAction, Math.max(0, actions.length - 1)));
  }, [selectedAction, actions.length]);

  useInput((_input, key) => {
    if (!focused || !loop) return;
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

  if (!loop) {
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
