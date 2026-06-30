import React from "react";
import { Box } from "ink";
import type { LoopMeta, RunRecord } from "../../types.js";
import { darkTheme as theme, tabAccentColor } from "../theme.js";
import type { TabName } from "../types.js";
import { Inspector } from "./Inspector.js";
import { RunHistory } from "./RunHistory.js";

export function RightPanel(props: {
  isFocused: boolean;
  activeTab: TabName;
  loop: LoopMeta | null;
  selectedRunIndex: number;
  onSelectRun: (index: number) => void;
  onOpenRun: (run: RunRecord) => void;
}): React.ReactNode {
  const { isFocused, activeTab, loop, selectedRunIndex, onSelectRun, onOpenRun } = props;
  const borderColor = isFocused ? tabAccentColor(activeTab) : theme.border.default;

  return (
    <Box
      flexDirection="column"
      width="40%"
      borderStyle="single"
      borderColor={borderColor}
    >
      <Inspector loop={loop} />
      <RunHistory
        loop={loop}
        selectedRunIndex={selectedRunIndex}
        onSelectRun={onSelectRun}
        onOpenRun={onOpenRun}
        isFocused={isFocused}
      />
    </Box>
  );
}
