import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { darkTheme as theme } from "../theme.js";
import { t } from "../../i18n/index.js";
import { EXPORT_MAX_PREVIEW_LINES } from "../../config/constants.js";
import { copyToClipboard } from "../../shared/clipboard.js";

interface ExportModalProps {
  json: string;
  filePath: string | null;
  error: string | null;
  onClose: () => void;
  onCopy?: () => void;
}

const VISIBLE_LINES = 20;

export function ExportModal(props: ExportModalProps): React.ReactNode {
  const lines = props.json.split("\n");
  const totalLines = lines.length;
  const truncated = totalLines > EXPORT_MAX_PREVIEW_LINES;
  const displayLines = truncated ? lines.slice(0, EXPORT_MAX_PREVIEW_LINES) : lines;
  const maxScroll = Math.max(0, displayLines.length - VISIBLE_LINES);
  const [scrollOffset, setScrollOffset] = useState(0);

  useInput((input, key) => {
    if (key.escape) { props.onClose(); return; }
    if (key.downArrow) { setScrollOffset((o) => Math.min(o + 1, maxScroll)); return; }
    if (key.upArrow) { setScrollOffset((o) => Math.max(0, o - 1)); return; }
    if (input === "c" && !key.ctrl) { copyToClipboard(props.json); props.onCopy?.(); return; }
  });

  const visible = displayLines.slice(scrollOffset, scrollOffset + VISIBLE_LINES);

  return (
    <Box
      position="absolute"
      top={0}
      left={0}
      width="100%"
      height="100%"
      flexDirection="column"
      backgroundColor={theme.bg.elevated}
      borderStyle="round"
      borderColor={theme.accent.brand}
      paddingX={2}
      paddingY={1}
    >
      <Box marginBottom={1}>
        <Text color={theme.accent.brand} bold>{t("export.modalTitle")}</Text>
      </Box>

      {props.error ? (
        <Box flexGrow={1}>
          <Text color={theme.semantic.danger}>{t("export.error", { message: props.error })}</Text>
        </Box>
      ) : (
        <>
          {props.filePath ? (
            <Box marginBottom={1}>
              <Text color={theme.accent.brand}>{t("export.filePath", { path: props.filePath })}</Text>
            </Box>
          ) : null}

          <Box flexDirection="column" flexGrow={1} overflow="hidden">
            {visible.map((line, i) => (
              <Text key={scrollOffset + i} color={theme.text.primary} wrap="truncate">
                {line}
              </Text>
            ))}
            {truncated ? (
              <Text color={theme.text.muted}>{t("export.truncated", { total: String(totalLines) })}</Text>
            ) : null}
          </Box>
        </>
      )}

      <Box marginTop={1} justifyContent="space-between">
        <Text color={theme.text.muted}>{t("export.hint")}</Text>
        <Text color={theme.text.muted}>[{scrollOffset}-{scrollOffset + visible.length}/{totalLines}]</Text>
      </Box>
    </Box>
  );
}
