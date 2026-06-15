import { t } from "../../i18n/index.js";
import type { Filters, SortMode } from "../state.js";

export function FilterBar(props: {
  filters: Filters;
  sort: SortMode;
  searchActive: boolean;
  onSearch: (query: string) => void;
}): React.ReactNode {
  const { filters, sort, searchActive, onSearch } = props;

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
      <box title={t("board.statusFilterTitle")} border style={{ flexGrow: 1, height: 3, marginRight: 1, paddingLeft: 1, backgroundColor: "#0b0b0b" }}>
        <text fg="#38bdf8">{filters.status}</text>
      </box>
      <box title={t("board.sortTitle")} border style={{ flexGrow: 1, height: 3, paddingLeft: 1, backgroundColor: "#0b0b0b" }}>
        <text fg="#a3e635">{sort}</text>
      </box>
    </box>
  );
}
