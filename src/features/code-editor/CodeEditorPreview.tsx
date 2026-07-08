import React from "react";
import { Box, Text } from "ink";
import { darkTheme as theme } from "../../shared/ui/theme.js";
import { t } from "../../shared/i18n/index.js";
import { CODE_EDITOR_MAX_VISIBLE } from "../../shared/config/constants.js";

export interface CodeEditorPreviewProps {
  value: string;
  hint: string;
  isActive: boolean;
  onActivate: () => void;
}

export function CodeEditorPreview(props: CodeEditorPreviewProps): React.ReactNode {
  const { value, hint, isActive, onActivate } = props;

  const lines = value ? value.split("\n") : [];
  const visibleLines = lines.slice(0, CODE_EDITOR_MAX_VISIBLE);
  const truncated = lines.length > CODE_EDITOR_MAX_VISIBLE;
  const hasValue = lines.length > 0;

  void onActivate; // consumed by parent via useInput when active

  return (
    <Box flexDirection="column" width="100%">
      <Box
        borderStyle="single"
        borderColor={isActive ? theme.accent.brand : theme.border.dim}
        backgroundColor={isActive ? theme.bg.input : undefined}
        paddingLeft={1}
        overflow="hidden"
        width="100%"
        flexDirection="column"
      >
        {hasValue ? (
          <>
            {visibleLines.map((line, i) => (
              <Text key={i} color={theme.text.primary}>
                {line}
              </Text>
            ))}
            {truncated ? (
              <Text color={theme.text.muted}>{t("codeEditor.previewTruncated")}</Text>
            ) : null}
          </>
        ) : (
          <Text color={theme.text.muted}>{hint}</Text>
        )}
      </Box>
      {isActive ? (
        <Box marginTop={0}>
          <Text color={theme.accent.brand}>{"› "}</Text>
          <Text color={theme.text.muted}>{t("codeEditor.fieldHint")}</Text>
        </Box>
      ) : null}
    </Box>
  );
}
