import React, { useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { darkTheme as theme } from "../theme.js";
import { t } from "../../i18n/index.js";

const MAX_VISIBLE_LINES = 14;

export function CommandEditorModal(props: {
  initial: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}): React.ReactNode {
  const [lines, setLines] = useState<string[]>(() => {
    const initial = props.initial.trim();
    if (!initial) return [""];
    return initial.split(/\r?\n/);
  });
  const [cursorRow, setCursorRow] = useState(0);
  const [cursorCol, setCursorCol] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);

  const currentLine = lines[cursorRow] ?? "";

  const commit = useCallback(() => {
    const value = lines.join("\n").trim();
    props.onSelect(value);
  }, [lines, props]);

  const insertChar = useCallback((ch: string) => {
    setLines((prev) => {
      const next = [...prev];
      const line = next[cursorRow] ?? "";
      next[cursorRow] = line.slice(0, cursorCol) + ch + line.slice(cursorCol);
      return next;
    });
    setCursorCol((c) => c + 1);
  }, [cursorRow, cursorCol]);

  const handleBackspace = useCallback(() => {
    if (cursorCol > 0) {
      setLines((prev) => {
        const next = [...prev];
        const line = next[cursorRow] ?? "";
        next[cursorRow] = line.slice(0, cursorCol - 1) + line.slice(cursorCol);
        return next;
      });
      setCursorCol((c) => c - 1);
    } else if (cursorRow > 0) {
      const prevLine = lines[cursorRow - 1] ?? "";
      const merged = prevLine + currentLine;
      setLines((prev) => {
        const next = [...prev];
        next[cursorRow - 1] = merged;
        next.splice(cursorRow, 1);
        return next;
      });
      setCursorRow((r) => r - 1);
      setCursorCol(prevLine.length);
    }
  }, [cursorCol, cursorRow, currentLine, lines]);

  const handleEnter = useCallback(() => {
    setLines((prev) => {
      const next = [...prev];
      const line = next[cursorRow] ?? "";
      next.splice(cursorRow, 1, line.slice(0, cursorCol), line.slice(cursorCol));
      return next;
    });
    setCursorRow((r) => r + 1);
    setCursorCol(0);
  }, [cursorRow, cursorCol]);

  const moveUp = useCallback(() => {
    if (cursorRow > 0) {
      setCursorRow((r) => r - 1);
      setCursorCol((c) => Math.min(c, (lines[cursorRow - 1] ?? "").length));

      if (cursorRow - 1 < scrollOffset) {
        setScrollOffset((s) => Math.max(0, s - 1));
      }
    }
  }, [cursorRow, cursorCol, lines, scrollOffset]);

  const moveDown = useCallback(() => {
    if (cursorRow < lines.length - 1) {
      setCursorRow((r) => r + 1);
      setCursorCol((c) => Math.min(c, (lines[cursorRow + 1] ?? "").length));

      if (cursorRow + 1 >= scrollOffset + MAX_VISIBLE_LINES) {
        setScrollOffset((s) => s + 1);
      }
    }
  }, [cursorRow, cursorCol, lines, scrollOffset]);

  const moveLeft = useCallback(() => {
    if (cursorCol > 0) {
      setCursorCol((c) => c - 1);
    } else if (cursorRow > 0) {
      const prevLine = lines[cursorRow - 1] ?? "";
      setCursorRow((r) => r - 1);
      setCursorCol(prevLine.length);
    }
  }, [cursorCol, cursorRow, lines]);

  const moveRight = useCallback(() => {
    if (cursorCol < currentLine.length) {
      setCursorCol((c) => c + 1);
    } else if (cursorRow < lines.length - 1) {
      setCursorRow((r) => r + 1);
      setCursorCol(0);
    }
  }, [cursorCol, cursorRow, currentLine, lines]);

  useInput((input, key) => {
    if (key.ctrl) {
      if (input === "s") {
        commit();
      }
      return;
    }
    if (key.escape) {
      props.onClose();
      return;
    }
    if (key.return) {
      handleEnter();
      return;
    }
    if (key.upArrow) {
      moveUp();
      return;
    }
    if (key.downArrow) {
      moveDown();
      return;
    }
    if (key.leftArrow) {
      moveLeft();
      return;
    }
    if (key.rightArrow) {
      moveRight();
      return;
    }
    if (key.backspace || key.delete) {
      handleBackspace();
      return;
    }
    if (input.length === 1 && input >= " " && input <= "~") {
      insertChar(input);
    }
  });

  const totalLines = lines.length;
  const visibleStart = scrollOffset;
  const visibleEnd = Math.min(totalLines, visibleStart + MAX_VISIBLE_LINES);
  const visibleLines = lines.slice(visibleStart, visibleEnd);

  const lineNumWidth = String(totalLines).length;

  function renderLine(lineText: string, rowIdx: number): React.ReactNode {
    const isCursor = rowIdx === cursorRow;
    const displayRow = rowIdx + 1;
    const prefix = String(displayRow).padStart(lineNumWidth, " ");
    const lineNumColor = isCursor ? theme.accent.brand : theme.text.muted;

    if (isCursor) {
      const before = lineText.slice(0, cursorCol);
      const char = cursorCol < lineText.length ? lineText[cursorCol] : " ";
      const after = cursorCol < lineText.length ? lineText.slice(cursorCol + 1) : "";
      return (
        <Box key={rowIdx}>
          <Text color={lineNumColor}>{prefix} </Text>
          <Text color={theme.text.primary}>{before}</Text>
          <Text inverse>{char}</Text>
          <Text color={theme.text.primary}>{after}</Text>
        </Box>
      );
    }
    return (
      <Box key={rowIdx}>
        <Text color={lineNumColor}>{prefix} </Text>
        <Text color={theme.text.secondary}>{lineText}</Text>
      </Box>
    );
  }

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
        width={70}
        flexDirection="column"
        backgroundColor={theme.bg.elevated}
        borderStyle="round"
        borderColor={theme.accent.brand}
        paddingX={1}
        paddingY={0}
      >
        <Box justifyContent="space-between">
          <Text color={theme.accent.brand} bold>
            {t("cmdEditor.title")}
          </Text>
          <Text color={theme.text.muted}>
            {totalLines} {t("cmdEditor.lines")}
          </Text>
        </Box>

        <Box flexDirection="column" marginTop={0}>
          {visibleLines.map((line, visIdx) => renderLine(line, visibleStart + visIdx))}
        </Box>

        {visibleEnd < totalLines ? (
          <Text color={theme.text.muted}>{"\u2193 " + (totalLines - visibleEnd) + " more"}</Text>
        ) : null}

        <Box marginTop={1} justifyContent="space-between">
          <Text color={theme.text.muted}>
            {t("cmdEditor.hint")}
          </Text>
          <Text color={theme.text.muted}>
            {visibleEnd}/{totalLines}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
