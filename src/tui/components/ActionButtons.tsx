import React from "react";
import { Box, Text } from "ink";
import type { LoopMeta, LoopStatus } from "../../types.js";
import { darkTheme as theme } from "../theme.js";
import { t } from "../../i18n/index.js";
import { FocusableButton } from "./FocusableButton.js";

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
  onAction: (action: string) => void;
}): React.ReactNode {
  const { loop, onAction } = props;

  const actions = loop ? getActions(loop.status) : [];

  if (!loop) {
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
      {actions.map((action) => {
        const color = action.key === "delete" || action.key === "stop"
          ? theme.semantic.danger
          : theme.accent.focus;
        const variant = action.key === "delete" || action.key === "stop"
          ? "danger"
          : "default";
        return (
          <FocusableButton
            key={action.key}
            label={action.label}
            color={color}
            variant={variant}
            onPress={() => onAction(action.key)}
          />
        );
      })}
    </Box>
  );
}
