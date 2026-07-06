import type { LoopMeta, Project } from "../../types.js";
import { t } from "../../i18n/index.js";
import { commandLine, describeLoop, statusColor, statusLabel, timeAgo } from "../format.js";
import { resolveEffectiveCwd } from "../../core/resolve-cwd.js";

export function Inspector(props: { loop: LoopMeta | null; projects?: Project[] }): React.ReactNode {
  const { loop, projects } = props;
  if (!loop) {
    return (
      <box title={t("board.inspectorTitle")} border style={{ backgroundColor: "#0b0b0b" }}>
        <text fg="#9ca3af">{t("board.inspectorEmpty")}</text>
      </box>
    );
  }

  const projectDirectory = projects?.find((p) => p.id === loop.projectId)?.directory;
  const effectiveCwd = resolveEffectiveCwd(loop.cwd, projectDirectory);
  const showEffective = loop.cwd !== effectiveCwd;

  const cmd = commandLine(loop.command, loop.commandArgs);
  const maxRuns = loop.maxRuns !== null ? String(loop.maxRuns) : t("board.unlimited");

  return (
    <box title={t("board.inspectorTitle")} border style={{ flexDirection: "column", backgroundColor: "#0b0b0b" }}>
      <text><strong>{t("board.fieldId")}</strong> {loop.id}</text>
      <text><strong>{t("board.fieldDesc")}</strong> {describeLoop(loop)}</text>
      <text><strong>{t("board.fieldCommand")}</strong> {cmd}</text>
      <text><strong>{t("board.fieldTask")}</strong> {loop.taskId}</text>
      <text><strong>{t("board.fieldDir")}</strong> {loop.cwd || t("board.inherit")}{showEffective ? ` → ${effectiveCwd}` : ""}</text>
      <text><strong>{t("board.fieldInterval")}</strong> {loop.intervalHuman}</text>
      <text>
        <strong>{t("board.fieldStatus")}</strong>{" "}
        <span fg={statusColor(loop.status)}>{statusLabel(loop.status)}</span>
      </text>
      <text><strong>{t("board.fieldRuns")}</strong> {loop.runCount} / {maxRuns}</text>
      <text><strong>{t("board.fieldLastRun")}</strong> {timeAgo(loop.lastRunAt)}</text>
      <text>
        <strong>{t("board.fieldLastExit")}</strong>{" "}
        {loop.lastExitCode !== null ? String(loop.lastExitCode) : t("format.dash")}
      </text>
      <text>
        <strong>{t("board.fieldNextRun")}</strong> {loop.nextRunAt ? timeAgo(loop.nextRunAt) : t("format.dash")}
      </text>
      <text><strong>{t("board.fieldPid")}</strong> {loop.pid}</text>
    </box>
  );
}
