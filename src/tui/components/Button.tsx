import React from "react";
import { Box, Text } from "ink";
import { darkTheme as theme } from "../theme.js";

export function Button(props: {
  label: string;
  focused: boolean;
  onMouseDown?: () => void;
  variant?: "default" | "danger";
}): React.ReactNode {
  const { label, focused, variant = "default" } = props;
  const bgColor = focused
    ? variant === "danger"
      ? theme.semantic.danger
      : theme.bg.active
    : theme.bg.surface;
  const borderColor = focused
    ? variant === "danger"
      ? theme.semantic.danger
      : theme.accent.focus
    : theme.border.dim;
  const fgColor = focused ? theme.text.inverse : theme.text.primary;

  return (
    <Box
      borderStyle="single"
      borderColor={borderColor}
      backgroundColor={bgColor}
      paddingX={1}
      marginRight={1}
      >
      <Text color={fgColor} bold>{label}</Text>
    </Box>
  );
}
