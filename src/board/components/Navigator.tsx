import { useEffect, useRef, useState } from "react";
import { useTerminalDimensions } from "@opentui/react";
import type { LoopMeta } from "../../types.js";
import { t } from "../../i18n/index.js";
import type { Filters, SortMode } from "../state.js";
import { describeLoop, sinceLabel, statusColor, statusLabel, timingLabel, truncate } from "../format.js";
import { useHoverState } from "../hooks/useHoverState.js";
import { HOVER_BG } from "../../config/constants.js";
import type { Breakpoint } from "../hooks/useBreakpoint.js";
import type { ScrollBoxRenderable } from "@opentui/core";

function fit(text: string, width: number): string {
  if (width <= 0) return "";
  if (text.length <= width) return text.padEnd(width);
  return truncate(text, width);
}

export function Navigator(props: {
  visible: LoopMeta[];
  total: number;
  selectedIndex: number;
  filters: Filters;
  sort: SortMode;
  breakpoint: Breakpoint;
  focused: boolean;
  onSelect: (index: number) => void;
  onActivate: (index: number) => void;
}): React.ReactNode {
  const { visible, total, selectedIndex, filters, sort, breakpoint, focused, onSelect, onActivate } = props;
  const { width, height } = useTerminalDimensions();
  const scrollRef = useRef<ScrollBoxRenderable | null>(null);
  const [, setTick] = useState(0);

  const panelWidth = width * (breakpoint === "narrow" ? 1 : 0.55) - 4;
  const panelHeight = height - (breakpoint === "narrow" ? 10 : 7);

  const statusW = 8;
  const exitW = 2;
  const runsW = 5;
  const nonVar = 2 + 1 + statusW + 1 + 1 + 1 + exitW + 1 + 1 + runsW;
  const avail = Math.floor(panelWidth) - nonVar;
  const sinceW = Math.min(14, Math.max(8, Math.round(avail * 0.35)));
  const timingW = Math.min(12, Math.max(6, Math.round(avail * 0.25)));
  const descW = Math.max(6, avail - sinceW - timingW);

  const header =
    "  " +
    fit(t("board.headerDescription"), descW) +
    " " +
    fit(t("board.headerStatus"), statusW) +
    " " +
    fit(t("board.headerSince"), sinceW) +
    " " +
    fit(t("board.headerTiming"), timingW) +
    " " +
    fit("EX", exitW) +
    " " +
    "#" + fit(t("board.headerRuns"), runsW);

  useEffect(() => {
    const id = `nav-row-${selectedIndex}`;
    scrollRef.current?.scrollChildIntoView(id);
  }, [selectedIndex]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((tick) => tick + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <box
      title={t("board.navigatorTitle", { visible: visible.length, total, sort, status: filters.status })}
      border
      borderColor={focused ? "#38bdf8" : undefined}
      style={{ width: breakpoint === "narrow" ? "100%" : "55%", flexShrink: 0, flexDirection: "column", backgroundColor: "#0b0b0b", overflow: "hidden" }}
    >
      <text fg="#6b7280">{header}</text>
      {visible.length === 0 ? (
        <text fg="#9ca3af">{t("board.noMatch")}</text>
      ) : (
        <scrollbox
          ref={scrollRef}
          style={{ flexGrow: 1, maxHeight: panelHeight, backgroundColor: "#0b0b0b" }}
        >
          {visible.map((loop, index) => {
            const isSelected = index === selectedIndex;
            const exit = loop.lastExitCode === null ? "-" : String(loop.lastExitCode);
            return (
              <NavigatorRow
                key={loop.id}
                id={`nav-row-${index}`}
                loop={loop}
                index={index}
                isSelected={isSelected}
                focused={focused}
                exit={exit}
                statusW={statusW}
                sinceW={sinceW}
                descW={descW}
                timingW={timingW}
                exitW={exitW}
                runsW={runsW}
                onSelect={onSelect}
                onActivate={onActivate}
              />
            );
          })}
        </scrollbox>
      )}
    </box>
  );
}

function NavigatorRow(props: {
  id: string;
  loop: LoopMeta;
  index: number;
  isSelected: boolean;
  focused: boolean;
  exit: string;
  statusW: number;
  sinceW: number;
  descW: number;
  timingW: number;
  exitW: number;
  runsW: number;
  onSelect: (index: number) => void;
  onActivate: (index: number) => void;
}): React.ReactNode {
  const { id, loop, index, isSelected, focused, exit, statusW, sinceW, descW, timingW, exitW, runsW, onSelect, onActivate } = props;
  const { isHovered, hoverProps } = useHoverState();
  const bg = isSelected ? (focused ? "#1e3a8a" : "#1e2a4a") : isHovered ? HOVER_BG : undefined;
  const lastClickRef = useRef(0);

  function handleClick(): void {
    const now = Date.now();
    if (now - lastClickRef.current < 400) {
      onActivate(index);
    } else {
      onSelect(index);
    }
    lastClickRef.current = now;
  }

  return (
    <box id={id} onMouseDown={handleClick} backgroundColor={bg} {...hoverProps}>
      <text>
        {isSelected ? "›" : " "}{" "}
        {fit(truncate(describeLoop(loop), descW), descW)} <span fg={statusColor(loop.status)}>
          {fit(statusLabel(loop.status), statusW)}
        </span>{" "}
        {fit(sinceLabel(loop), sinceW)} {fit(timingLabel(loop), timingW)} {fit(exit, exitW)} #
        {String(loop.runCount).padStart(runsW)}
      </text>
    </box>
  );
}
