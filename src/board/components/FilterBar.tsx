import { t } from "../../i18n/index.js";
import type { Filters, SortMode } from "../state.js";
import { useHoverState } from "../hooks/useHoverState.js";
import { HOVER_BG } from "../../config/constants.js";
import { SearchBox } from "./SearchBox.js";

export function FilterBar(props: {
  filters: Filters;
  sort: SortMode;
  searchActive: boolean;
  focusedPanel: string;
  onStatusCycle: () => void;
  onSortCycle: () => void;
  onSelectProject?: () => void;
  currentProjectName?: string;
  onQueryChange: (value: string) => void;
  onSearchActivate: () => void;
  onSearchDismiss: () => void;
}): React.ReactNode {
  const { filters, sort, searchActive, focusedPanel, onStatusCycle, onSortCycle, onSelectProject, currentProjectName, onQueryChange, onSearchActivate, onSearchDismiss } = props;

  const statusDisplay = filters.status === "waiting" ? "waiting" : filters.status;

  return (
    <box style={{ flexDirection: "row", height: 3, paddingLeft: 1, paddingRight: 1, backgroundColor: "#0b0b0b" }}>
      <SearchBox
        query={filters.query}
        searchActive={searchActive}
        focused={focusedPanel === "search"}
        onQueryChange={onQueryChange}
        onActivate={onSearchActivate}
        onDismiss={onSearchDismiss}
      />
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
        title={t("board.sortTitle")}
        text={sort}
        textColor="#a3e635"
        focused={focusedPanel === "sort"}
        onMouseDown={onSortCycle}
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
