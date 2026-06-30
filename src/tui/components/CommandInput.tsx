import React, { useMemo, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import {
  useAutocompleteState,
  type AutocompleteState,
  type AutocompleteAction,
} from "ink-combobox";
import { darkTheme as theme } from "../theme.js";
import { t } from "../../i18n/index.js";
import { buildCommands } from "../commands.js";
import {
  COMMAND_INPUT_DROPDOWN_MAX_VISIBLE,
  COMMAND_INPUT_HEIGHT,
  CONFIRM_YES,
  CONFIRM_CANCEL,
  CTRL_SHORTCUT_EDIT,
  CTRL_SHORTCUT_DELETE,
} from "../../config/constants.js";
import type { CommandContext, ConfirmState } from "../types.js";

// ── Props ────────────────────────────────────────────────────────────

export interface CommandInputProps {
  context: CommandContext;
  onCommand: (value: string) => void;
  confirmState: ConfirmState | null;
  onConfirmYes: () => void;
  onConfirmCancel: () => void;
}

// ── Separator ────────────────────────────────────────────────────────

function Separator(): React.ReactNode {
  return (
    <Text color={theme.border.dim}>
      {"─".repeat(60)}
    </Text>
  );
}

// ── Rendered input with cursor ───────────────────────────────────────

function renderInputLine(
  value: string,
  cursorOffset: number,
  placeholder: string,
): string {
  if (value.length === 0) {
    if (placeholder.length > 0) {
      return (
        "\x1b[7m" +
        placeholder[0] +
        "\x1b[27m" +
        "\x1b[2m" +
        placeholder.slice(1) +
        "\x1b[22m"
      );
    }
    return "\x1b[7m \x1b[27m";
  }

  let result = "";
  for (let i = 0; i < value.length; i++) {
    if (i === cursorOffset) {
      result += "\x1b[7m" + value[i] + "\x1b[27m";
    } else {
      result += value[i];
    }
  }
  if (cursorOffset >= value.length) {
    result += "\x1b[7m \x1b[27m";
  }
  return result;
}

// ── Highlight matching ranges ────────────────────────────────────────

interface MatchRange {
  start: number;
  end: number;
}

function renderHighlightedLabel(
  label: string,
  matchRanges: MatchRange[],
  isFocused: boolean,
): string {
  if (matchRanges.length === 0) {
    return isFocused
      ? `\x1b[38;2;56;189;248m${label}\x1b[39m`
      : label;
  }

  let result = "";
  let pos = 0;
  for (const range of matchRanges) {
    if (pos < range.start) {
      const segment = label.slice(pos, range.start);
      result += isFocused
        ? `\x1b[38;2;56;189;248m${segment}\x1b[39m`
        : segment;
    }
    const matched = label.slice(range.start, range.end);
    result += `\x1b[1m\x1b[38;2;56;189;248m${matched}\x1b[39m\x1b[22m`;
    pos = range.end;
  }
  if (pos < label.length) {
    const segment = label.slice(pos);
    result += isFocused
      ? `\x1b[38;2;56;189;248m${segment}\x1b[39m`
      : segment;
  }
  return result;
}

// ── Dropdown ─────────────────────────────────────────────────────────

function CommandDropdown({
  state,
}: {
  state: AutocompleteState;
}): React.ReactNode {
  if (!state.isOpen || state.isLoading || state.error) return null;

  const visibleOptions = state.filteredOptions.slice(
    state.visibleFromIndex,
    state.visibleToIndex,
  );

  if (visibleOptions.length === 0) {
    if (state.inputValue.length > 0) {
      return (
        <Box marginLeft={2}>
          <Text color={theme.text.muted}>
            {t("cmdInput.noMatches")}
          </Text>
        </Box>
      );
    }
    return null;
  }

  const aboveCount = state.visibleFromIndex;
  const belowCount =
    state.filteredOptions.length - state.visibleToIndex;

  return (
    <Box flexDirection="column" marginLeft={2}>
      {aboveCount > 0 && (
        <Text color={theme.text.muted}>{`  ↑ ${aboveCount} more`}</Text>
      )}
      {visibleOptions.map((match, i) => {
        const actualIndex = state.visibleFromIndex + i;
        const isFocused = actualIndex === state.focusedIndex;
        const pointer = isFocused ? "\u276F" : " ";
        const label = renderHighlightedLabel(
          match.option.label,
          match.matchRanges,
          isFocused,
        );

        return (
          <Box key={match.option.value}>
            <Text
              color={isFocused ? theme.accent.focus : undefined}
            >
              {pointer}{" "}
            </Text>
            <Text>{label}</Text>
          </Box>
        );
      })}
      {belowCount > 0 && (
        <Text color={theme.text.muted}>{`  ↓ ${belowCount} more`}</Text>
      )}
    </Box>
  );
}

// ── Confirm dropdown ─────────────────────────────────────────────────

function ConfirmDropdown({
  focusedIndex,
  yesLabel,
  cancelLabel,
}: {
  focusedIndex: number;
  yesLabel: string;
  cancelLabel: string;
}): React.ReactNode {
  const items = [
    { label: yesLabel, value: CONFIRM_YES },
    { label: cancelLabel, value: CONFIRM_CANCEL },
  ];

  return (
    <Box flexDirection="column" marginLeft={2}>
      {items.map((item, i) => {
        const isFocused = i === focusedIndex;
        const pointer = isFocused ? "\u276F" : " ";
        return (
          <Box key={item.value}>
            <Text color={isFocused ? theme.accent.focus : undefined}>
              {pointer}{" "}
            </Text>
            <Text
              color={isFocused ? theme.accent.focus : undefined}
            >
              {item.label}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}

// ── Command mode ─────────────────────────────────────────────────────

function CommandMode({
  context,
  onCommand,
}: {
  context: CommandContext;
  onCommand: (value: string) => void;
}): React.ReactNode {
  const commands = useMemo(() => buildCommands(context), [context]);
  const options = useMemo(
    () => commands.map((cmd) => ({ label: cmd.label, value: cmd.value })),
    [commands],
  );

  const { state, dispatch } = useAutocompleteState({
    options,
    visibleOptionCount: COMMAND_INPUT_DROPDOWN_MAX_VISIBLE,
    onSelect: onCommand,
  });

  // Key handler: intercept Ctrl+E/Ctrl+D first, then forward to combobox
  useInput(
    (input, key) => {
      // Bypass shortcuts - fire immediately
      if (input === "e" && key.ctrl) {
        onCommand("edit");
        return;
      }
      if (input === "d" && key.ctrl) {
        onCommand("delete");
        return;
      }

      // Standard combobox input handling
      if (key.escape) {
        dispatch({ type: "CLOSE" });
        return;
      }
      if (key.return) {
        if (
          state.isOpen &&
          state.filteredOptions.length > 0 &&
          state.focusedIndex < state.filteredOptions.length
        ) {
          const focused = state.filteredOptions[state.focusedIndex];
          dispatch({
            type: "SELECT",
            value: focused.option.value,
            label: focused.option.label,
          });
        }
        return;
      }
      if (key.tab) {
        dispatch({ type: "ACCEPT" });
        return;
      }
      if (key.downArrow) {
        dispatch({ type: "FOCUS_NEXT" });
        return;
      }
      if (key.upArrow) {
        dispatch({ type: "FOCUS_PREV" });
        return;
      }
      if (key.backspace || key.delete) {
        dispatch({ type: "DELETE_BACKWARD" });
        return;
      }
      if (key.leftArrow) {
        dispatch({ type: "MOVE_CURSOR_LEFT" });
        return;
      }
      if (key.rightArrow) {
        dispatch({ type: "MOVE_CURSOR_RIGHT" });
        return;
      }
      if (input === "a" && key.ctrl) {
        dispatch({ type: "MOVE_CURSOR_START" });
        return;
      }
      // Ctrl+E is handled above as bypass - do not fall through
      // Ctrl+D is handled above as bypass - do not fall through
      if (input && !key.ctrl && !key.meta) {
        dispatch({ type: "INSERT_TEXT", text: input });
      }
    },
    { isActive: true },
  );

  const placeholder = t("cmdInput.placeholder");
  const inputLine = renderInputLine(
    state.inputValue,
    state.cursorOffset,
    placeholder,
  );

  return (
    <Box flexDirection="column">
      <CommandDropdown state={state} />
      <Box>
        <Text color={theme.accent.focus}>{"❯ "}</Text>
        <Text>{inputLine}</Text>
      </Box>
    </Box>
  );
}

// ── Confirm mode ─────────────────────────────────────────────────────

function ConfirmMode({
  confirmState,
  onConfirmYes,
  onConfirmCancel,
}: {
  confirmState: ConfirmState;
  onConfirmYes: () => void;
  onConfirmCancel: () => void;
}): React.ReactNode {
  const yesLabel = t("cmdInput.confirmYes");
  const cancelLabel = t("cmdInput.confirmCancel");

  // Use autocomplete state for the yes/cancel options
  const options = useMemo(
    () => [
      { label: yesLabel, value: CONFIRM_YES },
      { label: cancelLabel, value: CONFIRM_CANCEL },
    ],
    [yesLabel, cancelLabel],
  );

  const handleSelect = useCallback(
    (value: string) => {
      if (value === CONFIRM_YES) {
        onConfirmYes();
      } else {
        onConfirmCancel();
      }
    },
    [onConfirmYes, onConfirmCancel],
  );

  const { state, dispatch } = useAutocompleteState({
    options,
    visibleOptionCount: 2,
    onSelect: handleSelect,
  });

  useInput(
    (_input, key) => {
      if (key.escape) {
        onConfirmCancel();
        return;
      }
      if (key.return) {
        if (
          state.isOpen &&
          state.filteredOptions.length > 0 &&
          state.focusedIndex < state.filteredOptions.length
        ) {
          const focused = state.filteredOptions[state.focusedIndex];
          dispatch({
            type: "SELECT",
            value: focused.option.value,
            label: focused.option.label,
          });
        } else {
          // If dropdown closed or empty, treat Enter as confirm
          onConfirmYes();
        }
        return;
      }
      if (key.downArrow) {
        dispatch({ type: "FOCUS_NEXT" });
        return;
      }
      if (key.upArrow) {
        dispatch({ type: "FOCUS_PREV" });
        return;
      }
      // In confirm mode, block typing - only navigation + enter/esc
    },
    { isActive: true },
  );

  const placeholder = confirmState.prompt;
  const inputLine = renderInputLine(
    state.inputValue,
    state.cursorOffset,
    placeholder,
  );

  return (
    <Box flexDirection="column">
      <ConfirmDropdown
        focusedIndex={state.focusedIndex}
        yesLabel={yesLabel}
        cancelLabel={cancelLabel}
      />
      <Box>
        <Text color={theme.semantic.danger}>{"❯ "}</Text>
        <Text>{state.inputValue.length > 0 ? inputLine : placeholder}</Text>
      </Box>
    </Box>
  );
}

// ── Main component ───────────────────────────────────────────────────

export function CommandInput(props: CommandInputProps): React.ReactNode {
  const { context, onCommand, confirmState, onConfirmYes, onConfirmCancel } =
    props;

  return (
    <Box flexDirection="column" height={COMMAND_INPUT_HEIGHT}>
      <Separator />
      {confirmState === null ? (
        <CommandMode context={context} onCommand={onCommand} />
      ) : (
        <ConfirmMode
          confirmState={confirmState}
          onConfirmYes={onConfirmYes}
          onConfirmCancel={onConfirmCancel}
        />
      )}
    </Box>
  );
}
