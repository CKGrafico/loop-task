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
    : undefined;
  const fgColor = focused
    ? theme.text.inverse
    : variant === "danger"
      ? theme.semantic.danger
      : theme.text.primary;
  const indicator = focused ? "› " : "  ";

  return (
    <Box backgroundColor={bgColor} paddingX={1} marginRight={1} flexShrink={0}>
      <Text color={fgColor} bold>{indicator + label}</Text>
    </Box>
  );
}
