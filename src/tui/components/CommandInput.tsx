import React, { useMemo, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import {
  useAutocompleteState,
  type AutocompleteState,
} from "ink-combobox";
import { darkTheme as theme } from "../theme.js";
import { t } from "../../i18n/index.js";
import { buildCommands } from "../commands.js";
import {
  COMMAND_INPUT_DROPDOWN_MAX_VISIBLE,
  COMMAND_INPUT_HEIGHT,
  CONFIRM_YES,
  CONFIRM_CANCEL,
} from "../../config/constants.js";
import type { CommandContext, ConfirmState, SearchState } from "../types.js";

// ── Props ────────────────────────────────────────────────────────────

export interface CommandInputProps {
  context: CommandContext;
  onCommand: (value: string) => void;
  confirmState: ConfirmState | null;
  searchState: SearchState | null;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onSearchCancel: () => void;
  onConfirmYes: () => void;
  onConfirmCancel: () => void;
}

// ── Rendered input with cursor ───────────────────────────────────────

function renderInputLine(
  value: string,
  cursorOffset: number,
  placeholder: string,
): string {
  if (value.length === 0) {
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
      ? `\x1b[38;2;251;191;36m${label}\x1b[39m`
      : label;
  }

  let result = "";
  let pos = 0;
  for (const range of matchRanges) {
    if (pos < range.start) {
      const segment = label.slice(pos, range.start);
      result += isFocused
        ? `\x1b[38;2;251;191;36m${segment}\x1b[39m`
        : segment;
    }
    const matched = label.slice(range.start, range.end);
    result += `\x1b[1m\x1b[38;2;251;191;36m${matched}\x1b[39m\x1b[22m`;
    pos = range.end;
  }
  if (pos < label.length) {
    const segment = label.slice(pos);
    result += isFocused
      ? `\x1b[38;2;251;191;36m${segment}\x1b[39m`
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
        <Box paddingLeft={3} position="absolute" bottom={3}>
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
    <Box flexDirection="column" paddingLeft={3} position="absolute" bottom={3}>
      {aboveCount > 0 && (
        <Text color={theme.text.muted}>{`  \u2191 ${aboveCount} more`}</Text>
      )}
      {visibleOptions.map((match, i) => {
        const actualIndex = state.visibleFromIndex + i;
        const isFocused = actualIndex === state.focusedIndex;
        const label = renderHighlightedLabel(
          match.option.label,
          match.matchRanges,
          isFocused,
        );

        return (
          <Box key={match.option.value} backgroundColor={isFocused ? theme.bg.active : undefined}>
            <Text color={isFocused ? theme.text.inverse : theme.text.muted}>
              {isFocused ? "\u276f " : "  "}
            </Text>
            <Text color={isFocused ? theme.text.inverse : undefined}>{label}</Text>
          </Box>
        );
      })}
      {belowCount > 0 && (
        <Text color={theme.text.muted}>{`  \u2193 ${belowCount} more`}</Text>
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
    <Box flexDirection="column" paddingLeft={3}>
      {items.map((item, i) => {
        const isFocused = i === focusedIndex;
        return (
          <Box key={item.value} backgroundColor={isFocused ? theme.bg.active : undefined}>
            <Text color={isFocused ? theme.text.inverse : theme.text.muted}>
              {isFocused ? "\u276f " : "  "}
            </Text>
            <Text color={isFocused ? theme.text.inverse : theme.text.primary}>
              {item.label}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}

// ── Hint bar ──────────────────────────────────────────────────────────

function HintBar({
  leftHint,
  rightHint,
}: {
  leftHint: React.ReactNode;
  rightHint: React.ReactNode;
}): React.ReactNode {
  return (
    <Box justifyContent="space-between" paddingX={1}>
      <Box>{leftHint}</Box>
      <Box>{rightHint}</Box>
    </Box>
  );
}

function KeyHint({ keyLabel, action }: { keyLabel: string; action: string }): React.ReactNode {
  return (
    <Box marginRight={2}>
      <Text bold color={theme.text.primary}>{keyLabel}</Text>
      <Text color={theme.text.muted}>{" " + action}</Text>
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

  useInput(
    (input, key) => {
      if (key.ctrl) return;
      if (input.includes("\n")) return;

      if (key.escape) { dispatch({ type: "CLOSE" }); return; }
      if (key.return) {
        if (state.isOpen && state.filteredOptions.length > 0 && state.focusedIndex < state.filteredOptions.length) {
          const focused = state.filteredOptions[state.focusedIndex];
          dispatch({ type: "CLOSE" });
          for (let i = 0; i <= state.inputValue.length; i++) {
            dispatch({ type: "DELETE_BACKWARD" });
          }
          onCommand(focused.option.value);
        }
        return;
      }
      if (key.tab) { dispatch({ type: "ACCEPT" }); return; }
      if (key.downArrow) { dispatch({ type: "FOCUS_NEXT" }); return; }
      if (key.upArrow) { dispatch({ type: "FOCUS_PREV" }); return; }
      if (key.backspace || key.delete) { dispatch({ type: "DELETE_BACKWARD" }); return; }
      if (key.leftArrow) { dispatch({ type: "MOVE_CURSOR_LEFT" }); return; }
      if (key.rightArrow) { dispatch({ type: "MOVE_CURSOR_RIGHT" }); return; }
      if (input === "a" && key.ctrl) { dispatch({ type: "MOVE_CURSOR_START" }); return; }
      if (input.length === 1 && !key.ctrl && !key.meta && !key.return && !key.tab && !key.escape && input >= " " && input <= "~") {
        dispatch({ type: "INSERT_TEXT", text: input });
      }
    },
    { isActive: true },
  );

  const isEmpty = state.inputValue.length === 0;
  const cursor = "\x1b[7m \x1b[27m";
  const inputContent = isEmpty ? cursor : renderInputLine(state.inputValue, state.cursorOffset, "");

  return (
    <>
      <CommandDropdown state={state} />
      {/* Input row with left accent bar — placeholder inline when empty */}
      <Box>
        <Text color={theme.accent.brand}>{"│ "}</Text>
        {isEmpty ? (
          <Text color={theme.text.muted}>{t("cmdInput.placeholder")}</Text>
        ) : (
          <Text>{inputContent}</Text>
        )}
      </Box>
      {/* Hint bar */}
      <HintBar
        leftHint={
          <Box>
            <Text color={theme.text.muted}>{"\u00b7\u00b7\u00b7\u00b7\u00b7\u00b7\u00b7 "}</Text>
            <KeyHint keyLabel="esc" action="cancel" />
          </Box>
        }
        rightHint={
          <Box>
            <KeyHint keyLabel="tab" action="panels" />
            <KeyHint keyLabel="ctrl+p" action="commands" />
          </Box>
        }
      />
    </>
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

  const options = useMemo(
    () => [
      { label: yesLabel, value: CONFIRM_YES },
      { label: cancelLabel, value: CONFIRM_CANCEL },
    ],
    [yesLabel, cancelLabel],
  );

  const handleSelect = useCallback(
    (value: string) => {
      if (value === CONFIRM_YES) { onConfirmYes(); }
      else { onConfirmCancel(); }
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
      if (key.ctrl) return;
      if (_input.includes("\n")) return;
      if (key.escape) { onConfirmCancel(); return; }
      if (key.return) {
        if (state.isOpen && state.filteredOptions.length > 0 && state.focusedIndex < state.filteredOptions.length) {
          const focused = state.filteredOptions[state.focusedIndex];
          dispatch({ type: "SELECT", value: focused.option.value, label: focused.option.label });
        } else { onConfirmYes(); }
        return;
      }
      if (key.downArrow) { dispatch({ type: "FOCUS_NEXT" }); return; }
      if (key.upArrow) { dispatch({ type: "FOCUS_PREV" }); return; }
    },
    { isActive: true },
  );

  return (
    <>
      <ConfirmDropdown focusedIndex={state.focusedIndex} yesLabel={yesLabel} cancelLabel={cancelLabel} />
      <Box>
        <Text color={theme.semantic.danger}>{"│ "}</Text>
        <Text color={theme.text.primary}>{confirmState.prompt}</Text>
      </Box>
      <HintBar
        leftHint={
          <Box>
            <Text color={theme.text.muted}>{"\u00b7\u00b7\u00b7\u00b7\u00b7\u00b7\u00b7 "}</Text>
            <KeyHint keyLabel="esc" action="cancel" />
          </Box>
        }
        rightHint={<KeyHint keyLabel="enter" action="confirm" />}
      />
    </>
  );
}

// ── Search mode ──────────────────────────────────────────────────────

function SearchMode({
  value,
  onSearchChange,
  onSearchSubmit,
  onSearchCancel,
}: {
  value: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onSearchCancel: () => void;
}): React.ReactNode {
   useInput(
    (input, key) => {
      if (key.ctrl) return;
      if (input.includes("\n")) return;
      if (key.escape) { onSearchCancel(); return; }
      if (key.return) { onSearchSubmit(); return; }
      if (key.backspace || key.delete) { onSearchChange(value.slice(0, -1)); return; }
      if (input && !key.ctrl && !key.meta && input.length === 1) { onSearchChange(value + input); return; }
    },
    { isActive: true },
  );

  const placeholder = t("cmdInput.searchPlaceholder");
  const cursor = "\x1b[7m \x1b[27m";

  return (
    <>
      <Box>
        <Text color={theme.accent.project}>{"│ "}</Text>
        {value.length > 0 ? (
          <Text>{value + cursor}</Text>
        ) : (
          <Text color={theme.text.muted}>{placeholder}</Text>
        )}
      </Box>
      <HintBar
        leftHint={
          <Box>
            <Text color={theme.text.muted}>{"\u00b7\u00b7\u00b7\u00b7\u00b7\u00b7\u00b7 "}</Text>
            <KeyHint keyLabel="esc" action="cancel" />
          </Box>
        }
        rightHint={<KeyHint keyLabel="enter" action="apply" />}
      />
    </>
  );
}

// ── Main component ───────────────────────────────────────────────────

export function CommandInput(props: CommandInputProps): React.ReactNode {
  const {
    context,
    onCommand,
    confirmState,
    searchState,
    searchValue,
    onSearchChange,
    onSearchSubmit,
    onSearchCancel,
    onConfirmYes,
    onConfirmCancel,
  } = props;

  return (
    <Box
      flexDirection="column"
      height={COMMAND_INPUT_HEIGHT}
      borderStyle="single"
      borderColor={theme.border.dim}
      paddingY={1}
    >
      {searchState?.active ? (
        <SearchMode
          value={searchValue}
          onSearchChange={onSearchChange}
          onSearchSubmit={onSearchSubmit}
          onSearchCancel={onSearchCancel}
        />
      ) : confirmState === null ? (
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
