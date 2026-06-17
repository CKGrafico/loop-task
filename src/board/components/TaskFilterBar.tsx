import { t } from "../../i18n/index.js";
import type { TaskPanelFocus } from "./TaskBrowser.js";
import { useHoverState } from "../hooks/useHoverState.js";
import { HOVER_BG } from "../../config/constants.js";

export function TaskFilterBar(props: {
  query: string;
  searchActive: boolean;
  focusedPanel: TaskPanelFocus;
  onNewTask: () => void;
  showViewLoops?: boolean;
  onViewLoops?: () => void;
}): React.ReactNode {
  const { query, searchActive, focusedPanel, onNewTask, showViewLoops, onViewLoops } = props;

  return (
    <box style={{ flexDirection: "row", height: 3, paddingLeft: 1, paddingRight: 1, backgroundColor: "#0b0b0b" }}>
      <box
        title={t("board.searchTitle")}
        border
        borderColor={focusedPanel === "search" ? "#38bdf8" : undefined}
        style={{ flexGrow: 2, height: 3, marginRight: 1, paddingLeft: 1, backgroundColor: focusedPanel === "search" ? "#1e2a4a" : "#0b0b0b" }}
      >
        {searchActive ? (
          <text fg={query ? "#e5e7eb" : "#6b7280"}>{query || t("board.searchPlaceholder")}▎</text>
        ) : (
          <text fg={query ? "#e5e7eb" : "#6b7280"}>
            {query || t("board.searchEmpty")}
          </text>
        )}
      </box>
      {showViewLoops ? (
        <ClickableBadge
          title={t("board.viewLoopsTitle")}
          text={t("board.viewLoopsLabel")}
          textColor="#4ade80"
          focused={false}
          onMouseDown={onViewLoops ?? (() => {})}
          marginRight={1}
          narrow
        />
      ) : null}
      <ClickableBadge
        title={t("board.newTaskTitle")}
        text={t("board.taskActionNew")}
        textColor="#a78bfa"
        focused={focusedPanel === "new"}
        onMouseDown={onNewTask}
      />
    </box>
  );
}

function ClickableBadge(props: {
  title: string;
  text: string;
  textColor: string;
  focused: boolean;
  onMouseDown: () => void;
  marginRight?: number;
  narrow?: boolean;
}): React.ReactNode {
  const { isHovered, hoverProps } = useHoverState();
  const bg = props.focused ? "#1e2a4a" : isHovered ? HOVER_BG : "#0b0b0b";
  const borderColor = props.focused ? "#38bdf8" : undefined;
  return (
    <box
      title={props.title}
      border
      borderColor={borderColor}
      onMouseDown={props.onMouseDown}
      style={{ flexGrow: props.narrow ? 0 : 1, height: 3, marginRight: props.marginRight, paddingLeft: 1, backgroundColor: bg }}
      {...hoverProps}
    >
      <text fg={props.textColor}>{props.text}</text>
    </box>
  );
}
