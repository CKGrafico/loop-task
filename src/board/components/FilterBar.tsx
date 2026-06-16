import { t } from "../../i18n/index.js";
import { cycleSortMode, cycleStatusFilter, type Filters, type SortMode } from "../state.js";
import { useHoverState } from "../hooks/useHoverState.js";

const HOVER_BG = "#1e3a5f";

export function FilterBar(props: {
  filters: Filters;
  sort: SortMode;
  searchActive: boolean;
  onSearch: (query: string) => void;
  onStatusCycle: () => void;
  onSortCycle: () => void;
}): React.ReactNode {
  const { filters, sort, searchActive, onSearch, onStatusCycle, onSortCycle } = props;
  const statusHover = useHoverState();
  const sortHover = useHoverState();

  return (
    <box style={{ flexDirection: "row", height: 3, paddingLeft: 1, paddingRight: 1, backgroundColor: "#0b0b0b" }}>
      <box
        title={t("board.searchTitle")}
        border
        style={{ flexGrow: 2, height: 3, marginRight: 1, paddingLeft: 1, backgroundColor: "#0b0b0b" }}
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
      <box
        title={t("board.statusFilterTitle")}
        border
        onMouseDown={onStatusCycle}
        {...statusHover.hoverProps}
        style={{ flexGrow: 1, height: 3, marginRight: 1, paddingLeft: 1, backgroundColor: statusHover.isHovered ? HOVER_BG : "#0b0b0b" }}
      >
        <text fg="#38bdf8">{filters.status}</text>
      </box>
      <box
        title={t("board.sortTitle")}
        border
        onMouseDown={onSortCycle}
        {...sortHover.hoverProps}
        style={{ flexGrow: 1, height: 3, paddingLeft: 1, backgroundColor: sortHover.isHovered ? HOVER_BG : "#0b0b0b" }}
      >
        <text fg="#a3e635">{sort}</text>
      </box>
    </box>
  );
}
