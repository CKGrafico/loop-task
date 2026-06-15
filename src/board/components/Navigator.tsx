import type { LoopMeta } from "../../types.js";
import { t } from "../../i18n/index.js";
import type { Filters, SortMode } from "../state.js";
import { describeLoop, statusColor, timingLabel, truncate } from "../format.js";

export function Navigator(props: {
  visible: LoopMeta[];
  total: number;
  selectedIndex: number;
  filters: Filters;
  sort: SortMode;
  onSelect: (index: number) => void;
}): React.ReactNode {
  const { visible, total, selectedIndex, filters, sort, onSelect } = props;
  const header =
    "  " +
    t("board.headerStatus").padEnd(8) +
    " " +
    t("board.headerDescription").padEnd(22) +
    " " +
    t("board.headerTiming").padEnd(12) +
    t("board.headerExitRuns");

  return (
      <box
        title={t("board.navigatorTitle", { visible: visible.length, total, sort, status: filters.status })}
        border
        style={{ width: "55%", flexDirection: "column", backgroundColor: "#0b0b0b", overflow: "hidden" }}
      >
        <text fg="#6b7280">{header}</text>
        {visible.length === 0 ? (
          <text fg="#9ca3af">{t("board.noMatch")}</text>
        ) : (
          visible.map((loop, index) => {
            const isSelected = index === selectedIndex;
            const exit = loop.lastExitCode === null ? "-" : String(loop.lastExitCode);
            return (
              <box key={loop.id} onMouseDown={() => onSelect(index)} backgroundColor={isSelected ? "#1e3a8a" : undefined}>
                <text>
                  {isSelected ? "›" : " "} <span fg={statusColor(loop.status)}>
                    {loop.status.padEnd(8)}
                  </span>{" "}
                  {truncate(describeLoop(loop), 22).padEnd(22)}{" "}
                  {timingLabel(loop).padEnd(12)} exit {exit.padEnd(3)} #
                  {String(loop.runCount).padStart(3)}
                </text>
              </box>
            );
          })
        )}
      </box>
  );
}
