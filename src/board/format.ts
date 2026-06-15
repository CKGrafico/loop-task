import type { LoopMeta } from "../types.js";
import { t } from "../i18n/index.js";

export function quoteArg(arg: string): string {
  return /[\s"]/.test(arg) ? `"${arg.replace(/"/g, '\\"')}"` : arg;
}

export function commandLine(command: string, args: string[]): string {
  return [command, ...args.map(quoteArg)].join(" ").trim();
}

export function formatCmd(command: string, args: string[], max = 24): string {
  const full = commandLine(command, args);
  return full.length > max ? full.slice(0, max - 3) + "..." : full;
}

export function describeLoop(loop: LoopMeta): string {
  return loop.description?.trim() || commandLine(loop.command, loop.commandArgs);
}

export function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 3) + "..." : text;
}

export function timeAgo(iso: string | null): string {
  if (!iso) return t("format.dash");
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 5) return t("format.justNow");
  if (secs < 60) return t("format.secsAgo", { secs });
  const mins = Math.floor(secs / 60);
  if (mins < 60) return t("format.minsAgo", { mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t("format.hrsAgo", { hrs });
  return t("format.daysAgo", { days: Math.floor(hrs / 24) });
}

export function statusColor(status: LoopMeta["status"]): string {
  switch (status) {
    case "running":
      return "#4ade80";
    case "paused":
      return "#facc15";
    case "sleeping":
      return "#38bdf8";
    case "stopped":
      return "#f87171";
    default:
      return "#ffffff";
  }
}

export function timingLabel(loop: LoopMeta): string {
  if (loop.status === "paused") return t("format.timingPaused");
  if (loop.nextRunAt) return t("format.timingNext", { timeAgo: timeAgo(loop.nextRunAt) });
  if (loop.lastRunAt) return t("format.timingLast", { timeAgo: timeAgo(loop.lastRunAt) });
  return t("format.timingNew");
}
