import { t } from "../../i18n/index.js";
import type { Filters, SortMode } from "../state.js";
import { useHoverState } from "../hooks/useHoverState.js";
import { HOVER_BG } from "../../config/constants.js";

export function FilterBar(props: {
  filters: Filters;
  sort: SortMode;
  searchActive: boolean;
  focusedPanel: string;
  onSearch: (query: string) => void;
  onStatusCycle: () => void;
  onSortCycle: () => void;
  onNewLoop: () => void;
}): React.ReactNode {
  const { filters, sort, searchActive, focusedPanel, onSearch, onStatusCycle, onSortCycle, onNewLoop } = props;

  const statusDisplay = filters.status === "waiting" ? "waiting" : filters.status;

  return (
    <box style={{ flexDirection: "row", height: 3, paddingLeft: 1, paddingRight: 1, backgroundColor: "#0b0b0b" }}>
      <box
        title={t("board.searchTitle")}
        border
        borderColor={focusedPanel === "search" ? "#38bdf8" : undefined}
        style={{ flexGrow: 2, height: 3, marginRight: 1, paddingLeft: 1, backgroundColor: focusedPanel === "search" ? "#1e2a4a" : "#0b0b0b" }}
      >
        {searchActive ? (
          <input
            focused
            placeholder={t("board.searchPlaceholder")}
            onInput={onSearch}
          />
        ) : (
          <text fg={filters.query ? "#e5e7eb" : "#6b7280"}>
            {filters.query || t("board.searchEmpty")}
          </text>
        )}
      </box>
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
        marginRight={1}
      />
      <ClickableBadge
        title={t("board.newLoopTitle")}
        text={t("board.newLoopLabel")}
        textColor="#4ade80"
        focused={focusedPanel === "new"}
        onMouseDown={onNewLoop}
        narrow
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
