import React, { useState, useCallback, useMemo } from "react";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { t } from "../../i18n/index.js";
import { useUndoRedo } from "../../shared/useUndoRedo.js";
import { highlightSegments } from "../../tui/utils/syntax.js";
import { joinCommandLines } from "../../loop-config.js";
import { copyToClipboard, readFromClipboard } from "../../shared/clipboard.js";
import { sanitizePaste } from "../../tui/utils/paste.js";
import { useHoverState } from "../hooks/useHoverState.js";
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



function ActionButton({
  label,
  onMouseDown,
}: {
  label: string;
  onMouseDown: () => void;
}): React.ReactNode {
  const { isHovered, hoverProps } = useHoverState();
  return (
    <box
      border
      onMouseDown={onMouseDown}
      borderColor={isHovered ? "#38bdf8" : "#374151"}
      style={{
        paddingLeft: 1,
        paddingRight: 1,
        marginRight: 1,
        backgroundColor: isHovered ? "#1e3a8a" : undefined,
      }}
      {...hoverProps}
    >
      <text fg={isHovered ? "#38bdf8" : "#9ca3af"}>
        <strong>{label}</strong>
      </text>
    </box>
  );
}



export function CodeEditorModal(props: CodeEditorModalProps): React.ReactNode {
  const { initialValue, onSave, onCancel } = props;
  const { width } = useTerminalDimensions();

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

  // Vertical scroll: keep cursor region visible
  const scrollStart = useMemo(() => {
    if (cursorRow < EDITOR_VISIBLE_LINES) return 0;
    return cursorRow - EDITOR_VISIBLE_LINES + 1;
  }, [cursorRow]);
  const visibleLines = useMemo(
    () => lines.slice(scrollStart, scrollStart + EDITOR_VISIBLE_LINES),
    [lines, scrollStart],
  );

  // Helper: apply mutation via setValue + cursor update
  const applyMutation = useCallback(
    (nextLines: string[], newCursorRow: number, newCursorCol: number) => {
      setValue(nextLines.join("\n"));
      setCursorRow(newCursorRow);
      setCursorCol(newCursorCol);
    },
    [setValue],
  );



  const handleCopy = useCallback(() => {
    copyToClipboard(value);
    setFlashMsg(t("codeEditor.copied"));
  }, [value]);

  const handlePaste = useCallback(() => {
    const clip = readFromClipboard();
    if (clip) {
      const pasted = sanitizePaste(clip);
      if (pasted) {
        const next = [...lines];
        const line = next[cursorRow] ?? "";
        next[cursorRow] = line.slice(0, cursorCol) + pasted + line.slice(cursorCol);
        applyMutation(next, cursorRow, cursorCol + pasted.length);
      }
    }
  }, [lines, cursorRow, cursorCol, applyMutation]);

  const handleClear = useCallback(() => {
    setValue("");
    setCursorRow(0);
    setCursorCol(0);
    setFlashMsg(t("codeEditor.cleared"));
  }, [setValue]);



  useKeyboard((key) => {
    // Esc or Ctrl+C → cancel
    if (key.name === "escape" || (key.ctrl && key.name === "c")) {
      onCancel();
      return;
    }
    // Ctrl+S → save
    if (key.ctrl && key.name === "s") {
      onSave(value);
      return;
    }
    // Ctrl+Z → undo
    if (key.ctrl && !key.shift && key.name === "z") {
      undo();
      return;
    }
    // Ctrl+Shift+Z → redo
    if (key.ctrl && key.shift && key.name === "z") {
      redo();
      return;
    }
    // Ctrl+X → cut (copy all + clear)
    if (key.ctrl && key.name === "x") {
      handleCopy();
      handleClear();
      return;
    }
    // Ctrl+V → paste from clipboard
    if (key.ctrl && key.name === "v") {
      handlePaste();
      return;
    }
    // Ctrl+L → clear all
    if (key.ctrl && key.name === "l") {
      handleClear();
      return;
    }
    // Tab → no-op (let button focus cycle; handled by OpenTUI focus system)
    if (key.name === "tab") {
      return;
    }

    // Enter → insert newline
    if (key.name === "return" || key.name === "enter") {
      const next = [...lines];
      const line = next[cursorRow] ?? "";
      next.splice(cursorRow, 1, line.slice(0, cursorCol), line.slice(cursorCol));
      applyMutation(next, cursorRow + 1, 0);
      return;
    }

    // Arrow keys
    if (key.name === "up") {
      if (cursorRow > 0) {
        const newRow = cursorRow - 1;
        setCursorRow(newRow);
        setCursorCol((c: number) => Math.min(c, (lines[newRow] ?? "").length));
      }
      return;
    }
    if (key.name === "down") {
      if (cursorRow < lines.length - 1) {
        const newRow = cursorRow + 1;
        setCursorRow(newRow);
        setCursorCol((c: number) => Math.min(c, (lines[newRow] ?? "").length));
      }
      return;
    }
    if (key.name === "left") {
      if (cursorCol > 0) {
        setCursorCol((c: number) => c - 1);
      } else if (cursorRow > 0) {
        setCursorRow((r: number) => r - 1);
        setCursorCol((lines[cursorRow - 1] ?? "").length);
      }
      return;
    }
    if (key.name === "right") {
      const curLen = (lines[cursorRow] ?? "").length;
      if (cursorCol < curLen) {
        setCursorCol((c: number) => c + 1);
      } else if (cursorRow < lines.length - 1) {
        setCursorRow((r: number) => r + 1);
        setCursorCol(0);
      }
      return;
    }

    // Backspace / Delete
    if (key.name === "backspace" || key.name === "delete") {
      if (cursorCol > 0) {
        const next = [...lines];
        const line = next[cursorRow] ?? "";
        next[cursorRow] = line.slice(0, cursorCol - 1) + line.slice(cursorCol);
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

    // Printable character → insert at cursor
    if (key.ctrl || key.meta) return;
    let ch: string | null = null;
    if (key.name && key.name.length === 1 && key.name >= " " && key.name <= "~") {
      ch = key.name;
    } else if (key.sequence && key.sequence.length === 1 && key.sequence >= " " && key.sequence <= "~") {
      ch = key.sequence;
    }
    if (ch) {
      const next = [...lines];
      const line = next[cursorRow] ?? "";
      next[cursorRow] = line.slice(0, cursorCol) + ch + line.slice(cursorCol);
      applyMutation(next, cursorRow, cursorCol + 1);
    }
  });



  const joined = joinCommandLines(value);
  const maxLen = Math.floor(width * 0.85);
  const truncatedPreview =
    joined.length > maxLen
      ? joined.slice(0, maxLen) + t("codeEditor.previewTruncated")
      : joined;



  return (
    <box
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 100,
      }}
    >
      <box
        border
        style={{
          flexDirection: "column",
          width: "90%",
          height: "80%",
          backgroundColor: "#111827",
        }}
      >
        {/* Title row */}
        <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <text fg="#38bdf8">
            <strong>{t("codeEditor.title")}</strong>
          </text>
          <text fg="#6b7280">
            {lineCount} {t("cmdEditor.lines")}
          </text>
        </box>

        {/* Editor area */}
        <box style={{ flexDirection: "column", flexGrow: 1 }}>
          {visibleLines.map((line, visIdx) => {
            const rowIdx = scrollStart + visIdx;
            const isCursor = rowIdx === cursorRow;
            const lineNum = String(rowIdx + 1).padStart(lineNumWidth, " ");

            if (isCursor) {
              // Cursor line: render before / cursor char / after
              const before = line.slice(0, cursorCol);
              const cur = cursorCol < line.length ? line[cursorCol] : " ";
              const after = cursorCol < line.length ? line.slice(cursorCol + 1) : "";

              // Cursor line: render with cursor (no syntax highlight on cursor line)
              return (
                <box key={rowIdx} style={{ flexDirection: "row" }}>
                  <text fg="#6b7280">{lineNum} </text>
                  <text fg="#e5e7eb">{before}</text>
                  <text fg="#000000" backgroundColor="#e5e7eb">{cur}</text>
                  <text fg="#e5e7eb">{after}</text>
                </box>
              );
            }

            // Non-cursor line: syntax highlighted (whitespace preserved)
            const segments = highlightSegments(
              line,
              CODE_EDITOR_SYNTAX_COLORS,
              "#6b7280",
            );
            if (segments.length === 0) {
              return (
                <box key={rowIdx} style={{ flexDirection: "row" }}>
                  <text fg="#6b7280">{lineNum} </text>
                  <text> </text>
                </box>
              );
            }
            return (
              <box key={rowIdx} style={{ flexDirection: "row" }}>
                <text fg="#6b7280">{lineNum} </text>
                {segments.map((seg, ti) => (
                  <text key={ti} fg={seg.color}>
                    {seg.value}
                  </text>
                ))}
              </box>
            );
          })}
        </box>

        {/* Preview footer */}
        <box style={{ flexDirection: "row" }}>
          <text fg="#6b7280">{t("codeEditor.previewLabel")} </text>
          <text fg="#9ca3af">{truncatedPreview || t("codeEditor.emptyPlaceholder")}</text>
        </box>

        {/* Buttons + hint row */}
        <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <box style={{ flexDirection: "row" }}>
            <ActionButton label={`${t("codeEditor.buttonCopy")} ctrl+x`} onMouseDown={handleCopy} />
            <ActionButton label={`${t("codeEditor.buttonPaste")} ctrl+v`} onMouseDown={handlePaste} />
            <ActionButton label={`${t("codeEditor.buttonClear")} ctrl+l`} onMouseDown={handleClear} />
          </box>
          {flashMsg ? (
            <text fg="#4ade80">{flashMsg}</text>
          ) : (
            <text fg="#6b7280">{t("codeEditor.hint")}</text>
          )}
        </box>
      </box>
    </box>
  );
}
