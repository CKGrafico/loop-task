import { useEffect, useMemo, useRef, useState } from "react";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import fs from "node:fs";
import type net from "node:net";
import type { LoopMeta } from "../types.js";
import { buildLoopOptions, parseCommandLine } from "../loop-config.js";
import {
  createLoop,
  deleteLoop,
  listLoops,
  pauseLoop,
  resumeLoop,
  streamLogs,
  triggerLoop,
  updateLoop,
} from "./daemon.js";
import {
  applyLoopFilters,
  cycleSortMode,
  cycleStatusFilter,
  defaultFilters,
  type Filters,
  type SortMode,
} from "./state.js";
import { commandLine, describeLoop, statusColor, timeAgo, timingLabel, truncate } from "./format.js";
import { ToastStack, useToasts } from "./toast.js";

type View = "board" | "detail" | "help" | "create";
type DaemonStatus = "starting" | "connected" | "error";
type Mode = "normal" | "search" | "create" | "help" | "detail" | "confirm";

interface ConfirmState {
  message: string;
  action: () => Promise<void>;
}

const POLL_MS = 2000;

const createFields = ["interval", "command", "description", "cwd", "runNow", "maxRuns"] as const;
type CreateField = (typeof createFields)[number];

function createInitialValues(loop: LoopMeta | null): Record<CreateField, string> {
  if (!loop) {
    return {
      interval: "30m",
      command: "",
      description: "",
      cwd: process.cwd(),
      runNow: "n",
      maxRuns: "",
    };
  }
  return {
    interval: loop.intervalHuman,
    command: commandLine(loop.command, loop.commandArgs),
    description: loop.description ?? "",
    cwd: loop.cwd ?? "",
    runNow: loop.immediate ? "y" : "n",
    maxRuns: loop.maxRuns !== null ? String(loop.maxRuns) : "",
  };
}

export function App(props: { onQuit: () => void }): React.ReactNode {
  const [loops, setLoops] = useState<LoopMeta[]>([]);
  const [daemonStatus, setDaemonStatus] = useState<DaemonStatus>("starting");
  const [view, setView] = useState<View>("board");
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [sort, setSort] = useState<SortMode>("status");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchActive, setSearchActive] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [confirmChoice, setConfirmChoice] = useState(0);
  const [editTarget, setEditTarget] = useState<LoopMeta | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const { toasts, push } = useToasts();

  const visible = useMemo(
    () => applyLoopFilters(loops, filters, sort),
    [loops, filters, sort]
  );

  const clampedIndex = Math.min(selectedIndex, Math.max(0, visible.length - 1));
  const selected = visible[clampedIndex] ?? null;
  const selectedId = selected?.id ?? null;

  const logSocket = useRef<net.Socket | null>(null);

  async function refresh(): Promise<void> {
    try {
      const next = await listLoops();
      setLoops(next);
      setDaemonStatus("connected");
    } catch {
      setDaemonStatus("error");
    }
  }

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    logSocket.current?.destroy();
    logSocket.current = null;
    setLogLines([]);

    if (!selectedId || (view !== "board" && view !== "detail")) {
      return;
    }

    setLogLines(["  Waiting for live output..."]);
    const socket = streamLogs(
      selectedId,
      (line) =>
        setLogLines((prev) => {
          const next = prev[0]?.startsWith("  Waiting") ? [] : prev;
          return [...next, line].slice(-500);
        }),
      (error) => push("error", `Log stream error: ${error.message}`)
    );
    logSocket.current = socket;

    return () => {
      socket.destroy();
      if (logSocket.current === socket) {
        logSocket.current = null;
      }
    };
  }, [selectedId, view]);

  function runAction(
    label: string,
    action: () => Promise<void>
  ): () => Promise<void> {
    return async () => {
      try {
        await action();
        await refresh();
        push("success", label);
      } catch (error) {
        push("error", error instanceof Error ? error.message : String(error));
      }
    };
  }

  useKeyboard((key) => {
    const name = key.name;

    if (confirm) {
      if (name === "left" || name === "right" || name === "tab") {
        setConfirmChoice((c) => (c === 1 ? 0 : 1));
        return;
      }
      if (name === "y") {
        const action = confirm.action;
        setConfirm(null);
        void action();
      } else if (name === "n" || name === "escape") {
        setConfirm(null);
      } else if (name === "return" || name === "enter") {
        if (confirmChoice === 1) {
          const action = confirm.action;
          setConfirm(null);
          void action();
        } else {
          setConfirm(null);
        }
      }
      return;
    }

    if (searchActive) {
      if (name === "escape" || name === "return" || name === "enter") {
        setSearchActive(false);
      }
      return;
    }

    if (view === "create") {
      if (name === "escape") {
        setEditTarget(null);
        setView("board");
      }
      return;
    }

    if (name === "q") {
      logSocket.current?.destroy();
      props.onQuit();
      return;
    }

    if (name === "escape") {
      if (view !== "board") setView("board");
      return;
    }

    if (name === "h") {
      setView((v) => (v === "help" ? "board" : "help"));
      return;
    }

    if (name === "n") {
      setEditTarget(null);
      setView("create");
      return;
    }

    if (name === "e" && selected) {
      setEditTarget(selected);
      setView("create");
      return;
    }

    if (view === "board") {
      if (name === "up" || name === "k") {
        setSelectedIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (name === "down" || name === "j") {
        setSelectedIndex((i) => Math.min(visible.length - 1, i + 1));
        return;
      }
    }

    if (name === "return" || name === "enter") {
      if (selectedId) setView((v) => (v === "detail" ? "board" : "detail"));
      return;
    }

    if (name === "/") {
      setSearchActive(true);
      return;
    }

    if (name === "f") {
      setFilters((prev) => ({ ...prev, status: cycleStatusFilter(prev.status) }));
      return;
    }

    if (name === "s") {
      setSort((prev) => cycleSortMode(prev));
      return;
    }

    if (!selectedId) {
      return;
    }

    if (name === "p") {
      setConfirmChoice(0);
      setConfirm({
        message: `Pause loop ${selectedId}?`,
        action: runAction(`Paused ${selectedId}`, () => pauseLoop(selectedId)),
      });
    } else if (name === "r") {
      setConfirmChoice(0);
      setConfirm({
        message: `Resume loop ${selectedId}?`,
        action: runAction(`Resumed ${selectedId}`, () => resumeLoop(selectedId)),
      });
    } else if (name === "d") {
      setConfirmChoice(0);
      setConfirm({
        message: `Delete loop ${selectedId}?`,
        action: runAction(`Deleted ${selectedId}`, () => deleteLoop(selectedId)),
      });
    } else if (name === "x") {
      setConfirmChoice(0);
      setConfirm({
        message: `Force run loop ${selectedId} now?`,
        action: runAction(`Triggered ${selectedId}`, () => triggerLoop(selectedId)),
      });
    }
  });

  const counts = {
    total: loops.length,
    running: loops.filter((l) => l.status === "running").length,
    sleeping: loops.filter((l) => l.status === "sleeping").length,
    paused: loops.filter((l) => l.status === "paused").length,
  };

  const mode: Mode = confirm
    ? "confirm"
    : searchActive
      ? "search"
      : view === "create"
        ? "create"
        : view === "help"
          ? "help"
          : view === "detail"
            ? "detail"
            : "normal";

  return (
    <box style={{ flexDirection: "column", width: "100%", height: "100%" }}>
      <Header daemonStatus={daemonStatus} counts={counts} />

      {view === "board" ? (
        <FilterBar
          filters={filters}
          sort={sort}
          searchActive={searchActive}
          onSearch={(q) => {
            setFilters((prev) => ({ ...prev, query: q }));
            setSelectedIndex(0);
          }}
        />
      ) : null}

      {view === "help" ? (
        <HelpView />
      ) : view === "create" ? (
        <CreateView
          mode={editTarget ? "edit" : "create"}
          editId={editTarget?.id ?? null}
          initial={createInitialValues(editTarget)}
          onCancel={() => {
            setEditTarget(null);
            setView("board");
          }}
          onDone={(updated, id) => {
            setEditTarget(null);
            setView("board");
            push("success", updated ? `Updated ${id} (paused)` : `Started ${id}`);
            void refresh();
          }}
        />
      ) : view === "detail" && selected ? (
        <DetailView loop={selected} logLines={logLines} />
      ) : (
        <box style={{ flexDirection: "row", flexGrow: 1 }}>
          <Navigator
            visible={visible}
            total={loops.length}
            selectedIndex={clampedIndex}
            filters={filters}
            sort={sort}
          />
          <box style={{ flexDirection: "column", flexGrow: 1 }}>
            <Inspector loop={selected} />
            <Timeline logLines={logLines} />
          </box>
        </box>
      )}

      <Footer mode={mode} />

      {confirm ? (
        <ConfirmModal message={confirm.message} choice={confirmChoice} />
      ) : null}

      <ToastStack toasts={toasts} />
    </box>
  );
}

function Header(props: {
  daemonStatus: DaemonStatus;
  counts: { total: number; running: number; sleeping: number; paused: number };
}): React.ReactNode {
  const { daemonStatus, counts } = props;
  const { width } = useTerminalDimensions();
  const color =
    daemonStatus === "connected"
      ? "#4ade80"
      : daemonStatus === "error"
        ? "#f87171"
        : "#facc15";
  const symbol = daemonStatus === "connected" ? "✓" : daemonStatus === "error" ? "✗" : "…";

  return (
    <box style={{ flexDirection: "column" }}>
      <box style={{ flexDirection: "row", paddingLeft: 1, paddingRight: 1 }}>
        <text>
          <strong fg="#a3e635">loop-task</strong>
          <span fg="#6b7280">  background task loops</span>
        </text>
      </box>
      <box style={{ flexDirection: "row", paddingLeft: 1, paddingRight: 1 }}>
        <text>
          <span fg="#6b7280">Daemon: </span>
          <span fg={color}>{symbol} {daemonStatus}</span>
          <span fg="#6b7280">    Loops: </span>
          <span fg="#e5e7eb">{counts.total}</span>
          <span fg="#6b7280">    Running: </span>
          <span fg="#4ade80">{counts.running}</span>
          <span fg="#6b7280">    Sleeping: </span>
          <span fg="#38bdf8">{counts.sleeping}</span>
          <span fg="#6b7280">    Paused: </span>
          <span fg="#facc15">{counts.paused}</span>
        </text>
      </box>
      <box style={{ height: 1, paddingLeft: 1, paddingRight: 1 }}>
        <text fg="#374151">{"─".repeat(Math.max(0, width - 2))}</text>
      </box>
    </box>
  );
}

function FilterBar(props: {
  filters: Filters;
  sort: SortMode;
  searchActive: boolean;
  onSearch: (query: string) => void;
}): React.ReactNode {
  const { filters, sort, searchActive, onSearch } = props;

  return (
    <box style={{ flexDirection: "row", height: 3, paddingLeft: 1, paddingRight: 1 }}>
      <box
        title=" Search / "
        border
        style={{ flexGrow: 2, height: 3, marginRight: 1, paddingLeft: 1 }}
      >
        {searchActive ? (
          <input
            focused
            placeholder="type to filter, enter to apply"
            onInput={onSearch}
          />
        ) : (
          <text fg={filters.query ? "#e5e7eb" : "#6b7280"}>
            {filters.query || "press / to search"}
          </text>
        )}
      </box>
      <box title=" Status f " border style={{ flexGrow: 1, height: 3, marginRight: 1, paddingLeft: 1 }}>
        <text fg="#38bdf8">{filters.status}</text>
      </box>
      <box title=" Sort s " border style={{ flexGrow: 1, height: 3, paddingLeft: 1 }}>
        <text fg="#a3e635">{sort}</text>
      </box>
    </box>
  );
}

function Navigator(props: {
  visible: LoopMeta[];
  total: number;
  selectedIndex: number;
  filters: Filters;
  sort: SortMode;
}): React.ReactNode {
  const { visible, total, selectedIndex, filters, sort } = props;
  const header =
    "  " +
    "STATUS".padEnd(8) +
    " " +
    "DESCRIPTION".padEnd(20) +
    " " +
    "TIMING".padEnd(12) +
    " EXIT  RUNS";

  return (
    <box
      title={` Loops ${visible.length}/${total}  sort:${sort}  status:${filters.status} `}
      border
      style={{ width: "62%", flexDirection: "column" }}
    >
      <text fg="#6b7280">{header}</text>
      {visible.length === 0 ? (
        <text fg="#9ca3af">  No loops match the current view</text>
      ) : (
        visible.map((loop, index) => {
          const isSelected = index === selectedIndex;
          const exit = loop.lastExitCode === null ? "-" : String(loop.lastExitCode);
          return (
            <text
              key={loop.id}
              bg={isSelected ? "#1e3a8a" : undefined}
            >
              {isSelected ? "›" : " "} <span fg={statusColor(loop.status)}>
                {loop.status.padEnd(8)}
              </span>{" "}
              {truncate(describeLoop(loop), 20).padEnd(20)}{" "}
              {timingLabel(loop).padEnd(12)} exit {exit.padEnd(3)} #
              {String(loop.runCount).padStart(3)}
            </text>
          );
        })
      )}
    </box>
  );
}

function Inspector(props: { loop: LoopMeta | null }): React.ReactNode {
  const { loop } = props;
  if (!loop) {
    return (
      <box title=" Inspector " border style={{ height: 12 }}>
        <text fg="#9ca3af">  Select a loop to view details</text>
      </box>
    );
  }

  const cmd = commandLine(loop.command, loop.commandArgs);
  const maxRuns = loop.maxRuns !== null ? String(loop.maxRuns) : "unlimited";

  return (
    <box title=" Inspector " border style={{ height: 13, flexDirection: "column" }}>
      <text><strong>ID:       </strong> {loop.id}</text>
      <text><strong>Desc:     </strong> {describeLoop(loop)}</text>
      <text><strong>Command:  </strong> {cmd}</text>
      <text><strong>Dir:      </strong> {loop.cwd || "(inherit)"}</text>
      <text><strong>Interval: </strong> {loop.intervalHuman}</text>
      <text>
        <strong>Status:   </strong>{" "}
        <span fg={statusColor(loop.status)}>{loop.status}</span>
      </text>
      <text><strong>Runs:     </strong> {loop.runCount} / {maxRuns}</text>
      <text><strong>Last run: </strong> {timeAgo(loop.lastRunAt)}</text>
      <text>
        <strong>Last exit:</strong>{" "}
        {loop.lastExitCode !== null ? String(loop.lastExitCode) : "-"}
      </text>
      <text>
        <strong>Next run: </strong> {loop.nextRunAt ? timeAgo(loop.nextRunAt) : "-"}
      </text>
      <text><strong>PID:      </strong> {loop.pid}</text>
    </box>
  );
}

function Timeline(props: { logLines: string[] }): React.ReactNode {
  return (
    <scrollbox title=" Timeline " border style={{ flexGrow: 1 }} stickyScroll stickyStart="bottom">
      {props.logLines.length === 0 ? (
        <text fg="#9ca3af">  No output yet.</text>
      ) : (
        props.logLines.map((line, index) => <text key={index}>{line}</text>)
      )}
    </scrollbox>
  );
}

function DetailView(props: {
  loop: LoopMeta;
  logLines: string[];
}): React.ReactNode {
  const { loop, logLines } = props;
  const cmd = commandLine(loop.command, loop.commandArgs);
  const maxRuns = loop.maxRuns !== null ? String(loop.maxRuns) : "unlimited";

  return (
    <box style={{ flexDirection: "column", flexGrow: 1 }}>
      <box title=" Loop Detail " border style={{ flexDirection: "column", height: 16 }}>
        <text><strong>ID:        </strong>{loop.id}</text>
        <text><strong>Desc:      </strong>{describeLoop(loop)}</text>
        <text><strong>Command:   </strong>{cmd}</text>
        <text><strong>Dir:       </strong>{loop.cwd || "(inherit)"}</text>
        <text><strong>Interval:  </strong>{loop.intervalHuman}</text>
        <text>
          <strong>Status:    </strong>
          <span fg={statusColor(loop.status)}>{loop.status}</span>
        </text>
        <text><strong>Runs:      </strong>{loop.runCount} / {maxRuns}</text>
        <text><strong>Created:   </strong>{loop.createdAt}</text>
        <text><strong>Last run:  </strong>{loop.lastRunAt ?? "-"}</text>
        <text><strong>Last exit: </strong>{loop.lastExitCode ?? "-"}</text>
        <text><strong>Next run:  </strong>{loop.nextRunAt ?? "-"}</text>
        <text><strong>PID:       </strong>{loop.pid}</text>
      </box>
      <scrollbox title=" Live Output " border style={{ flexGrow: 1 }} stickyScroll stickyStart="bottom">
        {logLines.map((line, index) => (
          <text key={index}>{line}</text>
        ))}
      </scrollbox>
    </box>
  );
}

function HelpView(): React.ReactNode {
  const rows: [string, string][] = [
    ["up/down, j/k", "move selection"],
    ["enter", "toggle loop detail"],
    ["n", "create loop"],
    ["e", "edit loop (pauses it)"],
    ["p", "pause selected loop"],
    ["r", "resume selected loop"],
    ["x", "force run selected loop now"],
    ["d", "delete selected loop"],
    ["/", "search loops"],
    ["f", "cycle status filter"],
    ["s", "cycle sort mode"],
    ["h", "toggle help"],
    ["esc", "back to board"],
    ["q", "quit"],
  ];

  return (
    <box title=" Help " border style={{ flexDirection: "column", flexGrow: 1, padding: 1 }}>
      {rows.map(([keys, desc]) => (
        <text key={keys}>
          <span fg="#38bdf8">{keys.padEnd(16)}</span>
          {desc}
        </text>
      ))}
    </box>
  );
}

function CreateView(props: {
  mode: "create" | "edit";
  editId: string | null;
  initial: Record<CreateField, string>;
  onCancel: () => void;
  onDone: (updated: boolean, id: string) => void;
}): React.ReactNode {
  const fields = createFields;
  type Field = CreateField;

  const labels: Record<Field, string> = {
    interval: "Interval",
    command: "Command",
    description: "Description",
    cwd: "Working dir",
    runNow: "Run immediately?",
    maxRuns: "Max runs",
  };

  const hints: Record<Field, string> = {
    interval: "how often to run · e.g. 30s · 5m · 30m · 1h · 1d",
    command: "full command line · quote args with spaces",
    description: "short label shown in the list · blank uses the command",
    cwd: "directory the command runs in · must exist at run time",
    runNow: "run once now then every interval, or wait the first interval",
    maxRuns: "stop after N runs · leave blank to run forever",
  };

  const examples: Record<Field, string> = {
    interval: "30m",
    command: 'opencode run "search missing translations and translate them, 3 maximum" --model "opencode/big-pickle"',
    description: "translate missing strings",
    cwd: "",
    runNow: "",
    maxRuns: "",
  };

  const runNowOptions = [
    { name: "No — wait the first interval", description: "", value: "n" },
    { name: "Yes — run now, then every interval", description: "", value: "y" },
  ];

  const [values, setValues] = useState<Record<Field, string>>(props.initial);
  const [focusIndex, setFocusIndex] = useState(0);
  const [error, setError] = useState("");

  useKeyboard((key) => {
    if (key.name !== "tab") return;
    setFocusIndex((i) => {
      const next = key.shift ? i - 1 : i + 1;
      return Math.max(0, Math.min(fields.length - 1, next));
    });
  });

  function submit(current: Record<Field, string>): void {
    try {
      const cwd = current.cwd.trim();
      if (cwd && !fs.existsSync(cwd)) {
        setError(`Working directory does not exist: ${cwd}`);
        return;
      }
      const tokens = parseCommandLine(current.command.trim());
      const [command, ...commandArgs] = tokens;
      const built = buildLoopOptions(
        current.interval.trim(),
        command ?? "",
        commandArgs,
        {
          now: current.runNow === "y",
          maxRuns: current.maxRuns.trim() || null,
          verbose: false,
          cwd,
          description: current.description.trim(),
        }
      );
      const request =
        props.mode === "edit" && props.editId
          ? updateLoop(props.editId, built.options, built.intervalHuman)
          : createLoop(built.options, built.intervalHuman);
      void request
        .then((id) => props.onDone(props.mode === "edit", id))
        .catch((e: unknown) =>
          setError(e instanceof Error ? e.message : String(e))
        );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const title = props.mode === "edit" ? " Edit Loop (will pause) " : " New Loop ";

  return (
    <box title={title} border style={{ flexDirection: "column", flexGrow: 1, padding: 1 }}>
      <box style={{ flexDirection: "column", marginBottom: 1 }}>
        <text fg="#9ca3af">Full example of the loop you are building:</text>
        <text>
          <span fg="#a3e635">loop-task start 30m --now -- </span>
          <span fg="#38bdf8">opencode run </span>
          <span fg="#e5e7eb">&quot;search missing translations and translate them, 3 maximum&quot;</span>
          <span fg="#38bdf8"> --model </span>
          <span fg="#e5e7eb">&quot;opencode/big-pickle&quot;</span>
        </text>
      </box>
      {fields.map((field, index) => (
        <box key={field} style={{ flexDirection: "column", marginBottom: 1 }}>
          <text>
            <span fg={focusIndex === index ? "#38bdf8" : "#e5e7eb"}>
              {labels[field].padEnd(18)}
            </span>
            <span fg="#6b7280">{hints[field]}</span>
          </text>
          {field === "runNow" ? (
            <box border style={{ height: runNowOptions.length + 2 }}>
              <select
                focused={focusIndex === index}
                options={runNowOptions}
                selectedIndex={values.runNow === "y" ? 1 : 0}
                showDescription={false}
                style={{ flexGrow: 1 }}
                onChange={(_index: number, option: { value?: string } | null) =>
                  setValues((prev) => ({ ...prev, runNow: option?.value ?? "n" }))
                }
              />
            </box>
          ) : (
            <box border style={{ height: 3 }}>
              <input
                focused={focusIndex === index}
                value={props.initial[field]}
                placeholder={examples[field] ? `e.g. ${examples[field]}` : "(blank)"}
                onInput={(value: string) =>
                  setValues((prev) => ({ ...prev, [field]: value }))
                }
                onSubmit={() => {
                  if (index < fields.length - 1) {
                    setFocusIndex(index + 1);
                  } else {
                    submit(values);
                  }
                }}
              />
            </box>
          )}
        </box>
      ))}
      <text fg="#9ca3af">
        Tab/Shift+Tab to move · Enter advances or creates · Esc cancels
      </text>
      {error ? <text fg="#f87171">{error}</text> : null}
    </box>
  );
}

function Footer(props: { mode: Mode }): React.ReactNode {
  const { mode } = props;

  const badge: Record<Mode, { label: string; bg: string }> = {
    normal: { label: "NORMAL", bg: "#4ade80" },
    search: { label: "SEARCH", bg: "#38bdf8" },
    create: { label: "CREATE", bg: "#a3e635" },
    help: { label: "HELP", bg: "#facc15" },
    detail: { label: "DETAIL", bg: "#818cf8" },
    confirm: { label: "CONFIRM", bg: "#f87171" },
  };

  const hints: Record<Mode, [string, string][]> = {
    normal: [
      ["n", "new"],
      ["e", "edit"],
      ["enter", "detail"],
      ["p", "pause"],
      ["r", "resume"],
      ["x", "run now"],
      ["d", "delete"],
      ["/", "search"],
      ["f", "filter"],
      ["s", "sort"],
      ["h", "help"],
      ["q", "quit"],
    ],
    search: [
      ["enter", "apply"],
      ["esc", "cancel"],
    ],
    create: [
      ["tab", "next field"],
      ["enter", "create"],
      ["esc", "cancel"],
    ],
    help: [["h/esc", "back"]],
    detail: [
      ["p", "pause"],
      ["r", "resume"],
      ["x", "run now"],
      ["d", "delete"],
      ["esc", "back"],
      ["q", "quit"],
    ],
    confirm: [
      ["←/→", "choose"],
      ["enter", "confirm"],
      ["y/n", "yes/no"],
      ["esc", "cancel"],
    ],
  };

  const current = badge[mode];

  return (
    <box style={{ flexDirection: "row", height: 1 }}>
      <box style={{ backgroundColor: current.bg, paddingLeft: 1, paddingRight: 1 }}>
        <text fg="#0b0b0b"><strong>{current.label}</strong></text>
      </box>
      <box style={{ flexGrow: 1, paddingLeft: 1, flexDirection: "row" }}>
        <text>
          {hints[mode].map(([k, a], i) => (
            <span key={k}>
              {i > 0 ? <span fg="#374151">  </span> : null}
              <span fg="#38bdf8">{k}</span>
              <span fg="#6b7280">:{a}</span>
            </span>
          ))}
        </text>
      </box>
    </box>
  );
}

function ConfirmModal(props: { message: string; choice: number }): React.ReactNode {
  const { message, choice } = props;

  return (
    <box
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 100,
      }}
    >
      <box
        title=" Confirm "
        border
        style={{
          flexDirection: "column",
          padding: 1,
          minWidth: 44,
          backgroundColor: "#111827",
        }}
      >
        <text>{message}</text>
        <text> </text>
        <box style={{ flexDirection: "row", justifyContent: "center" }}>
          <box
            style={{
              backgroundColor: choice === 1 ? "#4ade80" : "#374151",
              paddingLeft: 3,
              paddingRight: 3,
              marginRight: 3,
            }}
          >
            <text fg={choice === 1 ? "#0b0b0b" : "#e5e7eb"}>
              <strong>Yes</strong>
            </text>
          </box>
          <box
            style={{
              backgroundColor: choice === 0 ? "#f87171" : "#374151",
              paddingLeft: 3,
              paddingRight: 3,
            }}
          >
            <text fg={choice === 0 ? "#0b0b0b" : "#e5e7eb"}>
              <strong>No</strong>
            </text>
          </box>
        </box>
      </box>
    </box>
  );
}
