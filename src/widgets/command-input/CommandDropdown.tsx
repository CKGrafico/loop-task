import React from "react";
import { Box, Text } from "ink";
import {
  type AutocompleteState,
  type FuzzyMatch,
} from "ink-combobox";
import { darkTheme as theme } from "../../shared/ui/theme.js";
import { t } from "../../shared/i18n/index.js";

export function renderInputLine(
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

export function CommandDropdown({
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
