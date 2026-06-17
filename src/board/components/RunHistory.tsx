import { useEffect, useRef, useMemo } from "react";
import { useTerminalDimensions } from "@opentui/react";
import type { LoopMeta, RunRecord } from "../../types.js";
import { t } from "../../i18n/index.js";
import { formatFileSize, formatRunDuration, formatRunTime } from "../format.js";
import { useHoverState } from "../hooks/useHoverState.js";
import { HOVER_BG } from "../../config/constants.js";
import type { ScrollBoxRenderable } from "@opentui/core";

interface GroupedRun {
  runs: RunRecord[];
  startedAt: string;
  totalDuration: number;
  totalLogSize: number;
  allSuccess: boolean;
  isRunning: boolean;
  chainName: string | null;
}

function groupRuns(runs: RunRecord[]): GroupedRun[] {
  const groups: GroupedRun[] = [];
  let i = 0;
  while (i < runs.length) {
    const current = runs[i];
    if (current.chainGroupId) {
      const group = runs.filter((r) => r.chainGroupId === current.chainGroupId);
      const first = group[0];
      const allSuccess = group.every((r) => r.status === "completed" && r.exitCode === 0);
      const isRunning = group.some((r) => r.status === "running");
      groups.push({
        runs: group,
        startedAt: first.startedAt,
        totalDuration: group.reduce((s, r) => s + r.duration, 0),
        totalLogSize: group.reduce((s, r) => s + r.logSize, 0),
        allSuccess,
        isRunning,
        chainName: group.find((r) => r.chainName)?.chainName ?? null,
      });
      i += group.length;
    } else {
      groups.push({
        runs: [current],
        startedAt: current.startedAt,
        totalDuration: current.duration,
        totalLogSize: current.logSize,
        allSuccess: current.status === "completed" && current.exitCode === 0,
        isRunning: current.status === "running",
        chainName: null,
      });
      i++;
    }
  }
  return groups;
}

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
  const grouped = useMemo(() => groupRuns(runs), [runs]);

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
      title={t("board.runHistoryTitleHint")}
      border
      borderColor={focused ? "#38bdf8" : undefined}
      style={{ flexDirection: "column", flexGrow: 1, backgroundColor: "#0b0b0b", overflow: "hidden" }}
    >
      <text fg="#6b7280">{header}</text>
      {grouped.length === 0 ? (
        <text fg="#9ca3af">{t("board.runHistoryEmpty")}</text>
      ) : (
        <scrollbox
          key={`runs-${loop?.id}-${runs.length}`}
          ref={scrollRef}
          style={{ flexGrow: 1, maxHeight: panelHeight, backgroundColor: "#0b0b0b" }}
        >
          {[...grouped].reverse().map((group, revIndex) => (
            <GroupRow
              key={group.runs[0].runNumber + (group.chainName ?? "")}
              id={`run-row-${revIndex}`}
              group={group}
              isSelected={focused && revIndex === selectedRunIndex}
              timeW={timeW}
              durW={durW}
              sizeW={sizeW}
              onOpen={() => onOpenRun(group.runs[0])}
            />
          ))}
        </scrollbox>
      )}
    </box>
  );
}

function GroupRow(props: {
  id: string;
  group: GroupedRun;
  isSelected: boolean;
  timeW: number;
  durW: number;
  sizeW: number;
  onOpen: () => void;
}): React.ReactNode {
  const { id, group, isSelected, timeW, durW, sizeW, onOpen } = props;
  const { isHovered, hoverProps } = useHoverState();
  const bg = isSelected ? "#1e3a8a" : isHovered ? HOVER_BG : undefined;

  const icon = group.isRunning ? "⟳" : group.allSuccess ? "✓" : "✗";
  const iconColor = group.isRunning ? "#facc15" : group.allSuccess ? "#4ade80" : "#f87171";
  const label = group.chainName
    ? `→ ${group.chainName}`
    : "";

  return (
    <box
      id={id}
      onMouseDown={onOpen}
      backgroundColor={bg}
      {...hoverProps}
    >
      <text>
        {" "}
        <span fg="#9ca3af">{fit(formatRunTime(group.startedAt), timeW)}</span>{" "}
        <span fg={iconColor}>{icon}</span>{" "}
        {label ? <span fg="#a78bfa">{fit(label, 12)}</span> : null}{" "}
        {fit(group.isRunning ? "…" : formatRunDuration(group.totalDuration), durW)}{" "}
        {fit(formatFileSize(group.totalLogSize), sizeW)}
      </text>
    </box>
  );
}
