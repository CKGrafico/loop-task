import React from "react";
import { Box, Text } from "ink";
import { darkTheme as theme } from "../theme.js";
import type { TabName } from "../types.js";

const TAB_DEFS: { key: TabName; label: string; color: string }[] = [
  { key: "loops", label: "Loops", color: theme.accent.loop },
  { key: "tasks", label: "Tasks", color: theme.accent.task },
  { key: "projects", label: "Projects", color: theme.accent.project },
];

export function tabColor(tab: TabName): string {
  return TAB_DEFS.find((t) => t.key === tab)?.color ?? theme.accent.brand;
}

export function TabBar(props: {
  activeTab: TabName;
  onTabChange: (tab: TabName) => void;
  counts?: Partial<Record<TabName, number>>;
  alerts?: Partial<Record<TabName, boolean>>;
}): React.ReactNode {
  const { activeTab, counts, alerts } = props;

  return (
    <Box gap={1}>
      {TAB_DEFS.map((tab) => {
        const isActive = tab.key === activeTab;
        const count = counts?.[tab.key];
        const label = count !== undefined ? `${tab.label} ${count}` : tab.label;
        return (
          <Box key={tab.key}>
            <Text
              color={isActive ? theme.text.inverse : theme.text.muted}
              backgroundColor={isActive ? tab.color : undefined}
              bold={isActive}
            >
              {` ${label} `}
            </Text>
            {alerts?.[tab.key] ? (
              <Text color={theme.semantic.danger}>{"●"}</Text>
            ) : null}
          </Box>
        );
      })}
    </Box>
  );
}
