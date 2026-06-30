import React from "react";
import { Box, Text } from "ink";
import { darkTheme as theme } from "../theme.js";
import type { TabName } from "../types.js";

const TAB_DEFS: { key: TabName; label: string }[] = [
  { key: "loops", label: "Loops" },
  { key: "tasks", label: "Tasks" },
  { key: "projects", label: "Projects" },
];

export function TabBar(props: {
  activeTab: TabName;
  onTabChange: (tab: TabName) => void;
}): React.ReactNode {
  const { activeTab } = props;

  return (
    <Box gap={1}>
      {TAB_DEFS.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <Box key={tab.key}>
            <Text
              color={isActive ? theme.text.inverse : theme.text.muted}
              backgroundColor={isActive ? theme.bg.active : undefined}
              bold={isActive}
            >
              {` ${tab.label} `}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}
