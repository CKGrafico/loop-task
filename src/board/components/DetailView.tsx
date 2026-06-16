import { useEffect, useState } from "react";
import type { LoopMeta, RunRecord } from "../../types.js";
import { t } from "../../i18n/index.js";
import { commandLine, describeLoop, statusColor, statusLabel, timingLabel } from "../format.js";
import { RunHistory } from "./RunHistory.js";

export function DetailView(props: {
  loop: LoopMeta;
  selectedRunIndex: number;
  onSelectRun: (index: number) => void;
  onOpenRun: (run: RunRecord) => void;
}): React.ReactNode {
  const { loop, selectedRunIndex, onSelectRun, onOpenRun } = props;
  const [, setTick] = useState(0);
  const cmd = commandLine(loop.command, loop.commandArgs);
  const maxRuns = loop.maxRuns !== null ? String(loop.maxRuns) : t("board.unlimited");
  const summary = [
    `${t("board.detailSummaryStatus")} ${statusLabel(loop.status)}`,
    `${t("board.detailSummaryTiming")} ${timingLabel(loop)}`,
    `${t("board.detailSummaryInterval")} ${loop.intervalHuman}`,
    `${t("board.detailSummaryRuns")} ${loop.runCount}/${maxRuns}`,
    `${t("board.detailSummaryExit")} ${loop.lastExitCode ?? t("format.dash")}`,
  ].join("  |  ");

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((tick) => tick + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <box style={{ flexDirection: "column", flexGrow: 1, backgroundColor: "#0b0b0b" }}>
      <box title={t("board.detailTitle")} border style={{ flexDirection: "column", backgroundColor: "#0b0b0b" }}>
        <text fg="#9ca3af">{summary}</text>
        <text> </text>
        <text><strong>{t("board.detailFieldId")}</strong>{loop.id}</text>
        <text><strong>{t("board.detailFieldDesc")}</strong>{describeLoop(loop)}</text>
        <text><strong>{t("board.detailFieldCommand")}</strong>{cmd}</text>
        <text><strong>{t("board.detailFieldDir")}</strong>{loop.cwd || t("board.inherit")}</text>
        <text><strong>{t("board.detailFieldInterval")}</strong>{loop.intervalHuman}</text>
        <text>
          <strong>{t("board.detailFieldStatus")}</strong>
          <span fg={statusColor(loop.status)}>{statusLabel(loop.status)}</span>
        </text>
        <text><strong>{t("board.detailFieldRuns")}</strong>{loop.runCount} / {maxRuns}</text>
        <text><strong>{t("board.detailFieldCreated")}</strong>{loop.createdAt}</text>
        <text><strong>{t("board.detailFieldLastRun")}</strong>{loop.lastRunAt ?? t("format.dash")}</text>
        <text><strong>{t("board.detailFieldLastExit")}</strong>{loop.lastExitCode ?? t("format.dash")}</text>
        <text><strong>{t("board.detailFieldNextRun")}</strong>{loop.nextRunAt ?? t("format.dash")}</text>
        <text><strong>{t("board.detailFieldPid")}</strong>{loop.pid}</text>
      </box>
      <RunHistory
        loop={loop}
        selectedRunIndex={selectedRunIndex}
        focused
        onSelectRun={onSelectRun}
        onOpenRun={onOpenRun}
      />
    </box>
  );
}
