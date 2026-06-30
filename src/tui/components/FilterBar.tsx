import React from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import { darkTheme as theme } from "../theme.js";
import { t } from "../../i18n/index.js";
import type { Filters, SortMode } from "../state.js";

interface FilterBarProps {
  filters: { query: string; status: string };
  sort: string;
  searchActive: boolean;
  onStatusCycle: () => void;
  onSortCycle: () => void;
  onSelectProject?: () => void;
  currentProjectName?: string;
  onQueryChange: (value: string) => void;
  onSearchActivate: () => void;
  onSearchDismiss: () => void;
}

export function FilterBar(props: FilterBarProps): React.ReactNode {
  const {
    filters,
    sort,
    searchActive,
    onStatusCycle,
    onSortCycle,
    onSelectProject,
    currentProjectName,
    onQueryChange,
    onSearchActivate,
    onSearchDismiss,
  } = props;

  return (
    <Box flexDirection="column" height={3}>
      <Box>
        <Box
          borderStyle="single"
          borderColor={searchActive ? theme.accent.focus : theme.border.dim}
          backgroundColor={theme.bg.input}
          paddingX={1}
          width={currentProjectName ? 36 : 48}
        >
          {searchActive ? (
            <TextInput
              value={filters.query}
              onChange={onQueryChange}
              placeholder={t("board.searchPlaceholder")}
            />
          ) : (
            <Text color={theme.text.muted}>
              {filters.query || t("board.searchEmpty")}
            </Text>
          )}
        </Box>

        {onSelectProject ? (
          <Box
            borderStyle="single"
            borderColor={theme.accent.project}
            backgroundColor={theme.bg.surface}
            paddingX={1}
            marginLeft={1}
          >
            <Text color={theme.accent.project} bold>
              {currentProjectName ?? t("project.showAll")}
            </Text>
          </Box>
        ) : null}

        <Box
          borderStyle="single"
          borderColor={theme.border.dim}
          backgroundColor={theme.bg.surface}
          paddingX={1}
          marginLeft={1}
        >
          <Text color={theme.text.secondary} bold>
            {t("board.statusFilterTitle")}
          </Text>
          <Text color={theme.text.primary}> {filters.status}</Text>
        </Box>

        <Box
          borderStyle="single"
          borderColor={theme.border.dim}
          backgroundColor={theme.bg.surface}
          paddingX={1}
          marginLeft={1}
          >
          <Text color={theme.text.secondary} bold>
            {t("board.sortTitle")}
          </Text>
          <Text color={theme.text.primary}> {sort}</Text>
        </Box>
      </Box>
      <Box>
        {searchActive && (
          <Text color={theme.text.muted}>{t("board.searchPlaceholder")}</Text>
        )}
      </Box>
    </Box>
  );
}
