import React from "react";
import { Box, Text } from "ink";
import { darkTheme as theme } from "../../shared/ui/theme.js";

export function TextField({
  value,
  hint,
  isActive,
}: {
  value: string;
  hint: string;
  isActive: boolean;
}): React.ReactNode {
  const borderColor = isActive ? theme.accent.brand : theme.border.dim;
  const backgroundColor = isActive ? theme.bg.input : undefined;
  const showHint = value.length === 0;

  return (
    <Box
      borderStyle="single"
      borderColor={borderColor}
      backgroundColor={backgroundColor}
      paddingLeft={1}
      overflow="hidden"
      width="100%"
    >
      <Text color={showHint ? theme.text.muted : theme.text.primary}>
        {showHint ? hint : value}
      </Text>
      {isActive ? <Text inverse> </Text> : null}
    </Box>
  );
}
