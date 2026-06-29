import { useRef, useState, useMemo, useEffect } from "react";
import { useKeyboard } from "@opentui/react";
import type { ScrollBoxRenderable } from "@opentui/core";
import { t } from "../../i18n/index.js";
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
  const [filter, setFilter] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filterRef = useRef(filter);
  filterRef.current = filter;

  const filtered = useMemo(() => {
    if (!filter) return options;
    const q = filter.toLowerCase();
    return options.filter((o) =>
      o.name.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    );
  }, [options, filter]);

  const clampedSelected = Math.min(selectedIndex, Math.max(0, filtered.length - 1));

  const filteredRef = useRef(filtered);
  filteredRef.current = filtered;
  const selectedRef = useRef(clampedSelected);
  selectedRef.current = clampedSelected;
  const focusedRef = useRef(focused);
  focusedRef.current = focused;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const scrollRef = useRef<ScrollBoxRenderable | null>(null);

  useEffect(() => {
    if (focused) {
      const idx = filtered.findIndex((o) => o.value === value);
      const target = idx >= 0 ? idx : 0;
      setSelectedIndex(target);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollChildIntoView(`select-option-${target}`);
      });
    } else {
      setFilter("");
    }
  }, [focused]);

  useEffect(() => {
    scrollRef.current?.scrollChildIntoView(`select-option-${clampedSelected}`);
  }, [clampedSelected, filter]);

  const computeFiltered = (f: string) => {
    if (!f) return options;
    const q = f.toLowerCase();
    return options.filter((o) =>
      o.name.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    );
  };

  useKeyboard((key) => {
    if (!focusedRef.current) return;
    const name = key.name;

    if (name === "up" || name === "k") {
      const list = computeFiltered(filterRef.current);
      if (list.length > 0) {
        const cur = Math.min(selectedRef.current, list.length - 1);
        setSelectedIndex(cur <= 0 ? list.length - 1 : cur - 1);
      }
      key.preventDefault();
      key.stopPropagation();
      return;
    }

    if (name === "down" || name === "j") {
      const list = computeFiltered(filterRef.current);
      if (list.length > 0) {
        const cur = Math.min(selectedRef.current, list.length - 1);
        setSelectedIndex(cur >= list.length - 1 ? 0 : cur + 1);
      }
      key.preventDefault();
      key.stopPropagation();
      return;
    }

    if (name === "return" || name === "enter") {
      const list = computeFiltered(filterRef.current);
      const cur = Math.min(selectedRef.current, list.length - 1);
      const option = list[cur];
      if (option) {
        onChangeRef.current(option.value);
      }
      key.preventDefault();
      key.stopPropagation();
      return;
    }

    if (name === "escape") {
      setFilter("");
      setSelectedIndex(0);
      key.preventDefault();
      key.stopPropagation();
      return;
    }

    if (name === "backspace") {
      const newFilter = filterRef.current.slice(0, -1);
      filterRef.current = newFilter;
      setFilter(newFilter);
      setSelectedIndex(0);
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
      const newFilter = filterRef.current + char;
      filterRef.current = newFilter;
      setFilter(newFilter);
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
