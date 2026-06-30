import React, { useState, useMemo, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { darkTheme as theme } from "../theme.js";

export interface SearchSelectOption {
  name: string;
  value: string;
  color?: string;
}

export function SearchSelect(props: {
  options: SearchSelectOption[];
  value: string;
  onChange: (value: string) => void;
  focused: boolean;
  placeholder?: string;
}): React.ReactNode {
  const { options, value, onChange, focused } = props;
  const placeholder = props.placeholder ?? "type to filter...";
  const [filter, setFilter] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filtered = useMemo(() => {
    if (!filter) return options;
    const q = filter.toLowerCase();
    return options.filter((o) =>
      o.name.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    );
  }, [options, filter]);

  const currentIdx = filtered.findIndex((o) => o.value === value);
  const clampedSelected = Math.min(
    currentIdx >= 0 && !filter ? currentIdx : selectedIndex,
    Math.max(0, filtered.length - 1)
  );

  useEffect(() => {
    if (focused) {
      setFilter("");
      setSelectedIndex(currentIdx >= 0 ? currentIdx : 0);
    }
  }, [focused]);

  useInput((input, key) => {
    if (!focused) return;

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
      const option = filtered[clampedSelected];
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

    if (input && !key.ctrl && !key.meta && input.length === 1 && /[a-z0-9 _\-./]/i.test(input)) {
      setFilter((f) => f + input);
      setSelectedIndex(0);
      return;
    }
  });

  const listHeight = Math.min(filtered.length, 6);

  return (
    <Box
      borderStyle="single"
      borderColor={focused ? theme.accent.focus : theme.border.default}
      backgroundColor={focused ? theme.bg.input : theme.bg.surface}
      flexDirection="column"
    >
      <Box paddingLeft={1}>
        <Text color={theme.text.muted}>/ </Text>
        <Text color={filter ? theme.text.primary : theme.text.muted}>
          {filter || placeholder}
        </Text>
      </Box>
      {filtered.length > 0 ? (
        <Box flexDirection="column" height={listHeight}>
          {filtered.map((option, i) => {
            const isSelected = i === clampedSelected;
            const isActive = option.value === value;
            const prefix = isSelected ? "\u203a " : "  ";
            const bg = isSelected ? theme.bg.active : undefined;
            const fg = isSelected ? theme.text.inverse : isActive ? theme.accent.focus : theme.text.secondary;
            return (
              <Box key={option.value} backgroundColor={bg}>
                <Text color={fg}>{prefix}{option.name}</Text>
              </Box>
            );
          })}
        </Box>
      ) : null}
    </Box>
  );
}
