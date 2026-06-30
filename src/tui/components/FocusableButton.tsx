import React from "react";
import { Box, Text, useFocus, useInput } from "ink";
import { darkTheme as theme } from "../theme.js";

export function FocusableButton(props: {
  label: string;
  color: string;
  onPress?: () => void;
  variant?: "default" | "danger";
  bordered?: boolean;
}): React.ReactNode {
  const { label, color, onPress, variant = "default", bordered = true } = props;
  const { isFocused } = useFocus();

  useInput(
    (_input, key) => {
      if (key.return) {
        onPress?.();
      }
    },
    { isActive: isFocused },
  );

  const danger = variant === "danger";
  const borderColor = isFocused
    ? danger
      ? theme.semantic.danger
      : color
    : theme.border.dim;
  const backgroundColor = isFocused
    ? theme.bg.active
    : undefined;
  const textColor = isFocused ? theme.text.inverse : theme.text.primary;

  return (
    <Box
      {...(bordered ? { borderStyle: "single" as const, borderColor } : {})}
      backgroundColor={backgroundColor}
      paddingX={1}
      marginRight={1}
      flexShrink={0}
    >
      <Text color={textColor} bold>{label}</Text>
    </Box>
  );
}
