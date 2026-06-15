import type { LoopMeta } from "../../types.js";
import { t } from "../../i18n/index.js";
import { commandLine, describeLoop, statusColor } from "../format.js";

export function DetailView(props: {
  loop: LoopMeta;
  logLines: string[];
}): React.ReactNode {
  const { loop, logLines } = props;
  const cmd = commandLine(loop.command, loop.commandArgs);
  const maxRuns = loop.maxRuns !== null ? String(loop.maxRuns) : t("board.unlimited");

  return (
    <box style={{ flexDirection: "column", flexGrow: 1, backgroundColor: "#0b0b0b" }}>
      <box title={t("board.detailTitle")} border style={{ flexDirection: "column", backgroundColor: "#0b0b0b" }}>
        <text><strong>{t("board.detailFieldId")}</strong>{loop.id}</text>
        <text><strong>{t("board.detailFieldDesc")}</strong>{describeLoop(loop)}</text>
        <text><strong>{t("board.detailFieldCommand")}</strong>{cmd}</text>
        <text><strong>{t("board.detailFieldDir")}</strong>{loop.cwd || t("board.inherit")}</text>
        <text><strong>{t("board.detailFieldInterval")}</strong>{loop.intervalHuman}</text>
        <text>
          <strong>{t("board.detailFieldStatus")}</strong>
          <span fg={statusColor(loop.status)}>{loop.status}</span>
        </text>
        <text><strong>{t("board.detailFieldRuns")}</strong>{loop.runCount} / {maxRuns}</text>
        <text><strong>{t("board.detailFieldCreated")}</strong>{loop.createdAt}</text>
        <text><strong>{t("board.detailFieldLastRun")}</strong>{loop.lastRunAt ?? t("format.dash")}</text>
        <text><strong>{t("board.detailFieldLastExit")}</strong>{loop.lastExitCode ?? t("format.dash")}</text>
        <text><strong>{t("board.detailFieldNextRun")}</strong>{loop.nextRunAt ?? t("format.dash")}</text>
        <text><strong>{t("board.detailFieldPid")}</strong>{loop.pid}</text>
      </box>
      <scrollbox title={t("board.liveOutputTitle")} border style={{ flexGrow: 1, backgroundColor: "#0b0b0b" }} stickyScroll stickyStart="bottom">
        {logLines.map((line, index) => (
          <text key={index}>{line}</text>
        ))}
      </scrollbox>
    </box>
  );
}
