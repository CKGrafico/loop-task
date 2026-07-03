import React, { useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { darkTheme as theme } from "../theme.js";
import { t } from "../../i18n/index.js";
import { copyToClipboard } from "../../shared/clipboard.js";

const MAX_VISIBLE = 8;

export function InlineCommandEditor({
  value,
  hint,
  isActive,
  onChange,
}: {
  value: string;
  hint: string;
  isActive: boolean;
  onChange: (v: string) => void;
}): React.ReactNode {
  const [lines, setLines] = useState<string[]>(() =>
    value ? value.split("\n") : [""],
  );
  const [cursorRow, setCursorRow] = useState(0);
  const [cursorCol, setCursorCol] = useState(0);

  const emit = useCallback(
    (nextLines: string[]) => {
      onChange(nextLines.join("\n"));
    },
    [onChange],
  );

  useInput(
    (input, key) => {
      // Ctrl+Y: copy full command text
      if (key.ctrl && input === "y") {
        copyToClipboard(value);
        return;
      }
      // Let WizardForm handle these
      if (key.ctrl || key.escape || key.tab) return;

      if (key.return) {
        const next = [...lines];
        const line = next[cursorRow] ?? "";
        next.splice(cursorRow, 1, line.slice(0, cursorCol), line.slice(cursorCol));
        setLines(next);
        setCursorRow((r) => r + 1);
        setCursorCol(0);
        emit(next);
        return;
      }
      if (key.upArrow) {
        if (cursorRow > 0) {
          setCursorRow((r) => r - 1);
          setCursorCol((c) => Math.min(c, (lines[cursorRow - 1] ?? "").length));
        }
        return;
      }
      if (key.downArrow) {
        if (cursorRow < lines.length - 1) {
          setCursorRow((r) => r + 1);
          setCursorCol((c) => Math.min(c, (lines[cursorRow + 1] ?? "").length));
        }
        return;
      }
      if (key.leftArrow) {
        if (cursorCol > 0) setCursorCol((c) => c - 1);
        else if (cursorRow > 0) {
          setCursorRow((r) => r - 1);
          setCursorCol((lines[cursorRow - 1] ?? "").length);
        }
        return;
      }
      if (key.rightArrow) {
        const curLen = (lines[cursorRow] ?? "").length;
        if (cursorCol < curLen) setCursorCol((c) => c + 1);
        else if (cursorRow < lines.length - 1) {
          setCursorRow((r) => r + 1);
          setCursorCol(0);
        }
        return;
      }
      if (key.backspace || key.delete) {
        if (cursorCol > 0) {
          const next = [...lines];
          const line = next[cursorRow] ?? "";
          next[cursorRow] = line.slice(0, cursorCol - 1) + line.slice(cursorCol);
          setLines(next);
          setCursorCol((c) => c - 1);
          emit(next);
        } else if (cursorRow > 0) {
          const next = [...lines];
          const prev = next[cursorRow - 1] ?? "";
          const cur = next[cursorRow] ?? "";
          next.splice(cursorRow - 1, 2, prev + cur);
          setLines(next);
          setCursorRow((r) => r - 1);
          setCursorCol(prev.length);
          emit(next);
        }
        return;
      }
      if (input.length === 1 && input >= " " && input <= "~") {
        const next = [...lines];
        const line = next[cursorRow] ?? "";
        next[cursorRow] = line.slice(0, cursorCol) + input + line.slice(cursorCol);
        setLines(next);
        setCursorCol((c) => c + 1);
        emit(next);
      }
    },
    { isActive },
  );

  const scrollStart = Math.max(0, cursorRow - MAX_VISIBLE + 1);
  const visible = lines.slice(scrollStart, scrollStart + MAX_VISIBLE);
  const lineNumWidth = String(lines.length).length;
  const isEmpty = lines.length === 1 && lines[0] === "";

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={isActive ? theme.accent.brand : theme.border.dim}
      backgroundColor={isActive ? theme.bg.input : undefined}
      width="100%"
      paddingX={1}
    >
      {isEmpty && !isActive ? (
        <Text color={theme.text.muted}>{hint}</Text>
      ) : (
        visible.map((line, visIdx) => {
          const rowIdx = scrollStart + visIdx;
          const isCursor = isActive && rowIdx === cursorRow;
          const lineNum = String(rowIdx + 1).padStart(lineNumWidth, " ");
          if (isCursor) {
            const before = line.slice(0, cursorCol);
            const cur = cursorCol < line.length ? line[cursorCol] : " ";
            const after = cursorCol < line.length ? line.slice(cursorCol + 1) : "";
            return (
              <Box key={rowIdx}>
                <Text color={theme.text.muted}>{lineNum} </Text>
                <Text color={theme.text.primary}>{before}</Text>
                <Text inverse>{cur}</Text>
                <Text color={theme.text.primary}>{after}</Text>
              </Box>
            );
          }
          return (
            <Box key={rowIdx}>
              <Text color={theme.text.muted}>{lineNum} </Text>
              <Text color={theme.text.secondary}>{line}</Text>
            </Box>
          );
        })
      )}
      {isActive ? (
        <Box marginTop={0}>
          <Text color={theme.text.muted}>{t("cmdEditor.inlineHint")}</Text>
        </Box>
      ) : null}
    </Box>
  );
}
