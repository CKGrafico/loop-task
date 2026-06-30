import React from "react";
import { Box, Text } from "ink";
import { darkTheme as theme } from "../theme.js";
import { Modal } from "./Modal.js";
import { t } from "../../i18n/index.js";

export function ContextHelpModal(props: {
  onClose: () => void;
}): React.ReactNode {
  return (
    <Modal title={t("context.helpTitle")} onClose={props.onClose} width={64}>
      <Box marginBottom={1}>
        <Text color={theme.text.primary}>{t("context.helpRules")}</Text>
      </Box>

      <Box marginBottom={1}>
        <Text color={theme.accent.brand}>{t("context.helpTemplates")}</Text>
      </Box>

      <Box marginBottom={1}>
        <Text color={theme.semantic.warning}>{t("context.helpCaveat")}</Text>
      </Box>

      <Box>
        <Text color={theme.text.secondary}>{t("context.helpJqTip")}</Text>
      </Box>
    </Modal>
  );
}
