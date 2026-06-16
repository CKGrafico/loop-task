import { useEffect, useRef } from "react";
import { useTerminalDimensions } from "@opentui/react";
import type { LoopMeta, RunRecord } from "../../types.js";
import { t } from "../../i18n/index.js";
import { formatFileSize, formatRunDuration, formatRunTime } from "../format.js";
import { useHoverState } from "../hooks/useHoverState.js";
import { HOVER_BG } from "../../config/constants.js";
import type { ScrollBoxRenderable } from "@opentui/core";

function fit(text: string, width: number): string {
  if (width <= 0) return "";
  if (text.length <= width) return text.padEnd(width);
  return text.length > width ? text.slice(0, width - 3) + "..." : text;
}

export function RunHistory(props: {
  loop: LoopMeta | null;
  selectedRunIndex: number;
  focused: boolean;
  onSelectRun: (index: number) => void;
  onOpenRun: (run: RunRecord) => void;
}): React.ReactNode {
  const { loop, selectedRunIndex, focused, onSelectRun, onOpenRun } = props;
  const { height } = useTerminalDimensions();
  const scrollRef = useRef<ScrollBoxRenderable | null>(null);
  const runs = loop?.runHistory ?? [];

  useEffect(() => {
    const id = `run-row-${selectedRunIndex}`;
    scrollRef.current?.scrollChildIntoView(id);
  }, [selectedRunIndex]);

  const panelHeight = Math.max(4, Math.floor((height - 10) * 0.45));

  const timeW = 8;
  const durW = 7;
  const sizeW = 8;

  const header =
    " " +
    fit(t("board.runHistoryTime"), timeW) +
    " " +
    fit(t("board.runHistoryDuration"), durW) +
    " " +
    fit(t("board.runHistorySize"), sizeW);

  return (
    <box
      title={t("board.runHistoryTitle")}
      border
      borderColor={focused ? "#38bdf8" : undefined}
      style={{ flexDirection: "column", flexGrow: 1, backgroundColor: "#0b0b0b", overflow: "hidden" }}
    >
      <text fg="#6b7280">{header}</text>
      {runs.length === 0 ? (
        <text fg="#9ca3af">{t("board.runHistoryEmpty")}</text>
      ) : (
        <scrollbox
          key={`runs-${loop?.id}-${runs.length}`}
          ref={scrollRef}
          style={{ flexGrow: 1, maxHeight: panelHeight, backgroundColor: "#0b0b0b" }}
        >
          {[...runs].reverse().map((run, revIndex) => (
            <RunRow
              key={run.runNumber}
              id={`run-row-${revIndex}`}
              run={run}
              isSelected={revIndex === selectedRunIndex}
              focused={focused}
              timeW={timeW}
              durW={durW}
              sizeW={sizeW}
              onSelect={onSelectRun}
              onOpen={onOpenRun}
            />
          ))}
        </scrollbox>
      )}
    </box>
  );
}

function RunRow(props: {
  id: string;
  run: RunRecord;
  isSelected: boolean;
  focused: boolean;
  timeW: number;
  durW: number;
  sizeW: number;
  onSelect: (index: number) => void;
  onOpen: (run: RunRecord) => void;
}): React.ReactNode {
  const { id, run, isSelected, focused, timeW, durW, sizeW, onOpen } = props;
  const { isHovered, hoverProps } = useHoverState();
  const bg = isSelected ? (focused ? "#1e3a8a" : "#1e2a4a") : isHovered ? HOVER_BG : undefined;

  const success = run.exitCode === 0;
  const icon = success ? "✓" : "✗";
  const iconColor = success ? "#4ade80" : "#f87171";

  return (
    <box
      id={id}
      onMouseDown={() => onOpen(run)}
      backgroundColor={bg}
      {...hoverProps}
    >
      <text>
        {" "}
        <span fg="#9ca3af">{fit(formatRunTime(run.startedAt), timeW)}</span>{" "}
        <span fg={iconColor}>{icon}</span>{" "}
        {fit(formatRunDuration(run.duration), durW)}{" "}
        {fit(formatFileSize(run.logSize), sizeW)}
      </text>
    </box>
  );
}
