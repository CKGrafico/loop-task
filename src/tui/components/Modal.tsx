import React from "react";
import { Box, Text, useInput } from "ink";
import { darkTheme as theme } from "../theme.js";

export function Modal(props: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  width?: number | string;
}): React.ReactNode {
  useInput((_input, key) => {
    if (key.escape) {
      props.onClose();
    }
  });

  return (
    <Box
      position="absolute"
      top={0}
      left={0}
      width="100%"
      height="100%"
      justifyContent="center"
      alignItems="center"
    >
      <Box
        borderStyle="round"
        borderColor={theme.accent.focus}
        backgroundColor={theme.bg.elevated}
        paddingX={2}
        paddingY={1}
        flexDirection="column"
        width={props.width ?? "60%"}
      >
        <Text color={theme.accent.focus} bold>
          {props.title}
        </Text>
        <Box flexDirection="column" marginTop={1}>
          {props.children}
        </Box>
      </Box>
    </Box>
  );
}
