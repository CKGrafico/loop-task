import { t } from "../../i18n/index.js";
import type { TaskPanelFocus } from "./TaskBrowser.js";

export function TaskFilterBar(props: {
  query: string;
  searchActive: boolean;
  focusedPanel: TaskPanelFocus;
}): React.ReactNode {
  const { query, searchActive, focusedPanel } = props;

  return (
    <box style={{ flexDirection: "row", height: 3, paddingLeft: 1, paddingRight: 1, backgroundColor: "#0b0b0b" }}>
      <box
        title={t("board.searchTitle")}
        border
        borderColor={focusedPanel === "search" ? "#38bdf8" : undefined}
        style={{ flexGrow: 1, height: 3, paddingLeft: 1, backgroundColor: focusedPanel === "search" ? "#1e2a4a" : "#0b0b0b" }}
      >
        {searchActive ? (
          <text fg={query ? "#e5e7eb" : "#6b7280"}>{query || t("board.searchPlaceholder")}▎</text>
        ) : (
          <text fg={query ? "#e5e7eb" : "#6b7280"}>
            {query || t("board.searchEmpty")}
          </text>
        )}
      </box>
    </box>
  );
}
