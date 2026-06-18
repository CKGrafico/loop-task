export const POLL_MS = 1000;

export const TOAST_TIMEOUT_MS = 3500;

export const TOAST_MAX = 4;

export const LOG_LINES_MAX = 500;

export const MAX_LOG_BYTES = 1024 * 1024;

export const MAX_LOG_GENERATIONS = 3;

export const SLEEP_CHUNK_MS = 200;

export const DAEMON_SPAWN_TIMEOUT_MS = 5000;

export const DAEMON_POLL_MS = 100;

export const IPC_TIMEOUT_MS = 10000;

export const LOG_TAIL_DEFAULT = 50;

export const BOARD_BREAKPOINT_WIDTH = 80;

export const HEADER_COMPACT_WIDTH = 60;

export const HOVER_BG = "#1e3a5f";

export const PROJECT_COLORS: Record<string, string> = {
  white: "#ffffff",
  cyan: "#06b6d4",
  green: "#4ade80",
  yellow: "#facc15",
  orange: "#fb923c",
  pink: "#f472b6",
};

export const PROJECT_COLOR_KEYS = Object.keys(PROJECT_COLORS) as Array<keyof typeof PROJECT_COLORS>;

// Entity theme colors - used for header action buttons and view accents
export const ENTITY_COLORS = {
  loop: "#38bdf8",    // cyan/blue
  task: "#a78bfa",    // purple
  project: "#34d399", // green
} as const;
