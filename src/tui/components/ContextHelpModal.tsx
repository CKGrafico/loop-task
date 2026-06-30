import React from "react";
import { Box, Text, useInput } from "ink";
import { darkTheme as theme } from "../theme.js";
import { t } from "../../i18n/index.js";

export function ContextHelpModal(props: {
  onClose: () => void;
}): React.ReactNode {
  useInput(() => {
    props.onClose();
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.accent.task}
      backgroundColor={theme.bg.elevated}
      padding={1}
      width={64}
    >
      <Box marginBottom={1}>
        <Text color={theme.accent.task} bold>
          {t("context.helpTitle")}
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text color={theme.text.primary}>{t("context.helpRules")}</Text>
      </Box>

      <Box marginBottom={1}>
        <Text color={theme.accent.focus}>{t("context.helpTemplates")}</Text>
      </Box>

      <Box marginBottom={1}>
        <Text color={theme.semantic.warning}>{t("context.helpCaveat")}</Text>
      </Box>

      <Box>
        <Text color={theme.text.secondary}>{t("context.helpJqTip")}</Text>
      </Box>
    </Box>
  );
}
