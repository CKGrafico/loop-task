import { t } from "../../i18n/index.js";
import type { Filters, SortMode } from "../state.js";
import { useHoverState } from "../hooks/useHoverState.js";
import { HOVER_BG } from "../../config/constants.js";

export function FilterBar(props: {
  filters: Filters;
  sort: SortMode;
  searchActive: boolean;
  focusedPanel: string;
  onStatusCycle: () => void;
  onSortCycle: () => void;
  onViewTasks: () => void;
  onNewLoop: () => void;
  onManageProjects?: () => void;
  onSelectProject?: () => void;
  currentProjectName?: string;
}): React.ReactNode {
  const { filters, sort, searchActive, focusedPanel, onStatusCycle, onSortCycle, onViewTasks, onNewLoop, onManageProjects, onSelectProject, currentProjectName } = props;

  const statusDisplay = filters.status === "waiting" ? "waiting" : filters.status;

  return (
    <box style={{ flexDirection: "row", height: 3, paddingLeft: 1, paddingRight: 1, backgroundColor: "#0b0b0b" }}>
      <box
        title={t("board.searchTitle")}
        border
        borderColor={focusedPanel === "search" ? "#38bdf8" : undefined}
        style={{ width: "25%", height: 3, marginRight: 1, paddingLeft: 1, backgroundColor: focusedPanel === "search" ? "#1e2a4a" : "#0b0b0b" }}
      >
        {searchActive ? (
          <text fg={filters.query ? "#e5e7eb" : "#6b7280"}>{filters.query || t("board.searchPlaceholder")}▎</text>
        ) : (
          <text fg={filters.query ? "#e5e7eb" : "#6b7280"}>
            {filters.query || t("board.searchEmpty")}
          </text>
        )}
      </box>
      {onSelectProject ? (
        <ClickableBadge
          title={t("project.filterTitle")}
          text={currentProjectName ?? "Default"}
          textColor="#f59e0b"
          focused={focusedPanel === "project-filter"}
          onMouseDown={onSelectProject}
          marginRight={1}
        />
      ) : null}
      <ClickableBadge
        title={t("board.statusFilterTitle")}
        text={statusDisplay}
        textColor="#38bdf8"
        focused={focusedPanel === "status"}
        onMouseDown={onStatusCycle}
        marginRight={1}
      />
      <ClickableBadge
        text={sort}
        textColor="#a3e635"
        focused={focusedPanel === "sort"}
        onMouseDown={onSortCycle}
        marginRight={1}
      />
      <ClickableBadge
        text={t("board.viewTasksLabel")}
        textColor="#a78bfa"
        focused={focusedPanel === "tasks"}
        onMouseDown={onViewTasks}
        marginRight={1}
      />
      {onManageProjects ? (
        <ClickableBadge
          text={t("project.manageLabel")}
          textColor="#34d399"
          focused={focusedPanel === "projects"}
          onMouseDown={onManageProjects}
          marginRight={1}
        />
      ) : null}
      <ClickableBadge
        text={t("board.newLoopLabel")}
        textColor="#4ade80"
        focused={focusedPanel === "new"}
        onMouseDown={onNewLoop}
      />
    </box>
  );
}

function ClickableBadge(props: {
  title?: string;
  text: string;
  textColor: string;
  focused: boolean;
  onMouseDown: () => void;
  marginRight?: number;
}): React.ReactNode {
  const { isHovered, hoverProps } = useHoverState();
  const bg = props.focused ? "#1e2a4a" : isHovered ? HOVER_BG : "#0b0b0b";
  const borderColor = props.focused ? "#38bdf8" : undefined;
  const titleProp = props.title ? { title: props.title } : {};
  return (
    <box
      {...titleProp}
      border
      borderColor={borderColor}
      onMouseDown={props.onMouseDown}
      style={{ flexGrow: 1, height: 3, marginRight: props.marginRight, paddingLeft: 1, backgroundColor: bg }}
      {...hoverProps}
    >
      <text fg={props.textColor}>{props.text}</text>
    </box>
  );
}
