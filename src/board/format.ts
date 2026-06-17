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

export function timeUntil(iso: string | null): string {
  if (!iso) return t("format.dash");
  const diff = Math.max(0, new Date(iso).getTime() - Date.now());
  const secs = Math.floor(diff / 1000);
  if (secs < 5) return t("format.justNow");
  if (secs < 60) return t("format.secsAhead", { secs });
  const mins = Math.floor(secs / 60);
  if (mins < 60) return t("format.minsAhead", { mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t("format.hrsAhead", { hrs });
  return t("format.daysAhead", { days: Math.floor(hrs / 24) });
}

export function statusColor(status: LoopMeta["status"]): string {
  switch (status) {
    case "running":
      return "#4ade80";
    case "paused":
      return "#facc15";
    case "idle":
      return "#fb923c";
    case "waiting":
      return "#38bdf8";
    case "stopped":
      return "#f87171";
    default:
      return "#ffffff";
  }
}

export function timingLabel(loop: LoopMeta): string {
  if (loop.status === "paused") return t("format.timingPaused");
  if (loop.status === "idle") return t("format.timingIdle");
  if (loop.nextRunAt) return t("format.timingNext", { timeAgo: timeUntil(loop.nextRunAt) });
  if (loop.lastRunAt) return t("format.timingLast", { timeAgo: timeAgo(loop.lastRunAt) });
  return t("format.timingNew");
}

export function statusLabel(status: LoopMeta["status"]): string {
  return status === "waiting" ? "waiting" : status;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatRunDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m${Math.floor((ms % 60000) / 1000)}s`;
}

export function formatRunTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}
