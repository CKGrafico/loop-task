import React from "react";
import { Box, Text } from "ink";
import { darkTheme as theme } from "../theme.js";
import { t } from "../../i18n/index.js";
import type { Filters, SortMode } from "../state.js";
import { FocusableButton } from "./FocusableButton.js";
import { FocusableInput } from "./FocusableInput.js";

interface FilterBarProps {
  filters: { query: string; status: string };
  sort: string;
  onStatusCycle: () => void;
  onSortCycle: () => void;
  onSelectProject?: () => void;
  currentProjectName?: string;
  onQueryChange: (value: string) => void;
  onSearchDismiss: () => void;
}

export function FilterBar(props: FilterBarProps): React.ReactNode {
  const {
    filters,
    sort,
    onStatusCycle,
    onSortCycle,
    onSelectProject,
    currentProjectName,
    onQueryChange,
    onSearchDismiss,
  } = props;

  const statusLabel = `${t("board.statusFilterTitle")} ${filters.status}`;
  const sortLabel = `${t("board.sortTitle")} ${sort}`;
  const projectLabel = currentProjectName ?? t("project.showAll");

  return (
    <Box flexDirection="column" height={3}>
      <Box>
        <Box width={currentProjectName ? 36 : 48}>
          <FocusableInput
            value={filters.query}
            onChange={onQueryChange}
            onSubmit={onSearchDismiss}
            placeholder={t("board.searchPlaceholder")}
          />
        </Box>

        {onSelectProject ? (
          <Box marginLeft={1}>
            <FocusableButton
              label={projectLabel}
              color={theme.accent.project}
              onPress={onSelectProject}
            />
          </Box>
        ) : null}

        <Box marginLeft={1}>
          <FocusableButton
            label={statusLabel}
            color={theme.accent.focus}
            onPress={onStatusCycle}
          />
        </Box>

        <Box marginLeft={1}>
          <FocusableButton
            label={sortLabel}
            color={theme.accent.focus}
            onPress={onSortCycle}
          />
        </Box>
      </Box>
      <Box>
        <Text color={theme.text.muted}>{t("board.searchPlaceholder")}</Text>
      </Box>
    </Box>
  );
}
