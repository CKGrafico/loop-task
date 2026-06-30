import React from "react";
import { Box, Text } from "ink";
import type { LoopMeta, TaskDefinition, Project } from "../../types.js";
import type { TabName } from "../types.js";
import type { Filters, SortMode } from "../state.js";
import { darkTheme as theme } from "../theme.js";
import { t } from "../../i18n/index.js";
import { FocusableInput } from "./FocusableInput.js";
import { Navigator } from "./Navigator.js";
import { TaskNavigator } from "./TaskBrowser.js";

export function LeftPanel(props: {
  isFocused: boolean;
  activeTab: TabName;
  query: string;
  onQueryChange: (value: string) => void;
  // Loop list props
  loops: LoopMeta[];
  selectedIndex: number;
  filters: Filters;
  sort: SortMode;
  breakpoint: string;
  projects: Project[];
  onSelect: (index: number) => void;
  onActivate: (index: number) => void;
  // Task list props
  tasks: TaskDefinition[];
  taskSelectedIndex: number;
  onTaskSelect: (index: number) => void;
  onTaskActivate: (index: number) => void;
}): React.ReactNode {
  const {
    isFocused,
    activeTab,
    query,
    onQueryChange,
    loops,
    selectedIndex,
    filters,
    sort,
    breakpoint,
    projects,
    onSelect,
    onActivate,
    tasks,
    taskSelectedIndex,
    onTaskSelect,
    onTaskActivate,
  } = props;

  const borderColor = isFocused ? theme.accent.focus : theme.border.default;

  return (
    <Box
      flexDirection="column"
      width="40%"
      borderStyle="single"
      borderColor={borderColor}
    >
      {/* Inline filter input */}
      <Box height={3}>
        <FocusableInput
          value={query}
          onChange={onQueryChange}
          placeholder={t("board.searchPlaceholder")}
        />
      </Box>

      {/* Content area based on active tab */}
      {activeTab === "loops" ? (
        <Navigator
          visible={loops}
          total={loops.length}
          selectedIndex={selectedIndex}
          filters={{ status: filters.status }}
          sort={sort}
          breakpoint={breakpoint}
          projects={projects}
          onSelect={onSelect}
          onActivate={onActivate}
          // isFocused will be added in task 4.2
          {...({ isFocused } as Record<string, unknown>)}
        />
      ) : activeTab === "tasks" ? (
        <TaskNavigator
          visible={tasks}
          total={tasks.length}
          selectedIndex={taskSelectedIndex}
          query={query}
          onSelect={onTaskSelect}
          onActivate={onTaskActivate}
          // isFocused will be added in task 4.3
          {...({ isFocused } as Record<string, unknown>)}
        />
      ) : (
        <Box paddingLeft={1}>
          <Text color={theme.text.muted}>Projects tab</Text>
        </Box>
      )}
    </Box>
  );
}
