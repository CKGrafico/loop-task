import React, { useState, useMemo } from "react";
import { Box, Text, useFocus, useInput } from "ink";
import { darkTheme as theme } from "../theme.js";

export interface FocusableSearchSelectOption {
  name: string;
  value: string;
  color?: string;
}

export interface FocusableSearchSelectProps {
  options: FocusableSearchSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const MAX_VISIBLE = 6;

export function FocusableSearchSelect(
  props: FocusableSearchSelectProps
): React.ReactNode {
  const { options, value, onChange } = props;
  const placeholder = props.placeholder ?? "type to filter...";
  const { isFocused } = useFocus();

  const [filter, setFilter] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filtered = useMemo(() => {
    if (!filter) return options;
    const q = filter.toLowerCase();
    return options.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.value.toLowerCase().includes(q)
    );
  }, [options, filter]);

  const clampedIndex = Math.min(selectedIndex, Math.max(0, filtered.length - 1));

  const visibleStart =
    clampedIndex < MAX_VISIBLE
      ? 0
      : clampedIndex - MAX_VISIBLE + 1;
  const visible = filtered.slice(visibleStart, visibleStart + MAX_VISIBLE);

  useInput(
    (input, key) => {
      if (key.upArrow) {
        setSelectedIndex((prev) =>
          prev <= 0 ? filtered.length - 1 : prev - 1
        );
        return;
      }

      if (key.downArrow) {
        setSelectedIndex((prev) =>
          prev >= filtered.length - 1 ? 0 : prev + 1
        );
        return;
      }

      if (key.return) {
        const option = filtered[clampedIndex];
        if (option) {
          onChange(option.value);
        }
        return;
      }

      if (key.escape) {
        setFilter("");
        setSelectedIndex(0);
        return;
      }

      if (key.backspace || key.delete) {
        setFilter((f) => f.slice(0, -1));
        setSelectedIndex(0);
        return;
      }

      if (
        input &&
        !key.ctrl &&
        !key.meta &&
        input.length === 1 &&
        /[a-z0-9 _\-./]/i.test(input)
      ) {
        setFilter((f) => f + input);
        setSelectedIndex(0);
        return;
      }
    },
    { isActive: isFocused }
  );

  const borderColor = isFocused ? theme.accent.focus : theme.border.default;
  const backgroundColor = isFocused
    ? theme.bg.input
    : theme.bg.surface;

  return (
    <Box
      borderStyle="single"
      borderColor={borderColor}
      backgroundColor={backgroundColor}
      flexDirection="column"
    >
      <Box paddingLeft={1}>
        <Text color={theme.text.muted}>/ </Text>
        <Text color={filter ? theme.text.primary : theme.text.muted}>
          {filter || placeholder}
        </Text>
      </Box>
      {filtered.length > 0 ? (
        <Box flexDirection="column">
          {visible.map((option, i) => {
            const realIndex = visibleStart + i;
            const isSelected = realIndex === clampedIndex;
            const isActive = option.value === value;
            const prefix = isSelected ? "\u203a " : "  ";
            const bg = isSelected ? theme.bg.active : undefined;
            const fg = isSelected
              ? theme.text.inverse
              : isActive
                ? theme.accent.focus
                : option.color ?? theme.text.secondary;
            return (
              <Box key={option.value} backgroundColor={bg}>
                <Text color={fg}>
                  {prefix}
                  {option.name}
                </Text>
              </Box>
            );
          })}
        </Box>
      ) : null}
    </Box>
  );
}
