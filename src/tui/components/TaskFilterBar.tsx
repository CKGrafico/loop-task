import React from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import { darkTheme as theme } from "../theme.js";
import { t } from "../../i18n/index.js";

interface TaskFilterBarProps {
  query: string;
  searchActive: boolean;
  onQueryChange: (value: string) => void;
  onSearchActivate: () => void;
  onSearchDismiss: () => void;
}

export function TaskFilterBar(props: TaskFilterBarProps): React.ReactNode {
  const { query, searchActive, onQueryChange, onSearchActivate, onSearchDismiss } = props;

  return (
    <Box height={3}>
      <Box
        borderStyle="single"
        borderColor={searchActive ? theme.accent.focus : theme.border.dim}
        backgroundColor={theme.bg.input}
        paddingX={1}
      >
        {searchActive ? (
          <TextInput
            value={query}
            onChange={onQueryChange}
            onSubmit={onSearchDismiss}
            placeholder={t("board.searchPlaceholder")}
          />
        ) : (
          <Text
            color={query ? theme.text.primary : theme.text.muted}
            >
            {query || t("board.searchEmpty")}
          </Text>
        )}
      </Box>
    </Box>
  );
}
