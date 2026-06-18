import type { LoopMeta, LoopStatus } from "../../types.js";
import { t } from "../../i18n/index.js";
import { useHoverState } from "../hooks/useHoverState.js";
import { HOVER_BG } from "../../config/constants.js";

export interface ActionDef {
  key: string;
  label: string;
}

export function getActions(status: LoopStatus): ActionDef[] {
  const actions: ActionDef[] = [
    { key: "edit", label: t("board.actionEdit") },
    { key: "delete", label: t("board.actionDelete") },
  ];
  if (status === "waiting") {
    actions.push({ key: "pause", label: t("board.actionPause") });
    actions.push({ key: "stop", label: t("board.actionStop") });
  } else if (status === "paused") {
    actions.push({ key: "stop", label: t("board.actionStop") });
    actions.push({ key: "play", label: t("board.actionPlay") });
  } else if (status === "idle" || status === "stopped") {
    actions.push({ key: "play", label: t("board.actionPlay") });
  }
  if (status !== "running") {
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

  if (!loop) {
    return (
      <box border borderColor={focused ? "#38bdf8" : undefined} style={{ flexDirection: "row", height: 3, flexShrink: 0, backgroundColor: "#0b0b0b", justifyContent: "center", alignItems: "center" }}>
        <text fg="#9ca3af">{t("board.noActions")}</text>
      </box>
    );
  }

  const actions = getActions(loop.status);

  return (
    <box border borderColor={focused ? "#38bdf8" : undefined} style={{ flexDirection: "row", height: 3, flexShrink: 0, paddingLeft: 1, backgroundColor: "#0b0b0b", alignItems: "center" }}>
      {actions.map((action, i) => (
        <ActionButton
          key={action.key}
          label={action.label}
          selected={focused && selectedAction === i}
          onMouseDown={() => onAction(action.key)}
        />
      ))}
    </box>
  );
}

function ActionButton(props: {
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
