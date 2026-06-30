export const POLL_MS = 1000;

export const TOAST_TIMEOUT_MS = 3500;

export const TOAST_MAX = 4;

export const LOG_LINES_MAX = 500;

export const MAX_LOG_BYTES = 1024 * 1024;

export const MAX_CONTEXT_STDOUT_BYTES = 1024 * 1024;

export const MAX_LOG_GENERATIONS = 3;

export const SLEEP_CHUNK_MS = 200;

export const DAEMON_SPAWN_TIMEOUT_MS = 5000;

export const DAEMON_POLL_MS = 100;

export const IPC_TIMEOUT_MS = 10000;

export const LOG_TAIL_DEFAULT = 50;

export const BOARD_BREAKPOINT_WIDTH = 80;

export const HEADER_COMPACT_WIDTH = 60;

export const SEARCH_SELECT_HEIGHT = 6;

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

// ── Wizard step counts ──────────────────────────────────────────────
export const WIZARD_LOOP_REQUIRED_STEPS = 3;
export const WIZARD_LOOP_TOTAL_STEPS = 7;
export const WIZARD_TASK_REQUIRED_STEPS = 2;
export const WIZARD_TASK_TOTAL_STEPS = 4;

// ── Command tiers ───────────────────────────────────────────────────
export const COMMAND_TIER_ACTION = "action";
export const COMMAND_TIER_CONFIRM = "confirm";
export const COMMAND_TIER_GLOBAL = "global";

// ── Command categories ─────────────────────────────────────────────
export const COMMAND_CATEGORY_GLOBAL = "global";
export const COMMAND_CATEGORY_FILTERS = "filters";
export const COMMAND_CATEGORY_LOOP = "loop";
export const COMMAND_CATEGORY_TASK = "task";
export const COMMAND_CATEGORY_PROJECT = "project";

// ── Confirm keywords ────────────────────────────────────────────────
export const CONFIRM_YES = "yes";
export const CONFIRM_CANCEL = "cancel";

// ── Panel focus types ───────────────────────────────────────────────
export const PANEL_LEFT = "left";
export const PANEL_RIGHT = "right";

// ── Command input constants ─────────────────────────────────────────
export const COMMAND_INPUT_HEIGHT = 6;
export const COMMAND_INPUT_DROPDOWN_MAX_VISIBLE = 6;

// ── Ctrl shortcut hints (for display) ───────────────────────────────
export const CTRL_SHORTCUT_EDIT = "Ctrl+E";
export const CTRL_SHORTCUT_DELETE = "Ctrl+D";
