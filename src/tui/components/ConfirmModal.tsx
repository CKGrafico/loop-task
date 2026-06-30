import React from "react";
import { Box, Text } from "ink";
import { darkTheme as theme } from "../theme.js";
import { t } from "../../i18n/index.js";

export function ConfirmModal(props: {
  message: string;
  choice: number;
  onYes: () => void;
  onNo: () => void;
}): React.ReactNode {
  const yesFocused = props.choice === 0;
  const noFocused = props.choice === 1;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.accent.focus}
      backgroundColor={theme.bg.elevated}
      padding={1}
    >
      <Box marginBottom={1}>
        <Text color={theme.text.primary}>{props.message}</Text>
      </Box>

      <Box>
        <Box
          borderStyle="single"
          borderColor={yesFocused ? theme.accent.focus : theme.border.dim}
          backgroundColor={yesFocused ? theme.bg.active : theme.bg.surface}
          paddingX={2}
          >
          <Text color={yesFocused ? theme.text.inverse : theme.text.primary} bold>
            {t("board.yes")}
          </Text>
        </Box>

        <Box
          borderStyle="single"
          borderColor={noFocused ? theme.semantic.danger : theme.border.dim}
          backgroundColor={noFocused ? theme.semantic.danger : theme.bg.surface}
          paddingX={2}
          marginLeft={1}
          >
          <Text color={noFocused ? theme.text.inverse : theme.text.primary} bold>
            {t("board.no")}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
