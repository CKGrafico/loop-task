## Context

Tasks have a `command` field and `commandArgs` array. In the task list view, `TaskInspector` displays the joined command. In the task editor, `TaskFormRow` shows the command in an editable input. Users need to copy this command string but can't select text in a TUI.

## Goals / Non-Goals

**Goals:**
- Copy button next to command in TaskInspector (read-only display).
- Copy button next to command in TaskForm (editable input).
- Toast confirmation on successful copy.

**Non-Goals:**
- No keyboard shortcut for copy.
- No copy for other fields.

## Decisions

### 1. Small button with `⧉` icon

**Decision**: A clickable box with `⧉` character, placed to the right of the command field. Uses existing `useHoverState` for visual feedback.

**Why not a text button**: A compact icon saves space in the TUI layout.

### 2. Reuse `copyToClipboard` from `src/shared/clipboard.ts`

**Decision**: Call the existing `copyToClipboard(text)` which already handles Windows (powershell), macOS (pbcopy), and Linux (xclip/xsel).

### 3. Toast via parent callback

**Decision**: The copy button calls `onCopy(text)` which the parent passes through to the toast system.

## Risks / Trade-offs

- [Clipboard not available] → `copyToClipboard` already has try/catch, will silently fail.
