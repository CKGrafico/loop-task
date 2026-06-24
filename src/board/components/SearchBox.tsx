import { t } from "../../i18n/index.js";

export function SearchBox(props: {
  query: string;
  searchActive: boolean;
  focused: boolean;
  onQueryChange: (value: string) => void;
  onActivate: () => void;
  onDismiss: () => void;
}): React.ReactNode {
  const { query, searchActive, focused, onQueryChange, onActivate, onDismiss } = props;

  return (
    <box
      title={t("board.searchTitle")}
      border
      borderColor={focused ? "#38bdf8" : undefined}
      style={{ width: "25%", height: 3, marginRight: 1, paddingLeft: 1, backgroundColor: focused ? "#1e2a4a" : "#0b0b0b" }}
    >
      {searchActive ? (
        <input
          focused={true}
          value={query}
          placeholder={t("board.searchPlaceholder")}
          onInput={(value: string) => onQueryChange(value)}
          onSubmit={() => onDismiss()}
        />
      ) : (
        <text
          fg={query ? "#e5e7eb" : "#6b7280"}
          onMouseDown={onActivate}
        >
          {query || t("board.searchEmpty")}
        </text>
      )}
    </box>
  );
}
