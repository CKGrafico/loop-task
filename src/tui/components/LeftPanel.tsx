import React from "react";
import { Box, Text } from "ink";
import type { LoopMeta, TaskDefinition, Project } from "../../types.js";
import type { TabName } from "../types.js";
import type { Filters, SortMode } from "../state.js";
import { darkTheme as theme, tabAccentColor } from "../theme.js";
import { t } from "../../i18n/index.js";
import { Navigator } from "./Navigator.js";
import { TaskNavigator } from "./TaskBrowser.js";

export function LeftPanel(props: {
  isFocused: boolean;
  activeTab: TabName;
  query: string;
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
  // Optional filter bar controls (for loops tab)
  onStatusCycle?: () => void;
  onSortCycle?: () => void;
  onSelectProject?: () => void;
  currentProjectName?: string;
}): React.ReactNode {
  const {
    isFocused,
    activeTab,
    query,
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
    currentProjectName,
  } = props;

  const accentColor = tabAccentColor(activeTab);
  const borderColor = isFocused ? accentColor : theme.border.default;
  const hasFilter = query.length > 0;

  return (
    <Box
      flexDirection="column"
      width="60%"
      flexShrink={0}
      borderStyle="single"
      borderColor={borderColor}
    >
      {/* Filter status labels - shows active filter state */}
      <Box paddingLeft={1} gap={1}>
        {hasFilter ? (
          <Text color={accentColor}>
            filter: {query}
          </Text>
        ) : null}
        {activeTab === "loops" ? (
          <>
            {currentProjectName != null ? (
              <Text color={theme.text.muted}>
                [project: {currentProjectName}]
              </Text>
            ) : null}
            <Text color={theme.text.muted}>
              [status: {filters.status}]
            </Text>
            <Text color={theme.text.muted}>
              [sort: {sort}]
            </Text>
          </>
        ) : null}
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
          isFocused={isFocused}
        />
      ) : activeTab === "tasks" ? (
        <TaskNavigator
          visible={tasks}
          total={tasks.length}
          selectedIndex={taskSelectedIndex}
          query={query}
          onSelect={onTaskSelect}
          onActivate={onTaskActivate}
          isFocused={isFocused}
        />
      ) : (
        <Box paddingLeft={1}>
          <Text color={theme.text.muted}>Projects tab</Text>
        </Box>
      )}
    </Box>
  );
}
