import React from "react";
import { Box } from "ink";
import { darkTheme as theme } from "../theme.js";
import { Modal } from "./Modal.js";
import { FocusableButton } from "./FocusableButton.js";
import { t } from "../../i18n/index.js";

export function ConfirmModal(props: {
  message: string;
  onYes: () => void;
  onNo: () => void;
}): React.ReactNode {
  return (
    <Modal title={props.message} onClose={props.onNo} width="50%">
      <Box flexDirection="row" marginTop={1}>
        <FocusableButton
          label={t("board.yes")}
          color={theme.accent.focus}
          onPress={props.onYes}
        />
        <FocusableButton
          label={t("board.no")}
          color={theme.semantic.danger}
          onPress={props.onNo}
          variant="danger"
        />
      </Box>
    </Modal>
  );
}
