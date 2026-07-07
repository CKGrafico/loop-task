import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import {
  useAutocompleteState,
  type AutocompleteState,
  type FuzzyMatch,
} from "ink-combobox";
import { darkTheme as theme } from "../theme.js";
import { t } from "../../i18n/index.js";
import { buildCommands, rankCommands } from "../commands.js";
import {
  COMMAND_INPUT_DROPDOWN_MAX_VISIBLE,
  COMMAND_INPUT_HEIGHT,
} from "../../config/constants.js";
import type { CommandContext, ConfirmState, SearchState } from "../types.js";
import { sanitizePaste } from "../utils/paste.js";

export { sanitizePaste } from "../utils/paste.js";



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
  onCopy?: () => void;
  onPanelAction?: () => void;
  disabled?: boolean;
  navOwner?: "modal" | "commandBar" | "panel";
  onInputStateChange?: (hasText: boolean, dropdownOpen: boolean) => void;
}



function renderInputLine(
  value: string,
  cursorOffset: number,
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



function CommandDropdown({
  state,
  rankedFiltered,
}: {
  state: AutocompleteState;
  rankedFiltered: FuzzyMatch[];
}): React.ReactNode {
  if (!state.isOpen || state.isLoading || state.error) return null;

  const filtered = rankedFiltered;
  const visibleOptions = filtered.slice(
    state.visibleFromIndex,
    state.visibleToIndex,
  );

  if (visibleOptions.length === 0) {
    if (state.inputValue.length > 0) {
      return (
        <Box paddingLeft={3} position="absolute" bottom={3} borderStyle="single" borderColor={theme.border.dim}>
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
    filtered.length - state.visibleToIndex;

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



function CommandMode({
  context,
  onCommand,
  onCopy,
  onPanelAction,
  disabled,
  navOwner,
  onInputStateChange,
}: {
  context: CommandContext;
  onCommand: (value: string) => void;
  onCopy?: () => void;
  onPanelAction?: () => void;
  disabled?: boolean;
  navOwner?: "modal" | "commandBar" | "panel";
  onInputStateChange?: (hasText: boolean, dropdownOpen: boolean) => void;
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

  // Re-rank filteredOptions: exact match → prefix match → fuzzy (existing order)
  const rankedFiltered = useMemo<FuzzyMatch[]>(() => {
    const fo = state.filteredOptions;
    if (fo.length === 0 || state.inputValue.length === 0) return fo;

    const byValue = new Map<string, FuzzyMatch>();
    for (const m of fo) byValue.set(m.option.value, m);

    const ranked = rankCommands(
      state.inputValue,
      fo.map((m) => ({ label: m.option.label, value: m.option.value })),
    );

    return ranked
      .map((opt) => byValue.get(opt.value))
      .filter((m): m is FuzzyMatch => m !== undefined);
  }, [state.filteredOptions, state.inputValue]);

  // Report input state changes to parent for InputOwner resolution (1.2)
  useEffect(() => {
    onInputStateChange?.(state.inputValue.length > 0, state.isOpen);
  }, [state.inputValue, state.isOpen, onInputStateChange]);

  const insertText = useCallback((text: string) => {
    for (const ch of text) dispatch({ type: "INSERT_TEXT", text: ch });
  }, [dispatch]);

  const clearInput = useCallback(() => {
    dispatch({ type: "MOVE_CURSOR_END" });
    for (let i = 0; i < state.inputValue.length; i++) dispatch({ type: "DELETE_BACKWARD" });
  }, [dispatch, state.inputValue.length]);

  useInput(
    (input, key) => {
      // Bracketed paste: content wrapped in ESC[200~ ... ESC[201~ arrives as one
      // chunk. Detect first — the leading ESC can otherwise trip the ctrl/escape guards.
      if (input.includes("\x1b[200~")) {
        insertText(sanitizePaste(input));
        return;
      }

      // Ctrl+U clears the line (the "select all + delete" gesture). Handle before
      // the ctrl guard below. Some terminals send it as the raw NAK control char.
      if ((key.ctrl && input === "u") || input === "\x15") { clearInput(); return; }

      if (key.ctrl) return;
      // Multi-char containing CR/LF with no bracketed markers = the VS Code
      // Ctrl+Enter escape sequence, handled by App's global useInput. Ignore here.
      if (input.length > 1 && (input.includes("\r") || input.includes("\n"))) return;

      // When the command bar is empty and no dropdown is open, panels own
      // navigation keys — return early so j/k/arrows reach the panel layer.
      if (navOwner === "panel" && state.inputValue.length === 0 && !state.isOpen) {
        if (input === "j" || input === "k" || key.upArrow || key.downArrow) {
          return; // panels own these keys
        }
      }

      // `c` with no modifiers + no open dropdown = contextual copy shortcut
      if (onCopy && input === "c" && !state.isOpen) {
        onCopy();
        return;
      }

      if (key.escape) {
        dispatch({ type: "CLOSE" });
        if (state.inputValue.length > 0) {
          clearInput();
        }
        return;
      }
      if (key.return) {
        if (state.isOpen && rankedFiltered.length > 0 && state.focusedIndex < rankedFiltered.length) {
          const focused = rankedFiltered[state.focusedIndex];
          dispatch({ type: "CLOSE" });
          for (let i = 0; i <= state.inputValue.length; i++) {
            dispatch({ type: "DELETE_BACKWARD" });
          }
          onCommand(focused.option.value);
        } else if (state.inputValue.length === 0) {
          // Empty command bar: Enter triggers the focused panel's contextual
          // action (edit / logs) for terminals that collapse Ctrl+Enter to Enter.
          onPanelAction?.();
        }
        return;
      }
      if (key.tab) { dispatch({ type: "ACCEPT" }); return; }
      if (key.downArrow) { dispatch({ type: "FOCUS_NEXT" }); return; }
      if (key.upArrow) { dispatch({ type: "FOCUS_PREV" }); return; }
      if (key.backspace || key.delete) { dispatch({ type: "DELETE_BACKWARD" }); return; }
      if (key.leftArrow) { dispatch({ type: "MOVE_CURSOR_LEFT" }); return; }
      if (key.rightArrow) { dispatch({ type: "MOVE_CURSOR_RIGHT" }); return; }
      // Multi-char printable input = an unbracketed single-line paste (e.g. right-click).
      if (input.length > 1 && !key.meta) {
        insertText(sanitizePaste(input));
        return;
      }
      if (input.length === 1 && !key.ctrl && !key.meta && !key.return && !key.tab && !key.escape && input >= " " && input <= "~") {
        dispatch({ type: "INSERT_TEXT", text: input });
      }
    },
    { isActive: !disabled },
  );

  const isEmpty = state.inputValue.length === 0;
  const cursor = "\x1b[7m \x1b[27m";
  const inputContent = isEmpty ? cursor : renderInputLine(state.inputValue, state.cursorOffset);

  return (
    <>
      <CommandDropdown state={state} rankedFiltered={rankedFiltered} />
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
            <KeyHint keyLabel="enter" action="edit/logs" />
            <KeyHint keyLabel="ctrl+u" action="clear" />
            <KeyHint keyLabel="c" action="copy" />
            <KeyHint keyLabel="tab" action="panels" />
            <KeyHint keyLabel="ctrl+←→" action="tabs" />
            <KeyHint keyLabel="ctrl+p" action="commands" />
          </Box>
        }
      />
    </>
  );
}



function ConfirmMode({
  confirmState,
  onConfirmYes,
  onConfirmCancel,
  disabled,
}: {
  confirmState: ConfirmState;
  onConfirmYes: () => void;
  onConfirmCancel: () => void;
  disabled?: boolean;
}): React.ReactNode {
  const [value, setValue] = useState("");

  useInput(
    (input, key) => {
      if (key.ctrl) return;
      if (input.length > 1 && (input.includes("\r") || input.includes("\n"))) return;
      if (key.escape) { setValue(""); onConfirmCancel(); return; }
      if (key.return) {
        if (value.toLowerCase() === "yes") { setValue(""); onConfirmYes(); }
        else { setValue(""); onConfirmCancel(); }
        return;
      }
      if (key.backspace || key.delete) { setValue((v) => v.slice(0, -1)); return; }
      if (input && !key.ctrl && !key.meta && input.length === 1) { setValue((v) => v + input); return; }
    },
    { isActive: !disabled },
  );

  const cursor = "\x1b[7m \x1b[27m";

  return (
    <>
      <Box>
        <Text color={theme.semantic.danger}>{"│ "}</Text>
        <Text color={theme.text.muted}>{confirmState.prompt + " "}</Text>
        {value.length > 0 ? (
          <Text>{value + cursor}</Text>
        ) : (
          <Text>{cursor}</Text>
        )}
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



function SearchMode({
  value,
  onSearchChange,
  onSearchSubmit,
  onSearchCancel,
  disabled,
}: {
  value: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onSearchCancel: () => void;
  disabled?: boolean;
}): React.ReactNode {
  useInput(
    (input, key) => {
      if (key.ctrl) return;
      if (input.length > 1 && (input.includes("\r") || input.includes("\n"))) return;
      if (key.escape) { onSearchCancel(); return; }
      if (key.return) { onSearchSubmit(); return; }
      if (key.backspace || key.delete) { onSearchChange(value.slice(0, -1)); return; }
      if (input && !key.ctrl && !key.meta && input.length === 1) { onSearchChange(value + input); return; }
    },
    { isActive: !disabled },
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
    onCopy,
    onPanelAction,
    navOwner,
    onInputStateChange,
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
          disabled={props.disabled}
        />
      ) : confirmState === null ? (
        <CommandMode context={context} onCommand={onCommand} onCopy={onCopy} onPanelAction={onPanelAction} disabled={props.disabled} navOwner={navOwner} onInputStateChange={onInputStateChange} />
      ) : (
        <ConfirmMode
          confirmState={confirmState}
          onConfirmYes={onConfirmYes}
          onConfirmCancel={onConfirmCancel}
          disabled={props.disabled}
        />
      )}
    </Box>
  );
}
