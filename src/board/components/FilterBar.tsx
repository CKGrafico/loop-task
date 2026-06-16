import { t } from "../../i18n/index.js";
import type { Filters, SortMode } from "../state.js";
import { useHoverState } from "../hooks/useHoverState.js";
import { HOVER_BG } from "../../config/constants.js";

export function FilterBar(props: {
  filters: Filters;
  sort: SortMode;
  searchActive: boolean;
  onSearch: (query: string) => void;
  onStatusCycle: () => void;
  onSortCycle: () => void;
}): React.ReactNode {
  const { filters, sort, searchActive, onSearch, onStatusCycle, onSortCycle } = props;

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
      <ClickableBadge
        title={t("board.statusFilterTitle")}
        text={filters.status}
        textColor="#38bdf8"
        onMouseDown={onStatusCycle}
        marginRight={1}
      />
      <ClickableBadge
        title={t("board.sortTitle")}
        text={sort}
        textColor="#a3e635"
        onMouseDown={onSortCycle}
      />
    </box>
  );
}

function ClickableBadge(props: {
  title: string;
  text: string;
  textColor: string;
  onMouseDown: () => void;
  marginRight?: number;
}): React.ReactNode {
  const { isHovered, hoverProps } = useHoverState();
  return (
    <box
      title={props.title}
      border
      onMouseDown={props.onMouseDown}
      style={{ flexGrow: 1, height: 3, marginRight: props.marginRight, paddingLeft: 1, backgroundColor: isHovered ? HOVER_BG : "#0b0b0b" }}
      {...hoverProps}
    >
      <text fg={props.textColor}>{props.text}</text>
    </box>
  );
}
