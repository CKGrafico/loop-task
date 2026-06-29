import { useRef, useState, useMemo, useEffect } from "react";
import { useKeyboard } from "@opentui/react";
import type { InputRenderable } from "@opentui/core";
import { t } from "../../i18n/index.js";
import { useInputShortcuts } from "../hooks/useInputShortcuts.js";
import { SEARCH_SELECT_HEIGHT } from "../../config/constants.js";

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
  height?: number;
}): React.ReactNode {
  const { options, value, onChange, focused, height } = props;
  const placeholder = props.placeholder ?? t("board.searchSelectPlaceholder");
  const maxHeight = height ?? SEARCH_SELECT_HEIGHT;
  const inputRef = useRef<InputRenderable | null>(null);
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
  const clampedSelected = selectedIndex >= 0 && selectedIndex < filtered.length
    ? selectedIndex
    : Math.max(0, currentIdx);

  const filteredRef = useRef(filtered);
  filteredRef.current = filtered;
  const selectedRef = useRef(clampedSelected);
  selectedRef.current = clampedSelected;
  const focusedRef = useRef(focused);
  focusedRef.current = focused;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!focused) {
      setFilter("");
      setSelectedIndex(currentIdx >= 0 ? currentIdx : 0);
    }
  }, [focused]);

  useInputShortcuts(() => focusedRef.current ? inputRef.current : null);

  useKeyboard((key) => {
    if (!focusedRef.current) return;
    const name = key.name;

    if (name === "up" || name === "k") {
      const list = filteredRef.current;
      if (list.length > 0) {
        const current = selectedRef.current;
        setSelectedIndex(current <= 0 ? list.length - 1 : current - 1);
      }
      key.preventDefault();
      key.stopPropagation();
      return;
    }

    if (name === "down" || name === "j") {
      const list = filteredRef.current;
      if (list.length > 0) {
        const current = selectedRef.current;
        setSelectedIndex(current >= list.length - 1 ? 0 : current + 1);
      }
      key.preventDefault();
      key.stopPropagation();
      return;
    }

    if (name === "return" || name === "enter") {
      const list = filteredRef.current;
      const option = list[selectedRef.current];
      if (option) {
        onChangeRef.current(option.value);
      }
      key.preventDefault();
      key.stopPropagation();
      return;
    }

    if (name === "escape") {
      if (filter) {
        setFilter("");
        setSelectedIndex(0);
      }
      key.preventDefault();
      key.stopPropagation();
      return;
    }

    if (name === "backspace") {
      setFilter((f) => f.slice(0, -1));
      setSelectedIndex(0);
      key.preventDefault();
      key.stopPropagation();
      return;
    }

    if (key.ctrl) return;

    if (name && name.length === 1 && /[a-z0-9 _\-./]/i.test(name)) {
      setFilter((f) => f + name);
      setSelectedIndex(0);
      key.preventDefault();
      key.stopPropagation();
      return;
    }

    if (key.sequence && key.sequence.length === 1 && /[a-z0-9 _\-./]/i.test(key.sequence)) {
      setFilter((f) => f + key.sequence);
      setSelectedIndex(0);
      key.preventDefault();
      key.stopPropagation();
      return;
    }
  });

  const listHeight = Math.min(filtered.length, maxHeight);

  return (
    <box
      border
      borderColor={focused ? "#38bdf8" : undefined}
      style={{ flexDirection: "column", backgroundColor: "#0b0b0b" }}
    >
      <box style={{ height: 3, flexDirection: "row", alignItems: "center" }}>
        <text fg="#6b7280">{"  / "}</text>
        <input
          ref={inputRef}
          focused={focused}
          value={filter}
          placeholder={placeholder}
          onInput={(v: string) => {
            setFilter(v);
            setSelectedIndex(0);
          }}
        />
      </box>
      <box style={{ flexDirection: "column", height: listHeight }}>
        {filtered.map((option, i) => {
          const isSelected = i === clampedSelected;
          const isActive = option.value === value;
          const prefix = isSelected ? "› " : "  ";
          const colorIndicator = option.color ? `\u25cf ` : "";
          const bg = isSelected ? "#1e3a8a" : undefined;
          const fg = isSelected ? "#ffffff" : isActive ? "#38bdf8" : "#9ca3af";
          return (
            <box key={option.value} style={{ flexDirection: "row", backgroundColor: bg }}>
              <text fg={fg}>{`${prefix}${colorIndicator}${option.name}`}</text>
            </box>
          );
        })}
      </box>
    </box>
  );
}
