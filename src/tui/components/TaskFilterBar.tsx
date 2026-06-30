import React from "react";
import { Box, Text } from "ink";
import { darkTheme as theme } from "../theme.js";
import { FocusableInput } from "./FocusableInput.js";
import { t } from "../../i18n/index.js";

interface TaskFilterBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  onSearchDismiss: () => void;
}

export function TaskFilterBar(props: TaskFilterBarProps): React.ReactNode {
  const { query, onQueryChange, onSearchDismiss } = props;

  return (
    <Box height={3}>
      <Box flexGrow={1}>
        <FocusableInput
          value={query}
          onChange={onQueryChange}
          onSubmit={onSearchDismiss}
          placeholder={t("board.searchPlaceholder")}
        />
      </Box>
      <Box paddingLeft={1} justifyContent="flex-end">
        <Text color={theme.text.muted}>{t("board.searchEmpty")}</Text>
      </Box>
    </Box>
  );
}
