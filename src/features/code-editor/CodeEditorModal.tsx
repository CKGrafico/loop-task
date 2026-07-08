import React, { useState, useCallback, useMemo } from "react";
import { Box, Text } from "ink";
import { darkTheme as theme } from "../../shared/ui/theme.js";
import { t } from "../../shared/i18n/index.js";
import { useUndoRedo } from "../../shared/hooks/useUndoRedo.js";
import { highlightSegments } from "../../shared/utils/syntax.js";
import { joinCommandLines } from "../../loop-config.js";
import { CODE_EDITOR_UNDO_LIMIT, CODE_EDITOR_SYNTAX_COLORS } from "../../shared/config/constants.js";
import { useModalDimensions } from "./useModalDimensions.js";
import { useEditorKeyboard } from "./useEditorKeyboard.js";

export interface CodeEditorModalProps {
  initialValue: string;
  onSave: (value: string) => void;
  onCancel: () => void;
}

export function CodeEditorModal(props: CodeEditorModalProps): React.ReactNode {
  const { initialValue, onSave, onCancel } = props;
  const { modalWidth, modalHeight, editorVisibleLines: EDITOR_VISIBLE_LINES } = useModalDimensions();

  const { value, setValue, undo, redo } = useUndoRedo(
    initialValue,
    CODE_EDITOR_UNDO_LIMIT,
  );

  const [cursorRow, setCursorRow] = useState(() => {
    const lines = initialValue.split("\n");
    return Math.max(0, lines.length - 1);
  });
  const [cursorCol, setCursorCol] = useState(() => {
    const lines = initialValue.split("\n");
    return (lines[lines.length - 1] ?? "").length;
  });
  const [flashMsg, setFlashMsg] = useState<string | null>(null);

  const lines = useMemo(() => (value ? value.split("\n") : [""]), [value]);
  const lineCount = lines.length;
  const lineNumWidth = String(lineCount).length;

  React.useEffect(() => {
    if (flashMsg) {
      const timer = setTimeout(() => setFlashMsg(null), 1500);
      return () => clearTimeout(timer);
    }
  }, [flashMsg]);

  const scrollStart = useMemo(() => {
    if (cursorRow < EDITOR_VISIBLE_LINES) return 0;
    return cursorRow - EDITOR_VISIBLE_LINES + 1;
  }, [cursorRow]);
  const visibleLines = useMemo(
    () => lines.slice(scrollStart, scrollStart + EDITOR_VISIBLE_LINES),
    [lines, scrollStart],
  );

  const applyMutation = useCallback(
    (nextLines: string[], newCursorRow: number, newCursorCol: number) => {
      setValue(nextLines.join("\n"));
      setCursorRow(newCursorRow);
      setCursorCol(newCursorCol);
    },
    [setValue],
  );

  useEditorKeyboard({
    lines,
    cursorRow,
    cursorCol,
    value,
    setValue,
    setCursorRow,
    setCursorCol,
    undo,
    redo,
    onSave,
    onCancel,
    setFlashMsg,
    applyMutation,
  });

  const joined = joinCommandLines(value);
  const innerWidth = modalWidth - 2;
  const truncatedPreview =
    joined.length > innerWidth
      ? joined.slice(0, innerWidth - 1) + t("codeEditor.previewTruncated")
      : joined;

  const accent = theme.accent.brand;

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
        width={modalWidth}
        height={modalHeight}
        flexDirection="column"
        backgroundColor={theme.bg.elevated}
        borderStyle="round"
        borderColor={accent}
        paddingX={1}
      >
        {/* Title row */}
        <Box justifyContent="space-between">
          <Text color={accent} bold>
            {t("codeEditor.title")}
          </Text>
          <Text color={theme.text.muted}>
            {lineCount} {t("cmdEditor.lines")}
          </Text>
        </Box>

        {/* Editor area */}
        <Box flexDirection="column" flexGrow={1} overflow="hidden">
          {visibleLines.map((line, visIdx) => {
            const rowIdx = scrollStart + visIdx;
            const isCursor = rowIdx === cursorRow;
            const lineNum = String(rowIdx + 1).padStart(lineNumWidth, " ");

            if (isCursor) {
              const before = line.slice(0, cursorCol);
              const cur = cursorCol < line.length ? line[cursorCol] : " ";
              const after = cursorCol < line.length ? line.slice(cursorCol + 1) : "";

              // Cursor line: render with cursor (no syntax highlight on cursor line)
              return (
                <Box key={rowIdx}>
                  <Text color={theme.text.muted}>{lineNum} </Text>
                  <Text color={theme.text.primary}>{before}</Text>
                  <Text inverse>{cur}</Text>
                  <Text color={theme.text.primary}>{after}</Text>
                </Box>
              );
            }

            // Non-cursor line: syntax highlighted (whitespace preserved)
            const segments = highlightSegments(
              line,
              CODE_EDITOR_SYNTAX_COLORS,
              theme.text.muted,
            );
            if (segments.length === 0) {
              return (
                <Box key={rowIdx}>
                  <Text color={theme.text.muted}>{lineNum} </Text>
                  <Text> </Text>
                </Box>
              );
            }
            return (
              <Box key={rowIdx}>
                <Text color={theme.text.muted}>{lineNum} </Text>
                {segments.map((seg, ti) => (
                  <Text key={ti} color={seg.color}>
                    {seg.value}
                  </Text>
                ))}
              </Box>
            );
          })}
        </Box>

        {/* Preview footer */}
        <Box>
          <Text color={theme.text.muted}>{t("codeEditor.previewLabel")} </Text>
          <Text color={theme.text.secondary}>{truncatedPreview || t("codeEditor.emptyPlaceholder")}</Text>
        </Box>

        {/* Buttons row */}
        <Box justifyContent="space-between">
          <Box gap={2}>
            <Text color={theme.accent.brand}>{t("codeEditor.buttonCopy")}</Text>
            <Text color={theme.text.muted}>ctrl+x</Text>
            <Text color={theme.accent.brand}>{t("codeEditor.buttonPaste")}</Text>
            <Text color={theme.text.muted}>ctrl+v</Text>
            <Text color={theme.accent.brand}>{t("codeEditor.buttonClear")}</Text>
            <Text color={theme.text.muted}>ctrl+l</Text>
          </Box>
          {flashMsg ? (
            <Text color={theme.semantic.success}>{flashMsg}</Text>
          ) : null}
        </Box>
        {/* Hint row */}
        <Box>
          <Text color={theme.text.muted}>{t("codeEditor.hint")}</Text>
        </Box>
      </Box>
    </Box>
  );
}
