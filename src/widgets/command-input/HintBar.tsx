import React from "react";
import { Box, Text } from "ink";
import { darkTheme as theme } from "../../shared/ui/theme.js";

export function HintBar({
  leftHint,
  rightHint,
}: {
  leftHint: React.ReactNode;
  rightHint: React.ReactNode;
}): React.ReactNode {
  return (
    <Box justifyContent="space-between" paddingX={1}>
      <Box>{leftHint}</Box>
      <Box>{rightHint}</Box>
    </Box>
  );
}

export function KeyHint({ keyLabel, action }: { keyLabel: string; action: string }): React.ReactNode {
  return (
    <Box marginRight={2}>
      <Text bold color={theme.text.primary}>{keyLabel}</Text>
      <Text color={theme.text.muted}>{" " + action}</Text>
    </Box>
  );
}
