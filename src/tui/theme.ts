export const darkTheme = {
  bg: {
    base: "#0a0e14",
    surface: "#111827",
    elevated: "#1e293b",
    hover: "#1e3a5f",
    active: "#1e3a8a",
    input: "#0f172a",
  },
  text: {
    primary: "#e5e7eb",
    secondary: "#9ca3af",
    muted: "#6b7280",
    inverse: "#ffffff",
  },
  accent: {
    focus: "#38bdf8",
    loop: "#38bdf8",
    task: "#a78bfa",
    project: "#34d399",
  },
  semantic: {
    success: "#4ade80",
    warning: "#facc15",
    danger: "#f87171",
    idle: "#fb923c",
    info: "#38bdf8",
  },
  border: {
    default: "#1e293b",
    focus: "#38bdf8",
    dim: "#374151",
  },
} as const;

export const lightTheme = {
  bg: {
    base: "#f8fafc",
    surface: "#f1f5f9",
    elevated: "#e2e8f0",
    hover: "#cbd5e1",
    active: "#93c5fd",
    input: "#f1f5f9",
  },
  text: {
    primary: "#1e293b",
    secondary: "#475569",
    muted: "#94a3b8",
    inverse: "#0f172a",
  },
  accent: {
    focus: "#0284c7",
    loop: "#0284c7",
    task: "#7c3aed",
    project: "#059669",
  },
  semantic: {
    success: "#16a34a",
    warning: "#ca8a04",
    danger: "#dc2626",
    idle: "#ea580c",
    info: "#0284c7",
  },
  border: {
    default: "#cbd5e1",
    focus: "#0284c7",
    dim: "#94a3b8",
  },
} as const;

export type Theme = typeof darkTheme;

export const space = {
  0: 0,
  1: 1,
  2: 2,
  3: 3,
  4: 4,
} as const;

export const ENTITY_COLORS = {
  loop: "#38bdf8",
  task: "#a78bfa",
  project: "#34d399",
} as const;

export const STATUS_COLORS: Record<string, string> = {
  running: "#4ade80",
  waiting: "#38bdf8",
  paused: "#facc15",
  idle: "#fb923c",
  stopped: "#f87171",
};

export function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? "#9ca3af";
}
