import React, { useState, useCallback, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import { darkTheme as theme } from "../theme.js";
import { t } from "../../i18n/index.js";
import { useUndoRedo } from "../../shared/useUndoRedo.js";
import { highlightSegments } from "../utils/syntax.js";
import { joinCommandLines } from "../../loop-config.js";
import { copyToClipboard, readFromClipboard } from "../../shared/clipboard.js";
import { sanitizePaste } from "../utils/paste.js";
import {
  CODE_EDITOR_MODAL_HEIGHT,
  CODE_EDITOR_UNDO_LIMIT,
  CODE_EDITOR_SYNTAX_COLORS,
} from "../../config/constants.js";

export interface CodeEditorModalProps {
  initialValue: string;
  onSave: (value: string) => void;
  onCancel: () => void;
}

// Lines available for the editor content area:
// total height - title row - preview row - buttons row - 2 padding = -5
const EDITOR_VISIBLE_LINES = CODE_EDITOR_MODAL_HEIGHT - 5;

export function CodeEditorModal(props: CodeEditorModalProps): React.ReactNode {
  const { initialValue, onSave, onCancel } = props;

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

  // Flash message auto-clear
  React.useEffect(() => {
    if (flashMsg) {
      const timer = setTimeout(() => setFlashMsg(null), 1500);
      return () => clearTimeout(timer);
    }
  }, [flashMsg]);

  // Scroll: keep cursor visible in the editor area
  const scrollStart = useMemo(() => {
    if (cursorRow < EDITOR_VISIBLE_LINES) return 0;
    return cursorRow - EDITOR_VISIBLE_LINES + 1;
  }, [cursorRow]);
  const visibleLines = useMemo(
    () => lines.slice(scrollStart, scrollStart + EDITOR_VISIBLE_LINES),
    [lines, scrollStart],
  );

  // ---- Helper: apply a text mutation via setValue and update cursor ----
  const applyMutation = useCallback(
    (nextLines: string[], newCursorRow: number, newCursorCol: number) => {
      setValue(nextLines.join("\n"));
      setCursorRow(newCursorRow);
      setCursorCol(newCursorCol);
    },
    [setValue],
  );

  // ---- Keyboard handling ----
  useInput(
    (input, key) => {
      // Bracketed paste: content wrapped in ESC[200~ ... ESC[201~
      // Must be detected BEFORE the escape check — the leading ESC trips
      // key.escape and would close the modal before paste is handled.
      if (input.includes("\x1b[200~")) {
        const pasted = sanitizePaste(input);
        if (pasted) {
          const next = [...lines];
          const line = next[cursorRow] ?? "";
          next[cursorRow] =
            line.slice(0, cursorCol) + pasted + line.slice(cursorCol);
          applyMutation(next, cursorRow, cursorCol + pasted.length);
        }
        return;
      }

      // Esc → cancel
      if (key.escape) {
        onCancel();
        return;
      }
      // Ctrl+S → save (also accept raw \x13 fallback)
      if ((key.ctrl && input === "s") || input === "\x13") {
        onSave(value);
        return;
      }
      // Ctrl+Z → undo (also accept raw \x1a fallback)
      if ((key.ctrl && !key.shift && input === "z") || input === "\x1a") {
        undo();
        return;
      }
      // Ctrl+Shift+Z → redo
      if (key.ctrl && key.shift && input === "z") {
        redo();
        return;
      }
      // Ctrl+X → cut (copy all to clipboard, then clear; also accept \x18)
      if ((key.ctrl && input === "x") || input === "\x18") {
        copyToClipboard(value);
        setValue("");
        setCursorRow(0);
        setCursorCol(0);
        setFlashMsg(t("codeEditor.copied"));
        return;
      }
      // Ctrl+V → paste from clipboard (also accept raw \x16 fallback for
      // terminals that don't set key.ctrl on the SYN control byte)
      if ((key.ctrl && input === "v") || input === "\x16") {
        const clip = readFromClipboard();
        if (clip) {
          const pasted = sanitizePaste(clip);
          if (pasted) {
            const next = [...lines];
            const line = next[cursorRow] ?? "";
            next[cursorRow] =
              line.slice(0, cursorCol) + pasted + line.slice(cursorCol);
            applyMutation(next, cursorRow, cursorCol + pasted.length);
          }
        } else {
          // No clipboard tool available (common over SSH). Bracketed paste
          // (right-click in the terminal) still works — point the user at it.
          setFlashMsg(t("codeEditor.clipboardEmpty"));
        }
        return;
      }
      // Ctrl+L → clear all
      if ((key.ctrl && input === "l") || input === "\x0c") {
        setValue("");
        setCursorRow(0);
        setCursorCol(0);
        setFlashMsg(t("codeEditor.cleared"));
        return;
      }

      // Enter → insert newline at cursor
      if (key.return) {
        const next = [...lines];
        const line = next[cursorRow] ?? "";
        next.splice(
          cursorRow,
          1,
          line.slice(0, cursorCol),
          line.slice(cursorCol),
        );
        applyMutation(next, cursorRow + 1, 0);
        return;
      }

      // Arrow keys
      if (key.upArrow) {
        if (cursorRow > 0) {
          const newRow = cursorRow - 1;
          setCursorRow(newRow);
          setCursorCol((c) => Math.min(c, (lines[newRow] ?? "").length));
        }
        return;
      }
      if (key.downArrow) {
        if (cursorRow < lines.length - 1) {
          const newRow = cursorRow + 1;
          setCursorRow(newRow);
          setCursorCol((c) => Math.min(c, (lines[newRow] ?? "").length));
        }
        return;
      }
      if (key.leftArrow) {
        if (cursorCol > 0) {
          setCursorCol((c) => c - 1);
        } else if (cursorRow > 0) {
          setCursorRow((r) => r - 1);
          setCursorCol((lines[cursorRow - 1] ?? "").length);
        }
        return;
      }
      if (key.rightArrow) {
        const curLen = (lines[cursorRow] ?? "").length;
        if (cursorCol < curLen) {
          setCursorCol((c) => c + 1);
        } else if (cursorRow < lines.length - 1) {
          setCursorRow((r) => r + 1);
          setCursorCol(0);
        }
        return;
      }

      // Backspace / Delete
      if (key.backspace || key.delete) {
        if (cursorCol > 0) {
          const next = [...lines];
          const line = next[cursorRow] ?? "";
          next[cursorRow] =
            line.slice(0, cursorCol - 1) + line.slice(cursorCol);
          applyMutation(next, cursorRow, cursorCol - 1);
        } else if (cursorRow > 0) {
          const next = [...lines];
          const prev = next[cursorRow - 1] ?? "";
          const cur = next[cursorRow] ?? "";
          next.splice(cursorRow - 1, 2, prev + cur);
          applyMutation(next, cursorRow - 1, prev.length);
        }
        return;
      }

      // Multi-char containing CR/LF with no bracketed markers — ignore
      if (input.length > 1 && (input.includes("\r") || input.includes("\n")))
        return;

      // Multi-char printable input = unbracketed single-line paste
      if (input.length > 1 && !key.meta) {
        const pasted = sanitizePaste(input);
        if (pasted) {
          const next = [...lines];
          const line = next[cursorRow] ?? "";
          next[cursorRow] =
            line.slice(0, cursorCol) + pasted + line.slice(cursorCol);
          applyMutation(next, cursorRow, cursorCol + pasted.length);
        }
        return;
      }

      // Single printable char → insert at cursor
      if (input.length === 1 && input >= " " && input <= "~") {
        const next = [...lines];
        const line = next[cursorRow] ?? "";
        next[cursorRow] =
          line.slice(0, cursorCol) + input + line.slice(cursorCol);
        applyMutation(next, cursorRow, cursorCol + 1);
      }
    },
    { isActive: true },
  );

  // ---- Live preview footer ----
  const joined = joinCommandLines(value);
  const innerWidth = 58;
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
        width={60}
        height={CODE_EDITOR_MODAL_HEIGHT}
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
