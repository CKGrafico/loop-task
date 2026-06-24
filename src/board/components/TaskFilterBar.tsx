import { t } from "../../i18n/index.js";
import type { TaskPanelFocus } from "./TaskBrowser.js";
import { SearchBox } from "./SearchBox.js";

export function TaskFilterBar(props: {
  query: string;
  searchActive: boolean;
  focusedPanel: TaskPanelFocus;
  onQueryChange: (value: string) => void;
  onSearchActivate: () => void;
  onSearchDismiss: () => void;
}): React.ReactNode {
  const { query, searchActive, focusedPanel, onQueryChange, onSearchActivate, onSearchDismiss } = props;

  return (
    <box style={{ flexDirection: "row", height: 3, paddingLeft: 1, paddingRight: 1, backgroundColor: "#0b0b0b" }}>
      <box
        style={{ flexGrow: 1 }}
      >
        <SearchBox
          query={query}
          searchActive={searchActive}
          focused={focusedPanel === "search"}
          onQueryChange={onQueryChange}
          onActivate={onSearchActivate}
          onDismiss={onSearchDismiss}
        />
      </box>
    </box>
  );
}
