import React from "react";
import { Box } from "ink";
import type { LoopMeta, RunRecord } from "../../types.js";
import { darkTheme as theme } from "../theme.js";
import { Inspector } from "./Inspector.js";
import { RunHistory } from "./RunHistory.js";

export function RightPanel(props: {
  isFocused: boolean;
  loop: LoopMeta | null;
  selectedRunIndex: number;
  onSelectRun: (index: number) => void;
  onOpenRun: (run: RunRecord) => void;
}): React.ReactNode {
  const { isFocused, loop, selectedRunIndex, onSelectRun, onOpenRun } = props;
  const borderColor = isFocused ? theme.accent.focus : theme.border.default;

  return (
    <Box
      flexDirection="column"
      flexGrow={1}
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
