import type { LoopMeta } from "../types.js";

export function formatCmd(command: string, args: string[], max = 24): string {
  const full = `${command} ${args.join(" ")}`.trim();
  return full.length > max ? full.slice(0, max - 3) + "..." : full;
}

export function timeAgo(iso: string | null): string {
  if (!iso) return "-";
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 5) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
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
  if (loop.status === "paused") return "paused";
  if (loop.nextRunAt) return `next ${timeAgo(loop.nextRunAt)}`;
  if (loop.lastRunAt) return `last ${timeAgo(loop.lastRunAt)}`;
  return "new";
}
