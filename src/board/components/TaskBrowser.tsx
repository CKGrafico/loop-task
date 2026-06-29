import { useEffect, useRef, useState } from "react";
import { useTerminalDimensions } from "@opentui/react";
import type { TaskDefinition } from "../../types.js";
import { t } from "../../i18n/index.js";
import { commandLine, truncate } from "../format.js";
import { useHoverState } from "../hooks/useHoverState.js";
import { HOVER_BG, ENTITY_COLORS } from "../../config/constants.js";
import { copyToClipboard } from "../../shared/clipboard.js";
import type { ScrollBoxRenderable } from "@opentui/core";

function fit(text: string, width: number): string {
  if (width <= 0) return "";
  if (text.length <= width) return text.padEnd(width);
  return truncate(text, width);
}

const TASK_PANEL_ORDER = ["search", "new", "tasks", "actions"] as const;
export type TaskPanelFocus = (typeof TASK_PANEL_ORDER)[number];

const TASK_ACTIONS = ["select", "edit", "delete"] as const;
export const TASK_ACTION_COUNT = TASK_ACTIONS.length;
export const TASK_ACTION_KEYS = [...TASK_ACTIONS];

export function nextTaskPanel(current: TaskPanelFocus, direction: "left" | "right"): TaskPanelFocus {
  const idx = TASK_PANEL_ORDER.indexOf(current);
  return TASK_PANEL_ORDER[(idx + (direction === "right" ? 1 : TASK_PANEL_ORDER.length - 1)) % TASK_PANEL_ORDER.length];
}

export function TaskNavigator(props: {
  visible: TaskDefinition[];
  total: number;
  selectedIndex: number;
  focused: boolean;
  query: string;
  onSelect: (index: number) => void;
  onActivate: (index: number) => void;
}): React.ReactNode {
  const { visible, total, selectedIndex, focused, query, onSelect, onActivate } = props;
  const { width, height } = useTerminalDimensions();
  const scrollRef = useRef<ScrollBoxRenderable | null>(null);

  const panelWidth = width * 0.55 - 4;
  const panelHeight = height - 7;

  const nameW = 20;
  const chainsW = 14;
  const fixedOverhead = 2 + nameW + 2 + chainsW;
  const cmdW = Math.max(10, panelWidth - fixedOverhead);

  const header =
    "  " +
    fit(t("board.taskHeaderName"), nameW) +
    "  " +
    fit(t("board.taskHeaderCommand"), cmdW) +
    "  " +
    t("board.taskHeaderChains");

  useEffect(() => {
    const id = `task-row-${selectedIndex}`;
    scrollRef.current?.scrollChildIntoView(id);
  }, [selectedIndex]);

  return (
    <box
      title={t("board.taskBrowserTitle", { visible: visible.length, total })}
      border
      borderColor={focused ? ENTITY_COLORS.task : "#2e2545"}
      style={{ width: "55%", flexShrink: 0, flexDirection: "column", backgroundColor: "#0b0b0b", overflow: "hidden" }}
    >
      <text fg="#6b7280">{header}</text>
      {visible.length === 0 ? (
        <text fg="#9ca3af">{t("board.taskBrowserEmpty")}</text>
      ) : (
        <scrollbox
          ref={scrollRef}
          style={{ flexGrow: 1, maxHeight: panelHeight, backgroundColor: "#0b0b0b" }}
        >
          {visible.map((task, index) => (
            <TaskNavRow
              key={task.id}
              id={`task-row-${index}`}
              task={task}
              index={index}
              isSelected={index === selectedIndex}
              focused={focused}
              nameW={nameW}
              cmdW={cmdW}
              chainsW={chainsW}
              onSelect={onSelect}
              onActivate={onActivate}
            />
          ))}
        </scrollbox>
      )}
    </box>
  );
}

function TaskNavRow(props: {
  id: string;
  task: TaskDefinition;
  index: number;
  isSelected: boolean;
  focused: boolean;
  nameW: number;
  cmdW: number;
  chainsW: number;
  onSelect: (index: number) => void;
  onActivate: (index: number) => void;
}): React.ReactNode {
  const { id, task, index, isSelected, focused, nameW, cmdW, chainsW, onSelect, onActivate } = props;
  const { isHovered, hoverProps } = useHoverState();
  const bg = isSelected ? (focused ? "#1e3a8a" : "#1e2a4a") : isHovered ? HOVER_BG : undefined;
  const fg = isSelected ? "#ffffff" : "#e5e7eb";
  const lastClickRef = useRef(0);

  function handleClick(): void {
    const now = Date.now();
    if (now - lastClickRef.current < 400) {
      onActivate(index);
    } else {
      onSelect(index);
    }
    lastClickRef.current = now;
  }

  const cmd = commandLine(task.command, task.commandArgs);
  const chains = task.onSuccessTaskId || task.onFailureTaskId
    ? t("board.taskChainsFormat", { success: task.onSuccessTaskId ?? "-", failure: task.onFailureTaskId ?? "-" })
    : t("board.taskChainsNone");

  const name = task.name.length > nameW ? task.name.slice(0, nameW - 3) + "..." : task.name;
  const truncCmd = cmd.length > cmdW ? cmd.slice(0, cmdW - 3) + "..." : cmd;

  return (
    <box id={id} onMouseDown={handleClick} backgroundColor={bg} {...hoverProps}>
      <text fg={fg}>
        {isSelected ? "›" : " "} {fit(name, nameW)}  {fit(truncCmd, cmdW)}  {fit(chains, chainsW)}
      </text>
    </box>
  );
}

export function TaskInspector(props: { task: TaskDefinition | null; onCopy?: (text: string) => void }): React.ReactNode {
  const { task, onCopy } = props;
  if (!task) {
    return (
      <box title={t("board.inspectorTitle")} border style={{ backgroundColor: "#0b0b0b" }}>
        <text fg="#9ca3af">{t("board.inspectorEmpty")}</text>
      </box>
    );
  }

  const cmd = commandLine(task.command, task.commandArgs);
  const { isHovered, hoverProps } = useHoverState();

  return (
    <box title={t("board.inspectorTitle")} border style={{ flexDirection: "column", backgroundColor: "#0b0b0b" }}>
      <text><strong>{t("board.fieldId")}</strong> {task.id}</text>
      <text><strong>{t("board.taskLabelName")}</strong> {task.name}</text>
      <box style={{ flexDirection: "row" }}>
        <text><strong>{t("board.fieldCommand")}</strong> {cmd}</text>
        <box
          border
          borderColor={isHovered ? "#38bdf8" : "#374151"}
          onMouseDown={() => { copyToClipboard(cmd); onCopy?.(cmd); }}
          style={{ paddingLeft: 1, paddingRight: 1, marginLeft: 1, backgroundColor: isHovered ? HOVER_BG : "#0b0b0b" }}
          {...hoverProps}
        >
          <text fg={isHovered ? "#38bdf8" : "#6b7280"}>{"\u2398"}</text>
        </box>
      </box>
      <text><strong>{t("board.taskLabelOnSuccess")}</strong> {task.onSuccessTaskId ?? t("board.taskNone")}</text>
      <text><strong>{t("board.taskLabelOnFailure")}</strong> {task.onFailureTaskId ?? t("board.taskNone")}</text>
    </box>
  );
}

export function TaskActionButtons(props: {
  task: TaskDefinition | null;
  focused: boolean;
  selectedAction: number;
  selectable?: boolean;
  onAction: (action: string) => void;
}): React.ReactNode {
  const { task, focused, selectedAction, selectable = true, onAction } = props;

  if (!task) {
    return (
      <box border borderColor={focused ? "#38bdf8" : undefined} style={{ flexDirection: "row", height: 3, flexShrink: 0, backgroundColor: "#0b0b0b", justifyContent: "center", alignItems: "center" }}>
        <text fg="#9ca3af">{t("board.noActions")}</text>
      </box>
    );
  }

  const allActions = [
    { key: "select", label: t("board.taskActionSelect") },
    { key: "edit", label: t("board.taskActionEdit") },
    { key: "delete", label: t("board.taskActionDelete") },
  ];
  const actions = selectable ? allActions : allActions.filter((a) => a.key !== "select");

  return (
    <box border borderColor={focused ? "#38bdf8" : undefined} style={{ flexDirection: "row", height: 3, flexShrink: 0, paddingLeft: 1, backgroundColor: "#0b0b0b", alignItems: "center" }}>
      {actions.map((action, i) => (
        <TaskActionButton
          key={action.key}
          label={action.label}
          selected={focused && selectedAction === i}
          onMouseDown={() => onAction(action.key)}
        />
      ))}
    </box>
  );
}

function TaskActionButton(props: {
  label: string;
  selected: boolean;
  onMouseDown: () => void;
}): React.ReactNode {
  const { isHovered, hoverProps } = useHoverState();
  const bg = props.selected ? "#1e3a8a" : isHovered ? HOVER_BG : undefined;
  const fg = props.selected ? "#ffffff" : isHovered ? "#e5e7eb" : "#9ca3af";
  return (
    <box
      onMouseDown={props.onMouseDown}
      style={{ backgroundColor: bg, paddingLeft: 1, paddingRight: 1, marginRight: 1 }}
      {...hoverProps}
    >
      <text fg={fg}><strong>{props.label}</strong></text>
    </box>
  );
}
