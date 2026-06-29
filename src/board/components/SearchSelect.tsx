import { useRef, useState, useMemo, useEffect } from "react";
import { useKeyboard } from "@opentui/react";
import type { InputRenderable, ScrollBoxRenderable } from "@opentui/core";
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
  const [userNavigated, setUserNavigated] = useState(false);

  const filtered = useMemo(() => {
    if (!filter) return options;
    const q = filter.toLowerCase();
    return options.filter((o) =>
      o.name.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    );
  }, [options, filter]);

  const currentIdx = filtered.findIndex((o) => o.value === value);
  const displaySelected = userNavigated ? selectedIndex : (currentIdx >= 0 ? currentIdx : 0);
  const clampedSelected = Math.min(displaySelected, Math.max(0, filtered.length - 1));

  const filteredRef = useRef(filtered);
  filteredRef.current = filtered;
  const selectedIdxRef = useRef(clampedSelected);
  selectedIdxRef.current = clampedSelected;
  const focusedRef = useRef(focused);
  focusedRef.current = focused;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const filterRef = useRef(filter);
  filterRef.current = filter;

  useEffect(() => {
    if (focused) {
      setUserNavigated(false);
      setSelectedIndex(currentIdx >= 0 ? currentIdx : 0);
    } else {
      setFilter("");
      setUserNavigated(false);
    }
  }, [focused]);

  useInputShortcuts(() => focusedRef.current ? inputRef.current : null);

  useKeyboard((key) => {
    if (!focusedRef.current) return;
    const name = key.name;

    if (name === "up" || name === "k") {
      const list = filteredRef.current;
      if (list.length > 0) {
        const cur = selectedIdxRef.current;
        const next = cur <= 0 ? list.length - 1 : cur - 1;
        setSelectedIndex(next);
        setUserNavigated(true);
      }
      key.preventDefault();
      key.stopPropagation();
      return;
    }

    if (name === "down" || name === "j") {
      const list = filteredRef.current;
      if (list.length > 0) {
        const cur = selectedIdxRef.current;
        const next = cur >= list.length - 1 ? 0 : cur + 1;
        setSelectedIndex(next);
        setUserNavigated(true);
      }
      key.preventDefault();
      key.stopPropagation();
      return;
    }

    if (name === "return" || name === "enter") {
      const list = filteredRef.current;
      const option = list[selectedIdxRef.current];
      if (option) {
        onChangeRef.current(option.value);
      }
      key.preventDefault();
      key.stopPropagation();
      return;
    }

    if (name === "escape") {
      if (filterRef.current) {
        setFilter("");
        setSelectedIndex(0);
        setUserNavigated(false);
        if (inputRef.current) inputRef.current.value = "";
      }
      key.preventDefault();
      key.stopPropagation();
      return;
    }

    if (name === "backspace") {
      setFilter((f) => f.slice(0, -1));
      setSelectedIndex(0);
      setUserNavigated(false);
      key.preventDefault();
      key.stopPropagation();
      return;
    }

    if (key.ctrl) return;

    let char: string | null = null;
    if (name && name.length === 1 && /[a-z0-9 _\-./]/i.test(name)) {
      char = name;
    } else if (key.sequence && key.sequence.length === 1 && /[a-z0-9 _\-./]/i.test(key.sequence)) {
      char = key.sequence;
    }

    if (char) {
      setFilter((f) => f + char);
      setSelectedIndex(0);
      setUserNavigated(false);
      key.preventDefault();
      key.stopPropagation();
      return;
    }
  });

  const listHeight = Math.min(filtered.length, maxHeight);
  const scrollRef = useRef<ScrollBoxRenderable | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollChildIntoView(`select-option-${clampedSelected}`);
  }, [clampedSelected]);

  return (
    <box
      border
      borderColor={focused ? "#38bdf8" : undefined}
      style={{ flexDirection: "column", backgroundColor: focused ? "#0f172a" : "#0b0b0b" }}
    >
      <box style={{ height: 3, flexDirection: "row", alignItems: "center", paddingLeft: 1 }}>
        <text fg="#6b7280">{"/ "}</text>
        <text fg={filter ? "#e5e7eb" : "#6b7280"}>{filter || placeholder}</text>
      </box>
      <scrollbox ref={scrollRef} style={{ height: listHeight, backgroundColor: "#0b0b0b" }}>
        {filtered.map((option, i) => {
          const isSelected = i === clampedSelected;
          const isActive = option.value === value;
          const prefix = isSelected ? "› " : "  ";
          const colorIndicator = option.color ? `\u25cf ` : "";
          const bg = isSelected ? "#1e3a8a" : undefined;
          const fg = isSelected ? "#ffffff" : isActive ? "#38bdf8" : "#9ca3af";
          return (
            <box key={option.value} id={`select-option-${i}`} style={{ flexDirection: "row", backgroundColor: bg }}>
              <text fg={fg}>{`${prefix}${colorIndicator}${option.name}`}</text>
            </box>
          );
        })}
      </scrollbox>
    </box>
  );
}
