import React from "react";
import { Box, Text, useFocus } from "ink";
import TextInput from "ink-text-input";
import { darkTheme as theme } from "../theme.js";

export interface FocusableInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSubmit?: (value: string) => void;
}

export function FocusableInput(props: FocusableInputProps): React.ReactNode {
  const { value, onChange, onSubmit } = props;
  const placeholder = props.placeholder ?? "type here...";
  const { isFocused } = useFocus();

  const borderColor = isFocused ? theme.accent.focus : theme.border.dim;
  const backgroundColor = isFocused ? theme.bg.input : undefined;

  return (
    <Box
      borderStyle="single"
      borderColor={borderColor}
      backgroundColor={backgroundColor}
      paddingLeft={1}
    >
      <TextInput
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        showCursor
        focus={isFocused}
        onSubmit={onSubmit}
      />
    </Box>
  );
}
