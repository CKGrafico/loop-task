import React from "react";
import { Box, Text } from "ink";
import type { View } from "../types.js";
import { darkTheme as theme } from "../theme.js";
import { t } from "../../i18n/index.js";

interface HelpEntry {
  key: string;
  desc: string;
}

function helpEntries(view: View): HelpEntry[] {
  switch (view) {
    case "board":
      return [
        { key: t("board.helpKeyMove"), desc: t("board.helpMoveSelection") },
        { key: t("board.helpKeyEnter"), desc: t("board.helpToggleDetail") },
        { key: t("board.helpKeyN"), desc: t("board.helpCreate") },
        { key: t("board.helpKeyE"), desc: t("board.helpEdit") },
        { key: t("board.helpKeyP"), desc: t("board.helpPauseResume") },
        { key: t("board.helpKeyX"), desc: t("board.helpForceRun") },
        { key: t("board.helpKeyD"), desc: t("board.helpDelete") },
        { key: t("board.helpKeySlash"), desc: t("board.helpSearch") },
        { key: t("board.helpKeyF"), desc: t("board.helpCycleFilter") },
        { key: t("board.helpKeyS"), desc: t("board.helpCycleSort") },
        { key: t("board.helpKeyLeftRight"), desc: t("board.helpSwitchPanel") },
        { key: t("board.helpKeyH"), desc: t("board.helpToggleHelp") },
        { key: t("board.helpKeyEsc"), desc: t("board.helpBack") },
        { key: t("board.helpKeyQ"), desc: t("board.helpQuit") },
      ];
    case "task-list":
      return [
        { key: t("board.helpKeyMove"), desc: t("board.helpMoveSelection") },
        { key: t("board.helpKeyEnter"), desc: t("board.taskActionSelect") },
        { key: t("board.helpKeyN"), desc: t("board.helpCreateTask") },
        { key: t("board.helpKeyE"), desc: t("board.taskActionEdit") },
        { key: t("board.helpKeyD"), desc: t("board.actionDelete") },
        { key: t("board.helpKeyH"), desc: t("board.helpToggleHelp") },
        { key: t("board.helpKeyEsc"), desc: t("board.helpBack") },
        { key: t("board.helpKeyQ"), desc: t("board.helpQuit") },
      ];
    case "projects":
      return [
        { key: t("board.helpKeyMove"), desc: t("board.helpMoveSelection") },
        { key: t("board.helpKeyEnter"), desc: t("project.editProjectLabel") },
        { key: t("board.helpKeyN"), desc: t("project.keyNewHint") },
        { key: t("board.helpKeyE"), desc: t("project.keyEditHint") },
        { key: t("board.helpKeyD"), desc: t("project.keyDeleteHint") },
        { key: t("board.helpKeyH"), desc: t("board.helpToggleHelp") },
        { key: t("board.helpKeyEsc"), desc: t("board.helpBack") },
        { key: t("board.helpKeyQ"), desc: t("board.helpQuit") },
      ];
    default:
      return [
        { key: t("board.hintKeyTab"), desc: t("board.hintNextField") },
        { key: t("board.helpKeyEnter"), desc: t("board.hintApply") },
        { key: t("board.helpKeyEsc"), desc: t("board.hintCancel") },
        { key: t("board.helpKeyQ"), desc: t("board.helpQuit") },
      ];
  }
}

export function HelpModal(props: { view: View }): React.ReactNode {
  const entries = helpEntries(props.view);

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      backgroundColor={theme.bg.elevated}
      padding={1}
    >
      <Box marginBottom={1}>
        <Text color={theme.accent.focus} bold>
          Shortcuts
        </Text>
      </Box>

      {entries.map((entry, i) => (
        <Box key={i}>
          <Text color={theme.accent.focus}>{entry.key.padEnd(16)}</Text>
          <Text color={theme.text.primary}>{entry.desc}</Text>
        </Box>
      ))}
    </Box>
  );
}
