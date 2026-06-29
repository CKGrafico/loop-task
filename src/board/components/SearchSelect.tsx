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

  const filtered = useMemo(() => {
    if (!filter) return options;
    const q = filter.toLowerCase();
    return options.filter((o) =>
      o.name.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    );
  }, [options, filter]);

  const currentIdx = filtered.findIndex((o) => o.value === value);
  const clampedSelected = Math.min(selectedIndex, Math.max(0, filtered.length - 1));
  const displaySelected = Math.max(clampedSelected, currentIdx >= 0 ? currentIdx : 0);
  const finalSelected = Math.min(displaySelected, Math.max(0, filtered.length - 1));

  const stateRef = useRef({ filtered, finalSelected, focused, onChange, filter });
  stateRef.current = { filtered, finalSelected, focused, onChange, filter };

  const scrollRef = useRef<ScrollBoxRenderable | null>(null);

  useEffect(() => {
    if (focused) {
      const idx = stateRef.current.filtered.findIndex((o) => o.value === value);
      setSelectedIndex(idx >= 0 ? idx : 0);
    } else {
      setFilter("");
    }
  }, [focused]);

  useEffect(() => {
    scrollRef.current?.scrollChildIntoView(`select-option-${finalSelected}`);
  }, [finalSelected, filter]);

  useKeyboard((key) => {
    const s = stateRef.current;
    if (!s.focused) return;
    const name = key.name;

    if (name === "up" || name === "k") {
      if (s.filtered.length > 0) {
        const cur = s.finalSelected;
        setSelectedIndex(cur <= 0 ? s.filtered.length - 1 : cur - 1);
      }
      key.preventDefault();
      key.stopPropagation();
      return;
    }

    if (name === "down" || name === "j") {
      if (s.filtered.length > 0) {
        const cur = s.finalSelected;
        setSelectedIndex(cur >= s.filtered.length - 1 ? 0 : cur + 1);
      }
      key.preventDefault();
      key.stopPropagation();
      return;
    }

    if (name === "return" || name === "enter") {
      const option = s.filtered[s.finalSelected];
      if (option) {
        s.onChange(option.value);
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
      setFilter((f) => f.slice(0, -1));
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
      setFilter((f) => f + char);
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
          const isSelected = i === finalSelected;
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
